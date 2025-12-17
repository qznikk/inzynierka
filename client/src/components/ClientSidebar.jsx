import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";
const FALLBACK_AVATAR = "/avatars/default-client.png";

export default function SidebarClient({ user: userProp, avatar: avatarProp }) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [avatarUrl, setAvatarUrl] = useState(avatarProp || FALLBACK_AVATAR);

  const nav = [
    { to: "/client", label: "Dashboard" },
    { to: "/client/orders", label: "My Orders" },
    { to: "/client/reports", label: "My Reports" },
    { to: "/client/payments", label: "Payments / Invoices" },
    { to: "/client/profile", label: "Profile" },
  ];

  useEffect(() => {
    if (avatarProp) {
      setAvatarUrl(avatarProp);
      return;
    }

    if (userProp?.avatar_url) {
      setAvatarUrl(`${API_BASE}${userProp.avatar_url}`);
      return;
    }

    if (!token) {
      setAvatarUrl(FALLBACK_AVATAR);
      return;
    }

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
        console.error("SidebarClient avatar fetch error:", e);
        setAvatarUrl(FALLBACK_AVATAR);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userProp, avatarProp, token]);

  return (
    <aside className="w-64 min-h-screen bg-navbar border-r border-borderSoft flex flex-col">
      {/* HEADER */}
      <div className="px-4 py-5 flex items-center gap-3 border-b border-borderSoft">
        <img
          src={avatarUrl}
          alt="Avatar"
          className="h-11 w-11 rounded-xl object-cover border border-borderSoft"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_AVATAR;
          }}
        />

        <div className="leading-tight">
          <div className="font-semibold text-textPrimary">Client</div>
          <div className="text-xs text-textSecondary">Client Panel</div>
        </div>
      </div>

      {/* NAV */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {nav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/client"}
                className={({ isActive }) =>
                  [
                    "block px-3 py-2 rounded-xl text-sm font-medium transition-all",
                    isActive
                      ? "bg-accent text-primary shadow-sm"
                      : "text-textPrimary hover:bg-accent/30",
                  ].join(" ")
                }
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
