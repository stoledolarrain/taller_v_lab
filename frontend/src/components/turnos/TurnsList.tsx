import React from 'react';
import type { GroupStatus, PasanakuTurn, Periodicity } from '../../types/groups';
import { calcularFechaEstimadaTurno } from '../../types/groups';
import { formatearFecha } from '../../types/contributions';
import { RaffleButton } from './RaffleButton';

interface TurnsListProps {
  turns: PasanakuTurn[];
  totalMembers: number;
  isAdmin: boolean;
  isEditable: boolean;
  isFull: boolean;
  isRaffling: boolean;
  onRaffle: () => Promise<void>;
  /** Datos para el calendario estimado de turnos */
  startDate?: string;
  periodicity?: Periodicity;
  groupStatus?: GroupStatus;
  /** Número de la ronda activa (si el pasanaku está en curso) */
  currentRoundNumber?: number | null;
}

type EstadoTurno = 'recibido' | 'en-curso' | 'proximo';

const ETIQUETA_ESTADO: Record<EstadoTurno, string> = {
  recibido: 'Ya recibió',
  'en-curso': 'Ronda en curso',
  proximo: 'Próximo',
};

/**
 * TurnsList — vista del orden de turnos y beneficiarios asignados (1 a N),
 * con el calendario estimado de cada turno (PDF Sec. 2: consultar calendario y turnos).
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
  startDate,
  periodicity,
  groupStatus,
  currentRoundNumber = null,
}) => {
  const sortedTurns = [...turns].sort((a, b) => a.turn_number - b.turn_number);
  const hasAllTurns = turns.length === totalMembers && totalMembers > 0;

  const estadoDelTurno = (turnNumber: number): EstadoTurno | null => {
    if (groupStatus === 'FINALIZADO') return 'recibido';
    if (groupStatus !== 'INICIADO' || !currentRoundNumber) return null;
    if (turnNumber < currentRoundNumber) return 'recibido';
    if (turnNumber === currentRoundNumber) return 'en-curso';
    return 'proximo';
  };

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
            const fechaEstimada =
              startDate && periodicity
                ? formatearFecha(
                    calcularFechaEstimadaTurno(startDate, periodicity, turn.turn_number)
                  )
                : null;
            const estado = estadoDelTurno(turn.turn_number);

            return (
              <li
                key={turn.id || turn.turn_number}
                className={`turns-item ${estado ? `turns-item--${estado}` : ''}`}
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
                <div className="turns-item__meta">
                  {fechaEstimada && (
                    <span
                      className="turns-item__date"
                      title="Fecha estimada según la fecha de inicio y la periodicidad"
                      data-testid={`turn-date-${turn.turn_number}`}
                    >
                      Fecha estimada: {fechaEstimada}
                    </span>
                  )}
                  <span
                    className={`turns-item__badge ${estado ? `turns-item__badge--${estado}` : ''}`}
                  >
                    {estado
                      ? ETIQUETA_ESTADO[estado]
                      : `Beneficiario Ronda ${turn.turn_number}`}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};
