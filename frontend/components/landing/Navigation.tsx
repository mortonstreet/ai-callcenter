"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Phone, CalendarClock, Users, Briefcase, FileText, Menu, X, Zap, Globe } from "lucide-react";
import Button from "@/components/ui/Button";

const productsMenu = [
  {
    id: "inbound",
    title: "Inbound Calls",
    description: "AI answers and qualifies inbound calls 24/7",
    icon: Phone,
    href: "/products/inbound-calls",
    preview: {
      type: "stats",
      items: [
        { label: "Answer Rate", value: "100%" },
        { label: "Avg Response", value: "<1s" },
      ],
    },
  },
  {
    id: "drip",
    title: "Drip Campaigns",
    description: "Outbound nurturing via voice, SMS, and email",
    icon: CalendarClock,
    href: "/products/drip-campaigns",
    preview: {
      type: "flow",
      steps: ["Day 0: SMS", "Day 2: Email", "Day 5: Voice"],
    },
  },
  {
    id: "integrations",
    title: "FSM Integrations",
    description: "Sync with ServiceTitan, FieldPulse, and more",
    icon: Zap,
    href: "/products/integrations",
    preview: {
      type: "logos",
      items: ["ServiceTitan", "FieldPulse", "Service Fusion"],
    },
  },
];

const companyMenu = {
  about: [
    { title: "About", description: "Our mission and story", icon: Briefcase, href: "/about" },
    { title: "Careers", description: "Join the RevCenter team", icon: Users, href: "/careers", badge: "We're hiring" },
    { title: "Contact", description: "Get in touch with us", icon: FileText, href: "/contact" },
  ],
  more: [
    { title: "Blog", href: "/blog" },
    { title: "Help", href: "/help" },
  ],
};

