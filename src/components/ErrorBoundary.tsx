import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50dvh] items-center justify-center p-6">
          <div className="text-center max-w-md space-y-4">
            <AlertTriangle className="w-12 h-12 text-warning mx-auto" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-foreground">
              {this.props.fallbackTitle || "Algo deu errado"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Ocorreu um erro inesperado. Tente novamente ou recarregue a página.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleRetry} variant="default" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
                Tentar novamente
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                Recarregar página
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
