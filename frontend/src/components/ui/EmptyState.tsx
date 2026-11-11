import React from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: string;
  action?: React.ReactNode;
}

/**
 * EmptyState — estado vacío con mensaje descriptivo.
 * Siempre provee un título significativo para accesibilidad.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon = '📭',
  action,
}) => {
  return (
    <div
      className="empty-state"
      role="status"
      aria-label={title}
      data-testid="empty-state"
    >
      <span className="empty-state__icon" aria-hidden="true">
        {icon}
      </span>
      <h3 className="empty-state__title">{title}</h3>
      {description && <p className="empty-state__description">{description}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
};
