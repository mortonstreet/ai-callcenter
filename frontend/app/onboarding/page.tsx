"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useOnboardOrganization } from "@/hooks/api/useOrganization";
import { toast } from "sonner";

type Step = "org" | "use_case" | "agent" | "review";

const STEPS: { key: Step; label: string; num: string }[] = [
  { key: "org", label: "Company", num: "01" },
  { key: "use_case", label: "Use Case", num: "02" },
  { key: "agent", label: "Agent", num: "03" },
  { key: "review", label: "Review", num: "04" },
];

const INDUSTRY_OPTIONS = [
  { value: "hvac", label: "HVAC" },
  { value: "pest_control", label: "Pest Control" },
  { value: "electrical", label: "Electrical" },
  { value: "roofing", label: "Roofing" },
  { value: "cleaning_services", label: "Cleaning Services" },
];

const BUSINESS_ROLE_OPTIONS = [
  { value: "owner_operator", label: "Owner / Operator" },
  { value: "operations_manager", label: "Operations Manager" },
  { value: "dispatcher", label: "Dispatcher / CSR Lead" },
  { value: "sales", label: "Sales / Revenue Lead" },
  { value: "other", label: "Other" },
];

const TEAM_SIZE_OPTIONS = [
  { value: "1-5", label: "1-5 employees" },
  { value: "6-20", label: "6-20 employees" },
  { value: "21-50", label: "21-50 employees" },
  { value: "50+", label: "50+ employees" },
];

const LEAD_VOLUME_OPTIONS = [
  { value: "<50", label: "Under 50 calls/leads per month" },
  { value: "50-200", label: "50-200 calls/leads per month" },
  { value: "200-500", label: "200-500 calls/leads per month" },
  { value: "500+", label: "500+ calls/leads per month" },
];

const ROLLOUT_TIMELINE_OPTIONS = [
  { value: "asap", label: "As soon as possible" },
  { value: "30_days", label: "Within 30 days" },
  { value: "quarter", label: "This quarter" },
  { value: "exploring", label: "Just exploring" },
];

const SERVICE_PRESETS: Record<string, string[]> = {
  hvac: ["AC repair", "Ductless mini split"],
  pest_control: ["Termite treatment", "Rodent removal", "Wildlife removal"],
  electrical: ["Panel upgrade", "Outlet/lighting install", "EV charger install"],
  roofing: ["Leak repair", "Shingle replacement", "Roof inspection"],
  cleaning_services: ["Deep cleaning", "Move-in/out cleaning", "Recurring cleaning", "Office cleaning"],
};

