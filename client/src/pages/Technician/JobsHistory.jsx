import React, { useEffect, useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function JobsHistory() {
  const token = localStorage.getItem("token");
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const buildHeaders = () => {
    const h = { "Content-Type": "application/json" };
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
      } catch {
        body = null;
      }

      if (!res.ok) {
        const errMsg =
          (body && (body.error || body.message)) ||
          `${res.status} ${res.statusText}`;
        throw new Error(errMsg);
      }

      const all = body.jobs || body || [];
      const doneOnly = all.filter((j) => j.status?.toUpperCase() === "DONE");

      setJobs(doneOnly);
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Błąd podczas pobierania historii zleceń");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr : d.toLocaleString();
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Historia wykonanych zleceń</h1>
        <button
          onClick={fetchJobs}
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
                <th className="px-3 py-2">Data zakończenia</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-3 py-6 text-center">
                    Ładowanie...
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="px-3 py-6 text-center text-gray-500"
                  >
                    Brak zakończonych zleceń.
                  </td>
                </tr>
              ) : (
                jobs.map((j) => (
                  <tr key={j.id} className="even:bg-gray-50">
                    <td className="px-3 py-2">
                      {j.external_number || `#${j.id}`}
                    </td>

                    <td className="px-3 py-2">
                      <div>{j.title}</div>
                      <div className="text-xs text-gray-500">
                        {j.description?.slice(0, 80)}
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <div>{j.client_name || j.client_email || "—"}</div>
                    </td>

                    <td className="px-3 py-2">
                      {formatDate(j.updated_at || j.completed_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
