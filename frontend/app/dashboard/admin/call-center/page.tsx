"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Page } from "@/components/dashboard/Page";
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  Clock, 
  User, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  AlertTriangle,
  Mic,
  MicOff,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import {
  useCallCenterStatus,
  usePhoneNumbers,
  useVoiceToken,
  useSetCallOutcome,
  TwilioPhoneNumber,
} from "@/hooks/api/useCallCenter";

// Dynamically import Twilio Voice SDK (client-side only)
import type { Device, Call } from '@twilio/voice-sdk';

// Test configuration
const TEST_CALLBACK_NUMBER = "+12126804902";

// Mock callback queue - will come from API later
const MOCK_CALLBACKS = [
  {
    id: "1",
    customerName: "John Doe",
    customerPhone: "+12126804902",
    flaggedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    priority: "high",
    status: "pending",
    notes: "Interested in HVAC service",
  },
  {
    id: "2", 
    customerName: "Jane Smith",
    customerPhone: "+15551234567",
    flaggedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    priority: "normal",
    status: "pending",
    notes: "Follow up on quote",
  },
];

type CallStatus = "idle" | "connecting" | "ringing" | "connected" | "ended";
type DeviceStatus = "offline" | "registering" | "ready" | "error";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border-red-300",
  high: "bg-orange-100 text-orange-700 border-orange-300",
  normal: "bg-blue-100 text-blue-700 border-blue-300",
  low: "bg-gray-100 text-gray-600 border-gray-300",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  no_answer: "bg-gray-100 text-gray-600",
};

