// layout/LandingLayout.jsx
import Navbar from "../components/Navbar";
import { Outlet } from "react-router-dom";

export default function LandingLayout() {
  return (
    <div>
      <Navbar />
      <main className="pt-20">
        <Outlet />
      </main>
    </div>
  );
}
