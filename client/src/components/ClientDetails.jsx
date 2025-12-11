// src/pages/Admin/ClientDetails.jsx
import React, { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function ClientDetails({
  client: initialClient,
  clientId,
  onClose,
}) {
  // akceptujemy albo `client` (obiekt), albo `clientId` (string/number)
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const [client, setClient] = useState(initialClient || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // jeśli nie mamy obiektu, a mamy clientId — spróbuj fetcha
    if (!initialClient && clientId) {
      fetchClient(clientId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, initialClient]);

  async function tryFetch(url, opts = {}) {
    console.debug("ClientDetails: fetch ->", url, opts);
    const res = await fetch(url, opts);
    let body = null;
    try {
      body = await res.json().catch(() => null);
    } catch (e) {
      body = null;
    }
    return { res, body };
  }

  async function fetchClient(id) {
    setLoading(true);
    setError("");
    setClient(null);

    const headers = token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };

    try {
      const url1 = `${API}/api/admin/clients/${encodeURIComponent(id)}`;
      let { res, body } = await tryFetch(url1, { headers });

      if (res.ok) {
        setClient(body.client || body || null);
        return;
      }

      if (res.status === 404) {
        // try query variants
        const url2 = `${API}/api/admin/clients?id=${encodeURIComponent(id)}`;
        ({ res, body } = await tryFetch(url2, { headers }));
        if (res.ok) {
          setClient(
            Array.isArray(body) ? body[0] || null : body.client || body || null
          );
          return;
        }

        const url3 = `${API}/api/admin/clients?email=${encodeURIComponent(id)}`;
        ({ res, body } = await tryFetch(url3, { headers }));
        if (res.ok) {
          setClient(
            Array.isArray(body) ? body[0] || null : body.client || body || null
          );
          return;
        }

        throw new Error(
          body?.error || body?.message || `Failed to fetch client ${id} (404)`
        );
      }

      throw new Error(
        body?.error ||
          body?.message ||
          `Failed to fetch client ${id} (${res.status})`
      );
    } catch (err) {
      console.error("ClientDetails fetch error:", err);
      setError(err.message || "Błąd pobierania szczegółów klienta");
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
          <h3 className="text-lg font-medium">Szczegóły klienta</h3>
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
          ) : !client ? (
            <div className="text-sm text-gray-500">Brak danych klienta</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col items-center sm:items-start sm:col-span-1">
                {client.avatar_url || client.avatar ? (
                  <img
                    src={`${API}${client.avatar_url || client.avatar}`}
                    alt={client.name || client.email}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "/logo192.png";
                    }}
                    className="w-28 h-28 rounded-full object-cover mb-2"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-gray-100 flex items-center justify-center text-2xl text-gray-400 mb-2">
                    {(client.name || client.fullName || client.email || "—")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <div className="text-sm text-gray-500">Rola</div>
                <div className="font-medium">{client.role || "Klient"}</div>
              </div>

              <div className="sm:col-span-2">
                <div className="mb-3">
                  <div className="text-xs text-gray-500">Imię / Nazwa</div>
                  <div className="font-medium">
                    {client.name || client.fullName || "—"}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-xs text-gray-500">Email</div>
                  <div className="font-medium">{client.email || "—"}</div>
                </div>

                <div className="mb-3">
                  <div className="text-xs text-gray-500">Telefon</div>
                  <div className="font-medium">{client.phone || "—"}</div>
                </div>

                <div className="mb-3">
                  <div className="text-xs text-gray-500">Adres</div>
                  <div className="font-medium">
                    {client.address || "—"}
                    {client.city ? `, ${client.city}` : ""}
                    {client.postal_code ? ` ${client.postal_code}` : ""}
                    {client.country ? `, ${client.country}` : ""}
                  </div>
                </div>

                {client.notes && (
                  <div className="mb-3">
                    <div className="text-xs text-gray-500">Notatki</div>
                    <div className="text-sm">{client.notes}</div>
                  </div>
                )}
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
