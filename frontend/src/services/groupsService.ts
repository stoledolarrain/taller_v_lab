import { apiRequest } from './apiClient';
import type { ReputationLevel } from '../types/auth';
import type {
  GroupSummary,
  GroupDetail,
  GroupPreview,
  CreateGroupInput,
  UpdateGroupInput,
  JoinGroupInput,
  JoinGroupResponse,
  GroupJoinRequest,
  RemoveMemberInput,
  GroupFinancialSummary,
  PaginatedResponse,
} from '../types/groups';

export const groupsService = {
  /** GET /groups/ — List groups where authenticated user participates (paginated DRF) */
  async listGroups(page = 1, pageSize = 6): Promise<PaginatedResponse<GroupSummary>> {
    const res = await apiRequest<PaginatedResponse<GroupSummary> | GroupSummary[]>(
      `/groups/?page=${page}&page_size=${pageSize}`
    );
    if (Array.isArray(res)) {
      return { count: res.length, next: null, previous: null, results: res };
    }
    return res;
  },

  /** GET /groups/public/ — List available public groups (paginated + optional min_reputation filter) */
  async listPublicGroups(
    page = 1,
    minReputation?: ReputationLevel | '',
    pageSize = 6
  ): Promise<PaginatedResponse<GroupSummary>> {
    const query = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });
    if (minReputation) {
      query.set('min_reputation', minReputation);
    }
    const res = await apiRequest<PaginatedResponse<GroupSummary> | GroupSummary[]>(
      `/groups/public/?${query.toString()}`
    );
    if (Array.isArray(res)) {
      return { count: res.length, next: null, previous: null, results: res };
    }
    return res;
  },

  /** GET /groups/:id/ — Full group detail with members, turns and current round */
  async getGroup(id: number): Promise<GroupDetail> {
    const data = await apiRequest<GroupDetail & { memberships?: GroupDetail['members'] }>(
      `/groups/${id}/`
    );
    return {
      ...data,
      members: data.members ?? data.memberships ?? [],
      turns: data.turns ?? [],
    };
  },

  /** POST /groups/ — Create a new pasanaku group in BORRADOR state */
  async createGroup(input: CreateGroupInput): Promise<GroupDetail> {
    return apiRequest<GroupDetail>('/groups/', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  /** PATCH /groups/:id/ — Update group configuration (only allowed in BORRADOR) */
  async updateGroup(id: number, input: UpdateGroupInput): Promise<GroupDetail> {
    return apiRequest<GroupDetail>(`/groups/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  /** GET /groups/preview/?code=XXXX — Preview group info before joining */
  async previewGroup(code: string): Promise<GroupPreview> {
    return apiRequest<GroupPreview>(`/groups/preview/?code=${encodeURIComponent(code)}`);
  },

  /** POST /groups/join/ — Join a group using an invite code (200 direct or 202 pending request) */
  async joinGroup(input: JoinGroupInput): Promise<JoinGroupResponse> {
    return apiRequest<JoinGroupResponse>('/groups/join/', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  /** POST /groups/:id/join-public/ — Join or request to join a public group */
  async joinPublicGroup(id: number, message?: string): Promise<JoinGroupResponse> {
    return apiRequest<JoinGroupResponse>(`/groups/${id}/join-public/`, {
      method: 'POST',
      body: JSON.stringify(message ? { message } : {}),
    });
  },

  /** GET /groups/:id/join-requests/ — List join requests for a group (admin only) */
  async listJoinRequests(groupId: number): Promise<GroupJoinRequest[]> {
    return apiRequest<GroupJoinRequest[]>(`/groups/${groupId}/join-requests/`);
  },

  /** POST /groups/join-requests/:requestId/approve/ — Approve a pending join request */
  async approveJoinRequest(requestId: number): Promise<JoinGroupResponse> {
    return apiRequest<JoinGroupResponse>(`/groups/join-requests/${requestId}/approve/`, {
      method: 'POST',
    });
  },

  /** POST /groups/join-requests/:requestId/reject/ — Reject a pending join request */
  async rejectJoinRequest(
    requestId: number
  ): Promise<{ message: string; join_request: GroupJoinRequest }> {
    return apiRequest<{ message: string; join_request: GroupJoinRequest }>(
      `/groups/join-requests/${requestId}/reject/`,
      { method: 'POST' }
    );
  },

  /** POST /groups/:id/leave/ — Leave a group (only allowed in BORRADOR) */
  async leaveGroup(id: number): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/groups/${id}/leave/`, {
      method: 'POST',
    });
  },

  /** POST /groups/:id/remove-member/ — Remove a member (admin only, BORRADOR) */
  async removeMember(id: number, input: RemoveMemberInput): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/groups/${id}/remove-member/`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  /** POST /groups/:id/regenerate-code/ — Regenerate invite code (admin only) */
  async regenerateCode(id: number): Promise<{ message: string; invite_code: string }> {
    return apiRequest<{ message: string; invite_code: string }>(
      `/groups/${id}/regenerate-code/`,
      { method: 'POST' }
    );
  },

  /** POST /groups/:id/start/ — Start the pasanaku (validates full capacity + all turns assigned) */
  async startGroup(id: number): Promise<{ message: string }> {
    return apiRequest<{ message: string }>(`/groups/${id}/start/`, {
      method: 'POST',
    });
  },

  /** GET /groups/:id/summary/ — Financial balance, round state and debtor list */
  async getGroupSummary(id: number): Promise<GroupFinancialSummary> {
    return apiRequest<GroupFinancialSummary>(`/groups/${id}/summary/`);
  },
};
