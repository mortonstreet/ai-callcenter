"use client";

import Link from "next/link";
import { ScrollReveal } from "@/components/landing";
import { ArrowLeft, Zap, RefreshCw, Calendar, Users, Database, Shield, CheckCircle, ArrowRight } from "lucide-react";

const stats = [
  { value: "50+", label: "Integrations" },
  { value: "<1s", label: "Sync Time" },
  { value: "2-Way", label: "Data Sync" },
  { value: "99.9%", label: "Uptime" },
];

const integrations = [
  {
    name: "ServiceTitan",
    description: "Full bidirectional sync with customer data, appointments, job history, and technician schedules.",
    popular: true,
  },
  {
    name: "FieldPulse",
    description: "Real-time integration with scheduling, customer management, and job tracking.",
    popular: true,
  },
  {
    name: "Service Fusion",
    description: "Sync appointments, customer records, and dispatch data automatically.",
    popular: true,
  },
  {
    name: "Housecall Pro",
    description: "Connect your booking calendar, customer database, and job management.",
    popular: false,
  },
  {
    name: "Jobber",
    description: "Integrate scheduling, invoicing, and customer communications.",
    popular: false,
  },
  {
    name: "ServiceMax",
    description: "Enterprise-grade integration for large field service operations.",
    popular: false,
  },
];

const syncCapabilities = [
  {
    icon: Users,
    title: "Customer Data",
    description: "Customer profiles, contact info, service addresses, and communication preferences sync in real-time.",
  },
  {
    icon: Calendar,
    title: "Appointments",
    description: "AI books directly into your FSM calendar. Appointments sync instantly with confirmation details.",
  },
  {
    icon: Database,
    title: "Job History",
    description: "Access complete service history during calls. AI uses past jobs to personalize conversations.",
  },
  {
    icon: RefreshCw,
    title: "Technician Schedules",
    description: "Real-time availability checks ensure AI only offers slots when techs are actually free.",
  },
  {
    icon: Shield,
    title: "Secure Sync",
    description: "Enterprise-grade security with encrypted data transfer and SOC 2 compliance.",
  },
  {
    icon: Zap,
    title: "Instant Updates",
    description: "Changes in either system reflect immediately. No batch processing delays.",
  },
];

const benefits = [
  "AI books appointments directly into your existing calendar",
  "Real-time availability prevents double-booking",
  "Customer history available during every call",
  "No manual data entry—everything syncs automatically",
  "Works with your existing workflows, not against them",
  "Enterprise-grade security and compliance",
];

const howItWorks = [
  {
    step: "1",
    title: "Connect",
    description: "Link your FSM account with a few clicks. No IT team required.",
  },
  {
    step: "2",
    title: "Sync",
    description: "Customer data, schedules, and job history sync automatically.",
  },
  {
    step: "3",
    title: "Go Live",
    description: "AI starts answering calls with full access to your business data.",
  },
  {
    step: "4",
    title: "Stay Updated",
    description: "All new appointments and changes sync back instantly.",
  },
];

export default function IntegrationsPage() {
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
            <Zap className="w-3.5 h-3.5" />
            FSM Integrations
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-[#1b191a] heading-serif mb-4">
            Connects to your existing tools
          </h1>
          <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto mb-8">
            RevCenter integrates seamlessly with ServiceTitan, FieldPulse, Service Fusion, and 50+ other field service platforms. Real-time sync, zero manual entry.
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

      {/* Integration Partners */}
      <section className="bg-[#f5f5f7] py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-[#1b191a] heading-serif text-center mb-4">
              Works with your FSM software
            </h2>
            <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
              Native integrations with all major field service management platforms.
            </p>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((integration, i) => (
              <ScrollReveal key={i} delay={i * 50}>
                <div className="bg-white rounded-2xl p-6 border border-gray-200 h-full">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-lg">{integration.name}</h3>
                    {integration.popular && (
                      <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm">{integration.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal>
            <div className="text-center mt-8">
              <p className="text-gray-500 text-sm">
                Don&apos;t see your FSM? <Link href="/contact" className="text-[#1b191a] underline">Contact us</Link> — we&apos;re adding new integrations regularly.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* What Syncs */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <ScrollReveal>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-[#1b191a] heading-serif text-center mb-12">
            Everything syncs in real-time
          </h2>
        </ScrollReveal>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {syncCapabilities.map((capability, i) => (
            <ScrollReveal key={i} delay={i * 100}>
              <div className="bg-white rounded-2xl p-8 border border-gray-200 h-full">
                <div className="w-12 h-12 rounded-xl bg-[#1b191a] flex items-center justify-center mb-4">
                  <capability.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{capability.title}</h3>
                <p className="text-gray-600 text-sm">{capability.description}</p>
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
              Up and running in minutes
            </h2>
          </ScrollReveal>
          <div className="grid md:grid-cols-4 gap-8">
            {howItWorks.map((item, i) => (
              <ScrollReveal key={i} delay={i * 100}>
                <div className="text-center relative">
                  <div className="w-12 h-12 rounded-full bg-[#1b191a] text-white flex items-center justify-center mx-auto mb-4 text-lg font-semibold">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                  {i < howItWorks.length - 1 && (
                    <ArrowRight className="hidden md:block absolute top-6 -right-4 w-6 h-6 text-gray-300" />
                  )}
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Sync Demo */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <ScrollReveal>
          <div className="bg-[#1a1a2e] rounded-2xl sm:rounded-3xl p-6 sm:p-10 overflow-hidden">
            <h3 className="text-xl sm:text-2xl font-light text-white heading-serif text-center mb-8">
              Real-time sync in action
            </h3>
            <div className="space-y-4 max-w-md mx-auto">
              {[
                { label: "Customer data", status: "synced" },
                { label: "Appointments", status: "synced" },
                { label: "Technician schedule", status: "synced" },
                { label: "Job history", status: "synced" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-gray-700/30">
                  <span className="text-gray-300">{item.label}</span>
                  <span className="flex items-center gap-2 text-sm text-green-400">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    Synced
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Benefits */}
      <section className="bg-[#f5f5f7] py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-[#1b191a] heading-serif text-center mb-12">
              Why seamless integration matters
            </h2>
          </ScrollReveal>
          <div className="max-w-2xl mx-auto">
            <div className="space-y-4">
              {benefits.map((benefit, i) => (
                <ScrollReveal key={i} delay={i * 50}>
                  <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-gray-200">
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
              &quot;The ServiceTitan integration is flawless. Every call the AI handles shows up in our system instantly. No manual entry, no double-booking.&quot;
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1b191a] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">TW</span>
              </div>
              <div className="text-left">
                <div className="font-medium text-[#1b191a]">Tom Williams</div>
                <div className="text-sm text-gray-500">Summit Roofing, Denver CO</div>
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
              Ready to connect your FSM?
            </h2>
            <p className="text-white/70 mb-8 max-w-lg mx-auto">
              See how RevCenter integrates with your existing tools in a personalized demo.
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
