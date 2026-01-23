"use client";

import { useState } from "react";
import { ScrollReveal } from "@/components/landing";
import { Mail, Phone, MapPin } from "lucide-react";
import Button from "@/components/ui/Button";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log(formData);
  };

  return (
    <div className="py-12 sm:py-16 md:py-24">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16 sm:mb-20">
        <ScrollReveal>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-[#1b191a] heading-serif mb-4">
            Get in touch
          </h1>
          <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto">
            Ready to automate your calls? Our team is here to help you get started.
          </p>
        </ScrollReveal>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Contact Form */}
          <ScrollReveal>
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200">
              <h2 className="text-xl font-semibold mb-6">Send us a message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1b191a] focus:ring-1 focus:ring-[#1b191a] outline-none transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1b191a] focus:ring-1 focus:ring-[#1b191a] outline-none transition-colors"
                      required
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1b191a] focus:ring-1 focus:ring-[#1b191a] outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1b191a] focus:ring-1 focus:ring-[#1b191a] outline-none transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1b191a] focus:ring-1 focus:ring-[#1b191a] outline-none transition-colors resize-none"
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-[#1b191a] text-white hover:bg-[#2d2a2b]">
                  Send Message
                </Button>
              </form>
            </div>
          </ScrollReveal>

          {/* Contact Info */}
          <ScrollReveal delay={100}>
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold mb-6">Contact information</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#1b191a]/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-[#1b191a]" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Email</div>
                      <a href="mailto:hello@revcenter.ai" className="text-gray-600 text-sm hover:text-[#1b191a]">
                        hello@revcenter.ai
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#1b191a]/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-[#1b191a]" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Phone</div>
                      <a href="tel:+1-555-123-4567" className="text-gray-600 text-sm hover:text-[#1b191a]">
                        +1 (555) 123-4567
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#1b191a]/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-[#1b191a]" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Office</div>
                      <span className="text-gray-600 text-sm">
                        San Francisco, CA
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#f5f5f7] rounded-2xl p-6 sm:p-8">
                <h3 className="font-semibold mb-2">Prefer to book a call?</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Schedule a demo with our team to see RevCenter in action.
                </p>
                <a
                  href="https://cal.com/team/revcenter/demo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#1b191a] text-white text-sm font-medium hover:bg-[#2d2a2b] transition-colors"
                >
                  Book a Demo
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
