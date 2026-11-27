import { useCallback, useState } from 'react';
import { groupsService } from '../services/groupsService';
import { ApiError } from '../services/apiClient';
import type { GroupPreview } from '../types/groups';

interface UseJoinGroupReturn {
  preview: GroupPreview | null;
  isPreviewing: boolean;
  isJoining: boolean;
  error: string | null;
  pendingApprovalMessage: string | null;
  previewByCode: (code: string) => Promise<void>;
  confirmJoin: (message?: string) => Promise<void>;
  resetJoin: () => void;
  clearError: () => void;
}

export function useJoinGroup(onSuccess?: () => void): UseJoinGroupReturn {
  const [preview, setPreview] = useState<GroupPreview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingApprovalMessage, setPendingApprovalMessage] = useState<string | null>(
    null
  );
  // Stored internally — not exposed, used only in confirmJoin
  const [pendingCode, setPendingCode] = useState<string>('');

  const previewByCode = useCallback(async (code: string) => {
    if (!code.trim()) {
      setError('Ingresa un código de invitación válido.');
      return;
    }
    setIsPreviewing(true);
    setError(null);
    setPendingApprovalMessage(null);
    setPreview(null);
    try {
      const data = await groupsService.previewGroup(code.trim().toUpperCase());
      setPreview(data);
      setPendingCode(code.trim().toUpperCase());
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 404 ? 'Código de invitación no encontrado.' : err.message
        );
      } else {
        setError('Error al buscar el grupo. Verifica el código.');
      }
    } finally {
      setIsPreviewing(false);
    }
  }, []);

  const confirmJoin = useCallback(
    async (message?: string) => {
      if (!pendingCode) {
        setError('No hay grupo seleccionado para unirse.');
        return;
      }
      if (preview?.is_full) {
        setError('Este grupo ya no tiene cupos disponibles.');
        return;
      }
      setIsJoining(true);
      setError(null);
      setPendingApprovalMessage(null);
      try {
        const res = await groupsService.joinGroup({
          invite_code: pendingCode,
          message,
        });
        setPreview(null);
        setPendingCode('');
        if (res.status === 'PENDING_APPROVAL') {
          setPendingApprovalMessage(res.message);
        } else {
          onSuccess?.();
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Error al unirse al grupo. Intenta nuevamente.');
        }
        throw err;
      } finally {
        setIsJoining(false);
      }
    },
    [pendingCode, preview, onSuccess]
  );

  const resetJoin = useCallback(() => {
    setPreview(null);
    setPendingCode('');
    setError(null);
    setPendingApprovalMessage(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    preview,
    isPreviewing,
    isJoining,
    error,
    pendingApprovalMessage,
    previewByCode,
    confirmJoin,
    resetJoin,
    clearError,
  };
}
