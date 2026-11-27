import React from 'react';
import type { GroupSummary } from '../../types/groups';
import { GroupCard } from './GroupCard';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { EmptyState } from '../ui/EmptyState';

interface GroupListProps {
  groups: GroupSummary[];
  page?: number;
  totalCount?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
  onPageChange?: (page: number) => void;
  isLoading: boolean;
  error: string | null;
  onSelectGroup: (id: number) => void;
  onCreateGroup: () => void;
  onJoinGroup: () => void;
  onExplorePublic?: () => void;
  onDismissError?: () => void;
}

/**
 * GroupList — listado de grupos del usuario autenticado.
 * Cubre los cuatro estados de UI: carga, error, vacío y datos.
 * data-testid en botones críticos para E2E 01.
 */
export const GroupList: React.FC<GroupListProps> = ({
  groups,
  page = 1,
  totalCount = groups.length,
  hasNext = false,
  hasPrevious = false,
  onPageChange,
  isLoading,
  error,
  onSelectGroup,
  onCreateGroup,
  onJoinGroup,
  onExplorePublic,
  onDismissError,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalCount / 6));
  return (
    <section className="group-list" aria-label="Mis grupos de pasanaku">
      <div className="group-list__header">
        <h2 className="group-list__title">Mis Pasanakus</h2>
        <div className="group-list__actions">
          {onExplorePublic && (
            <button
              type="button"
              className="secondary-btn"
              onClick={onExplorePublic}
              data-testid="explore-public-groups-btn"
            >
              Explorar públicos
            </button>
          )}
          <button
            type="button"
            className="secondary-btn"
            onClick={onJoinGroup}
            aria-label="Unirse a un grupo con código de invitación"
            data-testid="join-group-btn"
          >
            Unirse con código
          </button>
          <button
            type="button"
            className="submit-btn"
            onClick={onCreateGroup}
            aria-label="Crear nuevo grupo de pasanaku"
            data-testid="create-group-btn"
          >
            + Crear grupo
          </button>
        </div>
      </div>

      {error && <ErrorMessage message={error} onDismiss={onDismissError} />}

      {isLoading ? (
        <LoadingSpinner message="Cargando tus grupos..." />
      ) : groups.length === 0 ? (
        <EmptyState
          title="Aún no tienes grupos"
          description="Crea tu primer pasanaku o únete a uno con un código de invitación."
          action={
            <button
              type="button"
              className="submit-btn"
              onClick={onCreateGroup}
              data-testid="empty-create-group-btn"
            >
              Crear mi primer grupo
            </button>
          }
        />
      ) : (
        <>
          <ul
            className="group-list__grid"
            role="list"
            aria-label={`${groups.length} grupo${groups.length !== 1 ? 's' : ''} encontrado${groups.length !== 1 ? 's' : ''}`}
          >
            {groups.map((group) => (
              <li key={group.id} role="listitem">
                <GroupCard group={group} onSelect={onSelectGroup} />
              </li>
            ))}
          </ul>

          {onPageChange && (hasPrevious || hasNext || totalCount > 6) && (
            <div className="pagination-controls" data-testid="groups-pagination">
              <button
                type="button"
                className="secondary-btn"
                disabled={!hasPrevious || isLoading}
                onClick={() => onPageChange(page - 1)}
                data-testid="pagination-prev-btn"
              >
                Anterior
              </button>
              <span className="pagination-info" data-testid="pagination-page-info">
                Página {page} de {totalPages} ({totalCount} total)
              </span>
              <button
                type="button"
                className="secondary-btn"
                disabled={!hasNext || isLoading}
                onClick={() => onPageChange(page + 1)}
                data-testid="pagination-next-btn"
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
