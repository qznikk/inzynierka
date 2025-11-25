// src/components/TechnicianSidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";

export default function TechnicianSidebar() {
  const logoUrl = "/mnt/data/a71cb6ad-03f4-47af-a5a2-f47952ec5a4e.png"; // Twój przesłany plik
  const nav = [
    { to: "/technician", label: "Jobs" },
    { to: "/technician/jobshistory", label: "Jobs (history)" },
    { to: "/technician/new-report", label: "New Report" },
    { to: "/technician/reports", label: "Reports" },
    { to: "/technician/profile", label: "Profile" },
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
