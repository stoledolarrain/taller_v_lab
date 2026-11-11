import type { User } from './auth';
import type { Contribution } from './contributions';

export type RoundStatus = 'ACTIVA' | 'CERRADA' | 'PENDIENTE' | 'COMPLETADA';

export interface Round {
  id: number;
  group_id: number;
  round_number: number;
  beneficiary: User;
  status: RoundStatus;
  expected_amount: string; // Decimal serializado como string, ej. "1000.00"
  total_collected: string;
  total_pending: string;
  has_pending_contributions: boolean;
  start_date: string | null;
  end_date: string | null;
  delivered_to_beneficiary: boolean;
  delivered_at: string | null;
  closed_at: string | null;
  created_at: string;
}

export interface RoundDetail extends Round {
  contributions: Contribution[];
}

export interface CloseRoundResponse {
  message: string;
  closed_round: Round;
  next_round?: RoundDetail | null;
  is_finished?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIONES PURAS — Exportadas para pruebas unitarias (PDF Sec. 6 y 11)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula el monto total esperado de la ronda: cuota × cantidad de participantes.
 * Ejemplo del PDF: 5 participantes × Bs 200 = Bs 1.000
 *
 * @param quotaAmount - Monto de la cuota acordada
 * @param totalMembers - Cantidad total de participantes del grupo
 * @returns Total esperado redondeado a 2 decimales
 */
export function calcularTotalEsperadoRonda(
  quotaAmount: number | string,
  totalMembers: number
): number {
  const quota = typeof quotaAmount === 'string' ? parseFloat(quotaAmount) : quotaAmount;
  if (isNaN(quota) || quota <= 0 || totalMembers <= 0) {
    return 0;
  }
  return Math.round(quota * totalMembers * 100) / 100;
}

/**
 * Determina si una ronda puede cerrarse.
 * Regla Crítica del PDF (Sec. 6):
 * "Una ronda no puede marcarse como completada ni avanzar al siguiente turno
 * mientras existan aportes en estado PENDIENTE."
 *
 * @param contributions - Lista de cuotas asociadas a la ronda
 * @returns true si todas las cuotas están PAGADA y la lista no está vacía; false si hay alguna PENDIENTE.
 */
export function puedeCerrarRonda(contributions: Contribution[]): boolean {
  if (!contributions || contributions.length === 0) {
    return false;
  }
  return contributions.every((c) => c.status === 'PAGADA');
}
