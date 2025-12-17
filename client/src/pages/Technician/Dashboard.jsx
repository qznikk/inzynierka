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
} from "recharts";
import { useNotify } from "../../notifications/NotificationContext";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

const STATUS_COLORS = {
  WAITING: "var(--status-waiting)",
  TO_ASSIGN: "var(--status-danger)",
  ASSIGNED: "var(--status-info)",
  IN_PROGRESS: "var(--status-success)",
  DONE: "var(--status-muted)",
  CANCELLED: "var(--status-muted)",
};

export default function TechnicianDashboard() {
  const token = localStorage.getItem("token");
  const notify = useNotify();

  const [jobs, setJobs] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token]);

  async function loadData() {
    setLoading(true);
    try {
      const [jobsRes, reportsRes] = await Promise.all([
        fetch(`${API_BASE}/api/technician/jobs`, { headers }),
        fetch(`${API_BASE}/api/technician/reports`, { headers }),
      ]);

      if (!jobsRes.ok || !reportsRes.ok) throw new Error();

      const jobsData = await jobsRes.json();
      const reportsData = await reportsRes.json();

      setJobs(jobsData.jobs || jobsData || []);
      setReports(reportsData.reports || []);
    } catch {
      notify.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  /* ===================== KPIs ===================== */
  const activeJobs = jobs.filter((j) => j.status !== "DONE").length;
  const inProgressJobs = jobs.filter((j) => j.status === "IN_PROGRESS").length;
  const completedJobs = jobs.filter((j) => j.status === "DONE").length;
  const reportsCount = reports.length;

  /* ===================== CHART DATA ===================== */
  const jobsByStatus = useMemo(() => {
    const map = {};
    jobs.forEach((j) => {
      map[j.status] = (map[j.status] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [jobs]);

  const completedOverTime = useMemo(() => {
    const map = {};
    jobs
      .filter((j) => j.status === "DONE")
      .forEach((j) => {
        const d = new Date(
          j.updated_at || j.completed_at || j.created_at
        ).toLocaleDateString();
        map[d] = (map[d] || 0) + 1;
      });

    return Object.entries(map)
      .slice(-14)
      .map(([date, count]) => ({ date, count }));
  }, [jobs]);

  const todayJobs = useMemo(() => {
    const today = new Date().toDateString();
    return jobs
      .filter(
        (j) =>
          j.status !== "DONE" &&
          new Date(j.scheduled_date || j.created_at).toDateString() === today
      )
      .slice(0, 5);
  }, [jobs]);

  /* ===================== RENDER ===================== */
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-textPrimary">Dashboard</h1>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Kpi title="Active jobs" value={activeJobs} />
        <Kpi title="In progress" value={inProgressJobs} />
        <Kpi title="Completed jobs" value={completedJobs} />
        <Kpi title="Reports created" value={reportsCount} />
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Jobs by status">
          <ResponsiveContainer width="100%" height={260}>
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

        <ChartCard title="Completed jobs (last days)">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={completedOverTime}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="count"
                stroke="var(--status-success)"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* TODAY JOBS */}
      <div className="bg-section p-4 rounded-2xl border border-borderSoft">
        <h3 className="font-medium mb-3 text-textPrimary">
          Today / upcoming jobs
        </h3>

        {todayJobs.length === 0 ? (
          <div className="text-sm text-textSecondary">
            No jobs scheduled for today 🎉
          </div>
        ) : (
          <ul className="space-y-2">
            {todayJobs.map((j) => (
              <li
                key={j.id}
                className="flex justify-between items-center py-2 border-b border-borderSoft"
              >
                <div>
                  <div className="font-medium text-textPrimary">
                    {j.external_number || `#${j.id}`} — {j.title}
                  </div>
                  <div className="text-xs text-textSecondary">
                    {j.client_name || j.client_email}
                  </div>
                </div>

                <Link to="/technician/jobs" className="ui-btn-outline text-sm">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {loading && (
        <div className="text-sm text-textSecondary">Loading dashboard…</div>
      )}
    </div>
  );
}

/* ===================== UI HELPERS ===================== */

function Kpi({ title, value }) {
  return (
    <div className="bg-section p-4 rounded-2xl border border-borderSoft">
      <div className="text-sm text-textSecondary">{title}</div>
      <div className="text-2xl font-semibold mt-1 text-textPrimary">
        {value}
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-section p-4 rounded-2xl border border-borderSoft">
      <h3 className="font-medium mb-2 text-textPrimary">{title}</h3>
      {children}
    </div>
  );
}
