import React from 'react';
import type { GroupSummary } from '../../types/groups';
import {
  formatearMontoBolivianos,
  formatearPeriodicidad,
  calcularTotalEsperado,
} from '../../types/groups';
import { StatusBadge } from '../ui/StatusBadge';
import { CurrencyDisplay } from '../ui/CurrencyDisplay';

interface GroupCardProps {
  group: GroupSummary;
  onSelect: (id: number) => void;
}

/**
 * GroupCard — tarjeta individual de un grupo de pasanaku.
 * View puro: solo renderiza, no hace llamadas HTTP.
 * data-testid en el botón de acceso para E2E 01.
 */
export const GroupCard: React.FC<GroupCardProps> = ({ group, onSelect }) => {
  const totalEsperado = calcularTotalEsperado(group.quota_amount, group.total_members);
  const rolLabel = group.my_role === 'ADMIN' ? 'Administrador' : 'Participante';

  return (
    <article
      className="group-card"
      data-testid={`group-card-${group.id}`}
      aria-label={`Grupo ${group.name}, estado ${group.status}`}
    >
      <div className="group-card__header">
        <div className="group-card__title-row">
          <h3 className="group-card__name">{group.name}</h3>
          <StatusBadge status={group.status} />
        </div>
        <span
          className={`group-card__role-badge group-card__role-badge--${group.my_role.toLowerCase()}`}
          aria-label={`Tu rol: ${rolLabel}`}
        >
          {rolLabel}
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
            <span data-testid={`group-card-members-${group.id}`}>
              {group.current_members_count}/{group.total_members}
            </span>
          </dd>
        </div>
        <div className="group-card__detail-row">
          <dt>Total por ronda:</dt>
          <dd>
            <strong data-testid={`group-card-total-${group.id}`}>
              {formatearMontoBolivianos(totalEsperado)}
            </strong>
          </dd>
        </div>
        <div className="group-card__detail-row">
          <dt>Inicio:</dt>
          <dd>{group.start_date}</dd>
        </div>
      </dl>

      <div className="group-card__footer">
        <button
          type="button"
          className="submit-btn group-card__btn"
          onClick={() => onSelect(group.id)}
          aria-label={`Ver detalle del grupo ${group.name}`}
          data-testid={`group-card-select-btn-${group.id}`}
        >
          Ver grupo →
        </button>
      </div>
    </article>
  );
};
