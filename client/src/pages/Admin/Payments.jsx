import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNotify } from "../../notifications/NotificationContext";
import InvoiceDetailsModal from "../../components/InvoiceDetailsModal";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

/* ===================== PDF HELPER ===================== */
async function openInvoicePdf(invoiceId) {
  try {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_BASE}/api/invoices/${invoiceId}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error();

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url, "_blank");
  } catch {
    alert("Failed to download PDF");
  }
}

export default function AdminPayments() {
  const token = localStorage.getItem("token") || "";
  const notify = useNotify();

  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [editInvoice, setEditInvoice] = useState(null);
  const [detailsInvoice, setDetailsInvoice] = useState(null);

  const [form, setForm] = useState({
    client_id: "",
    amount: "",
    description: "",
    due_date: "",
  });

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  /* ===================== DATA ===================== */
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/invoices`, { headers });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setInvoices(data.invoices || data || []);
    } catch {
      notify.error("Error loading invoices");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [notify, token]);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/clients?limit=200`, {
        headers,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setClients(data.clients || data || []);
    } catch {
      notify.error("Error loading clients");
    }
  }, [notify, token]);

  useEffect(() => {
    if (!token) return;
    fetchInvoices();
    fetchClients();
  }, [token, fetchInvoices, fetchClients]);

  /* ===================== DERIVED ===================== */
  const pendingConfirm = useMemo(
    () => invoices.filter((i) => i.status === "PENDING_CONFIRMATION"),
    [invoices]
  );

  const otherInvoices = useMemo(
    () => invoices.filter((i) => i.status !== "PENDING_CONFIRMATION"),
    [invoices]
  );

  /* ===================== ACTIONS ===================== */
  async function confirmPayment(inv) {
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/invoices/${inv.id}/confirm-pay`,
        { method: "POST", headers }
      );
      if (!res.ok) throw new Error();
      notify.success("Payment confirmed");
      setDetailsInvoice(null);
      fetchInvoices();
    } catch {
      notify.error("Error confirming payment");
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/admin/invoices`, {
        method: "POST",
        headers,
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      notify.success("Invoice created");
      setShowCreate(false);
      setForm({ client_id: "", amount: "", description: "", due_date: "" });
      fetchInvoices();
    } catch {
      notify.error("Error creating invoice");
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this invoice?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/invoices/${id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error();
      notify.success("Invoice deleted");
      fetchInvoices();
    } catch {
      notify.error("Error deleting invoice");
    }
  }

  function openEdit(inv) {
    setEditInvoice(inv);
    setForm({
      client_id: inv.client_id,
      amount: inv.amount,
      description: inv.description || "",
      due_date: inv.due_date
        ? new Date(inv.due_date).toISOString().slice(0, 10)
        : "",
    });
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/invoices/${editInvoice.id}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify(form),
        }
      );
      if (!res.ok) throw new Error();
      notify.success("Invoice updated");
      setEditInvoice(null);
      fetchInvoices();
    } catch {
      notify.error("Error editing invoice");
    }
  }

  /* ===================== RENDER ===================== */
  return (
    <div className="text-textPrimary bg-section p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-textPrimary">
          Payments / Invoices
        </h1>
        <button onClick={() => setShowCreate(true)} className="ui-btn-primary">
          Issue invoice
        </button>
      </header>

      {/* ===================== PENDING ===================== */}
      {pendingConfirm.length > 0 && (
        <div
          className="rounded-2xl border border-borderSoft p-4"
          style={{
            background:
              "color-mix(in srgb, var(--status-waiting) 15%, transparent)",
          }}
        >
          <h2 className="font-semibold mb-3 text-textPrimary">
            🕓 Payments pending confirmation ({pendingConfirm.length})
          </h2>

          <div className="space-y-2">
            {pendingConfirm.map((inv) => (
              <div
                key={inv.id}
                className="flex justify-between items-center bg-section p-3 rounded-xl border border-borderSoft"
              >
                <div>
                  <div className="font-medium text-textPrimary">
                    {inv.external_number} — {inv.client_name}
                  </div>
                  <div className="text-sm text-textSecondary">
                    {Number(inv.amount).toFixed(2)} {inv.currency}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openInvoicePdf(inv.id)}
                    className="ui-btn-outline text-sm"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => setDetailsInvoice(inv)}
                    className="ui-btn-primary text-sm"
                  >
                    Details / Confirm
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================== ALL ===================== */}
      <div className="bg-section rounded-2xl border border-borderSoft p-4">
        {loading ? (
          <div className="text-textSecondary">Loading…</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="text-textSecondary">
              <tr>
                <th className="text-left py-2">No.</th>
                <th className="text-left py-2">Client</th>
                <th className="text-left py-2">Amount</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Date</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {otherInvoices.map((inv) => (
                <tr key={inv.id} className="border-t border-borderSoft">
                  <td>{inv.external_number}</td>
                  <td>{inv.client_name || inv.client_email}</td>
                  <td>
                    {Number(inv.amount).toFixed(2)} {inv.currency}
                  </td>
                  <td>{inv.status}</td>
                  <td>{new Date(inv.issued_at).toLocaleDateString()}</td>
                  <td className="space-x-2">
                    <button
                      onClick={() => openInvoicePdf(inv.id)}
                      className="ui-btn-outline text-xs"
                    >
                      PDF
                    </button>
                    <button
                      onClick={() => openEdit(inv)}
                      className="ui-btn-outline text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(inv.id)}
                      className="text-xs px-2 py-1 rounded border"
                      style={{
                        color: "var(--status-danger)",
                        borderColor: "var(--status-danger)",
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ===================== DETAILS MODAL ===================== */}
      {detailsInvoice && (
        <InvoiceDetailsModal
          invoice={detailsInvoice}
          onClose={() => setDetailsInvoice(null)}
          onConfirm={() => confirmPayment(detailsInvoice)}
          isAdmin
        />
      )}

      {/* ===================== CREATE / EDIT MODAL ===================== */}
      {(showCreate || editInvoice) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-overlay"
            onClick={() => {
              setShowCreate(false);
              setEditInvoice(null);
            }}
          />
          <form
            onSubmit={editInvoice ? handleEditSubmit : handleCreate}
            className="relative bg-modal rounded-2xl border border-borderSoft p-6 w-full max-w-xl"
          >
            <h3 className="text-lg font-semibold mb-4 text-textPrimary">
              {editInvoice ? "Edit invoice" : "New invoice"}
            </h3>

            <div className="grid gap-3">
              <select
                required
                value={form.client_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, client_id: e.target.value }))
                }
                className="ui-input"
              >
                <option value="">-- select client --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.email}
                  </option>
                ))}
              </select>

              <input
                required
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
                placeholder="Amount"
                className="ui-input"
              />

              <input
                type="date"
                value={form.due_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, due_date: e.target.value }))
                }
                className="ui-input"
              />

              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Description"
                className="ui-input h-24"
              />
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setEditInvoice(null);
                }}
                className="ui-btn-outline"
              >
                Cancel
              </button>
              <button type="submit" className="ui-btn-primary">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