function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return "Just now";
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function CallCenterPage() {
  // API hooks
  const { data: statusData, isLoading: statusLoading } = useCallCenterStatus();
  const { data: numbersData, isLoading: numbersLoading } = usePhoneNumbers();
  const { data: tokenData, isLoading: tokenLoading, error: tokenError } = useVoiceToken();
  const setOutcomeMutation = useSetCallOutcome();

  // Twilio Device state
  const deviceRef = useRef<Device | null>(null);
  const activeCallRef = useRef<Call | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>("offline");
  const [deviceError, setDeviceError] = useState<string | null>(null);

  // Call state
  const [selectedFromNumber, setSelectedFromNumber] = useState("");
  const [dialNumber, setDialNumber] = useState(TEST_CALLBACK_NUMBER);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showOutcomeSelector, setShowOutcomeSelector] = useState(false);
  
  // Callback queue state
  const [callbacks] = useState(MOCK_CALLBACKS);
  const [selectedCallback, setSelectedCallback] = useState<string | null>(null);

  // Initialize Twilio Device when token is available
  useEffect(() => {
    if (!tokenData?.token || typeof window === 'undefined') return;

    const initDevice = async () => {
      try {
        // Dynamically import Twilio Voice SDK
        const { Device } = await import('@twilio/voice-sdk');
        
        setDeviceStatus("registering");
        
        // Clean up existing device
        if (deviceRef.current) {
          deviceRef.current.destroy();
        }

        // Create new device
        const device = new Device(tokenData.token, {
          logLevel: 1,
          codecPreferences: ['opus', 'pcmu'] as any,
        });

        // Device event handlers
        device.on('registered', () => {
          console.log('Twilio Device registered and ready');
          setDeviceStatus("ready");
          setDeviceError(null);
        });

        device.on('error', (error: any) => {
          console.error('Twilio Device error:', error);
          setDeviceStatus("error");
          setDeviceError(error.message || 'Device error');
          toast.error(`Phone error: ${error.message}`);
        });

        device.on('incoming', (call: Call) => {
          console.log('Incoming call from:', call.parameters.From);
          // For now, just log incoming calls
          toast.info(`Incoming call from ${call.parameters.From}`);
        });

        // Register the device
        await device.register();
        deviceRef.current = device;

      } catch (error: any) {
        console.error('Failed to initialize Twilio Device:', error);
        setDeviceStatus("error");
        setDeviceError(error.message || 'Failed to initialize');
      }
    };

    initDevice();

    return () => {
      if (deviceRef.current) {
        deviceRef.current.destroy();
        deviceRef.current = null;
      }
    };
  }, [tokenData?.token]);

  // Set default phone number when loaded
  useEffect(() => {
    if (numbersData?.numbers?.length && !selectedFromNumber) {
      setSelectedFromNumber(numbersData.numbers[0].sid);
    }
  }, [numbersData, selectedFromNumber]);

  // Call timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === "connected") {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const handleStartCall = useCallback(async () => {
    if (!dialNumber) {
      toast.error("Please enter a number to dial");
      return;
    }

    if (!deviceRef.current || deviceStatus !== "ready") {
      toast.error("Phone not ready. Please wait...");
      return;
    }

    try {
      setCallStatus("connecting");
      setCallDuration(0);
      toast.info(`Calling ${formatPhoneNumber(dialNumber)}...`);

      // Make call through Twilio Device
      const call = await deviceRef.current.connect({
        params: {
          To: dialNumber,
        },
      });

      activeCallRef.current = call;

      // Call event handlers
      call.on('ringing', () => {
        console.log('Call is ringing');
        setCallStatus("ringing");
      });

      call.on('accept', () => {
        console.log('Call accepted');
        setCallStatus("connected");
        toast.success("Call connected!");
      });

      call.on('disconnect', () => {
        console.log('Call disconnected');
        setCallStatus("ended");
        activeCallRef.current = null;
        toast.info(`Call ended - Duration: ${formatDuration(callDuration)}`);
        setTimeout(() => setShowOutcomeSelector(true), 500);
      });

      call.on('cancel', () => {
        console.log('Call cancelled');
        setCallStatus("idle");
        activeCallRef.current = null;
        toast.info("Call cancelled");
      });

      call.on('error', (error: any) => {
        console.error('Call error:', error);
        setCallStatus("idle");
        activeCallRef.current = null;
        toast.error(`Call failed: ${error.message}`);
      });

    } catch (error: any) {
      console.error('Failed to make call:', error);
      setCallStatus("idle");
      toast.error(error.message || "Failed to make call");
    }
  }, [dialNumber, deviceStatus, callDuration]);

  const handleEndCall = useCallback(() => {
    if (activeCallRef.current) {
      activeCallRef.current.disconnect();
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    if (activeCallRef.current) {
      const newMuteState = !isMuted;
      activeCallRef.current.mute(newMuteState);
      setIsMuted(newMuteState);
      toast.info(newMuteState ? "Muted" : "Unmuted");
    }
  }, [isMuted]);

  const handleSetOutcome = async (outcome: 'booked' | 'follow_up' | 'not_interested' | 'no_answer' | 'voicemail' | 'wrong_number') => {
    toast.success(`Call marked as: ${outcome.replace("_", " ")}`);
    
    // Reset for next call
    setTimeout(() => {
      setCallStatus("idle");
      setShowOutcomeSelector(false);
      setCallDuration(0);
      setIsMuted(false);
    }, 500);
  };

  const handleCallFromQueue = (callback: typeof MOCK_CALLBACKS[0]) => {
    setDialNumber(callback.customerPhone);
    setSelectedCallback(callback.id);
    toast.info(`Ready to call ${callback.customerName}`);
  };

  const phoneNumbers = numbersData?.numbers || [];
  const isConfigured = statusData?.configured ?? false;
  const isVoiceConfigured = statusData?.voiceConfigured ?? false;
  const isLoading = statusLoading || numbersLoading;

  // Not configured warning
  if (!isLoading && !isConfigured) {
    return (
      <Page title="Call Center" subtitle="Make outbound callbacks and manage your call queue">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Twilio Not Configured</h3>
          <p className="text-yellow-700 mb-4">
            The call center requires Twilio credentials to be configured in the backend.
          </p>
          <p className="text-sm text-yellow-600">
            Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to your environment variables.
          </p>
        </div>
      </Page>
    );
  }

  // Voice not configured warning
  if (!isLoading && isConfigured && !isVoiceConfigured) {
    return (
      <Page title="Call Center" subtitle="Make outbound callbacks and manage your call queue">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-orange-800 mb-2">Voice Calling Not Configured</h3>
          <p className="text-orange-700 mb-4">
            Browser-based voice calling requires additional Twilio setup.
          </p>
          <div className="text-sm text-orange-600 text-left max-w-md mx-auto space-y-2">
            <p><strong>1.</strong> Create a TwiML App in Twilio Console → Voice → TwiML Apps</p>
            <p><strong>2.</strong> Set Voice Request URL to: <code className="bg-orange-100 px-1 rounded">{`{YOUR_BACKEND_URL}/api/call-center/voice`}</code></p>
            <p><strong>3.</strong> Create an API Key in Twilio Console → Account → API Keys</p>
            <p><strong>4.</strong> Add to your .env:</p>
            <pre className="bg-orange-100 p-2 rounded text-xs overflow-x-auto">
{`TWILIO_API_KEY_SID=SK...
TWILIO_API_KEY_SECRET=...
TWILIO_TWIML_APP_SID=AP...`}
            </pre>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page title="Call Center" subtitle="Make outbound callbacks and manage your call queue">
      {/* Device Status Banner */}
      {deviceStatus !== "ready" && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
          deviceStatus === "registering" ? "bg-blue-50 text-blue-700" :
          deviceStatus === "error" ? "bg-red-50 text-red-700" :
          "bg-gray-50 text-gray-700"
        }`}>
          {deviceStatus === "registering" && (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Connecting to phone system...</span>
            </>
          )}
          {deviceStatus === "error" && (
            <>
              <AlertCircle className="h-4 w-4" />
              <span>Phone error: {deviceError}</span>
            </>
          )}
          {deviceStatus === "offline" && (
            <>
              <AlertCircle className="h-4 w-4" />
              <span>Phone offline - loading...</span>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Dial Pad */}
        <div className="space-y-6">
          {/* Dial Pad Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Phone className="h-5 w-5 text-[var(--color-primary)]" />
                Dial Pad
              </h3>
              {deviceStatus === "ready" && (
                <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <Volume2 className="h-3 w-3" />
                  Ready
                </span>
              )}
            </div>

            {/* From Number Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Call From
              </label>
              <div className="relative">
                <select
                  value={selectedFromNumber}
                  onChange={(e) => setSelectedFromNumber(e.target.value)}
                  disabled={callStatus !== "idle" || isLoading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent appearance-none bg-white text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <option>Loading...</option>
                  ) : phoneNumbers.length === 0 ? (
                    <option>No numbers available</option>
                  ) : (
                    phoneNumbers.map((num: TwilioPhoneNumber) => (
                      <option key={num.sid} value={num.sid}>
                        {num.friendlyName} - {formatPhoneNumber(num.phoneNumber)}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* To Number Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Call To
              </label>
              <input
                type="tel"
                value={dialNumber}
                onChange={(e) => setDialNumber(e.target.value)}
                placeholder="+1 (555) 123-4567"
                disabled={callStatus !== "idle"}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-gray-900 text-lg font-mono disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">
                Test number pre-filled: {formatPhoneNumber(TEST_CALLBACK_NUMBER)}
              </p>
            </div>

            {/* Call Status Display */}
            {callStatus !== "idle" && (
              <div className={`mb-4 p-4 rounded-lg ${
                callStatus === "connecting" || callStatus === "ringing" ? "bg-yellow-50 border border-yellow-200" :
                callStatus === "connected" ? "bg-green-50 border border-green-200" :
                "bg-gray-50 border border-gray-200"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {callStatus === "connecting" && (
                      <>
                        <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" />
                        <span className="text-yellow-700 font-medium">Connecting...</span>
                      </>
                    )}
                    {callStatus === "ringing" && (
                      <>
                        <Phone className="h-5 w-5 text-yellow-600 animate-pulse" />
                        <span className="text-yellow-700 font-medium">Ringing...</span>
                      </>
                    )}
                    {callStatus === "connected" && (
                      <>
                        <PhoneCall className="h-5 w-5 text-green-600 animate-pulse" />
                        <span className="text-green-700 font-medium">Connected</span>
                      </>
                    )}
                    {callStatus === "ended" && (
                      <>
                        <PhoneOff className="h-5 w-5 text-gray-600" />
                        <span className="text-gray-700 font-medium">Call Ended</span>
                      </>
                    )}
                  </div>
                  {(callStatus === "connected" || callStatus === "ended") && (
                    <span className="text-2xl font-mono text-green-700">
                      {formatDuration(callDuration)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Call Controls */}
            <div className="flex gap-2">
              {callStatus === "idle" && (
                <button
                  onClick={handleStartCall}
                  disabled={deviceStatus !== "ready" || !dialNumber}
                  className="flex-1 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Phone className="h-5 w-5" />
                  Start Call
                </button>
              )}

              {(callStatus === "connecting" || callStatus === "ringing") && (
                <button
                  onClick={handleEndCall}
                  className="flex-1 py-4 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition"
                >
                  <XCircle className="h-5 w-5" />
                  Cancel
                </button>
              )}

              {callStatus === "connected" && (
                <>
                  <button
                    onClick={handleToggleMute}
                    className={`px-4 py-4 rounded-lg flex items-center justify-center gap-2 transition ${
                      isMuted 
                        ? "bg-red-100 text-red-700 hover:bg-red-200" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={handleEndCall}
                    className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition"
                  >
                    <PhoneOff className="h-5 w-5" />
                    End Call
                  </button>
                </>
              )}
            </div>

            {/* Outcome Selector */}
            {showOutcomeSelector && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-3">What was the outcome?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleSetOutcome("booked")}
                    className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition text-sm font-medium flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Booked
                  </button>
                  <button
                    onClick={() => handleSetOutcome("follow_up")}
                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm font-medium flex items-center justify-center gap-1"
                  >
                    <Clock className="h-4 w-4" />
                    Follow Up
                  </button>
                  <button
                    onClick={() => handleSetOutcome("not_interested")}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium flex items-center justify-center gap-1"
                  >
                    <XCircle className="h-4 w-4" />
                    Not Interested
                  </button>
                  <button
                    onClick={() => handleSetOutcome("no_answer")}
                    className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition text-sm font-medium flex items-center justify-center gap-1"
                  >
                    <AlertCircle className="h-4 w-4" />
                    No Answer
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Recent Calls Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Calls</h3>
            <div className="space-y-2 text-sm text-gray-500">
              <p className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                +1 (212) 680-4902 → Booked (2m ago)
              </p>
              <p className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-gray-400" />
                +1 (555) 123-4567 → No Answer (15m ago)
              </p>
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                +1 (555) 987-6543 → Follow Up (1h ago)
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Callback Queue */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <User className="h-5 w-5 text-[var(--color-primary)]" />
              Callback Queue
            </h3>
            <span className="text-sm text-gray-500">
              {callbacks.filter((c) => c.status === "pending").length} pending
            </span>
          </div>

          {/* Queue List */}
          <div className="space-y-3">
            {callbacks.map((callback) => (
              <div
                key={callback.id}
                className={`p-4 rounded-lg border transition cursor-pointer ${
                  selectedCallback === callback.id
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
                onClick={() => setSelectedCallback(callback.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{callback.customerName}</p>
                    <p className="text-sm text-gray-600 font-mono">
                      {formatPhoneNumber(callback.customerPhone)}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded-full border ${PRIORITY_COLORS[callback.priority]}`}>
                    {callback.priority}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    Flagged {formatTimeAgo(callback.flaggedAt)}
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[callback.status]}`}>
                    {callback.status.replace("_", " ")}
                  </span>
                </div>

                {callback.notes && (
                  <p className="mt-2 text-xs text-gray-500 italic">
                    &ldquo;{callback.notes}&rdquo;
                  </p>
                )}

                {/* Action Buttons */}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCallFromQueue(callback);
                    }}
                    disabled={callStatus !== "idle" || deviceStatus !== "ready"}
                    className="flex-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                  >
                    <Phone className="h-3 w-3" />
                    Call
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toast.info("Callback skipped");
                    }}
                    className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition"
                  >
                    Skip
                  </button>
                </div>
              </div>
            ))}
          </div>

          {callbacks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No callbacks in queue</p>
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}
