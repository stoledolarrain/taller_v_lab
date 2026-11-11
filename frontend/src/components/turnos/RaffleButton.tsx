import React from 'react';

interface RaffleButtonProps {
  onRaffle: () => Promise<void>;
  isRaffling: boolean;
  isFull: boolean;
  isAdmin: boolean;
  isEditable: boolean;
}

/**
 * RaffleButton — botón para sortear turnos aleatoriamente entre los participantes.
 * Regla de negocio:
 * - Visible únicamente para el Administrador del grupo.
 * - Solo en estado BORRADOR.
 * - Solo cuando los cupos están llenos (is_full === true).
 * Incluye data-testid="raffle-turns-btn" para pruebas E2E 02.
 */
export const RaffleButton: React.FC<RaffleButtonProps> = ({
  onRaffle,
  isRaffling,
  isFull,
  isAdmin,
  isEditable,
}) => {
  if (!isAdmin || !isEditable) {
    return null;
  }

  return (
    <div className="raffle-action" data-testid="raffle-action-container">
      <button
        type="button"
        className="secondary-btn raffle-btn"
        onClick={onRaffle}
        disabled={!isFull || isRaffling}
        aria-label="Sortear turnos automáticamente"
        aria-busy={isRaffling}
        data-testid="raffle-turns-btn"
      >
        {isRaffling ? '🎲 Sorteando...' : '🎲 Sortear turnos'}
      </button>

      {!isFull && (
        <span className="raffle-hint" role="status">
          (Se requiere completar todos los cupos para sortear)
        </span>
      )}
    </div>
  );
};
