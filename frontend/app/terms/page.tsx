'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function TermsAndConditions() {
  const [imageError, setImageError] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Navigation - Full width translucent */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-200/50' 
          : 'bg-white/70 backdrop-blur-lg'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 md:h-24">
            {/* Logo */}
            <Link href="/" className="flex items-center flex-shrink-0">
              {!imageError ? (
                <img 
                  src="/revcenter-logo.svg" 
                  alt="REVCENTER" 
                  className="h-5 sm:h-5 md:h-[20px] w-auto"
                  loading="eager"
                  fetchPriority="high"
                  onError={() => setImageError(true)}
                />
              ) : (
                <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-tighter text-[#1b191a]">
                  RevCenter
                </span>
              )}
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden sm:flex items-center gap-2 sm:gap-3">
              <Link 
                href="https://cal.com/team/revcenter/demo" 
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 sm:px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 bg-white/80 text-[#1b191a] hover:bg-white hover:border-gray-400 transition-all duration-200"
              >
                Book a demo
              </Link>
              <Link 
                href="/login" 
                className="px-3 sm:px-4 py-2 text-sm font-medium rounded-lg bg-[#1b191a] text-white hover:bg-[#2d2a2b] transition-all duration-200"
              >
                Sign in
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="sm:hidden p-2 -mr-2 text-[#1b191a] hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <div className={`sm:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="px-4 pb-4 pt-2 space-y-2 bg-white/95 backdrop-blur-xl border-t border-gray-100">
            <Link 
              href="https://cal.com/team/revcenter/demo" 
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full px-4 py-3 text-center text-sm font-medium rounded-lg border border-gray-200 bg-white text-[#1b191a] hover:bg-gray-50 transition-all duration-200" 
              onClick={() => setMobileMenuOpen(false)}
            >
              Book a demo
            </Link>
            <Link 
              href="/login" 
              className="block w-full px-4 py-3 text-center text-sm font-medium rounded-lg bg-[#1b191a] text-white hover:bg-[#2d2a2b] transition-all duration-200" 
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-32 sm:pt-36 md:pt-40 pb-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#1b191a] mb-8">Terms & Conditions</h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-6">
            <strong>Last updated:</strong> December 24, 2025
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1b191a] mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-600 mb-4">
              By accessing or using RevCenter&apos;s services, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1b191a] mb-4">2. Description of Services</h2>
            <p className="text-gray-600 mb-4">
              RevCenter provides AI-powered call center automation services, including but not limited to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Automated call handling and response</li>
              <li>Lead qualification and scoring</li>
              <li>Appointment scheduling and calendar integration</li>
              <li>CRM integration (including Service Titan)</li>
              <li>Call analytics and reporting</li>
              <li>Multi-language support</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1b191a] mb-4">3. Account Registration</h2>
            <p className="text-gray-600 mb-4">
              To use our services, you must create an account. You agree to:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Promptly update any changes to your information</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1b191a] mb-4">4. Acceptable Use</h2>
            <p className="text-gray-600 mb-4">You agree not to use RevCenter&apos;s services to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on the rights of others</li>
              <li>Transmit harmful, fraudulent, or deceptive content</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with the proper functioning of our services</li>
              <li>Use for any illegal telemarketing or spam activities</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1b191a] mb-4">5. Payment Terms</h2>
            <p className="text-gray-600 mb-4">
              If you subscribe to a paid plan:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Fees are billed in advance on a monthly or annual basis</li>
              <li>All fees are non-refundable unless otherwise stated</li>
              <li>We may change pricing with 30 days&apos; notice</li>
              <li>You are responsible for all applicable taxes</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1b191a] mb-4">6. Intellectual Property</h2>
            <p className="text-gray-600 mb-4">
              RevCenter and its licensors retain all rights to the service, including all software, content, and trademarks. You are granted a limited, non-exclusive license to use the service for its intended purpose.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1b191a] mb-4">7. Data and Privacy</h2>
            <p className="text-gray-600 mb-4">
              Your use of our services is also governed by our <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>. By using RevCenter, you consent to our collection and use of data as described therein.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1b191a] mb-4">8. Service Level Agreement</h2>
            <p className="text-gray-600 mb-4">
              RevCenter strives to maintain 99.9% uptime for our services. In the event of extended downtime, eligible customers may receive service credits as outlined in their service agreement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1b191a] mb-4">9. Limitation of Liability</h2>
            <p className="text-gray-600 mb-4">
              To the maximum extent permitted by law, RevCenter shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1b191a] mb-4">10. Indemnification</h2>
            <p className="text-gray-600 mb-4">
              You agree to indemnify and hold harmless RevCenter and its officers, directors, employees, and agents from any claims, damages, or expenses arising from your use of the service or violation of these terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1b191a] mb-4">11. Termination</h2>
            <p className="text-gray-600 mb-4">
              Either party may terminate the service agreement at any time. Upon termination:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Your access to the service will be disabled</li>
              <li>You may request export of your data within 30 days</li>
              <li>Outstanding fees remain payable</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1b191a] mb-4">12. Modifications to Terms</h2>
            <p className="text-gray-600 mb-4">
              We reserve the right to modify these terms at any time. We will notify you of material changes via email or through the service. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1b191a] mb-4">13. Governing Law</h2>
            <p className="text-gray-600 mb-4">
              These terms shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to conflict of law principles.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1b191a] mb-4">14. Contact Information</h2>
            <p className="text-gray-600 mb-4">
              For questions about these Terms and Conditions, please contact us at:
            </p>
            <p className="text-gray-600">
              <strong>Email:</strong> legal@revcenter.com<br />
              <strong>Address:</strong> RevCenter, Inc.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} RevCenter. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-xs text-gray-500 hover:text-[#1b191a]">Privacy Policy</Link>
            <Link href="/terms" className="text-xs text-gray-500 hover:text-[#1b191a]">Terms & Conditions</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
