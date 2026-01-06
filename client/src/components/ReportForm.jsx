import React, { useState } from "react";
import { useNotify } from "../notifications/NotificationContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function ReportForm({ jobId, onAdded }) {
  const notify = useNotify();
  const token = localStorage.getItem("token");

  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  function handleFiles(e) {
    setFiles(Array.from(e.target.files || []));
  }

  /* ===================== VALIDATION ===================== */
  function validateForm() {
    if (!jobId) {
      notify.error("Missing job ID");
      return false;
    }

    if (!description.trim() && files.length === 0) {
      notify.error("Please add a description or photos");
      return false;
    }

    if (description.trim() && description.trim().length < 25) {
      notify.error("Description must be at least 25 characters long");
      return false;
    }

    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const trimmedDescription = description.trim();

    if (!jobId) {
      notify.error("Missing job ID");
      return;
    }

    if (!trimmedDescription && files.length === 0) {
      notify.error("Please add a description or at least one photo");
      return;
    }

    if (trimmedDescription && trimmedDescription.length < 25) {
      notify.error("Description must be at least 25 characters long");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      if (trimmedDescription) {
        formData.append("description", trimmedDescription);
      }

      files.forEach((file) => formData.append("photos", file));

      const res = await fetch(
        `${API_BASE}/api/technician/jobs/${jobId}/reports`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Error while adding report");
      }

      notify.success("Report has been added");

      setDescription("");
      setFiles([]);
    } catch (err) {
      notify.error(err.message || "Error while submitting report");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* DESCRIPTION */}
      <div>
        <label className="block text-sm font-medium text-textPrimary mb-1">
          Work description
        </label>
        <textarea
          className="ui-input w-full h-28 resize-none"
          placeholder="What was done? What was replaced or repaired?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* PHOTOS */}
      <div>
        <label className="block text-sm font-medium text-textPrimary mb-1">
          Photos (optional)
        </label>

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          className="text-sm"
        />

        {files.length > 0 && (
          <div className="mt-1 text-xs text-textSecondary">
            Selected {files.length} file{files.length > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* ACTIONS */}
      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="ui-btn-primary">
          {loading ? "Submitting…" : "Add report"}
        </button>

        <button
          type="button"
          onClick={() => {
            setDescription("");
            setFiles([]);
          }}
          className="px-4 py-2 rounded-lg text-sm font-medium
                     border border-borderMedium
                     text-primary hover:bg-accent/30 transition"
        >
          Clear
        </button>
      </div>
    </form>
  );
}
