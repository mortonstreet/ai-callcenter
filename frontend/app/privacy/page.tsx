'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function PrivacyPolicy() {
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
                  alt="RevCenter Logo" 
                  className="h-[70px] sm:h-[90px] md:h-[110px] w-auto"
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
        <h1 className="text-3xl sm:text-4xl font-bold text-[#1b191a] mb-8">Privacy Policy</h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-6">
            <strong>Last updated:</strong> December 24, 2025
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1b191a] mb-4">1. Introduction</h2>
            <p className="text-gray-600 mb-4">
              RevCenter (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered call center services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1b191a] mb-4">2. Information We Collect</h2>
            <p className="text-gray-600 mb-4">We may collect the following types of information:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li><strong>Personal Information:</strong> Name, email address, phone number, and business information you provide when creating an account.</li>
              <li><strong>Call Data:</strong> Call recordings, transcripts, and metadata associated with calls processed through our platform.</li>
              <li><strong>Usage Data:</strong> Information about how you interact with our services, including log data, device information, and analytics.</li>
              <li><strong>Integration Data:</strong> Data from third-party services you connect to RevCenter, such as CRM systems and calendars.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1b191a] mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-600 mb-4">We use the collected information to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Provide, maintain, and improve our AI call center services</li>
              <li>Process and complete transactions</li>
              <li>Send you technical notices, updates, and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Train and improve our AI models (using anonymized data)</li>
              <li>Detect, prevent, and address technical issues and security threats</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1b191a] mb-4">4. Data Sharing and Disclosure</h2>
            <p className="text-gray-600 mb-4">
              We do not sell your personal information. We may share your information with:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li><strong>Service Providers:</strong> Third-party vendors who assist in providing our services</li>
              <li><strong>Business Partners:</strong> With your consent, to facilitate integrations you request</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1b191a] mb-4">5. Data Security</h2>
            <p className="text-gray-600 mb-4">
              We implement industry-standard security measures to protect your data, including:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>SOC 2 Type II certification</li>
              <li>End-to-end encryption for all data in transit and at rest</li>
              <li>Regular security audits and penetration testing</li>
              <li>Access controls and authentication requirements</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1b191a] mb-4">6. Data Retention</h2>
            <p className="text-gray-600 mb-4">
              We retain your information for as long as your account is active or as needed to provide services. You may request deletion of your data at any time by contacting us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1b191a] mb-4">7. Your Rights</h2>
            <p className="text-gray-600 mb-4">Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict certain processing</li>
              <li>Data portability</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-[#1b191a] mb-4">8. Contact Us</h2>
            <p className="text-gray-600 mb-4">
              If you have questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <p className="text-gray-600">
              <strong>Email:</strong> privacy@revcenter.com<br />
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
