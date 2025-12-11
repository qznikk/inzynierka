// src/pages/Admin/AdminReports.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import AdminReportDetails from "../../components/AdminReportDetails"; // jeśli chcesz inny modal dla admina, zmień import

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function AdminReports() {
  const token = localStorage.getItem("token");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedForDetails, setSelectedForDetails] = useState(null);

  // filters
  const [qText, setQText] = useState("");
  const [onlyWithPhotos, setOnlyWithPhotos] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortOrder, setSortOrder] = useState("newest"); // newest | oldest
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechId, setSelectedTechId] = useState(""); // "" = all

  const buildHeaders = (extra = {}) => {
    const h = { ...extra };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  };

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      // oczekujemy endpointu admina: /api/admin/reports
      const res = await fetch(`${API_BASE}/api/admin/reports`, {
        headers: buildHeaders({ "Content-Type": "application/json" }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(
          (body && (body.error || body.message)) ||
            `${res.status} ${res.statusText}`
        );
      setReports(body.reports || []);
    } catch (err) {
      console.error("fetchReports (admin) error:", err);
      setMessage(err.message || "Błąd podczas pobierania raportów (admin)");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchTechnicians = useCallback(async () => {
    try {
      // próbujemy kilka możliwych endpointów (większa tolerancja na różnice w API)
      const candidates = [
        `${API_BASE}/api/admin/technicians`,
        `${API_BASE}/api/technicians`,
        `${API_BASE}/api/admin/users?role=TECHNICIAN`,
        `${API_BASE}/api/users?role=TECHNICIAN`,
      ];
      for (const url of candidates) {
        try {
          const res = await fetch(url, {
            headers: buildHeaders({ "Content-Type": "application/json" }),
          });
          if (!res.ok) continue;
          const body = await res.json();
          // body should contain an array of technicians in either body.technicians or body.users or body.data
          const list =
            body?.technicians ||
            body?.users ||
            body?.data ||
            (Array.isArray(body) ? body : null);
          if (Array.isArray(list)) {
            // normalize to { id, name/email }
            const normalized = list.map((u) => ({
              id: u.id ?? u.user_id ?? u._id,
              name:
                u.name ||
                u.full_name ||
                [u.first_name, u.last_name].filter(Boolean).join(" ") ||
                u.email ||
                String(u.id || u.user_id || u._id),
            }));
            setTechnicians(normalized);
            return;
          }
        } catch (e) {
          // ignore and try next
        }
      }
      // jeśli nic nie zwróciło, ustaw pustą listę
      setTechnicians([]);
    } catch (err) {
      console.error("fetchTechnicians error:", err);
      setTechnicians([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    fetchReports();
    fetchTechnicians();
  }, [fetchReports, fetchTechnicians]);

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr : d.toLocaleString();
  }

  // filtering & sorting
  const filteredAndSorted = useMemo(() => {
    const q = (qText || "").trim().toLowerCase();
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

      // technician filter (admin)
      if (selectedTechId) {
        // reports may have technician_id or technician object
        const techIdFromReport =
          r.technician_id ?? r.technician?.id ?? r.technician?.user_id;
        if (String(techIdFromReport) !== String(selectedTechId)) return false;
      }

      if (onlyWithPhotos) {
        if (!Array.isArray(r.photos) || r.photos.length === 0) return false;
      }

      if (from || to) {
        const created = r.created_at ? new Date(r.created_at) : null;
        if (!created) return false;
        if (from && created < from) return false;
        if (to && created > to) return false;
      }

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
        const techMatch =
          (r.technician?.name || r.technician_name || "")
            .toString()
            .toLowerCase()
            .includes(q) ||
          (r.technician?.email || "").toString().toLowerCase().includes(q);
        if (!(idMatch || extMatch || titleMatch || descMatch || techMatch))
          return false;
      }

      return true;
    });

    const sorted = filtered.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortOrder === "newest" ? tb - ta : ta - tb;
    });

    return sorted;
  }, [
    reports,
    qText,
    onlyWithPhotos,
    dateFrom,
    dateTo,
    sortOrder,
    selectedTechId,
  ]);

  function resetFilters() {
    setQText("");
    setOnlyWithPhotos(false);
    setDateFrom("");
    setDateTo("");
    setSortOrder("newest");
    setSelectedTechId("");
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Raporty — panel admina</h1>
        <div className="flex gap-3">
          <button
            onClick={() => fetchReports()}
            className="px-3 py-2 bg-indigo-600 text-white rounded"
          >
            Odśwież
          </button>
        </div>
      </header>

      {/* filters */}
      <section className="bg-white p-4 rounded shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Szukaj (id, zlecenie, tytuł, opis, technik)..."
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
            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="border rounded px-2 py-1"
            >
              <option value="">Wszyscy technicy</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name || t.id}
                </option>
              ))}
            </select>

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

      {/* table */}
      <section className="bg-white p-4 rounded shadow space-y-4">
        {message && <div className="text-sm text-red-600">{message}</div>}

        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="text-left text-sm text-gray-600">
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Technik</th>
                <th className="px-3 py-2">Zlecenie</th>
                <th className="px-3 py-2">Tytuł</th>
                <th className="px-3 py-2">Opis</th>
                <th className="px-3 py-2">Zdjęcia</th>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Akcje</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-3 py-6 text-center">
                    Ładowanie...
                  </td>
                </tr>
              ) : filteredAndSorted.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-3 py-6 text-center text-gray-500"
                  >
                    Brak raportów.
                  </td>
                </tr>
              ) : (
                filteredAndSorted.map((r) => {
                  const photos = r.photos || [];
                  const extra = Math.max(0, photos.length - 3);
                  const techName =
                    r.technician?.name ||
                    r.technician_name ||
                    r.technician_email ||
                    (r.technician_id ? `#${r.technician_id}` : "—");
                  return (
                    <tr key={r.id} className="even:bg-gray-50">
                      <td className="px-3 py-2">{r.id}</td>
                      <td className="px-3 py-2">{techName}</td>
                      <td className="px-3 py-2">
                        {r.job_external_number || `#${r.job_id}`}
                      </td>
                      <td className="px-3 py-2">{r.job_title || "—"}</td>
                      <td className="px-3 py-2">{r.description || "—"}</td>
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

      {/* details modal */}
      {selectedForDetails && (
        <AdminReportDetails
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
