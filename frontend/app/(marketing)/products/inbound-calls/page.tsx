"use client";

import Link from "next/link";
import { ScrollReveal, AgentsPreviewWidget } from "@/components/landing";
import { ArrowLeft, Phone, Clock, Zap, MessageSquare, Calendar, Users, TrendingUp, CheckCircle } from "lucide-react";

const stats = [
  { value: "100%", label: "Answer Rate" },
  { value: "<1s", label: "Response Time" },
  { value: "24/7", label: "Availability" },
  { value: "30+", label: "Languages" },
];

const features = [
  {
    icon: Phone,
    title: "Instant Call Answering",
    description: "AI answers every call in under a second, 24/7/365. No hold times, no voicemail, no missed opportunities.",
  },
  {
    icon: MessageSquare,
    title: "Natural Conversations",
    description: "Our AI engages callers in natural, human-like conversations. It understands context, handles interruptions, and responds intelligently.",
  },
  {
    icon: Calendar,
    title: "Smart Appointment Booking",
    description: "Real-time integration with your FSM software ensures accurate availability and instant booking directly into your calendar.",
  },
  {
    icon: TrendingUp,
    title: "Lead Qualification",
    description: "Gather equipment details, service history, and qualify leads before they reach your team. Focus on high-value opportunities.",
  },
  {
    icon: Zap,
    title: "Emergency Prioritization",
    description: "AI identifies true emergencies (no heat, no AC, gas smells) and triggers priority dispatch protocols automatically.",
  },
  {
    icon: Users,
    title: "Human Handoff",
    description: "Complex situations get escalated to your team seamlessly, with full context preserved. AI knows when to step back.",
  },
];

const useCases = [
  {
    title: "After-Hours Emergency",
    description: "Customer calls at 11 PM with no AC. AI gathers address, unit details, and symptoms, then books a same-day emergency slot and notifies on-call technician.",
  },
  {
    title: "New Customer Inquiry",
    description: "First-time caller needs a quote for a new installation. AI captures requirements, checks availability, and schedules an in-home estimate.",
  },
  {
    title: "Service Call Booking",
    description: "Regular customer needs routine maintenance. AI pulls up their history, confirms equipment details, and books the appointment in seconds.",
  },
  {
    title: "Callback Management",
    description: "AI handles callbacks for customers who couldn't be reached, following up at optimal times to maximize booking rates.",
  },
];

const benefits = [
  "Never miss another call—even during peak hours or holidays",
  "Reduce staffing costs by 60% while improving service quality",
  "Book 40% more appointments with instant availability checks",
  "Handle 100+ simultaneous calls without hold times",
  "Capture leads 24/7 in 30+ languages",
  "Integrate seamlessly with ServiceTitan, FieldPulse, and more",
];

export default function InboundCallsPage() {
  return (
    <div className="py-12 sm:py-16 md:py-24">
      {/* Back link */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <ScrollReveal>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-[#1b191a] transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </ScrollReveal>
      </section>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16 sm:mb-20">
        <ScrollReveal>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1b191a]/10 text-[#1b191a] text-xs font-medium rounded-full mb-4">
            <Phone className="w-3.5 h-3.5" />
            Inbound Calls
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-[#1b191a] heading-serif mb-4">
            AI that answers every call, instantly
          </h1>
          <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto mb-8">
            Never miss another call. Our AI answers instantly, qualifies leads, and books appointments 24/7—while sounding completely natural.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="https://cal.com/team/revcenter/demo"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[#1b191a] text-white font-medium hover:bg-[#2d2a2b] transition-colors"
            >
              Book a Demo
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-[#1b191a] font-medium border border-gray-200 hover:border-gray-300 transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* Stats */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-20 sm:mb-28">
        <ScrollReveal>
          <div className="bg-[#1b191a] rounded-2xl sm:rounded-3xl p-8 sm:p-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl sm:text-4xl font-light text-white mb-1">{stat.value}</div>
                  <div className="text-white/60 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Interactive Demo */}
      <AgentsPreviewWidget />

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <ScrollReveal>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-[#1b191a] heading-serif text-center mb-12">
            Everything you need to capture every call
          </h2>
        </ScrollReveal>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <ScrollReveal key={i} delay={i * 100}>
              <div className="bg-white rounded-2xl p-8 border border-gray-200 h-full">
                <div className="w-12 h-12 rounded-xl bg-[#1b191a] flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-[#f5f5f7] py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-[#1b191a] heading-serif text-center mb-12">
              How it works
            </h2>
          </ScrollReveal>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Call Comes In", description: "Customer dials your number at any hour" },
              { step: "2", title: "AI Answers", description: "RevCenter picks up in under a second" },
              { step: "3", title: "Qualification", description: "AI gathers details and checks availability" },
              { step: "4", title: "Booked", description: "Appointment synced to your FSM instantly" },
            ].map((item, i) => (
              <ScrollReveal key={i} delay={i * 100}>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-[#1b191a] text-white flex items-center justify-center mx-auto mb-4 text-lg font-semibold">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <ScrollReveal>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-[#1b191a] heading-serif text-center mb-12">
            Real-world scenarios
          </h2>
        </ScrollReveal>
        <div className="space-y-4">
          {useCases.map((useCase, i) => (
            <ScrollReveal key={i} delay={i * 50}>
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <h3 className="font-semibold text-base mb-2">{useCase.title}</h3>
                <p className="text-gray-600 text-sm">{useCase.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-[#f5f5f7] py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-[#1b191a] heading-serif text-center mb-12">
              Why field service businesses choose RevCenter
            </h2>
          </ScrollReveal>
          <div className="max-w-2xl mx-auto">
            <div className="space-y-4">
              {benefits.map((benefit, i) => (
                <ScrollReveal key={i} delay={i * 50}>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <ScrollReveal>
          <div className="bg-white rounded-2xl sm:rounded-3xl p-8 sm:p-12 md:p-16 text-center border border-gray-200">
            <blockquote className="text-xl sm:text-2xl font-light text-[#1b191a] mb-6 max-w-3xl mx-auto heading-serif">
              &quot;We went from missing 30% of after-hours calls to capturing 100%. That&apos;s an extra $45K per month in booked revenue.&quot;
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1b191a] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">MC</span>
              </div>
              <div className="text-left">
                <div className="font-medium text-[#1b191a]">Mike Chen</div>
                <div className="text-sm text-gray-500">Comfort Zone HVAC, Phoenix AZ</div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="bg-[#1b191a] rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-light text-white heading-serif mb-4">
              Ready to never miss another call?
            </h2>
            <p className="text-white/70 mb-8 max-w-lg mx-auto">
              See how RevCenter can transform your inbound call handling with a personalized demo.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="https://cal.com/team/revcenter/demo"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-[#1b191a] font-medium hover:bg-gray-100 transition-colors"
              >
                Book a Demo
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-transparent text-white font-medium border border-white/30 hover:bg-white/10 transition-colors"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
