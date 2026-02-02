"use client";

import { useState, useCallback } from "react";
import { X, Bot, Loader2 } from "lucide-react";
import { useCreateElevenLabsAgent } from "@/hooks/api/useAgent";

interface CreateAgentWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "template" | "industry" | "use_case" | "details";

const INDUSTRY_OPTIONS = [
  { value: "hvac", label: "HVAC" },
  { value: "pest_control", label: "Pest Control" },
  { value: "electrical", label: "Electrical" },
  { value: "roofing", label: "Roofing" },
  { value: "cleaning_services", label: "Cleaning Services" },
];

const TEMPLATES = [
  { id: "blank", label: "Blank Agent", description: "Start from scratch with a blank configuration", industry: null, icon: null },
  { id: "pest_control", label: "Pest Control Pro", description: "Pre-configured for pest control companies", industry: "pest_control", icon: "🐛" },
  { id: "hvac", label: "HVAC Support", description: "Tailored for heating and cooling businesses", industry: "hvac", icon: "❄️" },
  { id: "roofing", label: "Roofing Agent", description: "Built for roofing and exterior contractors", industry: "roofing", icon: "🏠" },
  { id: "electrical", label: "Electrical Support", description: "Designed for electrical service providers", industry: "electrical", icon: "⚡" },
  { id: "cleaning_services", label: "Maid Service", description: "Optimized for cleaning and maid services", industry: "cleaning_services", icon: "✨" },
];

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

const STEP_LABELS: Record<Step, string> = {
  template: "Template",
  industry: "Industry",
  use_case: "Use Case",
  details: "Details",
};

export function CreateAgentWizard({ isOpen, onClose }: CreateAgentWizardProps) {
  const createAgent = useCreateElevenLabsAgent();

  const [step, setStep] = useState<Step>("template");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [industry, setIndustry] = useState("");
  const [useCase, setUseCase] = useState("");
  const [agentName, setAgentName] = useState("");
  const [website, setWebsite] = useState("");
  const [mainGoal, setMainGoal] = useState("");

  const reset = useCallback(() => {
    setStep("template");
    setSelectedTemplate(null);
    setIndustry("");
    setUseCase("");
    setAgentName("");
    setWebsite("");
    setMainGoal("");
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (template && template.industry) {
      setIndustry(template.industry);
      setStep("use_case");
    } else {
      setIndustry("");
      setStep("industry");
    }
  };

  const handleIndustrySelect = (value: string) => {
    setIndustry(value);
    setStep("use_case");
  };

  const handleUseCaseSelect = (value: string) => {
    setUseCase(value);
    setStep("details");
  };

  const handleSubmit = async () => {
    if (!agentName.trim() || !mainGoal.trim()) return;

    await createAgent.mutateAsync(
      {
        name: agentName.trim(),
        industry: industry || undefined,
        useCase: useCase || undefined,
        website: website.trim() || undefined,
        mainGoal: mainGoal.trim() || undefined,
      },
    );
    handleClose();
  };

  // Determine visible steps for the progress bar
  const isBlankTemplate = selectedTemplate === "blank";
  const allSteps: Step[] = isBlankTemplate || !selectedTemplate
    ? ["template", "industry", "use_case", "details"]
    : ["template", "use_case", "details"];
  const currentStepIndex = allSteps.indexOf(step);

  const goBack = () => {
    if (currentStepIndex > 0) {
      setStep(allSteps[currentStepIndex - 1]);
    }
  };

  if (!isOpen) return null;

  const renderTemplateStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Choose a template</h2>
        <p className="text-sm text-muted-foreground">Start with a pre-built template or build from scratch.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => handleTemplateSelect(template.id)}
            className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-150 ${
              selectedTemplate === template.id
                ? "border-[#1b191a] bg-[#1b191a]/[0.02] ring-1 ring-[#1b191a]"
                : "border-border hover:border-foreground/30"
            }`}
          >
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
              template.icon ? "bg-muted text-lg" : "bg-muted text-muted-foreground"
            }`}>
              {template.icon ? template.icon : <Bot className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground">{template.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{template.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderIndustryStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Select your industry</h2>
        <p className="text-sm text-muted-foreground">This helps us tailor your agent to your business.</p>
      </div>

      <div className="grid gap-3">
        {INDUSTRY_OPTIONS.map((option) => {
          const active = industry === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleIndustrySelect(option.value)}
              className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-150 ${
                active
                  ? "border-[#1b191a] bg-[#1b191a]/[0.02] ring-1 ring-[#1b191a]"
                  : "border-border hover:border-foreground/30"
              }`}
            >
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg transition-colors ${
                active ? "bg-[#1b191a] text-white" : "bg-muted text-muted-foreground"
              }`}>
                <span className="text-sm font-semibold">{option.label.charAt(0)}</span>
              </div>
              <div className="text-sm font-medium text-foreground">{option.label}</div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-start pt-2">
        <button
          onClick={goBack}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-accent active:scale-[0.98]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
      </div>
    </div>
  );

  const renderUseCaseStep = () => (
    <div className="space-y-6">
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
              onClick={() => handleUseCaseSelect(option.value)}
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

      <div className="flex justify-start pt-2">
        <button
          onClick={goBack}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-accent active:scale-[0.98]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
      </div>
    </div>
  );

  const renderDetailsStep = () => {
    const canSubmit = agentName.trim() && mainGoal.trim() && !createAgent.isPending;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1">Agent details</h2>
          <p className="text-sm text-muted-foreground">Give your agent a name and describe its primary goal.</p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Agent name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="e.g., Front Desk Agent"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Website</label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://www.example.com"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
            />
            <p className="text-xs text-muted-foreground mt-1">We&apos;ll use this to train your agent about your business.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Main goal <span className="text-red-500">*</span>
            </label>
            <textarea
              value={mainGoal}
              onChange={(e) => setMainGoal(e.target.value)}
              rows={3}
              placeholder="e.g., Book appointments for new customers, qualify leads and collect contact info..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
            />
            <p className="text-xs text-muted-foreground mt-1">Describe what you want the agent to accomplish on each call.</p>
          </div>
        </div>

        <div className="flex justify-between pt-2">
          <button
            onClick={goBack}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-accent active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1b191a] px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#2d2a2b] hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createAgent.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Agent"
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
              <Bot className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground">New Agent</span>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1 px-6 pt-5 pb-1">
          {allSteps.map((s, idx) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold font-mono transition-all duration-200 ${
                  idx < currentStepIndex
                    ? "bg-[#1b191a] text-white"
                    : idx === currentStepIndex
                      ? "border-2 border-[#1b191a] text-[#1b191a]"
                      : "border border-border text-muted-foreground/50"
                }`}
              >
                {idx < currentStepIndex ? (
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ) : (
                  String(idx + 1).padStart(2, "0")
                )}
              </span>
              <span className={`text-xs font-medium hidden sm:inline ${
                idx <= currentStepIndex ? "text-foreground" : "text-muted-foreground/50"
              }`}>
                {STEP_LABELS[s]}
              </span>
              {idx < allSteps.length - 1 && (
                <div className="flex-1 mx-2">
                  <div className={`h-px w-full transition-colors duration-300 ${idx < currentStepIndex ? "bg-[#1b191a]" : "bg-border"}`} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {step === "template" && renderTemplateStep()}
          {step === "industry" && renderIndustryStep()}
          {step === "use_case" && renderUseCaseStep()}
          {step === "details" && renderDetailsStep()}
        </div>
      </div>
    </div>
  );
}
