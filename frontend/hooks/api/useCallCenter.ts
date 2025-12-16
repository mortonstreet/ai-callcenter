import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post } from '@/lib/api';
import { toast } from 'sonner';

const QUERY_KEYS = {
  status: ['callCenter', 'status'],
  phoneNumbers: ['callCenter', 'phoneNumbers'],
  token: ['callCenter', 'token'],
  call: (callSid: string) => ['callCenter', 'call', callSid],
};

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

export interface CallDetails {
  sid: string;
  status: string;
  duration?: number;
  startTime?: string;
  endTime?: string;
  from: string;
  to: string;
}

/**
 * Check if Twilio is configured
 */
export function useCallCenterStatus() {
  return useQuery<CallCenterStatus>({
    queryKey: QUERY_KEYS.status,
    queryFn: () => get<CallCenterStatus>('/call-center/status'),
    staleTime: 60000, // Cache for 1 minute
  });
}

/**
 * Get available phone numbers
 */
export function usePhoneNumbers() {
  return useQuery<{ numbers: TwilioPhoneNumber[] }>({
    queryKey: QUERY_KEYS.phoneNumbers,
    queryFn: () => get<{ numbers: TwilioPhoneNumber[] }>('/call-center/phone-numbers'),
    staleTime: 300000, // Cache for 5 minutes
  });
}

/**
 * Get voice token for browser-based calling
 */
export function useVoiceToken() {
  return useQuery<VoiceToken>({
    queryKey: QUERY_KEYS.token,
    queryFn: () => get<VoiceToken>('/call-center/token'),
    staleTime: 3600000, // Token valid for 1 hour
    retry: false, // Don't retry if voice not configured
  });
}

/**
 * Make an outbound call
 */
export function useMakeCall() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { to: string; fromNumberId?: string }) => {
      return post<CallResult>('/call-center/call', data);
    },
    onSuccess: (data) => {
      if (data.success && data.callSid) {
        // Invalidate call queries
        queryClient.invalidateQueries({ queryKey: ['callCenter'] });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to initiate call');
    },
  });
}

/**
 * End an active call
 */
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

/**
 * Get call details
 */
export function useCallDetails(callSid: string | null) {
  return useQuery<CallDetails>({
    queryKey: QUERY_KEYS.call(callSid || ''),
    queryFn: () => get<CallDetails>(`/call-center/call/${callSid}`),
    enabled: !!callSid,
    refetchInterval: 2000, // Poll every 2 seconds while call is active
  });
}

/**
 * Set call outcome
 */
export function useSetCallOutcome() {
  return useMutation({
    mutationFn: async (data: { 
      callSid: string; 
      outcome: 'booked' | 'follow_up' | 'not_interested' | 'no_answer' | 'voicemail' | 'wrong_number';
      notes?: string;
    }) => {
      return post<{ success: boolean }>('/call-center/call/outcome', data);
    },
    onSuccess: () => {
      toast.success('Call outcome saved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save outcome');
    },
  });
}

