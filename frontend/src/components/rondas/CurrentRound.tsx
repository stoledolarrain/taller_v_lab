import React from 'react';
import type { RoundDetail } from '../../types/rounds';
import { StatusBadge } from '../ui/StatusBadge';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { CloseRoundButton } from './CloseRoundButton';

interface CurrentRoundProps {
  round: RoundDetail;
  totalMembers: number;
  isAdmin: boolean;
  canClose: boolean;
  isClosing: boolean;
  onCloseRound: () => Promise<void>;
}

/**
 * CurrentRound — tarjeta destacada de la ronda activa de un pasanaku iniciado.
 * Presenta con total claridad:
 * - Beneficiario asignado que recibe el pozo de esta ronda.
 * - Recaudación actual vs total esperado en Bolivianos (Bs).
 * - Barra de progreso visual.
 * - Botón de cierre para el Admin con bloqueo por deuda integrado.
 * data-testid requeridos para E2E 04 y E2E 05.
 */
export const CurrentRound: React.FC<CurrentRoundProps> = ({
  round,
  totalMembers,
  isAdmin,
  canClose,
  isClosing,
  onCloseRound,
}) => {
  const beneficiaryName =
    round.beneficiary.full_name ||
    [round.beneficiary.first_name, round.beneficiary.last_name]
      .filter(Boolean)
      .join(' ') ||
    round.beneficiary.username;

  const collectedNum = parseFloat(round.total_collected) || 0;
  const expectedNum = parseFloat(round.expected_amount) || 0;
  const progressPercent =
    expectedNum > 0 ? Math.min(100, Math.round((collectedNum / expectedNum) * 100)) : 0;

  return (
    <article
      className="current-round-card"
      aria-label={`Ronda activa número ${round.round_number}`}
      data-testid="current-round-card"
    >
      <div className="current-round-header">
        <div className="round-badge-group">
          <span className="round-pill">
            Ronda #{round.round_number} de {totalMembers}
          </span>
          <StatusBadge status={round.status} />
        </div>

        <div
          className="round-beneficiary-highlight"
          data-testid="current-round-beneficiary"
        >
          <span className="beneficiary-icon" aria-hidden="true">
            🎁
          </span>
          <div className="beneficiary-meta">
            <span className="beneficiary-label">Beneficiario de este turno:</span>
            <strong className="beneficiary-name">{beneficiaryName}</strong>
            <span className="beneficiary-user">@{round.beneficiary.username}</span>
          </div>
        </div>
      </div>

      <div className="round-financial-progress">
        <div className="financial-labels">
          <div className="financial-col">
            <span className="financial-title">Total Recaudado</span>
            <span className="financial-amount" data-testid="current-round-collected">
              <CurrencyDisplay amount={round.total_collected} />
            </span>
          </div>

          <div className="financial-col text-right">
            <span className="financial-title">Fondo Esperado del Pozo</span>
            <span className="financial-amount" data-testid="current-round-expected">
              <CurrencyDisplay amount={round.expected_amount} />
            </span>
          </div>
        </div>

        <div
          className="progress-track"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progreso de recaudación: ${progressPercent}%`}
        >
          <div
            className={`progress-fill ${progressPercent === 100 ? 'progress-fill--complete' : ''}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="progress-footer">
          <span className="progress-text">{progressPercent}% completado</span>
          {parseFloat(round.total_pending) > 0 ? (
            <span className="pending-text" data-testid="current-round-pending">
              Faltan <CurrencyDisplay amount={round.total_pending} /> por recaudar
            </span>
          ) : (
            <span className="complete-text">
              ✨ ¡Pozo completo listo para entregar al beneficiario!
            </span>
          )}
        </div>
      </div>

      {/* Botón de cierre con bloqueo por deuda */}
      {isAdmin && (
        <div className="current-round-footer">
          <CloseRoundButton
            round={round}
            canClose={canClose}
            isClosing={isClosing}
            isAdmin={isAdmin}
            onCloseRound={onCloseRound}
          />
        </div>
      )}
    </article>
  );
};
