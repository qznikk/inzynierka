import React, { useEffect, useState, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function AdminProfile() {
  const token = localStorage.getItem("token");
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    postal_code: "",
    country: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);

  const buildHeaders = (extra = {}) => {
    const h = { ...extra };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line
  }, []);

  async function fetchProfile() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/profile`, {
        headers: buildHeaders({ "Content-Type": "application/json" }),
      });
      const body = await res.json();
      if (!res.ok)
        throw new Error(body.error || body.message || `${res.status}`);
      setUser(body.user || null);
      setForm({
        name: body.user?.name || "",
        address: body.user?.address || "",
        city: body.user?.city || "",
        postal_code: body.user?.postal_code || "",
        country: body.user?.country || "",
        phone: body.user?.phone || "",
      });
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Błąd pobierania profilu technika");
    } finally {
      setLoading(false);
    }
  }

  const onChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  async function save() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/profile`, {
        method: "PUT",
        headers: buildHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok)
        throw new Error(body.error || body.message || `${res.status}`);
      setUser(body.user);
      setEditing(false);
      setMessage("Zapisano pomyślnie.");
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Błąd zapisu");
    } finally {
      setLoading(false);
    }
  }

  const triggerFile = () => fileInputRef.current?.click();

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxMB = 5;
    if (!file.type.startsWith("image/")) {
      setMessage("Plik musi być obrazem.");
      return;
    }
    if (file.size > maxMB * 1024 * 1024) {
      setMessage(`Plik za duży — max ${maxMB} MB.`);
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("avatar", file);

      const res = await fetch(`${API_BASE}/api/upload/avatar`, {
        method: "POST",
        headers: buildHeaders(), // don't set Content-Type for FormData
        body: fd,
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || data.message || `${res.status}`);

      setUser((u) => ({ ...u, avatar_url: data.avatar_url }));
      setMessage("Avatar załadowany.");
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Błąd uploadu");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading && !user) return <div>Ładowanie profilu technika…</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Profil technika</h1>
        <div>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-2 bg-indigo-600 text-white rounded"
            >
              Edytuj
            </button>
          ) : (
            <>
              <button
                onClick={save}
                disabled={loading}
                className="mr-2 px-3 py-2 bg-green-600 text-white rounded"
              >
                Zapisz
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setForm({
                    name: user?.name || "",
                    address: user?.address || "",
                    city: user?.city || "",
                    postal_code: user?.postal_code || "",
                    country: user?.country || "",
                    phone: user?.phone || "",
                  });
                  setMessage("");
                }}
                className="px-3 py-2 bg-gray-300 rounded"
              >
                Anuluj
              </button>
            </>
          )}
        </div>
      </header>

      {message && <div className="text-sm text-red-600">{message}</div>}

      <section className="bg-white p-4 rounded shadow space-y-4">
        <div className="flex items-center space-x-4">
          {/* avatar - klikalny tylko w trybie edycji */}
          {user?.avatar_url ? (
            <img
              src={`${API_BASE}${user.avatar_url}`}
              alt="avatar"
              className={`w-20 h-20 rounded-full object-cover ${
                editing ? "cursor-pointer ring-2 ring-indigo-200" : ""
              }`}
              onClick={() => {
                if (editing) triggerFile();
              }}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = ""; // fallback left as empty so "brak" shows
              }}
            />
          ) : (
            <div
              className={`w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 ${
                editing ? "cursor-pointer ring-2 ring-indigo-200" : ""
              }`}
              onClick={() => {
                if (editing) triggerFile();
              }}
            >
              brak
            </div>
          )}

          <div className="flex flex-col">
            {/* przycisk widoczny tylko w edycji */}
            {editing && (
              <div className="flex items-center gap-2">
                <button
                  onClick={triggerFile}
                  className="px-3 py-1 border rounded text-sm bg-white"
                >
                  Wybierz zdjęcie
                </button>
                <span className="text-sm text-gray-500">
                  {user?.avatar_url ? "Avatar załadowany" : "Brak avatara"}
                </span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />

            <div className="mt-2">
              <div className="text-sm text-gray-500">Rola</div>
              <div className="font-medium">{user?.role || "—"}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-gray-600">Imię / nazwa</label>
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              disabled={!editing}
              className="mt-1 w-full border rounded px-2 py-2"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600">Telefon</label>
            <input
              name="phone"
              value={form.phone}
              onChange={onChange}
              disabled={!editing}
              className="mt-1 w-full border rounded px-2 py-2"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-600">Adres</label>
            <input
              name="address"
              value={form.address}
              onChange={onChange}
              disabled={!editing}
              className="mt-1 w-full border rounded px-2 py-2"
              placeholder="ulica i numer"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600">Miasto</label>
            <input
              name="city"
              value={form.city}
              onChange={onChange}
              disabled={!editing}
              className="mt-1 w-full border rounded px-2 py-2"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600">Kod pocztowy</label>
            <input
              name="postal_code"
              value={form.postal_code}
              onChange={onChange}
              disabled={!editing}
              className="mt-1 w-full border rounded px-2 py-2"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600">Kraj</label>
            <input
              name="country"
              value={form.country}
              onChange={onChange}
              disabled={!editing}
              className="mt-1 w-full border rounded px-2 py-2"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
