import React from 'react';

const ErrorFallback = ({ error, errorInfo, onReset }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-3">😞 Oops! Algo salió mal</h1>
        <p className="text-slate-500 mb-6">
          Disculpa, ocurrió un error inesperado. Nuestro equipo ha sido notificado.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <div className="text-left bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-700 mb-2">Detalles del Error:</h3>
            <pre className="text-xs text-red-600 overflow-auto">{error?.toString()}</pre>
            {errorInfo && (
              <details className="mt-2">
                <summary className="text-xs text-red-500 cursor-pointer">Stack Trace</summary>
                <pre className="text-xs text-red-500 mt-1 overflow-auto">{errorInfo.componentStack}</pre>
              </details>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={onReset}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            Intentar de nuevo
          </button>
          <a
            href="/"
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
};

export default ErrorFallback;
