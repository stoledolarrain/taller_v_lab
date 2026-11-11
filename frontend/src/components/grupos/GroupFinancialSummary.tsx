import React, { useState } from 'react';
import type { GroupFinancialSummary as FinancialSummaryType } from '../../types/reminders';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';

interface GroupFinancialSummaryProps {
  summary: FinancialSummaryType | null;
  isLoading: boolean;
  onRefresh?: () => void;
}

/**
 * GroupFinancialSummary — Tarjeta con métricas financieras consolidadas del pasanaku
 * y desglose de participantes deudores [PDF Sec. 8].
 * data-testid="financial-summary-card"
 */
export const GroupFinancialSummary: React.FC<GroupFinancialSummaryProps> = ({
  summary,
  isLoading,
  onRefresh,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading && !summary) {
    return (
      <div className="financial-summary-loading" role="status">
        Cargando métricas financieras...
      </div>
    );
  }

  if (!summary) return null;

  const currentRound = summary.current_round;
  const debtors = currentRound?.debtors ?? [];

  return (
    <div
      className="financial-summary-card"
      data-testid="financial-summary-card"
      aria-label="Balance financiero y control de deudores"
    >
      <div className="financial-summary-header">
        <div className="financial-summary-title-group">
          <h3 className="financial-summary-title">📊 Balance Financiero Global</h3>
          <span className="financial-summary-subtitle">
            Control de aportes y trazabilidad
          </span>
        </div>

        <button
          type="button"
          className="link-btn toggle-debtors-btn"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          data-testid="toggle-financial-details-btn"
        >
          {isExpanded ? '▲ Menos detalles' : '▼ Ver deudores y balance'}
        </button>
      </div>

      <div className="financial-kpi-grid">
        <div className="kpi-box">
          <span className="kpi-label">Fondo Total Previsto</span>
          <strong className="kpi-value">
            <CurrencyDisplay amount={summary.total_expected_overall} />
          </strong>
        </div>

        <div className="kpi-box kpi-box--success">
          <span className="kpi-label">Total Recaudado Histórico</span>
          <strong className="kpi-value text-success">
            <CurrencyDisplay amount={summary.total_collected_overall} />
          </strong>
        </div>

        <div className="kpi-box kpi-box--warning">
          <span className="kpi-label">Total Pendiente General</span>
          <strong className="kpi-value text-warning">
            <CurrencyDisplay amount={summary.total_pending_overall} />
          </strong>
        </div>
      </div>

      {isExpanded && (
        <div className="financial-summary-details">
          {currentRound && (
            <div className="debtors-section">
              <h4 className="debtors-title">
                Participantes con Cuota Pendiente en Ronda #{currentRound.round_number} (
                {debtors.length}):
              </h4>

              {debtors.length === 0 ? (
                <p className="no-debtors-msg">
                  ✨ ¡Excelente! No existen cuotas pendientes en la ronda activa.
                </p>
              ) : (
                <ul className="debtors-list" role="list">
                  {debtors.map((debtor) => (
                    <li
                      key={debtor.contribution_id}
                      className="debtor-item"
                      data-testid={`debtor-item-${debtor.user_id}`}
                    >
                      <div className="debtor-info">
                        <strong>{debtor.full_name}</strong>{' '}
                        <span className="debtor-username">@{debtor.username}</span>
                        {debtor.phone_number && (
                          <span className="debtor-phone">📱 {debtor.phone_number}</span>
                        )}
                      </div>
                      <div className="debtor-amount">
                        Debe: <CurrencyDisplay amount={debtor.amount} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {onRefresh && (
            <div className="financial-summary-actions">
              <button
                type="button"
                className="link-btn"
                onClick={onRefresh}
                data-testid="refresh-financial-summary-btn"
              >
                ↺ Actualizar balance
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
