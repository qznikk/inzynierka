// src/components/SidebarClient.jsx
import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

export default function SidebarClient({ user: userProp, avatar: avatarProp }) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fallbackAvatar = "/logo192.png"; // możesz podmienić
  const [avatarUrl, setAvatarUrl] = useState(avatarProp || fallbackAvatar);

  const menu = [
    { to: "/client", label: "Dashboard" },
    { to: "/client/orders", label: "Moje zamówienia" },
    { to: "/client/reports", label: "Moje zgłoszenia" },
    { to: "/client/payments", label: "Płatności / Faktury" },
    { to: "/client/profile", label: "Profil" },
  ];

  useEffect(() => {
    if (avatarProp) return;

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
      } catch (err) {
        console.error("SidebarClient fetch error:", err);
      }
    })();

    return () => (cancelled = true);
  }, [userProp, avatarProp, token]);

  return (
    <aside className="w-64 bg-white shadow-lg h-screen p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-8">
        <img
          src={avatarUrl}
          alt="Avatar"
          className="h-12 w-12 object-cover rounded-full"
          onError={(e) => (e.currentTarget.src = fallbackAvatar)}
        />
        <div>
          <h2 className="text-lg font-bold">Panel klienta</h2>
        </div>
      </div>

      <nav className="flex flex-col gap-4">
        {menu.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `p-3 rounded-lg text-sm font-medium ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
