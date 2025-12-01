"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAdminCreateAgent } from "@/hooks/api/useAdmin";
import { toast } from "sonner";

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
}

export default function CreateAgentModal({
  isOpen,
  onClose,
  organizationId,
  organizationName,
}: CreateAgentModalProps) {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [redirectNumber, setRedirectNumber] = useState("");
  const [externalId, setExternalId] = useState("");

  const createAgentMutation = useAdminCreateAgent();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !phoneNumber || !redirectNumber || !externalId) {
      toast.error("Please fill in all fields");
      return;
    }

    createAgentMutation.mutate(
      {
        organizationId,
        name,
        phoneNumber,
        redirectNumber,
        externalId,
      },
      {
        onSuccess: () => {
          toast.success("Agent created successfully");
          setName("");
          setPhoneNumber("");
          setRedirectNumber("");
          setExternalId("");
          onClose();
        },
        onError: () => {
          toast.error("Failed to create agent");
        },
      }
    );
  };

  const handleClose = () => {
    setName("");
    setPhoneNumber("");
    setRedirectNumber("");
    setExternalId("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Agent"
      subtitle={`Create a new agent for ${organizationName}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Agent Name"
          placeholder="My Agent"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="Phone Number"
          placeholder="+1234567890"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
        />
        <Input
          label="Redirect Number"
          placeholder="+1234567890"
          value={redirectNumber}
          onChange={(e) => setRedirectNumber(e.target.value)}
          required
        />
        <Input
          label="ElevenLabs Agent ID"
          placeholder="agent_xxxxxxxx"
          value={externalId}
          onChange={(e) => setExternalId(e.target.value)}
          required
        />
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

