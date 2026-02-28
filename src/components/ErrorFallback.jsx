import React from 'react';

export default function ErrorFallback({ error, resetError }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white p-8 text-center">
      <div className="max-w-md">
        <h2 className="text-2xl font-semibold text-slate-800 mb-2">Algo salió mal</h2>
        {error?.message && (
          <p className="text-sm text-slate-500 mb-6 break-words">{error.message}</p>
        )}
        {resetError && (
          <button
            onClick={resetError}
            className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors"
          >
            Intentar de nuevo
          </button>
        )}
      </div>
    </div>
  );
}
