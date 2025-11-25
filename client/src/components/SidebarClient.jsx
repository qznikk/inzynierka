import { NavLink } from "react-router-dom";

export default function SidebarClient() {
  const menu = [
    { to: "/client", label: "Dashboard" },
    { to: "/client/orders", label: "Moje zamówienia" },
    { to: "/client/reports", label: "Moje zgłoszenia" },
    { to: "/client/payments", label: "Płatności / Faktury" },
    { to: "/client/profile", label: "Profil" },
  ];

  return (
    <aside className="w-64 bg-white shadow-lg h-screen p-6 flex flex-col">
      <h2 className="text-xl font-bold mb-8">Panel klienta</h2>

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
