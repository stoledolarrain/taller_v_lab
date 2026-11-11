import { apiRequest } from './apiClient';
import type { PasanakuTurn } from '../types/groups';
import type { TurnAssignment, RaffleResponse, StartGroupResponse } from '../types/turns';

export const turnsService = {
  /** GET /groups/:id/turns/ — Listar orden de turnos asignados (1 a N) */
  async getTurns(groupId: number): Promise<PasanakuTurn[]> {
    return apiRequest<PasanakuTurn[]>(`/groups/${groupId}/turns/`);
  },

  /** POST /groups/:id/turns/manual/ — Asignar turnos manualmente (1:1 estricto) */
  async assignTurnsManual(
    groupId: number,
    assignments: TurnAssignment[]
  ): Promise<{ message: string; turns: PasanakuTurn[] }> {
    return apiRequest<{ message: string; turns: PasanakuTurn[] }>(
      `/groups/${groupId}/turns/manual/`,
      {
        method: 'POST',
        body: JSON.stringify({ assignments }),
      }
    );
  },

  /** POST /groups/:id/turns/raffle/ — Sorteo automático aleatorio de turnos (admin, BORRADOR) */
  async raffleTurns(groupId: number): Promise<RaffleResponse> {
    return apiRequest<RaffleResponse>(`/groups/${groupId}/turns/raffle/`, {
      method: 'POST',
    });
  },

  /** POST /groups/:id/start/ — Iniciar pasanaku (valida cupos llenos y turnos, genera Ronda 1) */
  async startGroup(groupId: number): Promise<StartGroupResponse> {
    return apiRequest<StartGroupResponse>(`/groups/${groupId}/start/`, {
      method: 'POST',
    });
  },
};
