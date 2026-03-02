import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';
import { useEffectiveOrganization } from '@/lib/admin-store';
import { GetRecordingsRequest, PaginatedResponse } from '@/lib/shared-types';
import { DBRecording } from '@/lib/shared-types';

export interface RecordingLead {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  customFields: unknown | null;
}

export type RecordingWithLead = DBRecording & {
  lead: RecordingLead | null;
};

const QUERY_KEYS = {
  recordings: (organizationId?: string, filters?: Partial<GetRecordingsRequest>) => 
    ['recordings', organizationId, filters],
  recordingsAnalytics: (organizationId?: string, startDate?: string, endDate?: string) =>
    ['recordingsAnalytics', organizationId, startDate, endDate],
};

export function useRecordings(filters?: Partial<Omit<GetRecordingsRequest, 'organizationId'>>) {
  const activeOrganization = useEffectiveOrganization();
  
  return useQuery<PaginatedResponse<RecordingWithLead>>({
    queryKey: QUERY_KEYS.recordings(activeOrganization?.data?.id, filters),
    queryFn: async () => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.sortBy) params.append('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
      
      return await get<PaginatedResponse<RecordingWithLead>>(
        `/task/${activeOrganization.data.id}/recordings?${params.toString()}`
      );
    },
    enabled: !!activeOrganization?.data?.id,
    placeholderData: (previousData) => previousData,
  });
}

interface SyncRecordingsResponse {
  success: boolean;
  synced: number;
  agents: number;
  errors?: string[];
}

export function useSyncRecordings() {
  const queryClient = useQueryClient();
  const activeOrganization = useEffectiveOrganization();
  
  return useMutation<SyncRecordingsResponse>({
    mutationFn: async () => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      
      return await post<SyncRecordingsResponse>(
        `/task/${activeOrganization.data.id}/recordings/sync`,
        {}
      );
    },
    onSuccess: () => {
      // Invalidate recordings queries to refresh data
      queryClient.invalidateQueries({ 
        queryKey: ['recordings', activeOrganization?.data?.id] 
      });
    },
  });
}

export function useRecordingsForAnalytics(startDate?: string, endDate?: string) {
  const activeOrganization = useEffectiveOrganization();
  
  return useQuery<PaginatedResponse<DBRecording>>({
    queryKey: QUERY_KEYS.recordingsAnalytics(activeOrganization?.data?.id, startDate, endDate),
    queryFn: async () => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      
      const params = new URLSearchParams();
      params.append('limit', '1000'); // Get all for analytics
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      return await get<PaginatedResponse<DBRecording>>(
        `/task/${activeOrganization.data.id}/recordings?${params.toString()}`
      );
    },
    enabled: !!activeOrganization?.data?.id,
  });
}

interface UpdateRecordingQualityResponse {
  success: boolean;
  recording: DBRecording;
}

export function useUpdateRecordingQuality() {
  const queryClient = useQueryClient();
  const activeOrganization = useEffectiveOrganization();
  
  return useMutation<UpdateRecordingQualityResponse, Error, { recordingId: string; callQuality: string }>({
    mutationFn: async ({ recordingId, callQuality }) => {
      if (!activeOrganization?.data?.id) {
        throw new Error('No active organization');
      }
      
      return await post<UpdateRecordingQualityResponse>(
        `/task/${activeOrganization.data.id}/recordings/${recordingId}/quality`,
        { callQuality }
      );
    },
    onSuccess: () => {
      // Invalidate recordings queries to refresh data
      queryClient.invalidateQueries({ 
        queryKey: ['recordings', activeOrganization?.data?.id] 
      });
    },
  });
}

