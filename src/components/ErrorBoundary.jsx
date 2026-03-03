import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false }; 
  }

  componentDidCatch(_error, errorInfo) {
    // Catch errors in any components below and re-render with error message
    this.setState({ hasError: true });
    console.error("ErrorBoundary caught an error:", errorInfo);
    // You can also log the error to an error reporting service
  }

  static getDerivedStateFromError(_error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true }; 
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
          <h1>Error de autenticación</h1>
          <p>Recargando...</p>
          <script>{setTimeout(() => window.location.reload(), 2000)}</script>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;