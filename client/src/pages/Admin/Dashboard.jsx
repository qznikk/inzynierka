// src/pages/Admin/AdminDashboard.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useNotify } from "../../notifications/NotificationContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

/* ===================== STATUS COLORS ===================== */
const STATUS_COLORS = {
  WAITING: "var(--status-waiting)",
  TO_ASSIGN: "var(--status-danger)",
  ASSIGNED: "var(--status-info)",
  IN_PROGRESS: "var(--status-success)",
  DONE: "var(--status-muted)",
  CANCELLED: "var(--status-muted)",
};

export default function AdminDashboard() {
  const token = localStorage.getItem("token");
  const notify = useNotify();

  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token]);

  async function loadData() {
    setLoading(true);
    try {
      const [jobsRes, invRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/jobs?limit=500`, { headers }),
        fetch(`${API_BASE}/api/admin/invoices`, { headers }),
      ]);

      if (!jobsRes.ok || !invRes.ok) throw new Error();

      const jobsData = await jobsRes.json();
      const invData = await invRes.json();

      setJobs(jobsData.jobs || []);
      setInvoices(invData.invoices || []);
    } catch {
      notify.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  /* ===================== KPIs ===================== */

  const totalJobs = jobs.length;

  const activeJobs = jobs.filter((j) =>
    ["ASSIGNED", "IN_PROGRESS"].includes(j.status)
  ).length;

  const pendingInvoices = invoices.filter(
    (i) => i.status === "PENDING_CONFIRMATION"
  ).length;

  const revenueThisMonth = useMemo(() => {
    const now = new Date();
    return invoices
      .filter(
        (i) =>
          i.status === "PAID" &&
          new Date(i.issued_at).getMonth() === now.getMonth()
      )
      .reduce((sum, i) => sum + Number(i.amount || 0), 0);
  }, [invoices]);

  /* ===================== CHART DATA ===================== */

  const jobsByStatus = useMemo(() => {
    const map = {};
    jobs.forEach((j) => {
      map[j.status] = (map[j.status] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [jobs]);

  const jobsLastDays = useMemo(() => {
    const days = {};
    jobs.forEach((j) => {
      const d = new Date(j.created_at).toLocaleDateString();
      days[d] = (days[d] || 0) + 1;
    });
    return Object.entries(days)
      .slice(-14)
      .map(([date, count]) => ({ date, count }));
  }, [jobs]);

  const jobsPerTechnician = useMemo(() => {
    const map = {};
    jobs.forEach((j) => {
      if (!j.tech_name) return;
      map[j.tech_name] = (map[j.tech_name] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({
      name,
      count,
    }));
  }, [jobs]);

  /* ===================== RENDER ===================== */

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-textPrimary">Dashboard</h1>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Kpi title="Total jobs" value={totalJobs} />
        <Kpi title="Active jobs" value={activeJobs} />
        <Kpi title="Pending invoices" value={pendingInvoices} />
        <Kpi
          title="Revenue (month)"
          value={`${revenueThisMonth.toFixed(2)} PLN`}
        />
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Jobs by status */}
        <ChartCard title="Jobs by status">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={jobsByStatus} dataKey="value" label>
                {jobsByStatus.map((e) => (
                  <Cell
                    key={e.name}
                    fill={STATUS_COLORS[e.name] || "var(--border-medium)"}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Jobs over time */}
        <ChartCard title="Jobs (last days)">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={jobsLastDays}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="var(--brand-primary)"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Technicians */}
        <ChartCard title="Jobs per technician">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={jobsPerTechnician}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="var(--brand-accent)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {loading && (
        <div className="text-sm text-textSecondary">Loading dashboard…</div>
      )}
    </div>
  );
}

/* ===================== COMPONENTS ===================== */

function Kpi({ title, value }) {
  return (
    <div className="bg-section rounded-2xl border border-borderSoft p-4">
      <div className="text-xs text-textSecondary">{title}</div>
      <div className="text-2xl font-semibold text-textPrimary mt-1">
        {value}
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-section rounded-2xl border border-borderSoft p-4">
      <h3 className="text-sm font-medium text-textPrimary mb-3">{title}</h3>
      {children}
    </div>
  );
}
