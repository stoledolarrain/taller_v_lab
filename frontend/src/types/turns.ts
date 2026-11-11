import type { PasanakuTurn, GroupDetail } from './groups';

export interface TurnAssignment {
  user_id: number;
  turn_number: number;
}

export interface TurnManualAssignInput {
  assignments: TurnAssignment[];
}

export interface RaffleResponse {
  message: string;
  turns: PasanakuTurn[];
}

export interface StartGroupResponse {
  message: string;
  group: GroupDetail;
}

/**
 * Validador puro para la asignación manual de turnos.
 * Regla de negocio:
 * 1. La cantidad de asignaciones debe igualar la cantidad total de participantes.
 * 2. Cada participante debe aparecer exactamente una vez.
 * 3. Los números de turno deben ser exactamente del 1 a totalMembers sin repetidos ni saltos.
 *
 * Exportada para ser testeada de forma unitaria.
 */
export function validarAsignacionTurnos(
  assignments: TurnAssignment[],
  totalMembers: number
): { isValid: boolean; error?: string } {
  if (assignments.length !== totalMembers) {
    return {
      isValid: false,
      error: `Se deben asignar los ${totalMembers} turnos (actualmente hay ${assignments.length}).`,
    };
  }

  const turnNumbers = new Set(assignments.map((a) => a.turn_number));
  if (turnNumbers.size !== totalMembers) {
    return {
      isValid: false,
      error: 'Existen números de turno duplicados.',
    };
  }

  for (let i = 1; i <= totalMembers; i++) {
    if (!turnNumbers.has(i)) {
      return {
        isValid: false,
        error: `Falta asignar el turno número ${i}.`,
      };
    }
  }

  const userIds = new Set(assignments.map((a) => a.user_id));
  if (userIds.size !== totalMembers) {
    return {
      isValid: false,
      error: 'Un participante tiene más de un turno asignado.',
    };
  }

  return { isValid: true };
}
