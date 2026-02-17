"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useCreateAgent } from "@/hooks/api/useAgent";
import { toast } from "sonner";

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateAgentModal({
  isOpen,
  onClose,
}: CreateAgentModalProps) {
  const [name, setName] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [prompt, setPrompt] = useState("");

  const createAgentMutation = useCreateAgent();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !firstMessage || !prompt) {
      toast.error("Please fill in all fields");
      return;
    }

    createAgentMutation.mutate(
      { name, firstMessage, prompt },
      {
        onSuccess: () => {
          toast.success("Agent created successfully");
          setName("");
          setFirstMessage("");
          setPrompt("");
          onClose();
        },
      }
    );
  };

  const handleClose = () => {
    setName("");
    setFirstMessage("");
    setPrompt("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Agent"
      subtitle="Create a new AI agent"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Agent Name"
          placeholder="e.g. Front Desk Agent"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="First Message"
          placeholder="e.g. Hi, thanks for calling! How can I help you today?"
          value={firstMessage}
          onChange={(e) => setFirstMessage(e.target.value)}
          required
        />
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-800">System Prompt</span>
          <textarea
            placeholder="e.g. You are a helpful front desk agent for a plumbing company..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            required
            rows={4}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition
                       focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]
                       text-black placeholder:text-gray-400 resize-none"
          />
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={createAgentMutation.isPending}
            disabled={createAgentMutation.isPending}
          >
            Create Agent
          </Button>
        </div>
      </form>
    </Modal>
  );
}
