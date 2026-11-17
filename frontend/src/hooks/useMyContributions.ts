import { useCallback, useEffect, useState } from 'react';
import { contributionsService } from '../services/contributionsService';
import { ApiError } from '../services/apiClient';
import type { Contribution } from '../types/contributions';
import { calcularTotalPendiente, calcularTotalRecaudado } from '../types/contributions';

interface UseMyContributionsOptions {
  groupId: number;
  /** Si es false no se consulta al montar (ej. grupo aún en BORRADOR) */
  enabled?: boolean;
}

interface UseMyContributionsReturn {
  contributions: Contribution[];
  totalPagado: number;
  totalPendiente: number;
  isLoading: boolean;
  error: string | null;
  fetchMyContributions: () => Promise<void>;
}

/**
 * useMyContributions — ViewModel de las cuotas del usuario autenticado en un grupo
 * (PDF Sec. 8: cada participante visualiza sus cuotas pendientes y pagadas).
 */
export function useMyContributions({
  groupId,
  enabled = true,
}: UseMyContributionsOptions): UseMyContributionsReturn {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMyContributions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await contributionsService.getMyContributions(groupId);
      // Orden cronológico por número de ronda
      setContributions([...data].sort((a, b) => a.round_number - b.round_number));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Error al cargar tus cuotas del grupo.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchMyContributions();
    }
  }, [enabled, fetchMyContributions]);

  return {
    contributions,
    totalPagado: calcularTotalRecaudado(contributions),
    totalPendiente: calcularTotalPendiente(contributions),
    isLoading,
    error,
    fetchMyContributions,
  };
}