const QUESTION_PRESETS: Record<string, string[]> = {
  hvac: [
    "What type of unit and age?",
    "Is it blowing warm air or not turning on?",
    "Any error codes or strange noises?",
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
  cleaning_services: [
    "How many bedrooms and bathrooms?",
    "Any pets in the home?",
    "What frequency do you need? (one-time, weekly, bi-weekly)",
  ],
};

const USE_CASE_OPTIONS = [
  {
    value: "customer_support",
    label: "Customer Support",
    description: "Handle inbound calls, answer FAQs, and resolve issues",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
  },
  {
    value: "outbound_sales",
    label: "Outbound Sales",
    description: "Make outbound calls to leads and prospects",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
      </svg>
    ),
  },
  {
    value: "scheduling",
    label: "Scheduling",
    description: "Book, reschedule, and manage appointments",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  {
    value: "lead_qualification",
    label: "Lead Qualification",
    description: "Qualify leads by gathering info and scoring urgency",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    value: "answering_service",
    label: "Answering Service",
    description: "After-hours call handling and message taking",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const onboardMutation = useOnboardOrganization();
  const [step, setStep] = useState<Step>("org");

  const [orgName, setOrgName] = useState("");
  const [domain, setDomain] = useState("");
  const [industry, setIndustry] = useState(INDUSTRY_OPTIONS[0].value);
  const [services, setServices] = useState<string[]>(SERVICE_PRESETS[industry]);

  const [useCase, setUseCase] = useState("");
  const [website, setWebsite] = useState("");
  const [mainGoal, setMainGoal] = useState("");
  const [businessRole, setBusinessRole] = useState(BUSINESS_ROLE_OPTIONS[0].value);
  const [demoIntent, setDemoIntent] = useState(true);
  const [teamSize, setTeamSize] = useState("");
  const [monthlyLeadVolume, setMonthlyLeadVolume] = useState("");
  const [rolloutTimeline, setRolloutTimeline] = useState("");
  const [qualificationNotes, setQualificationNotes] = useState("");

  const [idempotencyKey] = useState(() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `onboarding-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  });

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
        useCase: useCase || undefined,
        website: website.trim() || undefined,
        mainGoal: mainGoal.trim() || undefined,
        businessRole,
        demoIntent,
        qualification: {
          teamSize: teamSize || undefined,
          monthlyLeadVolume: monthlyLeadVolume || undefined,
          rolloutTimeline: rolloutTimeline || undefined,
          notes: qualificationNotes.trim() || undefined,
        },
        idempotencyKey,
        agent: {
          name: agentName.trim(),
          openingLine: openingLine.trim() || undefined,
          serviceQuestions: serviceQuestions.filter(Boolean),
        },
      },
      {
        onSuccess: () => {
          router.push("/onboarding/provisioning");
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
          <span className="text-sm font-medium text-foreground">Your role</span>
          <div className="relative">
            <select
              className="w-full appearance-none rounded-xl border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring"
              value={businessRole}
              onChange={(e) => setBusinessRole(e.target.value)}
            >
              {BUSINESS_ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </label>

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

        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Demo intent</label>
            <p className="text-xs text-muted-foreground">Tell us whether you want a guided demo workspace or a paid rollout path.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setDemoIntent(true)}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                demoIntent
                  ? "border-[#1b191a] bg-[#1b191a]/[0.04] ring-1 ring-[#1b191a]"
                  : "border-border hover:border-foreground/30"
              }`}
            >
              Guided demo first
            </button>
            <button
              type="button"
              onClick={() => setDemoIntent(false)}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                !demoIntent
                  ? "border-[#1b191a] bg-[#1b191a]/[0.04] ring-1 ring-[#1b191a]"
                  : "border-border hover:border-foreground/30"
              }`}
            >
              Paid rollout
            </button>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Qualification details</label>
            <p className="text-xs text-muted-foreground">These inputs help us tune onboarding and provisioning steps.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-foreground">Team size</span>
              <div className="relative">
                <select
                  className="w-full appearance-none rounded-xl border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring"
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                >
                  <option value="">Select</option>
                  {TEAM_SIZE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-foreground">Monthly lead volume</span>
              <div className="relative">
                <select
                  className="w-full appearance-none rounded-xl border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring"
                  value={monthlyLeadVolume}
                  onChange={(e) => setMonthlyLeadVolume(e.target.value)}
                >
                  <option value="">Select</option>
                  {LEAD_VOLUME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-foreground">Rollout timeline</span>
            <div className="relative">
              <select
                className="w-full appearance-none rounded-xl border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring"
                value={rolloutTimeline}
                onChange={(e) => setRolloutTimeline(e.target.value)}
              >
                <option value="">Select</option>
                {ROLLOUT_TIMELINE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </label>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Additional notes</label>
            <textarea
              value={qualificationNotes}
              onChange={(e) => setQualificationNotes(e.target.value)}
              rows={2}
              placeholder="Any implementation constraints or launch details we should know?"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={() => setStep("use_case")}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1b191a] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#2d2a2b] hover:shadow-md active:scale-[0.98]"
        >
          Continue
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );

  const renderUseCaseStep = () => (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">What will your agent do?</h2>
        <p className="text-sm text-muted-foreground">Select the primary use case for your AI agent.</p>
      </div>

      <div className="grid gap-3">
        {USE_CASE_OPTIONS.map((option) => {
          const active = useCase === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setUseCase(option.value)}
              className={`flex items-start gap-4 rounded-xl border p-4 text-left transition-all duration-150 ${
                active
                  ? "border-[#1b191a] bg-[#1b191a]/[0.02] ring-1 ring-[#1b191a]"
                  : "border-border hover:border-foreground/30"
              }`}
            >
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
                active ? "bg-[#1b191a] text-white" : "bg-muted text-muted-foreground"
              }`}>
                {option.icon}
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{option.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{option.description}</div>
              </div>
            </button>
          );
        })}
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
          onClick={() => setStep("agent")}
          disabled={!useCase}
          className="inline-flex items-center gap-2 rounded-xl bg-[#1b191a] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#2d2a2b] hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
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
        <Input label="Company website" placeholder="https://www.example.com" value={website} onChange={(e) => setWebsite(e.target.value)} hint="We'll use this to train your agent about your business." />
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Main goal</label>
          <textarea
            value={mainGoal}
            onChange={(e) => setMainGoal(e.target.value)}
            rows={2}
            placeholder="e.g., Book appointments for new customers, qualify leads and collect contact info..."
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
          />
          <p className="text-xs text-muted-foreground mt-1">Describe what you want the agent to accomplish on each call.</p>
        </div>
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
          onClick={() => setStep("use_case")}
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

  const useCaseLabel = USE_CASE_OPTIONS.find((o) => o.value === useCase)?.label || useCase;

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
              <span className="font-medium text-foreground capitalize">{industry.replace(/_/g, " ")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Use Case</span>
              <span className="font-medium text-foreground">{useCaseLabel || "\u2014"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium text-foreground">
                {BUSINESS_ROLE_OPTIONS.find((opt) => opt.value === businessRole)?.label || "\u2014"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan path</span>
              <span className="font-medium text-foreground">
                {demoIntent ? "Guided demo" : "Paid rollout"}
              </span>
            </div>
            <div className="pt-1">
              <span className="text-muted-foreground block mb-1.5">Services</span>
              <div className="flex flex-wrap gap-1.5">
                {currentServices.map((s) => (
                  <span key={s} className="inline-block rounded-lg bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">{s}</span>
                ))}
              </div>
            </div>
            <div className="pt-1">
              <span className="text-muted-foreground block mb-1.5">Qualification</span>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Team size</span>
                  <span className="font-medium text-foreground">{teamSize || "\u2014"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lead volume</span>
                  <span className="font-medium text-foreground">{monthlyLeadVolume || "\u2014"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Timeline</span>
                  <span className="font-medium text-foreground">{rolloutTimeline || "\u2014"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Notes</span>
                  <span className="font-medium text-foreground max-w-[60%] text-right">{qualificationNotes || "\u2014"}</span>
                </div>
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
            {website && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Website</span>
                <span className="font-medium text-foreground max-w-[60%] text-right truncate">{website}</span>
              </div>
            )}
            {mainGoal && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Goal</span>
                <span className="font-medium text-foreground max-w-[60%] text-right">{mainGoal}</span>
              </div>
            )}
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
          {onboardMutation.isPending ? "Submitting..." : "Submit onboarding"}
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
            {step === "use_case" && renderUseCaseStep()}
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
