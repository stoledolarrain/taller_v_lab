import { useCallback, useState } from 'react';
import { turnsService } from '../services/turnsService';
import { ApiError } from '../services/apiClient';
import type { PasanakuTurn } from '../types/groups';
import type { TurnAssignment } from '../types/turns';

interface UseTurnsOptions {
  groupId: number;
  initialTurns?: PasanakuTurn[];
  onTurnsUpdated?: (turns: PasanakuTurn[]) => void;
  onGroupStarted?: () => void;
}

interface UseTurnsReturn {
  turns: PasanakuTurn[];
  isLoading: boolean;
  isRaffling: boolean;
  isStarting: boolean;
  error: string | null;
  successMessage: string | null;
  fetchTurns: () => Promise<void>;
  raffle: () => Promise<void>;
  assignManual: (assignments: TurnAssignment[]) => Promise<void>;
  start: () => Promise<void>;
  clearError: () => void;
  clearSuccess: () => void;
}

export function useTurns({
  groupId,
  initialTurns = [],
  onTurnsUpdated,
  onGroupStarted,
}: UseTurnsOptions): UseTurnsReturn {
  const [turns, setTurns] = useState<PasanakuTurn[]>(initialTurns);
  const [isLoading, setIsLoading] = useState(false);
  const [isRaffling, setIsRaffling] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);
  const clearSuccess = useCallback(() => setSuccessMessage(null), []);

  const fetchTurns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await turnsService.getTurns(groupId);
      setTurns(data);
      onTurnsUpdated?.(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al cargar los turnos del grupo.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [groupId, onTurnsUpdated]);

  const raffle = useCallback(async () => {
    setIsRaffling(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await turnsService.raffleTurns(groupId);
      setTurns(response.turns);
      setSuccessMessage(response.message || 'Sorteo de turnos realizado exitosamente.');
      onTurnsUpdated?.(response.turns);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al sortear los turnos.');
      }
      throw err;
    } finally {
      setIsRaffling(false);
    }
  }, [groupId, onTurnsUpdated]);

  const assignManual = useCallback(
    async (assignments: TurnAssignment[]) => {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);
      try {
        const response = await turnsService.assignTurnsManual(groupId, assignments);
        setTurns(response.turns);
        setSuccessMessage(response.message || 'Turnos asignados exitosamente.');
        onTurnsUpdated?.(response.turns);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Error al asignar turnos manualmente.');
        }
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [groupId, onTurnsUpdated]
  );

  const start = useCallback(async () => {
    setIsStarting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await turnsService.startGroup(groupId);
      setSuccessMessage(response.message || 'Pasanaku iniciado exitosamente.');
      onGroupStarted?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al iniciar el pasanaku.');
      }
      throw err;
    } finally {
      setIsStarting(false);
    }
  }, [groupId, onGroupStarted]);

  return {
    turns,
    isLoading,
    isRaffling,
    isStarting,
    error,
    successMessage,
    fetchTurns,
    raffle,
    assignManual,
    start,
    clearError,
    clearSuccess,
  };
}
