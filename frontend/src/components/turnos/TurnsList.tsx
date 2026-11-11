import React from 'react';
import type { PasanakuTurn } from '../../types/groups';
import { RaffleButton } from './RaffleButton';

interface TurnsListProps {
  turns: PasanakuTurn[];
  totalMembers: number;
  isAdmin: boolean;
  isEditable: boolean;
  isFull: boolean;
  isRaffling: boolean;
  onRaffle: () => Promise<void>;
}

/**
 * TurnsList — vista del orden de turnos y beneficiarios asignados (1 a N).
 * Cumple MVVM: componente puro de presentación.
 * Contiene data-testid requeridos para pruebas E2E 02.
 */
export const TurnsList: React.FC<TurnsListProps> = ({
  turns = [],
  totalMembers,
  isAdmin,
  isEditable,
  isFull,
  isRaffling,
  onRaffle,
}) => {
  const sortedTurns = [...turns].sort((a, b) => a.turn_number - b.turn_number);
  const hasAllTurns = turns.length === totalMembers && totalMembers > 0;

  return (
    <section className="turns-section" aria-label="Orden de turnos y beneficiarios">
      <div className="turns-section__header">
        <div className="turns-section__title-group">
          <h3 className="turns-section__title">Orden de Beneficiarios</h3>
          <span
            className={`turns-badge ${hasAllTurns ? 'turns-badge--complete' : 'turns-badge--pending'}`}
            data-testid="turns-assigned-counter"
          >
            {turns.length}/{totalMembers} asignados
          </span>
        </div>

        {isEditable && isAdmin && (
          <RaffleButton
            onRaffle={onRaffle}
            isRaffling={isRaffling}
            isFull={isFull}
            isAdmin={isAdmin}
            isEditable={isEditable}
          />
        )}
      </div>

      {sortedTurns.length === 0 ? (
        <div className="turns-empty" data-testid="turns-empty-state">
          <p className="turns-empty__text">
            {isFull
              ? 'Los cupos están completos. El administrador ya puede realizar el sorteo de turnos.'
              : 'Aún no se han asignado turnos. Se asignarán una vez que el grupo complete sus cupos.'}
          </p>
        </div>
      ) : (
        <ol className="turns-list" role="list" data-testid="turns-list">
          {sortedTurns.map((turn) => {
            const userName =
              turn.user.full_name ||
              [turn.user.first_name, turn.user.last_name].filter(Boolean).join(' ') ||
              turn.user.username;

            return (
              <li
                key={turn.id || turn.turn_number}
                className="turns-item"
                data-testid={`turn-item-${turn.turn_number}`}
              >
                <span
                  className="turns-item__number"
                  aria-label={`Turno ${turn.turn_number}`}
                >
                  #{turn.turn_number}
                </span>
                <div className="turns-item__info">
                  <span className="turns-item__name">{userName}</span>
                  <span className="turns-item__username">@{turn.user.username}</span>
                </div>
                <span className="turns-item__badge" aria-label="Beneficiario de ronda">
                  Beneficiario Ronda {turn.turn_number}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};
