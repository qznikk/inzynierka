import React, { useEffect, useState, useCallback } from "react";
import JobDetailsModalTechnician from "../../components/JobDetailsModalTechnician";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function TechnicianJobs() {
  const token = localStorage.getItem("token");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [jobDetailsId, setJobDetailsId] = useState(null);

  const buildHeaders = (extra = {}) => {
    const h = { "Content-Type": "application/json", ...extra };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  };

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${API_BASE}/api/technician/jobs`, {
        headers: buildHeaders(),
      });

      let body = null;
      try {
        body = await res.json();
      } catch {}

      if (!res.ok) {
        const errMsg =
          (body && (body.error || body.message)) ||
          `${res.status} ${res.statusText}`;
        throw new Error(errMsg);
      }

      const allJobs = body.jobs || body || [];

      // ⛔ POKAZUJEMY TYLKO AKTYWNE (NIE DONE)
      const active = allJobs.filter((j) => j.status?.toUpperCase() !== "DONE");

      setJobs(active);
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Błąd podczas pobierania zleceń");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  async function updateStatus(jobId, newStatus) {
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/technician/jobs/${jobId}`, {
        method: "PUT",
        headers: buildHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });

      let body = null;
      try {
        body = await res.json();
      } catch {}

      if (!res.ok) {
        const errMsg =
          (body && (body.error || body.message)) ||
          `${res.status} ${res.statusText}`;
        throw new Error(errMsg);
      }

      await fetchJobs(); // odświeża listę -> DONE zniknie
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Błąd przy aktualizacji statusu");
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr : d.toLocaleString();
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Twoje zlecenia</h1>
        <button
          onClick={() => fetchJobs()}
          className="px-3 py-2 bg-indigo-600 text-white rounded"
        >
          Odśwież
        </button>
      </header>

      <section className="bg-white p-4 rounded shadow space-y-4">
        {message && <div className="text-sm text-red-600">{message}</div>}

        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="text-left text-sm text-gray-600">
                <th className="px-3 py-2">Nr</th>
                <th className="px-3 py-2">Tytuł</th>
                <th className="px-3 py-2">Klient</th>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Akcje</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-3 py-6 text-center">
                    Ładowanie...
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-3 py-6 text-center text-gray-500"
                  >
                    Brak aktywnych zleceń.
                  </td>
                </tr>
              ) : (
                jobs.map((j) => {
                  const status = j.status?.toUpperCase();

                  return (
                    <tr key={j.id} className="even:bg-gray-50">
                      <td className="px-3 py-2 align-top">
                        <div className="font-medium">
                          {j.external_number || `#${j.id}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {j.priority === 1
                            ? "Wysoki"
                            : j.priority === 3
                            ? "Niski"
                            : "Normalny"}
                        </div>
                      </td>

                      <td className="px-3 py-2 align-top">
                        <div>{j.title}</div>
                        <div className="text-xs text-gray-500">
                          {j.description?.slice(0, 80)}
                        </div>
                      </td>

                      <td className="px-3 py-2 align-top">
                        <div>{j.client_name || j.client_email || "—"}</div>
                      </td>

                      <td className="px-3 py-2 align-top">
                        {formatDate(j.scheduled_date || j.created_at)}
                      </td>

                      <td className="px-3 py-2 align-top">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{j.status}</span>

                          <div className="flex gap-1">
                            {status !== "IN_PROGRESS" && (
                              <button
                                onClick={() =>
                                  updateStatus(j.id, "IN_PROGRESS")
                                }
                                className="px-2 py-1 border rounded text-xs"
                              >
                                Rozpocznij
                              </button>
                            )}

                            <button
                              onClick={() => updateStatus(j.id, "DONE")}
                              className="px-2 py-1 border rounded text-xs"
                            >
                              Zakończ
                            </button>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-2 align-top">
                        <button
                          onClick={() => setJobDetailsId(j.id)}
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

      {jobDetailsId && (
        <JobDetailsModalTechnician
          jobId={jobDetailsId}
          onClose={() => setJobDetailsId(null)}
          onUpdated={() => {
            fetchJobs();
            setJobDetailsId(null);
          }}
        />
      )}
    </div>
  );
}
