import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import './ErrorMessage.css';

const ErrorMessage = ({ error, onRetry, title = 'Error' }) => {
  return (
    <div className="error-message-container">
      <div className="error-content">
        <AlertCircle className="error-icon" />
        <h2>{title}</h2>
        <p className="error-text">{error}</p>
        <div className="error-actions">
          <Button onClick={onRetry} className="btn-retry">
            Reintentar
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Ir al Inicio
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;
