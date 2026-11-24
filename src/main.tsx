import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Unexpected application error';
    return {
      hasError: true,
      errorMessage: message,
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error('CRM render error:', error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-black/10 rounded-2xl p-6 shadow-sm space-y-4">
            <h1 className="text-lg font-semibold">Unable to display CRM</h1>
            <p className="text-sm text-[#6E6E73] break-words">
              {this.state.errorMessage || 'A runtime error occurred while loading the page.'}
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="px-4 py-2 rounded-xl bg-[#1D1D1F] text-white text-sm font-medium hover:opacity-90 transition cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function mountApp(): void {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    console.error('Mount target #root was not found in index.html.');
    document.body.innerHTML =
      '<div style="padding:24px;font-family:system-ui,sans-serif;color:#1d1d1f;">Missing #root container in index.html.</div>';
    return;
  }

  createRoot(rootElement).render(
    <React.StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </React.StrictMode>
  );
}

mountApp();
