// src/pages/Client/ClientInvoices.jsx
import React, { useEffect, useState, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

function fmtDate(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return "";
  }
}

export default function ClientPayments() {
  const token = localStorage.getItem("token") || "";
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(50);

  const headers = {
    Authorization: token ? `Bearer ${token}` : "",
    "Content-Type": "application/json",
  };

  const loadInvoices = useCallback(
    async (opts = {}) => {
      setLoading(true);
      setMessage("");
      try {
        const qp = new URLSearchParams();
        qp.set("page", opts.page || page);
        qp.set("limit", limit);
        if (opts.status ?? statusFilter)
          qp.set("status", opts.status ?? statusFilter);

        const res = await fetch(
          `${API_BASE}/api/invoices/client?${qp.toString()}`,
          {
            headers,
          }
        );
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          if (res.status === 401) {
            setMessage("Nieautoryzowany. Zaloguj się ponownie.");
            setInvoices([]);
            setLoading(false);
            return;
          }
          console.error("Invoices load error:", res.status, body);
          setMessage(`Błąd pobierania faktur: ${res.status}`);
          setInvoices([]);
          setLoading(false);
          return;
        }
        const data = await res.json().catch(() => null);
        const list = (data && (data.invoices || data.jobs || [])) || [];
        setInvoices(list);
      } catch (err) {
        console.error("Invoices load failed:", err);
        setMessage("Błąd sieci przy pobieraniu faktur");
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    },
    [page, limit, statusFilter, token]
  );

  useEffect(() => {
    loadInvoices({ page });
  }, [loadInvoices, page, statusFilter]);

  async function markPaid(id) {
    // zamiast confirm modal używamy confirm() — możesz podmienić na lepszy UI
    const note = prompt(
      "Opcjonalna notatka do płatności (np. nr przelewu):",
      ""
    );
    if (
      !confirm(
        "Zgłosić płatność i ustawić status na 'Oczekiwanie na potwierdzenie'?"
      )
    )
      return;

    try {
      const res = await fetch(`${API_BASE}/api/invoices/${id}/pay`, {
        method: "POST",
        headers,
        body: JSON.stringify({ method: "manual", note }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("Mark paid error:", res.status, text);
        if (res.status === 401) {
          alert("Nieautoryzowany. Zaloguj się ponownie.");
          return;
        }
        alert(`Błąd przy zgłaszaniu płatności: ${res.status}`);
        return;
      }
      const updated = await res.json().catch(() => null);

      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === id
            ? {
                ...(updated || {}),
                ...inv,
                status: (updated && updated.status) || "PENDING_CONFIRMATION",
              }
            : inv
        )
      );
    } catch (err) {
      console.error("Mark paid network error:", err);
      alert("Błąd sieci. Spróbuj ponownie.");
    }
  }

  return (
    <div className="bg-white p-4 rounded shadow">
      <header className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Twoje faktury</h2>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-2 py-1 border rounded"
          >
            <option value="">Wszystkie</option>
            <option value="ISSUED">Wystawione</option>
            <option value="PENDING_CONFIRMATION">
              Oczekujące potwierdzenia
            </option>
            <option value="PAID">Zapłacone</option>
            <option value="CANCELLED">Anulowane</option>
          </select>
          <button
            onClick={() => loadInvoices({ page: 1 })}
            className="px-3 py-1 border rounded text-sm"
          >
            Odśwież
          </button>
        </div>
      </header>

      {message && <div className="text-red-600 mb-3">{message}</div>}

      {loading ? (
        <div>Ładuję...</div>
      ) : invoices.length === 0 ? (
        <div>Brak faktur</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-gray-600">
                <tr>
                  <th className="px-2 py-2">Nr</th>
                  <th className="px-2 py-2">Kwota</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Data</th>
                  <th className="px-2 py-2">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-t">
                    <td className="px-2 py-2">
                      {inv.external_number || `#${inv.id}`}
                    </td>
                    <td className="px-2 py-2">
                      {Number(inv.amount || 0).toFixed(2)}{" "}
                      {inv.currency || "PLN"}
                    </td>
                    <td className="px-2 py-2">
                      {inv.status === "PENDING_CONFIRMATION"
                        ? "Oczekiwanie na potwierdzenie"
                        : inv.status}
                    </td>
                    <td className="px-2 py-2">{fmtDate(inv.issued_at)}</td>
                    <td className="px-2 py-2">
                      {inv.status !== "PAID" &&
                        inv.status !== "PENDING_CONFIRMATION" && (
                          <button
                            onClick={() => markPaid(inv.id)}
                            className="px-2 py-1 border rounded text-sm"
                          >
                            Zgłoś płatność
                          </button>
                        )}
                      {inv.status === "PENDING_CONFIRMATION" && (
                        <span className="text-sm italic text-gray-600">
                          Oczekuje potwierdzenia
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="text-sm text-gray-600">
              Pokazano: {Math.min((page - 1) * limit + 1, invoices.length)} -{" "}
              {Math.min(page * limit, invoices.length)}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Poprzednia
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border rounded"
              >
                Następna
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
