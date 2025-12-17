import React, { useEffect, useState } from "react";
import { useNotify } from "../notifications/NotificationContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

async function safeParseResponse(res) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  return null;
}

export default function ReportDetails({ initialReport, onClose, onUpdated }) {
  const notify = useNotify();
  const token = localStorage.getItem("token");

  const [report, setReport] = useState(initialReport || {});
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(initialReport?.description || "");
  const [newFiles, setNewFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const headersWithAuth = (extra = {}) => {
    const h = { ...extra };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  };

  async function fetchFresh() {
    try {
      const res = await fetch(`${API_BASE}/api/technician/reports`, {
        headers: headersWithAuth({ "Content-Type": "application/json" }),
      });
      if (!res.ok) return;

      const body = await safeParseResponse(res);
      if (!body) return;

      const found = (body.reports || []).find(
        (r) => String(r.id) === String(initialReport.id)
      );

      if (found) {
        setReport(found);
        setDesc(found.description || "");
      }
    } catch (e) {
      console.warn("fetchFresh failed", e);
    }
  }

  useEffect(() => {
    fetchFresh();
  }, []);

  function onNewFilesChange(e) {
    setNewFiles(Array.from(e.target.files || []));
  }

  async function handleSaveDescription() {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/technician/reports/${report.id}`,
        {
          method: "PUT",
          headers: headersWithAuth({ "Content-Type": "application/json" }),
          body: JSON.stringify({ description: desc }),
        }
      );

      const body = await safeParseResponse(res);
      if (!res.ok) {
        throw new Error(
          (body && (body.error || body.message)) ||
            `${res.status} ${res.statusText}`
        );
      }

      setReport((prev) => ({
        ...prev,
        description: body.report.description,
      }));
      setEditing(false);

      notify.success("Report description has been saved");
      onUpdated?.();
    } catch (err) {
      console.error(err);
      notify.error(err.message || "Error while saving description");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddPhotos(e) {
    e.preventDefault();

    if (!newFiles.length) {
      notify.error("Please select photos to upload");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      newFiles.forEach((f) => fd.append("photos", f));

      const res = await fetch(
        `${API_BASE}/api/technician/reports/${report.id}/photos`,
        {
          method: "POST",
          headers: headersWithAuth(),
          body: fd,
        }
      );

      const body = await safeParseResponse(res);
      if (!res.ok) {
        throw new Error(
          (body && (body.error || body.message)) ||
            `${res.status} ${res.statusText}`
        );
      }

      setReport((prev) => ({
        ...prev,
        photos: [...(prev.photos || []), ...(body.photos || [])],
      }));
      setNewFiles([]);

      notify.success("Photos have been added");
      onUpdated?.();
    } catch (err) {
      console.error(err);
      notify.error(err.message || "Error while uploading photos");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePhoto(photoId) {
    if (!confirm("Delete this photo?")) return;

    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/technician/reports/photos/${photoId}`,
        {
          method: "DELETE",
          headers: headersWithAuth({ "Content-Type": "application/json" }),
        }
      );

      const body = await safeParseResponse(res);
      if (!res.ok) {
        throw new Error(
          (body && (body.error || body.message)) ||
            `${res.status} ${res.statusText}`
        );
      }

      setReport((prev) => ({
        ...prev,
        photos: (prev.photos || []).filter(
          (p) => String(p.id) !== String(photoId)
        ),
      }));

      notify.success("Photo has been deleted");
      onUpdated?.();
    } catch (err) {
      console.error(err);
      notify.error(err.message || "Error while deleting photo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center py-12 px-4 overflow-auto">
      {/* OVERLAY */}
      <div
        className="absolute inset-0 bg-overlay backdrop-blur-sm"
        onClick={onClose}
      />

      {/* MODAL */}
      <div className="relative w-full max-w-3xl">
        <div className="bg-modal rounded-2xl border border-borderSoft shadow-xl p-6">
          {/* HEADER */}
          <header className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-textPrimary">
                Report #{report.id}
              </h3>
              <div className="text-sm text-textSecondary">
                {report.job_external_number || `#${report.job_id}`} —{" "}
                {report.job_title}
              </div>
              <div className="text-xs text-textSecondary mt-1">
                Created at:{" "}
                {report.created_at
                  ? new Date(report.created_at).toLocaleString()
                  : "—"}
              </div>
            </div>

            <button
              onClick={() => {
                onUpdated?.();
                onClose();
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium
                         border border-borderMedium
                         text-primary hover:bg-accent/30 transition"
            >
              Close
            </button>
          </header>

          <div className="space-y-6">
            {/* DESCRIPTION */}
            <section>
              <h4 className="text-sm font-medium text-textPrimary mb-2">
                Description
              </h4>

              {!editing ? (
                <>
                  <div className="rounded-xl border border-borderSoft bg-section p-3 text-sm text-textPrimary whitespace-pre-wrap">
                    {report.description || "No description."}
                  </div>
                  <div className="mt-2">
                    <button
                      onClick={() => setEditing(true)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium
                                 border border-borderMedium
                                 text-primary hover:bg-accent/30 transition"
                    >
                      Edit description
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    rows={4}
                    className="ui-input w-full resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setEditing(false);
                        setDesc(report.description || "");
                      }}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium
                                 border border-borderMedium
                                 text-primary hover:bg-accent/30 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveDescription}
                      className="ui-btn-primary"
                    >
                      {loading ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* PHOTOS */}
            <section>
              <h4 className="text-sm font-medium text-textPrimary mb-2">
                Photos ({(report.photos || []).length})
              </h4>

              <div className="flex flex-wrap gap-4">
                {(report.photos || []).length === 0 && (
                  <div className="text-sm text-textSecondary">No photos.</div>
                )}

                {(report.photos || []).map((p) => (
                  <div key={p.id} className="w-40">
                    <a href={p.url} target="_blank" rel="noreferrer">
                      <img
                        src={p.url}
                        alt={p.original_name || "photo"}
                        className="w-40 h-28 object-cover rounded-xl
                                   border border-borderSoft hover:shadow-md transition"
                      />
                    </a>
                    <div className="flex items-center justify-between mt-1">
                      <div className="text-xs text-textSecondary truncate">
                        {p.original_name || "photo"}
                      </div>
                      <button
                        onClick={() => handleDeletePhoto(p.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ADD PHOTOS */}
              <form onSubmit={handleAddPhotos} className="mt-4 space-y-2">
                <label className="block text-sm font-medium text-textPrimary">
                  Add photos
                </label>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onNewFilesChange}
                  className="text-sm"
                />

                {newFiles.length > 0 && (
                  <div className="text-xs text-textSecondary">
                    Selected: {newFiles.map((f) => f.name).join(", ")}
                  </div>
                )}

                <div className="flex justify-end">
                  <button type="submit" className="ui-btn-primary">
                    {loading ? "Uploading…" : "Add photos"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
