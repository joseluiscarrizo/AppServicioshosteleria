import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, retryCount: 0 }; 
  }

  componentDidCatch(_error, errorInfo) {
    this.setState({ hasError: true });
    console.error("ErrorBoundary caught an error:", errorInfo);
    // Reintentar después de 2 segundos
    setTimeout(() => {
      if (this.state.retryCount < 3) {
        this.setState({ hasError: false, retryCount: this.state.retryCount + 1 });
      } else {
        window.location.href = '/';
      }
    }, 2000);
  }

  static getDerivedStateFromError(_error) {
    return { hasError: true }; 
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '40px', 
          fontFamily: 'sans-serif', 
          textAlign: 'center',
          backgroundColor: '#f5f5f5',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <h1>⏳ Cargando aplicación...</h1>
          <p>Intento {this.state.retryCount + 1}/3</p>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;