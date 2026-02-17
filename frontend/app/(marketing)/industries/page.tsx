"use client";

import Link from "next/link";
import { ScrollReveal } from "@/components/landing";
import { ArrowRight, Thermometer, Droplets, Zap, Bug, Home } from "lucide-react";

const industries = [
  {
    slug: "hvac",
    name: "HVAC",
    icon: Thermometer,
    description: "Handle AC emergencies, furnace repairs, and seasonal tune-ups with AI that knows your business.",
    stats: "40% more bookings",
  },
  {
    slug: "plumbing",
    name: "Plumbing",
    icon: Droplets,
    description: "Capture water heater emergencies, drain cleaning, and new construction inquiries 24/7.",
    stats: "100% answer rate",
  },
  {
    slug: "electrical",
    name: "Electrical",
    icon: Zap,
    description: "Qualify EV charger leads, handle panel upgrades, and respond to electrical emergencies.",
    stats: "45% booking increase",
  },
  {
    slug: "pest-control",
    name: "Pest Control",
    icon: Bug,
    description: "Book termite inspections, respond to bed bug emergencies, and grow recurring service.",
    stats: "50% more recurring",
  },
  {
    slug: "roofing",
    name: "Roofing",
    icon: Home,
    description: "Capture storm damage leads, schedule inspections, and follow up on estimates.",
    stats: "60% higher lead capture",
  },
];

export default function IndustriesPage() {
  return (
    <div className="py-12 sm:py-16 md:py-24">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16 sm:mb-20">
        <ScrollReveal>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-[#1b191a] heading-serif mb-4">
            AI Call Agents for Field Service
          </h1>
          <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto">
            Purpose-built solutions for HVAC, plumbing, electrical, pest control, and roofing companies.
          </p>
        </ScrollReveal>
      </section>

      {/* Industries Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-20 sm:mb-28">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {industries.map((industry, i) => (
            <ScrollReveal key={industry.slug} delay={i * 100}>
              <Link
                href={`/industries/${industry.slug}`}
                className="group block bg-white rounded-2xl p-5 sm:p-6 md:p-8 border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all h-full active:scale-[0.98]"
              >
                <div className="flex sm:block items-start gap-4 sm:gap-0">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-[#1b191a] flex items-center justify-center mb-0 sm:mb-6 group-hover:scale-110 transition-transform flex-shrink-0">
                    <industry.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-xl font-semibold text-[#1b191a] mb-1 sm:mb-2 group-hover:text-[#1b191a]/80 transition-colors">
                      {industry.name}
                    </h2>
                    <p className="text-gray-600 text-sm mb-3 sm:mb-4">
                      {industry.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#1b191a]">{industry.stats}</span>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#1b191a] group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="bg-[#1b191a] rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-light text-white heading-serif mb-4">
              Don&apos;t see your industry?
            </h2>
            <p className="text-white/70 mb-8 max-w-lg mx-auto">
              RevCenter works with all types of field service and home service businesses. Contact us to discuss your specific needs.
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
