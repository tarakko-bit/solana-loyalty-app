import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Wallet connection error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="w-full max-w-md mx-auto mt-8">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertCircle className="h-5 w-5 mr-2" />
              Connection Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              There was an error connecting to your wallet. Please try refreshing the page or opening in the Phantom app.
            </p>
            <a 
              href={`https://phantom.app/ul/browse/${window.location.origin}`}
              className="text-sm text-primary hover:underline mt-4 block"
            >
              Open in Phantom App →
            </a>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
