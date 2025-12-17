import React, { useEffect, useState, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
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

export default function ClientDashboard() {
  const token = localStorage.getItem("token");
  const notify = useNotify();

  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [reportsCount, setReportsCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token]);

  /* ===================== DATA LOADING ===================== */
  async function loadData() {
    setLoading(true);
    try {
      const [jobsRes, invRes] = await Promise.all([
        fetch(`${API_BASE}/api/client/jobs`, { headers }),
        fetch(`${API_BASE}/api/invoices/client`, { headers }),
      ]);

      if (!jobsRes.ok || !invRes.ok) throw new Error();

      const jobsData = await jobsRes.json();
      const invData = await invRes.json();

      const jobsList = jobsData.jobs || [];

      setJobs(jobsList);
      setInvoices(invData.invoices || []);

      await countReports(jobsList);
    } catch {
      notify.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  /* ===================== REPORTS COUNT ===================== */
  async function countReports(jobsList) {
    try {
      const results = await Promise.all(
        jobsList.map((j) =>
          fetch(`${API_BASE}/api/client/jobs/${j.id}/reports`, { headers })
            .then((r) => (r.ok ? r.json() : { reports: [] }))
            .catch(() => ({ reports: [] }))
        )
      );

      const total = results.reduce(
        (sum, r) => sum + (r.reports?.length || 0),
        0
      );

      setReportsCount(total);
    } catch {
      setReportsCount(0);
    }
  }

  /* ===================== KPIs ===================== */
  const activeJobs = jobs.filter(
    (j) => j.status !== "DONE" && j.status !== "CANCELLED"
  ).length;

  const completedJobs = jobs.filter((j) => j.status === "DONE").length;

  const unpaidInvoices = invoices.filter(
    (i) => i.status === "PENDING_CONFIRMATION"
  ).length;

  /* ===================== CHART DATA ===================== */
  const jobsByStatus = useMemo(() => {
    const map = {};
    jobs.forEach((j) => {
      map[j.status] = (map[j.status] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [jobs]);

  const latestJobs = jobs.slice(0, 5);

  /* ===================== RENDER ===================== */
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-textPrimary">Dashboard</h1>
        <Link to="/client/orders" className="ui-btn-primary">
          + New job
        </Link>
      </header>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Kpi title="Active jobs" value={activeJobs} />
        <Kpi title="Completed jobs" value={completedJobs} />
        <Kpi title="Reports received" value={reportsCount} />
        <Kpi title="Unpaid invoices" value={unpaidInvoices} />
      </div>

      {/* CHART + LATEST JOBS */}
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

        <div className="bg-section p-4 rounded-2xl border border-borderSoft">
          <h3 className="font-medium mb-3 text-textPrimary">Latest jobs</h3>

          {latestJobs.length === 0 ? (
            <div className="text-sm text-textSecondary">No jobs yet</div>
          ) : (
            <ul className="space-y-2">
              {latestJobs.map((j) => (
                <li
                  key={j.id}
                  className="flex justify-between items-center py-2 border-b border-borderSoft"
                >
                  <div>
                    <div className="font-medium text-textPrimary">
                      {j.external_number || `#${j.id}`} — {j.title}
                    </div>
                    <div className="text-xs text-textSecondary">
                      Status: {j.status}
                    </div>
                  </div>

                  <Link to="/client/reports" className="ui-btn-outline text-sm">
                    Details
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* INVOICES ALERT */}
      {unpaidInvoices > 0 && (
        <div
          className="rounded-2xl border border-borderSoft p-4"
          style={{
            background:
              "color-mix(in srgb, var(--status-waiting) 15%, transparent)",
          }}
        >
          <div className="font-medium text-textPrimary">
            💳 You have {unpaidInvoices} invoice(s) awaiting confirmation
          </div>
          <Link
            to="/client/payments"
            className="inline-block mt-2 text-sm underline text-textPrimary"
          >
            Go to payments
          </Link>
        </div>
      )}

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
