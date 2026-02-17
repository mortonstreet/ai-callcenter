"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { ScrollReveal } from "@/components/landing";

const plans = [
  {
    name: "Starter",
    description: "Perfect for small businesses getting started",
    price: "$499",
    period: "/month",
    features: [
      "Up to 500 call minutes",
      "5 concurrent lines",
      "Basic FSM integration",
      "SMS & Email campaigns",
      "Standard support",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    description: "For growing teams with higher volume",
    price: "$999",
    period: "/month",
    features: [
      "Up to 2,000 call minutes",
      "15 concurrent lines",
      "Full FSM integration",
      "Advanced drip campaigns",
      "Lead scoring",
      "Priority support",
      "Custom voice training",
    ],
    cta: "Get Started",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "For large operations needing scale",
    price: "Custom",
    period: "",
    features: [
      "Unlimited call minutes",
      "Unlimited concurrent lines",
      "Multi-location support",
      "Custom integrations",
      "Dedicated success manager",
      "SLA guarantee",
      "White-label options",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const faqs = [
  {
    question: "What counts as a call minute?",
    answer: "Call minutes are calculated from when the AI picks up to when the call ends. Transfers to your team don't count against your minutes.",
  },
  {
    question: "Can I change plans later?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle.",
  },
  {
    question: "What FSM systems do you integrate with?",
    answer: "We integrate with ServiceTitan, FieldPulse, Service Fusion, Housecall Pro, and more. Custom integrations are available on Enterprise plans.",
  },
  {
    question: "Is there a setup fee?",
    answer: "No setup fees. We include onboarding and training at no additional cost.",
  },
];

export default function PricingPage() {
  return (
    <div className="py-12 sm:py-16 md:py-24">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16 sm:mb-20">
        <ScrollReveal>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-[#1b191a] heading-serif mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto">
            Choose the plan that fits your call volume. No hidden fees, no surprises.
          </p>
        </ScrollReveal>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-20 sm:mb-28">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan, i) => (
            <ScrollReveal key={plan.name} delay={i * 100}>
              <div className={`relative rounded-2xl p-5 sm:p-6 md:p-8 h-full flex flex-col ${
                plan.popular
                  ? "bg-[#1b191a] text-white shadow-2xl sm:scale-[1.02]"
                  : "bg-white border border-gray-200"
              }`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-white text-[#1b191a] text-xs font-semibold rounded-full">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <p className={`text-sm ${plan.popular ? "text-white/70" : "text-gray-500"}`}>
                    {plan.description}
                  </p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-light">{plan.price}</span>
                  <span className={`text-sm ${plan.popular ? "text-white/70" : "text-gray-500"}`}>
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        plan.popular ? "text-white" : "text-[#1b191a]"
                      }`} />
                      <span className={plan.popular ? "text-white/90" : "text-gray-600"}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.name === "Enterprise" ? "/contact" : "https://cal.com/team/revcenter/demo"}
                  className={`block text-center py-3.5 sm:py-3 px-6 rounded-xl font-medium transition-all min-h-[48px] flex items-center justify-center ${
                    plan.popular
                      ? "bg-white text-[#1b191a] hover:bg-gray-100"
                      : "bg-[#1b191a] text-white hover:bg-[#2d2a2b]"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-[#1b191a] heading-serif text-center mb-10">
            Frequently asked questions
          </h2>
        </ScrollReveal>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <ScrollReveal key={i} delay={i * 50}>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="font-semibold text-[#1b191a] mb-2">{faq.question}</h3>
                <p className="text-gray-600 text-sm">{faq.answer}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>
    </div>
  );
}
