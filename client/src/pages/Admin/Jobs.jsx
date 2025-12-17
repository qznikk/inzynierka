import React, { useEffect, useState, useCallback } from "react";
import JobDetailsModal from "../../components/JobDetailsModal";
import CreateJobModal from "../../components/CreateJobModal";
import { useNotify } from "../../notifications/NotificationContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

const STATUS_OPTIONS = [
  "WAITING",
  "TO_ASSIGN",
  "ASSIGNED",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
];

export default function AdminJobs() {
  const token = localStorage.getItem("token");
  const notify = useNotify();

  const [jobs, setJobs] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20 });
  const [loading, setLoading] = useState(false);
  const [jobDetailsId, setJobDetailsId] = useState(null);

  const [filters, setFilters] = useState({
    status: "",
    technician_id: "",
    q: "",
    page: 1,
    limit: 20,
  });

  const [technicians, setTechnicians] = useState([]);
  const [clients, setClients] = useState([]);
  const [assigningJob, setAssigningJob] = useState(null);
  const [selectedTech, setSelectedTech] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);

  const authHeaders = {
    Authorization: token ? `Bearer ${token}` : "",
    "Content-Type": "application/json",
  };

  /* ===================== FETCH TECHNICIANS ===================== */
  const fetchTechnicians = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/technicians`, {
        headers: { Authorization: authHeaders.Authorization },
      });
      if (!res.ok) throw new Error("Failed to fetch technicians");
      const data = await res.json();
      setTechnicians(data.technicians || data || []);
    } catch (err) {
      notify.error(err.message || "Error while fetching technicians");
    }
  }, [authHeaders.Authorization, notify]);

  /* ===================== FETCH CLIENTS ===================== */
  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/clients`, {
        headers: { Authorization: authHeaders.Authorization },
      });

      if (!res.ok) {
        const res2 = await fetch(
          `${API_BASE}/api/admin/users?role=CLIENT&limit=200`,
          { headers: { Authorization: authHeaders.Authorization } }
        );
        if (!res2.ok) throw new Error("Failed to fetch clients");
        const data2 = await res2.json();
        setClients(data2.users || data2 || []);
        return;
      }

      const data = await res.json();
      setClients(data.clients || data || []);
    } catch {
      notify.error("Failed to fetch clients list");
      setClients([]);
    }
  }, [authHeaders.Authorization, notify]);

  /* ===================== FETCH JOBS ===================== */
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.technician_id)
        params.set("technician_id", filters.technician_id);
      if (filters.q) params.set("q", filters.q);
      params.set("page", filters.page);
      params.set("limit", filters.limit);

      const res = await fetch(
        `${API_BASE}/api/admin/jobs?${params.toString()}`,
        { headers: { Authorization: authHeaders.Authorization } }
      );

      if (!res.ok) throw new Error("Failed to fetch jobs");

      const data = await res.json();
      setJobs(data.jobs || []);
      setMeta(
        data.meta || {
          total: (data.jobs || []).length,
          page: filters.page,
          limit: filters.limit,
        }
      );
    } catch (err) {
      notify.error(err.message || "Error while fetching jobs");
    } finally {
      setLoading(false);
    }
  }, [filters, authHeaders.Authorization, notify]);

  useEffect(() => {
    fetchTechnicians();
    fetchClients();
  }, [fetchTechnicians, fetchClients]);

  useEffect(() => {
    if (!token) return;
    fetchJobs();
  }, [token, fetchJobs]);

  /* ===================== ACTIONS ===================== */
  async function handleAssign(jobId) {
    if (!selectedTech) {
      notify.error("Please select a technician");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/jobs/${jobId}/assign`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ technician_id: selectedTech }),
      });
      if (!res.ok) throw new Error("Assign failed");
      await fetchJobs();
      setAssigningJob(null);
      setSelectedTech("");
      notify.success("Technician assigned");
    } catch (err) {
      notify.error(err.message || "Assign failed");
    }
  }

  async function handleChangeStatus(jobId, status) {
    try {
      const res = await fetch(`${API_BASE}/api/admin/jobs/${jobId}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Status update failed");
      await fetchJobs();
      notify.success("Status updated");
    } catch (err) {
      notify.error(err.message || "Status update failed");
    }
  }

  async function handleDelete(jobId) {
    if (!confirm("Delete this job?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/jobs/${jobId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Delete failed");
      await fetchJobs();
      notify.success("Job deleted");
    } catch (err) {
      notify.error(err.message || "Delete failed");
    }
  }

  const totalPages = Math.max(Math.ceil((meta.total || 0) / meta.limit), 1);

  /* ===================== RENDER ===================== */
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-textPrimary">Jobs</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="ui-btn-primary"
        >
          Add job
        </button>
      </div>

      {/* FILTERS + TABLE */}
      <section className="bg-section rounded-2xl border border-borderSoft p-4 space-y-4">
        {/* FILTERS */}
        <div className="flex flex-wrap gap-2">
          <input
            value={filters.q}
            onChange={(e) =>
              setFilters((f) => ({ ...f, q: e.target.value, page: 1 }))
            }
            placeholder="Search by number / title…"
            className="ui-input w-64"
          />

          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))
            }
            className="ui-input"
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={filters.technician_id}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                technician_id: e.target.value,
                page: 1,
              }))
            }
            className="ui-input"
          >
            <option value="">All technicians</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.email})
              </option>
            ))}
          </select>

          <button
            onClick={() =>
              setFilters({
                status: "",
                technician_id: "",
                q: "",
                page: 1,
                limit: filters.limit,
              })
            }
            className="px-3 py-2 rounded-lg border border-borderMedium
                       text-primary hover:bg-accent/30 transition"
          >
            Reset
          </button>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-textSecondary border-b border-borderSoft">
                <th className="px-3 py-2">No.</th>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">Technician</th>
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
                    className="py-6 text-center text-textSecondary"
                  >
                    Loading…
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="py-6 text-center text-textSecondary"
                  >
                    No jobs
                  </td>
                </tr>
              ) : (
                jobs.map((j) => (
                  <tr
                    key={j.id}
                    className="border-b border-borderSoft hover:bg-accent/20"
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium text-textPrimary">
                        {j.external_number || `#${j.id}`}
                      </div>
                      <div className="text-xs text-textSecondary">
                        {j.title}
                      </div>
                    </td>

                    <td className="px-3 py-2 text-textSecondary">
                      {j.client_name || j.client_email || "—"}
                    </td>

                    <td className="px-3 py-2 text-textSecondary">
                      {j.tech_name || (
                        <button
                          onClick={() => {
                            setAssigningJob(j);
                            setSelectedTech("");
                          }}
                          className="text-sm text-primary hover:underline"
                        >
                          Assign
                        </button>
                      )}
                    </td>

                    <td className="px-3 py-2 text-textSecondary">
                      {new Date(
                        j.scheduled_date || j.created_at
                      ).toLocaleDateString()}
                    </td>

                    <td className="px-3 py-2">
                      <select
                        value={j.status}
                        onChange={(e) =>
                          handleChangeStatus(j.id, e.target.value)
                        }
                        className="ui-input text-sm"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setJobDetailsId(j.id)}
                          className="ui-btn-outline text-sm"
                        >
                          Details
                        </button>

                        <button
                          onClick={() => handleDelete(j.id)}
                          className="ui-btn-outline text-sm text-red-600
                 hover:bg-red-50 border-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-textSecondary">
            Page {filters.page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={filters.page <= 1}
              onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
              className="px-3 py-1 rounded-lg border border-borderMedium
                         disabled:opacity-50"
            >
              Prev
            </button>
            <button
              disabled={filters.page >= totalPages}
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
              className="px-3 py-1 rounded-lg border border-borderMedium
                         disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* ASSIGN MODAL */}
      {assigningJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-overlay"
            onClick={() => setAssigningJob(null)}
          />
          <div className="relative bg-modal rounded-2xl border border-borderSoft p-4 w-full max-w-md">
            <h3 className="text-lg font-semibold text-textPrimary mb-3">
              Assign technician
            </h3>

            <select
              value={selectedTech}
              onChange={(e) => setSelectedTech(e.target.value)}
              className="ui-input w-full mb-4"
            >
              <option value="">-- select --</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.email})
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setAssigningJob(null)}
                className="px-4 py-2 rounded-lg border border-borderMedium
                           text-primary hover:bg-accent/30"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAssign(assigningJob.id)}
                className="ui-btn-primary"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {jobDetailsId && (
        <JobDetailsModal
          jobId={jobDetailsId}
          onClose={() => setJobDetailsId(null)}
          onUpdated={() => {
            fetchJobs();
            setJobDetailsId(null);
          }}
        />
      )}

      {showCreateModal && (
        <CreateJobModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => fetchJobs()}
          clients={clients}
          technicians={technicians}
          apiBase={API_BASE}
          authHeaders={authHeaders}
        />
      )}
    </div>
  );
}
