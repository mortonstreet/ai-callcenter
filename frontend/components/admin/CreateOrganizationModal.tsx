"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAdminCreateOrganization } from "@/hooks/api/useAdmin";
import { toast } from "sonner";

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateOrganizationModal({
  isOpen,
  onClose,
}: CreateOrganizationModalProps) {
  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");

  const createOrgMutation = useAdminCreateOrganization();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !ownerEmail) {
      toast.error("Please fill in all fields");
      return;
    }

    createOrgMutation.mutate(
      { name, ownerEmail },
      {
        onSuccess: () => {
          toast.success("Organization created successfully");
          setName("");
          setOwnerEmail("");
          onClose();
        },
        onError: () => {
          toast.error("Failed to create organization");
        },
      }
    );
  };

  const handleClose = () => {
    setName("");
    setOwnerEmail("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Organization"
      subtitle="Create a new organization with an owner"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Organization Name"
          placeholder="Acme Corp"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="Owner Email"
          type="email"
          placeholder="owner@example.com"
          value={ownerEmail}
          onChange={(e) => setOwnerEmail(e.target.value)}
          required
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={createOrgMutation.isPending}
            disabled={createOrgMutation.isPending}
          >
            Create Organization
          </Button>
        </div>
      </form>
    </Modal>
  );
}
