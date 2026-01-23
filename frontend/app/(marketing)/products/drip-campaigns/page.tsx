"use client";

import Link from "next/link";
import { ScrollReveal } from "@/components/landing";
import { ArrowLeft, CalendarClock, Phone, Mail, MessageSquare, TrendingUp, Clock, Users, Target, Zap, CheckCircle } from "lucide-react";

const stats = [
  { value: "3x", label: "Response Rate" },
  { value: "25%", label: "Quote-to-Close" },
  { value: "SMS + Voice + Email", label: "Channels" },
  { value: "100%", label: "Automated" },
];

const features = [
  {
    icon: MessageSquare,
    title: "Multi-Channel Outreach",
    description: "Reach customers via SMS, voice calls, and email—all orchestrated in a single automated campaign.",
  },
  {
    icon: CalendarClock,
    title: "Smart Sequencing",
    description: "Build custom sequences with optimal timing. Our AI determines the best times and channels for each customer.",
  },
  {
    icon: Phone,
    title: "AI Voice Calls",
    description: "When SMS and email don't get a response, our AI makes personalized voice calls that sound natural and convert.",
  },
  {
    icon: Target,
    title: "Behavior-Based Triggers",
    description: "Campaigns adapt based on customer actions. Opened an email? Trigger a follow-up call. Booked? Stop the sequence.",
  },
  {
    icon: TrendingUp,
    title: "Quote Follow-Up",
    description: "Automatically follow up on open quotes with the right message at the right time. Increase close rates by 25%.",
  },
  {
    icon: Users,
    title: "Re-Engagement Campaigns",
    description: "Win back lapsed customers with maintenance reminders, seasonal tune-up offers, and renewal campaigns.",
  },
];

const campaignTypes = [
  {
    title: "Quote Follow-Up",
    description: "For customers with pending estimates",
    sequence: [
      { day: "Day 1", channel: "SMS", action: "Reminder of quote" },
      { day: "Day 3", channel: "Email", action: "Value proposition + testimonial" },
      { day: "Day 7", channel: "Voice", action: "Personal follow-up call" },
      { day: "Day 14", channel: "SMS", action: "Limited-time offer" },
    ],
  },
  {
    title: "Maintenance Reminder",
    description: "For existing customers due for service",
    sequence: [
      { day: "Day 0", channel: "SMS", action: "Seasonal reminder" },
      { day: "Day 3", channel: "Email", action: "Scheduling link" },
      { day: "Day 5", channel: "Voice", action: "AI call to book" },
    ],
  },
  {
    title: "Win-Back Campaign",
    description: "For customers who haven't booked in 12+ months",
    sequence: [
      { day: "Day 0", channel: "Email", action: "We miss you + special offer" },
      { day: "Day 4", channel: "SMS", action: "Exclusive discount code" },
      { day: "Day 10", channel: "Voice", action: "Personal outreach" },
    ],
  },
];

const useCases = [
  {
    title: "Seasonal Tune-Up Campaigns",
    description: "AI proactively contacts customers to schedule spring AC tune-ups and fall furnace check-ups before peak season. Campaigns run automatically based on your service area and customer history.",
  },
  {
    title: "Maintenance Agreement Renewals",
    description: "Outbound drip campaigns remind customers when their maintenance agreement is expiring. Multi-touch sequences via SMS, email, and voice drive 60% renewal rates.",
  },
  {
    title: "Estimate Follow-Up",
    description: "For homeowners with pending estimates, automated touchpoints over 90 days keep you top-of-mind until conversion or decline. Close 25% more quotes.",
  },
  {
    title: "New Customer Onboarding",
    description: "Welcome new customers with a sequence that confirms appointments, introduces your team, and sets expectations for service day.",
  },
];

const benefits = [
  "Automate outbound without hiring more staff",
  "3x response rates vs. single-channel campaigns",
  "AI voice calls that sound natural and convert",
  "Smart timing based on customer behavior",
  "Integrates with your FSM for real-time data",
  "Close 25% more quotes with automated follow-up",
];

export default function DripCampaignsPage() {
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
            <CalendarClock className="w-3.5 h-3.5" />
            Drip Campaigns
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-[#1b191a] heading-serif mb-4">
            Outbound that actually works
          </h1>
          <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto mb-8">
            Automated multi-channel campaigns via voice, SMS, and email. Follow up on quotes, renew maintenance agreements, and re-engage lapsed customers—all on autopilot.
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
                  <div className="text-2xl sm:text-4xl font-light text-white mb-1">{stat.value}</div>
                  <div className="text-white/60 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Campaign Flow Demo */}
      <section className="bg-[#f5f5f7] py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-[#1b191a] heading-serif text-center mb-4">
              See how campaigns work
            </h2>
            <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
              Build automated sequences that reach customers at the right time, through the right channel.
            </p>
          </ScrollReveal>

          <div className="space-y-8">
            {campaignTypes.map((campaign, i) => (
              <ScrollReveal key={i} delay={i * 100}>
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200">
                  <div className="mb-6">
                    <h3 className="font-semibold text-lg mb-1">{campaign.title}</h3>
                    <p className="text-gray-500 text-sm">{campaign.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-3 items-center">
                    {campaign.sequence.map((step, j) => (
                      <div key={j} className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200">
                          <span className="text-xs font-medium text-gray-500">{step.day}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                            step.channel === "SMS" ? "bg-blue-100 text-blue-700" :
                            step.channel === "Email" ? "bg-purple-100 text-purple-700" :
                            "bg-green-100 text-green-700"
                          }`}>
                            {step.channel}
                          </span>
                          <span className="text-xs text-gray-600">{step.action}</span>
                        </div>
                        {j < campaign.sequence.length - 1 && (
                          <div className="hidden sm:block w-6 h-px bg-gray-300" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <ScrollReveal>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-[#1b191a] heading-serif text-center mb-12">
            Powerful outbound automation
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

      {/* Use Cases */}
      <section className="bg-[#f5f5f7] py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-[#1b191a] heading-serif text-center mb-12">
              Real-world campaigns
            </h2>
          </ScrollReveal>
          <div className="grid md:grid-cols-2 gap-6">
            {useCases.map((useCase, i) => (
              <ScrollReveal key={i} delay={i * 100}>
                <div className="bg-white rounded-2xl p-6 border border-gray-200 h-full">
                  <h3 className="font-semibold text-base mb-2">{useCase.title}</h3>
                  <p className="text-gray-600 text-sm">{useCase.description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <ScrollReveal>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-[#1b191a] heading-serif text-center mb-12">
            Why choose RevCenter for outbound
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
      </section>

      {/* Testimonial */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 sm:pb-28">
        <ScrollReveal>
          <div className="bg-[#f5f5f7] rounded-2xl sm:rounded-3xl p-8 sm:p-12 md:p-16 text-center">
            <blockquote className="text-xl sm:text-2xl font-light text-[#1b191a] mb-6 max-w-3xl mx-auto heading-serif">
              &quot;Our maintenance agreement renewal rate went from 40% to 60% with RevCenter drip campaigns. The AI voice calls are incredible.&quot;
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1b191a] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">JL</span>
              </div>
              <div className="text-left">
                <div className="font-medium text-[#1b191a]">Jennifer Lee</div>
                <div className="text-sm text-gray-500">SafeGuard Pest Control, Atlanta GA</div>
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
              Ready to automate your outbound?
            </h2>
            <p className="text-white/70 mb-8 max-w-lg mx-auto">
              See how RevCenter drip campaigns can increase your close rates and win back more customers.
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
