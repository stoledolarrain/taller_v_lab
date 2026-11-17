import { apiRequest } from './apiClient';
import type { Round, RoundDetail, CloseRoundResponse } from '../types/rounds';

export const roundsService = {
  /** GET /groups/:id/rounds/current/ — Ronda activa actual con sus cuotas */
  async getCurrentRound(groupId: number): Promise<RoundDetail | null> {
    try {
      const data = await apiRequest<RoundDetail | { message?: string }>(
        `/groups/${groupId}/rounds/current/`
      );
      if (data && 'id' in data && data.id && data.beneficiary) {
        return data as RoundDetail;
      }
      return null;
    } catch {
      return null;
    }
  },

  /** GET /groups/:id/rounds/ — Historial de todas las rondas del grupo */
  async getRoundHistory(groupId: number): Promise<Round[]> {
    return apiRequest<Round[]>(`/groups/${groupId}/rounds/`);
  },

  /** GET /rounds/:id/ — Detalle de una ronda específica con sus cuotas */
  async getRoundDetail(roundId: number): Promise<RoundDetail> {
    return apiRequest<RoundDetail>(`/rounds/${roundId}/`);
  },

  /**
   * POST /rounds/:id/close/ — Cierre atómico de la ronda actual:
   * Valida bloqueo por deuda, confirma entrega al beneficiario y abre la siguiente ronda.
   */
  async closeRound(roundId: number): Promise<CloseRoundResponse> {
    return apiRequest<CloseRoundResponse>(`/rounds/${roundId}/close/`, {
      method: 'POST',
    });
  },
};
