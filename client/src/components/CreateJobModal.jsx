import React, { useState } from "react";
import { HVAC_SERVICES } from "../constants/hvacServices";
import { useNotify } from "../notifications/NotificationContext";

const STATUS_OPTIONS = [
  "WAITING",
  "TO_ASSIGN",
  "ASSIGNED",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
];

export default function CreateJobModal({
  onClose,
  onCreated,
  clients = [],
  technicians = [],
  apiBase,
  authHeaders,
}) {
  const notify = useNotify();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    client_id: "",
    technician_id: "",
    title: "",
    description: "",
    status: "WAITING",
    priority: 2,
    scheduled_date: "",
    address: "",
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function applyPreset(preset) {
    setForm((f) => ({
      ...f,
      title: preset.title,
      description: preset.description,
    }));
  }

  /* ===================== VALIDATION ===================== */
  function validateForm() {
    const letterRegex = /[a-zA-Z]{2,}/;

    if (!form.client_id) {
      notify.error("Please select a client");
      return false;
    }

    if (form.title.trim().length < 10) {
      notify.error("Title must be at least 10 characters long");
      return false;
    }

    if (!letterRegex.test(form.title)) {
      notify.error("Title must contain at least 2 letters");
      return false;
    }

    if (form.description.trim().length < 50) {
      notify.error("Description must be at least 50 characters long");
      return false;
    }

    if (!form.address.trim()) {
      notify.error("Address is required");
      return false;
    }

    if (form.address.trim().length < 10) {
      notify.error("Address must be at least 10 characters long");
      return false;
    }

    const addressRegex = /[a-zA-Z]+.*\d+|\d+.*[a-zA-Z]+/;
    if (!addressRegex.test(form.address)) {
      notify.error("Address must contain both letters and a number");
      return false;
    }

    if (!form.scheduled_date) {
      notify.error("Please select a preferred service date");
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selectedDate = new Date(form.scheduled_date);
    if (selectedDate < today) {
      notify.error("The selected date cannot be in the past");
      return false;
    }

    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const body = {
        client_id: Number(form.client_id),
        technician_id: form.technician_id ? Number(form.technician_id) : null,
        title: form.title,
        description: form.description,
        status: form.status,
        priority: Number(form.priority),
        scheduled_date: form.scheduled_date,
        address: form.address,
      };

      const res = await fetch(`${apiBase}/api/admin/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create job");
      }

      notify.success("Job has been successfully created");
      onCreated(data);
      onClose();
    } catch (err) {
      notify.error(err.message || "Error while creating the job");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-overlay backdrop-blur-sm"
        onClick={onClose}
      />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-3xl bg-modal rounded-2xl
                   border border-borderSoft shadow-xl p-6"
      >
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-textPrimary">New Job</h3>
          <p className="text-sm text-textSecondary">
            Create and assign a new service job
          </p>
        </div>

        <section className="mb-6">
          <div className="text-sm font-medium text-textPrimary mb-2">
            Suggested HVAC Services
          </div>

          <div className="flex flex-wrap gap-2">
            {HVAC_SERVICES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium
                           border border-borderMedium
                           text-primary hover:bg-accent/30 transition"
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Client" required>
            <select
              name="client_id"
              value={form.client_id}
              onChange={handleChange}
              className="ui-input w-full"
            >
              <option value="">— select client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.email} ({c.email})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Technician">
            <select
              name="technician_id"
              value={form.technician_id}
              onChange={handleChange}
              className="ui-input w-full"
            >
              <option value="">— none —</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.email})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Title" required className="md:col-span-2">
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              className="ui-input w-full"
            />
          </Field>

          <Field label="Description" required className="md:col-span-2">
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="ui-input w-full h-40 resize-none"
            />
          </Field>

          <Field label="Address" required className="md:col-span-2">
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              className="ui-input w-full"
            />
          </Field>

          <Field label="Preferred date" required>
            <input
              type="date"
              name="scheduled_date"
              value={form.scheduled_date}
              onChange={handleChange}
              className="ui-input w-full"
            />
          </Field>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium
                       border border-borderMedium
                       text-primary hover:bg-accent/30 transition"
          >
            Cancel
          </button>

          <button type="submit" disabled={loading} className="ui-btn-primary">
            {loading ? "Creating..." : "Create Job"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ================= HELPERS ================= */

function Field({ label, required, children, className = "" }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-textPrimary mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
