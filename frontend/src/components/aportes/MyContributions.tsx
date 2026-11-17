import React from 'react';
import type { Contribution } from '../../types/contributions';
import { estaReportadaSinValidar, formatearFecha } from '../../types/contributions';
import { StatusBadge } from '../ui/StatusBadge';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';

interface MyContributionsProps {
  contributions: Contribution[];
  totalPagado: number;
  totalPendiente: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * MyContributions — historial de cuotas del usuario autenticado en el grupo,
 * separando pendientes y pagadas, con fecha de pago y fecha de validación
 * (PDF Sec. 8). Componente de presentación puro.
 * data-testid="my-contributions" para pruebas E2E 06.
 */
export const MyContributions: React.FC<MyContributionsProps> = ({
  contributions,
  totalPagado,
  totalPendiente,
  isLoading,
  error,
}) => {
  const pagadas = contributions.filter((c) => c.status === 'PAGADA').length;
  const pendientes = contributions.length - pagadas;

  return (
    <section
      className="contributions-container"
      aria-label="Mis cuotas en este grupo"
      data-testid="my-contributions"
    >
      <div className="contributions-header">
        <div className="contributions-title-group">
          <h3 className="contributions-title">Mis Cuotas</h3>
          <span
            className={`contributions-progress-badge ${pendientes === 0 ? 'badge--success' : 'badge--warning'}`}
            data-testid="my-contributions-counter"
          >
            {pagadas} pagada{pagadas !== 1 ? 's' : ''} · {pendientes} pendiente
            {pendientes !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="contributions-financial-stats">
          <div className="stat-pill stat-pill--collected">
            <span className="stat-label">Pagado:</span>
            <strong>
              <CurrencyDisplay amount={totalPagado} />
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

      {error ? (
        <div className="contributions-empty" role="alert">
          <p>{error}</p>
        </div>
      ) : isLoading && contributions.length === 0 ? (
        <div className="contributions-empty" role="status">
          <p>Cargando tus cuotas...</p>
        </div>
      ) : contributions.length === 0 ? (
        <div className="contributions-empty">
          <p>Aún no tienes cuotas generadas en este grupo.</p>
        </div>
      ) : (
        <div className="contributions-table-wrapper">
          <table className="contributions-table" aria-label="Historial de mis cuotas">
            <thead>
              <tr>
                <th scope="col">Ronda</th>
                <th scope="col">Monto</th>
                <th scope="col">Estado</th>
                <th scope="col">Fecha de pago</th>
                <th scope="col">Fecha de validación</th>
              </tr>
            </thead>
            <tbody>
              {contributions.map((c) => {
                const reportada = estaReportadaSinValidar(c);
                return (
                  <tr
                    key={c.id}
                    className="contribution-row"
                    data-testid={`my-contribution-row-${c.id}`}
                  >
                    <td>
                      <strong className="round-history-num">#{c.round_number}</strong>
                    </td>
                    <td className="contribution-row__amount">
                      <CurrencyDisplay amount={c.amount} />
                    </td>
                    <td>
                      <div className="contribution-status-cell">
                        <StatusBadge status={c.status} />
                        {reportada && (
                          <span className="contribution-reported-chip">Por validar</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {formatearFecha(c.payment_date) ? (
                        <span className="contribution-date">
                          {formatearFecha(c.payment_date)}
                        </span>
                      ) : (
                        <span className="contribution-date-pending">Sin registrar</span>
                      )}
                    </td>
                    <td>
                      {formatearFecha(c.validation_date) ? (
                        <span className="contribution-date">
                          {formatearFecha(c.validation_date)}
                        </span>
                      ) : (
                        <span className="contribution-date-pending">
                          {reportada ? 'Esperando al administrador' : 'Sin validar'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};
