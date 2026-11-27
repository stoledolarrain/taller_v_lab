import { useCallback, useEffect, useState } from 'react';
import { groupsService } from '../services/groupsService';
import { ApiError } from '../services/apiClient';
import type { ReputationLevel } from '../types/auth';
import type { GroupSummary } from '../types/groups';

interface UsePublicGroupsReturn {
  groups: GroupSummary[];
  page: number;
  totalCount: number;
  hasNext: boolean;
  hasPrevious: boolean;
  minReputationFilter: ReputationLevel | '';
  isLoading: boolean;
  joiningId: number | null;
  error: string | null;
  statusMessage: string | null;
  setPage: (page: number) => void;
  setMinReputationFilter: (rep: ReputationLevel | '') => void;
  fetchPublicGroups: (targetPage?: number) => Promise<void>;
  joinPublic: (groupId: number, onJoinedDirect?: () => void) => Promise<void>;
  clearError: () => void;
  clearStatusMessage: () => void;
}

export function usePublicGroups(): UsePublicGroupsReturn {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [minReputationFilter, setMinReputationFilterState] = useState<
    ReputationLevel | ''
  >('');
  const [isLoading, setIsLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchPublicGroups = useCallback(
    async (targetPage?: number) => {
      const currentPage = targetPage ?? page;
      setIsLoading(true);
      setError(null);
      try {
        const data = await groupsService.listPublicGroups(
          currentPage,
          minReputationFilter
        );
        setGroups(data.results);
        setTotalCount(data.count);
        setHasNext(Boolean(data.next));
        setHasPrevious(Boolean(data.previous));
        if (targetPage !== undefined) setPage(targetPage);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Error al cargar los pasanakus públicos.');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [page, minReputationFilter]
  );

  const setMinReputationFilter = useCallback((rep: ReputationLevel | '') => {
    setPage(1);
    setMinReputationFilterState(rep);
  }, []);

  const joinPublic = useCallback(
    async (groupId: number, onJoinedDirect?: () => void) => {
      setJoiningId(groupId);
      setError(null);
      setStatusMessage(null);
      try {
        const res = await groupsService.joinPublicGroup(groupId);
        await fetchPublicGroups();
        if (res.status === 'PENDING_APPROVAL') {
          setStatusMessage(res.message);
        } else {
          setStatusMessage(res.message);
          onJoinedDirect?.();
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Error al solicitar ingreso al grupo público.');
        }
      } finally {
        setJoiningId(null);
      }
    },
    [fetchPublicGroups]
  );

  const clearError = useCallback(() => setError(null), []);
  const clearStatusMessage = useCallback(() => setStatusMessage(null), []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPublicGroups();
  }, [fetchPublicGroups]);

  return {
    groups,
    page,
    totalCount,
    hasNext,
    hasPrevious,
    minReputationFilter,
    isLoading,
    joiningId,
    error,
    statusMessage,
    setPage,
    setMinReputationFilter,
    fetchPublicGroups,
    joinPublic,
    clearError,
    clearStatusMessage,
  };
}
