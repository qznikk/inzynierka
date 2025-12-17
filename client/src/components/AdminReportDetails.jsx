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
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 py-10">
      {/* OVERLAY */}
      <div
        className="absolute inset-0 bg-overlay backdrop-blur-sm"
        onClick={onClose}
      />

      {/* MODAL */}
      <div className="relative w-full max-w-3xl">
        <div className="bg-modal rounded-2xl border border-borderSoft shadow-xl p-6">
          {/* HEADER */}
          <header className="flex items-start justify-between gap-6 mb-6">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-textPrimary">
                Report #{report.id}
              </h3>

              <div className="text-sm text-textSecondary">
                {report.job_external_number ||
                  (report.job_id ? `#${report.job_id}` : "—")}
                {report.job_title ? ` — ${report.job_title}` : ""}
              </div>

              <div className="text-xs text-textSecondary">
                Created:{" "}
                {report.created_at ? formatDate(report.created_at) : "—"}
                {report.updated_at
                  ? ` • Updated ${formatDate(report.updated_at)}`
                  : ""}
              </div>
            </div>

            <button
              onClick={() => {
                if (onUpdated) onUpdated();
                if (onClose) onClose();
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium
                         border border-borderMedium
                         text-primary hover:bg-accent/30
                         transition"
            >
              Close
            </button>
          </header>

          <div className="space-y-6">
            <section>
              <h4 className="text-sm font-medium text-textPrimary mb-2">
                Technician
              </h4>

              <div className="rounded-xl border border-borderSoft bg-section px-4 py-3">
                <div className="text-sm text-textPrimary font-medium">
                  {report.technician_name ||
                    report.technician_email ||
                    (report.technician_id ? `#${report.technician_id}` : "—")}
                </div>

                {report.technician_email && (
                  <div className="text-xs text-textSecondary mt-0.5">
                    {report.technician_email}
                  </div>
                )}
              </div>
            </section>

            {/* DESCRIPTION */}
            <section>
              <h4 className="text-sm font-medium text-textPrimary mb-2">
                Description
              </h4>

              <div className="rounded-xl border border-borderSoft bg-section px-4 py-3">
                <div className="whitespace-pre-wrap text-sm text-textPrimary leading-relaxed">
                  {report.description || "No description provided."}
                </div>
              </div>
            </section>

            {/* PHOTOS */}
            <section>
              <h4 className="text-sm font-medium text-textPrimary mb-3">
                Photos{" "}
                <span className="text-textSecondary">({photos.length})</span>
              </h4>

              {photos.length === 0 ? (
                <div className="text-sm text-textSecondary">
                  No photos uploaded.
                </div>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {photos.map((p) => (
                    <div key={p.id || p.file_path || p.url} className="w-40">
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block"
                      >
                        <img
                          src={p.url}
                          alt={p.original_name || "photo"}
                          className="w-40 h-28 object-cover rounded-xl
                                     border border-borderSoft
                                     hover:shadow-md transition"
                        />
                      </a>

                      <div className="mt-1 text-xs text-textSecondary truncate">
                        {p.original_name || `#${p.id}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
