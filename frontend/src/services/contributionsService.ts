import { apiRequest } from './apiClient';
import type {
  Contribution,
  PayContributionResponse,
  ValidateContributionResponse,
} from '../types/contributions';

export const contributionsService = {
  /** GET /rounds/:id/contributions/ — Listar las cuotas de una ronda */
  async getRoundContributions(roundId: number): Promise<Contribution[]> {
    return apiRequest<Contribution[]>(`/rounds/${roundId}/contributions/`);
  },

  /**
   * POST /contributions/:id/pay/ — Reportar el pago de una cuota por el participante
   * La app registra pagos fuera de la plataforma (no hace transferencias reales).
   */
  async reportPayment(
    contributionId: number,
    notes: string = ''
  ): Promise<PayContributionResponse> {
    return apiRequest<PayContributionResponse>(`/contributions/${contributionId}/pay/`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  /**
   * POST /contributions/:id/validate/ — Validar cuota como PAGADA (Solo Administrador)
   */
  async validatePayment(contributionId: number): Promise<ValidateContributionResponse> {
    return apiRequest<ValidateContributionResponse>(
      `/contributions/${contributionId}/validate/`,
      {
        method: 'POST',
      }
    );
  },

  /**
   * GET /users/me/contributions/ — Mis cuotas pendientes y pagadas a través de mis grupos
   */
  async getMyContributions(): Promise<Contribution[]> {
    return apiRequest<Contribution[]>('/users/me/contributions/');
  },
};
