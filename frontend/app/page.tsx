import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Sticky Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-5">
          <div className="flex justify-between items-center h-16">
            <div className="text-2xl font-black tracking-tighter text-[#1b191a] uppercase">
              RevCenter
            </div>
            <Link
              href="/login"
              className="px-5 py-2 text-sm font-medium rounded-full bg-[#1b191a] text-white hover:bg-[#2d2a2b] transition-all duration-200"
            >
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-5 py-20 md:py-24 space-y-24 md:space-y-32">
        {/* Hero Section */}
        <section className="pt-8 relative overflow-hidden">
          <div className="grid gap-12 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] items-center relative">
            <div className="space-y-6">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#1b191a] leading-tight">
                Your AI call center agent
              </h1>
              <p className="max-w-xl text-base sm:text-lg text-gray-600 leading-relaxed">
                Transform your call center operations with intelligent AI agents that handle calls 24/7, intelligently
                qualify leads, book appointments, and seamlessly integrate with your existing systems.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center pt-2">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium rounded-full bg-[#1b191a] text-white hover:bg-[#2d2a2b] shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  Get started
                </Link>
                <p className="text-xs text-gray-500 sm:ml-2">
                  Free trial available. No credit card required.
                </p>
              </div>
            </div>

            <div className="hidden md:flex justify-center items-center relative h-80">
              {/* Abstract visualization placeholder */}
              <div className="relative w-64 h-64">
                <div className="absolute inset-0 rounded-full border-2 border-[#1b191a]/10 animate-pulse" />
                <div className="absolute inset-4 rounded-full border-2 border-[#1b191a]/20" />
                <div className="absolute inset-8 rounded-full border-2 border-[#1b191a]/30" />
                <div className="absolute inset-12 rounded-full bg-[#1b191a]/5 flex items-center justify-center">
                  <div className="text-4xl">📞</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Live Agent Section */}
        <section className="relative py-12 overflow-hidden">
          <div className="rounded-3xl border border-gray-200 bg-gray-50/50 backdrop-blur-sm p-8 md:p-12">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-xs font-semibold text-gray-500 tracking-widest">LIVE AGENT</p>
                <h2 className="text-2xl md:text-3xl font-bold text-[#1b191a]">Intelligent voice processing in action</h2>
              </div>
              <div className="w-full h-24 flex items-center justify-center">
                {/* Wave visualization placeholder */}
                <div className="flex items-center gap-1">
                  {[...Array(40)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-[#1b191a]/30 rounded-full animate-pulse"
                      style={{
                        height: `${20 + Math.sin(i * 0.5) * 15 + Math.random() * 10}px`,
                        animationDelay: `${i * 50}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities Section */}
        <section id="capabilities" className="space-y-12">
          <div className="space-y-3 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1b191a]">What RevCenter Can Do</h2>
            <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Purpose-built for modern call centers, RevCenter handles everything from call intake to intelligent
              booking and beyond.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Call Handling & Booking */}
            <div className="rounded-2xl border border-gray-200 bg-white p-8 hover:border-[#1b191a]/30 hover:shadow-md transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#1b191a]/5 text-[#1b191a] flex items-center justify-center flex-shrink-0 text-xl font-semibold">
                  📞
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-[#1b191a]">Intelligent Call Handling & Booking</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Answer and process calls naturally, ask qualifying questions, and book appointments directly into
                    Service Titan and Google Calendar simultaneously. Four-hour time blocks with dynamic availability
                    updates.
                  </p>
                </div>
              </div>
            </div>

            {/* Lead Scoring */}
            <div className="rounded-2xl border border-gray-200 bg-white p-8 hover:border-[#1b191a]/30 hover:shadow-md transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#1b191a]/5 text-[#1b191a] flex items-center justify-center flex-shrink-0 text-xl font-semibold">
                  🎯
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-[#1b191a]">Dynamic Lead Scoring & Prioritization</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Automatically score leads based on equipment age, customer history, and custom criteria. Older units
                    get extended sales time. The system learns and improves with every call.
                  </p>
                </div>
              </div>
            </div>

            {/* Customization */}
            <div className="rounded-2xl border border-gray-200 bg-white p-8 hover:border-[#1b191a]/30 hover:shadow-md transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#1b191a]/5 text-[#1b191a] flex items-center justify-center flex-shrink-0 text-xl font-semibold">
                  ⚙️
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-[#1b191a]">Built for Customization</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Configure the agent to ask specific questions, collect custom data, and adapt to your unique
                    workflow. Changes deploy in minutes without technical work.
                  </p>
                </div>
              </div>
            </div>

            {/* Multilingual */}
            <div className="rounded-2xl border border-gray-200 bg-white p-8 hover:border-[#1b191a]/30 hover:shadow-md transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#1b191a]/5 text-[#1b191a] flex items-center justify-center flex-shrink-0 text-xl font-semibold">
                  🌍
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-[#1b191a]">Multilingual & Continuously Learning</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Handle calls in 30+ languages with mid-call language switching. The agent improves with every
                    interaction through manual optimization and self-learning models.
                  </p>
                </div>
              </div>
            </div>

            {/* Smart Info */}
            <div className="rounded-2xl border border-gray-200 bg-white p-8 hover:border-[#1b191a]/30 hover:shadow-md transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#1b191a]/5 text-[#1b191a] flex items-center justify-center flex-shrink-0 text-xl font-semibold">
                  📊
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-[#1b191a]">Smart Information Management</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Uses RAG to combine public data and your internal knowledge. Customer success team easily updates
                    agent context. Guardrails keep conversations on-topic and professional.
                  </p>
                </div>
              </div>
            </div>

            {/* Dashboard */}
            <div className="rounded-2xl border border-gray-200 bg-white p-8 hover:border-[#1b191a]/30 hover:shadow-md transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#1b191a]/5 text-[#1b191a] flex items-center justify-center flex-shrink-0 text-xl font-semibold">
                  📈
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-[#1b191a]">Workspace & Analytics Dashboard</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Track new tasks, customer information, and call recordings. View dispatch priorities, resolution
                    metrics, and generated tickets in one powerful dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="space-y-8">
          <div className="rounded-3xl bg-[#1b191a] p-10 md:p-14 shadow-lg relative overflow-hidden">
            <div className="max-w-3xl mx-auto space-y-8 relative z-10">
              <div className="space-y-3 text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-white">Built for Call Centers</h2>
                <p className="text-base md:text-lg text-gray-300 leading-relaxed max-w-xl mx-auto">
                  Seamless integration with your existing systems. Works with Service Titan, Google Calendar, and your
                  current workflows.
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div className="space-y-3">
                  <div className="text-4xl md:text-5xl font-bold text-white">24/7</div>
                  <p className="text-sm text-gray-400">Always available to handle calls without fatigue or downtime.</p>
                </div>
                <div className="space-y-3">
                  <div className="text-4xl md:text-5xl font-bold text-white">30+</div>
                  <p className="text-sm text-gray-400">Languages supported with mid-call language switching.</p>
                </div>
                <div className="space-y-3">
                  <div className="text-4xl md:text-5xl font-bold text-white">Real-time</div>
                  <p className="text-sm text-gray-400">Instant booking, lead scoring, and dispatcher updates.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Deployment Steps */}
        <section className="space-y-8">
          <div className="space-y-3 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1b191a]">Deployment in 3 Steps</h2>
            <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Get your AI agent up and running quickly.
            </p>
          </div>
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex gap-5 group">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#1b191a] text-white flex items-center justify-center text-lg font-bold shadow-lg group-hover:scale-110 transition-transform duration-200">
                1
              </div>
              <div className="flex-1 space-y-2 pt-1">
                <h3 className="text-base font-semibold text-[#1b191a]">Connect Your Systems</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Integrate with Service Titan, Google Calendar, and your phone system. We handle all the technical
                  setup.
                </p>
              </div>
            </div>
            <div className="flex gap-5 group">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#1b191a] text-white flex items-center justify-center text-lg font-bold shadow-lg group-hover:scale-110 transition-transform duration-200">
                2
              </div>
              <div className="flex-1 space-y-2 pt-1">
                <h3 className="text-base font-semibold text-[#1b191a]">Configure Your Agent</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Set up custom questions, booking rules, lead scoring criteria, and knowledge base. No coding required.
                </p>
              </div>
            </div>
            <div className="flex gap-5 group">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#1b191a] text-white flex items-center justify-center text-lg font-bold shadow-lg group-hover:scale-110 transition-transform duration-200">
                3
              </div>
              <div className="flex-1 space-y-2 pt-1">
                <h3 className="text-base font-semibold text-[#1b191a]">Go Live and Scale</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Start handling calls immediately. Monitor performance in your dashboard and watch your efficiency
                  metrics improve.
                </p>
              </div>
            </div>
          </div>
          <div className="pt-6 flex justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-8 py-3.5 text-sm font-semibold rounded-full bg-[#1b191a] text-white hover:bg-[#2d2a2b] shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
            >
              Get started now
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-24 pb-16 border-t border-gray-200 space-y-12">
          <div className="space-y-8">
            <div className="text-center space-y-6">
              <div className="inline-block">
                <div className="text-5xl md:text-7xl font-black tracking-tighter text-[#1b191a]">REVCENTER</div>
              </div>
              <p className="text-center text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                AI-powered call center agent transforming customer service operations
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center pt-8 border-t border-gray-200">
            <p className="text-xs text-gray-400 font-medium tracking-wide">© All rights reserved RevCenter Corp 2025</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
