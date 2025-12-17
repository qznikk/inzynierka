import React, { useEffect, useState } from "react";
import { useNotify } from "../notifications/NotificationContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function ClientDetails({
  client: initialClient,
  clientId,
  onClose,
}) {
  const notify = useNotify();

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [client, setClient] = useState(initialClient || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    if (!initialClient && clientId) {
      fetchClient(clientId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, clientId, initialClient]);

  async function tryFetch(url, opts = {}) {
    const res = await fetch(url, opts);
    let body = null;
    try {
      body = await res.json().catch(() => null);
    } catch {
      body = null;
    }
    return { res, body };
  }

  async function fetchClient(id) {
    setLoading(true);
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
          body?.error || body?.message || `Client not found (${id})`
        );
      }

      throw new Error(
        body?.error || body?.message || `Error fetching client (${res.status})`
      );
    } catch (err) {
      console.error("ClientDetails fetch error:", err);
      notify.error(err.message || "Error loading client details");
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
      role="dialog"
      aria-modal="true"
    >
      {/* OVERLAY */}
      <div
        className="absolute inset-0 bg-overlay backdrop-blur-sm"
        onClick={handleBackdropClick}
      />

      {/* MODAL */}
      <div className="relative z-10 w-full max-w-xl mx-4">
        <div className="bg-modal rounded-2xl border border-borderSoft shadow-xl overflow-hidden">
          {/* HEADER */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-borderSoft">
            <h3 className="text-lg font-semibold text-textPrimary">
              Client Details
            </h3>

            <button
              onClick={onClose}
              aria-label="Close"
              className="text-textSecondary hover:text-textPrimary transition"
            >
              ✕
            </button>
          </div>

          {/* CONTENT */}
          <div className="px-5 py-4 space-y-4">
            {loading ? (
              <div className="text-sm text-textSecondary">Loading…</div>
            ) : !client ? (
              <div className="text-sm text-textSecondary">
                No client data available
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* AVATAR */}
                <div className="flex flex-col items-center sm:items-start">
                  {client.avatar_url || client.avatar ? (
                    <img
                      src={`${API}${client.avatar_url || client.avatar}`}
                      alt={client.name || client.email}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/logo192.png";
                      }}
                      className="w-28 h-28 rounded-full object-cover border border-borderSoft"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-section flex items-center justify-center text-2xl font-semibold text-primary border border-borderSoft">
                      {(client.name || client.fullName || client.email || "—")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}

                  <div className="mt-3 text-xs text-textSecondary">Role</div>
                  <div className="text-sm font-medium text-textPrimary">
                    {client.role || "Client"}
                  </div>
                </div>

                {/* DETAILS */}
                <div className="sm:col-span-2">
                  <Info label="Name">
                    {client.name || client.fullName || "—"}
                  </Info>

                  <Info label="Email">{client.email || "—"}</Info>

                  <Info label="Phone">{client.phone || "—"}</Info>

                  <Info label="Address">
                    {client.address || "—"}
                    {client.city ? `, ${client.city}` : ""}
                    {client.postal_code ? ` ${client.postal_code}` : ""}
                    {client.country ? `, ${client.country}` : ""}
                  </Info>

                  {client.notes && (
                    <div className="mt-3">
                      <div className="text-xs text-textSecondary mb-0.5">
                        Notes
                      </div>
                      <div className="text-sm text-textPrimary">
                        {client.notes}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-borderSoft bg-section">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium
                         border border-borderMedium
                         text-primary hover:bg-accent/30 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= HELPERS ================= */

function Info({ label, children }) {
  return (
    <div className="mb-3">
      <div className="text-xs text-textSecondary">{label}</div>
      <div className="text-sm font-medium text-textPrimary">{children}</div>
    </div>
  );
}
