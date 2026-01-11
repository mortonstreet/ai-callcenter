'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Home() {
  const [imageError, setImageError] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Preload SVG logo
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = '/revcenter-logo.svg';
    document.head.appendChild(link);
  }, []);

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const animatedElements = document.querySelectorAll('.animate-on-scroll');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('is-visible');
          }, index * 100);
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1
    });

    animatedElements.forEach(element => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);


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
    <div className="min-h-screen bg-white text-gray-900">
      <style jsx global>{`
        /* Base responsive resets */
        * {
          box-sizing: border-box;
        }

        /* SVG Rendering Optimization for Mobile */
        img[src$=".svg"] {
          shape-rendering: geometricPrecision;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          image-rendering: -webkit-optimize-contrast;
        }

        svg {
          shape-rendering: geometricPrecision;
        }

        /* Scroll animations */
        .animate-on-scroll {
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .animate-on-scroll.is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* Card hover effects - Desktop only */
        @media (min-width: 1024px) {
          .feature-card-enhanced {
            position: relative;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            transform-style: preserve-3d;
          }

          .feature-card-enhanced:hover {
            transform: translateY(-12px) scale(1.02);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
          }

          .feature-card-enhanced::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, transparent 0%, rgba(59, 130, 246, 0.05) 100%);
            opacity: 0;
            transition: opacity 0.4s ease;
            border-radius: 1rem;
            pointer-events: none;
          }

          .feature-card-enhanced:hover::before {
            opacity: 1;
          }
        }

        /* Mobile: Simple shadow on cards */
        @media (max-width: 1023px) {
          .feature-card-enhanced {
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
        }

        /* 3D Pipeline perspective - Desktop/Tablet only */
        @media (min-width: 768px) {
          .pipeline-container {
            perspective: 1000px;
            perspective-origin: center top;
          }

          .pipeline-item {
            transform: rotateX(5deg);
            transition: transform 0.3s ease;
          }

          .pipeline-item:hover {
            transform: rotateX(0deg) translateZ(10px);
          }
        }

        /* Pulse animations */
        @keyframes pulse-ring {
          0% {
            transform: scale(0.8);
            opacity: 1;
          }
          100% {
            transform: scale(1.2);
            opacity: 0;
          }
        }

        .pulse-ring {
          animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        /* Gradient backgrounds */
        .gradient-bg-blue {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        }

        .gradient-bg-purple {
          background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
        }

        .gradient-bg-green {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }

        /* Transcript highlight */
        .transcript-highlight {
          background: linear-gradient(120deg, #3b82f6 0%, #8b5cf6 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* Smooth scroll behavior */
        html {
          scroll-behavior: smooth;
        }

        /* Mobile optimizations */
        @media (max-width: 767px) {
          .mobile-text-sm {
            font-size: 0.875rem;
          }
          
          .mobile-padding-reduce {
            padding: 1rem;
          }
        }

        /* Tablet optimizations */
        @media (min-width: 768px) and (max-width: 1023px) {
          .tablet-grid-2 {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* Prevent horizontal scroll */
        body {
          overflow-x: hidden;
        }
      `}</style>

      {/* Sticky Navigation - Full width translucent */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-200/50'
          : 'bg-white/70 backdrop-blur-lg'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center flex-shrink-0">
              {!imageError ? (
                <img 
                  src="/revcenter-logo.svg" 
                  alt="REVCENTER" 
                  className="h-5 sm:h-5 md:h-[20px] w-auto"
                  loading="eager"
                  fetchPriority="high"
                  style={{ shapeRendering: 'geometricPrecision' }}
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

            {/* Mobile Navigation */}
            <div className="flex sm:hidden items-center gap-2">
              {/* Mobile Menu Button */}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
                className="p-2 -mr-2 rounded-lg transition-colors text-[#1b191a] hover:bg-gray-100"
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
              >
                <svg 
                  className="w-6 h-6" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <div className={`sm:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="px-4 pb-4 pt-2 space-y-2 backdrop-blur-xl border-t bg-white/95 border-gray-100">
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

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 md:pt-32 pb-16 sm:pb-20 md:pb-24 space-y-16 sm:space-y-24 md:space-y-32">
        {/* Hero Section - Clean Centered Design */}
        <section className="relative animate-on-scroll py-8 sm:py-12 md:py-16">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            {/* Main Headline */}
            <h1 className={`text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-[1.15] text-[#1b191a]`}>
              Automate Your Calls in Minutes
            </h1>
            <h1 className={`text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-[1.15] mt-1 text-[#1b191a]`}>
              Book More Revenue Per Lead.
            </h1>
            
            {/* Description */}
            <p className={`mt-5 sm:mt-6 max-w-xl text-sm sm:text-base leading-relaxed text-gray-600`}>
              Our AI agent simultaneously handles 100+ calls.<br className="hidden sm:block" />
              Qualifies leads, books appointments, and closes—so your team can focus on what matters.
            </p>

            {/* CTA Buttons */}
            <div className="mt-6 sm:mt-8">
              <div className="flex flex-col gap-2.5 sm:gap-3 w-64 sm:w-72">
                <Link 
                  href="https://cal.com/team/revcenter/demo" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-full inline-flex items-center justify-center px-5 py-3 text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 bg-[#1b191a] text-white hover:bg-[#2d2a2b]"
                >
                  Book Demo
                </Link>
                <Link 
                  href="#listen-demo"
                  className="w-full inline-flex items-center justify-center px-5 py-3 text-sm font-medium rounded-lg border border-gray-200 bg-white text-[#1b191a] hover:bg-gray-50 transition-all duration-200"
                >
                  Listen to a Live Call
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FSM Integration & Outbound Campaigns Section */}
        <section className={`animate-on-scroll rounded-2xl sm:rounded-3xl bg-[#f5f5f7]`}>
          {/* Main Two-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left Column - FSM Integration */}
            <div className={`p-6 sm:p-8 md:p-10 lg:p-12 border-gray-200 md:border-r`}>
              <h3 className={`text-lg sm:text-xl font-semibold mb-3 text-[#1b191a]`}>
                End to End Automation
              </h3>
              <p className={`text-sm leading-relaxed mb-6 text-gray-600`}>
                Our AI captures every detail and syncs directly with your FSM—ServiceTitan, FieldPulse, Service Fusion, and more. Zero manual data entry.
              </p>
              
              {/* FSM Integration Visual - Clean Design */}
              <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-200">
                {/* Simple Flow Diagram */}
                <div className="flex items-center justify-between gap-4">
                  {/* Input Channels */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <div className="w-10 h-10 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center text-sm">📞</div>
                    <div className="w-10 h-10 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center text-sm">💬</div>
                    <div className="w-10 h-10 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center text-sm">✉️</div>
                  </div>
                  
                  {/* Arrow */}
                  <div className="flex-1 flex items-center justify-center">
                    <div className="h-px bg-gray-300 flex-1 max-w-16"></div>
                    <svg className="w-4 h-4 text-gray-400 -ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                  
                  {/* RevCenter Hub */}
                  <div className="w-14 h-14 bg-[#1b191a] rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                  </div>
                  
                  {/* Arrow */}
                  <div className="flex-1 flex items-center justify-center">
                    <div className="h-px bg-gray-300 flex-1 max-w-16"></div>
                    <svg className="w-4 h-4 text-gray-400 -ml-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                  
                  {/* FSM Output */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-10 h-10 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center text-xs font-medium text-gray-500">FSM</div>
                    <span className="text-[10px] text-gray-400">Auto-Sync</span>
                  </div>
                </div>
                
                {/* ServiceTitan Integration Badge */}
                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-center gap-2">
                  <span className="text-xs text-gray-500">Integrates with</span>
                  <img 
                    src="/st-logo.svg" 
                    alt="ServiceTitan" 
                    className="h-4 w-auto"
                    style={{ shapeRendering: 'geometricPrecision' }}
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Outbound Drip Campaigns */}
            <div className="p-6 sm:p-8 md:p-10 lg:p-12">
              <h3 className={`text-lg sm:text-xl font-semibold mb-3 text-[#1b191a]`}>
                Drip Campaigns
              </h3>
              <p className={`text-sm leading-relaxed mb-6 text-gray-600`}>
                Outbound nurturing and follow-up sequences. Voice, SMS, and email campaigns to convert cold leads and re-engage existing customers.
              </p>
              
              {/* Outbound Campaign Flow - Premium Design */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Campaign Timeline */}
                <div className="p-5 sm:p-6">
                  <div className="relative">
                    {/* Timeline Line */}
                    <div className="absolute left-[11px] top-3 bottom-3 w-[2px] bg-gradient-to-b from-[#1b191a] via-gray-300 to-green-500"></div>
                    
                    {/* Day 0 */}
                    <div className="relative flex gap-4 pb-5">
                      <div className="w-6 h-6 rounded-full bg-[#1b191a] flex items-center justify-center flex-shrink-0 z-10">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                      <div className="flex-1 -mt-0.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-[#1b191a]">Day 0</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">SMS</span>
                        </div>
                        <p className="text-xs text-gray-500">Initial outreach sent</p>
                      </div>
                    </div>
                    
                    {/* Day 2 */}
                    <div className="relative flex gap-4 pb-5">
                      <div className="w-6 h-6 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center flex-shrink-0 z-10">
                        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                      </div>
                      <div className="flex-1 -mt-0.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-600">Day 2</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded font-medium">Email</span>
                        </div>
                        <p className="text-xs text-gray-500">Follow-up if no response</p>
                      </div>
                    </div>
                    
                    {/* Day 5 */}
                    <div className="relative flex gap-4 pb-5">
                      <div className="w-6 h-6 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center flex-shrink-0 z-10">
                        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                      </div>
                      <div className="flex-1 -mt-0.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-600">Day 5</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded font-medium">Voice</span>
                        </div>
                        <p className="text-xs text-gray-500">AI call to re-engage</p>
                      </div>
                    </div>
                    
                    {/* Converted */}
                    <div className="relative flex gap-4">
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 z-10">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1 -mt-0.5">
                        <span className="text-xs font-semibold text-green-600">Converted</span>
                        <p className="text-xs text-gray-500">Job booked</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Inbound Lead Handling & Human in Loop Section */}
        <section className={`animate-on-scroll rounded-2xl sm:rounded-3xl bg-[#f5f5f7]`}>
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left - Inbound Lead Handling */}
            <div className={`p-6 sm:p-8 md:p-10 lg:p-12 border-gray-200 md:border-r`}>
              <h3 className={`text-lg sm:text-xl font-semibold mb-3 text-[#1b191a]`}>
                Inbound Lead Handling
              </h3>
              <p className={`text-sm leading-relaxed mb-6 text-gray-600`}>
                Instantly receive and qualify inbound calls. Identify callers, understand intent, and route to the right outcome.
              </p>
              
              {/* Inbound Flow Diagram - Premium Design */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Call Routing Visual */}
                <div className="p-5 sm:p-6">
                  {/* Incoming Call Header */}
                  <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                    <div className="w-10 h-10 bg-[#1b191a] rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[#1b191a]">Inbound Call</div>
                      <div className="text-xs text-gray-500">AI answers in &lt;1 second</div>
                    </div>
                    <div className="ml-auto">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-full">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-[10px] font-medium text-green-600">Live</span>
                      </span>
                    </div>
                  </div>
                  
                  {/* Routing Options */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-[#1b191a]">Book Job</span>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">Schedule directly into FSM</p>
                    </div>
                    
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-md bg-orange-100 flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-[#1b191a]">Transfer</span>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">Route to dispatcher</p>
                    </div>
                    
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-[#1b191a]">Capture</span>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">Save lead for follow-up</p>
                    </div>
                    
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-md bg-green-100 flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-[#1b191a]">Resolve</span>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">Handle inquiry on call</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Human in the Loop */}
            <div className="p-6 sm:p-8 md:p-10 lg:p-12">
              <h3 className={`text-lg sm:text-xl font-semibold mb-3 text-[#1b191a]`}>
                Human in the Loop
              </h3>
              <p className={`text-sm leading-relaxed mb-6 text-gray-600`}>
                Seamless handoff between AI agent and your dispatcher. Escalate complex calls instantly when a human touch is needed.
              </p>
              
              {/* AI to Dispatcher Connection - Clean Design */}
              <div className="bg-white rounded-xl p-6 sm:p-8 border border-gray-200">
                {/* Connection Visual */}
                <div className="flex items-center justify-center gap-4 sm:gap-6">
                  {/* AI Agent */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 bg-[#1b191a] rounded-xl flex items-center justify-center">
                      <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-gray-600">AI Agent</span>
                  </div>
                  
                  {/* Connection Line with Indicator */}
                  <div className="flex items-center gap-2">
                    <div className="h-px w-8 bg-gray-300"></div>
                    <div className="px-3 py-1 bg-orange-100 rounded-full border border-orange-200">
                      <span className="text-xs font-medium text-orange-600">Escalate</span>
                    </div>
                    <div className="h-px w-8 bg-gray-300"></div>
                  </div>
                  
                  {/* Dispatcher */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-center">
                      <svg className="w-7 h-7 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 18v-6a9 9 0 0118 0v6" />
                        <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3v5zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3v5z" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-gray-600">Dispatcher</span>
                  </div>
                </div>
                
                {/* Status Text */}
                <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                  <span className="text-xs italic text-gray-500">Instant handoff when needed</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section - Fully Responsive */}
        <section className="space-y-6 sm:space-y-8 animate-on-scroll">
          <div className="space-y-2 sm:space-y-3 text-center px-4">
            <h2 className={`text-2xl sm:text-3xl md:text-4xl font-bold text-[#1b191a]`}>Frequently Asked Questions</h2>
            <p className={`text-sm sm:text-base lg:text-lg max-w-2xl mx-auto leading-relaxed text-gray-600`}>
              Everything you need to know about getting started with RevCenter
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-2 sm:space-y-3">
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
                  className="w-full flex items-center justify-between p-4 sm:p-5 md:p-6 text-left"
                >
                  <span className={`text-sm sm:text-base font-semibold pr-3 sm:pr-4 text-[#1b191a]`}>{faq.question}</span>
                  <span className={`text-xl sm:text-2xl transition-all duration-300 flex-shrink-0 ${
                    openFaq === index 
                      ? 'rotate-45 text-blue-500' 
                      : 'text-gray-400'
                  }`}>+</span>
                </button>
                <div className={`transition-all duration-300 ease-in-out ${
                  openFaq === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="px-4 sm:px-5 md:px-6 pb-4 sm:pb-5 md:pb-6">
                    <p className={`text-xs sm:text-sm leading-relaxed text-gray-600`}>{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Footer - Clean Full Width */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-8 sm:pb-12">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">
            {/* Logo Section */}
            <div className="md:col-span-5">
              <Link href="/" className="inline-block">
                {!imageError ? (
                  <img 
                    src="/revcenter-logo.svg" 
                    alt="RevCenter Logo" 
                    className="h-5 sm:h-5 md:h-[20px] w-auto"
                    loading="lazy"
                    style={{ shapeRendering: 'geometricPrecision' }}
                  />
                ) : (
                  <div className={`text-3xl font-black tracking-tighter text-[#1b191a]`}>
                    RevCenter
                  </div>
                )}
              </Link>
            </div>

            {/* Links Columns */}
            <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
              {/* Company Column */}
              <div>
                <h4 className={`text-sm font-medium mb-4 text-gray-500`}>
                  Company
                </h4>
                <ul className="space-y-3">
                  <li>
                    <Link 
                      href="/careers"
                      className={`text-sm font-medium transition-colors text-gray-700 hover:text-[#1b191a]`}
                    >
                      Careers
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Legal Column */}
              <div>
                <h4 className={`text-sm font-medium mb-4 text-gray-500`}>
                  Legal
                </h4>
                <ul className="space-y-3">
                  <li>
                    <Link 
                      href="/privacy"
                      className={`text-sm font-medium transition-colors text-gray-700 hover:text-[#1b191a]`}
                    >
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="/terms"
                      className={`text-sm font-medium transition-colors text-gray-700 hover:text-[#1b191a]`}
                    >
                      Terms & Conditions
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Industries Column */}
              <div className="col-span-2 sm:col-span-1">
                <h4 className={`text-sm font-medium mb-4 text-gray-500`}>
                  Industries
                </h4>
                <ul className="space-y-3">
                  <li>
                    <span className={`text-sm font-medium text-gray-700`}>
                      HVAC
                    </span>
                  </li>
                  <li>
                    <span className={`text-sm font-medium text-gray-700`}>
                      Plumbing
                    </span>
                  </li>
                  <li>
                    <span className={`text-sm font-medium text-gray-700`}>
                      Electrical
                    </span>
                  </li>
                  <li>
                    <span className={`text-sm font-medium text-gray-700`}>
                      Pest Control
                    </span>
                  </li>
                  <li>
                    <span className={`text-sm font-medium text-gray-700`}>
                      Roofing
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-16 sm:mt-20">
            <p className={`text-sm text-gray-500`}>
              © RevCenter Inc. All Rights Reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
