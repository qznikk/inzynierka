// src/pages/Admin/Jobs.jsx
import React, { useEffect, useState, useCallback } from "react";
import JobDetailsModal from "../../components/JobDetailsModal"; // dopasuj ścieżkę

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

  const [jobs, setJobs] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [jobDetailsId, setJobDetailsId] = useState(null);

  const [filters, setFilters] = useState({
    status: "",
    technician_id: "",
    q: "",
    page: 1,
    limit: 20,
  });

  const [technicians, setTechnicians] = useState([]);
  const [clients, setClients] = useState([]); // NEW: clients list
  const [assigningJob, setAssigningJob] = useState(null); // job object being assigned
  const [selectedTech, setSelectedTech] = useState("");

  // NEW: create job modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    external_number: "",
    client_id: "",
    technician_id: "",
    title: "",
    description: "",
    status: "WAITING",
    priority: 2,
    scheduled_date: "",
    address: "",
  });
  const [createLoading, setCreateLoading] = useState(false);

  const authHeaders = {
    Authorization: token ? `Bearer ${token}` : "",
    "Content-Type": "application/json",
  };

  // fetch technicians list for assign/filter dropdown
  const fetchTechnicians = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/technicians`, {
        headers: { Authorization: authHeaders.Authorization },
      });
      if (!res.ok) throw new Error("Failed to fetch technicians");
      const data = await res.json();
      setTechnicians(data.technicians || data || []);
    } catch (err) {
      console.error(err);
      setMessage("Nie udało się pobrać listy techników");
    }
  }, [authHeaders.Authorization]);

  // NEW: fetch clients for create form (and potentially filter)
  const fetchClients = useCallback(async () => {
    try {
      // próbujemy endpointu typowego dla admina; jeśli nie istnieje, może zwrócić 404
      const res = await fetch(`${API_BASE}/api/admin/clients`, {
        headers: { Authorization: authHeaders.Authorization },
      });
      if (!res.ok) {
        // fallback: spróbuj ogólnego users endpoint z filtrem role=CLIENT
        const res2 = await fetch(
          `${API_BASE}/api/admin/users?role=CLIENT&limit=200`,
          { headers: { Authorization: authHeaders.Authorization } }
        );
        if (!res2.ok) throw new Error("Failed to fetch clients");
        const data2 = await res2.json();
        // oczekujemy data2.users lub data2
        setClients(data2.users || data2 || []);
        return;
      }
      const data = await res.json();
      setClients(data.clients || data || []);
    } catch (err) {
      console.error("fetchClients error:", err);
      setMessage(
        "Nie udało się pobrać listy klientów — możesz wpisać client_id ręcznie w formularzu."
      );
      setClients([]);
    }
  }, [authHeaders.Authorization]);

  // fetch jobs with filters
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.technician_id)
        params.set("technician_id", filters.technician_id);
      if (filters.q) params.set("q", filters.q);
      params.set("page", filters.page || 1);
      params.set("limit", filters.limit || 20);

      const res = await fetch(
        `${API_BASE}/api/admin/jobs?${params.toString()}`,
        {
          headers: { Authorization: authHeaders.Authorization },
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch jobs");
      }
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
      console.error(err);
      setMessage(err.message || "Błąd podczas pobierania zleceń");
    } finally {
      setLoading(false);
    }
  }, [filters, authHeaders.Authorization]);

  useEffect(() => {
    fetchTechnicians();
    fetchClients(); // NEW: pobierz klientów na starcie
  }, [fetchTechnicians, fetchClients]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // handlers
  function handleFilterChange(e) {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value, page: 1 }));
  }

  function handlePageChange(newPage) {
    setFilters((p) => ({ ...p, page: newPage }));
  }

  async function handleAssign(jobId) {
    if (!selectedTech) {
      setMessage("Wybierz technika do przypisania");
      return;
    }
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/jobs/${jobId}/assign`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ technician_id: selectedTech }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to assign");
      }
      // refresh jobs
      await fetchJobs();
      setAssigningJob(null);
      setSelectedTech("");
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Błąd podczas przypisywania technika");
    }
  }

  async function handleChangeStatus(jobId, newStatus) {
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/jobs/${jobId}`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update status");
      }
      await fetchJobs();
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Błąd podczas zmiany statusu");
    }
  }

  async function handleDelete(jobId) {
    if (!confirm("Na pewno usunąć zlecenie?")) return;
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/jobs/${jobId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete");
      }
      await fetchJobs();
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Błąd podczas usuwania zlecenia");
    }
  }

  // NEW: create job handler
  async function handleCreateJob(e) {
    e && e.preventDefault && e.preventDefault();
    setMessage("");
    // minimal validation
    if (!createForm.client_id || !createForm.title || !createForm.description) {
      setMessage("Wypełnij wymagane pola: klient, tytuł i opis.");
      return;
    }
    setCreateLoading(true);
    try {
      // prepare body, convert priority to number, empty strings -> null where appropriate
      const body = {
        external_number: createForm.external_number || null,
        client_id: Number(createForm.client_id),
        technician_id: createForm.technician_id
          ? Number(createForm.technician_id)
          : null,
        title: createForm.title,
        description: createForm.description,
        status: createForm.status || "WAITING",
        priority: Number(createForm.priority) || 2,
        scheduled_date: createForm.scheduled_date || null,
        address: createForm.address || null,
      };

      const res = await fetch(`${API_BASE}/api/admin/jobs`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Nie udało się dodać zlecenia");
      }

      setMessage(
        "Zlecenie utworzone. Numer: " + (data.external_number || data.id || "")
      );
      setShowCreateModal(false);
      // reset form
      setCreateForm({
        external_number: "",
        client_id: "",
        technician_id: "",
        title: "",
        description: "",
        status: "WAITING",
        priority: 2,
        scheduled_date: "",
        address: "",
      });
      await fetchJobs();
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Błąd przy tworzeniu zlecenia");
    } finally {
      setCreateLoading(false);
    }
  }

  // small helper to format date
  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString();
  }

  // pagination UI values
  const totalPages = Math.max(
    Math.ceil((meta.total || 0) / (meta.limit || filters.limit)),
    1
  );

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Jobs</h1>

        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            Total: {meta.total ?? jobs.length}
          </div>

          {/* NEW: Add Job button */}
          <button
            onClick={() => {
              setShowCreateModal(true);
              setMessage("");
            }}
            className="px-3 py-2 bg-emerald-600 text-white rounded"
          >
            Dodaj zlecenie
          </button>
        </div>
      </header>

      <section className="bg-white p-4 rounded shadow space-y-4">
        {/* filters */}
        <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
          <div className="flex gap-2 items-center">
            <input
              name="q"
              value={filters.q}
              onChange={handleFilterChange}
              placeholder="Szukaj nr/tytułu..."
              className="px-3 py-2 border rounded w-64"
            />
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="px-3 py-2 border rounded"
            >
              <option value="">Wszystkie statusy</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              name="technician_id"
              value={filters.technician_id}
              onChange={handleFilterChange}
              className="px-3 py-2 border rounded"
            >
              <option value="">Wszyscy technicy</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.email})
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setFilters({
                  status: "",
                  technician_id: "",
                  q: "",
                  page: 1,
                  limit: filters.limit,
                });
                setMessage("");
              }}
              className="px-3 py-2 border rounded"
            >
              Reset
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-500">Per page:</div>
            <select
              name="limit"
              value={filters.limit}
              onChange={(e) =>
                setFilters((p) => ({
                  ...p,
                  limit: Number(e.target.value),
                  page: 1,
                }))
              }
              className="px-2 py-1 border rounded"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button
              onClick={() => fetchJobs()}
              className="px-3 py-2 bg-indigo-600 text-white rounded"
            >
              Odśwież
            </button>
          </div>
        </div>

        {/* messages */}
        {message && <div className="text-sm text-red-600">{message}</div>}

        {/* table */}
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="text-left text-sm text-gray-600">
                <th className="px-3 py-2">Nr zlecenia</th>
                <th className="px-3 py-2">Klient</th>
                <th className="px-3 py-2">Technik</th>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-3 py-6 text-center">
                    Loading...
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-3 py-6 text-center text-gray-500"
                  >
                    No jobs
                  </td>
                </tr>
              ) : (
                jobs.map((j) => (
                  <tr key={j.id} className="even:bg-gray-50">
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium">
                        {j.external_number || `#${j.id}`}
                      </div>
                      <div className="text-xs text-gray-500">{j.title}</div>
                    </td>

                    <td className="px-3 py-2 align-top">
                      <div>{j.client_name || j.client_email || "—"}</div>
                      <div className="text-xs text-gray-500">
                        {j.client_email}
                      </div>
                    </td>

                    <td className="px-3 py-2 align-top">
                      <div>{j.tech_name || "—"}</div>
                      <div className="text-xs text-gray-500">
                        {j.tech_email || ""}
                      </div>
                      {/* quick assign button */}
                      {!j.tech_name && (
                        <button
                          onClick={() => {
                            setAssigningJob(j);
                            setSelectedTech("");
                          }}
                          className="mt-2 px-2 py-1 text-sm border rounded"
                        >
                          Przypisz technika
                        </button>
                      )}
                    </td>

                    <td className="px-3 py-2 align-top">
                      {formatDate(j.scheduled_date || j.created_at)}
                    </td>

                    <td className="px-3 py-2 align-top">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{j.status}</span>
                        <select
                          value={j.status}
                          onChange={(e) =>
                            handleChangeStatus(j.id, e.target.value)
                          }
                          className="px-2 py-1 border rounded text-sm"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>

                    <td className="px-3 py-2 align-top">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setJobDetailsId(j.id)}
                          className="px-2 py-1 border rounded text-sm"
                        >
                          Szczegóły
                        </button>

                        <button
                          onClick={() => setAssigningJob(j)}
                          className="px-2 py-1 border rounded text-sm"
                        >
                          Przypisz
                        </button>

                        <button
                          onClick={() => handleDelete(j.id)}
                          className="px-2 py-1 border rounded text-sm text-red-600"
                        >
                          Usuń
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Page {filters.page} / {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(Math.max(1, filters.page - 1))}
              disabled={filters.page <= 1}
              className="px-2 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() =>
                handlePageChange(Math.min(totalPages, filters.page + 1))
              }
              disabled={filters.page >= totalPages}
              className="px-2 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* Assign modal */}
      {assigningJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setAssigningJob(null)}
          ></div>

          <div className="relative bg-white rounded shadow-lg w-full max-w-lg p-4">
            <h3 className="text-lg font-semibold mb-2">
              Przypisz technika do{" "}
              {assigningJob.external_number || `#${assigningJob.id}`}
            </h3>

            <div className="mb-3">
              <label className="block text-sm mb-1">Wybierz technika</label>
              <select
                value={selectedTech}
                onChange={(e) => setSelectedTech(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">-- wybierz --</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setAssigningJob(null)}
                className="px-3 py-2 border rounded"
              >
                Anuluj
              </button>
              <button
                onClick={() => handleAssign(assigningJob.id)}
                className="px-3 py-2 bg-green-600 text-white rounded"
              >
                Przypisz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job details modal */}
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

      {/* CREATE JOB modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowCreateModal(false)}
          ></div>

          <form
            onSubmit={handleCreateJob}
            className="relative bg-white rounded shadow-lg w-full max-w-2xl p-4"
          >
            <h3 className="text-lg font-semibold mb-2">
              Nowe zlecenie (admin)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1">
                  Klient <span className="text-red-500">*</span>
                </label>

                {clients && clients.length > 0 ? (
                  <select
                    name="client_id"
                    value={createForm.client_id}
                    onChange={(e) =>
                      setCreateForm((f) => ({
                        ...f,
                        client_id: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">-- wybierz klienta --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || c.email} ({c.email}) — id:{c.id}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input
                      name="client_id"
                      value={createForm.client_id}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          client_id: e.target.value,
                        }))
                      }
                      placeholder="Wpisz client_id (liczba) — lista klientów niedostępna"
                      className="w-full px-3 py-2 border rounded"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Nie udało się pobrać listy klientów — wpisz ID klienta
                      ręcznie.
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm mb-1">
                  Technik (opcjonalny)
                </label>
                <select
                  name="technician_id"
                  value={createForm.technician_id}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      technician_id: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">-- brak --</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">External number</label>
                <input
                  name="external_number"
                  value={createForm.external_number}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      external_number: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Priorytet</label>
                <select
                  name="priority"
                  value={createForm.priority}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, priority: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value={1}>Wysoki</option>
                  <option value={2}>Normalny</option>
                  <option value={3}>Niski</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm mb-1">
                  Tytuł <span className="text-red-500">*</span>
                </label>
                <input
                  name="title"
                  value={createForm.title}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, title: e.target.value }))
                  }
                  required
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm mb-1">
                  Opis <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  required
                  className="w-full px-3 py-2 border rounded h-28"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Preferowana data</label>
                <input
                  name="scheduled_date"
                  value={createForm.scheduled_date}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      scheduled_date: e.target.value,
                    }))
                  }
                  type="date"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Status</label>
                <select
                  name="status"
                  value={createForm.status}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, status: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Adres</label>
                <input
                  name="address"
                  value={createForm.address}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, address: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-2 border rounded"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="px-3 py-2 bg-emerald-600 text-white rounded"
              >
                {createLoading ? "Tworzenie..." : "Utwórz zlecenie"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
