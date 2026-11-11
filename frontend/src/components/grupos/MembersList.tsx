import React, { useState } from 'react';
import { ConfirmModal } from '../ui/ConfirmModal';
import { ErrorMessage } from '../ui/ErrorMessage';
import type { GroupMembership } from '../../types/groups';

interface MembersListProps {
  members?: GroupMembership[];
  isAdmin: boolean;
  isEditable: boolean;
  currentUserId: number;
  onRemoveMember: (userId: number) => Promise<void>;
}

/**
 * MembersList — lista de participantes del grupo.
 * Muestra el rol de cada participante y, para el admin en BORRADOR,
 * permite expulsar participantes (excepto a sí mismo).
 * data-testid para E2E 01 y E2E 07.
 */
export const MembersList: React.FC<MembersListProps> = ({
  members = [],
  isAdmin,
  isEditable,
  currentUserId,
  onRemoveMember,
}) => {
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [confirmUserId, setConfirmUserId] = useState<number | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const memberToRemove = (members ?? []).find((m) => m.user.id === confirmUserId);

  const handleConfirmRemove = async () => {
    if (!confirmUserId) return;
    setRemovingId(confirmUserId);
    setConfirmUserId(null);
    setRemoveError(null);
    try {
      await onRemoveMember(confirmUserId);
    } catch {
      setRemoveError('Error al expulsar al participante. Intenta nuevamente.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="members-list" data-testid="members-list">
      <h3 className="members-list__title">Participantes ({(members ?? []).length})</h3>

      {removeError && (
        <ErrorMessage message={removeError} onDismiss={() => setRemoveError(null)} />
      )}

      <ul role="list" className="members-list__items" aria-label="Lista de participantes">
        {(members ?? []).map((membership) => {
          const isCurrentUser = membership.user.id === currentUserId;
          const rolLabel = membership.role === 'ADMIN' ? 'Administrador' : 'Participante';
          const isBeingRemoved = removingId === membership.user.id;

          return (
            <li
              key={membership.id}
              role="listitem"
              className={`members-list__item ${isCurrentUser ? 'members-list__item--current' : ''}`}
              data-testid={`member-item-${membership.user.id}`}
            >
              <div className="members-list__user-info">
                <span className="members-list__avatar" aria-hidden="true">
                  {membership.role === 'ADMIN' ? '👑' : '👤'}
                </span>
                <div>
                  <span className="members-list__username">
                    {membership.user.full_name || membership.user.username}
                    {isCurrentUser && (
                      <span className="members-list__you-tag"> (tú)</span>
                    )}
                  </span>
                  <span
                    className={`members-list__role members-list__role--${membership.role.toLowerCase()}`}
                    aria-label={`Rol: ${rolLabel}`}
                  >
                    {rolLabel}
                  </span>
                </div>
              </div>

              {isAdmin && isEditable && !isCurrentUser && (
                <button
                  type="button"
                  className="danger-btn-sm"
                  onClick={() => setConfirmUserId(membership.user.id)}
                  disabled={isBeingRemoved}
                  aria-label={`Expulsar a ${membership.user.full_name || membership.user.username}`}
                  data-testid={`remove-member-btn-${membership.user.id}`}
                >
                  {isBeingRemoved ? 'Expulsando...' : 'Expulsar'}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <ConfirmModal
        isOpen={confirmUserId !== null}
        title="¿Expulsar participante?"
        description={`¿Estás seguro de que deseas expulsar a ${(memberToRemove?.user.full_name || memberToRemove?.user.username) ?? 'este participante'}? Esta acción no se puede deshacer.`}
        confirmLabel="Sí, expulsar"
        isDanger
        onConfirm={handleConfirmRemove}
        onCancel={() => setConfirmUserId(null)}
      />
    </div>
  );
};
