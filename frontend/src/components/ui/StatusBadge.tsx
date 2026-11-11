import React from 'react';
import type { GroupStatus } from '../../types/groups';
import type { ContributionStatus } from '../../types/contributions';
import type { RoundStatus } from '../../types/rounds';

type AnyStatus = GroupStatus | ContributionStatus | RoundStatus;

interface StatusBadgeProps {
  status: AnyStatus;
  className?: string;
}

const STATUS_CONFIG: Record<AnyStatus, { label: string; className: string }> = {
  // Group statuses
  BORRADOR: { label: 'Borrador', className: 'status-badge--borrador' },
  INICIADO: { label: 'Iniciado', className: 'status-badge--iniciado' },
  FINALIZADO: { label: 'Finalizado', className: 'status-badge--finalizado' },
  // Contribution statuses
  PENDIENTE: { label: 'Pendiente', className: 'status-badge--pendiente' },
  PAGADA: { label: 'Pagada', className: 'status-badge--pagada' },
  // Round statuses
  ACTIVA: { label: 'Activa', className: 'status-badge--activa' },
  CERRADA: { label: 'Cerrada', className: 'status-badge--cerrada' },
  COMPLETADA: { label: 'Completada', className: 'status-badge--cerrada' },
};

/**
 * StatusBadge — representa un estado del negocio con texto visible + color.
 * Regla de accesibilidad: nunca usar color como único indicador de estado.
 * El texto siempre es visible (ui-design-system SKILL).
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = STATUS_CONFIG[status] ?? { label: status, className: '' };
  return (
    <span
      className={`status-badge ${config.className} ${className ?? ''}`.trim()}
      role="status"
      aria-label={`Estado: ${config.label}`}
      data-testid={`status-badge-${status.toLowerCase()}`}
    >
      {config.label}
    </span>
  );
};
