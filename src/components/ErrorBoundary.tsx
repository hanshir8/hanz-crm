import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected rendering error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('GOODSHIELD CRM ErrorBoundary caught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-black/10 shadow-sm p-6 text-center space-y-4">
            <div className="w-11 h-11 rounded-full bg-[#FF3B30]/10 text-[#FF3B30] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h1 className="text-lg font-semibold tracking-tight">
                Workspace encountered a snag
              </h1>
              <p className="text-sm text-[#6E6E73] break-words">
                {this.state.errorMessage}
              </p>
            </div>
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#007AFF] text-white text-sm font-medium hover:bg-[#0066D6] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Workspace View
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
