import { createBrowserRouter, RouterProvider } from "react-router-dom";

// Layouty
import LandingLayout from "../layout/LandingLayout";
import ClientLayout from "../layout/ClientLayout";
import TechnicianLayout from "../layout/TechnicianLayout";
import AdminLayout from "../layout/AdminLayout";

// Strony klienta
import ClientDashboard from "../pages/Client/Dashboard";
import Orders from "../pages/Client/Orders";
import Reports from "../pages/Client/Reports";
import Payments from "../pages/Client/Payments";
import ClientProfile from "../pages/Client/Profile";

// Strony technika
import TechnicianJobs from "../pages/Technician/Jobs";
import TechnicianJobsHistory from "../pages/Technician/JobsHistory";
import TechnicianReports from "../pages/Technician/Reports";
import NewReport from "../pages/Technician/NewReport";
import TechnicianProfile from "../pages/Technician/Profile";

// Strony admina
import AdminDashboard from "../pages/Admin/Dashboard";
import AdminJobs from "../pages/Admin/Jobs";
import AdminClients from "../pages/Admin/Clients";
import AdminTechnicians from "../pages/Admin/Technicians";
import AdminPayments from "../pages/Admin/Payments";
import AdminReports from "../pages/Admin/Reports";
import Settings from "../pages/Admin/Settings";
import AdminProfile from "../pages/Admin/Profile";
import AdminCalendar from "../pages/Admin/Calendar";

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingLayout />,
    children: [
      {
        index: true,
        element: <div className="p-10 text-2xl">Landing Page</div>,
      },
    ],
  },
  // PANEL KLIENTA
  {
    path: "/client",
    element: <ClientLayout />,
    children: [
      { index: true, element: <ClientDashboard /> },
      { path: "orders", element: <Orders /> },
      { path: "reports", element: <Reports /> },
      { path: "payments", element: <Payments /> },
      { path: "profile", element: <ClientProfile /> },
    ],
  },

  // PANEL TECHNIKA
  {
    path: "/technician",
    element: <TechnicianLayout />,
    children: [
      { index: true, element: <TechnicianJobs /> },
      { path: "jobs", element: <TechnicianJobs /> },
      { path: "jobshistory", element: <TechnicianJobsHistory /> },
      { path: "reports", element: <TechnicianReports /> },
      { path: "new-report", element: <NewReport /> },
      { path: "profile", element: <TechnicianProfile /> },
    ],
  },

  // PANEL ADMINA
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: "jobs", element: <AdminJobs /> },
      { path: "clients", element: <AdminClients /> },
      { path: "technicians", element: <AdminTechnicians /> },
      { path: "payments", element: <AdminPayments /> },
      { path: "reports", element: <AdminReports /> },
      { path: "settings", element: <Settings /> },
      { path: "profile", element: <AdminProfile /> },
      { path: "calendar", element: <AdminCalendar /> },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
