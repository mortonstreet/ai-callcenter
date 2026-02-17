"use client";

import { useCallback, useState } from "react";
import {
  X,
  Bot,
  Loader2,
  Bug,
  Snowflake,
  House,
  Zap,
  Sparkles,
  Headset,
  PhoneOutgoing,
  CalendarRange,
  ClipboardCheck,
  Clock3,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCreateElevenLabsAgent } from "@/hooks/api/useAgent";
import { VoiceSelector } from "@/components/agent/VoiceSelector";
import {
  normalizeWizardInputV2,
  parseCommaSeparatedValues,
  WIZARD_DISCOVERY_PRESETS,
  WIZARD_INDUSTRY_OPTIONS,
  WIZARD_SERVICE_PRESETS,
  WIZARD_USE_CASE_OPTIONS,
  type WizardGreetingMode,
} from "@/lib/wizard-v2";

interface CreateAgentWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "industry" | "use_case" | "details";

const STEP_LABELS: Record<Step, string> = {
  industry: "Industry",
  use_case: "Use Case",
  details: "Details",
};

const INDUSTRY_ICONS: Record<string, LucideIcon> = {
  hvac: Snowflake,
  pest_control: Bug,
  electrical: Zap,
  roofing: House,
  cleaning_services: Sparkles,
};

const USE_CASE_ICONS: Record<string, LucideIcon> = {
  customer_support: Headset,
  outbound_sales: PhoneOutgoing,
  scheduling: CalendarRange,
  lead_qualification: ClipboardCheck,
  answering_service: Clock3,
};

