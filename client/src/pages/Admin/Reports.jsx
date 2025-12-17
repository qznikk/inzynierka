import React, { useEffect, useState, useCallback, useMemo } from "react";
import AdminReportDetails from "../../components/AdminReportDetails";
import { useNotify } from "../../notifications/NotificationContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

/* ===== helper: truncate text ===== */
function truncate(text, max = 120) {
  if (!text) return "—";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export default function AdminReports() {
  const token = localStorage.getItem("token");
  const notify = useNotify();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedForDetails, setSelectedForDetails] = useState(null);

  // filters
  const [qText, setQText] = useState("");
  const [onlyWithPhotos, setOnlyWithPhotos] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechId, setSelectedTechId] = useState("");

  const buildHeaders = (extra = {}) => {
    const h = { ...extra };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  };

  /* ===================== FETCH REPORTS ===================== */
  const fetchReports = useCallback(
    async (showToast = false) => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/admin/reports`, {
          headers: buildHeaders({ "Content-Type": "application/json" }),
        });

        const body = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(
            (body && (body.error || body.message)) ||
              `${res.status} ${res.statusText}`
          );
        }

        setReports(body.reports || []);
        if (showToast) notify.success("Reports have been refreshed");
      } catch (err) {
        console.error("fetchReports error:", err);
        notify.error(err.message || "Failed to load reports");
      } finally {
        setLoading(false);
      }
    },
    [token, notify]
  );

  /* ===================== FETCH TECHNICIANS ===================== */
  const fetchTechnicians = useCallback(async () => {
    try {
      const urls = [
        `${API_BASE}/api/admin/technicians`,
        `${API_BASE}/api/technicians`,
        `${API_BASE}/api/admin/users?role=TECHNICIAN`,
      ];

      for (const url of urls) {
        try {
          const res = await fetch(url, {
            headers: buildHeaders({ "Content-Type": "application/json" }),
          });
          if (!res.ok) continue;

          const body = await res.json();
          const list =
            body?.technicians ||
            body?.users ||
            body?.data ||
            (Array.isArray(body) ? body : null);

          if (Array.isArray(list)) {
            setTechnicians(
              list.map((u) => ({
                id: u.id ?? u.user_id ?? u._id,
                name:
                  u.name ||
                  [u.first_name, u.last_name].filter(Boolean).join(" ") ||
                  u.email ||
                  `#${u.id}`,
              }))
            );
            return;
          }
        } catch {}
      }

      setTechnicians([]);
    } catch {
      notify.error("Failed to load technicians");
      setTechnicians([]);
    }
  }, [token, notify]);

  useEffect(() => {
    if (!token) return;
    fetchReports(false);
    fetchTechnicians();
  }, [token, fetchReports, fetchTechnicians]);

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr : d.toLocaleString();
  }

  /* ===================== FILTER + SORT ===================== */
  const filteredAndSorted = useMemo(() => {
    const q = qText.trim().toLowerCase();

    return (reports || [])
      .filter((r) => {
        if (!r) return false;

        if (selectedTechId) {
          const techId =
            r.technician_id ?? r.technician?.id ?? r.technician?.user_id;
          if (String(techId) !== String(selectedTechId)) return false;
        }

        if (onlyWithPhotos && (!r.photos || r.photos.length === 0))
          return false;

        if (dateFrom || dateTo) {
          const created = new Date(r.created_at);
          if (dateFrom && created < new Date(dateFrom)) return false;
          if (dateTo && created > new Date(dateTo + "T23:59:59")) return false;
        }

        if (!q) return true;

        return (
          String(r.id).includes(q) ||
          String(r.job_external_number || "")
            .toLowerCase()
            .includes(q) ||
          String(r.job_title || "")
            .toLowerCase()
            .includes(q) ||
          String(r.description || "")
            .toLowerCase()
            .includes(q) ||
          String(
            r.technician?.name || r.technician_name || r.technician_email || ""
          )
            .toLowerCase()
            .includes(q)
        );
      })
      .sort((a, b) => {
        const ta = new Date(a.created_at).getTime();
        const tb = new Date(b.created_at).getTime();
        return sortOrder === "newest" ? tb - ta : ta - tb;
      });
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

  /* ===================== RENDER ===================== */
  return (
    <div className="text-textPrimary bg-section p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-textPrimary">Reports</h1>
        <button onClick={() => fetchReports(true)} className="ui-btn-primary">
          Refresh
        </button>
      </header>

      {/* filters */}
      <section className="bg-section p-4 rounded-2xl border border-borderSoft">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Search…"
            value={qText}
            onChange={(e) => setQText(e.target.value)}
            className="ui-input"
          />

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="ui-input"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="ui-input"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="ui-input"
            >
              <option value="">All technicians</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-1 text-sm text-textSecondary">
              <input
                type="checkbox"
                checked={onlyWithPhotos}
                onChange={(e) => setOnlyWithPhotos(e.target.checked)}
              />
              Photos only
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

      {/* table */}
      <section className="bg-section p-4 rounded-2xl border border-borderSoft overflow-x-auto">
        <table className="min-w-full table-auto text-sm">
          <thead className="text-textSecondary">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Technician</th>
              <th className="px-3 py-2 text-left">Job</th>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left">Photos</th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center py-6 text-textSecondary">
                  Loading…
                </td>
              </tr>
            ) : filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-6 text-textSecondary">
                  No reports found
                </td>
              </tr>
            ) : (
              filteredAndSorted.map((r, idx) => {
                const photos = r.photos || [];
                const extra = Math.max(0, photos.length - 3);

                return (
                  <tr
                    key={r.id}
                    className="align-top"
                    style={{
                      background:
                        idx % 2
                          ? "color-mix(in srgb, var(--bg-section) 90%, black)"
                          : "transparent",
                    }}
                  >
                    <td className="px-3 py-2">{r.id}</td>
                    <td className="px-3 py-2">
                      {r.technician?.name ||
                        r.technician_name ||
                        r.technician_email ||
                        (r.technician_id ? `#${r.technician_id}` : "—")}
                    </td>
                    <td className="px-3 py-2">
                      {r.job_external_number || `#${r.job_id}`}
                    </td>
                    <td className="px-3 py-2">{r.job_title || "—"}</td>

                    <td className="px-3 py-2 max-w-xs">
                      <div
                        className="text-sm text-textSecondary leading-snug overflow-hidden"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                        title={r.description}
                      >
                        {truncate(r.description, 200)}
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      {photos.length ? (
                        <div className="flex gap-2">
                          {photos.slice(0, 3).map((p) => (
                            <a
                              key={p.id}
                              href={p.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <img
                                src={p.url}
                                alt=""
                                className="w-20 h-20 object-cover rounded border border-borderSoft"
                              />
                            </a>
                          ))}
                          {extra > 0 && (
                            <button
                              onClick={() => setSelectedForDetails(r)}
                              className="w-20 h-20 flex items-center justify-center border border-borderSoft rounded text-sm text-textSecondary"
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
      </section>

      {selectedForDetails && (
        <AdminReportDetails
          initialReport={selectedForDetails}
          onClose={() => setSelectedForDetails(null)}
          onUpdated={() => {
            fetchReports(false);
            setSelectedForDetails(null);
          }}
        />
      )}
    </div>
  );
}
