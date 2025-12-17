import React, { useEffect, useState, useRef } from "react";
import { useNotify } from "../../notifications/NotificationContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";
const FALLBACK_AVATAR = "/avatars/default-admin.png";

export default function AdminProfile() {
  const token = localStorage.getItem("token");
  const notify = useNotify();

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
  const fileInputRef = useRef(null);

  const buildHeaders = (extra = {}) => {
    const h = { ...extra };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  };

  useEffect(() => {
    if (!token) return;
    fetchProfile();
  }, [token]);

  async function fetchProfile() {
    setLoading(true);
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
      notify.error(err.message || "Error loading profile");
    } finally {
      setLoading(false);
    }
  }

  const onChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  async function save() {
    setLoading(true);
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
      notify.success("Profile saved successfully");
    } catch (err) {
      console.error(err);
      notify.error(err.message || "Error saving profile");
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
      notify.error("File must be an image");
      return;
    }
    if (file.size > maxMB * 1024 * 1024) {
      notify.error(`File too large — max ${maxMB} MB`);
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);

      const res = await fetch(`${API_BASE}/api/upload/avatar`, {
        method: "POST",
        headers: buildHeaders(),
        body: fd,
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || data.message || `${res.status}`);

      setUser((u) => ({ ...u, avatar_url: data.avatar_url }));
      notify.success("Avatar uploaded successfully");
    } catch (err) {
      console.error(err);
      notify.error(err.message || "Avatar upload error");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading && !user)
    return <div className="text-textSecondary">Loading profile…</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-textPrimary">
          Admin profile
        </h1>

        {!editing ? (
          <button onClick={() => setEditing(true)} className="ui-btn-primary">
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={loading}
              className="ui-btn-primary"
            >
              Save
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
              }}
              className="ui-btn-outline"
            >
              Cancel
            </button>
          </div>
        )}
      </header>

      <section className="bg-section p-6 rounded-2xl border border-borderSoft space-y-6">
        {/* AVATAR */}
        <div className="flex items-center gap-4">
          <img
            src={
              user?.avatar_url
                ? `${API_BASE}${user.avatar_url}`
                : FALLBACK_AVATAR
            }
            alt="avatar"
            className={`w-20 h-20 rounded-full object-cover border border-borderSoft ${
              editing ? "cursor-pointer" : ""
            }`}
            style={
              editing ? { boxShadow: "0 0 0 2px var(--focus-ring)" } : undefined
            }
            onClick={() => editing && triggerFile()}
            onError={(e) => {
              e.currentTarget.src = FALLBACK_AVATAR;
            }}
          />

          <div className="flex flex-col gap-2">
            {editing && (
              <div className="flex items-center gap-2">
                <button
                  onClick={triggerFile}
                  className="ui-btn-outline text-sm"
                >
                  Choose image
                </button>
                <span className="text-sm text-textSecondary">
                  {user?.avatar_url ? "Avatar uploaded" : "Default avatar"}
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

            <div>
              <div className="text-xs text-textSecondary">Role</div>
              <div className="font-medium text-textPrimary">
                {user?.role || "—"}
              </div>
            </div>
          </div>
        </div>

        {/* FORM */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            ["name", "Name"],
            ["phone", "Phone"],
            ["address", "Address", true],
            ["city", "City"],
            ["postal_code", "Postal code"],
            ["country", "Country"],
          ].map(([key, label, full]) => (
            <div key={key} className={full ? "sm:col-span-2" : ""}>
              <label className="block text-xs text-textSecondary">
                {label}
              </label>
              <input
                name={key}
                value={form[key]}
                onChange={onChange}
                disabled={!editing}
                className="ui-input mt-1 w-full disabled:opacity-60"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
