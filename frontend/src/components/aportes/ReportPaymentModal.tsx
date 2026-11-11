import React, { useState, useEffect, useRef } from 'react';
import type { Contribution } from '../../types/contributions';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';

interface ReportPaymentModalProps {
  isOpen: boolean;
  contribution: Contribution | null;
  isLoading: boolean;
  onConfirm: (notes: string) => Promise<void>;
  onCancel: () => void;
}

/**
 * ReportPaymentModal — modal accesible para que el participante reporte su cuota.
 * Aclara explícitamente que la app registra pagos realizados fuera de la plataforma.
 */
export const ReportPaymentModal: React.FC<ReportPaymentModalProps> = ({
  isOpen,
  contribution,
  isLoading,
  onConfirm,
  onCancel,
}) => {
  const [notes, setNotes] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen || !contribution) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(notes.trim());
    setNotes('');
  };

  const handleCancel = () => {
    setNotes('');
    onCancel();
  };

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCancel();
      }}
      data-testid="report-payment-modal-overlay"
    >
      <div
        ref={dialogRef}
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        data-testid="report-payment-modal"
      >
        <h2 id="report-modal-title" className="modal-title">
          Reportar Pago de Cuota
        </h2>

        <p className="modal-description">
          Ronda #{contribution.round_number} — Monto:{' '}
          <strong>
            <CurrencyDisplay amount={contribution.amount} />
          </strong>
        </p>

        <div className="external-payment-notice" role="note">
          ℹ️ <strong>Importante:</strong> Pasanaku Digital registra aportes realizados
          fuera de la plataforma (QR, efectivo, transferencia externa). Tu reporte será
          revisado y validado por el administrador del grupo.
        </div>

        <form onSubmit={handleSubmit} className="report-payment-form">
          <div className="form-group">
            <label htmlFor="payment-notes">Comprobante o Detalle (opcional):</label>
            <input
              ref={inputRef}
              id="payment-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Transferencia BNB #89214 o Pago en efectivo"
              disabled={isLoading}
              maxLength={255}
              data-testid="payment-notes-input"
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={handleCancel}
              disabled={isLoading}
              data-testid="report-payment-cancel-btn"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={isLoading}
              aria-busy={isLoading}
              data-testid="report-payment-confirm-btn"
            >
              {isLoading ? 'Registrando...' : 'Confirmar Reporte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
