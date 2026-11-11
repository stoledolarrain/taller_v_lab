import React from 'react';
import type { Contribution } from '../../types/contributions';
import { StatusBadge } from '../ui/StatusBadge';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';

interface ContributionRowProps {
  contribution: Contribution;
  currentUserId: number;
  isAdmin: boolean;
  isActionLoading: boolean;
  onOpenReportModal: (contribution: Contribution) => void;
  onValidatePayment: (contributionId: number) => Promise<void>;
}

/**
 * ContributionRow — fila de cuota individual.
 * Regla de negocio:
 * - PENDIENTE / PAGADA diferenciados con StatusBadge textual y accesible.
 * - Participante: botón "Reportar pago" si es su cuota y está PENDIENTE.
 * - Admin: botón "Validar aporte" si la cuota está PENDIENTE.
 * Incluye data-testid para E2E 03.
 */
export const ContributionRow: React.FC<ContributionRowProps> = ({
  contribution,
  currentUserId,
  isAdmin,
  isActionLoading,
  onOpenReportModal,
  onValidatePayment,
}) => {
  const isOwner = contribution.user.id === currentUserId;
  const isPending = contribution.status === 'PENDIENTE';
  const userName =
    contribution.user.full_name ||
    [contribution.user.first_name, contribution.user.last_name]
      .filter(Boolean)
      .join(' ') ||
    contribution.user.username;

  return (
    <tr
      className={`contribution-row ${isPending ? 'contribution-row--pending' : 'contribution-row--paid'}`}
      data-testid={`contribution-row-${contribution.id}`}
    >
      <td className="contribution-row__user">
        <div className="contribution-row__user-details">
          <span className="contribution-row__user-name">
            {userName} {isOwner && <strong className="user-self-tag">(Tú)</strong>}
          </span>
          <span className="contribution-row__user-handle">
            @{contribution.user.username}
          </span>
        </div>
      </td>

      <td className="contribution-row__amount">
        <CurrencyDisplay amount={contribution.amount} />
      </td>

      <td
        className="contribution-row__status"
        data-testid={`contribution-status-${contribution.id}`}
      >
        <StatusBadge status={contribution.status} />
      </td>

      <td className="contribution-row__notes">
        {contribution.notes ? (
          <span className="contribution-notes-text" title={contribution.notes}>
            📝 {contribution.notes}
          </span>
        ) : (
          <span className="contribution-notes-empty">—</span>
        )}
      </td>

      <td className="contribution-row__date">
        {contribution.payment_date ? (
          <span className="contribution-date">
            {new Date(contribution.payment_date).toLocaleDateString('es-BO', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </span>
        ) : (
          <span className="contribution-date-pending">Sin registrar</span>
        )}
      </td>

      <td className="contribution-row__actions">
        {/* Acción para el participante: reportar pago de su cuota */}
        {isOwner && isPending && (
          <button
            type="button"
            className="secondary-btn btn-sm"
            onClick={() => onOpenReportModal(contribution)}
            disabled={isActionLoading}
            aria-label={`Reportar pago de cuota para ${userName}`}
            data-testid={`pay-contribution-btn-${contribution.id}`}
          >
            💳 Reportar pago
          </button>
        )}

        {/* Acción para el administrador: validar aporte */}
        {isAdmin && isPending && (
          <button
            type="button"
            className="submit-btn btn-sm btn-validate"
            onClick={() => onValidatePayment(contribution.id)}
            disabled={isActionLoading}
            aria-label={`Validar aporte de ${userName} como pagado`}
            data-testid={`validate-contribution-btn-${contribution.id}`}
          >
            {isActionLoading ? 'Validando...' : '✓ Validar aporte'}
          </button>
        )}

        {!isPending && (
          <span className="contribution-validated-badge" role="status">
            ✓ Aporte verificado
          </span>
        )}
      </td>
    </tr>
  );
};
