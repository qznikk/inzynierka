// src/layout/TechnicianLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import TechnicianSidebar from "../components/TechnicianSidebar";

export default function TechnicianLayout() {
  return (
    <div className="min-h-screen flex bg-gray-100">
      <TechnicianSidebar />
      <div className="flex-1 p-6">
        <Outlet />
      </div>
    </div>
  );
}
