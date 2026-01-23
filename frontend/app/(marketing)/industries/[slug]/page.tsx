"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ScrollReveal } from "@/components/landing";
import { ArrowLeft, Phone, Clock, TrendingUp, CheckCircle, Zap, Users, Calendar, MessageSquare } from "lucide-react";

type IndustryData = {
  name: string;
  heroTitle: string;
  heroDescription: string;
  stats: { value: string; label: string }[];
  challenges: { title: string; description: string }[];
  solutions: { icon: React.ElementType; title: string; description: string }[];
  useCases: { title: string; description: string }[];
  testimonial: { quote: string; author: string; company: string };
};

const industries: Record<string, IndustryData> = {
  hvac: {
    name: "HVAC",
    heroTitle: "AI Call Agents for HVAC Companies",
    heroDescription: "Handle more service calls, book more appointments, and never miss an AC emergency—even at 2 AM in peak summer.",
    stats: [
      { value: "40%", label: "More Bookings" },
      { value: "24/7", label: "Availability" },
      { value: "<1s", label: "Answer Time" },
      { value: "30+", label: "Languages" },
    ],
    challenges: [
      {
        title: "Seasonal Call Surges",
        description: "Summer heat waves and winter cold snaps create massive call volume spikes that overwhelm traditional call centers.",
      },
      {
        title: "After-Hours Emergencies",
        description: "AC failures and furnace breakdowns don't wait for business hours. Customers need help now.",
      },
      {
        title: "High Call Center Costs",
        description: "Staffing for peak demand means paying for idle capacity during slow periods.",
      },
      {
        title: "Inconsistent Service Quality",
        description: "High turnover in call centers leads to poor training and inconsistent customer experiences.",
      },
    ],
    solutions: [
      {
        icon: Phone,
        title: "Instant Call Answering",
        description: "AI answers every call in under a second, 24/7/365. No hold times, no voicemail, no missed opportunities.",
      },
      {
        icon: Calendar,
        title: "Smart Scheduling",
        description: "Real-time integration with ServiceTitan, FieldPulse, and other FSM software ensures accurate availability and instant booking.",
      },
      {
        icon: Zap,
        title: "Emergency Prioritization",
        description: "AI identifies true emergencies (no heat, no AC, gas smells) and triggers priority dispatch protocols automatically.",
      },
      {
        icon: MessageSquare,
        title: "Lead Qualification",
        description: "Gather equipment details, address service history, and qualify leads before they reach your team.",
      },
    ],
    useCases: [
      {
        title: "Emergency Service Calls",
        description: "Customer calls at 11 PM with no AC. AI gathers address, unit details, and symptoms, then books a same-day emergency slot and notifies on-call technician.",
      },
      {
        title: "Maintenance Agreement Renewals",
        description: "Outbound drip campaigns remind customers when their maintenance agreement is expiring, with easy one-call renewal.",
      },
      {
        title: "Seasonal Tune-Up Campaigns",
        description: "AI proactively calls customers to schedule spring AC tune-ups and fall furnace check-ups before peak season.",
      },
      {
        title: "Estimate Follow-Up",
        description: "Automated follow-up on open quotes for system replacements, increasing close rates by 25%.",
      },
    ],
    testimonial: {
      quote: "We went from missing 30% of after-hours calls to capturing 100%. That's an extra $45K per month in booked revenue.",
      author: "Mike Chen",
      company: "Comfort Zone HVAC, Phoenix AZ",
    },
  },
  plumbing: {
    name: "Plumbing",
    heroTitle: "AI Call Agents for Plumbing Companies",
    heroDescription: "Capture every water heater emergency, clogged drain call, and new construction inquiry—without adding headcount.",
    stats: [
      { value: "35%", label: "More Emergency Calls Captured" },
      { value: "100%", label: "Answer Rate" },
      { value: "60%", label: "Cost Reduction" },
      { value: "4.9", label: "Customer Rating" },
    ],
    challenges: [
      {
        title: "True Emergencies Need Immediate Response",
        description: "Burst pipes and sewage backups can't wait. Every minute on hold means more water damage and a customer calling your competitor.",
      },
      {
        title: "Wide Service Variety",
        description: "From simple drain cleaning to whole-house repiping, callers need accurate information on services and pricing.",
      },
      {
        title: "Dispatch Complexity",
        description: "Matching the right technician (skills, equipment, location) to each job requires real-time data access.",
      },
      {
        title: "Commercial vs. Residential",
        description: "Different pricing, response times, and service processes for commercial customers require specialized handling.",
      },
    ],
    solutions: [
      {
        icon: Clock,
        title: "24/7 Emergency Response",
        description: "AI answers immediately, triages the emergency, and dispatches help—even at 3 AM on a holiday.",
      },
      {
        icon: Users,
        title: "Smart Technician Matching",
        description: "Integration with your FSM ensures the right tech with the right skills and parts is dispatched to each job.",
      },
      {
        icon: TrendingUp,
        title: "Commercial Account Handling",
        description: "Recognize commercial callers, apply correct pricing, and route to dedicated account managers when needed.",
      },
      {
        icon: CheckCircle,
        title: "Service Bundling",
        description: "AI suggests relevant add-on services (water heater flush with drain cleaning) to increase average ticket.",
      },
    ],
    useCases: [
      {
        title: "Water Emergency Dispatch",
        description: "Caller reports water gushing from ceiling. AI walks them through water shutoff, captures details, and dispatches emergency technician within 2 minutes.",
      },
      {
        title: "Water Heater Replacements",
        description: "AI qualifies leads for water heater replacement, gathers unit specs, and schedules in-home estimates.",
      },
      {
        title: "Drain Cleaning Scheduling",
        description: "Quick booking for routine drain cleaning with upsell suggestions for camera inspection.",
      },
      {
        title: "New Construction Bids",
        description: "Capture project details from general contractors and schedule estimator visits for new construction plumbing.",
      },
    ],
    testimonial: {
      quote: "Our average response time went from 45 seconds to instant. Customers love it, and we're capturing emergencies we used to lose.",
      author: "Sarah Martinez",
      company: "RapidFlow Plumbing, Dallas TX",
    },
  },
  electrical: {
    name: "Electrical",
    heroTitle: "AI Call Agents for Electrical Contractors",
    heroDescription: "Handle panel upgrades, EV charger installs, and electrical emergencies with AI that understands your business.",
    stats: [
      { value: "45%", label: "Increase in Bookings" },
      { value: "24/7", label: "Coverage" },
      { value: "15s", label: "Avg Call Handle Time" },
      { value: "98%", label: "Accuracy" },
    ],
    challenges: [
      {
        title: "Complex Service Catalog",
        description: "Electrical work ranges from simple outlet repairs to complex panel upgrades and whole-home rewiring. Callers need accurate guidance.",
      },
      {
        title: "Safety-Critical Triage",
        description: "Some electrical issues are true emergencies (burning smells, sparking outlets) requiring immediate safety guidance.",
      },
      {
        title: "Growing EV Market",
        description: "EV charger inquiries are surging. You need to capture these high-value leads efficiently.",
      },
      {
        title: "Permit and Code Questions",
        description: "Customers have questions about permits, code requirements, and inspection processes.",
      },
    ],
    solutions: [
      {
        icon: Zap,
        title: "Emergency Safety Protocols",
        description: "AI provides immediate safety guidance (turn off breaker, evacuate if fire risk) while dispatching emergency service.",
      },
      {
        icon: CheckCircle,
        title: "EV Charger Qualification",
        description: "Dedicated flows for EV charger inquiries capture vehicle type, electrical panel capacity, and installation location.",
      },
      {
        icon: Calendar,
        title: "Estimate Scheduling",
        description: "Complex jobs requiring estimates are efficiently scheduled with all necessary details captured upfront.",
      },
      {
        icon: MessageSquare,
        title: "Code & Permit Info",
        description: "AI provides accurate information about local permit requirements and what to expect from the process.",
      },
    ],
    useCases: [
      {
        title: "Panel Upgrade Consultations",
        description: "AI qualifies panel upgrade leads by gathering current panel info, planned additions (EV, hot tub), and scheduling in-home estimates.",
      },
      {
        title: "Emergency Dispatch",
        description: "Caller reports sparking outlet. AI guides them to turn off the breaker, captures location, and dispatches emergency technician.",
      },
      {
        title: "EV Charger Installation",
        description: "Capture vehicle make/model, garage layout, and panel capacity to provide accurate quotes and scheduling.",
      },
      {
        title: "Generator Sales & Service",
        description: "Qualify leads for whole-home generator installation and schedule seasonal maintenance for existing units.",
      },
    ],
    testimonial: {
      quote: "EV charger inquiries were overwhelming our team. Now AI handles the qualification and we just show up to close the sale.",
      author: "David Park",
      company: "Spark Electric, Seattle WA",
    },
  },
  "pest-control": {
    name: "Pest Control",
    heroTitle: "AI Call Agents for Pest Control Companies",
    heroDescription: "Capture every ant, termite, and rodent call. Book more recurring treatments with intelligent follow-up.",
    stats: [
      { value: "50%", label: "More Recurring Customers" },
      { value: "30+", label: "Languages Supported" },
      { value: "100%", label: "Calls Answered" },
      { value: "2x", label: "Booking Rate" },
    ],
    challenges: [
      {
        title: "Urgent Infestations",
        description: "Customers with active infestations (bed bugs, wasps, rodents) need immediate help and reassurance.",
      },
      {
        title: "Recurring Service Retention",
        description: "Converting one-time treatments into recurring quarterly service is key to profitability.",
      },
      {
        title: "Seasonal Demand Patterns",
        description: "Spring and summer bring massive call volume increases for ants, wasps, and other seasonal pests.",
      },
      {
        title: "Multi-Unit Properties",
        description: "Commercial accounts and multi-unit properties require different service approaches and pricing.",
      },
    ],
    solutions: [
      {
        icon: Phone,
        title: "Pest-Specific Intake",
        description: "AI asks the right questions for each pest type: location, severity, duration, children/pets, and previous treatments.",
      },
      {
        icon: TrendingUp,
        title: "Recurring Service Conversion",
        description: "After initial treatment, drip campaigns promote the benefits of recurring quarterly service with easy enrollment.",
      },
      {
        icon: Calendar,
        title: "Seasonal Campaigns",
        description: "Proactive outreach before peak season offers inspection and preventive treatment scheduling.",
      },
      {
        icon: Users,
        title: "Commercial Account Management",
        description: "Dedicated flows for property managers and commercial accounts with custom pricing and service schedules.",
      },
    ],
    useCases: [
      {
        title: "Bed Bug Emergency",
        description: "Caller discovers bed bugs. AI provides immediate guidance, captures room details, and schedules urgent inspection.",
      },
      {
        title: "Termite Inspection Booking",
        description: "Real estate agent needs termite clearance letter. AI schedules inspection with property details and deadline.",
      },
      {
        title: "Quarterly Service Renewal",
        description: "Automated reminder calls for upcoming quarterly treatments with easy confirmation or rescheduling.",
      },
      {
        title: "Wildlife Removal",
        description: "Capture details about nuisance wildlife (raccoons, squirrels, bats) and schedule humane removal services.",
      },
    ],
    testimonial: {
      quote: "Our recurring customer base grew 50% in one year. The AI follow-up campaigns are converting one-time customers we used to lose.",
      author: "Jennifer Lee",
      company: "SafeGuard Pest Control, Atlanta GA",
    },
  },
  roofing: {
    name: "Roofing",
    heroTitle: "AI Call Agents for Roofing Contractors",
    heroDescription: "Capture storm damage leads, schedule inspections, and follow up on estimates with AI that works around the clock.",
    stats: [
      { value: "60%", label: "Higher Lead Capture" },
      { value: "35%", label: "Better Close Rate" },
      { value: "24/7", label: "Storm Response" },
      { value: "$150K+", label: "Avg Annual Revenue Lift" },
    ],
    challenges: [
      {
        title: "Storm Surge Response",
        description: "After major storms, call volume spikes 10x. Missing these calls means losing high-value insurance jobs to competitors.",
      },
      {
        title: "Long Sales Cycles",
        description: "Roof replacements are major decisions. Leads need nurturing over weeks or months before converting.",
      },
      {
        title: "Insurance Claim Complexity",
        description: "Customers need help understanding the insurance claim process and what to expect.",
      },
      {
        title: "Estimate Follow-Up",
        description: "With multiple estimates pending, systematic follow-up is crucial but hard to maintain manually.",
      },
    ],
    solutions: [
      {
        icon: Zap,
        title: "Storm Surge Capacity",
        description: "AI scales instantly to handle 100x normal call volume after major weather events. Every lead is captured.",
      },
      {
        icon: MessageSquare,
        title: "Insurance Guidance",
        description: "AI explains the insurance claim process, what documentation is needed, and how to file a claim.",
      },
      {
        icon: TrendingUp,
        title: "Automated Estimate Follow-Up",
        description: "Persistent follow-up drip campaigns keep you top-of-mind until the customer is ready to decide.",
      },
      {
        icon: Calendar,
        title: "Inspection Scheduling",
        description: "Quickly book roof inspections with all necessary details captured upfront.",
      },
    ],
    useCases: [
      {
        title: "Storm Damage Intake",
        description: "After a hailstorm, caller reports potential damage. AI captures address, visible damage details, and schedules free inspection.",
      },
      {
        title: "Insurance Claim Assistance",
        description: "AI guides homeowners through initial insurance filing steps and schedules adjuster-accompaniment visits.",
      },
      {
        title: "Estimate Follow-Up Campaign",
        description: "For homeowners with pending estimates, automated touchpoints over 90 days until conversion or decline.",
      },
      {
        title: "Annual Inspection Reminders",
        description: "Proactive outreach to past customers offering annual roof inspections and maintenance.",
      },
    ],
    testimonial: {
      quote: "After the last major hailstorm, we captured 400% more leads than the previous year. The AI handled the surge flawlessly.",
      author: "Tom Williams",
      company: "Summit Roofing, Denver CO",
    },
  },
};

