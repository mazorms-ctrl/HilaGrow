import React, { Component, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
          <div className="w-full max-w-md rounded-xl border border-danger-200 bg-white p-8 shadow-soft-lg">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-100">
                <AlertCircle className="h-6 w-6 text-danger-600" />
              </div>
              <h2 className="text-xl font-semibold text-neutral-900">
                משהו השתבש
              </h2>
            </div>
            <p className="mb-4 text-sm text-neutral-600">
              {this.state.error?.message || 'אירעה שגיאה בלתי צפויה'}
            </p>
            <Button
              onClick={() => window.location.reload()}
              variant="primary"
              className="w-full"
            >
              טען מחדש את הדף
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
