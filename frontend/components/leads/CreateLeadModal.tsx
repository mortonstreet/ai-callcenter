"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useCreateLead } from "@/hooks/api/useLeads";
import { toast } from "sonner";

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateLeadModal({ isOpen, onClose }: CreateLeadModalProps) {
  const createLead = useCreateLead();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    company: "",
    title: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phone.trim()) {
      toast.error("Phone number is required");
      return;
    }
    try {
      await createLead.mutateAsync({
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        phone: form.phone,
        email: form.email || undefined,
        company: form.company || undefined,
        title: form.title || undefined,
      });
      toast.success("Lead created");
      setForm({ firstName: "", lastName: "", phone: "", email: "", company: "", title: "" });
      onClose();
    } catch {
      toast.error("Failed to create lead");
    }
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Lead" subtitle="Create a new lead">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="First Name" value={form.firstName} onChange={set("firstName")} placeholder="Jane" />
          <Input label="Last Name" value={form.lastName} onChange={set("lastName")} placeholder="Doe" />
        </div>
        <Input label="Phone *" value={form.phone} onChange={set("phone")} placeholder="+1 (555) 123-4567" required />
        <Input label="Email" type="email" value={form.email} onChange={set("email")} placeholder="jane@company.com" />
        <Input label="Company" value={form.company} onChange={set("company")} placeholder="Acme Inc." />
        <Input label="Title" value={form.title} onChange={set("title")} placeholder="VP of Sales" />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={createLead.isPending}>Add Lead</Button>
        </div>
      </form>
    </Modal>
  );
}
