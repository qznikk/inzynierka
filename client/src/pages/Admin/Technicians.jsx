import React, { useEffect, useState } from "react";
import TechnicianDetails from "../../components/TechnicianDetails";
import { useNotify } from "../../notifications/NotificationContext";

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
  const notify = useNotify();

  const [techs, setTechs] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({ name: "", email: "" });
  const [genPassword, setGenPassword] = useState("");

  const [selectedTech, setSelectedTech] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetchTechs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function fetchTechs() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/technicians`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch technicians");
      }
      const data = await res.json();
      setTechs(data.technicians || data || []);
    } catch (err) {
      console.error(err);
      notify.error(err.message || "Error loading technicians");
    } finally {
      setLoading(false);
    }
  }

  function handleGenerate() {
    setGenPassword(randomPassword(12));
  }

  function validateForm() {
    if (!form.name || form.name.trim().length < 3) {
      notify.error("Name must contain at least 3 characters");
      return false;
    }

    if (!form.email) {
      notify.error("Email is required");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(form.email)) {
      notify.error("Please enter a valid email address");
      return false;
    }

    if (!genPassword) {
      notify.error("Please generate a password");
      return false;
    }

    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!validateForm()) return;

    if (!form.name || !form.email || !genPassword) {
      notify.error("Please fill in all fields and generate a password.");
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
      if (!res.ok) throw new Error(data.error || "Failed to add technician");

      notify.success(
        `Technician created.\nTemporary password:\n${genPassword}`
      );

      setForm({ name: "", email: "" });
      setGenPassword("");
      fetchTechs();
    } catch (err) {
      console.error(err);
      notify.error(err.message || "Error creating technician");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-textPrimary">Technicians</h1>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ADD TECHNICIAN */}
        <div className="bg-section p-6 rounded-2xl border border-borderSoft">
          <h2 className="font-medium mb-4 text-textPrimary">
            Add new technician
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              required
              placeholder="Full name"
              className="ui-input w-full"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              required
              placeholder="Email"
              type="email"
              className="ui-input w-full"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
            />

            <div className="flex gap-2 items-center">
              <input
                readOnly
                value={genPassword}
                placeholder="Generated password"
                className="ui-input flex-1 bg-section/50"
              />
              <button
                type="button"
                onClick={handleGenerate}
                className="ui-btn-outline"
              >
                Generate
              </button>
            </div>

            <div className="flex gap-2">
              <button type="submit" className="ui-btn-primary">
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm({ name: "", email: "" });
                  setGenPassword("");
                }}
                className="ui-btn-outline"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* LIST */}
        <div className="bg-section p-6 rounded-2xl border border-borderSoft">
          <h2 className="font-medium mb-4 text-textPrimary">
            Existing technicians
          </h2>

          {loading ? (
            <div className="text-textSecondary">Loading…</div>
          ) : (
            <ul className="space-y-2">
              {techs.length === 0 && (
                <li className="text-sm text-textSecondary">No technicians</li>
              )}
              {techs.map((t) => (
                <li
                  key={t.id ?? t._id ?? t.email}
                  className="flex items-center justify-between py-2 border-b border-borderSoft"
                >
                  <div>
                    <div className="font-medium text-textPrimary">
                      {t.name || "—"}
                    </div>
                    <div className="text-xs text-textSecondary">{t.email}</div>
                  </div>

                  <button
                    onClick={() => setSelectedTech(t)}
                    className="ui-btn-primary text-sm"
                  >
                    Details
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {selectedTech && (
        <TechnicianDetails
          tech={selectedTech}
          onClose={() => setSelectedTech(null)}
        />
      )}
    </div>
  );
}
