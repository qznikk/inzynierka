// src/components/ReportDetails.jsx
import React, { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

async function safeParseResponse(res) {
  // avoid trying to parse HTML/error pages as JSON
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      return await res.json();
    } catch (e) {
      return null;
    }
  }
  // not JSON (HTML or empty) -> return null
  return null;
}

export default function ReportDetails({ initialReport, onClose, onUpdated }) {
  const token = localStorage.getItem("token");
  const [report, setReport] = useState(initialReport || {});
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(initialReport?.description || "");
  const [newFiles, setNewFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const headersWithAuth = (extra = {}) => {
    const h = { ...extra };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  };

  // refresh by fetching the list and picking the report (safe & already exists)
  async function fetchFresh() {
    try {
      const res = await fetch(`${API_BASE}/api/technician/reports`, {
        headers: headersWithAuth({ "Content-Type": "application/json" }),
      });
      if (!res.ok) return;
      const body = await safeParseResponse(res);
      if (!body) return;
      const found = (body.reports || []).find(
        (r) => String(r.id) === String(initialReport.id)
      );
      if (found) {
        setReport(found);
        setDesc(found.description || "");
      }
    } catch (e) {
      console.warn("fetchFresh failed", e);
    }
  }

  useEffect(() => {
    fetchFresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onNewFilesChange(e) {
    setNewFiles(Array.from(e.target.files || []));
  }

  async function handleSaveDescription() {
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/technician/reports/${report.id}`,
        {
          method: "PUT",
          headers: headersWithAuth({ "Content-Type": "application/json" }),
          body: JSON.stringify({ description: desc }),
        }
      );
      const body = await safeParseResponse(res);
      if (!res.ok)
        throw new Error(
          (body && (body.error || body.message)) ||
            `${res.status} ${res.statusText}`
        );
      setReport((prev) => ({ ...prev, description: body.report.description }));
      setEditing(false);
      setMsg("Zapisano.");
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error(err);
      setMsg(err.message || "Błąd przy zapisie opisu");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPhotos(e) {
    e.preventDefault();
    if (!newFiles.length) return setMsg("Wybierz zdjęcia do dodania.");
    setMsg("");
    setLoading(true);
    try {
      const fd = new FormData();
      newFiles.forEach((f) => fd.append("photos", f));
      const res = await fetch(
        `${API_BASE}/api/technician/reports/${report.id}/photos`,
        {
          method: "POST",
          headers: headersWithAuth(), // do NOT set Content-Type
          body: fd,
        }
      );
      const body = await safeParseResponse(res);
      if (!res.ok)
        throw new Error(
          (body && (body.error || body.message)) ||
            `${res.status} ${res.statusText}`
        );
      setReport((prev) => ({
        ...prev,
        photos: [...(prev.photos || []), ...(body.photos || [])],
      }));
      setNewFiles([]);
      setMsg("Dodano zdjęcia.");
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error(err);
      setMsg(err.message || "Błąd przy dodawaniu zdjęć");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePhoto(photoId) {
    if (!confirm("Usunąć to zdjęcie?")) return;
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/technician/reports/photos/${photoId}`,
        {
          method: "DELETE",
          headers: headersWithAuth({ "Content-Type": "application/json" }),
        }
      );
      const body = await safeParseResponse(res);
      if (!res.ok)
        throw new Error(
          (body && (body.error || body.message)) ||
            `${res.status} ${res.statusText}`
        );
      setReport((prev) => ({
        ...prev,
        photos: (prev.photos || []).filter(
          (p) => String(p.id) !== String(photoId)
        ),
      }));
      setMsg("Usunięto zdjęcie.");
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error(err);
      setMsg(err.message || "Błąd przy usuwaniu zdjęcia");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center py-12 bg-black/50 p-4 overflow-auto">
      <div className="bg-white rounded shadow max-w-3xl w-full p-6">
        <header className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold">Raport #{report.id}</h3>
            <div className="text-sm text-gray-600">
              {report.job_external_number || `#${report.job_id}`} —{" "}
              {report.job_title}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Utworzono:{" "}
              {report.created_at
                ? new Date(report.created_at).toLocaleString()
                : "—"}
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => {
                if (onUpdated) onUpdated();
                onClose();
              }}
              className="px-3 py-1 border rounded"
            >
              Zamknij
            </button>
          </div>
        </header>

        <div className="space-y-4">
          <section>
            <h4 className="text-sm font-medium mb-2">Opis</h4>
            {!editing ? (
              <>
                <div className="p-3 border rounded bg-gray-50">
                  {report.description || "Brak opisu."}
                </div>
                <div className="mt-2">
                  <button
                    onClick={() => setEditing(true)}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    Edytuj opis
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={4}
                  className="w-full border rounded p-2"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setEditing(false);
                      setDesc(report.description || "");
                    }}
                    className="px-3 py-1 border rounded"
                  >
                    Anuluj
                  </button>
                  <button
                    onClick={handleSaveDescription}
                    className="px-3 py-1 bg-indigo-600 text-white rounded"
                  >
                    {loading ? "..." : "Zapisz"}
                  </button>
                </div>
              </div>
            )}
          </section>

          <section>
            <h4 className="text-sm font-medium mb-2">
              Zdjęcia ({(report.photos || []).length})
            </h4>

            <div className="flex flex-wrap gap-3">
              {(report.photos || []).length === 0 && (
                <div className="text-sm text-gray-500">Brak zdjęć.</div>
              )}
              {(report.photos || []).map((p) => (
                <div key={p.id} className="w-40">
                  <a href={p.url} target="_blank" rel="noreferrer">
                    <img
                      src={p.url}
                      alt={p.original_name || "photo"}
                      className="w-40 h-28 object-cover rounded shadow"
                    />
                  </a>
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-xs">
                      {p.original_name || "zdjęcie"}
                    </div>
                    <button
                      onClick={() => handleDeletePhoto(p.id)}
                      className="text-xs text-red-600 px-2 py-0.5 border rounded"
                    >
                      Usuń
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddPhotos} className="mt-4 space-y-2">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Dodaj zdjęcia
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onNewFilesChange}
                />
                {newFiles.length > 0 && (
                  <div className="text-xs text-gray-600 mt-1">
                    Wybrane: {newFiles.map((f) => f.name).join(", ")}
                  </div>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="submit"
                  className="px-3 py-1 bg-green-600 text-white rounded"
                >
                  {loading ? "..." : "Dodaj"}
                </button>
              </div>
            </form>
          </section>

          {msg && <div className="text-sm text-green-600">{msg}</div>}
        </div>
      </div>
    </div>
  );
}
