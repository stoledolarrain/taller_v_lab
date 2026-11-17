import { useCallback, useEffect, useState } from 'react';
import { remindersService } from '../services/remindersService';
import { ApiError } from '../services/apiClient';
import type {
  Reminder,
  GroupFinancialSummary,
  SendRemindersResponse,
} from '../types/reminders';

interface UseRemindersOptions {
  autoFetch?: boolean;
}

interface UseRemindersReturn {
  reminders: Reminder[];
  unreadCount: number;
  isLoadingReminders: boolean;
  isSending: boolean;
  isLoadingSummary: boolean;
  summary: GroupFinancialSummary | null;
  error: string | null;
  successMessage: string | null;
  fetchReminders: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  sendRemindersToDebtors: (
    groupId: number,
    customMessage?: string
  ) => Promise<SendRemindersResponse | void>;
  fetchSummary: (groupId: number) => Promise<void>;
  clearError: () => void;
  clearSuccess: () => void;
}

export function useReminders({
  autoFetch = false,
}: UseRemindersOptions = {}): UseRemindersReturn {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [summary, setSummary] = useState<GroupFinancialSummary | null>(null);
  const [isLoadingReminders, setIsLoadingReminders] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);
  const clearSuccess = useCallback(() => setSuccessMessage(null), []);

  const fetchReminders = useCallback(async () => {
    setIsLoadingReminders(true);
    setError(null);
    try {
      const data = await remindersService.getMyReminders();
      setReminders(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al consultar los recordatorios.');
      }
    } finally {
      setIsLoadingReminders(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: number) => {
    try {
      await remindersService.markReminderAsRead(id);
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_read: true } : r))
      );
    } catch {
      // Si falla en backend, no rompe la interfaz
    }
  }, []);

  const sendRemindersToDebtors = useCallback(
    async (groupId: number, customMessage: string = '') => {
      setIsSending(true);
      setError(null);
      setSuccessMessage(null);
      try {
        const response = await remindersService.sendReminders(groupId, customMessage);
        setSuccessMessage(response.message || 'Recordatorios enviados con éxito.');
        return response;
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Error al enviar recordatorios a los deudores.');
        }
        throw err;
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  const fetchSummary = useCallback(async (groupId: number) => {
    setIsLoadingSummary(true);
    setError(null);
    try {
      const data = await remindersService.getGroupSummary(groupId);
      setSummary(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al consultar el balance financiero del grupo.');
      }
    } finally {
      setIsLoadingSummary(false);
    }
  }, []);

  const unreadCount = reminders.filter((r) => !r.is_read).length;

  useEffect(() => {
    if (autoFetch) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchReminders();
    }
  }, [autoFetch, fetchReminders]);

  return {
    reminders,
    unreadCount,
    isLoadingReminders,
    isSending,
    isLoadingSummary,
    summary,
    error,
    successMessage,
    fetchReminders,
    markAsRead,
    sendRemindersToDebtors,
    fetchSummary,
    clearError,
    clearSuccess,
  };
}
