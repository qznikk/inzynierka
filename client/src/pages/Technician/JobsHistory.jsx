import React, { useEffect, useState, useCallback } from "react";
import { useNotify } from "../../notifications/NotificationContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function JobsHistory() {
  const token = localStorage.getItem("token");
  const notify = useNotify();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  const buildHeaders = () => {
    const h = { "Content-Type": "application/json" };
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
        throw new Error(
          body.error || body.message || "Failed to load job history"
        );
      }

      const all = body.jobs || body || [];
      setJobs(all.filter((j) => j.status?.toUpperCase() === "DONE"));
    } catch (err) {
      console.error(err);
      notify.error(err.message || "Error while loading job history");
    } finally {
      setLoading(false);
    }
  }, [token, notify]);

  useEffect(() => {
    if (!token) return;
    fetchJobs();
  }, [token, fetchJobs]);

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr : d.toLocaleString();
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-textPrimary">
          Completed jobs history
        </h1>
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
                <th className="px-3 py-2">Completion date</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="4"
                    className="px-3 py-6 text-center text-textSecondary"
                  >
                    Loading…
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="px-3 py-6 text-center text-textSecondary"
                  >
                    No completed jobs.
                  </td>
                </tr>
              ) : (
                jobs.map((j) => (
                  <tr
                    key={j.id}
                    className="border-b border-borderSoft last:border-none"
                  >
                    <td className="px-3 py-2 text-textPrimary">
                      {j.external_number || `#${j.id}`}
                    </td>

                    <td className="px-3 py-2">
                      <div className="text-textPrimary">{j.title}</div>
                      <div className="text-xs text-textSecondary">
                        {j.description?.slice(0, 80)}
                      </div>
                    </td>

                    <td className="px-3 py-2 text-textPrimary">
                      {j.client_name || j.client_email || "—"}
                    </td>

                    <td className="px-3 py-2 text-textPrimary">
                      {formatDate(j.updated_at || j.completed_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
