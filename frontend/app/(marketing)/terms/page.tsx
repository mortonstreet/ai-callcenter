"use client";

import Link from "next/link";
import { ScrollReveal } from "@/components/landing";

export default function TermsAndConditions() {
  return (
    <div className="py-12 sm:py-16 md:py-24">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 sm:mb-16">
        <ScrollReveal>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-[#1b191a] heading-serif mb-4">
            Terms &amp; Conditions
          </h1>
          <p className="text-gray-500 text-sm">
            Last updated: December 24, 2025
          </p>
        </ScrollReveal>
      </section>

      {/* Content */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-10">
          <ScrollReveal>
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-light tracking-tight text-[#1b191a] heading-serif">
                1. Agreement to Terms
              </h2>
              <p className="text-gray-600 leading-relaxed">
                By accessing or using RevCenter&apos;s services, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-light tracking-tight text-[#1b191a] heading-serif">
                2. Description of Services
              </h2>
              <p className="text-gray-600 leading-relaxed">
                RevCenter provides AI-powered call center automation services, including but not limited to:
              </p>
              <ul className="space-y-3 text-gray-600">
                <li className="flex gap-3">
                  <span className="text-[#1b191a] font-medium">•</span>
                  <span>Automated call handling and response</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#1b191a] font-medium">•</span>
                  <span>Lead qualification and scoring</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#1b191a] font-medium">•</span>
                  <span>Appointment scheduling and calendar integration</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#1b191a] font-medium">•</span>
                  <span>CRM integration (including Service Titan)</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#1b191a] font-medium">•</span>
                  <span>Call analytics and reporting</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#1b191a] font-medium">•</span>
                  <span>Multi-language support</span>
                </li>
              </ul>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-light tracking-tight text-[#1b191a] heading-serif">
                3. Account Registration
              </h2>
              <p className="text-gray-600 leading-relaxed">
                To use our services, you must create an account. You agree to:
              </p>
              <ul className="space-y-3 text-gray-600">
                <li className="flex gap-3">
                  <span className="text-[#1b191a] font-medium">•</span>
                  <span>Provide accurate and complete registration information</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#1b191a] font-medium">•</span>
                  <span>Maintain the security of your account credentials</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#1b191a] font-medium">•</span>
                  <span>Promptly update any changes to your information</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#1b191a] font-medium">•</span>
                  <span>Accept responsibility for all activities under your account</span>
                </li>
              </ul>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-light tracking-tight text-[#1b191a] heading-serif">
                4. Acceptable Use
              </h2>
              <p className="text-gray-600 leading-relaxed">
                You agree not to use RevCenter&apos;s services to:
              </p>
              <ul className="space-y-3 text-gray-600">
                <li className="flex gap-3">
                  <span className="text-[#1b191a] font-medium">•</span>
                  <span>Violate any applicable laws or regulations</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#1b191a] font-medium">•</span>
                  <span>Infringe on the rights of others</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#1b191a] font-medium">•</span>
                  <span>Transmit harmful, fraudulent, or deceptive content</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#1b191a] font-medium">•</span>
                  <span>Attempt to gain unauthorized access to our systems</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#1b191a] font-medium">•</span>
                  <span>Interfere with the proper functioning of our services</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#1b191a] font-medium">•</span>
                  <span>Use for any illegal telemarketing or spam activities</span>
                </li>
              </ul>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-light tracking-tight text-[#1b191a] heading-serif">
                5. Payment Terms
              </h2>
              <p className="text-gray-600 leading-relaxed">
                If you subscribe to a paid plan:
              </p>
              <ul className="space-y-3 text-gray-600">
                <li className="flex gap-3">
                  <span className="text-[#1b191a] font-medium">•</span>
                  <span>Fees are billed in advance on a monthly or annual basis</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#1b191a] font-medium">•</span>
                  <span>All fees are non-refundable unless otherwise stated</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#1b191a] font-medium">•</span>
                  <span>We may change pricing with 30 days&apos; notice</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#1b191a] font-medium">•</span>
                  <span>You are responsible for all applicable taxes</span>
                </li>
              </ul>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-light tracking-tight text-[#1b191a] heading-serif">
                6. Intellectual Property
              </h2>
              <p className="text-gray-600 leading-relaxed">
                RevCenter and its licensors retain all rights to the service, including all software, content, and trademarks. You are granted a limited, non-exclusive license to use the service for its intended purpose.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-light tracking-tight text-[#1b191a] heading-serif">
                7. Data and Privacy
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Your use of our services is also governed by our{" "}
                <Link href="/privacy" className="text-[#1b191a] font-medium hover:underline underline-offset-2">
                  Privacy Policy
                </Link>
                . By using RevCenter, you consent to our collection and use of data as described therein.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-light tracking-tight text-[#1b191a] heading-serif">
                8. Service Level Agreement
              </h2>
              <p className="text-gray-600 leading-relaxed">
                RevCenter strives to maintain 99.9% uptime for our services. In the event of extended downtime, eligible customers may receive service credits as outlined in their service agreement.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-light tracking-tight text-[#1b191a] heading-serif">
                9. Limitation of Liability
              </h2>
              <p className="text-gray-600 leading-relaxed">
                To the maximum extent permitted by law, RevCenter shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-light tracking-tight text-[#1b191a] heading-serif">
                10. Indemnification
              </h2>
              <p className="text-gray-600 leading-relaxed">
                You agree to indemnify and hold harmless RevCenter and its officers, directors, employees, and agents from any claims, damages, or expenses arising from your use of the service or violation of these terms.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-light tracking-tight text-[#1b191a] heading-serif">
                11. Termination
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Either party may terminate the service agreement at any time. Upon termination:
              </p>
              <ul className="space-y-3 text-gray-600">
                <li className="flex gap-3">
                  <span className="text-[#1b191a] font-medium">•</span>
                  <span>Your access to the service will be disabled</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#1b191a] font-medium">•</span>
                  <span>You may request export of your data within 30 days</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-[#1b191a] font-medium">•</span>
                  <span>Outstanding fees remain payable</span>
                </li>
              </ul>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-light tracking-tight text-[#1b191a] heading-serif">
                12. Modifications to Terms
              </h2>
              <p className="text-gray-600 leading-relaxed">
                We reserve the right to modify these terms at any time. We will notify you of material changes via email or through the service. Continued use after changes constitutes acceptance.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-light tracking-tight text-[#1b191a] heading-serif">
                13. Governing Law
              </h2>
              <p className="text-gray-600 leading-relaxed">
                These terms shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to conflict of law principles.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-light tracking-tight text-[#1b191a] heading-serif">
                14. Contact Information
              </h2>
              <p className="text-gray-600 leading-relaxed">
                For questions about these Terms and Conditions, please contact us at:
              </p>
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <p className="text-gray-600">
                  <strong className="text-[#1b191a]">Email:</strong> legal@revcenter.com
                </p>
                <p className="text-gray-600 mt-1">
                  <strong className="text-[#1b191a]">Address:</strong> RevCenter, Inc.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
