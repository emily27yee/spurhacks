import React, { Component, ReactNode } from 'react';
import { View, Text } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Only catch text rendering errors, let others bubble up
    if (error.message.includes('Text strings must be rendered within a <Text> component')) {
      return { hasError: true, error };
    }
    // Re-throw other errors
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error for debugging but don't show it to users
    if (error.message.includes('Text strings must be rendered within a <Text> component')) {
      console.warn('Suppressed text rendering error:', error.message);
      console.warn('Error info:', errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Return a fallback UI or null to prevent the error from showing
      return this.props.fallback || null;
    }

    return this.props.children;
  }
} 