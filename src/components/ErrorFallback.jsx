import React from 'react';
import './ErrorFallback.css';

const ErrorFallback = ({ error, errorInfo, onReset }) => {
  return (
    <div className="error-fallback">
      <div className="error-container">
        <h1>😞 Oops! Algo salió mal</h1>
        <p className="error-message">
          Disculpa, ocurrió un error inesperado. Nuestro equipo ha sido notificado.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <div className="error-details">
            <h3>Detalles del Error:</h3>
            <pre>{error?.toString()}</pre>
            {errorInfo && (
              <details>
                <summary>Stack Trace</summary>
                <pre>{errorInfo.componentStack}</pre>
              </details>
            )}
          </div>
        )}

        <div className="error-actions">
          <button onClick={onReset} className="btn-primary">
            Intentar de nuevo
          </button>
          <a href="/" className="btn-secondary">
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;
