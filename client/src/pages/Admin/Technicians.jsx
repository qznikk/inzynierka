// pages/Admin/Technicians.jsx
import React, { useEffect, useState } from "react";

function randomPassword(length = 12) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+[]";
  let out = "";
  for (let i = 0; i < length; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function Technicians() {
  const API = import.meta.env.VITE_API_URL || "http://localhost:5050";
  const token = localStorage.getItem("token");

  const [techs, setTechs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "" });
  const [genPassword, setGenPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchTechs();
  }, []);

  async function fetchTechs() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/technicians`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch technicians");
      const data = await res.json();
      setTechs(data.technicians || data);
    } catch (err) {
      console.error(err);
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleGenerate() {
    const pw = randomPassword(12);
    setGenPassword(pw);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    if (!form.name || !form.email || !genPassword) {
      setMessage("Uzupełnij pola i wygeneruj hasło.");
      return;
    }
    try {
      const res = await fetch(`${API}/api/admin/create-technician`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: genPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Nie udało się dodać technika");
      // show created password to admin and refresh list
      setMessage(`Technik dodany. Hasło: ${genPassword}`);
      setForm({ name: "", email: "" });
      setGenPassword("");
      fetchTechs();
    } catch (err) {
      console.error(err);
      setMessage(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Technicians</h1>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-medium mb-3">Add new technician</h2>
          {message && (
            <div className="text-sm mb-3 text-red-600">{message}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              required
              placeholder="Imię i nazwisko"
              className="w-full px-3 py-2 border rounded"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              required
              placeholder="Email"
              type="email"
              className="w-full px-3 py-2 border rounded"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />

            <div className="flex gap-2 items-center">
              <input
                readOnly
                value={genPassword}
                placeholder="Wygenerowane hasło"
                className="flex-1 px-3 py-2 border rounded bg-gray-50"
              />
              <button
                type="button"
                onClick={handleGenerate}
                className="px-3 py-2 bg-indigo-600 text-white rounded"
              >
                Generate
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm({ name: "", email: "" });
                  setGenPassword("");
                  setMessage("");
                }}
                className="px-4 py-2 border rounded"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="font-medium mb-3">Existing technicians</h2>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <ul className="space-y-2">
              {techs.length === 0 && (
                <li className="text-sm text-gray-500">No technicians</li>
              )}
              {techs.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between border-b py-2"
                >
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.email}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
