// src/components/AdminSidebar.jsx
import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function AdminSidebar({ user: userProp, avatar: avatarProp }) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fallbackLogo = "/logo192.png";
  const [avatarUrl, setAvatarUrl] = useState(avatarProp || fallbackLogo);

  const nav = [
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/jobs", label: "Jobs" },
    { to: "/admin/calendar", label: "Calendar" },
    { to: "/admin/clients", label: "Clients" },
    { to: "/admin/technicians", label: "Technicians" },
    { to: "/admin/payments", label: "Payments" },
    { to: "/admin/reports", label: "Reports" },
    { to: "/admin/profile", label: "Profile" },
    { to: "/admin/settings", label: "Settings" },
  ];

  useEffect(() => {
    // jeśli avatar przekazany — nie fetchujemy
    if (avatarProp) return;

    // jeśli user z props ma avatar
    if (userProp?.avatar_url) {
      setAvatarUrl(`${API_BASE}${userProp.avatar_url}`);
      return;
    }

    if (!token) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;

        const body = await res.json();
        if (!cancelled && body?.user?.avatar_url) {
          setAvatarUrl(`${API_BASE}${body.user.avatar_url}`);
        }
      } catch (e) {
        console.error("AdminSidebar fetch error:", e);
      }
    })();

    return () => (cancelled = true);
  }, [userProp, avatarProp, token]);

  return (
    <aside className="w-64 bg-white border-r min-h-screen">
      <div className="p-4 flex items-center gap-3 border-b border-t">
        <img
          src={avatarUrl}
          className="h-10 w-10 object-cover rounded"
          alt="Avatar"
          onError={(e) => {
            e.currentTarget.src = fallbackLogo;
          }}
        />
        <div>
          <div className="font-semibold">Admin</div>
          <div className="text-xs text-gray-500">Panel</div>
        </div>
      </div>

      <nav className="p-4">
        <ul className="space-y-1">
          {nav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`
                }
                end={item.to === "/admin"}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
