import React, { useEffect, useState, useCallback, useMemo } from "react";
import ReportDetails from "../../components/ReportDetails";
import { useNotify } from "../../notifications/NotificationContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

function truncate(text, max = 80) {
  if (!text) return "—";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export default function TechnicianReports() {
  const token = localStorage.getItem("token");
  const notify = useNotify();

  const [reports, setReports] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [showModalNew, setShowModalNew] = useState(false);
  const [selectedForDetails, setSelectedForDetails] = useState(null);

  // new report form
  const [selectedJobId, setSelectedJobId] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]);

  // filters
  const [qText, setQText] = useState("");
  const [onlyWithPhotos, setOnlyWithPhotos] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");

  const buildHeaders = (extra = {}) => {
    const h = { ...extra };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  };

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/technician/reports`, {
        headers: buildHeaders({ "Content-Type": "application/json" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || body?.message || res.status);
      setReports(body.reports || []);
    } catch (err) {
      console.error(err);
      notify.error(err.message || "Error while fetching reports");
    } finally {
      setLoading(false);
    }
  }, [token, notify]);

  const fetchJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const res = await fetch(`${API_BASE}/api/technician/jobs`, {
        headers: buildHeaders({ "Content-Type": "application/json" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || body?.message || res.status);
      setJobs(body.jobs || []);
    } catch (err) {
      console.error(err);
      notify.error(err.message || "Error while fetching jobs");
    } finally {
      setLoadingJobs(false);
    }
  }, [token, notify]);

  useEffect(() => {
    if (!token) return;
    fetchReports();
    fetchJobs();
  }, [token, fetchReports, fetchJobs]);

  function onFilesChange(e) {
    setFiles(Array.from(e.target.files || []));
  }

  async function handleSubmitNew(e) {
    e.preventDefault();

    if (!selectedJobId) {
      notify.error("Please select a job");
      return;
    }

    try {
      const fd = new FormData();
      fd.append("description", description || "");
      files.forEach((f) => fd.append("photos", f));

      const res = await fetch(
        `${API_BASE}/api/technician/jobs/${selectedJobId}/reports`,
        { method: "POST", headers: buildHeaders(), body: fd }
      );

      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || body?.message || res.status);

      notify.success("Report has been submitted");

      setSelectedJobId("");
      setDescription("");
      setFiles([]);
      setShowModalNew(false);
      fetchReports();
    } catch (err) {
      console.error(err);
      notify.error(err.message || "Error while submitting report");
    }
  }

  const filteredAndSortedReports = useMemo(() => {
    const q = qText.trim().toLowerCase();

    return (reports || [])
      .filter((r) => {
        if (onlyWithPhotos && (!r.photos || r.photos.length === 0))
          return false;

        if (dateFrom || dateTo) {
          const created = r.created_at ? new Date(r.created_at) : null;
          if (!created) return false;
          if (dateFrom && created < new Date(dateFrom)) return false;
          if (dateTo && created > new Date(dateTo + "T23:59:59")) return false;
        }

        if (q) {
          const hay =
            `${r.id} ${r.job_external_number} ${r.job_title} ${r.description}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }

        return true;
      })
      .sort((a, b) =>
        sortOrder === "newest"
          ? new Date(b.created_at) - new Date(a.created_at)
          : new Date(a.created_at) - new Date(b.created_at)
      );
  }, [reports, qText, onlyWithPhotos, dateFrom, dateTo, sortOrder]);

  function resetFilters() {
    setQText("");
    setOnlyWithPhotos(false);
    setDateFrom("");
    setDateTo("");
    setSortOrder("newest");
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-textPrimary">
          Technician reports
        </h1>

        <div className="flex gap-2">
          <button onClick={fetchReports} className="ui-btn-outline">
            Refresh
          </button>
          <button
            onClick={() => setShowModalNew(true)}
            className="ui-btn-primary"
          >
            New report
          </button>
        </div>
      </header>

      {/* FILTERS */}
      <section className="bg-section p-4 rounded-2xl border border-borderSoft">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            placeholder="Search…"
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            className="ui-input w-full"
          />

          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="ui-input w-full"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="ui-input w-full"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <label className="flex items-center gap-2 text-sm text-textSecondary">
              <input
                type="checkbox"
                checked={onlyWithPhotos}
                onChange={(e) => setOnlyWithPhotos(e.target.checked)}
              />
              Only with photos
            </label>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="ui-input"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>

            <button onClick={resetFilters} className="ui-btn-outline text-sm">
              Clear
            </button>
          </div>
        </div>
      </section>

      {/* TABLE */}
      <section className="bg-section p-4 rounded-2xl border border-borderSoft">
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto text-sm">
            <thead>
              <tr className="text-left text-textSecondary border-b border-borderSoft">
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Job</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Photos</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-3 py-6 text-center text-textSecondary"
                  >
                    Loading…
                  </td>
                </tr>
              ) : filteredAndSortedReports.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-3 py-6 text-center text-textSecondary"
                  >
                    No reports found.
                  </td>
                </tr>
              ) : (
                filteredAndSortedReports.map((r) => {
                  const photos = r.photos || [];
                  const extra = Math.max(0, photos.length - 3);

                  return (
                    <tr
                      key={r.id}
                      className="border-b border-borderSoft last:border-none"
                    >
                      <td className="px-3 py-2 text-textPrimary">{r.id}</td>
                      <td className="px-3 py-2 text-textPrimary">
                        {r.job_external_number || `#${r.job_id}`}
                      </td>
                      <td className="px-3 py-2 text-textPrimary">
                        {r.job_title || "—"}
                      </td>
                      <td className="px-3 py-2 text-textSecondary">
                        {truncate(r.description, 80)}
                      </td>

                      <td className="px-3 py-2">
                        {photos.length > 0 ? (
                          <div className="flex items-center gap-2">
                            {photos.slice(0, 3).map((p) => (
                              <img
                                key={p.id}
                                src={p.url}
                                alt=""
                                className="w-14 h-14 rounded object-cover cursor-pointer"
                                onClick={() => setSelectedForDetails(r)}
                              />
                            ))}
                            {extra > 0 && (
                              <button
                                onClick={() => setSelectedForDetails(r)}
                                className="ui-btn-outline text-xs"
                              >
                                +{extra}
                              </button>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-3 py-2 text-textPrimary">
                        {new Date(r.created_at).toLocaleString()}
                      </td>

                      <td className="px-3 py-2">
                        <button
                          onClick={() => setSelectedForDetails(r)}
                          className="ui-btn-outline text-sm"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* NEW REPORT MODAL */}
      {showModalNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
          <div className="bg-modal w-full max-w-2xl rounded-2xl border border-borderSoft p-6">
            <form onSubmit={handleSubmitNew} className="space-y-4">
              <h2 className="text-lg font-semibold text-textPrimary">
                New report
              </h2>

              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="ui-input w-full"
              >
                <option value="">Select job…</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.external_number
                      ? `${j.external_number} — ${j.title}`
                      : j.title}
                  </option>
                ))}
              </select>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="ui-input w-full"
                placeholder="Report description"
              />

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onFilesChange}
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModalNew(false)}
                  className="ui-btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="ui-btn-primary">
                  Submit report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedForDetails && (
        <ReportDetails
          initialReport={selectedForDetails}
          onClose={() => setSelectedForDetails(null)}
          onUpdated={() => {
            fetchReports();
            setSelectedForDetails(null);
          }}
        />
      )}
    </div>
  );
}
