import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CricDeck Global Error Caught:', error, errorInfo);
  }

  handleRecover = () => {
    try {
      // Clear corrupt match state but preserve tournament configuration
      localStorage.removeItem('cricdeck_match_state');
    } catch (e) {
      console.warn('Failed clearing match state:', e);
    }
    this.setState({ hasError: false, error: null });
    window.location.href = window.location.pathname;
  };

  handleResetAll = () => {
    try {
      localStorage.clear();
    } catch (e) {
      console.warn('Failed clearing localStorage:', e);
    }
    this.setState({ hasError: false, error: null });
    window.location.href = window.location.pathname;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(ellipse at top, #0f172a 0%, #020617 100%)',
          color: '#f8fafc',
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: '24px'
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(16px)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 20px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444'
            }}>
              <AlertTriangle size={32} />
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 8px 0', color: '#ffffff' }}>
              Scoring Session Recovered
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#94a3b8', margin: '0 0 24px 0', lineHeight: 1.5 }}>
              A state interruption occurred during live scoring. CricDeck has protected your tournament data and prevented the screen from unmounting.
            </p>

            {this.state.error && (
              <div style={{
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '0.8rem',
                color: '#cbd5e1',
                textAlign: 'left',
                fontFamily: 'monospace',
                marginBottom: '24px',
                overflowX: 'auto',
                maxHeight: '100px'
              }}>
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleRecover}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={16} /> Recover & Resume
              </button>
              <button
                onClick={this.handleResetAll}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#94a3b8',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                <Home size={16} /> Reset to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

