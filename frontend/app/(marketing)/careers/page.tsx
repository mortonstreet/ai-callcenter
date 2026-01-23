"use client";

import Link from "next/link";
import { ScrollReveal } from "@/components/landing";
import { MapPin, Clock, ChevronRight, Sparkles, Heart, Globe, Users } from "lucide-react";

const jobListings = [
  {
    id: "senior-full-stack-engineer",
    title: "Senior Full Stack Engineer",
    department: "Engineering",
    location: "Remote (US)",
    employmentType: "Full-time",
    description:
      "Join our engineering team to build the next generation of AI-powered voice agents for the home services industry.",
  },
  {
    id: "machine-learning-engineer",
    title: "Machine Learning Engineer",
    department: "Engineering",
    location: "Remote (US)",
    employmentType: "Full-time",
    description:
      "Help us develop and optimize our AI models that power intelligent customer interactions.",
  },
  {
    id: "product-designer",
    title: "Product Designer",
    department: "Design",
    location: "Remote (US)",
    employmentType: "Full-time",
    description:
      "Shape the user experience of our platform and create beautiful, intuitive interfaces.",
  },
  {
    id: "account-executive",
    title: "Account Executive",
    department: "Sales",
    location: "Remote (US)",
    employmentType: "Full-time",
    description:
      "Drive revenue growth by connecting home services businesses with our AI solutions.",
  },
  {
    id: "customer-success-manager",
    title: "Customer Success Manager",
    department: "Customer Success",
    location: "Remote (US)",
    employmentType: "Full-time",
    description:
      "Ensure our customers achieve exceptional results with RevCenter's platform.",
  },
];

const values = [
  {
    icon: Sparkles,
    title: "Build What Matters",
    description:
      "We create technology that genuinely helps businesses grow and serve their customers better.",
  },
  {
    icon: Users,
    title: "Ownership Mentality",
    description:
      "Everyone has a seat at the table. We empower our team to make decisions and drive impact.",
  },
  {
    icon: Heart,
    title: "Customer Obsession",
    description:
      "Our customers' success is our success. We go the extra mile to deliver exceptional results.",
  },
  {
    icon: Globe,
    title: "Remote First",
    description:
      "Work from anywhere in the US. We believe great work happens when people have flexibility.",
  },
];

const benefits = [
  "Competitive salary + equity",
  "Comprehensive health, dental, and vision",
  "Unlimited PTO",
  "401(k) with company match",
  "Home office stipend",
  "Learning & development budget",
  "Flexible work schedule",
  "Team offsites twice a year",
];

export default function CareersPage() {
  return (
    <div className="py-12 sm:py-16 md:py-24">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-20 sm:mb-28">
        <ScrollReveal>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            We&apos;re hiring
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-[#1b191a] heading-serif mb-4">
            Join the RevCenter Team
          </h1>
          <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto">
            Help us build the future of AI-powered communication for home services businesses.
            We&apos;re looking for exceptional people to join our remote-first team.
          </p>
        </ScrollReveal>
      </section>

      {/* Values */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-20 sm:mb-28">
        <ScrollReveal>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-[#1b191a] heading-serif text-center mb-12">
            Our Values
          </h2>
        </ScrollReveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, i) => (
            <ScrollReveal key={i} delay={i * 100}>
              <div className="bg-[#f5f5f7] rounded-2xl p-6 h-full">
                <div className="w-12 h-12 rounded-xl bg-[#1b191a] flex items-center justify-center mb-4">
                  <value.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-[#1b191a]">{value.title}</h3>
                <p className="text-gray-600 text-sm">{value.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-20 sm:mb-28">
        <ScrollReveal>
          <div className="bg-[#1b191a] rounded-2xl sm:rounded-3xl p-8 sm:p-12 md:p-16">
            <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-white heading-serif mb-8">
              Benefits & Perks
            </h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
              {benefits.map((benefit, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-white/60 flex-shrink-0" />
                  <span className="text-white/90 text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Open Positions */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-[#1b191a] heading-serif text-center mb-4">
            Open Positions
          </h2>
          <p className="text-gray-600 text-center mb-12 max-w-xl mx-auto">
            We&apos;re always looking for talented people to join our team. Don&apos;t see a perfect fit?
            Reach out anyway—we&apos;d love to hear from you.
          </p>
        </ScrollReveal>

        <div className="space-y-4">
          {jobListings.map((job, i) => (
            <ScrollReveal key={job.id} delay={i * 50}>
              <Link
                href={`/careers/${job.id}`}
                className="block bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 hover:shadow-lg transition-all duration-300 group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg text-[#1b191a] group-hover:text-[#1b191a]">
                        {job.title}
                      </h3>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                        {job.department}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{job.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {job.employmentType}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[#1b191a] font-medium text-sm group-hover:gap-3 transition-all">
                    View role
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            </ScrollReveal>
          ))}
        </div>

        {/* Contact CTA */}
        <ScrollReveal delay={300}>
          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">
              Don&apos;t see the right role? We&apos;re always looking for talented people.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium rounded-xl border border-gray-200 bg-white text-[#1b191a] hover:bg-gray-50 transition-all duration-200"
            >
              Get in touch
            </Link>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
