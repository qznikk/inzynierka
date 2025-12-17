import React, { useEffect, useState } from "react";
import { useNotify } from "../notifications/NotificationContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";
const STATUS_OPTIONS = [
  "WAITING",
  "TO_ASSIGN",
  "ASSIGNED",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
];

export default function JobDetailsModal({ jobId, onClose, onUpdated }) {
  const notify = useNotify();
  const token = localStorage.getItem("token");

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [techList, setTechList] = useState([]);
  const [selectedTech, setSelectedTech] = useState("");

  useEffect(() => {
    if (!token || !jobId) return;
    fetchJob();
    fetchTechnicians();
  }, [token, jobId]);

  async function fetchJob() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/jobs/${jobId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (!res.ok) throw new Error("Failed to fetch job details");
      const data = await res.json();
      setJob(data);
      setSelectedTech(data.technician_id || "");
    } catch (err) {
      notify.error(err.message || "Error loading job details");
    } finally {
      setLoading(false);
    }
  }

  async function fetchTechnicians() {
    try {
      const res = await fetch(`${API_BASE}/api/admin/technicians`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (!res.ok) return;
      const data = await res.json();
      setTechList(data.technicians || []);
    } catch (err) {
      console.error("fetch technicians", err);
    }
  }

  async function handleUpdateStatus(newStatus) {
    if (!job) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/jobs/${job.id}`, {
        method: "PUT",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update job status");
      }
      await fetchJob();
      notify.success("Job status has been updated");
      onUpdated?.();
    } catch (err) {
      notify.error(err.message || "Error updating job status");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign() {
    if (!selectedTech) {
      notify.error("Please select a technician");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/jobs/${job.id}/assign`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ technician_id: selectedTech }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to assign technician");
      }
      await fetchJob();
      notify.success("Technician has been assigned to the job");
      onUpdated?.();
    } catch (err) {
      notify.error(err.message || "Error assigning technician");
    } finally {
      setSaving(false);
    }
  }

  if (!jobId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* OVERLAY */}
      <div
        className="absolute inset-0 bg-overlay backdrop-blur-sm"
        onClick={onClose}
      />

      {/* MODAL */}
      <div className="relative w-full max-w-2xl">
        <div className="bg-modal rounded-2xl border border-borderSoft shadow-xl p-6">
          {/* HEADER */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <h3 className="text-lg font-semibold text-textPrimary">
              Job details {job?.external_number ?? `#${jobId}`}
            </h3>
            <button
              onClick={onClose}
              className="text-textSecondary hover:text-textPrimary transition"
            >
              ✕
            </button>
          </div>

          {loading ? (
            <div className="text-sm text-textSecondary">Loading…</div>
          ) : job ? (
            <div className="space-y-6 text-sm">
              {/* BASIC INFO */}
              <div className="grid grid-cols-2 gap-4">
                <Info label="Title">{job.title || "—"}</Info>
                <Info label="Job number">
                  {job.external_number || `#${job.id}`}
                </Info>

                <Info label="Client">
                  {job.client_name || job.client_email || "—"}
                  {job.client_email && (
                    <div className="text-xs text-textSecondary">
                      {job.client_email}
                    </div>
                  )}
                </Info>

                <Info label="Technician">
                  {job.tech_name || "—"}
                  {job.tech_email && (
                    <div className="text-xs text-textSecondary">
                      {job.tech_email}
                    </div>
                  )}
                </Info>
              </div>

              {/* DESCRIPTION */}
              <section>
                <div className="text-xs text-textSecondary mb-1">
                  Description
                </div>
                <div className="rounded-xl border border-borderSoft bg-section p-3 whitespace-pre-wrap text-textPrimary">
                  {job.description || "—"}
                </div>
              </section>

              {/* STATUS + DATE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Info label="Status">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{job.status}</span>
                    <select
                      value={job.status}
                      onChange={(e) => handleUpdateStatus(e.target.value)}
                      disabled={saving}
                      className="ui-input text-sm min-w-[160px]"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </Info>

                <Info label="Date">
                  {job.scheduled_date
                    ? new Date(job.scheduled_date).toLocaleDateString()
                    : job.created_at
                    ? new Date(job.created_at).toLocaleString()
                    : "—"}
                </Info>
              </div>

              {/* ASSIGN */}
              <section>
                <div className="text-xs text-textSecondary mb-2">
                  Assign technician
                </div>
                <div className="flex gap-2 items-center">
                  <select
                    value={selectedTech}
                    onChange={(e) => setSelectedTech(e.target.value)}
                    className="ui-input flex-1"
                  >
                    <option value="">— select technician —</option>
                    {techList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.email})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssign}
                    disabled={saving}
                    className="ui-btn-primary"
                  >
                    Assign
                  </button>
                </div>
              </section>

              {/* ADDRESS */}
              {job.address && <Info label="Address">{job.address}</Info>}

              {/* ACTIONS */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-sm font-medium
                             border border-borderMedium
                             text-primary hover:bg-accent/30 transition"
                >
                  Close
                </button>

                <button
                  onClick={() => handleUpdateStatus("DONE")}
                  disabled={saving}
                  className="ui-btn-primary"
                >
                  Mark as completed
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-textSecondary">No data available</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= HELPERS ================= */

function Info({ label, children }) {
  return (
    <div>
      <div className="text-xs text-textSecondary">{label}</div>
      <div className="text-sm font-medium text-textPrimary">{children}</div>
    </div>
  );
}
