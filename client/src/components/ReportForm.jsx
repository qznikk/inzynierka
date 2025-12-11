// src/components/ReportForm.jsx
import React, { useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function ReportForm({ jobId, onAdded }) {
  const token = localStorage.getItem("token");

  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  function handleFiles(e) {
    setFiles(Array.from(e.target.files));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");

    if (!jobId) {
      setMsg("Brak ID zlecenia.");
      return;
    }

    if (!description && files.length === 0) {
      setMsg("Dodaj opis lub zdjęcia.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("description", description);
      files.forEach((file) => formData.append("photos", file)); // multer expects field name 'photos'

      const res = await fetch(
        `${API_BASE}/api/technician/jobs/${jobId}/reports`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            // multipart/form-data -> NIE ustawiamy Content-Type ręcznie
          },
          body: formData,
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data.error || "Błąd podczas dodawania raportu.");

      // zwracamy raport do rodzica (np. dodanie do listy)
      if (typeof onAdded === "function") onAdded(data.report);

      // komunikat + reset pól
      setMsg("Raport dodany.");
      setDescription("");
      setFiles([]);
    } catch (err) {
      console.error("Błąd raportu:", err);
      setMsg(err.message || "Błąd wysyłania raportu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {msg && <div className="mb-2 text-sm text-gray-700">{msg}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Opis */}
        <div>
          <label className="block text-sm mb-1">Opis wykonanej pracy</label>
          <textarea
            className="w-full px-3 py-2 border rounded h-24"
            placeholder="Co zostało wykonane? Co wymieniono?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Zdjęcia */}
        <div>
          <label className="block text-sm mb-1">Zdjęcia (opcjonalnie)</label>
          <input type="file" accept="image/*" multiple onChange={handleFiles} />
          {files.length > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              Wybrano {files.length} plików
            </div>
          )}
        </div>

        {/* Przyciski */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
          >
            {loading ? "Wysyłanie..." : "Dodaj raport"}
          </button>

          <button
            type="button"
            onClick={() => {
              setDescription("");
              setFiles([]);
            }}
            className="px-4 py-2 border rounded"
          >
            Wyczyść
          </button>
        </div>
      </form>
    </div>
  );
}
