import { apiRequest } from './apiClient';
import type {
  Reminder,
  GroupFinancialSummary,
  SendRemindersResponse,
} from '../types/reminders';

export const remindersService = {
  /**
   * POST /groups/:id/reminders/ — Enviar recordatorios internos a los deudores de la ronda activa (Admin)
   */
  async sendReminders(
    groupId: number,
    message: string = ''
  ): Promise<SendRemindersResponse> {
    return apiRequest<SendRemindersResponse>(`/groups/${groupId}/reminders/`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  /**
   * GET /users/me/reminders/ — Listar los recordatorios y notificaciones internas del usuario autenticado
   */
  async getMyReminders(): Promise<Reminder[]> {
    return apiRequest<Reminder[]>('/users/me/reminders/');
  },

  /**
   * POST /reminders/:id/read/ — Marcar un recordatorio como leído
   */
  async markReminderAsRead(id: number): Promise<{ message: string; reminder: Reminder }> {
    return apiRequest<{ message: string; reminder: Reminder }>(`/reminders/${id}/read/`, {
      method: 'POST',
    });
  },

  /**
   * GET /groups/:id/summary/ — Balance financiero global, estado de ronda y lista de deudores
   */
  async getGroupSummary(groupId: number): Promise<GroupFinancialSummary> {
    return apiRequest<GroupFinancialSummary>(`/groups/${groupId}/summary/`);
  },
};
