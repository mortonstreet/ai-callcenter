"use client";

import { Page } from "@/components/dashboard/Page";
import Link from "next/link";
import { Bot, Loader2, Plus } from "lucide-react";
import { useAgents, useCreateAgent } from "@/hooks/api/useAgent";
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { toast } from "sonner";

export default function AgentsPage() {
  const { data: agents, isLoading, error } = useAgents();
  const createAgent = useCreateAgent();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("+18566444365");
  const [redirectNumber, setRedirectNumber] = useState("+18566444365");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Agent name is required");
      return;
    }
    createAgent.mutate(
      {
        name: name.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        redirectNumber: redirectNumber.trim() || undefined,
      },
      {
        onSuccess: () => {
          setShowModal(false);
          setName("");
          setPhoneNumber("+18566444365");
          setRedirectNumber("+18566444365");
        },
      }
    );
  };

  return (
    <Page 
      title="Agents" 
      subtitle="Your AI agents"
    >
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setShowModal(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add agent
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">Failed to load agents. Please try again.</p>
          </div>
        )}

        {!isLoading && !error && agents && agents.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Link
                key={agent.id}
                href={`/dashboard/agents/${agent.id}`}
                className="group p-6 bg-white rounded-lg border border-gray-200 hover:border-[var(--color-primary)] hover:shadow-md transition cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-5 w-5 text-[var(--color-primary)]" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-[var(--color-primary)] transition">
                  {agent.name}
                </h3>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Phone: {agent.phoneNumber}</p>
                  <p>Created {new Date(agent.createdAt).toLocaleDateString()}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!isLoading && !error && (!agents || agents.length === 0) && (
          <div className="text-center py-12">
            <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No agents yet</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create AI Agent"
        subtitle="Provide the details to set up your ElevenLabs-backed agent."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Agent name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Dispatch Assistant"
            required
          />
          <Input
            label="Phone number (assigned)"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            hint="Number that will receive inbound calls for this agent."
          />
          <Input
            label="Redirect number (fallback/CLI)"
            value={redirectNumber}
            onChange={(e) => setRedirectNumber(e.target.value)}
            hint="Used for call identification; update later if needed."
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createAgent.isPending}>
              Create agent
            </Button>
          </div>
        </form>
      </Modal>
    </Page>
  );
}
