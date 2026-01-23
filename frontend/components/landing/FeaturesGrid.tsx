"use client";

import { Phone, Calendar, Globe, Star, Users, RefreshCw } from "lucide-react";
import ScrollReveal from "./ScrollReveal";

const features = [
  {
    icon: Phone,
    title: "100+ Simultaneous Calls",
    description: "Handle unlimited call volume. No busy signals, no hold times.",
  },
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "AI books appointments directly into your FSM calendar.",
  },
  {
    icon: Globe,
    title: "30+ Languages",
    description: "Serve diverse customers with automatic language detection.",
  },
  {
    icon: Star,
    title: "Lead Scoring",
    description: "Prioritize high-value opportunities with real-time scoring.",
  },
  {
    icon: Users,
    title: "Human Handoff",
    description: "Seamless transfer to your team when situations require it.",
  },
  {
    icon: RefreshCw,
    title: "CRM Sync",
    description: "Real-time sync with ServiceTitan, FieldPulse, and more.",
  },
];

export default function FeaturesGrid() {
  return (
    <section id="features" className="py-12 sm:py-16 md:py-20 lg:py-28 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <ScrollReveal>
          <div className="text-center mb-10 sm:mb-12 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal tracking-tight mb-3 sm:mb-4 heading-serif">
              Everything you need to automate calls
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">
              From inbound handling to outbound campaigns, we&apos;ve got you covered.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((feature, i) => (
            <ScrollReveal key={i} delay={i * 80}>
              <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-[#1b191a]/10 flex items-center justify-center text-[#1b191a] mb-5 group-hover:bg-[#1b191a] group-hover:text-white transition-colors">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
