"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useOnboardOrganization } from "@/hooks/api/useOrganization";
import { toast } from "sonner";

type Step = "org" | "agent" | "review";

const STEPS: { key: Step; label: string; num: string }[] = [
  { key: "org", label: "Company", num: "01" },
  { key: "agent", label: "Agent", num: "02" },
  { key: "review", label: "Review", num: "03" },
];

const INDUSTRY_OPTIONS = [
  { value: "hvac", label: "HVAC" },
  { value: "plumbing", label: "Plumbing" },
  { value: "pest_control", label: "Pest Control" },
  { value: "electrical", label: "Electrical" },
  { value: "roofing", label: "Roofing" },
];

const SERVICE_PRESETS: Record<string, string[]> = {
  hvac: ["AC repair", "Ductless mini split"],
  plumbing: ["Faucet repair", "Toilet repair", "Pipe leak repair"],
  pest_control: ["Termite treatment", "Rodent removal", "Wildlife removal"],
  electrical: ["Panel upgrade", "Outlet/lighting install", "EV charger install"],
  roofing: ["Leak repair", "Shingle replacement", "Roof inspection"],
};

const QUESTION_PRESETS: Record<string, string[]> = {
  hvac: [
    "What type of unit and age?",
    "Is it blowing warm air or not turning on?",
    "Any error codes or strange noises?",
  ],
  plumbing: [
    "Where is the leak or issue located?",
    "How long has it been happening?",
    "Have you shut off the water?",
  ],
  pest_control: [
    "Which pests are you seeing and where?",
    "How long have you noticed the activity?",
    "Have treatments been tried before?",
  ],
  electrical: [
    "What stopped working? Outlets, lights, or a breaker?",
    "Any burning smell or visible damage?",
    "What's the home/business type and panel age?",
  ],
  roofing: [
    "Where is the leak or damage located?",
    "When was the roof last repaired or replaced?",
    "Do you see missing shingles or water stains?",
  ],
};

