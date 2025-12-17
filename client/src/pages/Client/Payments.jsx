import React, { useEffect, useState, useCallback } from "react";
import { useNotify } from "../../notifications/NotificationContext";
import InvoiceDetailsModal from "../../components/InvoiceDetailsModal";
import ReportPaymentModal from "../../components/ReportPaymentModal";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function ClientPayments() {
  const token = localStorage.getItem("token") || "";
  const notify = useNotify();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showReportPayment, setShowReportPayment] = useState(false);

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/invoices/client`, { headers });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch {
      notify.error("Failed to load invoices");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [notify, token]);

  useEffect(() => {
    if (!token) return;
    loadInvoices();
  }, [token, loadInvoices]);

  async function submitPayment(data) {
    try {
      const res = await fetch(
        `${API_BASE}/api/invoices/${selectedInvoice.id}/pay`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) throw new Error();

      notify.success("Payment has been reported");
      setShowReportPayment(false);
      setSelectedInvoice(null);
      loadInvoices();
    } catch {
      notify.error("Error reporting payment");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-textPrimary">Your invoices</h1>

      {loading ? (
        <div className="text-textSecondary">Loading…</div>
      ) : invoices.length === 0 ? (
        <div className="text-textSecondary">No invoices</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              className="bg-section border border-borderSoft rounded-2xl p-4 space-y-2"
            >
              <div className="flex justify-between items-center">
                <div className="font-medium text-textPrimary">
                  {inv.external_number || `#${inv.id}`}
                </div>
                <div className="text-sm text-textSecondary">
                  {inv.status === "PENDING_CONFIRMATION"
                    ? "Pending confirmation"
                    : inv.status}
                </div>
              </div>

              <div className="text-sm text-textPrimary">
                Amount:{" "}
                <strong>
                  {Number(inv.amount).toFixed(2)} {inv.currency || "PLN"}
                </strong>
              </div>

              <button
                onClick={() => setSelectedInvoice(inv)}
                className="ui-btn-outline text-sm"
              >
                Details
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedInvoice && (
        <InvoiceDetailsModal
          invoice={selectedInvoice}
          isClient
          onClose={() => setSelectedInvoice(null)}
          onReportPayment={() => setShowReportPayment(true)}
        />
      )}

      {showReportPayment && (
        <ReportPaymentModal
          onClose={() => setShowReportPayment(false)}
          onSubmit={submitPayment}
        />
      )}
    </div>
  );
}
