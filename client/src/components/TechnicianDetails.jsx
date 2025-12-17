import React, { useEffect, useState } from "react";
import { useNotify } from "../notifications/NotificationContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function TechnicianDetails({
  tech: initialTech,
  techId,
  onClose,
}) {
  const notify = useNotify();
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [tech, setTech] = useState(initialTech || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    if (!initialTech && techId) {
      fetchTech(techId);
    }
  }, [token, techId, initialTech]);

  async function tryFetch(url, opts = {}) {
    console.debug("TechnicianDetails: fetch ->", url, opts);
    const res = await fetch(url, opts);
    let body = null;
    try {
      body = await res.json().catch(() => null);
    } catch {
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
      const url1 = `${API}/api/admin/technicians/${encodeURIComponent(id)}`;
      let { res, body } = await tryFetch(url1, { headers });

      if (res.ok) {
        setTech(body.technician || body.tech || body || null);
        return;
      }

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
          `Failed to fetch technician (${res.status})`
      );
    } catch (err) {
      console.error("TechnicianDetails fetch error:", err);
      const message = err.message || "Error while fetching technician details";
      setError(message);
      notify.error(message);
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
      {/* OVERLAY */}
      <div
        className="absolute inset-0 bg-overlay backdrop-blur-sm"
        onClick={handleBackdropClick}
      />

      {/* MODAL */}
      <div className="relative w-full max-w-xl mx-4 z-10">
        <div className="bg-modal rounded-2xl border border-borderSoft shadow-xl overflow-hidden">
          {/* HEADER */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-borderSoft">
            <h3 className="text-lg font-semibold text-textPrimary">
              Technician details
            </h3>
            <button
              onClick={onClose}
              className="text-textSecondary hover:text-textPrimary transition"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* CONTENT */}
          <div className="px-5 py-4 space-y-4">
            {loading ? (
              <div className="text-sm text-textSecondary">Loading…</div>
            ) : error ? (
              <div className="text-sm text-red-500">
                {error}
                <div className="text-xs text-textSecondary mt-2">
                  Check the network tab / backend logs for more details.
                </div>
              </div>
            ) : !tech ? (
              <div className="text-sm text-textSecondary">
                No technician data available
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* AVATAR */}
                <div className="flex flex-col items-center sm:items-start">
                  {tech.avatar_url || tech.avatar ? (
                    <img
                      src={`${API}${tech.avatar_url || tech.avatar}`}
                      alt={tech.name || tech.email}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/logo192.png";
                      }}
                      className="w-28 h-28 rounded-full object-cover border border-borderSoft"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-section flex items-center justify-center text-2xl font-semibold text-primary border border-borderSoft">
                      {(tech.name || tech.fullName || tech.email || "—")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}

                  <div className="mt-3 text-xs text-textSecondary">Role</div>
                  <div className="text-sm font-medium text-textPrimary">
                    {tech.role || "TECHNICIAN"}
                  </div>
                </div>

                {/* DETAILS */}
                <div className="sm:col-span-2">
                  <Info label="Name">{tech.name || tech.fullName || "—"}</Info>

                  <Info label="Email">{tech.email || "—"}</Info>

                  <Info label="Phone">{tech.phone || "—"}</Info>

                  <Info label="Address">
                    {tech.address || "—"}
                    {tech.city ? `, ${tech.city}` : ""}
                    {tech.postal_code ? ` ${tech.postal_code}` : ""}
                    {tech.country ? `, ${tech.country}` : ""}
                  </Info>

                  {tech.notes && (
                    <div className="mt-3">
                      <div className="text-xs text-textSecondary mb-0.5">
                        Notes
                      </div>
                      <div className="text-sm text-textPrimary">
                        {tech.notes}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 space-y-0.5 text-xs text-textSecondary">
                    <div>
                      Created at:{" "}
                      <span className="font-medium text-textPrimary">
                        {tech.created_at
                          ? new Date(tech.created_at).toLocaleString()
                          : "—"}
                      </span>
                    </div>
                    <div>
                      Updated at:{" "}
                      <span className="font-medium text-textPrimary">
                        {tech.updated_at
                          ? new Date(tech.updated_at).toLocaleString()
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="flex justify-end px-5 py-4 border-t border-borderSoft bg-section">
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
