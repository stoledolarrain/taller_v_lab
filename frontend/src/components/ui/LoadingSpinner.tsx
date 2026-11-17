import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * LoadingSpinner — indicador de carga accesible.
 * Usa role="status" y aria-live para anunciar el estado de carga a lectores de pantalla.
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Cargando...',
  size = 'md',
}) => {
  return (
    <div
      className={`loading-state loading-state--${size}`}
      role="status"
      aria-live="polite"
      aria-label={message}
      data-testid="loading-spinner"
    >
      <div className={`spinner spinner--${size}`} aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
};
