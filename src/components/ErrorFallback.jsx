import React from 'react';

export default function ErrorFallback({ error, resetError }) {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        padding: '2rem',
        textAlign: 'center'
      }}
    >
      <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
        Algo salió mal
      </h2>
      {error && (
        <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {error.message}
        </p>
      )}
      {resetError && (
        <button
          onClick={resetError}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#1e3a5f',
            color: 'white',
            borderRadius: '0.375rem',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Intentar de nuevo
        </button>
      )}
    </div>
  );
}
