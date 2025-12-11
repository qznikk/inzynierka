// src/layout/TechnicianLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import TechnicianSidebar from "../components/TechnicianSidebar";
import Navbar from "../components/Navbar";

export default function TechnicianLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />
      <div className="flex flex-1">
        <TechnicianSidebar />
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
