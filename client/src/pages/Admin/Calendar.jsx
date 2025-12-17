// src/pages/Admin/AdminCalendar.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import JobDetailsModal from "../../components/JobDetailsModal";
import { useNotify } from "../../notifications/NotificationContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5050";

const STATUS_OPTIONS = [
  "WAITING",
  "TO_ASSIGN",
  "ASSIGNED",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
];

export default function AdminCalendar() {
  const notify = useNotify();
  const token = localStorage.getItem("token") || "";
  const authToken = useMemo(() => token, [token]);

  const [jobs, setJobs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const [technicians, setTechnicians] = useState([]);
  const [filters, setFilters] = useState({ status: "", technician_id: "" });

  const [jobDetailsId, setJobDetailsId] = useState(null);

  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickCreateDate, setQuickCreateDate] = useState("");
  const [quickForm, setQuickForm] = useState({
    client_id: "",
    title: "",
    description: "",
    technician_id: "",
    priority: 2,
  });
  const [creating, setCreating] = useState(false);

  function buildAuthHeaders(withJson = false) {
    const h = {};
    if (authToken) h.Authorization = `Bearer ${authToken}`;
    if (withJson) h["Content-Type"] = "application/json";
    return h;
  }

  function statusColor(status) {
    switch (status) {
      case "WAITING":
        return "var(--status-waiting)";
      case "TO_ASSIGN":
        return "var(--status-danger)";
      case "ASSIGNED":
        return "var(--status-info)";
      case "IN_PROGRESS":
        return "var(--status-success)";
      case "DONE":
      case "CANCELLED":
        return "var(--status-muted)";
      default:
        return "var(--brand-primary)";
    }
  }

  const fetchTechnicians = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/technicians`, {
        headers: buildAuthHeaders(),
      });
      if (!res.ok) throw new Error();
      const data = await res.json().catch(() => ({}));
      setTechnicians(data.technicians || data || []);
    } catch {
      notify.error("Failed to fetch technicians");
    }
  }, [authToken, notify]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.technician_id)
        params.set("technician_id", filters.technician_id);
      params.set("limit", 500);

      const res = await fetch(
        `${API_BASE}/api/admin/jobs?${params.toString()}`,
        { headers: buildAuthHeaders() }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch {
      notify.error("Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  }, [filters, authToken, notify]);

  useEffect(() => {
    if (!token) return;
    fetchTechnicians();
    fetchJobs();
  }, [token, fetchTechnicians, fetchJobs]);

  useEffect(() => {
    const evs = jobs.map((j) => {
      const date = j.scheduled_date || j.created_at || j.completed_at;
      const start = date
        ? new Date(date).toISOString()
        : new Date().toISOString();

      return {
        id: String(j.id),
        title: `${j.external_number || `#${j.id}`} — ${
          j.title || "(no title)"
        }`,
        start,
        allDay: true,
        extendedProps: j,
        backgroundColor: statusColor(j.status),
        borderColor: statusColor(j.status),
      };
    });
    setEvents(evs);
  }, [jobs]);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-textPrimary">Calendar</h1>

        <div className="flex items-center gap-3">
          <select
            className="ui-input"
            value={filters.technician_id}
            onChange={(e) =>
              setFilters((f) => ({ ...f, technician_id: e.target.value }))
            }
          >
            <option value="">All technicians</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.email})
              </option>
            ))}
          </select>

          <select
            className="ui-input"
            value={filters.status}
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: e.target.value }))
            }
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <button className="ui-btn-primary" onClick={() => fetchJobs()}>
            Apply
          </button>
        </div>
      </header>

      <section className="bg-section rounded-2xl border border-borderSoft p-4">
        {loading ? (
          <div className="text-textSecondary">Loading calendar…</div>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={events}
            eventClick={(e) => setJobDetailsId(Number(e.event.id))}
            dateClick={(e) => {
              setQuickCreateDate(e.dateStr);
              setShowQuickCreate(true);
              setQuickForm((f) => ({
                ...f,
                title: `Job ${e.dateStr}`,
              }));
            }}
            height={650}
            selectable
          />
        )}
      </section>

      {jobDetailsId && (
        <JobDetailsModal
          jobId={jobDetailsId}
          onClose={() => setJobDetailsId(null)}
          onUpdated={() => {
            fetchJobs();
            setJobDetailsId(null);
          }}
        />
      )}

      {showQuickCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-overlay"
            onClick={() => setShowQuickCreate(false)}
          />

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setCreating(true);
              try {
                await fetch(`${API_BASE}/api/admin/jobs`, {
                  method: "POST",
                  headers: buildAuthHeaders(true),
                  body: JSON.stringify({
                    ...quickForm,
                    client_id: Number(quickForm.client_id),
                    technician_id: quickForm.technician_id
                      ? Number(quickForm.technician_id)
                      : null,
                    priority: Number(quickForm.priority),
                    scheduled_date: quickCreateDate,
                  }),
                });
                await fetchJobs();
                setShowQuickCreate(false);
              } catch {
                notify.error("Failed to create job");
              } finally {
                setCreating(false);
              }
            }}
            className="relative bg-modal rounded-2xl border border-borderSoft p-6 w-full max-w-lg"
          >
            <h3 className="text-lg font-semibold text-textPrimary mb-4">
              Quick job — {quickCreateDate}
            </h3>

            <div className="grid gap-3 ">
              <input
                className="ui-input"
                placeholder="Client ID"
                value={quickForm.client_id}
                onChange={(e) =>
                  setQuickForm((f) => ({ ...f, client_id: e.target.value }))
                }
              />
              <input
                className="ui-input"
                placeholder="Title"
                value={quickForm.title}
                onChange={(e) =>
                  setQuickForm((f) => ({ ...f, title: e.target.value }))
                }
              />
              <textarea
                className="ui-input h-24"
                placeholder="Description"
                value={quickForm.description}
                onChange={(e) =>
                  setQuickForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowQuickCreate(false)}
                className="ui-btn-outline"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="ui-btn-primary"
              >
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
