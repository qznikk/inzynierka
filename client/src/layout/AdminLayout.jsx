// layout/AdminLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";

export default function AdminLayout() {
  return (
    <div className="min-h-screen flex bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 p-6">
        <Outlet />
      </div>
    </div>
  );
}
