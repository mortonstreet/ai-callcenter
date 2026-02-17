"use client";

import { useState } from "react";
import { Phone, CalendarClock, Users, Zap, LucideIcon } from "lucide-react";

type TranscriptLine = { speaker: string; text: string };
type FlowStep = { day: string; channel: string; action: string };
type HandoffScenario = { trigger: string; action: string };
type SyncItem = { label: string; status: string };

type CallDemo = { type: "call"; transcript: TranscriptLine[] };
type FlowDemo = { type: "flow"; steps: FlowStep[] };
type HandoffDemo = { type: "handoff"; scenarios: HandoffScenario[] };
type SyncDemo = { type: "sync"; items: SyncItem[] };

type Demo = CallDemo | FlowDemo | HandoffDemo | SyncDemo;

type Feature = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  demo: Demo;
};

const features: Feature[] = [
  {
    id: "inbound",
    title: "Inbound Handling",
    description: "AI answers calls instantly, qualifies leads, and books appointments 24/7",
    icon: Phone,
    demo: {
      type: "call",
      transcript: [
        { speaker: "Caller", text: "Hi, my AC stopped working and it's really hot..." },
        { speaker: "AI", text: "I'm sorry to hear that! Let me help you right away. Can I get your address to check our availability?" },
        { speaker: "Caller", text: "Sure, it's 123 Main Street" },
        { speaker: "AI", text: "I have a technician available today at 2 PM. Should I book that for you?" },
      ],
    },
  },
  {
    id: "drip",
    title: "Drip Campaigns",
    description: "Automated outbound sequences via voice, SMS, and email",
    icon: CalendarClock,
    demo: {
      type: "flow",
      steps: [
        { day: "Day 0", channel: "SMS", action: "Initial outreach" },
        { day: "Day 2", channel: "Email", action: "Follow-up offer" },
        { day: "Day 5", channel: "Voice", action: "Personal call" },
        { day: "Result", channel: "", action: "Job booked" },
      ],
    },
  },
  {
    id: "human",
    title: "Human in Loop",
    description: "Seamless handoff to your team when complex situations arise",
    icon: Users,
    demo: {
      type: "handoff",
      scenarios: [
        { trigger: "Complex pricing question", action: "Transfer to sales" },
        { trigger: "Angry customer", action: "Escalate to manager" },
        { trigger: "Emergency request", action: "Priority dispatch" },
      ],
    },
  },
  {
    id: "fsm",
    title: "FSM Sync",
    description: "Real-time integration with ServiceTitan, FieldPulse, and more",
    icon: Zap,
    demo: {
      type: "sync",
      items: [
        { label: "Customer data", status: "synced" },
        { label: "Appointments", status: "synced" },
        { label: "Technician schedule", status: "synced" },
        { label: "Job history", status: "synced" },
      ],
    },
  },
];

export default function FeatureShowcase() {
  const [activeFeature, setActiveFeature] = useState<Feature>(features[0]);

  return (
    <section className="py-16 sm:py-20 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Left side - Demo */}
          <div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-normal mb-3 sm:mb-4 tracking-tight heading-serif">
              {activeFeature.title}
            </h2>
            <p className="text-gray-600 text-base sm:text-lg mb-6 sm:mb-8">
              {activeFeature.description}
            </p>

            {/* Demo content */}
            <div className="bg-[#1a1a2e] rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-4 sm:p-6">
                {activeFeature.demo.type === "call" && (
                  <div className="space-y-2 sm:space-y-3">
                    {activeFeature.demo.transcript.map((line, i) => (
                      <div key={i} className={`flex gap-2 sm:gap-3 ${line.speaker === "AI" ? "flex-row-reverse" : ""}`}>
                        <div className={`max-w-[90%] sm:max-w-[80%] rounded-lg p-2.5 sm:p-3 text-xs sm:text-sm ${
                          line.speaker === "AI"
                            ? "bg-[#1b191a] text-white ml-auto"
                            : "bg-gray-700/50 text-gray-300"
                        }`}>
                          <div className="text-[10px] text-gray-400 mb-1">{line.speaker}</div>
                          {line.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeFeature.demo.type === "flow" && (
                  <div className="space-y-2 sm:space-y-3">
                    {activeFeature.demo.steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-2 sm:gap-3">
                        <div className={`w-14 sm:w-16 text-[10px] sm:text-xs font-medium flex-shrink-0 ${
                          step.day === "Result" ? "text-green-400" : "text-gray-400"
                        }`}>
                          {step.day}
                        </div>
                        {step.channel && (
                          <span className={`text-[10px] px-2 py-0.5 rounded font-medium flex-shrink-0 ${
                            step.channel === "SMS" ? "bg-blue-500/20 text-blue-400" :
                            step.channel === "Email" ? "bg-purple-500/20 text-purple-400" :
                            "bg-green-500/20 text-green-400"
                          }`}>
                            {step.channel}
                          </span>
                        )}
                        <span className="text-gray-300 text-xs sm:text-sm">{step.action}</span>
                        {step.day === "Result" && (
                          <svg className="w-4 h-4 text-green-400 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {activeFeature.demo.type === "handoff" && (
                  <div className="space-y-2 sm:space-y-3">
                    {activeFeature.demo.scenarios.map((scenario, i) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 rounded-lg bg-gray-700/30">
                        <span className="text-gray-300 text-xs sm:text-sm">{scenario.trigger}</span>
                        <span className="text-[10px] px-2 py-1 bg-orange-500/20 text-orange-400 rounded font-medium self-start sm:self-auto flex-shrink-0">
                          {scenario.action}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {activeFeature.demo.type === "sync" && (
                  <div className="space-y-3">
                    {activeFeature.demo.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30">
                        <span className="text-gray-300 text-sm">{item.label}</span>
                        <span className="flex items-center gap-1.5 text-[10px] text-green-400">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                          Synced
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right side - Feature cards */}
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4 lg:space-y-6 lg:gap-0">
            {features.map((feature) => (
              <button
                key={feature.id}
                onClick={() => setActiveFeature(feature)}
                className={`w-full text-left p-4 sm:p-6 rounded-xl sm:rounded-2xl border transition-all duration-300 ${
                  activeFeature.id === feature.id
                    ? "border-[#1b191a] bg-[#1b191a]/5 shadow-lg"
                    : "border-gray-100 hover:border-gray-200 hover:shadow-md bg-white"
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${
                    activeFeature.id === feature.id
                      ? "bg-[#1b191a] text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    <feature.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base sm:text-lg mb-0.5 sm:mb-1">{feature.title}</h3>
                    <p className="text-gray-600 text-xs sm:text-sm line-clamp-2">{feature.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
