import React from 'react';

const ErrorFallback = ({ error, reset }) => (
  <div className="error-fallback">
    <h1>Oops! Algo salió mal</h1>
    <p>{error?.message}</p>
    <button onClick={reset}>Intentar de nuevo</button>
  </div>
);

export default ErrorFallback;
