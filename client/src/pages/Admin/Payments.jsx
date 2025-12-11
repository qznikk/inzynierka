// src/pages/Admin/AdminInvoices.jsx
import React, { useEffect, useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function AdminPayments() {
  const token = localStorage.getItem("token") || "";
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editInvoice, setEditInvoice] = useState(null); // invoice being edited
  const [form, setForm] = useState({
    client_id: "",
    amount: "",
    description: "",
    due_date: "",
  });
  const [message, setMessage] = useState("");

  const headers = {
    Authorization: token ? `Bearer ${token}` : "",
    "Content-Type": "application/json",
  };

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/invoices`, { headers });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("Invoices fetch error:", res.status, text);
        setMessage(`Błąd pobierania faktur: ${res.status}`);
        setInvoices([]);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setInvoices(data.invoices || data || []);
    } catch (err) {
      console.error(err);
      setMessage("Błąd pobierania faktur");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/clients?limit=200`, {
        headers,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("Clients fetch error:", res.status, text);
        setMessage(`Błąd pobierania klientów: ${res.status}`);
        return;
      }
      const data = await res.json();
      setClients(data.clients || data || []);
    } catch (err) {
      console.error(err);
      setMessage("Błąd pobierania klientów");
    }
  }, [token]);

  useEffect(() => {
    fetchInvoices();
    fetchClients();
  }, [fetchInvoices, fetchClients]);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/admin/invoices`, {
        method: "POST",
        headers,
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => {});
        throw new Error(err?.error || "Błąd");
      }
      await fetchInvoices();
      setShowCreate(false);
      setForm({ client_id: "", amount: "", description: "", due_date: "" });
    } catch (err) {
      setMessage(err.message || "Błąd tworzenia");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Usuń?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/invoices/${id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Błąd: ${res.status} ${text}`);
      }
      await fetchInvoices();
    } catch (err) {
      console.error(err);
      setMessage("Błąd usuwania faktury");
    }
  }

  function openEdit(inv) {
    setEditInvoice(inv);
    setForm({
      client_id: inv.client_id || "",
      amount: inv.amount || "",
      description: inv.description || "",
      due_date: inv.due_date
        ? new Date(inv.due_date).toISOString().slice(0, 10)
        : "",
    });
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!editInvoice) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/invoices/${editInvoice.id}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify(form),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => {});
        throw new Error(err?.error || "Błąd");
      }
      await fetchInvoices();
      setEditInvoice(null);
      setForm({ client_id: "", amount: "", description: "", due_date: "" });
    } catch (err) {
      console.error(err);
      setMessage("Błąd edycji");
    }
  }

  async function confirmPayment(inv) {
    if (!confirm("Potwierdzić otrzymanie płatności i oznaczyć jako ZAPŁACONE?"))
      return;
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/invoices/${inv.id}/confirm-pay`,
        {
          method: "POST",
          headers,
        }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Błąd: ${res.status} ${text}`);
      }
      const updated = await res.json();
      setInvoices((prev) =>
        prev.map((i) => (i.id === updated.id ? updated : i))
      );
    } catch (err) {
      console.error(err);
      setMessage("Błąd potwierdzenia płatności");
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Płatności / Faktury</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-3 py-2 bg-emerald-600 text-white rounded"
        >
          Dodaj nową fakturę
        </button>
      </header>

      {message && <div className="text-red-600">{message}</div>}

      <div className="bg-white p-4 rounded shadow">
        {loading ? (
          <div>Ładuję...</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="text-left text-gray-600">
              <tr>
                <th>Nr</th>
                <th>Klient</th>
                <th>Kwota</th>
                <th>Status</th>
                <th>Data</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t">
                  <td className="px-2 py-2">{inv.external_number}</td>
                  <td className="px-2 py-2">
                    {inv.client_name || inv.client_email}
                  </td>
                  <td className="px-2 py-2">
                    {Number(inv.amount).toFixed(2)} {inv.currency}
                  </td>
                  <td className="px-2 py-2">
                    {inv.status === "PENDING_CONFIRMATION"
                      ? "Oczekuje potwierdzenia"
                      : inv.status}
                  </td>
                  <td className="px-2 py-2">
                    {new Date(inv.issued_at).toLocaleDateString()}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      className="mr-2 text-sm px-2 py-1 border rounded"
                      onClick={() => openEdit(inv)}
                    >
                      Edytuj
                    </button>
                    <button
                      className="mr-2 text-sm px-2 py-1 border rounded text-emerald-700"
                      onClick={() => confirmPayment(inv)}
                      disabled={inv.status === "PAID"}
                    >
                      Potwierdź płatność
                    </button>
                    <button
                      className="text-sm px-2 py-1 border rounded text-red-600"
                      onClick={() => handleDelete(inv.id)}
                    >
                      Usuń
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowCreate(false)}
          />
          <form
            onSubmit={handleCreate}
            className="relative bg-white rounded shadow-lg p-4 w-full max-w-xl"
          >
            <h3 className="text-lg font-semibold mb-2">Nowa faktura</h3>
            <div className="grid grid-cols-1 gap-3">
              <select
                required
                value={form.client_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, client_id: e.target.value }))
                }
                className="px-3 py-2 border rounded"
              >
                <option value="">-- wybierz klienta --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.email} ({c.email})
                  </option>
                ))}
              </select>
              <input
                required
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
                placeholder="Kwota"
                className="px-3 py-2 border rounded"
              />
              <input
                value={form.due_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, due_date: e.target.value }))
                }
                type="date"
                className="px-3 py-2 border rounded"
              />
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className="px-3 py-2 border rounded"
                placeholder="Opis"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-3 py-2 border rounded"
              >
                Anuluj
              </button>
              <button
                type="submit"
                className="px-3 py-2 bg-emerald-600 text-white rounded"
              >
                Utwórz
              </button>
            </div>
          </form>
        </div>
      )}

      {editInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setEditInvoice(null)}
          />
          <form
            onSubmit={handleEditSubmit}
            className="relative bg-white rounded shadow-lg p-4 w-full max-w-xl"
          >
            <h3 className="text-lg font-semibold mb-2">
              Edytuj fakturę{" "}
              {editInvoice.external_number || `#${editInvoice.id}`}
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <select
                required
                value={form.client_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, client_id: e.target.value }))
                }
                className="px-3 py-2 border rounded"
              >
                <option value="">-- wybierz klienta --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.email} ({c.email})
                  </option>
                ))}
              </select>
              <input
                required
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
                placeholder="Kwota"
                className="px-3 py-2 border rounded"
              />
              <input
                value={form.due_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, due_date: e.target.value }))
                }
                type="date"
                className="px-3 py-2 border rounded"
              />
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className="px-3 py-2 border rounded"
                placeholder="Opis"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setEditInvoice(null)}
                className="px-3 py-2 border rounded"
              >
                Anuluj
              </button>
              <button
                type="submit"
                className="px-3 py-2 bg-emerald-600 text-white rounded"
              >
                Zapisz
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
