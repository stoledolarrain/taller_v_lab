import { useCallback, useEffect, useState } from 'react';
import { groupsService } from '../services/groupsService';
import { ApiError } from '../services/apiClient';
import type { GroupDetail } from '../types/groups';

interface UseGroupDetailReturn {
  group: GroupDetail | null;
  isLoading: boolean;
  error: string | null;
  // Derived state — computed from group data, never stored separately
  isAdmin: boolean;
  isEditable: boolean;
  canStart: boolean;
  // Actions
  fetchGroup: () => Promise<void>;
  leaveGroup: () => Promise<void>;
  removeMember: (userId: number) => Promise<void>;
  regenerateCode: () => Promise<void>;
  startGroup: () => Promise<void>;
  clearError: () => void;
}

export function useGroupDetail(groupId: number): UseGroupDetailReturn {
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derived state: computed from source, never duplicated
  const isAdmin = group?.is_admin ?? false;
  const isEditable = group?.status === 'BORRADOR';
  const canStart = group?.can_start ?? false;

  const fetchGroup = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await groupsService.getGroup(groupId);
      setGroup(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 403
            ? 'No tienes permiso para ver este grupo.'
            : err.status === 404
              ? 'El grupo no existe o fue eliminado.'
              : err.message
        );
      } else {
        setError('Error al cargar el grupo. Intenta nuevamente.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  const leaveGroup = useCallback(async () => {
    setError(null);
    try {
      await groupsService.leaveGroup(groupId);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al abandonar el grupo.');
      }
      throw err;
    }
  }, [groupId]);

  const removeMember = useCallback(
    async (userId: number) => {
      setError(null);
      try {
        await groupsService.removeMember(groupId, { user_id: userId });
        await fetchGroup();
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Error al expulsar al participante.');
        }
        throw err;
      }
    },
    [groupId, fetchGroup]
  );

  const regenerateCode = useCallback(async () => {
    setError(null);
    try {
      const result = await groupsService.regenerateCode(groupId);
      setGroup((prev) => (prev ? { ...prev, invite_code: result.invite_code } : prev));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al regenerar el código.');
      }
      throw err;
    }
  }, [groupId]);

  const startGroup = useCallback(async () => {
    setError(null);
    try {
      await groupsService.startGroup(groupId);
      await fetchGroup();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al iniciar el pasanaku.');
      }
      throw err;
    }
  }, [groupId, fetchGroup]);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGroup();
  }, [fetchGroup]);

  return {
    group,
    isLoading,
    error,
    isAdmin,
    isEditable,
    canStart,
    fetchGroup,
    leaveGroup,
    removeMember,
    regenerateCode,
    startGroup,
    clearError,
  };
}
