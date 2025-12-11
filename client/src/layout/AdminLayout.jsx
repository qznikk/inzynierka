// layout/AdminLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import Navbar from "../components/Navbar";

export default function AdminLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* NAVBAR NA GÓRZE */}
      <Navbar />

      {/* GŁÓWNY OBSZAR: SIDEBAR + CONTENT */}
      <div className="flex flex-1">
        {/* SIDEBAR LEWA STRONA */}
        <AdminSidebar />

        {/* TREŚĆ STRONY */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
