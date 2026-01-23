import { Navigation, RevCenterFooter } from "@/components/landing";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        {children}
      </main>
      <RevCenterFooter />
    </div>
  );
}
