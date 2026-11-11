import { useCallback, useEffect, useState } from 'react';
import { groupsService } from '../services/groupsService';
import { ApiError } from '../services/apiClient';
import type { GroupSummary, CreateGroupInput } from '../types/groups';

interface UseGroupsReturn {
  groups: GroupSummary[];
  isLoading: boolean;
  error: string | null;
  fetchGroups: () => Promise<void>;
  createGroup: (input: CreateGroupInput) => Promise<void>;
  clearError: () => void;
}

export function useGroups(): UseGroupsReturn {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await groupsService.listGroups();
      setGroups(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al cargar los grupos. Intenta nuevamente.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createGroup = useCallback(
    async (input: CreateGroupInput) => {
      setError(null);
      try {
        await groupsService.createGroup(input);
        await fetchGroups();
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Error al crear el grupo. Intenta nuevamente.');
        }
        throw err;
      }
    },
    [fetchGroups]
  );

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGroups();
  }, [fetchGroups]);

  return { groups, isLoading, error, fetchGroups, createGroup, clearError };
}
