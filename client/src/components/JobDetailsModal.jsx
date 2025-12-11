// src/components/JobDetailsModal.jsx
import React, { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";
const STATUS_OPTIONS = [
  "WAITING",
  "TO_ASSIGN",
  "ASSIGNED",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
];

export default function JobDetailsModal({ jobId, onClose, onUpdated }) {
  const token = localStorage.getItem("token");
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [techList, setTechList] = useState([]);
  const [selectedTech, setSelectedTech] = useState("");

  useEffect(() => {
    if (!jobId) return;
    fetchJob();
    fetchTechnicians();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function fetchJob() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/jobs/${jobId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (!res.ok) throw new Error("Failed to fetch job details");
      const data = await res.json();
      setJob(data);
      setSelectedTech(data.technician_id || "");
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Błąd pobierania szczegółów");
    } finally {
      setLoading(false);
    }
  }

  async function fetchTechnicians() {
    try {
      const res = await fetch(`${API_BASE}/api/admin/technicians`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (!res.ok) return;
      const data = await res.json();
      setTechList(data.technicians || []);
    } catch (err) {
      console.error("fetch technicians", err);
    }
  }

  async function handleUpdateStatus(newStatus) {
    if (!job) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/jobs/${job.id}`, {
        method: "PUT",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Update failed");
      }
      await fetchJob();
      onUpdated?.();
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Błąd aktualizacji statusu");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssign() {
    if (!selectedTech) {
      setMessage("Wybierz technika");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/jobs/${job.id}/assign`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ technician_id: selectedTech }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Assign failed");
      }
      await fetchJob();
      onUpdated?.();
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Błąd przypisania technika");
    } finally {
      setSaving(false);
    }
  }

  if (!jobId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>

      <div className="relative bg-white rounded shadow-lg w-full max-w-2xl p-6 z-10">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-semibold">
            Szczegóły zlecenia {job?.external_number ?? `#${jobId}`}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            Zamknij ✕
          </button>
        </div>

        {loading ? (
          <div>Ładowanie...</div>
        ) : message ? (
          <div className="text-sm text-red-600 mb-3">{message}</div>
        ) : job ? (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500">Tytuł</div>
                <div className="font-medium">{job.title || "—"}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Nr zlecenia</div>
                <div>{job.external_number || `#${job.id}`}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Klient</div>
                <div>{job.client_name || job.client_email || "—"}</div>
                {job.client_email && (
                  <div className="text-xs text-gray-500">
                    {job.client_email}
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs text-gray-500">Technik</div>
                <div>{job.tech_name || "—"}</div>
                {job.tech_email && (
                  <div className="text-xs text-gray-500">{job.tech_email}</div>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500">Opis</div>
              <div className="whitespace-pre-wrap">
                {job.description || "—"}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-500">Status</div>
                <div className="flex items-center gap-2">
                  <div className="font-medium">{job.status}</div>
                  <select
                    value={job.status}
                    onChange={(e) => handleUpdateStatus(e.target.value)}
                    disabled={saving}
                    className="px-2 py-1 border rounded text-sm"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Data</div>
                <div>
                  {job.scheduled_date
                    ? new Date(job.scheduled_date).toLocaleDateString()
                    : job.created_at
                    ? new Date(job.created_at).toLocaleString()
                    : "—"}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Priorytet</div>
                <div>{job.priority ?? "—"}</div>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-2">
                Przypisz technika
              </div>
              <div className="flex gap-2 items-center">
                <select
                  value={selectedTech}
                  onChange={(e) => setSelectedTech(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded"
                >
                  <option value="">-- wybierz technika --</option>
                  {techList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAssign}
                  className="px-3 py-2 bg-indigo-600 text-white rounded"
                  disabled={saving}
                >
                  Przypisz
                </button>
              </div>
            </div>

            {job.address && (
              <div>
                <div className="text-xs text-gray-500">Adres</div>
                <div>{job.address}</div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-3 py-2 border rounded">
                Zamknij
              </button>
              <button
                onClick={async () => {
                  await handleUpdateStatus("DONE");
                }}
                className="px-3 py-2 bg-green-600 text-white rounded"
                disabled={saving}
              >
                Oznacz jako zakończone
              </button>
            </div>
          </div>
        ) : (
          <div>Brak danych</div>
        )}
      </div>
    </div>
  );
}
