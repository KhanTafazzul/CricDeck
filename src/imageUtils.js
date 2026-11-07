/**
 * CricDeck Client-Side Secure Image Utility
 * Provides MIME validation, file-size gating, and high-efficiency canvas compression
 * to prevent localStorage quota exhaustion and malicious payload uploads.
 */

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Validates file size and image MIME type
 */
export function validateImageFile(file, maxBytes = MAX_UPLOAD_SIZE) {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { 
      valid: false, 
      error: `Invalid file type "${file.type || 'unknown'}". Only PNG, JPEG, and WebP images are permitted.` 
    };
  }

  if (file.size > maxBytes) {
    const sizeMb = (maxBytes / (1024 * 1024)).toFixed(1);
    return { 
      valid: false, 
      error: `File size exceeds the maximum limit of ${sizeMb} MB.` 
    };
  }

  return { valid: true };
}

/**
 * Compresses an image file down to specific dimensions and JPEG/WebP quality.
 * Returns a compact base64 data URL (typically 10-30 KB instead of 5 MB).
 */
export function compressImage(file, maxWidth = 300, maxHeight = 300, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      reject(new Error(validation.error));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed reading file.'));
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed parsing image data.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to raw result if canvas context unavailable
          resolve(readerEvent.target.result);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to optimized JPEG data URL
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.src = readerEvent.target.result;
    };

    reader.readAsDataURL(file);
  });
}