export default function OnboardingPage() {
  const router = useRouter();
  const onboardMutation = useOnboardOrganization();
  const [step, setStep] = useState<Step>("org");

  const [orgName, setOrgName] = useState("");
  const [domain, setDomain] = useState("");
  const [industry, setIndustry] = useState(INDUSTRY_OPTIONS[0].value);
  const [services, setServices] = useState<string[]>(SERVICE_PRESETS[industry]);

  const [agentName, setAgentName] = useState("");
  const [openingLine, setOpeningLine] = useState("");
  const [serviceQuestions, setServiceQuestions] = useState<string[]>([]);

  const currentServices = useMemo(() => {
    if (!services.length) return SERVICE_PRESETS[industry] || [];
    return services;
  }, [services, industry]);

  const handleServiceToggle = (svc: string) => {
    setServices((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc],
    );
  };

  const handleAddQuestion = (preset?: string) => {
    if (preset) {
      setServiceQuestions((prev) => (prev.includes(preset) ? prev : [...prev, preset]));
      return;
    }
    setServiceQuestions((prev) => [...prev, ""]);
  };

  const handleQuestionChange = (idx: number, val: string) => {
    setServiceQuestions((prev) => prev.map((q, i) => (i === idx ? val : q)));
  };

  const handleSubmit = () => {
    if (!orgName.trim()) return toast.error("Organization name is required");
    if (!agentName.trim()) return toast.error("Agent name is required");

    onboardMutation.mutate(
      {
        name: orgName.trim(),
        domain: domain.trim() || undefined,
        industry,
        services: currentServices,
        agent: {
          name: agentName.trim(),
          openingLine: openingLine.trim() || undefined,
          serviceQuestions: serviceQuestions.filter(Boolean),
        },
      },
      {
        onSuccess: () => {
          router.push("/dashboard");
        },
      },
    );
  };

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const renderOrgStep = () => (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Tell us about the company</h2>
        <p className="text-sm text-muted-foreground">Basic details to configure your account.</p>
      </div>

      <div className="space-y-5">
        <Input label="Company name" value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
        <Input label="Company domain" placeholder="www.example.com" value={domain} onChange={(e) => setDomain(e.target.value)} />

        <label className="block space-y-1">
          <span className="text-sm font-medium text-foreground">Industry</span>
          <div className="relative">
            <select
              className="w-full appearance-none rounded-xl border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring"
              value={industry}
              onChange={(e) => {
                const next = e.target.value;
                setIndustry(next);
                setServices(SERVICE_PRESETS[next] || []);
              }}
            >
              {INDUSTRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </label>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Services</label>
          <p className="text-xs text-muted-foreground mb-3">Select the services your team offers. We&apos;ll tailor agent questions accordingly.</p>
          <div className="flex flex-wrap gap-2">
            {(SERVICE_PRESETS[industry] || []).map((svc) => {
              const active = services.includes(svc);
              return (
                <button
                  key={svc}
                  type="button"
                  onClick={() => handleServiceToggle(svc)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition-all duration-150 ${
                    active
                      ? "border-[#1b191a] bg-[#1b191a] text-white"
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border transition-colors ${
                    active ? "border-white/40 bg-white/20" : "border-border"
                  }`}>
                    {active && (
                      <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    )}
                  </span>
                  {svc}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={() => setStep("agent")}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1b191a] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#2d2a2b] hover:shadow-md active:scale-[0.98]"
        >
          Continue
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );

  const renderAgentStep = () => (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Create your first agent</h2>
        <p className="text-sm text-muted-foreground">Configure how your AI handles inbound calls.</p>
      </div>

      <div className="space-y-5">
        <Input label="Agent name" value={agentName} onChange={(e) => setAgentName(e.target.value)} required />
        <Input label="Opening line" placeholder="Hi, thanks for calling..." value={openingLine} onChange={(e) => setOpeningLine(e.target.value)} hint="The first thing callers hear when the agent picks up." />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Service questions</label>
            <Button type="button" variant="outline" onClick={() => handleAddQuestion()} className="px-3 py-1 text-xs">
              + Add custom
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Select preset questions or add your own. These help the agent qualify and route requests.</p>

          <div className="flex flex-wrap gap-2">
            {(QUESTION_PRESETS[industry] || []).map((q) => {
              const active = serviceQuestions.includes(q);
              return (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleAddQuestion(q)}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all duration-150 ${
                    active
                      ? "border-[#1b191a] bg-[#1b191a] text-white"
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {active ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      {q}
                    </span>
                  ) : (
                    <span>+ {q}</span>
                  )}
                </button>
              );
            })}
          </div>

          {serviceQuestions.length === 0 && (
            <p className="text-sm text-muted-foreground/60 italic">No questions added yet.</p>
          )}
          {serviceQuestions.map((q, idx) => (
            <Input
              key={idx}
              label={`Question ${idx + 1}`}
              value={q}
              onChange={(e) => handleQuestionChange(idx, e.target.value)}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button
          onClick={() => setStep("org")}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-accent active:scale-[0.98]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
        <button
          onClick={() => setStep("review")}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1b191a] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#2d2a2b] hover:shadow-md active:scale-[0.98]"
        >
          Continue
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Review &amp; launch</h2>
        <p className="text-sm text-muted-foreground">Confirm everything looks right before creating your agent.</p>
      </div>

      <div className="space-y-4">
        {/* Company section */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company</span>
            <button onClick={() => setStep("org")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Edit</button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium text-foreground">{orgName || "\u2014"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Domain</span>
              <span className="font-medium text-foreground">{domain || "\u2014"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Industry</span>
              <span className="font-medium text-foreground capitalize">{industry.replace("_", " ")}</span>
            </div>
            <div className="pt-1">
              <span className="text-muted-foreground block mb-1.5">Services</span>
              <div className="flex flex-wrap gap-1.5">
                {currentServices.map((s) => (
                  <span key={s} className="inline-block rounded-lg bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Agent section */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agent</span>
            <button onClick={() => setStep("agent")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Edit</button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium text-foreground">{agentName || "\u2014"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Opening line</span>
              <span className="font-medium text-foreground max-w-[60%] text-right">{openingLine || "\u2014"}</span>
            </div>
            {serviceQuestions.filter(Boolean).length > 0 && (
              <div className="pt-1">
                <span className="text-muted-foreground block mb-1.5">Questions</span>
                <div className="space-y-1">
                  {serviceQuestions.filter(Boolean).map((q, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-foreground">
                      <span className="text-muted-foreground/50 text-xs font-mono mt-0.5">{String(idx + 1).padStart(2, "0")}</span>
                      <span>{q}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button
          onClick={() => setStep("agent")}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-accent active:scale-[0.98]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={onboardMutation.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1b191a] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#2d2a2b] hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {onboardMutation.isPending ? "Creating..." : "Create agent & finish"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-white overflow-hidden">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 flex items-start justify-center px-6 sm:px-12 lg:px-16 xl:px-20 py-12 sm:py-16 overflow-y-auto scrollbar-minimal">
          <div className="w-full max-w-lg">
            {/* Logo */}
            <img
              src="/revcenter-logo.svg"
              alt="RevCenter"
              className="h-5 w-auto mb-10"
              style={{ shapeRendering: "geometricPrecision" }}
            />

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-[#1b191a] heading-serif">
                Set up your account
              </h1>
              <p className="mt-3 text-muted-foreground">
                Tell us about the company and stand up your first AI agent.
              </p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-1 mb-10">
              {STEPS.map((s, idx) => (
                <div key={s.key} className="flex items-center gap-1 flex-1">
                  <button
                    onClick={() => {
                      /* Allow going back to completed steps */
                      if (idx < stepIndex) setStep(s.key);
                    }}
                    className={`flex items-center gap-2 text-xs font-medium transition-colors ${
                      idx < stepIndex
                        ? "text-foreground cursor-pointer"
                        : idx === stepIndex
                          ? "text-foreground"
                          : "text-muted-foreground/50 cursor-default"
                    }`}
                  >
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold font-mono transition-all duration-200 ${
                      idx < stepIndex
                        ? "bg-[#1b191a] text-white"
                        : idx === stepIndex
                          ? "border-2 border-[#1b191a] text-[#1b191a]"
                          : "border border-border text-muted-foreground/50"
                    }`}>
                      {idx < stepIndex ? (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        s.num
                      )}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div className="flex-1 mx-2">
                      <div className={`h-px w-full transition-colors duration-300 ${idx < stepIndex ? "bg-[#1b191a]" : "bg-border"}`} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Step content */}
            {step === "org" && renderOrgStep()}
            {step === "agent" && renderAgentStep()}
            {step === "review" && renderReviewStep()}
          </div>
        </div>
      </div>

      {/* Right Side - Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1b191a] items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }} />
        <div className="absolute top-24 right-20 h-px w-40 bg-white/10" />
        <div className="absolute bottom-32 left-16 h-px w-24 bg-white/10" />
        <div className="absolute top-1/3 left-12 h-24 w-px bg-white/10" />

        <div className="max-w-md text-center relative z-10">
          <img
            src="/revcenter-logo-white.svg"
            alt="RevCenter"
            className="h-6 w-auto mx-auto mb-10"
            style={{ shapeRendering: "geometricPrecision" }}
          />
          <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-white heading-serif mb-6 leading-tight">
            Your AI Call Center,<br />Ready in Minutes.
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            Configure your agent, connect your lines, and start converting calls into booked revenue around the clock.
          </p>

          {/* Feature pills */}
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {["24/7 Coverage", "Lead Qualification", "Auto-Booking"].map((f) => (
              <span key={f} className="inline-block rounded-full border border-white/10 px-4 py-1.5 text-xs font-medium text-gray-400">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
