import React, { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[RoadSense Global Error Boundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0A0E14',
          color: '#F8FAFC',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '16px',
            padding: '2.5rem',
            maxWidth: '550px'
          }}>
            <h2 style={{ color: '#EF4444', marginBottom: '1rem', fontSize: '1.4rem' }}>
              Civil Telemetry Diagnostic Warning
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              The client encountered an unexpected runtime state. Session reset will re-synchronize client telemetry.
            </p>
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              padding: '0.75rem',
              borderRadius: '8px',
              color: '#F87171',
              fontSize: '0.78rem',
              fontFamily: 'JetBrains Mono, monospace',
              textAlign: 'left',
              marginBottom: '1.5rem',
              overflowX: 'auto'
            }}>
              {this.state.error?.toString() || 'Unknown Runtime Error'}
            </div>
            <button
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }}
              style={{
                background: '#3B82F6',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Reset Session & Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>,
)
