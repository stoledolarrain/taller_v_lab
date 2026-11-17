import React from 'react';
import type { Contribution } from '../../types/contributions';
import { estaReportadaSinValidar, formatearFecha } from '../../types/contributions';
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
 * - Participante: botón "Reportar pago" si es su cuota, está PENDIENTE y aún no la reportó.
 *   Una vez reportada queda "Por validar" (el backend mantiene PENDIENTE hasta la validación).
 * - Admin: botón "Validar aporte" si la cuota está PENDIENTE.
 * - Muestra fecha de pago y fecha de validación (PDF Sec. 8).
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
  const isReported = estaReportadaSinValidar(contribution);
  const paymentDate = formatearFecha(contribution.payment_date);
  const validationDate = formatearFecha(contribution.validation_date);
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
        <div className="contribution-status-cell">
          <StatusBadge status={contribution.status} />
          {isReported && (
            <span
              className="contribution-reported-chip"
              data-testid={`contribution-reported-${contribution.id}`}
            >
              Por validar
            </span>
          )}
        </div>
      </td>

      <td className="contribution-row__notes">
        {contribution.notes ? (
          <span className="contribution-notes-text" title={contribution.notes}>
            {contribution.notes}
          </span>
        ) : (
          <span className="contribution-notes-empty">—</span>
        )}
      </td>

      <td className="contribution-row__date">
        {paymentDate ? (
          <span className="contribution-date">{paymentDate}</span>
        ) : (
          <span className="contribution-date-pending">Sin registrar</span>
        )}
      </td>

      <td className="contribution-row__date">
        {validationDate ? (
          <span className="contribution-date">
            {validationDate}
            {contribution.validated_by && (
              <span className="contribution-validator">
                por @{contribution.validated_by.username}
              </span>
            )}
          </span>
        ) : (
          <span className="contribution-date-pending">Sin validar</span>
        )}
      </td>

      <td className="contribution-row__actions">
        <div className="contribution-row__actions-inner">
          {/* Participante: reportar pago de su cuota (solo una vez; luego espera validación) */}
          {isOwner && isPending && !isReported && (
            <button
              type="button"
              className="secondary-btn btn-sm"
              onClick={() => onOpenReportModal(contribution)}
              disabled={isActionLoading}
              aria-label={`Reportar pago de cuota para ${userName}`}
              data-testid={`pay-contribution-btn-${contribution.id}`}
            >
              Reportar pago
            </button>
          )}

          {/* Participante (no admin) con pago ya reportado: queda a la espera */}
          {isOwner && isReported && !isAdmin && (
            <span
              className="contribution-waiting-text"
              role="status"
              data-testid={`contribution-waiting-${contribution.id}`}
            >
              Esperando validación del administrador
            </span>
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
              {isActionLoading ? 'Validando...' : 'Validar aporte'}
            </button>
          )}

          {!isPending && (
            <span className="contribution-validated-badge" role="status">
              Aporte verificado
            </span>
          )}
        </div>
      </td>
    </tr>
  );
};
