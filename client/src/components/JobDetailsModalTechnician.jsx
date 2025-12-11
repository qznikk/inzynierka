import React, { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function TechnicianJobDetailsModal({
  jobId,
  onClose,
  onUpdated,
}) {
  const token = localStorage.getItem("token");
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!jobId) return;
    const abort = new AbortController();

    async function fetchJob() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/api/technician/jobs/${jobId}`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
          signal: abort.signal,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (res.status === 403)
            throw new Error(body.error || "Brak uprawnień (403)");
          if (res.status === 404)
            throw new Error(body.error || "Zlecenie nie znalezione (404)");
          throw new Error(
            body.error || "Błąd podczas pobierania szczegółów zlecenia"
          );
        }
        const data = await res.json();
        setJob(data.job || data);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("fetchJob error:", err);
          setError(err.message || "Błąd");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchJob();
    return () => abort.abort();
  }, [jobId, token]);

  function formatDate(d) {
    if (!d) return "—";
    const dt = new Date(d);
    return isNaN(dt) ? d : dt.toLocaleString();
  }

  async function updateStatus(newStatus) {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/technician/jobs/${jobId}`, {
        method: "PUT",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Nie udało się zaktualizować statusu");
      }
      const updated = await res.json();
      setJob(updated);
      if (typeof onUpdated === "function") onUpdated(updated);
    } catch (err) {
      console.error(err);
      setError(err.message || "Błąd przy aktualizacji");
    }
  }

  const status = job?.status?.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-start">
          <h2 className="text-xl font-semibold">Szczegóły zlecenia</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            Zamknij
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center">Ładowanie...</div>
        ) : error ? (
          <div className="py-6 text-red-600">{error}</div>
        ) : !job ? (
          <div className="py-6 text-gray-500">Brak danych</div>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <div className="text-sm text-gray-500">Tytuł</div>
              <div className="font-medium">{job.title || "—"}</div>
            </div>

            <div>
              <div className="text-sm text-gray-500">Opis</div>
              <div className="whitespace-pre-wrap">
                {job.description || "—"}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Data</div>
                <div>{formatDate(job.scheduled_date || job.created_at)}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Miejscowość</div>
                <div>
                  {job.job_address ||
                    job.client_address ||
                    job.city ||
                    job.client_city ||
                    "—"}
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500">Status</div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{job.status}</span>
                <div className="flex gap-2">
                  {status !== "IN_PROGRESS" && status !== "DONE" && (
                    <button
                      onClick={() => updateStatus("IN_PROGRESS")}
                      className="px-2 py-1 border rounded text-xs"
                    >
                      Rozpocznij
                    </button>
                  )}

                  {status !== "DONE" && (
                    <button
                      onClick={() => updateStatus("DONE")}
                      className="px-2 py-1 border rounded text-xs"
                    >
                      Zakończ
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <button onClick={onClose} className="px-3 py-2 border rounded">
                Zamknij
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
