import React, { useEffect, useState, useCallback } from "react";
import JobDetailsModalTechnician from "../../components/JobDetailsModalTechnician";
import { useNotify } from "../../notifications/NotificationContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

const STATUS_BADGE = {
  WAITING: "var(--status-waiting)",
  TO_ASSIGN: "var(--status-danger)",
  ASSIGNED: "var(--status-info)",
  IN_PROGRESS: "var(--status-success)",
  DONE: "var(--status-muted)",
  CANCELLED: "var(--status-muted)",
};

export default function TechnicianJobs() {
  const token = localStorage.getItem("token");
  const notify = useNotify();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [jobDetailsId, setJobDetailsId] = useState(null);

  const buildHeaders = (extra = {}) => {
    const h = { "Content-Type": "application/json", ...extra };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  };

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/technician/jobs`, {
        headers: buildHeaders(),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || body.message || "Failed to load jobs");
      }

      const allJobs = body.jobs || body || [];

      // only active jobs
      setJobs(allJobs.filter((j) => j.status?.toUpperCase() !== "DONE"));
    } catch (err) {
      console.error(err);
      notify.error(err.message || "Error while fetching jobs");
    } finally {
      setLoading(false);
    }
  }, [token, notify]);

  useEffect(() => {
    if (!token) return;
    fetchJobs();
  }, [token, fetchJobs]);

  async function updateStatus(jobId, newStatus) {
    try {
      const res = await fetch(`${API_BASE}/api/technician/jobs/${jobId}`, {
        method: "PUT",
        headers: buildHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || body.message || "Update failed");
      }

      notify.success(
        newStatus === "DONE"
          ? "The job has been completed"
          : "Job status updated"
      );

      fetchJobs();
    } catch (err) {
      console.error(err);
      notify.error(err.message || "Error updating job status");
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr : d.toLocaleString();
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-textPrimary">Your jobs</h1>
        <button onClick={fetchJobs} className="ui-btn-outline">
          Refresh
        </button>
      </header>

      <section className="bg-section p-4 rounded-2xl border border-borderSoft">
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto text-sm">
            <thead>
              <tr className="text-left text-textSecondary border-b border-borderSoft">
                <th className="px-3 py-2">No.</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-3 py-6 text-center text-textSecondary"
                  >
                    Loading…
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-3 py-6 text-center text-textSecondary"
                  >
                    No active jobs.
                  </td>
                </tr>
              ) : (
                jobs.map((j) => {
                  const status = j.status?.toUpperCase();

                  return (
                    <tr
                      key={j.id}
                      className="border-b border-borderSoft last:border-none"
                    >
                      <td className="px-3 py-2 align-top">
                        <div className="font-medium text-textPrimary">
                          {j.external_number || `#${j.id}`}
                        </div>
                        <div className="text-xs text-textSecondary">
                          {j.priority === 1
                            ? "High"
                            : j.priority === 3
                            ? "Low"
                            : "Normal"}
                        </div>
                      </td>

                      <td className="px-3 py-2 align-top">
                        <div className="text-textPrimary">{j.title}</div>
                        <div className="text-xs text-textSecondary">
                          {j.description?.slice(0, 80)}
                        </div>
                      </td>

                      <td className="px-3 py-2 align-top text-textPrimary">
                        {j.client_name || j.client_email || "—"}
                      </td>

                      <td className="px-3 py-2 align-top text-textPrimary">
                        {formatDate(j.scheduled_date || j.created_at)}
                      </td>

                      <td className="px-3 py-2 align-top">
                        <span
                          className="inline-block text-xs font-medium px-2 py-1 rounded"
                          style={{
                            background: `color-mix(in srgb, ${STATUS_BADGE[status]} 20%, transparent)`,
                            color: STATUS_BADGE[status],
                          }}
                        >
                          {j.status}
                        </span>
                      </td>

                      <td className="px-3 py-2 align-top">
                        <div className="flex gap-2 flex-wrap">
                          {status !== "IN_PROGRESS" && (
                            <button
                              onClick={() => updateStatus(j.id, "IN_PROGRESS")}
                              className="ui-btn-outline text-xs"
                            >
                              Start
                            </button>
                          )}

                          <button
                            onClick={() => updateStatus(j.id, "DONE")}
                            className="ui-btn-outline text-xs"
                          >
                            Complete
                          </button>

                          <button
                            onClick={() => setJobDetailsId(j.id)}
                            className="ui-btn-outline text-xs"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {jobDetailsId && (
        <JobDetailsModalTechnician
          jobId={jobDetailsId}
          onClose={() => setJobDetailsId(null)}
          onUpdated={() => {
            fetchJobs();
            setJobDetailsId(null);
          }}
        />
      )}
    </div>
  );
}
