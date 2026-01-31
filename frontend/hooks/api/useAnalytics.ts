import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import type { CallMetrics } from '@/components/dashboard/MetricCards';
import type { CallsOverTime } from '@/components/dashboard/CallsOverTimeChart';
import type { DispositionBreakdown } from '@/components/dashboard/CallStatusChart';
import type { ActivityItem } from '@/components/dashboard/ActivityFeed';

interface AnalyticsResponse {
  data: {
    metrics: CallMetrics;
    dispositionBreakdown: DispositionBreakdown[];
    callsOverTime: CallsOverTime[];
  };
}

interface ActivityFeedResponse {
  items: ActivityItem[];
}

export function useCallAnalytics(params: {
  startDate: string;
  endDate: string;
  enabled?: boolean;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set('startDate', params.startDate);
  searchParams.set('endDate', params.endDate);

  return useQuery<AnalyticsResponse>({
    queryKey: ['callCenter', 'analytics', params.startDate, params.endDate],
    queryFn: () => get<AnalyticsResponse>(`/call-center/analytics?${searchParams.toString()}`),
    enabled: params.enabled !== false,
    placeholderData: {
      data: {
        metrics: {
          totalCalls: 0,
          outboundCalls: 0,
          inboundCalls: 0,
          connectedCalls: 0,
          connectionRate: 0,
          totalTalkTimeSeconds: 0,
          avgCallDurationSeconds: 0,
        },
        dispositionBreakdown: [],
        callsOverTime: [],
      },
    },
  });
}

export function useActivityFeed(params: {
  type?: 'all' | 'calls' | 'leads' | 'tasks';
  limit?: number;
  enabled?: boolean;
}) {
  const searchParams = new URLSearchParams();
  if (params.type && params.type !== 'all') searchParams.set('type', params.type);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  const qs = searchParams.toString();

  return useQuery<ActivityFeedResponse>({
    queryKey: ['callCenter', 'activity', params.type],
    queryFn: () => get<ActivityFeedResponse>(`/call-center/activity${qs ? `?${qs}` : ''}`),
    enabled: params.enabled !== false,
    placeholderData: { items: [] },
  });
}
