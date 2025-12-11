// src/pages/Admin/Clients.jsx
import React, { useEffect, useState } from "react";
import ClientDetails from "../../components/ClientDetails";

export default function Clients() {
  const API = import.meta.env.VITE_API_URL || "http://localhost:5050";
  const token = localStorage.getItem("token");

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // modal state: przechowujemy cały obiekt klienta (nie tylko id)
  const [selectedClient, setSelectedClient] = useState(null);

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchClients() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API}/api/admin/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch clients");
      }
      const data = await res.json();
      setClients(data.clients || data || []);
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Błąd podczas pobierania klientów");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clients</h1>
      </header>

      <section className="bg-white p-4 rounded shadow">
        <h2 className="font-medium mb-3">Existing clients</h2>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            {message && (
              <div className="text-sm mb-3 text-red-600">{message}</div>
            )}

            <ul className="space-y-2">
              {clients.length === 0 && (
                <li className="text-sm text-gray-500">No clients</li>
              )}

              {clients.map((c) => {
                // bezpieczeństwo: znajdź możliwy identyfikator
                const id = c.id ?? c._id ?? c.email;
                const avatarPath = c.avatar_url || c.avatar || "";
                const avatarSrc = avatarPath ? `${API}${avatarPath}` : null;

                return (
                  <li
                    key={id}
                    className="flex items-center justify-between border-b py-3"
                  >
                    <div className="flex items-center gap-3">
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt={c.name || c.email || "avatar"}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/logo192.png";
                          }}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                          {(c.name || c.fullName || c.email || "—")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}

                      <div>
                        <div className="font-medium">
                          {c.name || c.fullName || "—"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {c.email || "—"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedClient(c)} // przekazujemy cały obiekt
                        className="px-3 py-1 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        Szczegóły
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {/* Modal: ClientDetails (przekazujemy obiekt client) */}
      {selectedClient && (
        <ClientDetails
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </div>
  );
}
