import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorFallback({ error, resetError }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full mx-4 p-8 bg-white rounded-xl shadow-lg text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Algo salió mal</h1>
        <p className="text-slate-500 mb-6">
          {error?.message || 'Se ha producido un error inesperado en la aplicación.'}
        </p>
        {resetError && (
          <button
            onClick={resetError}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
}
