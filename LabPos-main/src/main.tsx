import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign Vite HMR and WebSocket errors in the AI Studio environment
if (typeof window !== "undefined") {
  const originalError = console.error;
  console.error = (...args) => {
    fetch('/api/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'CONSOLE_ERROR', msg: args.map(a => String(a)).join(' ') })
    }).catch(() => {});
    originalError(...args);
  };
  
  window.addEventListener("error", (event) => {
    const msg = event.message || "";
    if (
      msg.includes("WebSocket") ||
      msg.includes("websocket") ||
      msg.includes("Script error") ||
      msg.includes("vite")
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    } else {
      fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'GLOBAL_ERROR', msg: msg, stack: event.error?.stack || '' })
      }).catch(() => {});
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const msg = reason && typeof reason === "object" ? ((reason as any).message || "") : String(reason || "");
    if (
      msg.includes("WebSocket") ||
      msg.includes("websocket") ||
      msg.includes("vite") ||
      msg.includes("Script error")
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    } else {
      fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'UNHANDLED_REJECTION', msg: msg, stack: reason && typeof reason === "object" ? ((reason as any).stack || "") : "" })
      }).catch(() => {});
    }
  });
}

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
  errorInfo: any;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null
  };
  
  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  componentDidCatch(error: any, errorInfo: any) {
    (this as any).setState({
      hasError: true,
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#fee2e2', color: '#991b1b', height: '100vh', fontFamily: 'monospace' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>React Runtime Error</h2>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
            <summary style={{ fontWeight: 'bold', cursor: 'pointer' }}>Click to view error details</summary>
            <br />
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
