'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Navigation,
  RevCenterFooter,
  FeaturesGrid,
  ScrollReveal,
  AgentsPreviewWidget,
  DispatchSchedulerPreviewWidget,
  PipelineManagementPreviewWidget,
  CSRRecordingsPreviewWidget,
} from '@/components/landing';

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      question: "How does RevCenter integrate with Service Titan?",
      answer: "RevCenter seamlessly connects with Service Titan through our API integration. The system automatically syncs appointments, customer data, and technician schedules in real-time, ensuring your booking system is always up-to-date with your dispatch workflow."
    },
    {
      question: "What's your typical deployment timeline?",
      answer: "Most clients are fully operational within 5-7 business days. Our three-step process includes: (1) System integration with your CRM and calendar (2-3 days), (2) AI agent configuration and training (1-2 days), and (3) Live testing and optimization (1-2 days). We handle all technical setup."
    },
    {
      question: "Can the AI handle multiple languages?",
      answer: "Yes! RevCenter supports 30+ languages with mid-call language switching. The AI automatically detects the caller's language and responds naturally, making it perfect for serving diverse customer bases without hiring multilingual staff."
    },
    {
      question: "How does lead scoring work?",
      answer: "Our AI analyzes every call in real-time, scoring leads based on equipment age, urgency, customer history, and custom criteria you define. High-value opportunities are automatically flagged and prioritized in your dashboard, helping your team focus on the most profitable calls first."
    },
    {
      question: "What if a caller needs to speak to a human?",
      answer: "The AI is trained to recognize when human intervention is needed and can seamlessly transfer calls to your team. You maintain full control over transfer rules, and callers experience smooth, professional handoffs without repeating information."
    }
  ];

  return (
    <div className="min-h-screen text-[#1b191a]">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="skip-link sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-[60] focus:px-4 focus:py-2 focus:bg-[var(--color-primary)] focus:text-white"
      >
        Skip to main content
      </a>
      <Navigation />

      <main id="main-content" className="relative z-10 bg-white pt-16">
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 md:pt-24 pb-16 sm:pb-20 md:pb-24">
          <ScrollReveal>
            <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
              {/* Main Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light tracking-tight leading-[1.1] text-[#1b191a] heading-serif">
                Automate Your Calls in Minutes
              </h1>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light tracking-tight leading-[1.1] mt-2 text-[#1b191a] heading-serif">
                Book More Revenue Per Lead.
              </h1>

              {/* Description */}
              <p className="mt-6 sm:mt-8 max-w-xl text-base sm:text-lg leading-relaxed text-gray-600">
                Our AI agent simultaneously handles 100+ calls.<br className="hidden sm:block" />
                Qualifies leads, books appointments, and closes—so your team can focus on what matters.
              </p>

              {/* CTA Buttons */}
              <div className="mt-8 sm:mt-10">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Link
                    href="https://cal.com/team/revcenter/demo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-6 py-3.5 text-base font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 bg-[#1b191a] text-white hover:bg-[#2d2a2b]"
                  >
                    Book Demo
                  </Link>
                  <Link
                    href="#features"
                    className="inline-flex items-center justify-center px-6 py-3.5 text-base font-medium rounded-xl border border-gray-200 bg-white text-[#1b191a] hover:bg-gray-50 transition-all duration-200"
                  >
                    Learn More
                  </Link>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* Feature Preview Widgets */}
        <AgentsPreviewWidget />
        <DispatchSchedulerPreviewWidget />
        <PipelineManagementPreviewWidget />
        <CSRRecordingsPreviewWidget />

        {/* Features Grid */}
        <FeaturesGrid />

        {/* FAQ Section */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 md:py-24">
          <ScrollReveal delay={200}>
            <div className="space-y-6 sm:space-y-8">
              <div className="space-y-2 sm:space-y-3 text-center px-4">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-normal tracking-tight text-[#1b191a] heading-serif">
                  Frequently Asked Questions
                </h2>
                <p className="text-sm sm:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed text-gray-600">
                  Everything you need to know about getting started with RevCenter
                </p>
              </div>

              <div className="max-w-3xl mx-auto space-y-2 sm:space-y-3" role="region" aria-label="Frequently Asked Questions">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg sm:rounded-xl overflow-hidden transition-all duration-300 bg-white ${
                      openFaq === index
                        ? 'border-gray-300 shadow-lg'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <button
                      onClick={() => toggleFaq(index)}
                      aria-expanded={openFaq === index}
                      aria-controls={`faq-answer-${index}`}
                      id={`faq-question-${index}`}
                      className="w-full flex items-center justify-between p-4 sm:p-5 md:p-6 text-left"
                    >
                      <span className="text-sm sm:text-base font-semibold pr-3 sm:pr-4 text-[#1b191a]">{faq.question}</span>
                      <span className={`text-xl sm:text-2xl transition-all duration-300 flex-shrink-0 ${
                        openFaq === index
                          ? 'rotate-45 text-[#1b191a]'
                          : 'text-gray-400'
                      }`} aria-hidden="true">+</span>
                    </button>
                    <div
                      id={`faq-answer-${index}`}
                      role="region"
                      aria-labelledby={`faq-question-${index}`}
                      hidden={openFaq !== index}
                      className={`transition-all duration-300 ease-in-out ${
                      openFaq === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}>
                      <div className="px-4 sm:px-5 md:px-6 pb-4 sm:pb-5 md:pb-6">
                        <p className="text-xs sm:text-sm leading-relaxed text-gray-600">{faq.answer}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </section>
      </main>

      <RevCenterFooter />
    </div>
  );
}
