"use client";

import { ScrollReveal } from "@/components/landing";
import {
  Phone,
  Bot,
  Zap,
  CheckCircle2,
  TrendingUp,
  Clock,
  Globe,
  Users,
  Shield,
} from "lucide-react";
import { useState, useEffect } from "react";

// Mini product preview widget for hero
function HeroProductPreview() {
  const [callState, setCallState] = useState<"ringing" | "connected" | "booking">("ringing");
  const [messages, setMessages] = useState<{ speaker: string; text: string }[]>([]);

  useEffect(() => {
    const runDemo = async () => {
      setCallState("ringing");
      setMessages([]);
      await new Promise((r) => setTimeout(r, 1500));

      setCallState("connected");
      await new Promise((r) => setTimeout(r, 800));

      setMessages([{ speaker: "Caller", text: "Hi, my AC stopped working..." }]);
      await new Promise((r) => setTimeout(r, 1500));

      setMessages((prev) => [
        ...prev,
        { speaker: "AI", text: "I can help! Let me check availability..." },
      ]);
      await new Promise((r) => setTimeout(r, 1500));

      setCallState("booking");
      setMessages((prev) => [
        ...prev,
        { speaker: "AI", text: "I have a tech available at 2 PM today." },
      ]);
      await new Promise((r) => setTimeout(r, 2000));

      setMessages((prev) => [...prev, { speaker: "Caller", text: "Perfect, book it!" }]);
      await new Promise((r) => setTimeout(r, 2500));
    };

    runDemo();
    const interval = setInterval(runDemo, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#1a1a2e] rounded-xl p-4 shadow-2xl border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-white/70" />
          <span className="text-white/70 text-xs font-medium">AI Agent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              callState === "booking" ? "bg-green-400" : "bg-green-400 animate-pulse"
            }`}
          />
          <span className="text-green-400 text-xs">
            {callState === "ringing" ? "Answering..." : callState === "booking" ? "Booking" : "Live"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-2 min-h-[120px]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.speaker === "AI" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                msg.speaker === "AI" ? "bg-white/10 text-white" : "bg-white/5 text-white/80"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Status bar */}
      {callState === "booking" && (
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className="text-green-400 text-xs font-medium">Appointment booked</span>
        </div>
      )}
    </div>
  );
}

// Stats counter with animation
function AnimatedStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-4xl sm:text-5xl md:text-6xl font-light text-white mb-2">{value}</div>
      <div className="text-white/50 text-sm uppercase tracking-wider">{label}</div>
    </div>
  );
}

// Value card
function ValueCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="group">
      <div className="w-12 h-12 rounded-xl bg-[#1b191a] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-xl font-semibold mb-2 text-[#1b191a]">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="overflow-hidden">
      {/* Hero - Dark section inspired by Linear */}
      <section className="relative bg-[#0f0f0f] pt-20 pb-24 sm:pt-28 sm:pb-32 md:pt-36 md:pb-40 overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <ScrollReveal>
            <div className="text-center mb-16 sm:mb-20">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-white heading-serif leading-[1.1]">
                RevCenter is bringing
              </h1>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-white heading-serif leading-[1.1] mt-2">
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  revenue back
                </span>{" "}
                to field service
              </h1>
            </div>
          </ScrollReveal>

          {/* Product preview in hero */}
          <ScrollReveal delay={200}>
            <div className="max-w-md mx-auto">
              <HeroProductPreview />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Two-column story section inspired by Linear/Exa */}
      <section className="py-20 sm:py-28 md:py-36 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            {/* Left - Large heading */}
            <ScrollReveal>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-[#1b191a] heading-serif leading-[1.15] sticky top-24">
                We&apos;re building the AI call center for teams that care about
                <span className="italic"> every customer</span>
              </h2>
            </ScrollReveal>

            {/* Right - Story paragraphs */}
            <ScrollReveal delay={100}>
              <div className="space-y-6 text-gray-600 text-lg leading-relaxed">
                <p>
                  Field service businesses lose thousands of dollars every week to missed calls. A customer calls
                  after hours—no answer. They call during a busy morning—put on hold. They hang up and call
                  your competitor instead.
                </p>
                <p>
                  We built RevCenter because we saw this problem firsthand. HVAC companies, plumbers,
                  electricians—all losing revenue not because of poor service, but because they couldn&apos;t
                  answer the phone fast enough.
                </p>
                <p>
                  What started as a simple AI answering service has evolved into a{" "}
                  <strong className="text-[#1b191a]">complete revenue operations platform</strong>. We don&apos;t
                  just answer calls—we qualify leads, book appointments, sync with your FSM software, and help
                  your team close more jobs.
                </p>
                <p>
                  Today, RevCenter handles millions of calls for field service businesses across the country.
                  We&apos;re not building another call center tool. We&apos;re building a better way to capture
                  every dollar of revenue your business deserves.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* How we do it section with uppercase label like Exa */}
      <section className="py-20 sm:py-28 bg-[#fafafa]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-medium mb-4">
              How we do it
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-[#1b191a] heading-serif mb-16">
              AI that actually understands your business
            </h2>
          </ScrollReveal>

          {/* Feature blocks with imagery */}
          <div className="space-y-20 sm:space-y-28">
            {/* Feature 1 */}
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              <ScrollReveal>
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-[#1b191a] flex items-center justify-center">
                      <Phone className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-[#1b191a]">Instant Answer</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-light text-[#1b191a] heading-serif mb-4">
                    Every call answered in under 2 seconds
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    Our AI picks up instantly, 24/7, 365 days a year. No hold music. No voicemail. No missed
                    opportunities. Customers get immediate help, and you never lose a lead to a competitor.
                  </p>
                  <p className="text-gray-600 leading-relaxed">
                    The AI handles everything from simple questions to complex scheduling, speaking naturally in
                    30+ languages with mid-call switching support.
                  </p>
                </div>
              </ScrollReveal>
              <ScrollReveal delay={100}>
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-sm text-gray-500 font-medium">Live Call</span>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-green-600 text-xs font-medium">Connected</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium">
                        MJ
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                        My AC is making a loud noise and not cooling properly
                      </div>
                    </div>
                    <div className="flex gap-3 flex-row-reverse">
                      <div className="w-8 h-8 rounded-full bg-[#1b191a] flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 bg-[#1b191a] rounded-lg p-3 text-sm text-white">
                        I understand that&apos;s frustrating. I can get a technician to you today. What&apos;s your
                        address?
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* Feature 2 */}
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              <ScrollReveal className="lg:order-2">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-[#1b191a] flex items-center justify-center">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-[#1b191a]">FSM Integration</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-light text-[#1b191a] heading-serif mb-4">
                    Seamless sync with your existing tools
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    RevCenter integrates directly with ServiceTitan, FieldPulse, Housecall Pro, and 50+ other
                    platforms. Customer data, technician availability, and job details sync in real-time.
                  </p>
                  <p className="text-gray-600 leading-relaxed">
                    When the AI books an appointment, it&apos;s automatically in your dispatch system. No double
                    entry. No missed bookings. Everything just works.
                  </p>
                </div>
              </ScrollReveal>
              <ScrollReveal delay={100} className="lg:order-1">
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-sm text-gray-500 font-medium">Real-time Sync</span>
                    <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full font-medium">
                      Connected
                    </span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Customer Database", icon: Users },
                      { label: "Technician Schedule", icon: Clock },
                      { label: "Job History", icon: TrendingUp },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-700">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          <span className="text-xs text-green-600">Synced</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2">
                    <Zap className="w-4 h-4 text-orange-500" />
                    <span className="text-xs text-orange-700 font-medium">
                      New job synced to ServiceTitan
                    </span>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* Feature 3 */}
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              <ScrollReveal>
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-[#1b191a] flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-[#1b191a]">Human Handoff</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-light text-[#1b191a] heading-serif mb-4">
                    Your team stays in control
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    The AI knows when to step back. Complex situations, angry customers, or high-value
                    opportunities get seamlessly transferred to your team with full context preserved.
                  </p>
                  <p className="text-gray-600 leading-relaxed">
                    You define the rules. The AI follows them. No customer ever feels like they&apos;re stuck
                    talking to a machine.
                  </p>
                </div>
              </ScrollReveal>
              <ScrollReveal delay={100}>
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xl">
                  <div className="text-sm text-gray-500 font-medium mb-6">Handoff Scenarios</div>
                  <div className="space-y-3">
                    {[
                      { trigger: "Complex pricing question", action: "Transfer to sales" },
                      { trigger: "Urgent emergency", action: "Priority dispatch" },
                      { trigger: "VIP customer detected", action: "Alert manager" },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                      >
                        <span className="text-sm text-gray-700">{item.trigger}</span>
                        <span className="text-xs px-2 py-1 bg-orange-50 text-orange-700 rounded font-medium">
                          {item.action}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* Stats section - Dark, impactful */}
      <section className="py-20 sm:py-28 bg-[#0f0f0f] relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2" />
        <div className="absolute top-1/2 right-0 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <ScrollReveal>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              <AnimatedStat value="1M+" label="Calls Handled" />
              <AnimatedStat value="30+" label="Languages" />
              <AnimatedStat value="50+" label="Integrations" />
              <AnimatedStat value="99.9%" label="Uptime" />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Values section */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-16">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-medium mb-4">
                What we believe
              </p>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-[#1b191a] heading-serif">
                Built on principles that matter
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-12">
            <ScrollReveal delay={0}>
              <ValueCard
                icon={Clock}
                title="Speed wins"
                description="Every second counts when a customer calls. Our infrastructure is built for instant response, every single time."
              />
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <ValueCard
                icon={Shield}
                title="Trust is earned"
                description="We handle sensitive customer data with enterprise-grade security. SOC 2 compliant, encrypted end-to-end."
              />
            </ScrollReveal>
            <ScrollReveal delay={200}>
              <ValueCard
                icon={Globe}
                title="Serve everyone"
                description="Language shouldn't be a barrier. Our AI speaks naturally in 30+ languages, serving diverse communities."
              />
            </ScrollReveal>
            <ScrollReveal delay={300}>
              <ValueCard
                icon={TrendingUp}
                title="Revenue first"
                description="We measure success by your bottom line. More booked jobs, higher conversion rates, increased revenue."
              />
            </ScrollReveal>
            <ScrollReveal delay={400}>
              <ValueCard
                icon={Users}
                title="Humans matter"
                description="AI handles the routine so your team can focus on what they do best—delivering exceptional service."
              />
            </ScrollReveal>
            <ScrollReveal delay={500}>
              <ValueCard
                icon={Zap}
                title="Just works"
                description="No complicated setup. No lengthy onboarding. Connect your systems and start capturing revenue in days."
              />
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-28 bg-[#fafafa]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <ScrollReveal>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-[#1b191a] heading-serif mb-6">
              Ready to capture more revenue?
            </h2>
            <p className="text-gray-600 text-lg mb-8 max-w-xl mx-auto">
              Join hundreds of field service businesses already using RevCenter to answer every call and book
              more jobs.
            </p>
            <a
              href="https://cal.com/team/revcenter/demo"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-4 text-base font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 bg-[#1b191a] text-white hover:bg-[#2d2a2b]"
            >
              Book a Demo
            </a>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
