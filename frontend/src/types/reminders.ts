import type { User } from './auth';
import type { GroupStatus } from './groups';

export type ReminderStatus = 'PENDIENTE' | 'LEIDO';

export interface Reminder {
  id: number;
  group_id: number;
  group_name: string;
  round_id: number;
  round_number: number;
  sender: User;
  message: string;
  is_read: boolean;
  created_at: string;
}

export type InternalReminder = Reminder;

export interface DebtorInfo {
  contribution_id: number;
  user_id: number;
  username: string;
  full_name: string;
  phone_number: string;
  amount: string;
}

export interface CurrentRoundSummary {
  id: number;
  round_number: number;
  beneficiary: {
    id: number;
    username: string;
    full_name: string;
  };
  expected_amount: string;
  total_collected: string;
  total_pending: string;
  has_pending_contributions: boolean;
  debtors: DebtorInfo[];
}

export interface GroupFinancialSummary {
  group_id: number;
  group_name: string;
  status: GroupStatus;
  quota_amount: string;
  total_members: number;
  total_expected_overall: string;
  total_collected_overall: string;
  total_pending_overall: string;
  current_round: CurrentRoundSummary | null;
}

export interface SendRemindersInput {
  message?: string;
}

export interface SendRemindersResponse {
  message: string;
  reminders: Reminder[];
}
