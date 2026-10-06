import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside React Tree:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
    });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100svh] bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-rose-100 selection:text-rose-900">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl p-5 sm:p-8 shadow-xl shadow-slate-900/5 relative overflow-hidden">
            {/* Top decorative gradient blur */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500 blur-sm opacity-50" />

            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold tracking-wider text-rose-600 uppercase">System Notice</span>
                <h1 className="text-xl font-bold text-slate-900">Application Interrupted</h1>
              </div>
            </div>

            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              Something went wrong while loading this screen. Your session is safe. Reload the application or return to the home page.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                id="btn-error-reset"
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm rounded-xl transition duration-150 shadow-lg shadow-rose-900/10 active:translate-y-[1px]"
              >
                <RotateCcw className="w-4 h-4" />
                Reload Application
              </button>
              <button
                id="btn-error-home"
                onClick={() => { window.location.href = '/'; }}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium text-sm rounded-xl transition duration-150 active:translate-y-[1px]"
              >
                <Home className="w-4 h-4" />
                Return to Home
              </button>
            </div>
          </div>
          
          <div className="mt-8 text-center text-xs text-slate-500 font-medium tracking-wide">
            UNX GAMES &bull; ISOLATED RECOVERY RUNTIME
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
