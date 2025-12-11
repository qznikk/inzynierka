// src/pages/Technician/Reports.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import ReportDetails from "../../components/ReportDetails";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function TechnicianReports() {
  const token = localStorage.getItem("token");
  const [reports, setReports] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [message, setMessage] = useState("");
  const [showModalNew, setShowModalNew] = useState(false);
  const [selectedForDetails, setSelectedForDetails] = useState(null);

  // form state for new report
  const [selectedJobId, setSelectedJobId] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]);

  // UI state: filtering & sorting
  const [qText, setQText] = useState("");
  const [onlyWithPhotos, setOnlyWithPhotos] = useState(false);
  const [dateFrom, setDateFrom] = useState(""); // yyyy-mm-dd
  const [dateTo, setDateTo] = useState(""); // yyyy-mm-dd
  const [sortOrder, setSortOrder] = useState("newest"); // "newest" or "oldest"

  const buildHeaders = (extra = {}) => {
    const h = { ...extra };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  };

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/technician/reports`, {
        headers: buildHeaders({ "Content-Type": "application/json" }),
      });
      const body = await res.json();
      if (!res.ok)
        throw new Error(
          (body && (body.error || body.message)) ||
            `${res.status} ${res.statusText}`
        );
      // Ensure created_at is preserved; sorting will be done client-side
      setReports(body.reports || []);
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Błąd podczas pobierania raportów");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const res = await fetch(`${API_BASE}/api/technician/jobs`, {
        headers: buildHeaders({ "Content-Type": "application/json" }),
      });
      const body = await res.json();
      if (!res.ok)
        throw new Error(
          (body && (body.error || body.message)) ||
            `${res.status} ${res.statusText}`
        );
      setJobs(body.jobs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingJobs(false);
    }
  }, [token]);

  useEffect(() => {
    fetchReports();
    fetchJobs();
  }, [fetchReports, fetchJobs]);

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr : d.toLocaleString();
  }

  function onFilesChange(e) {
    setFiles(Array.from(e.target.files || []));
  }

  async function handleSubmitNew(e) {
    e.preventDefault();
    setMessage("");
    if (!selectedJobId) return setMessage("Wybierz zlecenie.");
    try {
      const fd = new FormData();
      fd.append("description", description || "");
      files.forEach((f) => fd.append("photos", f));
      const res = await fetch(
        `${API_BASE}/api/technician/jobs/${selectedJobId}/reports`,
        {
          method: "POST",
          headers: buildHeaders(), // do not set Content-Type
          body: fd,
        }
      );
      const body = await res.json();
      if (!res.ok)
        throw new Error(
          (body && (body.error || body.message)) ||
            `${res.status} ${res.statusText}`
        );
      setSelectedJobId("");
      setDescription("");
      setFiles([]);
      setShowModalNew(false);
      await fetchReports();
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Błąd przy wysyłaniu raportu");
    }
  }

  // ---------- filtering & sorting logic ----------
  const filteredAndSortedReports = useMemo(() => {
    const q = (qText || "").trim().toLowerCase();

    // parse date inputs: keep them as Date objects at start/end of day
    let from = null;
    let to = null;
    if (dateFrom) {
      const d = new Date(dateFrom);
      if (!isNaN(d))
        from = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
    }
    if (dateTo) {
      const d = new Date(dateTo);
      if (!isNaN(d))
        to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
    }

    const filtered = (reports || []).filter((r) => {
      if (!r) return false;

      // filter by photos
      if (onlyWithPhotos) {
        if (!Array.isArray(r.photos) || r.photos.length === 0) return false;
      }

      // filter by date range
      if (from || to) {
        const created = r.created_at ? new Date(r.created_at) : null;
        if (!created) return false;
        if (from && created < from) return false;
        if (to && created > to) return false;
      }

      // text search: id, job_title, job_external_number, description
      if (q) {
        const idMatch = String(r.id || "")
          .toLowerCase()
          .includes(q);
        const extMatch = String(r.job_external_number || "")
          .toLowerCase()
          .includes(q);
        const titleMatch = String(r.job_title || "")
          .toLowerCase()
          .includes(q);
        const descMatch = String(r.description || "")
          .toLowerCase()
          .includes(q);
        if (!(idMatch || extMatch || titleMatch || descMatch)) return false;
      }

      return true;
    });

    const sorted = filtered.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (sortOrder === "newest") {
        return tb - ta;
      } else {
        return ta - tb;
      }
    });

    return sorted;
  }, [reports, qText, onlyWithPhotos, dateFrom, dateTo, sortOrder]);

  // reset filters helper
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
        <h1 className="text-2xl font-semibold">Raporty technika</h1>
        <div className="flex gap-3">
          <button
            onClick={() => {
              fetchReports();
              fetchJobs();
            }}
            className="px-3 py-2 bg-indigo-600 text-white rounded"
          >
            Odśwież
          </button>
          <button
            onClick={() => setShowModalNew(true)}
            className="px-3 py-2 bg-green-600 text-white rounded"
          >
            Nowy raport
          </button>
        </div>
      </header>

      {/* Filters / Sorting UI */}
      <section className="bg-white p-4 rounded shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Szukaj (id, tytuł, opis, numer zlecenia)..."
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              className="w-full border rounded px-2 py-1"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm">Data od:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border rounded px-2 py-1"
            />
            <label className="text-sm">do:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={onlyWithPhotos}
                onChange={(e) => setOnlyWithPhotos(e.target.checked)}
              />
              <span className="text-sm">Tylko ze zdjęciami</span>
            </label>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="border rounded px-2 py-1"
            >
              <option value="newest">Najnowsze</option>
              <option value="oldest">Najstarsze</option>
            </select>

            <button
              onClick={resetFilters}
              className="px-2 py-1 border rounded text-sm"
            >
              Wyczyść
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white p-4 rounded shadow space-y-4">
        {message && <div className="text-sm text-red-600">{message}</div>}

        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="text-left text-sm text-gray-600">
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Zlecenie</th>
                <th className="px-3 py-2">Tytuł zlecenia</th>
                <th className="px-3 py-2">Opis</th>
                <th className="px-3 py-2">Zdjęcia</th>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Akcje</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-3 py-6 text-center">
                    Ładowanie...
                  </td>
                </tr>
              ) : filteredAndSortedReports.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-3 py-6 text-center text-gray-500"
                  >
                    Brak raportów.
                  </td>
                </tr>
              ) : (
                filteredAndSortedReports.map((r) => {
                  const photos = r.photos || [];
                  const extra = Math.max(0, photos.length - 3);
                  return (
                    <tr key={r.id} className="even:bg-gray-50">
                      <td className="px-3 py-2">{r.id}</td>
                      <td className="px-3 py-2">
                        {r.job_external_number || `#${r.job_id}`}
                      </td>
                      <td className="px-3 py-2">{r.job_title || "—"}</td>
                      <td className="px-3 py-2">
                        <div>{r.description || "—"}</div>
                      </td>

                      <td className="px-3 py-2">
                        {photos.length > 0 ? (
                          <div className="flex items-center gap-2">
                            {photos.slice(0, 3).map((p) => (
                              <a
                                key={p.id}
                                href={p.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block"
                              >
                                <img
                                  src={p.url}
                                  alt={p.original_name || "photo"}
                                  className="w-20 h-20 object-cover rounded shadow"
                                />
                              </a>
                            ))}
                            {extra > 0 && (
                              <button
                                onClick={() => setSelectedForDetails(r)}
                                className="px-2 py-1 text-xs border rounded bg-gray-100"
                                title={`Pokaż wszystkie (${photos.length})`}
                              >
                                +{extra}
                              </button>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-3 py-2">{formatDate(r.created_at)}</td>

                      <td className="px-3 py-2">
                        <button
                          onClick={() => setSelectedForDetails(r)}
                          className="px-2 py-1 border rounded text-sm"
                        >
                          Szczegóły
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

      {/* New report modal */}
      {showModalNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded shadow max-w-2xl w-full p-6">
            <header className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Nowy raport</h2>
              <button
                onClick={() => setShowModalNew(false)}
                className="text-gray-500 hover:text-gray-800"
              >
                Zamknij
              </button>
            </header>

            <form onSubmit={handleSubmitNew} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Zlecenie
                </label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                >
                  <option value="">-- wybierz zlecenie --</option>
                  {loadingJobs ? (
                    <option disabled>Ładowanie zleceń...</option>
                  ) : jobs.length === 0 ? (
                    <option disabled>Brak zleceń</option>
                  ) : (
                    jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.external_number
                          ? `${j.external_number} — ${j.title}`
                          : j.title || `#${j.id}`}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Opis</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full border rounded p-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Zdjęcia (max 6)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onFilesChange}
                />
                {files.length > 0 && (
                  <div className="text-xs text-gray-600 mt-1">
                    Wybrane: {files.map((f) => f.name).join(", ")}
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModalNew(false)}
                  className="px-3 py-2 border rounded"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 bg-indigo-600 text-white rounded"
                >
                  Wyślij raport
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report details modal */}
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
