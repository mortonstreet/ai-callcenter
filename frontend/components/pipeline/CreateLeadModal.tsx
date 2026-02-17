"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { toast } from "sonner";

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipelineStageId?: string;
  onSubmit: (data: {
    customerName: string;
    phone: string;
    address: string;
    estimatedValue?: number;
    pipelineStageId?: string;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export function CreateLeadModal({
  isOpen,
  onClose,
  pipelineStageId,
  onSubmit,
  isSubmitting,
}: CreateLeadModalProps) {
  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
    address: "",
    estimatedValue: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.phone) {
      toast.error("Phone number is required");
      return;
    }

    try {
      await onSubmit({
        customerName: formData.customerName || "Unknown Customer",
        phone: formData.phone,
        address: formData.address || "",
        estimatedValue: formData.estimatedValue
          ? parseFloat(formData.estimatedValue)
          : undefined,
        pipelineStageId,
      });

      setFormData({
        customerName: "",
        phone: "",
        address: "",
        estimatedValue: "",
      });
      onClose();
    } catch {
      toast.error("Failed to create lead");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Lead"
      subtitle="Add a new lead to your pipeline"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Customer Name"
          value={formData.customerName}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, customerName: e.target.value }))
          }
          placeholder="John Doe"
        />

        <Input
          label="Phone"
          type="tel"
          value={formData.phone}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, phone: e.target.value }))
          }
          placeholder="+1 (555) 123-4567"
          required
        />

        <Input
          label="Address"
          value={formData.address}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, address: e.target.value }))
          }
          placeholder="123 Main St"
        />

        <Input
          label="Estimated Value"
          type="number"
          value={formData.estimatedValue}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              estimatedValue: e.target.value,
            }))
          }
          placeholder="10000"
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isSubmitting ? "Creating..." : "Add Lead"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
