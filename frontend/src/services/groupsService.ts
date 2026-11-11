import { apiRequest } from './apiClient';
import type {
  GroupSummary,
  GroupDetail,
  GroupPreview,
  CreateGroupInput,
  UpdateGroupInput,
  JoinGroupInput,
  RemoveMemberInput,
  GroupFinancialSummary,
} from '../types/groups';

export const groupsService = {
  /** GET /groups/ — List groups where authenticated user participates */
  async listGroups(): Promise<GroupSummary[]> {
    return apiRequest<GroupSummary[]>('/groups/');
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

  /** POST /groups/join/ — Join a group using an invite code */
  async joinGroup(input: JoinGroupInput): Promise<{ message: string }> {
    return apiRequest<{ message: string }>('/groups/join/', {
      method: 'POST',
      body: JSON.stringify(input),
    });
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
