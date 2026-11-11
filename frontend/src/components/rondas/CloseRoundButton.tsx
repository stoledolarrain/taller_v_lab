import React, { useState } from 'react';
import { ConfirmModal } from '../ui/ConfirmModal';
import { formatearMontoBolivianos } from '../../types/groups';
import type { Round } from '../../types/rounds';

interface CloseRoundButtonProps {
  round: Round;
  canClose: boolean;
  isClosing: boolean;
  isAdmin: boolean;
  onCloseRound: () => Promise<void>;
}

/**
 * CloseRoundButton — botón visible solo para el Admin.
 * Regla Crítica del PDF (Sec. 6 - Bloqueo por Deuda):
 * - DESHABILITADO con mensaje explicativo si 'canClose' es false.
 * - Al estar habilitado, muestra modal de confirmación de entrega física/externa del dinero al beneficiario.
 * data-testid="close-round-btn" para pruebas E2E 04 y E2E 05.
 */
export const CloseRoundButton: React.FC<CloseRoundButtonProps> = ({
  round,
  canClose,
  isClosing,
  isAdmin,
  onCloseRound,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isAdmin) {
    return null;
  }

  const beneficiaryName =
    round.beneficiary.full_name ||
    [round.beneficiary.first_name, round.beneficiary.last_name]
      .filter(Boolean)
      .join(' ') ||
    round.beneficiary.username;

  const handleConfirmClose = async () => {
    setShowConfirm(false);
    await onCloseRound();
  };

  return (
    <div className="close-round-container" data-testid="close-round-container">
      <div className="close-round-action-row">
        <button
          type="button"
          className="submit-btn close-round-btn"
          onClick={() => setShowConfirm(true)}
          disabled={!canClose || isClosing}
          aria-label={
            canClose
              ? `Cerrar ronda ${round.round_number} y confirmar entrega`
              : 'No es posible cerrar la ronda: existen cuotas pendientes de pago'
          }
          aria-busy={isClosing}
          data-testid="close-round-btn"
        >
          {isClosing ? 'Cerrando ronda...' : `🏁 Cerrar Ronda #${round.round_number}`}
        </button>

        {!canClose && (
          <div className="debt-block-notice" role="alert" data-testid="debt-block-notice">
            ⚠️ <strong>Bloqueo por deuda:</strong> No es posible cerrar la ronda mientras
            existan cuotas en estado <em>PENDIENTE</em>.
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        title={`¿Cerrar Ronda #${round.round_number}?`}
        description={`Confirmas que se recaudó el total de ${formatearMontoBolivianos(round.expected_amount)} y el fondo fue entregado íntegramente al beneficiario ${beneficiaryName}. Esta acción cerrará la ronda actual y habilitará la siguiente.`}
        confirmLabel="Confirmar Entrega y Cerrar Ronda"
        isLoading={isClosing}
        onConfirm={handleConfirmClose}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
};
