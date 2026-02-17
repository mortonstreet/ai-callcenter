"use client";

import Link from "next/link";
import { ScrollReveal } from "@/components/landing";
import { Book, Zap, Phone, Settings, Code, HelpCircle } from "lucide-react";

const sections = [
  {
    icon: Book,
    title: "Getting Started",
    description: "Quick start guide to set up your RevCenter account",
    links: [
      { title: "Introduction", href: "/help/getting-started" },
      { title: "Account Setup", href: "/help/getting-started#account-setup" },
      { title: "Your First AI Agent", href: "/help/getting-started#first-agent" },
    ],
  },
  {
    icon: Zap,
    title: "Integrations",
    description: "Connect RevCenter with your existing tools",
    links: [
      { title: "ServiceTitan", href: "/help/integrations#servicetitan" },
      { title: "FieldPulse", href: "/help/integrations#fieldpulse" },
      { title: "Service Fusion", href: "/help/integrations#service-fusion" },
      { title: "Webhooks", href: "/help/integrations#webhooks" },
    ],
  },
  {
    icon: Phone,
    title: "Call Handling",
    description: "Configure how your AI agent handles calls",
    links: [
      { title: "Inbound Calls", href: "/help/call-handling#inbound" },
      { title: "Outbound Campaigns", href: "/help/call-handling#outbound" },
      { title: "Call Routing", href: "/help/call-handling#routing" },
      { title: "Transfers", href: "/help/call-handling#transfers" },
    ],
  },
  {
    icon: Settings,
    title: "Configuration",
    description: "Customize your agent's behavior and responses",
    links: [
      { title: "Voice Settings", href: "/help/configuration#voice" },
      { title: "Prompts & Scripts", href: "/help/configuration#prompts" },
      { title: "Business Hours", href: "/help/configuration#hours" },
      { title: "Languages", href: "/help/configuration#languages" },
    ],
  },
  {
    icon: Code,
    title: "API Reference",
    description: "Build custom integrations with our API",
    links: [
      { title: "Authentication", href: "/help/api#authentication" },
      { title: "Calls API", href: "/help/api#calls" },
      { title: "Contacts API", href: "/help/api#contacts" },
      { title: "Webhooks", href: "/help/api#webhooks" },
    ],
  },
  {
    icon: HelpCircle,
    title: "Support",
    description: "Get help and troubleshoot issues",
    links: [
      { title: "FAQ", href: "/help/support#faq" },
      { title: "Troubleshooting", href: "/help/support#troubleshooting" },
      { title: "Contact Support", href: "/contact" },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="py-12 sm:py-16 md:py-24">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16 sm:mb-20">
        <ScrollReveal>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-[#1b191a] heading-serif mb-4">
            Help Center
          </h1>
          <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto">
            Learn how to use RevCenter and get the most out of every feature.
          </p>
        </ScrollReveal>
      </section>

      {/* Search */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <ScrollReveal>
          <div className="relative">
            <input
              type="text"
              placeholder="Search help articles..."
              className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:border-[#1b191a] focus:ring-1 focus:ring-[#1b191a] outline-none transition-colors text-base"
            />
            <kbd className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
              /
            </kbd>
          </div>
        </ScrollReveal>
      </section>

      {/* Sections Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {sections.map((section, i) => (
            <ScrollReveal key={i} delay={i * 50}>
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 h-full">
                <div className="flex sm:block items-start gap-4 sm:gap-0 mb-3 sm:mb-0">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#1b191a]/10 flex items-center justify-center sm:mb-4 flex-shrink-0">
                    <section.icon className="w-5 h-5 sm:w-6 sm:h-6 text-[#1b191a]" />
                  </div>
                  <div className="sm:hidden min-w-0">
                    <h2 className="text-base font-semibold text-[#1b191a] mb-1">
                      {section.title}
                    </h2>
                    <p className="text-gray-600 text-sm">
                      {section.description}
                    </p>
                  </div>
                </div>
                <h2 className="hidden sm:block text-lg font-semibold text-[#1b191a] mb-2">
                  {section.title}
                </h2>
                <p className="hidden sm:block text-gray-600 text-sm mb-4">
                  {section.description}
                </p>
                <ul className="space-y-1 sm:space-y-2">
                  {section.links.map((link) => (
                    <li key={link.title}>
                      <Link
                        href={link.href}
                        className="text-sm text-gray-600 hover:text-[#1b191a] hover:underline transition-colors py-2 sm:py-0 block min-h-[44px] sm:min-h-0 flex items-center"
                      >
                        {link.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Help Banner */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <ScrollReveal>
          <div className="bg-[#f5f5f7] rounded-2xl p-8 sm:p-12 text-center">
            <h2 className="text-xl sm:text-2xl font-semibold text-[#1b191a] mb-3">
              Need help?
            </h2>
            <p className="text-gray-600 mb-6 max-w-lg mx-auto">
              Our support team is available to help you with any questions or issues.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-6 py-3.5 sm:py-3 rounded-xl bg-[#1b191a] text-white font-medium hover:bg-[#2d2a2b] transition-colors min-h-[48px]"
            >
              Contact Support
            </Link>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
