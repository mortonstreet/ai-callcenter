import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { useEffectiveOrganization } from '@/lib/admin-store';
import { GetRecordingsRequest, PaginatedResponse } from '@shared/types/src';
import { DBRecording } from '@shared/types/src';

const QUERY_KEYS = {
  recordings: (organizationId?: string, filters?: Partial<GetRecordingsRequest>) => 
    ['recordings', organizationId, filters],
  recordingsAnalytics: (organizationId?: string, startDate?: string, endDate?: string) =>
    ['recordingsAnalytics', organizationId, startDate, endDate],
};

export function useRecordings(filters?: Partial<Omit<GetRecordingsRequest, 'organizationId'>>) {
  const activeOrganization = useEffectiveOrganization();
  
  return useQuery<PaginatedResponse<DBRecording>>({
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
      
      return await get<PaginatedResponse<DBRecording>>(
        `/task/${activeOrganization.data.id}/recordings?${params.toString()}`
      );
    },
    enabled: !!activeOrganization?.data?.id,
    placeholderData: (previousData) => previousData,
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