export default function IndustryPage() {
  const params = useParams();
  const slug = params.slug as string;
  const industry = industries[slug];

  if (!industry) {
    return (
      <div className="py-24 text-center">
        <h1 className="text-2xl font-semibold mb-4">Industry not found</h1>
        <Link href="/" className="text-[#1b191a] hover:underline">
          ← Back to Home
        </Link>
      </div>
    );
  }

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
          <span className="inline-block px-3 py-1 bg-[#1b191a]/10 text-[#1b191a] text-xs font-medium rounded-full mb-4">
            {industry.name}
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-[#1b191a] heading-serif mb-4">
            {industry.heroTitle}
          </h1>
          <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto mb-8">
            {industry.heroDescription}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="https://cal.com/team/revcenter/demo"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[#1b191a] text-white font-medium hover:bg-[#2d2a2b] transition-colors"
            >
              Book a Demo
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-[#1b191a] font-medium border border-gray-200 hover:border-gray-300 transition-colors"
            >
              Contact Sales
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* Stats */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-20 sm:mb-28">
        <ScrollReveal>
          <div className="bg-[#1b191a] rounded-2xl sm:rounded-3xl p-8 sm:p-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {industry.stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl sm:text-4xl font-light text-white mb-1">{stat.value}</div>
                  <div className="text-white/60 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Challenges */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-20 sm:mb-28">
        <ScrollReveal>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-[#1b191a] heading-serif text-center mb-12">
            The Challenges You Face
          </h2>
        </ScrollReveal>
        <div className="grid md:grid-cols-2 gap-6">
          {industry.challenges.map((challenge, i) => (
            <ScrollReveal key={i} delay={i * 100}>
              <div className="bg-[#f5f5f7] rounded-2xl p-8">
                <h3 className="font-semibold text-lg mb-2">{challenge.title}</h3>
                <p className="text-gray-600 text-sm">{challenge.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Solutions */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-20 sm:mb-28">
        <ScrollReveal>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-[#1b191a] heading-serif text-center mb-12">
            How RevCenter Helps
          </h2>
        </ScrollReveal>
        <div className="grid md:grid-cols-2 gap-6">
          {industry.solutions.map((solution, i) => (
            <ScrollReveal key={i} delay={i * 100}>
              <div className="bg-white rounded-2xl p-8 border border-gray-200">
                <div className="w-12 h-12 rounded-xl bg-[#1b191a] flex items-center justify-center mb-4">
                  <solution.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{solution.title}</h3>
                <p className="text-gray-600 text-sm">{solution.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Use Cases */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-20 sm:mb-28">
        <ScrollReveal>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-[#1b191a] heading-serif text-center mb-12">
            Real-World Use Cases
          </h2>
        </ScrollReveal>
        <div className="space-y-4">
          {industry.useCases.map((useCase, i) => (
            <ScrollReveal key={i} delay={i * 50}>
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <h3 className="font-semibold text-base mb-2">{useCase.title}</h3>
                <p className="text-gray-600 text-sm">{useCase.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-20 sm:mb-28">
        <ScrollReveal>
          <div className="bg-[#f5f5f7] rounded-2xl sm:rounded-3xl p-8 sm:p-12 md:p-16 text-center">
            <blockquote className="text-xl sm:text-2xl font-light text-[#1b191a] mb-6 max-w-3xl mx-auto heading-serif">
              &quot;{industry.testimonial.quote}&quot;
            </blockquote>
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1b191a] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">
                  {industry.testimonial.author.split(" ").map(n => n[0]).join("")}
                </span>
              </div>
              <div className="text-left">
                <div className="font-medium text-[#1b191a]">{industry.testimonial.author}</div>
                <div className="text-sm text-gray-500">{industry.testimonial.company}</div>
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
              Ready to transform your {industry.name.toLowerCase()} business?
            </h2>
            <p className="text-white/70 mb-8 max-w-lg mx-auto">
              See how RevCenter can help you capture more calls, book more jobs, and grow your revenue.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="https://cal.com/team/revcenter/demo"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-[#1b191a] font-medium hover:bg-gray-100 transition-colors"
              >
                Book a Demo
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-transparent text-white font-medium border border-white/30 hover:bg-white/10 transition-colors"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