export default function Navigation() {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [activeProduct, setActiveProduct] = useState(productsMenu[0]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
        setMobileExpanded(null);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-black/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <img
              src="/revcenter-logo.svg"
              alt="REVCENTER"
              className="h-5 w-auto"
              style={{ shapeRendering: 'geometricPrecision' }}
            />
          </Link>

          {/* Center nav - visible at lg */}
          <div className="hidden lg:flex items-center gap-1">
            {/* Products */}
            <div
              className="relative"
              onMouseEnter={() => setActiveMenu("products")}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button
                aria-expanded={activeMenu === "products"}
                aria-haspopup="true"
                aria-controls="products-menu"
                className={`flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeMenu === "products" ? "bg-gray-100 text-black" : "text-gray-600 hover:text-black"
              }`}>
                Products
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              </button>

              {activeMenu === "products" && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2">
                  <div id="products-menu" role="menu" aria-label="Products" className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-[700px] grid grid-cols-3 gap-4">
                    {productsMenu.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        role="menuitem"
                        onMouseEnter={() => setActiveProduct(item)}
                        className={`block text-left p-4 rounded-xl transition-colors ${
                          activeProduct.id === item.id ? "bg-gray-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors ${
                          activeProduct.id === item.id
                            ? "bg-[#1b191a] text-white"
                            : "bg-gray-100 text-gray-600"
                        }`} aria-hidden="true">
                          <item.icon className="w-5 h-5" />
                        </div>
                        <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                        <p className="text-gray-500 text-xs">{item.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Company */}
            <div
              className="relative"
              onMouseEnter={() => setActiveMenu("company")}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button
                aria-expanded={activeMenu === "company"}
                aria-haspopup="true"
                aria-controls="company-menu"
                className={`flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeMenu === "company" ? "bg-gray-100 text-black" : "text-gray-600 hover:text-black"
              }`}>
                Company
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              </button>

              {activeMenu === "company" && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2">
                  <div id="company-menu" role="menu" aria-label="Company" className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-[500px] grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">About Us</p>
                      <div className="space-y-1" role="group" aria-label="About Us">
                        {companyMenu.about.map((item) => (
                          <Link
                            key={item.title}
                            href={item.href}
                            role="menuitem"
                            className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                          >
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 group-hover:bg-[#1b191a] group-hover:text-white transition-colors" aria-hidden="true">
                              <item.icon className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{item.title}</span>
                                {item.badge && (
                                  <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">{item.badge}</span>
                                )}
                              </div>
                              <p className="text-gray-500 text-xs">{item.description}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">More</p>
                      <div className="space-y-1" role="group" aria-label="More">
                        {companyMenu.more.map((item) => (
                          <Link
                            key={item.title}
                            href={item.href}
                            role="menuitem"
                            className="block px-3 py-2 text-sm text-gray-700 hover:text-black hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            {item.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Link href="/pricing" className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-black transition-colors">
              Pricing
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <Link
              href="/contact"
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-black transition-colors hidden lg:block"
            >
              Contact sales
            </Link>
            <Link href="/login" className="hidden lg:block">
              <Button className="bg-[#1b191a] text-white hover:bg-[#2d2a2b] rounded-lg px-4 py-2 text-sm font-medium">
                Sign in
              </Button>
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 top-16 bg-black/20 z-40"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile menu drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
        className={`lg:hidden fixed top-16 left-0 right-0 bottom-0 bg-white z-50 transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full overflow-y-auto pb-20">
          <div className="px-4 sm:px-6 md:px-8 py-4 md:py-6 space-y-2 max-w-2xl mx-auto">
            {/* Products accordion */}
            <div className="border-b border-gray-100">
              <button
                onClick={() => setMobileExpanded(mobileExpanded === "products" ? null : "products")}
                aria-expanded={mobileExpanded === "products"}
                aria-controls="mobile-products-menu"
                className="flex items-center justify-between w-full py-4 text-left"
              >
                <span className="text-base font-medium">Products</span>
                <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
                  mobileExpanded === "products" ? "rotate-90" : ""
                }`} aria-hidden="true" />
              </button>
              {mobileExpanded === "products" && (
                <div id="mobile-products-menu" className="pb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {productsMenu.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0" aria-hidden="true">
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium text-sm block">{item.title}</span>
                        <p className="text-gray-500 text-xs line-clamp-2">{item.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Company accordion */}
            <div className="border-b border-gray-100">
              <button
                onClick={() => setMobileExpanded(mobileExpanded === "company" ? null : "company")}
                aria-expanded={mobileExpanded === "company"}
                aria-controls="mobile-company-menu"
                className="flex items-center justify-between w-full py-4 text-left"
              >
                <span className="text-base font-medium">Company</span>
                <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
                  mobileExpanded === "company" ? "rotate-90" : ""
                }`} aria-hidden="true" />
              </button>
              {mobileExpanded === "company" && (
                <div id="mobile-company-menu" className="pb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                    {companyMenu.about.map((item) => (
                      <Link
                        key={item.title}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0" aria-hidden="true">
                          <item.icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{item.title}</span>
                            {item.badge && (
                              <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full whitespace-nowrap">{item.badge}</span>
                            )}
                          </div>
                          <p className="text-gray-500 text-xs line-clamp-2">{item.description}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                    {companyMenu.more.map((item) => (
                      <Link
                        key={item.title}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-2 text-sm text-gray-700 hover:text-black hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        {item.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Pricing link */}
            <Link
              href="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-4 border-b border-gray-100"
            >
              <span className="text-base font-medium">Pricing</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>

            {/* Contact sales link */}
            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between py-4 border-b border-gray-100"
            >
              <span className="text-base font-medium">Contact sales</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
          </div>

          {/* Mobile CTA */}
          <div className="px-4 sm:px-6 md:px-8 py-4 md:py-6 border-t border-gray-100 mt-4 max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="flex-1">
                <Button className="w-full bg-[#1b191a] text-white hover:bg-[#2d2a2b] rounded-lg px-4 py-3 text-sm font-medium">
                  Sign in
                </Button>
              </Link>
              <Link href="https://cal.com/team/revcenter/demo" onClick={() => setMobileMenuOpen(false)} className="flex-1">
                <Button variant="outline" className="w-full rounded-lg px-4 py-3 text-sm font-medium">
                  Book a demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
