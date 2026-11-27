import { useCallback, useEffect, useState } from 'react';
import { groupsService } from '../services/groupsService';
import { ApiError } from '../services/apiClient';
import type { GroupSummary, CreateGroupInput } from '../types/groups';

interface UseGroupsReturn {
  groups: GroupSummary[];
  page: number;
  totalCount: number;
  hasNext: boolean;
  hasPrevious: boolean;
  isLoading: boolean;
  error: string | null;
  setPage: (page: number) => void;
  fetchGroups: (targetPage?: number) => Promise<void>;
  createGroup: (input: CreateGroupInput) => Promise<void>;
  clearError: () => void;
}

export function useGroups(): UseGroupsReturn {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(
    async (targetPage?: number) => {
      const currentPage = targetPage ?? page;
      setIsLoading(true);
      setError(null);
      try {
        const data = await groupsService.listGroups(currentPage);
        setGroups(data.results);
        setTotalCount(data.count);
        setHasNext(Boolean(data.next));
        setHasPrevious(Boolean(data.previous));
        if (targetPage !== undefined) setPage(targetPage);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Error al cargar los grupos. Intenta nuevamente.');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [page]
  );

  const createGroup = useCallback(
    async (input: CreateGroupInput) => {
      setError(null);
      try {
        await groupsService.createGroup(input);
        await fetchGroups(1);
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

  return {
    groups,
    page,
    totalCount,
    hasNext,
    hasPrevious,
    isLoading,
    error,
    setPage,
    fetchGroups,
    createGroup,
    clearError,
  };
}
