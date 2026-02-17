"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { VoiceSelector } from "@/components/agent/VoiceSelector";
import { useOnboardOrganization } from "@/hooks/api/useOrganization";
import {
  normalizeWizardInputV2,
  parseCommaSeparatedValues,
  WIZARD_DISCOVERY_PRESETS,
  WIZARD_INDUSTRY_OPTIONS,
  WIZARD_SERVICE_PRESETS,
  WIZARD_USE_CASE_OPTIONS,
  type WizardGreetingMode,
} from "@/lib/wizard-v2";
import { toast } from "sonner";

type Step = "org" | "use_case" | "agent" | "review";

const STEPS: { key: Step; label: string; num: string }[] = [
  { key: "org", label: "Company", num: "01" },
  { key: "use_case", label: "Use Case", num: "02" },
  { key: "agent", label: "Agent", num: "03" },
  { key: "review", label: "Review", num: "04" },
];

const USE_CASE_ICON_MAP: Record<string, ReactNode> = {
  customer_support: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
  ),
  outbound_sales: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  ),
  scheduling: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  lead_qualification: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  answering_service: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export default function OnboardingPage() {
  const router = useRouter();
  const onboardMutation = useOnboardOrganization();
  const [step, setStep] = useState<Step>("org");

  const [orgName, setOrgName] = useState("");
  const [domain, setDomain] = useState("");
  const [industry, setIndustry] = useState(WIZARD_INDUSTRY_OPTIONS[0].value);
  const [services, setServices] = useState<string[]>(WIZARD_SERVICE_PRESETS[industry] || []);

  const [useCase, setUseCase] = useState("");
  const [agentName, setAgentName] = useState("");
  const [mainObjective, setMainObjective] = useState("");
  const [discoveryQuestions, setDiscoveryQuestions] = useState<string[]>([]);
  const [customQuestionInput, setCustomQuestionInput] = useState("");
  const [knowledgeSources, setKnowledgeSources] = useState<string[]>([]);
  const [knowledgeSourceInput, setKnowledgeSourceInput] = useState("");
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [greetingMode, setGreetingMode] = useState<WizardGreetingMode>("generated");
  const [customGreeting, setCustomGreeting] = useState("");
  const [transferNumber, setTransferNumber] = useState("");
  const [businessTimezone, setBusinessTimezone] = useState("");
  const [languagesInput, setLanguagesInput] = useState("");

  const currentServices = useMemo(() => {
    if (!services.length) return WIZARD_SERVICE_PRESETS[industry] || [];
    return services;
  }, [services, industry]);

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const handleServiceToggle = (service: string) => {
    setServices((prev) =>
      prev.includes(service)
        ? prev.filter((item) => item !== service)
        : [...prev, service],
    );
  };

  const toggleDiscoveryQuestion = (question: string) => {
    setDiscoveryQuestions((prev) =>
      prev.includes(question)
        ? prev.filter((item) => item !== question)
        : [...prev, question],
    );
  };

  const handleAddCustomQuestion = () => {
    const value = customQuestionInput.trim();
    if (!value) {
      return;
    }
    setDiscoveryQuestions((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setCustomQuestionInput("");
  };

  const handleQuestionChange = (index: number, value: string) => {
    setDiscoveryQuestions((prev) =>
      prev.map((question, idx) => (idx === index ? value : question)),
    );
  };

  const handleQuestionRemove = (index: number) => {
    setDiscoveryQuestions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddKnowledgeSource = () => {
    const value = knowledgeSourceInput.trim();
    if (!value) {
      return;
    }
    setKnowledgeSources((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setKnowledgeSourceInput("");
  };

  const handleKnowledgeSourceChange = (index: number, value: string) => {
    setKnowledgeSources((prev) =>
      prev.map((source, idx) => (idx === index ? value : source)),
    );
  };

  const handleKnowledgeSourceRemove = (index: number) => {
    setKnowledgeSources((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = () => {
    if (!orgName.trim()) return toast.error("Organization name is required");
    if (!agentName.trim()) return toast.error("Agent name is required");
    if (!useCase) return toast.error("Select a use case");
    if (!mainObjective.trim()) return toast.error("Main objective is required");
    if (currentServices.length < 1) return toast.error("Select at least one service");
    if (greetingMode === "custom" && !customGreeting.trim()) {
      return toast.error("Custom greeting text is required");
    }

    onboardMutation.mutate(
      {
        name: orgName.trim(),
        domain: domain.trim() || undefined,
        wizard_input_v2: normalizeWizardInputV2({
          agentName,
          industry,
          useCase,
          services: currentServices,
          discoveryQuestions,
          mainObjective,
          knowledgeSources,
          voiceSelection: voiceId ? { voiceId } : {},
          greeting:
            greetingMode === "custom"
              ? { mode: "custom", customText: customGreeting.trim() }
              : { mode: "generated" },
          routing: {
            transferNumber,
            businessTimezone,
            languages: parseCommaSeparatedValues(languagesInput),
          },
        }),
      },
      {
        onSuccess: () => {
          router.push("/onboarding/provisioning");
        },
      },
    );
  };

  const useCaseLabel = WIZARD_USE_CASE_OPTIONS.find((o) => o.value === useCase)?.label || useCase;

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
                const nextIndustry = e.target.value;
                setIndustry(nextIndustry);
                setServices(WIZARD_SERVICE_PRESETS[nextIndustry] || []);
                setDiscoveryQuestions([]);
              }}
            >
              {WIZARD_INDUSTRY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </label>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Services</label>
          <p className="text-xs text-muted-foreground mb-3">Select one or more services.</p>
          <div className="flex flex-wrap gap-2">
            {(WIZARD_SERVICE_PRESETS[industry] || []).map((service) => {
              const active = services.includes(service);
              return (
                <button
                  key={service}
                  type="button"
                  onClick={() => handleServiceToggle(service)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition-all duration-150 ${
                    active
                      ? "border-[#1b191a] bg-[#1b191a] text-white"
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {service}
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
        {WIZARD_USE_CASE_OPTIONS.map((option) => {
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
                {USE_CASE_ICON_MAP[option.value]}
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
        <p className="text-sm text-muted-foreground">Capture business intent only. Technical internals stay hidden.</p>
      </div>

      <div className="space-y-5">
        <Input label="Agent name" value={agentName} onChange={(e) => setAgentName(e.target.value)} required />

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Main objective</label>
          <textarea
            value={mainObjective}
            onChange={(e) => setMainObjective(e.target.value)}
            rows={2}
            placeholder="e.g., Book appointments for new customers and qualify urgent leads"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Discovery questions</label>
            <Button type="button" variant="outline" onClick={handleAddCustomQuestion} className="px-3 py-1 text-xs">
              + Add custom
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(WIZARD_DISCOVERY_PRESETS[industry] || []).map((question) => {
              const active = discoveryQuestions.includes(question);
              return (
                <button
                  key={question}
                  type="button"
                  onClick={() => toggleDiscoveryQuestion(question)}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all duration-150 ${
                    active
                      ? "border-[#1b191a] bg-[#1b191a] text-white"
                      : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {active ? question : `+ ${question}`}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={customQuestionInput}
              onChange={(e) => setCustomQuestionInput(e.target.value)}
              placeholder="Add a custom discovery question..."
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring"
            />
            <button
              type="button"
              onClick={handleAddCustomQuestion}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Add
            </button>
          </div>

          {discoveryQuestions.map((question, idx) => (
            <div key={`${idx}-${question}`} className="flex items-center gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => handleQuestionChange(idx, e.target.value)}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => handleQuestionRemove(idx)}
                className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground">Knowledge sources</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={knowledgeSourceInput}
              onChange={(e) => setKnowledgeSourceInput(e.target.value)}
              placeholder="https://example.com/pricing or doc://faq"
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring"
            />
            <button
              type="button"
              onClick={handleAddKnowledgeSource}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Add
            </button>
          </div>

          {knowledgeSources.map((source, idx) => (
            <div key={`${idx}-${source}`} className="flex items-center gap-2">
              <input
                type="text"
                value={source}
                onChange={(e) => handleKnowledgeSourceChange(idx, e.target.value)}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => handleKnowledgeSourceRemove(idx)}
                className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Voice selection (optional)</label>
          <VoiceSelector value={voiceId} onChange={(nextVoiceId) => setVoiceId(nextVoiceId)} />
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground">Greeting preference</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setGreetingMode("generated")}
              className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                greetingMode === "generated"
                  ? "border-[#1b191a] bg-[#1b191a] text-white"
                  : "border-border text-foreground hover:bg-accent"
              }`}
            >
              Use generated greeting
            </button>
            <button
              type="button"
              onClick={() => setGreetingMode("custom")}
              className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                greetingMode === "custom"
                  ? "border-[#1b191a] bg-[#1b191a] text-white"
                  : "border-border text-foreground hover:bg-accent"
              }`}
            >
              Provide custom greeting
            </button>
          </div>
          {greetingMode === "custom" && (
            <textarea
              value={customGreeting}
              onChange={(e) => setCustomGreeting(e.target.value)}
              rows={3}
              placeholder="Hi, thanks for calling. How can I help you today?"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring"
            />
          )}
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground">Routing inputs (optional)</label>
          <input
            type="text"
            value={transferNumber}
            onChange={(e) => setTransferNumber(e.target.value)}
            placeholder="Transfer number (e.g., +14155550123)"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring"
          />
          <input
            type="text"
            value={businessTimezone}
            onChange={(e) => setBusinessTimezone(e.target.value)}
            placeholder="Business timezone (IANA, e.g., America/Chicago)"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring"
          />
          <input
            type="text"
            value={languagesInput}
            onChange={(e) => setLanguagesInput(e.target.value)}
            placeholder="Languages (comma-separated, e.g., English, Spanish)"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring"
          />
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

  const renderReviewStep = () => (
    <div className="animate-fade-in-up space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Review &amp; launch</h2>
        <p className="text-sm text-muted-foreground">Confirm wizard inputs before provisioning starts.</p>
      </div>

      <div className="space-y-4">
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
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agent</span>
            <button onClick={() => setStep("agent")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Edit</button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Agent Name</span>
              <span className="font-medium text-foreground">{agentName || "\u2014"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Main objective</span>
              <span className="font-medium text-foreground max-w-[60%] text-right">{mainObjective || "\u2014"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Greeting</span>
              <span className="font-medium text-foreground max-w-[60%] text-right">
                {greetingMode === "custom" ? customGreeting || "Custom" : "Generated"}
              </span>
            </div>
            <div className="pt-1">
              <span className="text-muted-foreground block mb-1.5">Services</span>
              <div className="flex flex-wrap gap-1.5">
                {currentServices.map((service) => (
                  <span key={service} className="inline-block rounded-lg bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">{service}</span>
                ))}
              </div>
            </div>
            {knowledgeSources.length > 0 && (
              <div className="pt-1">
                <span className="text-muted-foreground block mb-1.5">Knowledge sources</span>
                <div className="space-y-1">
                  {knowledgeSources.map((source, idx) => (
                    <div key={`${idx}-${source}`} className="text-foreground text-xs break-all">{source}</div>
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
          {onboardMutation.isPending ? "Starting provisioning..." : "Create agent & finish"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-white overflow-hidden">
      <div className="w-full lg:w-1/2 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 flex items-start justify-center px-6 sm:px-12 lg:px-16 xl:px-20 py-12 sm:py-16 overflow-y-auto scrollbar-minimal">
          <div className="w-full max-w-lg">
            <img
              src="/revcenter-logo.svg"
              alt="RevCenter"
              className="h-5 w-auto mb-10"
              style={{ shapeRendering: "geometricPrecision" }}
            />

            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-[#1b191a] heading-serif">
                Set up your account
              </h1>
              <p className="mt-3 text-muted-foreground">
                Tell us about the company and stand up your first AI agent.
              </p>
            </div>

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

            {step === "org" && renderOrgStep()}
            {step === "use_case" && renderUseCaseStep()}
            {step === "agent" && renderAgentStep()}
            {step === "review" && renderReviewStep()}
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-[#1b191a] items-center justify-center p-12 relative overflow-hidden">
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

          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {["24/7 Coverage", "Lead Qualification", "Auto-Booking"].map((feature) => (
              <span key={feature} className="inline-block rounded-full border border-white/10 px-4 py-1.5 text-xs font-medium text-gray-400">
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
