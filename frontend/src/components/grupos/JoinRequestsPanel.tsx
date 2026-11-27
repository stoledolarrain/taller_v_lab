import React from 'react';
import { formatearReputacion } from '../../types/groups';
import type { GroupJoinRequest } from '../../types/groups';

interface JoinRequestsPanelProps {
  requests: GroupJoinRequest[];
  actionRequestId: number | null;
  onApprove: (requestId: number) => Promise<void>;
  onReject: (requestId: number) => Promise<void>;
}

export const JoinRequestsPanel: React.FC<JoinRequestsPanelProps> = ({
  requests,
  actionRequestId,
  onApprove,
  onReject,
}) => {
  const pendingRequests = requests.filter((r) => r.status === 'PENDIENTE');

  return (
    <section
      className="group-detail__turns"
      aria-label="Solicitudes de ingreso pendientes"
      data-testid="join-requests-panel"
    >
      <h3>Solicitudes de Ingreso ({pendingRequests.length})</h3>
      {pendingRequests.length === 0 ? (
        <p className="form-hint" data-testid="join-requests-empty">
          No hay solicitudes pendientes de revisión.
        </p>
      ) : (
        <ul className="members-list__items" role="list">
          {pendingRequests.map((req) => {
            const isProcessing = actionRequestId === req.id;
            const rep = req.user.reputation ?? 'MEDIA';
            return (
              <li
                key={req.id}
                className="members-list__item"
                data-testid={`join-request-item-${req.id}`}
              >
                <div className="members-list__user-info">
                  <div>
                    <span className="members-list__username">
                      {req.user.full_name || req.user.username} (@{req.user.username})
                    </span>
                    <span className="members-list__meta">
                      <span
                        className={`reputation-badge reputation-badge--${rep.toLowerCase()}`}
                      >
                        Rep: {formatearReputacion(rep)}
                      </span>
                      {req.message && (
                        <span className="members-list__handle">"{req.message}"</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="group-detail__actions">
                  <button
                    type="button"
                    className="submit-btn"
                    disabled={isProcessing}
                    onClick={() => onApprove(req.id)}
                    data-testid={`approve-join-request-btn-${req.id}`}
                  >
                    Aprobar
                  </button>
                  <button
                    type="button"
                    className="danger-btn-sm"
                    disabled={isProcessing}
                    onClick={() => onReject(req.id)}
                    data-testid={`reject-join-request-btn-${req.id}`}
                  >
                    Rechazar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
