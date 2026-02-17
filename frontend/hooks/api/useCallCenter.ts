import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '@/lib/api';
import { toast } from 'sonner';

const QUERY_KEYS = {
  status: ['callCenter', 'status'],
  phoneNumbers: ['callCenter', 'phoneNumbers'],
  token: ['callCenter', 'token'],
  calls: (params?: Record<string, string | number | undefined>) => ['callCenter', 'calls', params],
  call: (callSid: string) => ['callCenter', 'call', callSid],
  inboundCalls: ['callCenter', 'inboundCalls'],
  dispositions: ['callCenter', 'dispositions'],
  config: ['callCenter', 'config'],
};

// ─── Types ───

export interface TwilioPhoneNumber {
  sid: string;
  phoneNumber: string;
  friendlyName: string;
}

export interface CallCenterStatus {
  configured: boolean;
  voiceConfigured: boolean;
  phoneNumber: string | null;
}

export interface VoiceToken {
  token: string;
  identity: string;
}

export interface CallResult {
  success: boolean;
  callSid?: string;
  status?: string;
  error?: string;
}

export interface CallRecord {
  id: string;
  callSid?: string;
  direction: 'inbound' | 'outbound';
  fromNumber: string;
  toNumber: string;
  status: string;
  duration: number;
  startedAt: string;
  endedAt?: string;
  recordingUrl?: string;
  outcome?: string;
  leadId?: string | null;
  leadFirstName?: string | null;
  leadLastName?: string | null;
  leadCompany?: string | null;
  userName?: string | null;
}

export interface CallDetails {
  sid: string;
  status: string;
  duration?: number;
  startTime?: string;
  endTime?: string;
  from: string;
  to: string;
}

export interface Disposition {
  id: string;
  label: string;
  color: string | null;
  sortOrder: number;
  isDefault: boolean;
}

export interface CallCenterConfig {
  accountSid?: string;
  phoneNumber?: string;
  autoRecord?: boolean;
  configured: boolean;
  voiceConfigured?: boolean;
}

// ─── Status & Auth ───

export function useCallCenterStatus() {
  return useQuery<CallCenterStatus>({
    queryKey: QUERY_KEYS.status,
    queryFn: () => get<CallCenterStatus>('/call-center/status'),
    staleTime: 60000,
  });
}

export function usePhoneNumbers(enabled = true) {
  return useQuery<{ numbers: TwilioPhoneNumber[] }>({
    queryKey: QUERY_KEYS.phoneNumbers,
    queryFn: () => get<{ numbers: TwilioPhoneNumber[] }>('/call-center/phone-numbers'),
    staleTime: 300000,
    enabled,
  });
}

export function useVoiceToken(enabled = true) {
  return useQuery<VoiceToken>({
    queryKey: QUERY_KEYS.token,
    queryFn: () => get<VoiceToken>('/call-center/token'),
    staleTime: 3000000, // ~50 min, refresh before 1hr expiry
    retry: false,
    enabled,
  });
}

// ─── Calls ───

export function useMakeCall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { to: string; fromNumberId?: string }) => {
      return post<CallResult>('/call-center/call', data);
    },
    onSuccess: (data) => {
      if (data.success && data.callSid) {
        queryClient.invalidateQueries({ queryKey: ['callCenter'] });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to initiate call');
    },
  });
}

export function useEndCall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (callSid: string) => {
      return post<CallResult>('/call-center/call/end', { callSid });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callCenter'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to end call');
    },
  });
}

export function useCallDetails(callSid: string | null) {
  return useQuery<CallDetails>({
    queryKey: QUERY_KEYS.call(callSid || ''),
    queryFn: () => get<CallDetails>(`/call-center/call/${callSid}`),
    enabled: !!callSid,
    refetchInterval: 2000,
  });
}

// ─── Call History / Recordings ───

export function useCallHistory(params?: {
  direction?: 'inbound' | 'outbound';
  limit?: number;
  page?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.direction) searchParams.set('direction', params.direction);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.page) searchParams.set('page', params.page.toString());
  const queryString = searchParams.toString();

  return useQuery<{ data: CallRecord[]; total: number }>({
    queryKey: QUERY_KEYS.calls(params as Record<string, string | number | undefined>),
    queryFn: () => get<{ data: CallRecord[]; total: number }>(`/call-center/calls${queryString ? `?${queryString}` : ''}`),
    staleTime: 30000,
  });
}

export function useInboundCalls() {
  return useQuery<{ data: CallRecord[] }>({
    queryKey: QUERY_KEYS.inboundCalls,
    queryFn: () => get<{ data: CallRecord[] }>('/call-center/calls?direction=inbound&limit=20'),
    staleTime: 30000,
  });
}

// ─── Call Outcome ───

export function useSetCallOutcome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      callSid: string;
      outcome: string;
      notes?: string;
    }) => {
      return post<{ success: boolean }>('/call-center/call/outcome', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callCenter', 'calls'] });
      toast.success('Call outcome saved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save outcome');
    },
  });
}

// ─── Dispositions ───

export function useDispositions() {
  return useQuery<{ data: Disposition[] }>({
    queryKey: QUERY_KEYS.dispositions,
    queryFn: () => get<{ data: Disposition[] }>('/call-center/dispositions'),
    staleTime: 300000,
  });
}

export function useCreateDisposition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { label: string; color: string; sortOrder: number }) => {
      return post<Disposition>('/call-center/dispositions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dispositions });
      toast.success('Disposition created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create disposition');
    },
  });
}

export function useUpdateDisposition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; label?: string; color?: string }) => {
      return patch<Disposition>(`/call-center/dispositions/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dispositions });
      toast.success('Disposition updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update disposition');
    },
  });
}

export function useDeleteDisposition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return del<{ success: boolean }>(`/call-center/dispositions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dispositions });
      toast.success('Disposition deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete disposition');
    },
  });
}

// ─── Config (Admin) ───

export function useCallCenterConfig() {
  return useQuery<CallCenterConfig>({
    queryKey: QUERY_KEYS.config,
    queryFn: () => get<CallCenterConfig>('/call-center/config'),
    staleTime: 300000,
  });
}

export function useSaveCallCenterConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      accountSid?: string;
      authToken?: string;
      phoneNumber?: string;
      apiKeySid?: string;
      apiKeySecret?: string;
      twimlAppSid?: string;
      autoRecord?: boolean;
    }) => {
      return post<{ success: boolean }>('/call-center/config', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.config });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.status });
      toast.success('Configuration saved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save configuration');
    },
  });
}
