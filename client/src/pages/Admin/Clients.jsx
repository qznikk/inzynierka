import React, { useEffect, useState } from "react";
import ClientDetails from "../../components/ClientDetails";
import { useNotify } from "../../notifications/NotificationContext";

export default function Clients() {
  const API = import.meta.env.VITE_API_URL || "http://localhost:5050";
  const token = localStorage.getItem("token");
  const notify = useNotify();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetchClients();
  }, [token]);

  async function fetchClients() {
    setLoading(true);
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
      notify.error(err.message || "Error while fetching clients");
    } finally {
      setLoading(false);
    }
  }

  const filteredClients = clients.filter((c) => {
    const name = (c.name || c.fullName || "").toLowerCase();
    const email = (c.email || "").toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-textPrimary">Clients</h1>
      </header>

      <section className="bg-section p-4 rounded-2xl border border-borderSoft">
        <h2 className="font-medium mb-3 text-textPrimary">Existing clients</h2>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search client by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ui-input w-full md:w-1/3"
          />
        </div>

        {loading ? (
          <div className="text-textSecondary text-sm">Loading…</div>
        ) : (
          <ul className="space-y-2">
            {filteredClients.length === 0 && (
              <li className="text-sm text-textSecondary">No clients</li>
            )}

            {filteredClients.map((c) => {
              const id = c.id ?? c._id ?? c.email;
              const avatarPath = c.avatar_url || c.avatar || "";
              const avatarSrc = avatarPath ? `${API}${avatarPath}` : null;

              return (
                <li
                  key={id}
                  className="flex items-center justify-between py-3 border-b border-borderSoft"
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
                      <div className="w-10 h-10 rounded-full border border-borderSoft flex items-center justify-center text-textSecondary text-sm">
                        {(c.name || c.fullName || c.email || "—")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}

                    <div>
                      <div className="font-medium text-textPrimary">
                        {c.name || c.fullName || "—"}
                      </div>
                      <div className="text-xs text-textSecondary">
                        {c.email || "—"}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedClient(c)}
                    className="ui-btn-primary text-sm"
                  >
                    Details
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {selectedClient && (
        <ClientDetails
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </div>
  );
}
