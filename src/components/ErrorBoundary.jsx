import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      retryCount: 0,
      errorMessage: null,
      errorStack: null
    };
    this._retryTimer = null;
  }

  static getDerivedStateFromError(error) {
    // Capturar el error correctamente en el estado
    return { 
      hasError: true,
      errorMessage: error?.message || 'Error desconocido',
      errorStack: error?.stack || null
    };
  }

  componentDidCatch(error, errorInfo) {
    // Loggear el error REAL (no solo errorInfo)
    console.error('[ErrorBoundary] Error capturado:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    // Auto-retry solo para errores recuperables (no errores de sintaxis/lógica crítica)
    const isRecoverable = !(error instanceof TypeError && error.message.includes('is not a function'));
    
    if (isRecoverable && this.state.retryCount < 3) {
      // Limpiar timer previo si existe
      if (this._retryTimer) clearTimeout(this._retryTimer);
      
      this._retryTimer = setTimeout(() => {
        this.setState(prevState => ({
          hasError: false,
          retryCount: prevState.retryCount + 1,
          errorMessage: null,
          errorStack: null
        }));
      }, 2000);
    }
    // NO redirigir automáticamente a '/' — puede crear loops
    // El usuario puede recargar manualmente si es necesario
  }

  componentWillUnmount() {
    if (this._retryTimer) clearTimeout(this._retryTimer);
  }

  handleManualRetry = () => {
    this.setState({ 
      hasError: false, 
      retryCount: 0,
      errorMessage: null,
      errorStack: null
    });
  };

  render() {
    if (this.state.hasError) {
      const isExhausted = this.state.retryCount >= 3;

      return (
        <div style={{ 
          padding: '40px', 
          fontFamily: 'sans-serif', 
          textAlign: 'center',
          backgroundColor: '#f5f5f5',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px'
        }}>
          {isExhausted ? (
            <>
              <div style={{ fontSize: '48px' }}>⚠️</div>
              <h1 style={{ color: '#dc2626', fontSize: '20px' }}>La aplicación encontró un error</h1>
              <p style={{ color: '#6b7280', maxWidth: '400px' }}>
                Se han agotado los intentos automáticos de recuperación.
              </p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  onClick={this.handleManualRetry}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#1e3a5f',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Reintentar
                </button>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Recargar página
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '48px' }}>⏳</div>
              <h1 style={{ fontSize: '18px', color: '#374151' }}>Recuperando la aplicación...</h1>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                Intento {this.state.retryCount + 1} de 3
              </p>
            </>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
