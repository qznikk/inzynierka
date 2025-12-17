import React, { useState } from "react";

export default function ReportPaymentModal({ onClose, onSubmit }) {
  const [method, setMethod] = useState("transfer");
  const [note, setNote] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ method, note });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* OVERLAY */}
      <div
        className="absolute inset-0 bg-overlay backdrop-blur-sm"
        onClick={onClose}
      />

      {/* MODAL */}
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md bg-modal rounded-2xl
                   border border-borderSoft shadow-xl p-5 space-y-5"
      >
        {/* HEADER */}
        <h3 className="text-lg font-semibold text-textPrimary">
          Payment report
        </h3>

        {/* METHOD */}
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={method === "transfer"}
              onChange={() => setMethod("transfer")}
            />
            <span className="text-textPrimary">Bank transfer</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={method === "cash"}
              onChange={() => setMethod("cash")}
            />
            <span className="text-textPrimary">Cash</span>
          </label>
        </div>

        {/* NOTE */}
        <textarea
          placeholder="Optional note (e.g. transfer reference number)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="ui-input w-full resize-none"
          rows={3}
        />

        {/* ACTIONS */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium
                       border border-borderMedium
                       text-primary hover:bg-accent/30 transition"
          >
            Cancel
          </button>

          <button type="submit" className="ui-btn-primary">
            Report payment
          </button>
        </div>
      </form>
    </div>
  );
}
