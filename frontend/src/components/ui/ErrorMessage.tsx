import React from 'react';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

/**
 * ErrorMessage — alerta de error accesible.
 * Usa role="alert" para que sea anunciado de forma inmediata por lectores de pantalla.
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  onDismiss,
  className,
}) => {
  return (
    <div
      className={`error-alert ${className ?? ''}`.trim()}
      role="alert"
      aria-live="assertive"
      data-testid="error-message"
    >
      <span>{message}</span>
      {onDismiss && (
        <button
          type="button"
          className="error-alert__dismiss"
          onClick={onDismiss}
          aria-label="Cerrar mensaje de error"
          data-testid="error-dismiss-btn"
        >
          ✕
        </button>
      )}
    </div>
  );
};
