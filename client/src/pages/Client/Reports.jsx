import React, { useEffect, useState } from "react";
import { useNotify } from "../../notifications/NotificationContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function Reports() {
  const token = localStorage.getItem("token");
  const notify = useNotify();

  const [jobs, setJobs] = useState([]);
  const [reportsByJob, setReportsByJob] = useState({});
  const [openJobId, setOpenJobId] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetchJobs();
  }, [token]);

  async function fetchJobs() {
    try {
      const res = await fetch(`${API}/api/client/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Error loading jobs");
      }

      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err) {
      console.error(err);
      notify.error(err.message || "Error loading jobs");
    }
  }

  async function fetchReports(jobId) {
    try {
      const res = await fetch(`${API}/api/client/jobs/${jobId}/reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Error loading reports");
      }

      const data = await res.json();

      setReportsByJob((prev) => ({
        ...prev,
        [jobId]: data.reports || [],
      }));
      setOpenJobId(jobId);
    } catch (err) {
      console.error(err);
      notify.error(err.message || "Error loading reports");
    }
  }

  function formatDate(d) {
    try {
      return new Date(d).toLocaleString();
    } catch {
      return d;
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-textPrimary">
        My jobs and reports
      </h1>

      {jobs.length === 0 && (
        <div className="text-sm text-textSecondary">No jobs</div>
      )}

      {jobs.map((j) => (
        <div
          key={j.id}
          className="bg-section border border-borderSoft rounded-2xl p-4"
        >
          <div className="flex justify-between items-start">
            <div>
              <div className="font-medium text-textPrimary">
                {j.external_number || `Job #${j.id}`}
              </div>
              <div className="text-sm text-textSecondary">{j.title}</div>
            </div>

            <button
              onClick={() =>
                openJobId === j.id ? setOpenJobId(null) : fetchReports(j.id)
              }
              className="ui-btn-outline text-sm"
            >
              {openJobId === j.id ? "Hide reports" : "Show reports"}
            </button>
          </div>

          {openJobId === j.id && (
            <div className="mt-4 space-y-3">
              {(reportsByJob[j.id] || []).length === 0 ? (
                <div className="text-sm text-textSecondary">No reports</div>
              ) : (
                reportsByJob[j.id].map((r) => (
                  <div
                    key={r.id}
                    className="bg-section/60 border border-borderSoft rounded-xl p-3"
                  >
                    <div className="text-sm font-medium text-textPrimary">
                      Report #{r.id}
                    </div>
                    <div className="text-xs text-textSecondary">
                      {formatDate(r.created_at)}
                    </div>

                    <div className="mt-1 text-sm text-textPrimary">
                      {r.description || "—"}
                    </div>

                    {Array.isArray(r.photos) && r.photos.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {r.photos.map((p) => (
                          <a
                            key={p.id}
                            href={p.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <img
                              src={p.url}
                              alt={p.original_name || "photo"}
                              className="w-20 h-20 object-cover rounded-lg border border-borderSoft"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
