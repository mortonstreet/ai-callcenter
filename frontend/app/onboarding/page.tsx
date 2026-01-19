"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useOnboardOrganization } from "@/hooks/api/useOrganization";
import { toast } from "sonner";

type Step = "org" | "agent" | "review";

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
    "What’s the home/business type and panel age?",
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

  const renderOrgStep = () => (
    <Card title="Tell us about the company">
      <div className="space-y-4">
        <Input label="Company name" value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
        <Input label="Company domain" placeholder="www.example.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
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
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Services</label>
          <p className="text-xs text-gray-500 mb-2">Pick all that apply. We’ll tailor the agent questions to these services.</p>
          <div className="flex flex-wrap gap-2">
            {(SERVICE_PRESETS[industry] || []).map((svc) => (
              <button
                key={svc}
                type="button"
                onClick={() => handleServiceToggle(svc)}
                className={`px-3 py-1 rounded-full border text-sm flex items-center gap-2 ${services.includes(svc) ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/10" : "border-gray-300 text-gray-700"}`}
              >
                <span
                  className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm border ${
                    services.includes(svc) ? "border-[var(--color-primary)] bg-[var(--color-primary)]" : "border-gray-400 bg-white"
                  }`}
                >
                  {services.includes(svc) && <span className="block h-2 w-2 bg-white rounded-sm" />}
                </span>
                {svc}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <Button onClick={() => setStep("agent")}>Next</Button>
      </div>
    </Card>
  );

  const renderAgentStep = () => (
    <Card title="Create your agent">
      <div className="space-y-4">
        <Input label="Agent name" value={agentName} onChange={(e) => setAgentName(e.target.value)} required />
        <Input label="Opening line" placeholder="Hi, thanks for calling..." value={openingLine} onChange={(e) => setOpeningLine(e.target.value)} />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Service questions</label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => handleAddQuestion()} className="px-3 py-1 text-sm">
                Add question
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-500">These help the agent qualify and route the request.</p>
          <div className="flex flex-wrap gap-2">
            {(QUESTION_PRESETS[industry] || []).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleAddQuestion(q)}
                className={`text-xs px-3 py-1 rounded-full border ${
                  serviceQuestions.includes(q)
                    ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/10"
                    : "border-gray-300 text-gray-700"
                }`}
              >
                + {q}
              </button>
            ))}
          </div>
          {serviceQuestions.length === 0 && (
            <p className="text-sm text-gray-500">Add a few questions you want the agent to ask.</p>
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
      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={() => setStep("org")}>Back</Button>
        <Button onClick={() => setStep("review")}>Next</Button>
      </div>
    </Card>
  );

  const renderReviewStep = () => (
    <Card title="Review and create">
      <div className="space-y-4 text-sm text-gray-800">
        <div>
          <div className="font-semibold">Company</div>
          <div>{orgName || "-"}</div>
          <div>{domain || "-"}</div>
          <div>Industry: {industry}</div>
          <div>Services: {currentServices.join(", ") || "-"}</div>
        </div>
        <div className="border-t border-gray-200 pt-4">
          <div className="font-semibold">Agent</div>
          <div>{agentName || "-"}</div>
          <div>Opening line: {openingLine || "-"}</div>
          <div>Questions:</div>
          <ul className="list-disc list-inside">
            {serviceQuestions.length > 0 ? serviceQuestions.map((q, idx) => <li key={idx}>{q}</li>) : <li>-</li>}
          </ul>
        </div>
      </div>
      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={() => setStep("agent")}>Back</Button>
        <Button loading={onboardMutation.isPending} onClick={handleSubmit}>Create agent & finish</Button>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-gray-100 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-3 py-1 text-xs font-semibold">
            Quick setup
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Organization onboarding</h1>
          <p className="text-gray-600">Tell us about the company, choose services, and stand up your first agent.</p>
          <div className="flex items-center justify-center gap-3 text-xs text-gray-700">
            {[
              { key: "org", label: "Company" },
              { key: "agent", label: "Agent" },
              { key: "review", label: "Review" },
            ].map((s, idx, arr) => (
              <div key={s.key} className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border ${
                      step === s.key
                        ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                        : "bg-white text-gray-700 border-gray-300"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span className="mt-1 text-[11px]">{s.label}</span>
                </div>
                {idx < arr.length - 1 && (
                  <div className="flex-1 h-0.5 w-12">
                    <div
                      className={`h-0.5 w-full rounded-full ${
                        ["org", "agent", "review"].indexOf(step) > idx ? "bg-[var(--color-primary)]" : "bg-gray-300"
                      }`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {step === "org" && renderOrgStep()}
        {step === "agent" && renderAgentStep()}
        {step === "review" && renderReviewStep()}
      </div>
    </div>
  );
}

