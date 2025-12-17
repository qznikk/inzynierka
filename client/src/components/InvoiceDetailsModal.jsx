import React from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}

async function openInvoicePdf(invoiceId) {
  try {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_BASE}/api/invoices/${invoiceId}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Error fetching PDF");

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url, "_blank");
  } catch (err) {
    console.error(err);
    alert("Failed to download the PDF file");
  }
}

export default function InvoiceDetailsModal({
  invoice,
  onClose,
  onReportPayment,
  onConfirm,
  isClient = false,
  isAdmin = false,
}) {
  if (!invoice) return null;

  const isPending = invoice.status === "PENDING_CONFIRMATION";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* OVERLAY */}
      <div
        className="absolute inset-0 bg-overlay backdrop-blur-sm"
        onClick={onClose}
      />

      {/* MODAL */}
      <div className="relative w-full max-w-xl">
        <div className="bg-modal rounded-2xl border border-borderSoft shadow-xl p-6 space-y-5">
          {/* HEADER */}
          <header className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-textPrimary">
                Invoice {invoice.external_number || `#${invoice.id}`}
              </h2>
              <div className="text-sm text-textSecondary">
                {invoice.client_name || invoice.client_email || ""}
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-textSecondary hover:text-textPrimary transition"
            >
              ✕
            </button>
          </header>

          {/* BASIC INFO */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Info label="Amount">
              {Number(invoice.amount).toFixed(2)} {invoice.currency || "PLN"}
            </Info>

            <Info label="Status">
              {invoice.status === "PENDING_CONFIRMATION"
                ? "Pending confirmation"
                : invoice.status}
            </Info>

            <Info label="Issue date">{fmtDate(invoice.issued_at)}</Info>
            <Info label="Due date">{fmtDate(invoice.due_date)}</Info>
          </div>

          {/* DESCRIPTION */}
          {invoice.description && (
            <section>
              <div className="text-xs text-textSecondary mb-1">Description</div>
              <div className="rounded-xl border border-borderSoft bg-section p-3 text-sm text-textPrimary">
                {invoice.description}
              </div>
            </section>
          )}

          {/* INFO */}
          {isClient && isPending && (
            <div className="text-sm italic text-textSecondary">
              The payment has been reported and is awaiting administrator
              confirmation.
            </div>
          )}

          {/* ACTIONS */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => openInvoicePdf(invoice.id)}
              className="px-4 py-2 rounded-lg text-sm font-medium
                         border border-borderMedium
                         text-primary hover:bg-accent/30 transition"
            >
              Download PDF
            </button>

            {isClient && invoice.status === "ISSUED" && (
              <button onClick={onReportPayment} className="ui-btn-primary">
                Report payment
              </button>
            )}

            {isAdmin && isPending && (
              <button onClick={onConfirm} className="ui-btn-primary">
                Confirm payment
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== HELPERS ===================== */

function Info({ label, children }) {
  return (
    <div>
      <div className="text-xs text-textSecondary">{label}</div>
      <div className="text-sm font-medium text-textPrimary">{children}</div>
    </div>
  );
}
