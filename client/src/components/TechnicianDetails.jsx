// src/components/TechnicianDetails.jsx
import React, { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function TechnicianDetails({
  tech: initialTech,
  techId,
  onClose,
}) {
  // akceptujemy albo pełny obiekt `tech` (initialTech), albo `techId`
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const [tech, setTech] = useState(initialTech || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // jeśli nie mamy obiektu, a jest techId — spróbuj pobrać
    if (!initialTech && techId) {
      fetchTech(techId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [techId, initialTech]);

  async function tryFetch(url, opts = {}) {
    console.debug("TechnicianDetails: fetch ->", url, opts);
    const res = await fetch(url, opts);
    let body = null;
    try {
      body = await res.json().catch(() => null);
    } catch (e) {
      body = null;
    }
    return { res, body };
  }

  async function fetchTech(id) {
    setLoading(true);
    setError("");
    setTech(null);

    const headers = token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };

    try {
      // 1) spróbuj GET /api/admin/technicians/:id (jeżeli endpoint jest dostępny)
      const url1 = `${API}/api/admin/technicians/${encodeURIComponent(id)}`;
      let { res, body } = await tryFetch(url1, { headers });

      if (res.ok) {
        // oczekujemy obiektu podobnego do { technician: {...} } lub sam obiekt
        setTech(body.technician || body.tech || body || null);
        return;
      }

      // 2) fallback: query param ?id=...
      const url2 = `${API}/api/admin/technicians?id=${encodeURIComponent(id)}`;
      ({ res, body } = await tryFetch(url2, { headers }));
      if (res.ok) {
        setTech(
          Array.isArray(body)
            ? body[0] || null
            : body.technician || body || null
        );
        return;
      }

      // 3) fallback na email query (tak jak ClientDetails robił)
      const url3 = `${API}/api/admin/technicians?email=${encodeURIComponent(
        id
      )}`;
      ({ res, body } = await tryFetch(url3, { headers }));
      if (res.ok) {
        setTech(
          Array.isArray(body)
            ? body[0] || null
            : body.technician || body || null
        );
        return;
      }

      throw new Error(
        body?.error ||
          body?.message ||
          `Failed to fetch technician ${id} (${res.status})`
      );
    } catch (err) {
      console.error("TechnicianDetails fetch error:", err);
      setError(err.message || "Błąd pobierania szczegółów technika");
    } finally {
      setLoading(false);
    }
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={handleBackdropClick}
      />

      <div className="relative bg-white rounded-lg shadow-xl max-w-xl w-full mx-4 z-10">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-medium">Szczegóły technika</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 px-2 py-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div className="text-sm text-red-600">
              {error}
              <div className="text-xs text-gray-400 mt-2">
                Sprawdź konsolę network/logi backendu dla więcej szczegółów.
              </div>
            </div>
          ) : !tech ? (
            <div className="text-sm text-gray-500">Brak danych technika</div>
          ) : (
            // layout taki sam jak ClientDetails (3 kolumny na szerokich ekranach)
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col items-center sm:items-start sm:col-span-1">
                {tech.avatar_url || tech.avatar ? (
                  <img
                    src={`${API}${tech.avatar_url || tech.avatar}`}
                    alt={tech.name || tech.email}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/logo192.png";
                    }}
                    className="w-28 h-28 rounded-full object-cover mb-2"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-gray-100 flex items-center justify-center text-2xl text-gray-400 mb-2">
                    {(tech.name || tech.fullName || tech.email || "—")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <div className="text-sm text-gray-500">Rola</div>
                <div className="font-medium">{tech.role || "TECHNICIAN"}</div>
              </div>

              <div className="sm:col-span-2">
                <div className="mb-3">
                  <div className="text-xs text-gray-500">Imię / Nazwa</div>
                  <div className="font-medium">
                    {tech.name || tech.fullName || "—"}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-xs text-gray-500">Email</div>
                  <div className="font-medium">{tech.email || "—"}</div>
                </div>

                <div className="mb-3">
                  <div className="text-xs text-gray-500">Telefon</div>
                  <div className="font-medium">{tech.phone || "—"}</div>
                </div>

                <div className="mb-3">
                  <div className="text-xs text-gray-500">Adres</div>
                  <div className="font-medium">
                    {tech.address || "—"}
                    {tech.city ? `, ${tech.city}` : ""}
                    {tech.postal_code ? ` ${tech.postal_code}` : ""}
                    {tech.country ? `, ${tech.country}` : ""}
                  </div>
                </div>

                {tech.notes && (
                  <div className="mb-3">
                    <div className="text-xs text-gray-500">Notatki</div>
                    <div className="text-sm">{tech.notes}</div>
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  Utworzono:{" "}
                  <span className="font-medium">
                    {tech.created_at
                      ? new Date(tech.created_at).toLocaleString()
                      : "—"}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Zaktualizowano:{" "}
                  <span className="font-medium">
                    {tech.updated_at
                      ? new Date(tech.updated_at).toLocaleString()
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
