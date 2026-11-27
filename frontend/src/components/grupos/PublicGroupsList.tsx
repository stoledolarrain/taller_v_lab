import React from 'react';
import { usePublicGroups } from '../../hooks/usePublicGroups';
import {
  calcularTotalEsperado,
  formatearMontoBolivianos,
  formatearPeriodicidad,
  formatearReputacion,
} from '../../types/groups';
import type { ReputationLevel } from '../../types/auth';
import { StatusBadge } from '../ui/StatusBadge';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { EmptyState } from '../ui/EmptyState';

interface PublicGroupsListProps {
  onBack: () => void;
  onSelectGroup: (id: number) => void;
  onJoinedDirect?: () => void;
}

export const PublicGroupsList: React.FC<PublicGroupsListProps> = ({
  onBack,
  onSelectGroup,
  onJoinedDirect,
}) => {
  const {
    groups,
    page,
    totalCount,
    hasNext,
    hasPrevious,
    minReputationFilter,
    isLoading,
    joiningId,
    error,
    statusMessage,
    setPage,
    setMinReputationFilter,
    joinPublic,
    clearError,
    clearStatusMessage,
  } = usePublicGroups();

  const totalPages = Math.max(1, Math.ceil(totalCount / 6));

  return (
    <section
      className="group-list"
      aria-label="Explorar pasanakus públicos"
      data-testid="public-groups-screen"
    >
      <div className="group-list__header">
        <div>
          <button
            type="button"
            className="link-btn"
            onClick={onBack}
            data-testid="public-groups-back-btn"
          >
            ← Volver a Mis Pasanakus
          </button>
          <h2 className="group-list__title">Pasanakus Públicos</h2>
        </div>

        <div className="group-list__actions">
          <div className="form-group">
            <label htmlFor="public-min-rep-filter">Filtrar por reputación:</label>
            <select
              id="public-min-rep-filter"
              value={minReputationFilter}
              onChange={(e) =>
                setMinReputationFilter(e.target.value as ReputationLevel | '')
              }
              data-testid="public-reputation-filter"
            >
              <option value="">Todas</option>
              <option value="BAJA">Baja</option>
              <option value="MEDIA">Media</option>
              <option value="ALTA">Alta</option>
            </select>
          </div>
        </div>
      </div>

      {error && <ErrorMessage message={error} onDismiss={clearError} />}

      {statusMessage && (
        <div
          className="success-alert"
          role="status"
          data-testid="public-groups-status-alert"
        >
          <span>{statusMessage}</span>
          <button
            type="button"
            className="error-alert__dismiss"
            onClick={clearStatusMessage}
            aria-label="Cerrar notificación"
          >
            ✕
          </button>
        </div>
      )}

      {isLoading ? (
        <LoadingSpinner message="Cargando pasanakus públicos..." />
      ) : groups.length === 0 ? (
        <EmptyState
          title="No hay pasanakus públicos disponibles"
          description="No se encontraron grupos públicos con los filtros seleccionados."
        />
      ) : (
        <>
          <ul
            className="group-list__grid"
            role="list"
            data-testid="public-groups-grid"
          >
            {groups.map((group) => {
              const totalEsperado = calcularTotalEsperado(
                group.quota_amount,
                group.total_members
              );
              const isMember =
                group.my_role === 'ADMIN' || group.my_role === 'PARTICIPANTE';
              const minRep = group.min_reputation ?? 'BAJA';

              return (
                <li key={group.id} role="listitem">
                  <article
                    className="group-card"
                    data-testid={`public-group-card-${group.id}`}
                  >
                    <div className="group-card__header">
                      <div className="group-card__title-row">
                        <h3 className="group-card__name">{group.name}</h3>
                        <StatusBadge status={group.status} />
                      </div>
                      <span
                        className={`reputation-badge reputation-badge--${minRep.toLowerCase()}`}
                        data-testid={`public-group-min-rep-${group.id}`}
                      >
                        Reputación mín.: {formatearReputacion(minRep)}
                      </span>
                    </div>

                    {group.description && (
                      <p className="group-card__description">{group.description}</p>
                    )}

                    <dl className="group-card__details">
                      <div className="group-card__detail-row">
                        <dt>Cuota:</dt>
                        <dd>
                          <CurrencyDisplay amount={group.quota_amount} />{' '}
                          {formatearPeriodicidad(group.periodicity).toLowerCase()}
                        </dd>
                      </div>
                      <div className="group-card__detail-row">
                        <dt>Participantes:</dt>
                        <dd>
                          {group.current_members_count}/{group.total_members}
                        </dd>
                      </div>
                      <div className="group-card__detail-row">
                        <dt>Total por ronda:</dt>
                        <dd>
                          <strong>{formatearMontoBolivianos(totalEsperado)}</strong>
                        </dd>
                      </div>
                      <div className="group-card__detail-row">
                        <dt>Inicio:</dt>
                        <dd>{group.start_date}</dd>
                      </div>
                    </dl>

                    <div className="group-card__footer">
                      {isMember ? (
                        <button
                          type="button"
                          className="secondary-btn group-card__btn"
                          onClick={() => onSelectGroup(group.id)}
                          data-testid={`public-group-open-btn-${group.id}`}
                        >
                          Ya eres miembro (Ver grupo)
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="submit-btn group-card__btn"
                          disabled={group.is_full || joiningId === group.id}
                          onClick={() => joinPublic(group.id, onJoinedDirect)}
                          data-testid={`public-group-join-btn-${group.id}`}
                        >
                          {joiningId === group.id
                            ? 'Procesando...'
                            : group.is_full
                              ? 'Cupos llenos'
                              : 'Unirse / Solicitar'}
                        </button>
                      )}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>

          {(hasPrevious || hasNext || totalCount > 6) && (
            <div className="pagination-controls" data-testid="public-groups-pagination">
              <button
                type="button"
                className="secondary-btn"
                disabled={!hasPrevious || isLoading}
                onClick={() => setPage(page - 1)}
                data-testid="public-pagination-prev-btn"
              >
                Anterior
              </button>
              <span className="pagination-info" data-testid="public-pagination-info">
                Página {page} de {totalPages} ({totalCount} total)
              </span>
              <button
                type="button"
                className="secondary-btn"
                disabled={!hasNext || isLoading}
                onClick={() => setPage(page + 1)}
                data-testid="public-pagination-next-btn"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};
