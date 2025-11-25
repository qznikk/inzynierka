import { Outlet } from "react-router-dom";

export default function ClientLayout() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-4">Panel klienta</h1>
      <Outlet />
    </div>
  );
}
