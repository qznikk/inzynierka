import { NavLink } from "react-router-dom";

export default function SidebarClient() {
  const menu = [
    { to: "/client", label: "Dashboard" },
    { to: "/client/orders", label: "My orders" },
    { to: "/client/reports", label: "My reports" },
    { to: "/client/payments", label: "Payments / Invoices" },
    { to: "/client/profile", label: "Profile" },
  ];

  return (
    <aside className="w-64 min-h-screen bg-navbar border-r border-borderSoft flex flex-col">
      {/* HEADER */}
      <div className="px-4 py-6 border-b border-borderSoft">
        <h2 className="text-lg font-semibold text-textPrimary">Client panel</h2>
        <div className="text-xs text-textSecondary mt-0.5">
          Client dashboard
        </div>
      </div>

      {/* NAV */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {menu.map((item) => (
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

      {/* FOOTER */}
      <div className="px-4 py-4 border-t border-borderSoft text-xs text-textSecondary">
        HVACapp © {new Date().getFullYear()}
      </div>
    </aside>
  );
}
