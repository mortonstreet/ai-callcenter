"use client";

import { useState, useEffect } from "react";
import {
  Phone, PhoneOff, Mic,
  Play, Pause, CheckCircle2, MessageSquare,
  BarChart3, TrendingUp, Headphones,
  Bot, Zap, UserCheck, AlertCircle,
  CalendarClock, Truck, MapPin, Settings
} from "lucide-react";

// ============================================
// AGENTS PREVIEW WIDGET
// ============================================

// Mini AI Agent handling calls
function AgentCallPreview() {
  const [callState, setCallState] = useState<"idle" | "ringing" | "connected" | "booking" | "ended">("idle");
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const cycle = async () => {
      setCallState("idle");
      setDuration(0);
      await new Promise(r => setTimeout(r, 1500));

      setCallState("ringing");
      await new Promise(r => setTimeout(r, 2000));

      setCallState("connected");
      let d = 0;
      const timer = setInterval(() => {
        d++;
        setDuration(d);
      }, 1000);

      await new Promise(r => setTimeout(r, 4000));
      clearInterval(timer);

      setCallState("booking");
      await new Promise(r => setTimeout(r, 2000));

      setCallState("ended");
      await new Promise(r => setTimeout(r, 2000));
    };

    cycle();
    const interval = setInterval(cycle, 14000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Bot className="w-4 h-4 text-[#1b191a]" />
          <span className="text-gray-500 font-medium">AI Agent</span>
        </div>
        <div className="flex items-center gap-1.5 text-green-600">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          Active
        </div>
      </div>

      {/* Caller info */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
          callState === "connected" || callState === "booking" ? "bg-[#1b191a] text-white" : "bg-gray-100 text-gray-700"
        }`}>
          MJ
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 text-sm">Michael Johnson</div>
          <div className="text-xs text-gray-500">+1 (555) 123-4567</div>
        </div>
      </div>

      {/* Call status */}
      <div className="text-center py-2">
        <div className={`text-3xl font-mono transition-colors ${
          callState === "connected" || callState === "booking" ? "text-[#1b191a]" : "text-gray-400"
        }`}>
          {callState === "idle" && "--:--"}
          {callState === "ringing" && (
            <span className="text-amber-500 animate-pulse text-2xl">Incoming...</span>
          )}
          {(callState === "connected" || callState === "booking") && formatTime(duration)}
          {callState === "ended" && formatTime(duration)}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {callState === "booking" && (
            <span className="text-green-600 font-medium">Booking appointment...</span>
          )}
          {callState === "ended" && (
            <span className="text-green-600 font-medium">Appointment booked</span>
          )}
          {callState === "connected" && "Call in progress"}
          {callState === "ringing" && "AI answering"}
          {callState === "idle" && "Waiting for call"}
        </div>
      </div>

      {/* Controls - decorative demo buttons */}
      <div className="flex items-center justify-center gap-3" role="presentation" aria-hidden="true">
        <div className={`p-3 rounded-lg transition-colors ${
          callState === "connected" || callState === "booking"
            ? "bg-gray-100 text-gray-700"
            : "bg-gray-50 text-gray-300"
        }`}>
          <Mic className="w-4 h-4" />
        </div>
        <div className={`p-4 rounded-xl transition-all ${
          callState === "connected" || callState === "booking"
            ? "bg-red-500 text-white"
            : callState === "ringing"
            ? "bg-green-500 text-white animate-pulse"
            : "bg-[#1b191a] text-white"
        }`}>
          {callState === "connected" || callState === "booking" ? (
            <PhoneOff className="w-5 h-5" />
          ) : (
            <Phone className="w-5 h-5" />
          )}
        </div>
        <div className={`p-3 rounded-lg transition-colors ${
          callState === "connected" || callState === "booking"
            ? "bg-gray-100 text-gray-700"
            : "bg-gray-50 text-gray-300"
        }`}>
          <UserCheck className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

// Static transcript data
const TRANSCRIPT_DATA = [
  { speaker: "Caller", text: "Hi, my AC isn't cooling properly and it's really hot..." },
  { speaker: "AI", text: "I'm sorry to hear that! Let me help you right away. Can I get your address?" },
  { speaker: "Caller", text: "Sure, it's 456 Oak Avenue" },
  { speaker: "AI", text: "I have a technician available today at 3 PM. Should I book that for you?" },
  { speaker: "Caller", text: "Yes, that works perfectly!" },
];

// Conversation transcript preview
function TranscriptPreview() {
  const [messages, setMessages] = useState<{speaker: string; text: string; visible: boolean}[]>([]);

  useEffect(() => {
    let currentIndex = 0;
    setMessages([]);

    const addMessage = () => {
      if (currentIndex < TRANSCRIPT_DATA.length) {
        setMessages(prev => [...prev, { ...TRANSCRIPT_DATA[currentIndex], visible: true }]);
        currentIndex++;
      } else {
        // Reset after delay
        setTimeout(() => {
          currentIndex = 0;
          setMessages([]);
        }, 3000);
      }
    };

    addMessage();
    const interval = setInterval(addMessage, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">Live Transcript</span>
        <div className="flex items-center gap-1.5 text-xs text-green-600">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          Recording
        </div>
      </div>

      <div className="space-y-2 min-h-[180px] max-h-[180px] overflow-hidden">
        {messages.slice(-4).map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 transition-all duration-300 ${
              msg.speaker === "AI" ? "flex-row-reverse" : ""
            }`}
          >
            <div className={`max-w-[85%] rounded-lg p-2.5 text-xs ${
              msg.speaker === "AI"
                ? "bg-[#1b191a] text-white ml-auto"
                : "bg-gray-100 text-gray-700"
            }`}>
              <div className={`text-[10px] mb-1 ${msg.speaker === "AI" ? "text-gray-400" : "text-gray-500"}`}>
                {msg.speaker}
              </div>
              {msg.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Agent stats preview
function AgentStatsPreview() {
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    const cycle = async () => {
      setShowNotif(false);
      await new Promise(r => setTimeout(r, 5000));
      setShowNotif(true);
      await new Promise(r => setTimeout(r, 3000));
    };
    cycle();
    const interval = setInterval(cycle, 9000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">Today&apos;s Performance</span>
        <BarChart3 className="w-3.5 h-3.5 text-gray-400" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <div className="text-xs text-gray-500">Calls Handled</div>
          <div className="text-xl font-semibold text-gray-900">89</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <div className="text-xs text-gray-500">Book Rate</div>
          <div className="text-xl font-semibold text-green-600">42%</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <div className="text-xs text-gray-500">Avg Duration</div>
          <div className="text-xl font-semibold text-gray-900">3:24</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <div className="text-xs text-gray-500">Jobs Booked</div>
          <div className="text-xl font-semibold text-[#1b191a]">37</div>
        </div>
      </div>

      {/* ServiceTitan notification */}
      <div className={`transition-all duration-500 overflow-hidden ${showNotif ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 flex items-center gap-2">
          <Zap className="w-4 h-4 text-orange-500" />
          <span className="text-[10px] text-orange-700 font-medium">New job synced to ServiceTitan</span>
        </div>
      </div>
    </div>
  );
}

export function AgentsPreviewWidget() {
  return (
    <section className="py-16 md:py-24 bg-gray-50 overflow-hidden" aria-labelledby="agents-preview-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 id="agents-preview-heading" className="text-2xl sm:text-3xl md:text-4xl font-normal mb-4 tracking-tight text-gray-900 heading-serif">
            See it in action
          </h2>
          <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto">
            A glimpse of the RevCenter experience. AI agents handling calls, qualifying leads, and booking jobs 24/7.
          </p>
        </div>

        {/* App preview mockup */}
        <div className="relative">
          {/* Browser chrome mockup */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xl">
            {/* Window controls */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 bg-gray-100 rounded-md text-xs text-gray-500">
                  app.revcenter.ai/agents
                </div>
              </div>
              <div className="w-12" />
            </div>

            {/* App content */}
            <div className="p-4 sm:p-6">
              {/* App header */}
              <div className="flex items-center justify-between mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-100">
                <img src="/revcenter-logo.svg" alt="RevCenter" className="h-4 sm:h-5" />
                <div className="hidden sm:flex items-center gap-2">
                  <button className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors">
                    Dashboard
                  </button>
                  <button className="px-3 py-1.5 text-xs bg-[#1b191a] text-white rounded-md">
                    Agents
                  </button>
                  <button className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors">
                    Dispatch
                  </button>
                </div>
                {/* Mobile: simplified indicator */}
                <div className="sm:hidden px-2 py-1 text-[10px] bg-[#1b191a] text-white rounded">
                  Agents
                </div>
              </div>

              {/* App layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="sm:col-span-1">
                  <AgentCallPreview />
                </div>
                <div className="sm:col-span-1">
                  <TranscriptPreview />
                </div>
                <div className="sm:col-span-2 md:col-span-1">
                  <AgentStatsPreview />
                </div>
              </div>
            </div>
          </div>

          {/* Decorative elements - hidden on mobile to prevent overflow */}
          <div className="hidden sm:block absolute -top-20 -right-20 w-40 h-40 bg-blue-100 rounded-full blur-3xl pointer-events-none opacity-60" />
          <div className="hidden sm:block absolute -bottom-20 -left-20 w-40 h-40 bg-green-100 rounded-full blur-3xl pointer-events-none opacity-60" />
        </div>
      </div>
    </section>
  );
}

// ============================================
// DISPATCH SCHEDULER PREVIEW WIDGET
// ============================================

// Schedule grid preview
function ScheduleGridPreview() {
  const [slots, setSlots] = useState([
    { time: "9:00 AM", tech: "Mike R.", job: "AC Repair", status: "completed", address: "123 Main St" },
    { time: "11:00 AM", tech: "Mike R.", job: "Maintenance", status: "in-progress", address: "456 Oak Ave" },
    { time: "2:00 PM", tech: "Mike R.", job: "Installation", status: "scheduled", address: "789 Pine Rd" },
    { time: "4:00 PM", tech: "Mike R.", job: null, status: "available", address: null },
  ]);

  const [animatingSlot, setAnimatingSlot] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setSlots(prev => {
        const newSlots = [...prev];
        const availableIdx = newSlots.findIndex(s => s.status === "available");
        if (availableIdx !== -1) {
          setAnimatingSlot(availableIdx);
          newSlots[availableIdx] = {
            ...newSlots[availableIdx],
            job: "Emergency Call",
            status: "scheduled",
            address: "321 Elm St"
          };
          setTimeout(() => setAnimatingSlot(null), 1000);
        }
        return newSlots;
      });
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-50 border-green-200 text-green-700";
      case "in-progress": return "bg-blue-50 border-blue-200 text-blue-700";
      case "scheduled": return "bg-amber-50 border-amber-200 text-amber-700";
      default: return "bg-gray-50 border-gray-200 text-gray-500";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 shadow-sm flex-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">Today&apos;s Schedule</span>
        <span className="text-xs text-gray-400">Mike Rodriguez</span>
      </div>

      <div className="space-y-2">
        {slots.map((slot, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg border transition-all duration-500 ${getStatusStyle(slot.status)} ${
              animatingSlot === i ? "ring-2 ring-green-400 ring-offset-1" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold">{slot.time}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                slot.status === "completed" ? "bg-green-100 text-green-700" :
                slot.status === "in-progress" ? "bg-blue-100 text-blue-700" :
                slot.status === "scheduled" ? "bg-amber-100 text-amber-700" :
                "bg-gray-100 text-gray-500"
              }`}>
                {slot.status === "in-progress" ? "In Progress" :
                 slot.status.charAt(0).toUpperCase() + slot.status.slice(1)}
              </span>
            </div>
            {slot.job ? (
              <>
                <div className="text-sm font-medium text-gray-900">{slot.job}</div>
                <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  {slot.address}
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-400 italic">Available slot</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Auto-dispatch animation
function AutoDispatchPreview() {
  const [step, setStep] = useState<"incoming" | "matching" | "assigned" | "confirmed">("incoming");

  useEffect(() => {
    const runAnimation = async () => {
      setStep("incoming");
      await new Promise(r => setTimeout(r, 2000));
      setStep("matching");
      await new Promise(r => setTimeout(r, 2000));
      setStep("assigned");
      await new Promise(r => setTimeout(r, 2000));
      setStep("confirmed");
      await new Promise(r => setTimeout(r, 3000));
    };

    runAnimation();
    const interval = setInterval(runAnimation, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 font-medium">Auto-Dispatch</span>
        {step === "confirmed" && (
          <div className="flex items-center gap-1.5 text-green-600">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Complete
          </div>
        )}
      </div>

      {step === "incoming" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Phone className="w-5 h-5 text-amber-600 animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">New Job Request</div>
              <div className="text-xs text-gray-500">AC not cooling - Emergency</div>
            </div>
          </div>
          <div className="text-center text-xs text-gray-400">Processing...</div>
        </div>
      )}

      {step === "matching" && (
        <div className="space-y-3">
          <div className="text-sm text-gray-600 text-center">Finding best technician...</div>
          <div className="space-y-2">
            {["Mike R.", "Sarah T.", "John D."].map((tech, i) => (
              <div key={i} className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                i === 0 ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-100 opacity-50"
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  i === 0 ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"
                }`}>
                  {tech.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-medium text-gray-900">{tech}</div>
                  <div className="text-[10px] text-gray-500">{i === 0 ? "Best match - 2mi away" : "Available"}</div>
                </div>
                {i === 0 && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {step === "assigned" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Mike Rodriguez</div>
              <div className="text-xs text-gray-500">Assigned - Notifying...</div>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      )}

      {step === "confirmed" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Job Scheduled</div>
              <div className="text-xs text-gray-500">Mike R. - Today 4:00 PM</div>
            </div>
          </div>
          <div className="text-center">
            <span className="text-[10px] px-2 py-1 bg-green-100 text-green-700 rounded-full">
              Auto-dispatched in 8 seconds
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Dispatch stats
function DispatchStatsPreview() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">Dispatch Overview</span>
        <Settings className="w-3.5 h-3.5 text-gray-400" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Technicians Active</span>
          <span className="text-xl font-semibold text-gray-900">8</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Jobs Today</span>
          <span className="text-xl font-semibold text-gray-900">34</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Avg Response</span>
          <span className="text-xl font-semibold text-green-600">12s</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Fill Rate</span>
          <span className="text-xl font-semibold text-[#1b191a]">94%</span>
        </div>
      </div>
    </div>
  );
}

export function DispatchSchedulerPreviewWidget() {
  return (
    <section className="py-16 md:py-24 bg-white overflow-hidden" aria-labelledby="dispatch-preview-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 id="dispatch-preview-heading" className="text-2xl sm:text-3xl md:text-4xl font-normal mb-4 tracking-tight text-gray-900 heading-serif">
            Intelligent dispatch
          </h2>
          <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto">
            Auto-assign jobs to the right technician based on location, skills, and availability. No manual scheduling needed.
          </p>
        </div>

        {/* App preview mockup */}
        <div className="relative">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xl">
            {/* Window controls */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 bg-gray-100 rounded-md text-xs text-gray-500">
                  app.revcenter.ai/dispatch
                </div>
              </div>
              <div className="w-12" />
            </div>

            {/* App content */}
            <div className="p-4 sm:p-6">
              {/* App header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <img src="/revcenter-logo.svg" alt="RevCenter" className="h-5" />
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors">
                    Dashboard
                  </button>
                  <button className="px-3 py-1.5 text-xs bg-[#1b191a] text-white rounded-md flex items-center gap-1.5">
                    <CalendarClock className="w-3 h-3" />
                    Dispatch
                  </button>
                  <button className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors">
                    Pipeline
                  </button>
                </div>
              </div>

              {/* App layout */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <ScheduleGridPreview />
                </div>
                <div className="md:col-span-1">
                  <AutoDispatchPreview />
                </div>
                <div className="md:col-span-1">
                  <DispatchStatsPreview />
                </div>
              </div>
            </div>
          </div>

          {/* Decorative elements - hidden on mobile to prevent overflow */}
          <div className="hidden sm:block absolute -top-20 -right-20 w-40 h-40 bg-amber-100 rounded-full blur-3xl pointer-events-none opacity-60" />
          <div className="hidden sm:block absolute -bottom-20 -left-20 w-40 h-40 bg-blue-100 rounded-full blur-3xl pointer-events-none opacity-60" />
        </div>
      </div>
    </section>
  );
}

// ============================================
// PIPELINE MANAGEMENT PREVIEW WIDGET
// ============================================

// Pipeline kanban preview
function PipelineKanbanPreview() {
  const [leads, setLeads] = useState([
    { id: 1, name: "Johnson Residence", value: "$2,400", stage: "new", service: "AC Repair" },
    { id: 2, name: "Smith Commercial", value: "$8,500", stage: "qualified", service: "HVAC Install" },
    { id: 3, name: "Davis Family", value: "$1,200", stage: "quoted", service: "Maintenance" },
    { id: 4, name: "Wilson Office", value: "$4,800", stage: "won", service: "Ductwork" },
  ]);

  const [movingLead, setMovingLead] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setLeads(prev => {
        const newLead = prev.find(l => l.stage === "new");
        if (newLead) {
          setMovingLead(newLead.id);
          setTimeout(() => setMovingLead(null), 800);
          return prev.map(l =>
            l.id === newLead.id ? { ...l, stage: "qualified" } : l
          );
        }
        return prev;
      });
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const stages = [
    { key: "new", label: "New", color: "bg-blue-500" },
    { key: "qualified", label: "Qualified", color: "bg-amber-500" },
    { key: "quoted", label: "Quoted", color: "bg-purple-500" },
    { key: "won", label: "Won", color: "bg-green-500" },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 space-y-3 shadow-sm md:col-span-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">Lead Pipeline</span>
        <span className="text-xs text-gray-400 hidden sm:inline">This Week</span>
      </div>

      {/* Mobile: horizontal scroll, Tablet+: grid */}
      <div className="flex sm:grid sm:grid-cols-4 gap-2 overflow-x-auto sm:overflow-x-visible pb-2 sm:pb-0 -mx-3 px-3 sm:mx-0 sm:px-0">
        {stages.map(stage => (
          <div key={stage.key} className="space-y-2 min-w-[120px] sm:min-w-0 flex-shrink-0 sm:flex-shrink">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className={`w-2 h-2 rounded-full ${stage.color}`} />
              <span className="text-[10px] font-medium text-gray-600 whitespace-nowrap">{stage.label}</span>
              <span className="text-[10px] text-gray-400">
                {leads.filter(l => l.stage === stage.key).length}
              </span>
            </div>
            <div className="space-y-1.5 min-h-[100px] sm:min-h-[120px]">
              {leads.filter(l => l.stage === stage.key).map(lead => (
                <div
                  key={lead.id}
                  className={`p-2 bg-gray-50 rounded-lg border border-gray-100 transition-all duration-500 ${
                    movingLead === lead.id ? "ring-2 ring-green-400 scale-105" : ""
                  }`}
                >
                  <div className="text-xs font-medium text-gray-900 truncate">{lead.name}</div>
                  <div className="text-[10px] text-gray-500">{lead.service}</div>
                  <div className="text-xs font-semibold text-gray-700 mt-1">{lead.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Pipeline stats
function PipelineStatsPreview() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">Pipeline Value</span>
        <TrendingUp className="w-3.5 h-3.5 text-green-500" />
      </div>

      <div className="text-center py-4">
        <div className="text-3xl font-bold text-gray-900">$47,200</div>
        <div className="text-xs text-green-600 mt-1">+23% from last week</div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">New Leads</span>
          <span className="font-semibold text-gray-900">12</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Conversion Rate</span>
          <span className="font-semibold text-green-600">34%</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Avg Deal Size</span>
          <span className="font-semibold text-gray-900">$3,800</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Won This Week</span>
          <span className="font-semibold text-[#1b191a]">8</span>
        </div>
      </div>
    </div>
  );
}

export function PipelineManagementPreviewWidget() {
  return (
    <section className="py-16 md:py-24 bg-gray-50 overflow-hidden" aria-labelledby="pipeline-preview-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 id="pipeline-preview-heading" className="text-2xl sm:text-3xl md:text-4xl font-normal mb-4 tracking-tight text-gray-900 heading-serif">
            Pipeline that converts
          </h2>
          <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto">
            Track every lead from first call to closed deal. AI-powered scoring helps you focus on high-value opportunities.
          </p>
        </div>

        {/* App preview mockup */}
        <div className="relative">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xl">
            {/* Window controls */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 bg-gray-100 rounded-md text-xs text-gray-500">
                  app.revcenter.ai/pipeline
                </div>
              </div>
              <div className="w-12" />
            </div>

            {/* App content */}
            <div className="p-4 sm:p-6">
              {/* App header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <img src="/revcenter-logo.svg" alt="RevCenter" className="h-5" />
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors">
                    Agents
                  </button>
                  <button className="px-3 py-1.5 text-xs bg-[#1b191a] text-white rounded-md">
                    Pipeline
                  </button>
                  <button className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors">
                    Recordings
                  </button>
                </div>
              </div>

              {/* App layout */}
              <div className="grid md:grid-cols-3 gap-4">
                <PipelineKanbanPreview />
                <div className="md:col-span-1">
                  <PipelineStatsPreview />
                </div>
              </div>
            </div>
          </div>

          {/* Decorative elements - hidden on mobile to prevent overflow */}
          <div className="hidden sm:block absolute -top-20 -right-20 w-40 h-40 bg-purple-100 rounded-full blur-3xl pointer-events-none opacity-60" />
          <div className="hidden sm:block absolute -bottom-20 -left-20 w-40 h-40 bg-green-100 rounded-full blur-3xl pointer-events-none opacity-60" />
        </div>
      </div>
    </section>
  );
}

// ============================================
// CSR RECORDINGS PREVIEW WIDGET
// ============================================

// Recordings list preview
function RecordingsListPreview() {
  const recordings = [
    { id: 1, caller: "Michael Johnson", duration: "3:24", score: 92, status: "booked", time: "2:34 PM" },
    { id: 2, caller: "Sarah Williams", duration: "5:12", score: 78, status: "callback", time: "1:15 PM" },
    { id: 3, caller: "Robert Chen", duration: "2:08", score: 45, status: "missed", time: "11:42 AM" },
    { id: 4, caller: "Emily Davis", duration: "4:56", score: 88, status: "booked", time: "10:20 AM" },
  ];

  const [playing, setPlaying] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaying(prev => {
        if (prev === null) return 1;
        if (prev === 1) return null;
        return null;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "booked": return "bg-green-100 text-green-700";
      case "callback": return "bg-amber-100 text-amber-700";
      case "missed": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 shadow-sm flex-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">Recent Calls</span>
        <span className="text-xs text-gray-400">Today</span>
      </div>

      <div className="space-y-2">
        {recordings.map((rec) => (
          <div
            key={rec.id}
            className={`p-3 rounded-lg border transition-all ${
              playing === rec.id ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  playing === rec.id ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"
                }`}
                aria-hidden="true"
              >
                {playing === rec.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 truncate">{rec.caller}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getStatusStyle(rec.status)}`}>
                    {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[10px] text-gray-500">{rec.duration}</span>
                  <span className="text-[10px] text-gray-400">{rec.time}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getScoreColor(rec.score)}`}>
                    Score: {rec.score}
                  </span>
                </div>
              </div>
            </div>
            {playing === rec.id && (
              <div className="mt-2 pt-2 border-t border-blue-100">
                <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full w-1/3 animate-pulse" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Call analysis preview
function CallAnalysisPreview() {
  const analysis = {
    sentiment: "positive",
    intent: "Service Request",
    urgency: "high",
    keywords: ["AC not cooling", "emergency", "available today"],
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 font-medium">AI Analysis</span>
        <div className="flex items-center gap-1.5 text-green-600">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          Analyzed
        </div>
      </div>

      <div className="space-y-3">
        {/* Sentiment */}
        <div className="p-3 bg-green-50 rounded-lg border border-green-100">
          <div className="text-[10px] text-green-600 font-medium mb-1">SENTIMENT</div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-green-700 capitalize">{analysis.sentiment}</div>
            <div className="flex-1 h-1.5 bg-green-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full w-4/5" />
            </div>
          </div>
        </div>

        {/* Intent & Urgency */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
            <div className="text-[10px] text-gray-500 font-medium">Intent</div>
            <div className="text-xs font-semibold text-gray-900">{analysis.intent}</div>
          </div>
          <div className="p-2 bg-red-50 rounded-lg border border-red-100">
            <div className="text-[10px] text-red-600 font-medium">Urgency</div>
            <div className="text-xs font-semibold text-red-700 capitalize">{analysis.urgency}</div>
          </div>
        </div>

        {/* Keywords */}
        <div>
          <div className="text-[10px] text-gray-500 font-medium mb-2">KEY PHRASES</div>
          <div className="flex flex-wrap gap-1">
            {analysis.keywords.map((keyword, i) => (
              <span key={i} className="text-[10px] px-2 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                {keyword}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Coaching insights
function CoachingInsightsPreview() {
  const insights = [
    { type: "success", text: "Great job acknowledging the customer's urgency" },
    { type: "tip", text: "Try mentioning same-day availability earlier" },
    { type: "success", text: "Effective upsell of maintenance plan" },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">Coaching Insights</span>
        <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
      </div>

      <div className="space-y-2">
        {insights.map((insight, i) => (
          <div
            key={i}
            className={`p-2.5 rounded-lg border ${
              insight.type === "success"
                ? "bg-green-50 border-green-100"
                : "bg-amber-50 border-amber-100"
            }`}
          >
            <div className="flex items-start gap-2">
              {insight.type === "success" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
              )}
              <span className={`text-xs ${
                insight.type === "success" ? "text-green-700" : "text-amber-700"
              }`}>
                {insight.text}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Overall Performance</span>
          <span className="font-semibold text-green-600">Excellent</span>
        </div>
      </div>
    </div>
  );
}

export function CSRRecordingsPreviewWidget() {
  return (
    <section className="py-16 md:py-24 bg-white overflow-hidden" aria-labelledby="recordings-preview-heading">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 id="recordings-preview-heading" className="text-2xl sm:text-3xl md:text-4xl font-normal mb-4 tracking-tight text-gray-900 heading-serif">
            Every call, analyzed
          </h2>
          <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto">
            AI-powered call analysis helps your team improve. Review recordings, get coaching insights, and track performance.
          </p>
        </div>

        {/* App preview mockup */}
        <div className="relative">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xl">
            {/* Window controls */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 bg-gray-100 rounded-md text-xs text-gray-500">
                  app.revcenter.ai/recordings
                </div>
              </div>
              <div className="w-12" />
            </div>

            {/* App content */}
            <div className="p-4 sm:p-6">
              {/* App header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <img src="/revcenter-logo.svg" alt="RevCenter" className="h-5" />
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors">
                    Pipeline
                  </button>
                  <button className="px-3 py-1.5 text-xs bg-[#1b191a] text-white rounded-md flex items-center gap-1.5">
                    <Headphones className="w-3 h-3" />
                    Recordings
                  </button>
                  <button className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors">
                    Analytics
                  </button>
                </div>
              </div>

              {/* App layout */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <RecordingsListPreview />
                </div>
                <div className="md:col-span-1">
                  <CallAnalysisPreview />
                </div>
                <div className="md:col-span-1">
                  <CoachingInsightsPreview />
                </div>
              </div>
            </div>
          </div>

          {/* Decorative elements - hidden on mobile to prevent overflow */}
          <div className="hidden sm:block absolute -top-20 -right-20 w-40 h-40 bg-pink-100 rounded-full blur-3xl pointer-events-none opacity-60" />
          <div className="hidden sm:block absolute -bottom-20 -left-20 w-40 h-40 bg-purple-100 rounded-full blur-3xl pointer-events-none opacity-60" />
        </div>
      </div>
    </section>
  );
}