export function CreateAgentWizard({
  isOpen,
  onClose,
}: CreateAgentWizardProps) {
  const createAgent = useCreateElevenLabsAgent();

  const [step, setStep] = useState<Step>("industry");
  const [industry, setIndustry] = useState("");
  const [useCase, setUseCase] = useState("");
  const [agentName, setAgentName] = useState("");
  const [mainObjective, setMainObjective] = useState("");
  const [services, setServices] = useState<string[]>([]);
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

  const reset = useCallback(() => {
    setStep("industry");
    setIndustry("");
    setUseCase("");
    setAgentName("");
    setMainObjective("");
    setServices([]);
    setDiscoveryQuestions([]);
    setCustomQuestionInput("");
    setKnowledgeSources([]);
    setKnowledgeSourceInput("");
    setVoiceId(null);
    setGreetingMode("generated");
    setCustomGreeting("");
    setTransferNumber("");
    setBusinessTimezone("");
    setLanguagesInput("");
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const handleIndustrySelect = (value: string) => {
    setIndustry(value);
    setServices(WIZARD_SERVICE_PRESETS[value] || []);
    setDiscoveryQuestions([]);
    setStep("use_case");
  };

  const handleUseCaseSelect = (value: string) => {
    setUseCase(value);
    setStep("details");
  };

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

  const handleSubmit = async () => {
    const customGreetingText = customGreeting.trim();
    if (!agentName.trim() || !mainObjective.trim() || services.length === 0) {
      return;
    }
    if (greetingMode === "custom" && !customGreetingText) {
      return;
    }

    await createAgent.mutateAsync(
      normalizeWizardInputV2({
        agentName,
        industry,
        useCase,
        services,
        discoveryQuestions,
        mainObjective,
        knowledgeSources,
        voiceSelection: voiceId ? { voiceId } : {},
        greeting:
          greetingMode === "custom"
            ? { mode: "custom", customText: customGreetingText }
            : { mode: "generated" },
        routing: {
          transferNumber,
          businessTimezone,
          languages: parseCommaSeparatedValues(languagesInput),
        },
      }),
    );

    handleClose();
  };

  const allSteps: Step[] = ["industry", "use_case", "details"];
  const currentStepIndex = allSteps.indexOf(step);

  const goBack = () => {
    if (currentStepIndex > 0) {
      setStep(allSteps[currentStepIndex - 1]);
    }
  };

  if (!isOpen) return null;

  const renderIndustryStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Select your industry</h2>
        <p className="text-sm text-muted-foreground">This helps tailor your wizard defaults.</p>
      </div>

      <div className="grid gap-3">
        {WIZARD_INDUSTRY_OPTIONS.map((option) => {
          const active = industry === option.value;
          const OptionIcon = INDUSTRY_ICONS[option.value] || Bot;

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
                <OptionIcon className="h-5 w-5" />
              </div>
              <div className="text-sm font-medium text-foreground">{option.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderUseCaseStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">What will your agent do?</h2>
        <p className="text-sm text-muted-foreground">Select the primary use case.</p>
      </div>

      <div className="grid gap-3">
        {WIZARD_USE_CASE_OPTIONS.map((option) => {
          const active = useCase === option.value;
          const OptionIcon = USE_CASE_ICONS[option.value] || Bot;

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
                <OptionIcon className="h-5 w-5" />
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
    const serviceOptions = industry ? WIZARD_SERVICE_PRESETS[industry] || [] : [];
    const questionOptions = industry ? WIZARD_DISCOVERY_PRESETS[industry] || [] : [];
    const customGreetingRequired = greetingMode === "custom";
    const canSubmit =
      !!industry &&
      !!useCase &&
      !!agentName.trim() &&
      !!mainObjective.trim() &&
      services.length > 0 &&
      !createAgent.isPending &&
      (!customGreetingRequired || !!customGreeting.trim());

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1">Agent details</h2>
          <p className="text-sm text-muted-foreground">Only business-level wizard inputs are exposed here.</p>
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
            <label className="block text-sm font-medium text-foreground mb-1">
              Main objective <span className="text-red-500">*</span>
            </label>
            <textarea
              value={mainObjective}
              onChange={(e) => setMainObjective(e.target.value)}
              rows={3}
              placeholder="e.g., Book appointments for new customers and qualify urgent leads"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Services</label>
            <p className="text-xs text-muted-foreground mb-3">Select one or more services.</p>
            <div className="flex flex-wrap gap-2">
              {serviceOptions.map((service) => {
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-foreground">Discovery questions</label>
              <span className="text-xs text-muted-foreground">Optional</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {questionOptions.map((question) => {
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
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
              />
              <button
                type="button"
                onClick={handleAddCustomQuestion}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Add
              </button>
            </div>

            {discoveryQuestions.length > 0 && (
              <div className="space-y-2">
                {discoveryQuestions.map((question, index) => (
                  <div key={`${index}-${question}`} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => handleQuestionChange(index, e.target.value)}
                      className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuestionRemove(index)}
                      className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">Knowledge sources</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={knowledgeSourceInput}
                onChange={(e) => setKnowledgeSourceInput(e.target.value)}
                placeholder="https://example.com/pricing or doc://faq"
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
              />
              <button
                type="button"
                onClick={handleAddKnowledgeSource}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Add
              </button>
            </div>
            {knowledgeSources.length > 0 && (
              <div className="space-y-2">
                {knowledgeSources.map((source, index) => (
                  <div key={`${index}-${source}`} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={source}
                      onChange={(e) => handleKnowledgeSourceChange(index, e.target.value)}
                      className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => handleKnowledgeSourceRemove(index)}
                      className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
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
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
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
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
            />
            <input
              type="text"
              value={businessTimezone}
              onChange={(e) => setBusinessTimezone(e.target.value)}
              placeholder="Business timezone (IANA, e.g., America/Chicago)"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
            />
            <input
              type="text"
              value={languagesInput}
              onChange={(e) => setLanguagesInput(e.target.value)}
              placeholder="Languages (comma-separated, e.g., English, Spanish)"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60"
            />
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
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card shadow-2xl">
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

        <div className="px-6 py-5">
          {step === "industry" && renderIndustryStep()}
          {step === "use_case" && renderUseCaseStep()}
          {step === "details" && renderDetailsStep()}
        </div>
      </div>
    </div>
  );
}
