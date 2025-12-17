import React, { useState } from "react";
import { HVAC_SERVICES } from "../../constants/hvacServices";
import { useNotify } from "../../notifications/NotificationContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function ClientOrders() {
  const token = localStorage.getItem("token");
  const notify = useNotify();

  const [form, setForm] = useState({
    title: "",
    description: "",
    address: "",
    scheduled_date: "",
    priority: 2,
  });

  const [loading, setLoading] = useState(false);

  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  /** 🔧 APPLY HVAC PRESET */
  function applyPreset(preset) {
    setForm((f) => ({
      ...f,
      title: preset.title,
      description: preset.description,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.title || !form.description) {
      notify.error(
        "Please fill in the required fields: title and description."
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/client/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create job");

      notify.success(
        "Job created. Number: " + (data.external_number || data.id || "")
      );

      setForm({
        title: "",
        description: "",
        address: "",
        scheduled_date: "",
        priority: 2,
      });
    } catch (err) {
      console.error(err);
      notify.error(err.message || "Error while creating job");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl bg-section p-6 rounded-2xl border border-borderSoft">
      <h2 className="text-xl font-semibold mb-4 text-textPrimary">New job</h2>

      {/* 🔧 SUGGESTED HVAC SERVICES */}
      <div className="mb-5">
        <div className="text-sm font-medium mb-2 text-textPrimary">
          Suggested service type (optional)
        </div>

        <div className="flex flex-wrap gap-2">
          {HVAC_SERVICES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => applyPreset(s)}
              className="ui-btn-outline text-sm"
              style={{
                background:
                  "color-mix(in srgb, var(--brand-accent) 20%, transparent)",
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-textSecondary mt-2">
          Selecting a preset will fill in the title and description — update the
          fields marked as <b>EDIT HERE</b>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1 text-textPrimary">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            className="ui-input w-full"
            placeholder="Short description of the issue"
          />
        </div>

        <div>
          <label className="block text-sm mb-1 text-textPrimary">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            required
            className="ui-input w-full h-32 font-mono"
            placeholder="Describe the problem and any relevant details"
          />
        </div>

        <div>
          <label className="block text-sm mb-1 text-textPrimary">Address</label>
          <input
            name="address"
            value={form.address}
            onChange={handleChange}
            className="ui-input w-full"
            placeholder="City, street, apartment number"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1 text-textPrimary">
              Preferred date
            </label>
            <input
              name="scheduled_date"
              value={form.scheduled_date}
              onChange={handleChange}
              type="date"
              className="ui-input w-full"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="ui-btn-primary disabled:opacity-60"
          >
            {loading ? "Submitting..." : "Submit job"}
          </button>
          <button
            type="button"
            onClick={() =>
              setForm({
                title: "",
                description: "",
                address: "",
                scheduled_date: "",
                priority: 2,
              })
            }
            className="ui-btn-outline"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}
