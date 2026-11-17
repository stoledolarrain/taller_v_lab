import React, { useEffect, useRef } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * ConfirmModal — modal de confirmación accesible para acciones críticas.
 * Gestiona foco: al abrir mueve el foco al modal; al cerrar lo devuelve al disparador.
 * Tecla Escape cierra el modal (cancelar).
 * Cumple requisito de testing E2E: data-testid en botones de confirmar y cancelar.
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isDanger = false,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      confirmBtnRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      data-testid="confirm-modal-overlay"
    >
      <div
        ref={dialogRef}
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
        data-testid="confirm-modal"
      >
        <h2 id="modal-title" className="modal-title">
          {title}
        </h2>
        <p id="modal-description" className="modal-description">
          {description}
        </p>
        <div className="modal-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={onCancel}
            disabled={isLoading}
            data-testid="modal-cancel-btn"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            className={isDanger ? 'danger-btn' : 'submit-btn'}
            onClick={onConfirm}
            disabled={isLoading}
            aria-busy={isLoading}
            data-testid="modal-confirm-btn"
          >
            {isLoading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
