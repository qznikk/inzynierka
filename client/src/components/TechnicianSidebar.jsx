// src/components/TechnicianSidebar.jsx
import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function TechnicianSidebar({
  user: userProp,
  avatar: avatarProp,
}) {
  const [avatarUrl, setAvatarUrl] = useState(
    avatarProp || "/mnt/data/a71cb6ad-03f4-47af-a5a2-f47952ec5a4e.png"
  );
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const nav = [
    { to: "/technician", label: "Jobs" },
    { to: "/technician/jobshistory", label: "Jobs (history)" },
    { to: "/technician/new-report", label: "New Report" },
    { to: "/technician/reports", label: "Reports" },
    { to: "/technician/profile", label: "Profile" },
  ];

  useEffect(() => {
    // jeśli avatar został przekazany przez props — nie fetchujemy
    if (avatarProp) return;

    // jeśli użytkownik przekazany jako prop ma avatar — użyjemy go
    if (userProp?.avatar_url) {
      setAvatarUrl(`${API_BASE}${userProp.avatar_url}`);
      return;
    }

    // jeśli nie mamy tokena — zostań domyślnym logiem
    if (!token) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/profile`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          // nie wypisujemy błędów do UI sidebara — tylko fallback do loga
          return;
        }
        const body = await res.json();
        const avatar = body?.user?.avatar_url;
        if (!cancelled && avatar) {
          setAvatarUrl(`${API_BASE}${avatar}`);
        }
      } catch (err) {
        // silent fallback
        console.error("Sidebar: błąd pobierania profilu:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [API_BASE, avatarProp, userProp, token]);

  return (
    <aside className="w-64 bg-white border-r min-h-screen">
      <div className="p-4 flex items-center gap-3 border-b border-t">
        <img
          src={avatarUrl}
          alt="Avatar / Logo"
          onError={(e) => {
            // fallback gdy URL avatar nie działa
            e.currentTarget.onerror = null;
            e.currentTarget.src =
              "/mnt/data/a71cb6ad-03f4-47af-a5a2-f47952ec5a4e.png";
          }}
          className="h-10 w-10 object-cover rounded"
        />
        <div>
          <div className="font-semibold">Technician</div>
          <div className="text-xs text-gray-500">Panel</div>
        </div>
      </div>

      <nav className="p-4">
        <ul className="space-y-1">
          {nav.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                className={({ isActive }) =>
                  "block px-3 py-2 rounded-md " +
                  (isActive
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-gray-700 hover:bg-gray-50")
                }
                end={n.to === "/technician"}
              >
                {n.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
