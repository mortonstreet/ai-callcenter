"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Page } from "@/components/dashboard/Page";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Mic,
  MicOff,
  Volume2,
  History,
  Settings,
  Save,
  Plus,
  Pencil,
  Trash2,
  Check,
  GripVertical,
  Play,
  Pause,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import {
  useCallCenterStatus,
  usePhoneNumbers,
  useCallHistory,
  useInboundCalls,
  useSetCallOutcome,
  useDispositions,
  useCreateDisposition,
  useUpdateDisposition,
  useDeleteDisposition,
  useCallCenterConfig,
  useSaveCallCenterConfig,
  type TwilioPhoneNumber,
  type CallRecord,
  type Disposition,
} from "@/hooks/api/useCallCenter";
import { useDialerContext } from "@/components/providers/DialerProvider";

import type { Call } from "@twilio/voice-sdk";

// ─── Types ───

type TabType = "dialer" | "inbound" | "recordings" | "settings";
type CallStatus = "idle" | "connecting" | "ringing" | "connected" | "ended";
type DeviceStatus = "offline" | "registering" | "ready" | "error";

// ─── Helpers ───

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

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
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

// ─── Main Page ───

export default function CallCenterPage() {
  const [activeTab, setActiveTab] = useState<TabType>("dialer");

  // Global dialer context (device + inbound state from DialerProvider)
  const {
    device,
    deviceStatus,
    deviceError,
    incomingCall,
    inboundCallStatus,
    inboundCallDuration,
    inboundMuted,
    answerIncomingCall: handleAnswerInbound,
    rejectIncomingCall: handleRejectInbound,
    endInboundCall: handleEndInbound,
    toggleInboundMute: handleToggleInboundMute,
    sendInboundDigit: handleInboundDialpadPress,
  } = useDialerContext();

  // API hooks
  const { data: statusData, isLoading: statusLoading } = useCallCenterStatus();
  const isConfigured = statusData?.configured ?? false;
  const { data: numbersData, isLoading: numbersLoading } = usePhoneNumbers(isConfigured);

  // Local outbound call state
  const activeCallRef = useRef<Call | null>(null);
  const [selectedFromNumber, setSelectedFromNumber] = useState("");
  const [dialNumber, setDialNumber] = useState("");
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showOutcome, setShowOutcome] = useState(false);
  const [showDtmfKeypad, setShowDtmfKeypad] = useState(false);
  const [lastCallSid, setLastCallSid] = useState<string | null>(null);
  const [showInboundKeypad, setShowInboundKeypad] = useState(false);

  const phoneNumbers = numbersData?.numbers || [];
  const isLoading = statusLoading || numbersLoading;

  // Auto-switch to inbound tab when incoming call arrives
  useEffect(() => {
    if (inboundCallStatus === "ringing") {
      setActiveTab("inbound");
      setShowInboundKeypad(false);
    }
  }, [inboundCallStatus]);

  // Set default phone number
  useEffect(() => {
    if (numbersData?.numbers?.length && !selectedFromNumber) {
      setSelectedFromNumber(numbersData.numbers[0].sid);
    }
  }, [numbersData, selectedFromNumber]);

  // Outbound call timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === "connected") {
      interval = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  // ─── Outbound Call Actions ───

  const handleStartCall = useCallback(async () => {
    if (!dialNumber) {
      toast.error("Please enter a number to dial");
      return;
    }
    if (!device || deviceStatus !== "ready") {
      toast.error("Phone not ready. Please wait...");
      return;
    }

    try {
      setCallStatus("connecting");
      setCallDuration(0);
      setShowOutcome(false);

      const selectedPhone = phoneNumbers.find((p) => p.sid === selectedFromNumber);
      const call = await device.connect({
        params: {
          To: dialNumber,
          CallerId: selectedPhone?.phoneNumber || "",
        },
      });

      activeCallRef.current = call;

      call.on("ringing", () => setCallStatus("ringing"));

      call.on("accept", () => {
        setCallStatus("connected");
      });

      call.on("disconnect", () => {
        setCallStatus("ended");
        setLastCallSid(call.parameters?.CallSid || null);
        activeCallRef.current = null;
        setTimeout(() => setShowOutcome(true), 300);
      });

      call.on("cancel", () => {
        setCallStatus("idle");
        activeCallRef.current = null;
      });

      call.on("error", (error: any) => {
        setCallStatus("idle");
        activeCallRef.current = null;
        toast.error(`Call failed: ${error.message}`);
      });
    } catch (error: any) {
      setCallStatus("idle");
      toast.error(error.message || "Failed to make call");
    }
  }, [dialNumber, deviceStatus, device]);

  const handleEndCall = useCallback(() => {
    if (activeCallRef.current) {
      activeCallRef.current.disconnect();
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    if (activeCallRef.current) {
      const newMute = !isMuted;
      activeCallRef.current.mute(newMute);
      setIsMuted(newMute);
    }
  }, [isMuted]);

  const handleDialpadPress = (digit: string) => {
    if (activeCallRef.current) {
      activeCallRef.current.sendDigits(digit);
    } else {
      setDialNumber((prev) => prev + digit);
    }
  };

  const handleSetOutcome = (outcome: string) => {
    toast.success(`Call marked as: ${outcome.replace("_", " ")}`);
    setTimeout(() => {
      setCallStatus("idle");
      setShowOutcome(false);
      setCallDuration(0);
      setIsMuted(false);
    }, 300);
  };

  const handleCallBack = useCallback((phoneNumber: string) => {
    setDialNumber(phoneNumber);
    setActiveTab("dialer");
    toast.info(`Ready to call ${formatPhoneNumber(phoneNumber)}`);
  }, []);

  const isCallActive = callStatus === "connecting" || callStatus === "ringing" || callStatus === "connected";

  // ─── Tab Config ───

  const tabs = [
    { id: "dialer" as const, label: "Manual Dialer", icon: Phone },
    { id: "inbound" as const, label: "Inbound", icon: PhoneIncoming },
    { id: "recordings" as const, label: "Recordings", icon: History },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  // ─── Not Configured Guards ───

  // If not configured, auto-switch to settings tab so user can set up Twilio
  useEffect(() => {
    if (!isLoading && !isConfigured) {
      setActiveTab("settings");
    }
  }, [isLoading, isConfigured]);

  return (
    <Page title="Call Center" subtitle="Outbound and inbound calling">
      {/* Persistent Device Status Indicator */}
      <div className={`mb-4 flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full w-fit ${
        deviceStatus === "ready" ? "bg-green-50 text-green-700 border border-green-200" :
        deviceStatus === "registering" ? "bg-amber-50 text-amber-700 border border-amber-200" :
        deviceStatus === "error" ? "bg-red-50 text-red-700 border border-red-200" :
        "bg-muted text-muted-foreground border border-border"
      }`}>
        <span className={`w-2 h-2 rounded-full ${
          deviceStatus === "ready" ? "bg-green-500" :
          deviceStatus === "registering" ? "bg-amber-500 animate-pulse" :
          deviceStatus === "error" ? "bg-red-500" :
          "bg-gray-400"
        }`} />
        {deviceStatus === "ready" ? "Phone Connected — Listening for calls" :
         deviceStatus === "registering" ? "Connecting phone..." :
         deviceStatus === "error" ? `Error: ${deviceError}` :
         "Phone Offline — No token"}
        {deviceStatus === "ready" && (
          <span className="text-green-600/60 font-mono ml-1">(connected)</span>
        )}
      </div>

      {/* Device Status Banner */}
      {deviceStatus === "registering" && (
        <div className="mb-6 p-4 bg-card border border-border rounded-xl flex items-center gap-3">
          <div className="relative w-10 h-10 flex-shrink-0">
            <div className="absolute inset-0 flex items-center justify-center">
              <Phone className="w-5 h-5 text-foreground" />
            </div>
            <svg className="w-10 h-10 animate-spin" viewBox="0 0 40 40">
              <circle className="stroke-border" cx="20" cy="20" r="18" strokeWidth="2" fill="none" />
              <circle className="stroke-foreground" cx="20" cy="20" r="18" strokeWidth="2" fill="none" strokeDasharray="113" strokeDashoffset="75" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Connecting to Phone System</p>
            <p className="text-xs text-muted-foreground mt-0.5">Setting up your phone connection...</p>
          </div>
        </div>
      )}

      {deviceStatus === "error" && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">Connection Error</p>
            <p className="text-xs text-red-600 mt-1">{deviceError}</p>
          </div>
        </div>
      )}

      {/* Incoming Call Banner - shown on any tab */}
      {incomingCall && activeTab !== "inbound" && (
        <div className="mb-6 p-4 bg-green-50 border-2 border-green-300 rounded-xl flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Phone className="w-5 h-5 text-green-600 animate-bounce" />
            </div>
            <div>
              <p className="text-sm font-semibold text-green-800">Incoming Call</p>
              <p className="text-xs font-mono text-green-700">{incomingCall.parameters?.From || "Unknown"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRejectInbound}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition text-sm font-medium"
            >
              Decline
            </button>
            <button
              onClick={() => { handleAnswerInbound(); setActiveTab("inbound"); }}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition text-sm font-medium"
            >
              Answer
            </button>
          </div>
        </div>
      )}

      {/* Mobile Tab Selector */}
      <div className="sm:hidden mb-6">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as TabType)}
          className="w-full h-12 px-4 bg-card border border-border rounded-xl text-foreground appearance-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 12px center",
            backgroundSize: "20px",
          }}
        >
          {tabs.map((tab) => (
            <option key={tab.id} value={tab.id}>{tab.label}</option>
          ))}
        </select>
      </div>

      {/* Desktop Tabs */}
      <div role="tablist" aria-label="Call center sections" className="hidden sm:flex gap-1 p-1 bg-muted/50 rounded-xl w-fit mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0">
        {activeTab === "dialer" && (
          <DialerTab
            dialNumber={dialNumber}
            setDialNumber={setDialNumber}
            selectedFromNumber={selectedFromNumber}
            setSelectedFromNumber={setSelectedFromNumber}
            phoneNumbers={phoneNumbers}
            isLoading={isLoading}
            deviceStatus={deviceStatus}
            callStatus={callStatus}
            callDuration={callDuration}
            isMuted={isMuted}
            showOutcome={showOutcome}
            showDtmfKeypad={showDtmfKeypad}
            setShowDtmfKeypad={setShowDtmfKeypad}
            isCallActive={isCallActive}
            onStartCall={handleStartCall}
            onEndCall={handleEndCall}
            onToggleMute={handleToggleMute}
            onDialpadPress={handleDialpadPress}
            onSetOutcome={handleSetOutcome}
          />
        )}

        {activeTab === "inbound" && (
          <InboundTab
            incomingCall={incomingCall}
            inboundCallStatus={inboundCallStatus}
            inboundCallDuration={inboundCallDuration}
            inboundMuted={inboundMuted}
            showKeypad={showInboundKeypad}
            setShowKeypad={setShowInboundKeypad}
            onAnswer={handleAnswerInbound}
            onReject={handleRejectInbound}
            onEnd={handleEndInbound}
            onToggleMute={handleToggleInboundMute}
            onDialpadPress={handleInboundDialpadPress}
            onCallBack={handleCallBack}
            deviceReady={deviceStatus === "ready"}
          />
        )}

        {activeTab === "recordings" && <RecordingsTab />}

        {activeTab === "settings" && <SettingsTab />}
      </div>
    </Page>
  );
}

