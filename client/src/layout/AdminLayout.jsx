// layout/AdminLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import AdminSidebar from "../components/AdminSidebar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function AdminLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-section">
      <Navbar />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 p-6 overflow-y-auto bg-section">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
}
