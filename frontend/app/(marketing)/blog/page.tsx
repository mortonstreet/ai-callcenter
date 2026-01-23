"use client";

import Link from "next/link";
import { ScrollReveal } from "@/components/landing";

const posts = [
  {
    title: "How AI is Transforming Field Service Call Centers",
    excerpt: "Discover how AI-powered call agents are helping HVAC, plumbing, electrical, pest control, and roofing companies handle more calls with fewer staff.",
    date: "Jan 15, 2025",
    category: "Industry",
    slug: "/blog/ai-transforming-field-service",
  },
  {
    title: "5 Ways to Reduce Missed Calls and Lost Revenue",
    excerpt: "Learn the strategies top home service companies use to capture every lead and maximize booking rates.",
    date: "Jan 10, 2025",
    category: "Tips",
    slug: "/blog/reduce-missed-calls",
  },
  {
    title: "ServiceTitan Integration: A Complete Guide",
    excerpt: "Step-by-step instructions for connecting RevCenter with ServiceTitan for seamless appointment booking in HVAC, plumbing, electrical, pest control, and roofing businesses.",
    date: "Jan 5, 2025",
    category: "Integrations",
    slug: "/blog/servicetitan-integration-guide",
  },
  {
    title: "The ROI of AI Call Agents: A Case Study",
    excerpt: "How a mid-size HVAC company increased bookings by 40 percent and reduced call center costs by 60 percent.",
    date: "Dec 28, 2024",
    category: "Case Study",
    slug: "/blog/roi-case-study",
  },
  {
    title: "Setting Up Effective Drip Campaigns for Home Service Businesses",
    excerpt: "Best practices for creating automated follow-up sequences that convert cold leads into booked jobs for HVAC, plumbing, electrical, pest control, and roofing companies.",
    date: "Dec 20, 2024",
    category: "Tips",
    slug: "/blog/effective-drip-campaigns",
  },
  {
    title: "Multilingual Support: Serving Diverse Customer Bases",
    excerpt: "How AI call agents can handle over 30 languages and automatically switch mid-conversation for home service businesses.",
    date: "Dec 15, 2024",
    category: "Features",
    slug: "/blog/multilingual-support",
  },
];

const categories = ["All", "Industry", "Tips", "Integrations", "Case Study", "Features"];

export default function BlogPage() {
  return (
    <div className="py-12 sm:py-16 md:py-24">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-12 sm:mb-16">
        <ScrollReveal>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-[#1b191a] heading-serif mb-4">
            Blog
          </h1>
          <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto">
            Insights, tips, and best practices for home service businesses including HVAC, plumbing, electrical, pest control, and roofing companies.
          </p>
        </ScrollReveal>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 sm:mb-10">
        <ScrollReveal>
          <div className="flex flex-nowrap sm:flex-wrap gap-2 justify-start sm:justify-center overflow-x-auto pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
            {categories.map((category) => (
              <button
                key={category}
                className={`px-4 py-2.5 sm:py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] sm:min-h-0 ${
                  category === "All"
                    ? "bg-[#1b191a] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* Posts Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {posts.map((post, i) => (
            <ScrollReveal key={i} delay={i * 50}>
              <Link href={post.slug} className="group block">
                <article className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all h-full flex flex-col active:scale-[0.98]">
                  <div className="mb-3 sm:mb-4">
                    <span className="inline-block px-3 py-1.5 sm:py-1 bg-[#1b191a]/10 text-[#1b191a] text-xs font-medium rounded-full">
                      {post.category}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-semibold text-[#1b191a] mb-2 group-hover:text-[#1b191a]/80 transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                  <p className="text-gray-600 text-sm mb-4 flex-grow line-clamp-3">
                    {post.excerpt}
                  </p>
                  <div className="text-gray-400 text-xs">
                    {post.date}
                  </div>
                </article>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </section>
    </div>
  );
}