// ═══════════════════════════════════════════════
// ─── DIALER TAB ───
// ═══════════════════════════════════════════════

function DialerTab({
  dialNumber,
  setDialNumber,
  selectedFromNumber,
  setSelectedFromNumber,
  phoneNumbers,
  isLoading,
  deviceStatus,
  callStatus,
  callDuration,
  isMuted,
  showOutcome,
  showDtmfKeypad,
  setShowDtmfKeypad,
  isCallActive,
  onStartCall,
  onEndCall,
  onToggleMute,
  onDialpadPress,
  onSetOutcome,
}: {
  dialNumber: string;
  setDialNumber: (v: string) => void;
  selectedFromNumber: string;
  setSelectedFromNumber: (v: string) => void;
  phoneNumbers: TwilioPhoneNumber[];
  isLoading: boolean;
  deviceStatus: DeviceStatus;
  callStatus: CallStatus;
  callDuration: number;
  isMuted: boolean;
  showOutcome: boolean;
  showDtmfKeypad: boolean;
  setShowDtmfKeypad: (v: boolean) => void;
  isCallActive: boolean;
  onStartCall: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onDialpadPress: (digit: string) => void;
  onSetOutcome: (outcome: string) => void;
}) {
  const [showNumberSelector, setShowNumberSelector] = useState(false);

  return (
    <div className="h-full flex items-start justify-center pt-4">
      <div className="w-full sm:max-w-md">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-600" />
              <h3 className="font-medium text-foreground">Manual Dialer</h3>
            </div>
            {deviceStatus === "ready" && (
              <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <Volume2 className="h-3 w-3" />
                Ready
              </span>
            )}
          </div>

          <div className="p-4">
            {/* Recording indicator */}
            {(callStatus === "connected") && (
              <div className="flex items-center justify-center mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-full">
                  <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-recording-pulse" />
                  <span className="text-xs text-red-500 uppercase tracking-wide font-medium">Recording</span>
                </div>
              </div>
            )}

            {/* Call duration display */}
            <div className="flex justify-center mb-4">
              <div className={`bg-muted/50 rounded-xl px-6 py-3 transition-all duration-300 ${
                callStatus === "connected" ? "dialer-glow-active" : ""
              }`}>
                <div className="text-3xl font-mono text-foreground tabular-nums tracking-tight text-center">
                  {formatDuration(callDuration)}
                </div>
                {callStatus !== "idle" && callStatus !== "ended" && (
                  <div className="text-xs text-muted-foreground mt-1 text-center capitalize">
                    {callStatus}
                  </div>
                )}
              </div>
            </div>

            {/* Caller ID selector */}
            {!isCallActive && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-muted-foreground mb-2">Caller ID</label>
                {isLoading ? (
                  <div className="flex items-center justify-center py-3 bg-muted border border-border rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
                  </div>
                ) : phoneNumbers.length > 0 ? (
                  <div className="relative">
                    <button
                      onClick={() => setShowNumberSelector(!showNumberSelector)}
                      className="w-full flex items-center justify-between px-3 py-2.5 bg-muted border border-border rounded-lg hover:border-foreground/20 transition-colors"
                    >
                      <span className="font-mono text-sm truncate">
                        {(() => {
                          const selected = phoneNumbers.find((p) => p.sid === selectedFromNumber);
                          return selected ? `${selected.friendlyName} - ${formatPhoneNumber(selected.phoneNumber)}` : "Select number";
                        })()}
                      </span>
                      <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${showNumberSelector ? "rotate-180" : ""}`} />
                    </button>
                    {showNumberSelector && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                        {phoneNumbers.map((phone) => (
                          <button
                            key={phone.sid}
                            onClick={() => {
                              setSelectedFromNumber(phone.sid);
                              setShowNumberSelector(false);
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-muted transition-colors ${
                              selectedFromNumber === phone.sid ? "bg-muted" : ""
                            }`}
                          >
                            <span className="text-sm">{phone.friendlyName}</span>
                            <span className="block font-mono text-xs text-muted-foreground">{formatPhoneNumber(phone.phoneNumber)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-3 py-2.5 bg-muted border border-border rounded-lg">
                    <span className="text-sm text-amber-600">No numbers available</span>
                  </div>
                )}
              </div>
            )}

            {/* Phone number input */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                  {isCallActive ? "Connected to" : "Phone number"}
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={dialNumber}
                    onChange={(e) => setDialNumber(e.target.value)}
                    disabled={isCallActive}
                    placeholder="+1 (555) 123-4567"
                    className="w-full h-14 sm:h-12 text-center text-xl sm:text-lg font-mono tracking-wide px-4 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground/30 disabled:opacity-50 transition-all"
                  />
                  {!isCallActive && dialNumber && (
                    <button
                      onClick={() => setDialNumber("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Call controls */}
              {isCallActive ? (
                <div className="space-y-3">
                  {/* Mute button */}
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={onToggleMute}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-colors ${
                        isMuted
                          ? "bg-amber-100 text-amber-700 border border-amber-200"
                          : "bg-muted border border-border hover:bg-accent text-foreground"
                      }`}
                    >
                      {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      {isMuted ? "Unmute" : "Mute"}
                    </button>
                  </div>

                  {/* DTMF Keypad */}
                  <button
                    onClick={() => setShowDtmfKeypad(!showDtmfKeypad)}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition py-2"
                  >
                    {showDtmfKeypad ? "Hide keypad" : "Show keypad"}
                  </button>
                  {showDtmfKeypad && (
                    <div className="grid grid-cols-3 gap-2 p-3 bg-muted/50 rounded-lg">
                      {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((digit) => (
                        <button
                          key={digit}
                          onClick={() => onDialpadPress(digit)}
                          className="h-14 sm:h-12 text-lg font-mono font-medium bg-card border border-border rounded-lg hover:bg-muted active:scale-95 transition-all"
                        >
                          {digit}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* End call */}
                  <button
                    onClick={onEndCall}
                    className="w-full flex items-center justify-center gap-2 px-4 py-4 sm:py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                  >
                    <PhoneOff className="w-5 h-5" />
                    End Call
                  </button>
                </div>
              ) : (
                <button
                  onClick={onStartCall}
                  disabled={!dialNumber || deviceStatus !== "ready"}
                  className="w-full flex items-center justify-center gap-2 px-4 py-4 sm:py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Phone className="w-5 h-5" />
                  Call
                </button>
              )}
            </div>
          </div>

          {/* Outcome selector */}
          {showOutcome && (
            <div className="p-4 border-t border-border bg-muted/30">
              <p className="text-sm font-medium text-foreground mb-3">What was the outcome?</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "booked", label: "Booked", icon: CheckCircle, color: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" },
                  { key: "follow_up", label: "Follow Up", icon: Clock, color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" },
                  { key: "not_interested", label: "Not Interested", icon: XCircle, color: "bg-muted text-foreground/70 border-border hover:bg-accent" },
                  { key: "no_answer", label: "No Answer", icon: AlertCircle, color: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100" },
                  { key: "voicemail", label: "Voicemail", icon: Phone, color: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100" },
                  { key: "wrong_number", label: "Wrong Number", icon: PhoneOff, color: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100" },
                ].map(({ key, label, icon: Icon, color }) => (
                  <button
                    key={key}
                    onClick={() => onSetOutcome(key)}
                    className={`px-3 py-2 rounded-lg border transition text-sm font-medium flex items-center justify-center gap-1.5 ${color}`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// ─── INBOUND TAB ───
// ═══════════════════════════════════════════════

function InboundTab({
  incomingCall,
  inboundCallStatus,
  inboundCallDuration,
  inboundMuted,
  showKeypad,
  setShowKeypad,
  onAnswer,
  onReject,
  onEnd,
  onToggleMute,
  onDialpadPress,
  onCallBack,
  deviceReady,
}: {
  incomingCall: Call | null;
  inboundCallStatus: "idle" | "ringing" | "connected";
  inboundCallDuration: number;
  inboundMuted: boolean;
  showKeypad: boolean;
  setShowKeypad: (v: boolean) => void;
  onAnswer: () => void;
  onReject: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onDialpadPress: (digit: string) => void;
  onCallBack: (phone: string) => void;
  deviceReady: boolean;
}) {
  const { data: inboundData, isLoading } = useInboundCalls();
  const calls = inboundData?.data || [];
  const callerNumber = incomingCall?.parameters?.From || "Unknown";

  return (
    <div className="max-w-4xl space-y-6">
      {/* Active Incoming Call */}
      {(incomingCall || inboundCallStatus !== "idle") && (
        <div className="bg-card border-2 border-green-300 rounded-2xl p-6">
          {/* Recording indicator */}
          {inboundCallStatus === "connected" && (
            <div className="flex items-center justify-center gap-2 py-2 bg-red-50 text-red-500 border border-red-200 rounded-lg mb-4">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-recording-pulse" />
              <span className="text-sm font-medium">Recording Active</span>
            </div>
          )}

          {/* Caller info */}
          <div className="text-center mb-6">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
              inboundCallStatus === "connected" ? "bg-green-100" : "bg-muted animate-pulse"
            }`}>
              <User className={`w-10 h-10 ${inboundCallStatus === "connected" ? "text-green-600" : "text-muted-foreground"}`} />
            </div>

            {inboundCallStatus === "ringing" && (
              <div className="flex items-center justify-center gap-2 mb-2">
                <Phone className="w-5 h-5 text-green-600 animate-bounce" />
                <span className="text-sm font-medium text-green-600">Incoming Call</span>
              </div>
            )}

            {inboundCallStatus === "connected" && (
              <div className="mb-2">
                <span className="text-4xl font-mono text-foreground">{formatDuration(inboundCallDuration)}</span>
                <p className="text-sm text-green-600 mt-1">Connected</p>
              </div>
            )}

            <p className="text-2xl font-mono font-bold text-foreground">{callerNumber}</p>
            <p className="text-muted-foreground">Inbound Call</p>
          </div>

          {/* Call controls */}
          <div className="flex items-center justify-center gap-4">
            {inboundCallStatus === "connected" ? (
              <>
                <button
                  onClick={onToggleMute}
                  className={`p-4 rounded-full transition ${
                    inboundMuted ? "bg-amber-100 text-amber-700" : "bg-muted hover:bg-accent text-foreground"
                  }`}
                  title={inboundMuted ? "Unmute" : "Mute"}
                >
                  {inboundMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                <button
                  onClick={onEnd}
                  className="p-5 bg-red-500 hover:bg-red-600 text-white rounded-full transition"
                >
                  <PhoneOff className="w-8 h-8" />
                </button>
              </>
            ) : inboundCallStatus === "ringing" ? (
              <>
                <button
                  onClick={onReject}
                  className="p-5 bg-red-500 hover:bg-red-600 text-white rounded-full transition shadow-lg shadow-red-200"
                >
                  <PhoneOff className="w-8 h-8" />
                </button>
                <button
                  onClick={onAnswer}
                  className="p-5 bg-green-500 hover:bg-green-600 text-white rounded-full transition shadow-lg shadow-green-200 animate-pulse"
                >
                  <Phone className="w-8 h-8" />
                </button>
              </>
            ) : null}
          </div>

          {/* DTMF Keypad for inbound calls */}
          {inboundCallStatus === "connected" && (
            <div className="mt-6">
              <button
                onClick={() => setShowKeypad(!showKeypad)}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition py-2"
              >
                {showKeypad ? "Hide keypad" : "Show keypad for DTMF"}
              </button>
              {showKeypad && (
                <div className="grid grid-cols-3 gap-2 p-3 bg-muted/50 rounded-lg mt-2">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((digit) => (
                    <button
                      key={digit}
                      onClick={() => onDialpadPress(digit)}
                      className="h-14 sm:h-12 text-lg font-mono font-medium bg-card border border-border rounded-lg hover:bg-muted active:scale-95 transition-all"
                    >
                      {digit}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* No active call - waiting state */}
      {!incomingCall && inboundCallStatus === "idle" && (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <PhoneIncoming className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Waiting for Calls</h3>
          <p className="text-muted-foreground text-sm">
            Incoming calls will appear here. Make sure your Twilio number is configured to route calls to this application.
          </p>
          {!deviceReady && (
            <p className="text-xs text-amber-600 mt-3">
              Device not connected - will initialize when a call arrives
            </p>
          )}
        </div>
      )}

      {/* Recent Inbound Calls */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Recent Inbound Calls</h2>
          </div>
          {!isLoading && <span className="text-sm text-muted-foreground">{calls.length} calls</span>}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : calls.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">No inbound call history yet</div>
        ) : (
          <div className="space-y-2">
            {calls.map((call) => (
              <div
                key={call.id}
                className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:bg-muted/50 transition"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    call.status === "completed" ? "text-green-600 bg-green-50" :
                    call.status === "missed" ? "text-red-500 bg-red-50" :
                    "text-muted-foreground bg-muted"
                  }`}>
                    {call.status === "missed" ? <PhoneMissed className="w-4 h-4" /> : <PhoneIncoming className="w-4 h-4" />}
                  </div>
                  <div>
                    {(call.leadFirstName || call.leadLastName) ? (
                      <>
                        <p className="font-medium">{[call.leadFirstName, call.leadLastName].filter(Boolean).join(" ")}</p>
                        <p className="text-xs text-muted-foreground font-mono">{call.fromNumber}</p>
                      </>
                    ) : (
                      <>
                        <p className="font-mono font-medium">{formatPhoneNumber(call.fromNumber)}</p>
                        <p className="text-sm text-muted-foreground">Unknown caller</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-mono">{call.duration ? formatDuration(call.duration) : "--:--"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(call.startedAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => onCallBack(call.fromNumber)}
                    className="flex items-center gap-2 px-3 py-2 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition text-sm"
                  >
                    <Phone className="w-4 h-4" />
                    Call Back
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// ─── RECORDINGS TAB ───
// ═══════════════════════════════════════════════

function RecordingsTab() {
  const [showAll, setShowAll] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: callsData, isLoading } = useCallHistory({ limit: showAll ? 100 : 20 });
  const calls = callsData?.data || [];
  const total = callsData?.total || 0;

  const getCallIcon = (call: CallRecord) => {
    if (call.status === "missed") return <PhoneMissed className="w-4 h-4 text-red-500" />;
    if (call.direction === "inbound") return <PhoneIncoming className="w-4 h-4 text-blue-500" />;
    return <PhoneOutgoing className="w-4 h-4 text-green-600" />;
  };

  const handlePlayRecording = (callId: string, url: string) => {
    if (playingId === callId) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => {
      setPlayingId(null);
      toast.error("Failed to play recording");
    };
    audio.play();
    setPlayingId(callId);
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!calls.length) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <History className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Call History</h3>
        <p className="text-muted-foreground text-sm">Call recordings will appear here after you make or receive calls.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground mb-4">
        Showing all workspace calls
      </div>

      {calls.map((call) => (
        <div
          key={call.id}
          className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:bg-muted/50 transition"
        >
          {/* Direction icon */}
          <div className="flex-shrink-0">{getCallIcon(call)}</div>

          {/* Call info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {(call.leadFirstName || call.leadLastName) ? (
                <span className="font-medium text-foreground truncate">
                  {[call.leadFirstName, call.leadLastName].filter(Boolean).join(" ")}
                </span>
              ) : (
                <span className="font-medium text-foreground truncate font-mono">
                  {call.direction === "inbound" ? formatPhoneNumber(call.fromNumber) : formatPhoneNumber(call.toNumber)}
                </span>
              )}
              {call.outcome && (
                <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                  {call.outcome.replace("_", " ")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {(call.leadFirstName || call.leadLastName) && (
                <>
                  <span className="font-mono">
                    {call.direction === "inbound" ? formatPhoneNumber(call.fromNumber) : formatPhoneNumber(call.toNumber)}
                  </span>
                  <span>-</span>
                </>
              )}
              <span>{formatDate(call.startedAt)}</span>
              <span>-</span>
              <span>{formatDuration(call.duration)}</span>
              {call.userName && (
                <>
                  <span>-</span>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {call.userName}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Recording playback */}
          {call.recordingUrl && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePlayRecording(call.id, call.recordingUrl!)}
                className={`p-2 rounded-lg transition ${
                  playingId === call.id
                    ? "bg-foreground text-background"
                    : "bg-muted hover:bg-accent text-foreground"
                }`}
              >
                {playingId === call.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <a
                href={call.recordingUrl}
                download
                className="p-2 rounded-lg bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      ))}

      {/* Show more */}
      {total > 20 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/50 transition mt-4"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show Full History ({total} calls)
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// ─── SETTINGS TAB ───
// ═══════════════════════════════════════════════

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
];

function SettingsTab() {
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [apiKeySid, setApiKeySid] = useState("");
  const [apiKeySecret, setApiKeySecret] = useState("");
  const [twimlAppSid, setTwimlAppSid] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [autoRecord, setAutoRecord] = useState(true);

  const { data: config } = useCallCenterConfig();
  const saveConfig = useSaveCallCenterConfig();

  useEffect(() => {
    if (config) {
      setAccountSid(config.accountSid || "");
      setPhoneNumber(config.phoneNumber || "");
      setAutoRecord(config.autoRecord ?? true);
      setAuthToken("");
      setApiKeySid("");
      setApiKeySecret("");
      setTwimlAppSid("");
      setHasChanges(false);
    }
  }, [config]);

  const handleSave = async () => {
    const payload: Record<string, any> = { autoRecord };
    if (accountSid) payload.accountSid = accountSid;
    if (authToken) payload.authToken = authToken;
    if (phoneNumber) payload.phoneNumber = phoneNumber;
    if (apiKeySid) payload.apiKeySid = apiKeySid;
    if (apiKeySecret) payload.apiKeySecret = apiKeySecret;
    if (twimlAppSid) payload.twimlAppSid = twimlAppSid;

    try {
      await saveConfig.mutateAsync(payload);
      setHasChanges(false);
    } catch {
      // error handled in hook
    }
  };

  const handleFieldChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setHasChanges(true);
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Setup Banner */}
      {!config?.configured && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Twilio Setup Required</p>
              <p className="text-xs text-amber-700 mt-1">
                Enter your Twilio credentials below to enable the call center. You need at minimum an Account SID, Auth Token, and Phone Number.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Twilio Basic Configuration */}
      <SettingsCard
        title="Twilio Credentials"
        description="Configure your Twilio Account SID, Auth Token, and phone number to enable outbound and inbound calling."
      >
        <div className="space-y-4">
          <SettingsInput
            label="Account SID"
            value={accountSid}
            onChange={handleFieldChange(setAccountSid)}
            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            hint="Find this in your Twilio Console dashboard"
            disabled={saveConfig.isPending}
          />
          <SettingsInput
            label="Auth Token"
            value={authToken}
            onChange={handleFieldChange(setAuthToken)}
            placeholder={config?.configured ? "Enter new token to update" : "Your Twilio auth token"}
            hint={config?.configured ? "Leave blank to keep existing token" : "Find this in your Twilio Console dashboard"}
            disabled={saveConfig.isPending}
          />
          <SettingsInput
            label="Phone Number"
            value={phoneNumber}
            onChange={handleFieldChange(setPhoneNumber)}
            placeholder="+17752789755"
            hint="Your Twilio phone number in E.164 format (e.g., +1XXXXXXXXXX)"
            disabled={saveConfig.isPending}
          />
        </div>
      </SettingsCard>

      {/* Voice SDK Configuration */}
      <SettingsCard
        title="Browser Calling (Voice SDK)"
        description="Configure API Key and TwiML App for browser-based calling. Required for the dialer to work in-browser."
      >
        <div className="space-y-4">
          <SettingsInput
            label="API Key SID"
            value={apiKeySid}
            onChange={handleFieldChange(setApiKeySid)}
            placeholder={config?.voiceConfigured ? "Enter new key to update" : "SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}
            hint={config?.voiceConfigured ? "Leave blank to keep existing" : "Create an API Key in your Twilio Console"}
            disabled={saveConfig.isPending}
          />
          <SettingsInput
            label="API Key Secret"
            value={apiKeySecret}
            onChange={handleFieldChange(setApiKeySecret)}
            placeholder={config?.voiceConfigured ? "Enter new secret to update" : "Your API Key secret"}
            hint={config?.voiceConfigured ? "Leave blank to keep existing" : "Shown once when you create the API Key"}
            disabled={saveConfig.isPending}
          />
          <SettingsInput
            label="TwiML App SID"
            value={twimlAppSid}
            onChange={handleFieldChange(setTwimlAppSid)}
            placeholder={config?.voiceConfigured ? "Enter new SID to update" : "APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}
            hint={config?.voiceConfigured ? "Leave blank to keep existing" : "Create a TwiML App and point its Voice URL to your backend /api/call-center/voice"}
            disabled={saveConfig.isPending}
          />
        </div>
      </SettingsCard>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saveConfig.isPending || !hasChanges}
        className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background rounded-lg hover:bg-foreground/90 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saveConfig.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        {config?.configured ? "Update Configuration" : "Save Configuration"}
      </button>

      {/* Call Recording */}
      <SettingsCard
        title="Call Recording"
        description="Configure automatic call recording settings for your organization."
      >
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Auto-record all calls</p>
            <p className="text-xs text-muted-foreground">Automatically record all outbound and inbound calls</p>
          </div>
          <button
            onClick={() => {
              setAutoRecord(!autoRecord);
              setHasChanges(true);
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoRecord ? "bg-foreground" : "bg-border"
            }`}
            role="switch"
            aria-checked={autoRecord}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              autoRecord ? "translate-x-6" : "translate-x-1"
            }`} />
          </button>
        </div>
      </SettingsCard>

      {/* Call Dispositions */}
      <SettingsCard
        title="Call Status Options"
        description="Customize the status options shown after calls to track outcomes."
      >
        <DispositionEditor />
      </SettingsCard>
    </div>
  );
}

// ─── Settings Sub-components ───

function SettingsCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-5">{description}</p>
      {children}
    </div>
  );
}

function SettingsInput({
  label, value, onChange, placeholder, hint, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; hint?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono text-sm"
      />
      {hint && <p className="text-xs text-muted-foreground mt-2">{hint}</p>}
    </div>
  );
}

// ─── Disposition Editor (inline) ───

function DispositionEditor() {
  const [editing, setEditing] = useState<{ id?: string; label: string; color: string; isNew: boolean } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: dispositionsData, isLoading } = useDispositions();
  const createMutation = useCreateDisposition();
  const updateMutation = useUpdateDisposition();
  const deleteMutation = useDeleteDisposition();

  const dispositions: Disposition[] = dispositionsData?.data || [];

  const handleSave = async () => {
    if (!editing || !editing.label.trim()) return;
    try {
      if (editing.isNew) {
        await createMutation.mutateAsync({ label: editing.label.trim(), color: editing.color, sortOrder: dispositions.length });
      } else if (editing.id) {
        await updateMutation.mutateAsync({ id: editing.id, label: editing.label.trim(), color: editing.color });
      }
      setEditing(null);
    } catch {
      // handled in hook
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      setDeleteConfirm(null);
    } catch {
      // handled in hook
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Status Options</h3>
        <button
          onClick={() => setEditing({ label: "", color: PRESET_COLORS[0], isNew: true })}
          disabled={!!editing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-foreground text-background rounded-lg hover:bg-foreground/90 transition disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      <div className="space-y-2">
        {dispositions.map((d) => (
          <div key={d.id}>
            {editing?.id === d.id ? (
              <EditForm editing={editing} setEditing={setEditing} onSave={handleSave} isSaving={isSaving} />
            ) : deleteConfirm === d.id ? (
              <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-sm">Delete &quot;{d.label}&quot;?</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition">Cancel</button>
                  <button
                    onClick={() => handleDelete(d.id)}
                    disabled={deleteMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:bg-muted/30 transition group">
                <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: d.color || "#6b7280" }} />
                <span className="flex-1 text-sm font-medium">{d.label}</span>
                {d.isDefault && <span className="text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded">Default</span>}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => setEditing({ id: d.id, label: d.label, color: d.color || PRESET_COLORS[0], isNew: false })}
                    disabled={!!editing}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(d.id)}
                    disabled={!!editing || d.isDefault}
                    className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded transition disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {editing?.isNew && (
          <EditForm editing={editing} setEditing={setEditing} onSave={handleSave} isSaving={isSaving} isNew />
        )}

        {dispositions.length === 0 && !editing && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No call status options configured. Add one to get started.
          </div>
        )}
      </div>
    </div>
  );
}

function EditForm({
  editing,
  setEditing,
  onSave,
  isSaving,
  isNew,
}: {
  editing: { id?: string; label: string; color: string; isNew: boolean };
  setEditing: (v: any) => void;
  onSave: () => void;
  isSaving: boolean;
  isNew?: boolean;
}) {
  return (
    <div className={`p-3 bg-muted/50 border ${isNew ? "border-dashed" : ""} border-border rounded-lg space-y-3`}>
      <input
        type="text"
        value={editing.label}
        onChange={(e) => setEditing({ ...editing, label: e.target.value })}
        placeholder={isNew ? "New status label" : "Status label"}
        className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
        autoFocus
      />
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Color:</span>
        <div className="flex gap-1.5">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setEditing({ ...editing, color })}
              className={`w-6 h-6 rounded-full transition ${
                editing.color === color ? "ring-2 ring-offset-2 ring-offset-background ring-foreground" : ""
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition">
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={isSaving || !editing.label.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-foreground text-background rounded-lg hover:bg-foreground/90 transition disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {isNew ? "Create" : "Save"}
        </button>
      </div>
    </div>
  );
}
