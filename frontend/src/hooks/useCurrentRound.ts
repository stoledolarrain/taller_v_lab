import { useCallback, useEffect, useState } from 'react';
import { roundsService } from '../services/roundsService';
import { contributionsService } from '../services/contributionsService';
import { ApiError } from '../services/apiClient';
import type { Round, RoundDetail, CloseRoundResponse } from '../types/rounds';
import { puedeCerrarRonda } from '../types/rounds';
import type { Contribution } from '../types/contributions';

interface UseCurrentRoundOptions {
  groupId: number;
  initialRound?: RoundDetail | null;
  onRoundClosed?: (response: CloseRoundResponse) => void;
  onPaymentUpdated?: () => void;
}

interface UseCurrentRoundReturn {
  round: RoundDetail | null;
  contributions: Contribution[];
  history: Round[];
  isLoading: boolean;
  isLoadingHistory: boolean;
  isClosing: boolean;
  actionContributionId: number | null;
  error: string | null;
  successMessage: string | null;
  canClose: boolean;
  fetchCurrentRound: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  closeCurrentRound: () => Promise<CloseRoundResponse | void>;
  reportPayment: (contributionId: number, notes?: string) => Promise<void>;
  validatePayment: (contributionId: number) => Promise<void>;
  clearError: () => void;
  clearSuccess: () => void;
}

export function useCurrentRound({
  groupId,
  initialRound = null,
  onRoundClosed,
  onPaymentUpdated,
}: UseCurrentRoundOptions): UseCurrentRoundReturn {
  const [round, setRound] = useState<RoundDetail | null>(initialRound);
  const [history, setHistory] = useState<Round[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [actionContributionId, setActionContributionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);
  const clearSuccess = useCallback(() => setSuccessMessage(null), []);

  const fetchCurrentRound = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await roundsService.getCurrentRound(groupId);
      if (data && data.id && data.beneficiary) {
        setRound(data);
      } else {
        setRound(null);
      }
    } catch {
      setRound(null);
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const data = await roundsService.getRoundHistory(groupId);
      setHistory(data);
    } catch {
      // Historial opcional; no bloquea la vista principal
    } finally {
      setIsLoadingHistory(false);
    }
  }, [groupId]);

  const reportPayment = useCallback(
    async (contributionId: number, notes: string = '') => {
      setActionContributionId(contributionId);
      setError(null);
      setSuccessMessage(null);
      try {
        const response = await contributionsService.reportPayment(contributionId, notes);
        setSuccessMessage(response.message || 'Pago reportado correctamente.');
        await fetchCurrentRound();
        onPaymentUpdated?.();
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Error al reportar el pago de la cuota.');
        }
        throw err;
      } finally {
        setActionContributionId(null);
      }
    },
    [fetchCurrentRound, onPaymentUpdated]
  );

  const validatePayment = useCallback(
    async (contributionId: number) => {
      setActionContributionId(contributionId);
      setError(null);
      setSuccessMessage(null);
      try {
        const response = await contributionsService.validatePayment(contributionId);
        setSuccessMessage(response.message || 'Cuota validada como PAGADA.');
        await fetchCurrentRound();
        onPaymentUpdated?.();
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Error al validar la cuota.');
        }
        throw err;
      } finally {
        setActionContributionId(null);
      }
    },
    [fetchCurrentRound, onPaymentUpdated]
  );

  const closeCurrentRound = useCallback(async () => {
    if (!round) {
      setError('No hay una ronda activa para cerrar.');
      return;
    }
    setIsClosing(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await roundsService.closeRound(round.id);
      setSuccessMessage(
        response.message || `Ronda ${round.round_number} cerrada exitosamente.`
      );
      // Si el backend indica que el grupo finalizó o no hay siguiente ronda:
      if (response.is_finished || !response.next_round) {
        setRound(null);
      } else {
        await fetchCurrentRound();
      }
      await fetchHistory();
      onRoundClosed?.(response);
      return response;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al cerrar la ronda actual.');
      }
      throw err;
    } finally {
      setIsClosing(false);
    }
  }, [round, fetchCurrentRound, fetchHistory, onRoundClosed]);

  // Derived state: cuotas y estado canClose usando función pura
  const contributions = round?.contributions ?? [];
  const canClose = round
    ? puedeCerrarRonda(contributions) && !round.has_pending_contributions
    : false;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCurrentRound();
    fetchHistory();
  }, [fetchCurrentRound, fetchHistory]);

  return {
    round,
    contributions,
    history,
    isLoading,
    isLoadingHistory,
    isClosing,
    actionContributionId,
    error,
    successMessage,
    canClose,
    fetchCurrentRound,
    fetchHistory,
    closeCurrentRound,
    reportPayment,
    validatePayment,
    clearError,
    clearSuccess,
  };
}
