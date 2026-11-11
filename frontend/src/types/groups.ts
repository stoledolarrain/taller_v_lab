import type { User } from './auth';

// ─── Enums (mirror backend TextChoices exactly) ───────────────────────────────
export type GroupStatus = 'BORRADOR' | 'INICIADO' | 'FINALIZADO';
export type Periodicity = 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';
export type MembershipRole = 'ADMIN' | 'PARTICIPANTE';
export type RoundStatus = 'ACTIVA' | 'CERRADA' | 'PENDIENTE' | 'COMPLETADA';
export type ContributionStatus = 'PENDIENTE' | 'PAGADA';

// ─── Membership ───────────────────────────────────────────────────────────────
export interface GroupMembership {
  id: number;
  user: User;
  role: MembershipRole;
  joined_at: string;
}

// ─── Turn ─────────────────────────────────────────────────────────────────────
export interface PasanakuTurn {
  id: number;
  turn_number: number;
  user: User;
  created_at: string;
}

// ─── Round (embedded in GroupDetail) ─────────────────────────────────────────
export interface Round {
  id: number;
  group_id: number;
  round_number: number;
  beneficiary: User;
  status: RoundStatus;
  expected_amount: string;
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

// ─── Group List Item (PasanakuGroupListSerializer) ────────────────────────────
export interface GroupSummary {
  id: number;
  name: string;
  description: string;
  quota_amount: string;
  currency: string;
  periodicity: Periodicity;
  start_date: string;
  total_members: number;
  current_members_count: number;
  remaining_slots: number;
  is_full: boolean;
  can_start: boolean;
  has_all_turns_assigned: boolean;
  status: GroupStatus;
  my_role: MembershipRole;
  invite_code: string;
  created_at: string;
  updated_at: string;
}

// ─── Group Detail (PasanakuGroupDetailSerializer) ─────────────────────────────
export interface GroupDetail extends GroupSummary {
  is_admin: boolean;
  members: GroupMembership[];
  memberships?: GroupMembership[];
  turns: PasanakuTurn[];
  current_round: Round | null;
}

// ─── Group Preview (PasanakuGroupPreviewSerializer) ───────────────────────────
export interface GroupPreview {
  id: number;
  name: string;
  description: string;
  quota_amount: string;
  currency: string;
  periodicity: Periodicity;
  start_date: string;
  total_members: number;
  current_members_count: number;
  remaining_slots: number;
  is_full: boolean;
  status: GroupStatus;
  creator_name: string;
}

// ─── Input types ──────────────────────────────────────────────────────────────
export interface CreateGroupInput {
  name: string;
  description?: string;
  quota_amount: string;
  periodicity: Periodicity;
  start_date: string;
  total_members: number;
}

export type UpdateGroupInput = Partial<CreateGroupInput>;

export interface JoinGroupInput {
  invite_code: string;
}

export interface RemoveMemberInput {
  user_id: number;
}

// ─── Financial Summary ────────────────────────────────────────────────────────
export interface GroupFinancialSummary {
  group_id: number;
  group_name: string;
  status: GroupStatus;
  total_members: number;
  quota_amount: string;
  current_round_number: number | null;
  current_round_status: RoundStatus | null;
  expected_amount: string | null;
  total_collected: string | null;
  total_pending: string | null;
  debtors: User[];
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIONES PURAS — Exportadas para pruebas unitarias (Vitest)
// Ver: .claude/skills/frontend-skills/frontend-testing/SKILL.md
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula el total esperado de la ronda: cuota × cantidad de participantes.
 * Regla de negocio del PDF: 5 participantes × Bs 200 = Bs 1.000
 *
 * @param cuotaMonto  - Monto de la cuota (string Decimal o number)
 * @param cantidadParticipantes - Número total de participantes del grupo
 * @returns Total esperado redondeado a 2 decimales, o 0 si los parámetros son inválidos
 *
 * @example
 *   calcularTotalEsperado("200.00", 5) // → 1000
 *   calcularTotalEsperado(150, 4)       // → 600
 */
export function calcularTotalEsperado(
  cuotaMonto: string | number,
  cantidadParticipantes: number
): number {
  const monto = typeof cuotaMonto === 'string' ? parseFloat(cuotaMonto) : cuotaMonto;
  if (isNaN(monto) || monto <= 0 || cantidadParticipantes <= 0) return 0;
  return Math.round(monto * cantidadParticipantes * 100) / 100;
}

/**
 * Formatea un monto numérico o string como "Bs X.XX".
 * Siempre usa bolivianos sin importar el campo `currency` del backend.
 *
 * @example
 *   formatearMontoBolivianos("200.00") // → "Bs 200.00"
 *   formatearMontoBolivianos(1000)      // → "Bs 1000.00"
 */
export function formatearMontoBolivianos(monto: string | number): string {
  const valor = typeof monto === 'string' ? parseFloat(monto) : monto;
  if (isNaN(valor)) return 'Bs -';
  return `Bs ${valor.toFixed(2)}`;
}

/**
 * Convierte la periodicidad a texto legible en español.
 *
 * @example
 *   formatearPeriodicidad("MENSUAL") // → "Mensual"
 */
export function formatearPeriodicidad(periodicidad: Periodicity): string {
  const mapa: Record<Periodicity, string> = {
    SEMANAL: 'Semanal',
    QUINCENAL: 'Quincenal',
    MENSUAL: 'Mensual',
  };
  return mapa[periodicidad] ?? periodicidad;
}

/**
 * Verifica que una lista de IDs de usuario no contenga duplicados.
 * Usado para validar la restricción de negocio: un usuario no puede
 * aparecer dos veces en el mismo grupo.
 *
 * @example
 *   tieneDuplicados([1, 2, 3])    // → false
 *   tieneDuplicados([1, 2, 1])    // → true
 */
export function tieneDuplicados(userIds: number[]): boolean {
  return userIds.length !== new Set(userIds).size;
}

/**
 * Determina si un grupo puede iniciar basándose en los datos recibidos del backend.
 * Lógica de presentación derivada: no almacenar como estado separado.
 *
 * @example
 *   puedeIniciarGrupo({ status: 'BORRADOR', can_start: true }) // → true
 *   puedeIniciarGrupo({ status: 'INICIADO', can_start: true }) // → false
 */
export function puedeIniciarGrupo(
  group: Pick<GroupSummary, 'status' | 'can_start'>
): boolean {
  return group.status === 'BORRADOR' && group.can_start;
}
