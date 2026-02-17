"use client";

import { useDialerContext } from "@/components/providers/DialerProvider";
import { usePathname, useRouter } from "next/navigation";
import { Phone, PhoneOff } from "lucide-react";

export function GlobalIncomingCallBanner() {
  const {
    incomingCall,
    inboundCallStatus,
    inboundCallDuration,
    answerIncomingCall,
    rejectIncomingCall,
    endInboundCall,
  } = useDialerContext();
  const pathname = usePathname();
  const router = useRouter();

  // Hide on call-center page — it has its own inline UI
  if (pathname === "/dashboard/admin/call-center") return null;

  // Nothing to show
  if (!incomingCall && inboundCallStatus === "idle") return null;

  const callerNumber = incomingCall?.parameters?.From || "Unknown";

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="mx-4 md:mx-6 mt-3 p-3 bg-green-50 border-2 border-green-300 rounded-xl flex items-center justify-between animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
          <Phone className={`w-5 h-5 text-green-600 ${inboundCallStatus === "ringing" ? "animate-bounce" : ""}`} />
        </div>
        <div>
          <p className="text-sm font-semibold text-green-800">
            {inboundCallStatus === "connected" ? "Call In Progress" : "Incoming Call"}
          </p>
          <p className="text-xs font-mono text-green-700">
            {callerNumber}
            {inboundCallStatus === "connected" && (
              <span className="ml-2">{formatDuration(inboundCallDuration)}</span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {inboundCallStatus === "ringing" && (
          <>
            <button
              onClick={rejectIncomingCall}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition text-sm font-medium"
            >
              Decline
            </button>
            <button
              onClick={() => {
                answerIncomingCall();
                router.push("/dashboard/admin/call-center");
              }}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition text-sm font-medium"
            >
              Answer
            </button>
          </>
        )}
        {inboundCallStatus === "connected" && (
          <>
            <button
              onClick={() => router.push("/dashboard/admin/call-center")}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm font-medium"
            >
              Open
            </button>
            <button
              onClick={endInboundCall}
              className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
