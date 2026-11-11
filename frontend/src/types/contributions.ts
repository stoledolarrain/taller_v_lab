import type { User } from './auth';

export type ContributionStatus = 'PENDIENTE' | 'PAGADA';

export interface Contribution {
  id: number;
  group_id: number;
  round_id: number;
  round_number: number;
  user: User;
  amount: string; // Decimal serializado como string, ej. "200.00"
  status: ContributionStatus;
  payment_date: string | null;
  validation_date: string | null;
  validated_by: User | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ReportPaymentInput {
  notes?: string;
}

export type PayContributionInput = ReportPaymentInput;

export interface ValidateContributionInput {
  contribution_id?: number;
}

export interface PayContributionResponse {
  message: string;
  contribution: Contribution;
}

export interface ValidateContributionResponse {
  message: string;
  contribution: Contribution;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIONES PURAS — Exportadas para pruebas unitarias (Vitest / Jest)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula la suma total de cuotas recaudadas (PAGADA) a partir de una lista.
 * Función pura sin efectos secundarios.
 */
export function calcularTotalRecaudado(contributions: Contribution[]): number {
  return contributions
    .filter((c) => c.status === 'PAGADA')
    .reduce((acc, c) => acc + (parseFloat(c.amount) || 0), 0);
}

/**
 * Calcula la suma total de cuotas pendientes (PENDIENTE) a partir de una lista.
 */
export function calcularTotalPendiente(contributions: Contribution[]): number {
  return contributions
    .filter((c) => c.status === 'PENDIENTE')
    .reduce((acc, c) => acc + (parseFloat(c.amount) || 0), 0);
}

/**
 * Determina si quedan aportes pendientes de validación o pago.
 */
export function tieneCuotasPendientes(contributions: Contribution[]): boolean {
  return contributions.some((c) => c.status === 'PENDIENTE');
}
