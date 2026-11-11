import React, { useState } from 'react';
import type { Contribution } from '../../types/contributions';
import { ContributionRow } from './ContributionRow';
import { ReportPaymentModal } from './ReportPaymentModal';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import {
  calcularTotalRecaudado,
  calcularTotalPendiente,
} from '../../types/contributions';

interface ContributionsListProps {
  contributions: Contribution[];
  currentUserId: number;
  isAdmin: boolean;
  actionContributionId: number | null;
  onReportPayment: (contributionId: number, notes?: string) => Promise<void>;
  onValidatePayment: (contributionId: number) => Promise<void>;
}

/**
 * ContributionsList — listado tabular de cuotas de la ronda activa.
 * Cumple MVVM y lineamientos de accesibilidad del Design System.
 * data-testid="contributions-table" para pruebas E2E 03.
 */
export const ContributionsList: React.FC<ContributionsListProps> = ({
  contributions = [],
  currentUserId,
  isAdmin,
  actionContributionId,
  onReportPayment,
  onValidatePayment,
}) => {
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(
    null
  );
  const [isReporting, setIsReporting] = useState(false);

  const totalPaidCount = contributions.filter((c) => c.status === 'PAGADA').length;
  const totalRecaudado = calcularTotalRecaudado(contributions);
  const totalPendiente = calcularTotalPendiente(contributions);

  const handleOpenReportModal = (contribution: Contribution) => {
    setSelectedContribution(contribution);
  };

  const handleConfirmReport = async (notes: string) => {
    if (!selectedContribution) return;
    setIsReporting(true);
    try {
      await onReportPayment(selectedContribution.id, notes);
      setSelectedContribution(null);
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <div className="contributions-container" data-testid="contributions-table-container">
      <div className="contributions-header">
        <div className="contributions-title-group">
          <h3 className="contributions-title">Cuotas de la Ronda</h3>
          <span
            className={`contributions-progress-badge ${totalPaidCount === contributions.length && contributions.length > 0 ? 'badge--success' : 'badge--warning'}`}
            data-testid="contributions-paid-counter"
          >
            {totalPaidCount}/{contributions.length} cuotas pagadas
          </span>
        </div>

        <div className="contributions-financial-stats">
          <div className="stat-pill stat-pill--collected">
            <span className="stat-label">Recaudado:</span>
            <strong>
              <CurrencyDisplay amount={totalRecaudado} />
            </strong>
          </div>
          {totalPendiente > 0 && (
            <div className="stat-pill stat-pill--pending">
              <span className="stat-label">Pendiente:</span>
              <strong>
                <CurrencyDisplay amount={totalPendiente} />
              </strong>
            </div>
          )}
        </div>
      </div>

      {contributions.length === 0 ? (
        <div className="contributions-empty" data-testid="contributions-empty">
          <p>No se encontraron cuotas generadas para esta ronda.</p>
        </div>
      ) : (
        <div className="contributions-table-wrapper">
          <table
            className="contributions-table"
            aria-label="Listado de aportes de la ronda actual"
            data-testid="contributions-table"
          >
            <thead>
              <tr>
                <th scope="col">Participante</th>
                <th scope="col">Monto</th>
                <th scope="col">Estado</th>
                <th scope="col">Detalle / Comprobante</th>
                <th scope="col">Fecha</th>
                <th scope="col">Acción</th>
              </tr>
            </thead>
            <tbody>
              {contributions.map((contribution) => (
                <ContributionRow
                  key={contribution.id}
                  contribution={contribution}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  isActionLoading={actionContributionId === contribution.id}
                  onOpenReportModal={handleOpenReportModal}
                  onValidatePayment={onValidatePayment}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal accesible para reportar pago */}
      <ReportPaymentModal
        isOpen={selectedContribution !== null}
        contribution={selectedContribution}
        isLoading={isReporting}
        onConfirm={handleConfirmReport}
        onCancel={() => setSelectedContribution(null)}
      />
    </div>
  );
};
