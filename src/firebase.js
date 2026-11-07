import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAAOJ1YbjOch-FAo1RErijGLSUOqIkkogE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "falix-cde0c.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "falix-cde0c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "falix-cde0c.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1063248423040",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1063248423040:web:80d426c16f6551e902de65",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-8945NCMBQB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
};
