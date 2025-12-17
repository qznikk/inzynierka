import React, { useEffect, useState } from "react";
import { useNotify } from "../notifications/NotificationContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function TechnicianJobDetailsModal({
  jobId,
  onClose,
  onUpdated,
}) {
  const notify = useNotify();
  const token = localStorage.getItem("token");

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    const abort = new AbortController();

    async function fetchJob() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/technician/jobs/${jobId}`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
          signal: abort.signal,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (res.status === 403)
            throw new Error(body.error || "Access denied (403)");
          if (res.status === 404)
            throw new Error(body.error || "Job not found (404)");
          throw new Error(body.error || "Error while fetching job details");
        }

        const data = await res.json();
        setJob(data.job || data);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("fetchJob error:", err);
          notify.error(err.message || "Error loading job");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchJob();
    return () => abort.abort();
  }, [jobId, token, notify]);

  function formatDate(d) {
    if (!d) return "—";
    const dt = new Date(d);
    return isNaN(dt) ? d : dt.toLocaleString();
  }

  async function updateStatus(newStatus) {
    try {
      const res = await fetch(`${API_BASE}/api/technician/jobs/${jobId}`, {
        method: "PUT",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update status");
      }

      const updated = await res.json();
      setJob(updated);
      notify.success("Job status has been updated");

      if (typeof onUpdated === "function") onUpdated(updated);
    } catch (err) {
      console.error(err);
      notify.error(err.message || "Error updating status");
    }
  }

  const status = job?.status?.toUpperCase();

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
            <h2 className="text-lg font-semibold text-textPrimary">
              Job details
            </h2>
            <button
              onClick={onClose}
              className="text-textSecondary hover:text-textPrimary transition"
            >
              ✕
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-textSecondary">Loading…</div>
          ) : !job ? (
            <div className="py-6 text-textSecondary">No data available</div>
          ) : (
            <div className="space-y-6 text-sm">
              {/* TITLE */}
              <Info label="Title">{job.title || "—"}</Info>

              {/* DESCRIPTION */}
              <section>
                <div className="text-xs text-textSecondary mb-1">
                  Description
                </div>
                <div className="rounded-xl border border-borderSoft bg-section p-3 whitespace-pre-wrap text-textPrimary">
                  {job.description || "—"}
                </div>
              </section>

              {/* DATE & LOCATION */}
              <div className="grid grid-cols-2 gap-4">
                <Info label="Date">
                  {formatDate(job.scheduled_date || job.created_at)}
                </Info>

                <Info label="Location">
                  {job.job_address ||
                    job.client_address ||
                    job.city ||
                    job.client_city ||
                    "—"}
                </Info>
              </div>

              {/* STATUS */}
              <section>
                <div className="text-xs text-textSecondary mb-1">Status</div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-textPrimary">
                    {job.status}
                  </span>

                  <div className="flex gap-2">
                    {status !== "IN_PROGRESS" && status !== "DONE" && (
                      <button
                        onClick={() => updateStatus("IN_PROGRESS")}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium
                                   border border-borderMedium
                                   text-primary hover:bg-accent/30 transition"
                      >
                        Start
                      </button>
                    )}

                    {status !== "DONE" && (
                      <button
                        onClick={() => updateStatus("DONE")}
                        className="ui-btn-primary text-xs px-3 py-1.5"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              </section>

              {/* ACTIONS */}
              <div className="pt-4 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-sm font-medium
                             border border-borderMedium
                             text-primary hover:bg-accent/30 transition"
                >
                  Close
                </button>
              </div>
            </div>
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
