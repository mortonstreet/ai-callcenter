"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type FooterLink = {
  label: string;
  href: string;
};

const footerLinks: Record<string, FooterLink[]> = {
  Products: [
    { label: "Inbound Calls", href: "/products/inbound-calls" },
    { label: "Drip Campaigns", href: "/products/drip-campaigns" },
    { label: "FSM Integrations", href: "/products/integrations" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" },
  ],
  Industries: [
    { label: "HVAC", href: "/industries/hvac" },
    { label: "Plumbing", href: "/industries/plumbing" },
    { label: "Electrical", href: "/industries/electrical" },
    { label: "Pest Control", href: "/industries/pest-control" },
    { label: "Roofing", href: "/industries/roofing" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

const footerCategories = Object.keys(footerLinks);

export default function RevCenterFooter() {
  const footerRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.05, rootMargin: "50px" }
    );

    if (footerRef.current) {
      observer.observe(footerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <footer
      ref={footerRef}
      className="relative bg-[#1b191a] text-white"
      style={{
        position: "sticky",
        bottom: 0,
        zIndex: 0,
        minHeight: "calc(100vh - 64px)",
      }}
    >
      {/* Grain texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          opacity: 0.08,
          mixBlendMode: "overlay",
        }}
      />

      {/* Mission statement hero section */}
      <div className="relative z-10 pt-16 sm:pt-24 md:pt-40 lg:pt-48 pb-10 sm:pb-16 md:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Mission statement */}
          <h2
            className={`text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-light leading-[1.15] max-w-3xl transition-all ease-out heading-serif ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-12"
            }`}
            style={{
              transitionDuration: "1400ms",
              transitionDelay: "250ms",
            }}
          >
            Automate calls. Book more revenue.
          </h2>
        </div>
      </div>

      {/* Footer links section */}
      <div className="relative z-10 border-t border-white/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-10 lg:gap-16">
            {footerCategories.map((category, categoryIndex) => (
              <div
                key={category}
                className={`transition-all ease-out ${
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-10"
                }`}
                style={{
                  transitionDuration: "1200ms",
                  transitionDelay: `${500 + categoryIndex * 150}ms`,
                }}
              >
                <h4
                  className={`font-semibold text-base sm:text-lg mb-3 sm:mb-6 text-white transition-all ease-out ${
                    isVisible
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-6"
                  }`}
                  style={{
                    transitionDuration: "1000ms",
                    transitionDelay: `${600 + categoryIndex * 150}ms`,
                  }}
                >
                  {category}
                </h4>
                <ul className="space-y-2.5 sm:space-y-4">
                  {footerLinks[category].map((link, linkIndex) => (
                    <li
                      key={link.label}
                      className={`transition-all ease-out ${
                        isVisible
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-4"
                      }`}
                      style={{
                        transitionDuration: "1000ms",
                        transitionDelay: `${700 + categoryIndex * 150 + linkIndex * 80}ms`,
                      }}
                    >
                      <Link
                        href={link.href}
                        className="text-white/70 hover:text-white text-xs sm:text-sm transition-colors duration-300"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className={`relative z-10 border-t border-white/15 transition-all ease-out ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
        style={{
          transitionDuration: "1200ms",
          transitionDelay: "1200ms",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div
              className={`flex flex-wrap items-center gap-4 sm:gap-6 transition-all ease-out ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
              style={{
                transitionDuration: "1000ms",
                transitionDelay: "1400ms",
              }}
            >
              <Link href="/" className="flex items-center gap-2">
                <img
                  src="/revcenter-logo.svg"
                  alt="RevCenter"
                  className="h-4 w-auto invert"
                  style={{ shapeRendering: 'geometricPrecision' }}
                />
              </Link>
              <div className="flex items-center gap-4">
                <Link
                  href="/privacy"
                  className="text-xs sm:text-sm text-white/50 hover:text-white transition-colors duration-300"
                >
                  Privacy
                </Link>
                <Link
                  href="/terms"
                  className="text-xs sm:text-sm text-white/50 hover:text-white transition-colors duration-300"
                >
                  Terms
                </Link>
              </div>
            </div>
            <div
              className={`flex items-center gap-2 sm:gap-3 transition-all ease-out ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
              style={{
                transitionDuration: "1000ms",
                transitionDelay: "1500ms",
              }}
            >
              <p className="text-xs sm:text-sm text-white/60">
                © {new Date().getFullYear()} RevCenter Inc.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
