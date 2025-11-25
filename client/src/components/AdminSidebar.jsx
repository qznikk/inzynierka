// src/components/AdminSidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";

export default function AdminSidebar() {
  const logoUrl = "/logo192.png"; // lub dostosuj do swojego logo
  const nav = [
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/jobs", label: "Jobs" },
    { to: "/admin/clients", label: "Clients" },
    { to: "/admin/technicians", label: "Technicians" },
    { to: "/admin/payments", label: "Payments" },
    { to: "/admin/reports", label: "Reports" },
    { to: "/admin/settings", label: "Settings" },
  ];

  return (
    <aside className="w-64 bg-white border-r min-h-screen">
      <div className="p-4 flex items-center gap-3 border-b">
        <img
          src={logoUrl}
          alt="Logo"
          className="h-10 w-10 object-cover rounded"
        />
        <div>
          <div className="font-semibold">Admin</div>
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
                end={n.to === "/admin"}
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
