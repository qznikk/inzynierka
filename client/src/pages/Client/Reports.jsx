import React, { useEffect, useState } from "react";

export default function ClientReports() {
  const API = import.meta.env.VITE_API_URL || "http://localhost:5050";
  const token = localStorage.getItem("token");

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchJobs() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API}/api/client/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch jobs");
      }

      const data = await res.json();
      setJobs(data.jobs || data || []);
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Błąd podczas pobierania zleceń");
    } finally {
      setLoading(false);
    }
  }

  function formatDate(d) {
    if (!d) return "—";
    const dt = new Date(d);
    return isNaN(dt) ? d : dt.toLocaleString();
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Moje zlecenia</h1>

        <button
          onClick={fetchJobs}
          className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm"
        >
          Odśwież
        </button>
      </header>

      <section className="bg-white p-4 rounded shadow">
        <h2 className="font-medium mb-3">Lista zleceń</h2>

        {loading ? (
          <div>Ładowanie...</div>
        ) : (
          <>
            {message && (
              <div className="text-red-600 text-sm mb-3">{message}</div>
            )}

            {jobs.length === 0 ? (
              <div className="text-sm text-gray-500">Brak zleceń</div>
            ) : (
              <ul className="space-y-2">
                {jobs.map((j) => (
                  <li
                    key={j.id}
                    className="border rounded p-3 flex justify-between items-start"
                  >
                    <div>
                      <div className="font-medium">
                        {j.external_number || `Zlecenie #${j.id}`}
                      </div>
                      <div className="text-sm text-gray-600">
                        {j.title || "Bez tytułu"}
                      </div>
                      {j.description && (
                        <div className="text-xs text-gray-500 mt-1">
                          {j.description}
                        </div>
                      )}
                    </div>

                    <div className="text-right text-sm">
                      <div className="font-semibold">{j.status}</div>
                      <div className="text-xs text-gray-600">
                        Planowane: {formatDate(j.scheduled_date)}
                      </div>
                      <div className="text-xs text-gray-400">
                        Utworzone: {formatDate(j.created_at)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}
