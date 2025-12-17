import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";
const FALLBACK_AVATAR = "/avatars/default-technician.png";

export default function TechnicianSidebar({
  user: userProp,
  avatar: avatarProp,
}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [avatarUrl, setAvatarUrl] = useState(avatarProp || FALLBACK_AVATAR);

  const nav = [
    { to: "/technician", label: "Dashboard" },
    { to: "/technician/jobs", label: "Jobs" },
    { to: "/technician/jobshistory", label: "Jobs (history)" },
    { to: "/technician/reports", label: "Reports" },
    { to: "/technician/profile", label: "Profile" },
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
      } catch (err) {
        console.error("TechnicianSidebar avatar fetch error:", err);
        setAvatarUrl(FALLBACK_AVATAR);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [avatarProp, userProp, token]);

  return (
    <aside className="w-64 min-h-screen bg-navbar border-r border-borderSoft flex flex-col">
      {/* HEADER */}
      <div className="p-4 flex items-center gap-3 border-b border-borderSoft">
        <img
          src={avatarUrl}
          alt="Avatar"
          className="h-10 w-10 rounded-xl object-cover border border-borderSoft"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_AVATAR;
          }}
        />

        <div className="leading-tight">
          <div className="font-semibold text-textPrimary">Technician</div>
          <div className="text-xs text-textSecondary">Technician Panel</div>
        </div>
      </div>

      {/* NAV */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {nav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/technician"}
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
