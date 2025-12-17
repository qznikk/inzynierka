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

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.client_id || !form.title || !form.description) {
      notify.error(
        "Please fill in the required fields: client, title and description."
      );
      return;
    }

    setLoading(true);
    try {
      const body = {
        client_id: Number(form.client_id),
        technician_id: form.technician_id ? Number(form.technician_id) : null,
        title: form.title,
        description: form.description,
        status: form.status,
        priority: Number(form.priority),
        scheduled_date: form.scheduled_date || null,
        address: form.address || null,
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
      {/* OVERLAY */}
      <div
        className="absolute inset-0 bg-overlay backdrop-blur-sm"
        onClick={onClose}
      />

      {/* MODAL */}
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-3xl bg-modal rounded-2xl
                   border border-borderSoft shadow-xl p-6"
      >
        {/* HEADER */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-textPrimary">New Job</h3>
          <p className="text-sm text-textSecondary">
            Create and assign a new service job
          </p>
        </div>

        {/* HVAC PRESETS */}
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

        {/* FORM */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* CLIENT */}
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

          {/* TECHNICIAN */}
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

          {/* TITLE */}
          <Field label="Title" required className="md:col-span-2">
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              className="ui-input w-full"
              placeholder="Short description of the issue"
            />
          </Field>

          {/* DESCRIPTION */}
          <Field label="Description" required className="md:col-span-2">
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="ui-input w-full h-40 resize-none"
              placeholder="Describe the problem and any relevant details"
            />
          </Field>

          {/* ADDRESS */}
          <Field label="Address" className="md:col-span-2">
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              className="ui-input w-full"
              placeholder="City, street, apartment number"
            />
          </Field>

          {/* DATE */}
          <Field label="Preferred date">
            <input
              type="date"
              name="scheduled_date"
              value={form.scheduled_date}
              onChange={handleChange}
              className="ui-input w-full"
            />
          </Field>
        </div>

        {/* ACTIONS */}
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
