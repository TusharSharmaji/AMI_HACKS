import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in CityPulse UI component:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-[#07090e] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-command-900 border border-white/10 rounded-2xl p-6 shadow-panel text-center">
            <div className="w-12 h-12 rounded-xl bg-rose-950/80 border border-rose-800/60 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">
              Command Interface Exception
            </h2>
            <p className="text-xs text-slate-400 font-mono mb-4">
              {this.state.error?.message || 'An unexpected rendering anomaly occurred.'}
            </p>
            <Button
              variant="primary"
              onClick={this.handleReset}
              icon={<RotateCw className="w-3.5 h-3.5" />}
              className="mx-auto"
            >
              Restart Command Console
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
