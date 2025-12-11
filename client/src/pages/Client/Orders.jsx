// src/pages/Client/NewJob.jsx
import React, { useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function ClientOrders() {
  const token = localStorage.getItem("token");

  const [form, setForm] = useState({
    title: "",
    description: "",
    address: "",
    scheduled_date: "",
    priority: 2,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    if (!form.title || !form.description) {
      setMessage("Wypełnij wymagane pola: tytuł i opis.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/client/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data.error || "Nie udało się dodać zlecenia");

      setMessage(
        "Zlecenie utworzone. Numer: " + (data.external_number || data.id || "")
      );
      setForm({
        title: "",
        description: "",
        address: "",
        scheduled_date: "",
        priority: 2,
      });
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Błąd przy tworzeniu zlecenia");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl bg-white p-6 rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Nowe zlecenie</h2>

      {message && <div className="mb-4 text-sm text-gray-700">{message}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">
            Tytuł <span className="text-red-500">*</span>
          </label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded"
            placeholder="Krótki tytuł problemu"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">
            Opis <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border rounded h-28"
            placeholder="Opisz problem i ewentualne szczegóły kontaktowe"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Adres</label>
          <input
            name="address"
            value={form.address}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded"
            placeholder="Miasto, ul. ...  numer mieszkania/numer lokalu"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Preferowana data</label>
            <input
              name="scheduled_date"
              value={form.scheduled_date}
              onChange={handleChange}
              type="date"
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Priorytet</label>
            <select
              name="priority"
              value={form.priority}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
            >
              <option value={1}>Wysoki</option>
              <option value={2}>Normalny</option>
              <option value={3}>Niski</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-60"
          >
            {loading ? "Wysyłanie..." : "Wyślij zlecenie"}
          </button>
          <button
            type="button"
            onClick={() =>
              setForm({
                title: "",
                description: "",
                address: "",
                scheduled_date: "",
                priority: 2,
              })
            }
            className="px-4 py-2 border rounded"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}
