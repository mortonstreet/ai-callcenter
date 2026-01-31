"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import {
  useCallCenterStatus,
  useVoiceToken,
} from "@/hooks/api/useCallCenter";
import { env } from "@/lib/config";
import type { Device, Call } from "@twilio/voice-sdk";

// ─── Types ───

type DeviceStatus = "offline" | "registering" | "ready" | "error";

interface DialerContextValue {
  device: Device | null;
  deviceStatus: DeviceStatus;
  deviceError: string | null;
  incomingCall: Call | null;
  inboundCallStatus: "idle" | "ringing" | "connected";
  inboundCallDuration: number;
  inboundMuted: boolean;
  answerIncomingCall: () => void;
  rejectIncomingCall: () => void;
  endInboundCall: () => void;
  toggleInboundMute: () => void;
  sendInboundDigit: (digit: string) => void;
}

const DialerContext = createContext<DialerContextValue | null>(null);

export function useDialerContext() {
  const ctx = useContext(DialerContext);
  if (!ctx) {
    throw new Error("useDialerContext must be used within <DialerProvider>");
  }
  return ctx;
}

// ─── Provider ───

export function DialerProvider({ children }: { children: ReactNode }) {
  const { data: statusData } = useCallCenterStatus();
  const isVoiceConfigured = statusData?.voiceConfigured ?? false;
  const { data: tokenData } = useVoiceToken(isVoiceConfigured);

  const deviceRef = useRef<Device | null>(null);
  const incomingCallRef = useRef<Call | null>(null);

  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>("offline");
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [inboundCallStatus, setInboundCallStatus] = useState<"idle" | "ringing" | "connected">("idle");
  const [inboundCallDuration, setInboundCallDuration] = useState(0);
  const [inboundMuted, setInboundMuted] = useState(false);

  // Initialize Twilio Device
  useEffect(() => {
    if (!tokenData?.token || typeof window === "undefined") return;

    const initDevice = async () => {
      try {
        const { Device } = await import("@twilio/voice-sdk");
        setDeviceStatus("registering");
        console.log("[Dialer] Initializing Twilio Device with identity:", tokenData.identity);

        if (deviceRef.current) {
          deviceRef.current.destroy();
        }

        const device = new Device(tokenData.token, {
          logLevel: 1,
          codecPreferences: ["opus", "pcmu"] as any,
        });

        device.on("registered", () => {
          console.log("[Dialer] Device registered - ready for incoming calls");
          setDeviceStatus("ready");
          setDeviceError(null);
        });

        device.on("unregistered", () => {
          console.log("[Dialer] Device unregistered");
          setDeviceStatus("offline");
        });

        device.on("error", (error: any) => {
          console.error("[Dialer] Device error:", error);
          setDeviceStatus("error");
          setDeviceError(error.message || "Device error");
        });

        device.on("tokenWillExpire", async () => {
          console.log("[Dialer] Token expiring, refreshing...");
          try {
            const resp = await fetch(`${env.API_URL.toString()}/call-center/token`, {
              credentials: "include",
            });
            const data = await resp.json();
            if (data?.token) {
              device.updateToken(data.token);
              console.log("[Dialer] Token refreshed");
            }
          } catch (err) {
            console.error("[Dialer] Failed to refresh token:", err);
          }
        });

        device.on("incoming", (call: Call) => {
          console.log("[Dialer] Incoming call from:", call.parameters?.From, "CallSid:", call.parameters?.CallSid);
          setIncomingCall(call);
          incomingCallRef.current = call;
          setInboundCallStatus("ringing");

          call.on("accept", () => {
            console.log("[Dialer] Inbound call accepted");
            setInboundCallStatus("connected");
            setInboundCallDuration(0);
          });

          call.on("disconnect", () => {
            console.log("[Dialer] Inbound call disconnected");
            setIncomingCall(null);
            incomingCallRef.current = null;
            setInboundCallStatus("idle");
            setInboundCallDuration(0);
            setInboundMuted(false);
          });

          call.on("cancel", () => {
            console.log("[Dialer] Inbound call cancelled (caller hung up)");
            setIncomingCall(null);
            incomingCallRef.current = null;
            setInboundCallStatus("idle");
          });

          call.on("reject", () => {
            console.log("[Dialer] Inbound call rejected");
            setIncomingCall(null);
            incomingCallRef.current = null;
            setInboundCallStatus("idle");
          });
        });

        await device.register();
        deviceRef.current = device;
        console.log("[Dialer] Device.register() completed");
      } catch (error: any) {
        console.error("[Dialer] Device init failed:", error);
        setDeviceStatus("error");
        setDeviceError(error.message || "Failed to initialize");
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

  // Inbound call timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (inboundCallStatus === "connected") {
      interval = setInterval(() => setInboundCallDuration((prev) => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [inboundCallStatus]);

  // ─── Inbound Call Actions ───

  const answerIncomingCall = useCallback(() => {
    if (incomingCallRef.current) {
      incomingCallRef.current.accept();
    }
  }, []);

  const rejectIncomingCall = useCallback(() => {
    if (incomingCallRef.current) {
      incomingCallRef.current.reject();
    }
  }, []);

  const endInboundCall = useCallback(() => {
    if (incomingCallRef.current) {
      incomingCallRef.current.disconnect();
    }
  }, []);

  const toggleInboundMute = useCallback(() => {
    if (incomingCallRef.current) {
      const newMute = !inboundMuted;
      incomingCallRef.current.mute(newMute);
      setInboundMuted(newMute);
    }
  }, [inboundMuted]);

  const sendInboundDigit = useCallback((digit: string) => {
    if (incomingCallRef.current) {
      incomingCallRef.current.sendDigits(digit);
    }
  }, []);

  const value: DialerContextValue = {
    device: deviceRef.current,
    deviceStatus,
    deviceError,
    incomingCall,
    inboundCallStatus,
    inboundCallDuration,
    inboundMuted,
    answerIncomingCall,
    rejectIncomingCall,
    endInboundCall,
    toggleInboundMute,
    sendInboundDigit,
  };

  return (
    <DialerContext.Provider value={value}>
      {children}
    </DialerContext.Provider>
  );
}
