// src/pages/Admin/AdminReportView.jsx
import React, { useEffect, useState } from "react";

export default function AdminReportDetails({
  initialReport = {},
  onClose,
  onUpdated,
}) {
  const [report, setReport] = useState(initialReport || {});

  useEffect(() => {
    setReport(initialReport || {});
  }, [initialReport]);

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr : d.toLocaleString();
  }

  const photos = Array.isArray(report.photos) ? report.photos : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center py-12 bg-black/50 p-4 overflow-auto">
      <div className="bg-white rounded shadow max-w-3xl w-full p-6">
        <header className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-semibold">Raport #{report.id}</h3>
            <div className="text-sm text-gray-600">
              {report.job_external_number ||
                (report.job_id ? `#${report.job_id}` : "—")}{" "}
              {report.job_title ? `— ${report.job_title}` : ""}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Utworzono:{" "}
              {report.created_at ? formatDate(report.created_at) : "—"}
              {report.updated_at
                ? ` • Zakt. ${formatDate(report.updated_at)}`
                : ""}
            </div>
          </div>

          <div className="ml-auto flex gap-2">
            <button
              onClick={() => {
                if (onUpdated) onUpdated();
                if (onClose) onClose();
              }}
              className="px-3 py-1 border rounded"
            >
              Zamknij
            </button>
          </div>
        </header>

        <div className="space-y-4">
          <section>
            <h4 className="text-sm font-medium mb-2">Technik</h4>
            <div className="p-3 border rounded bg-gray-50">
              <div className="text-sm">
                {report.technician_name ||
                  report.technician_email ||
                  (report.technician_id ? `#${report.technician_id}` : "—")}
              </div>
              {report.technician_email && (
                <div className="text-xs text-gray-500 mt-1">
                  {report.technician_email}
                </div>
              )}
            </div>
          </section>

          <section>
            <h4 className="text-sm font-medium mb-2">Opis</h4>
            <div className="p-3 border rounded bg-gray-50">
              <div className="whitespace-pre-wrap text-sm">
                {report.description || "Brak opisu."}
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-sm font-medium mb-2">
              Zdjęcia ({photos.length})
            </h4>
            <div className="flex flex-wrap gap-3">
              {photos.length === 0 && (
                <div className="text-sm text-gray-500">Brak zdjęć.</div>
              )}
              {photos.map((p) => (
                <div key={p.id || p.file_path || p.url} className="w-40">
                  <a href={p.url} target="_blank" rel="noreferrer">
                    <img
                      src={p.url}
                      alt={p.original_name || "photo"}
                      className="w-40 h-28 object-cover rounded shadow"
                    />
                  </a>
                  <div className="text-xs mt-1">
                    {p.original_name || `#${p.id}`}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h4 className="text-sm font-medium mb-2">Szczegóły techniczne</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <div>Report id: {report.id ?? "—"}</div>
              <div>Job id: {report.job_id ?? "—"}</div>
              <div>Technician id: {report.technician_id ?? "—"}</div>
              {report.created_at && (
                <div>Created at: {formatDate(report.created_at)}</div>
              )}
              {report.updated_at && (
                <div>Updated at: {formatDate(report.updated_at)}</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
