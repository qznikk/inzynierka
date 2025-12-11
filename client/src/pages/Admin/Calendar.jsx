// src/pages/Admin/AdminCalendar.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import FullCalendar from "@fullcalendar/react"; // npm: @fullcalendar/react
import dayGridPlugin from "@fullcalendar/daygrid"; // npm: @fullcalendar/daygrid
import timeGridPlugin from "@fullcalendar/timegrid"; // npm: @fullcalendar/timegrid
import interactionPlugin from "@fullcalendar/interaction"; // npm: @fullcalendar/interaction
import JobDetailsModal from "../../components/JobDetailsModal"; // adjust path if needed

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
  // stable primitive token — useMemo not strictly necessary but explicit
  const token = localStorage.getItem("token") || "";
  const authToken = useMemo(() => token, [token]);

  const [jobs, setJobs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [technicians, setTechnicians] = useState([]);
  const [filters, setFilters] = useState({ status: "", technician_id: "" });

  // selected job for details
  const [jobDetailsId, setJobDetailsId] = useState(null);

  // quick create modal state
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

  // --- helpers ---
  function buildAuthHeaders(withJson = false) {
    const h = {};
    if (authToken) h["Authorization"] = `Bearer ${authToken}`;
    if (withJson) h["Content-Type"] = "application/json";
    return h;
  }

  function statusColor(status) {
    switch (status) {
      case "WAITING":
        return "#f59e0b"; // amber
      case "TO_ASSIGN":
        return "#ef4444"; // red
      case "ASSIGNED":
        return "#3b82f6"; // blue
      case "IN_PROGRESS":
        return "#10b981"; // green
      case "DONE":
        return "#6b7280"; // gray
      case "CANCELLED":
        return "#9ca3af"; // light gray
      default:
        return "#3b82f6";
    }
  }

  // --- data fetching (stable callbacks) ---
  const fetchTechnicians = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/technicians`, {
        headers: buildAuthHeaders(false),
      });
      if (!res.ok) throw new Error("Failed to fetch technicians");
      const data = await res.json().catch(() => ({}));
      setTechnicians(data.technicians || data || []);
    } catch (err) {
      console.error("fetchTechnicians error:", err);
      setMessage("Nie udało się pobrać techników");
    }
  }, [authToken]); // depends only on primitive authToken

  // fetchJobs depends only on filters.status, filters.technician_id and authToken (all primitives)
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.technician_id)
        params.set("technician_id", filters.technician_id);
      // get many events for calendar
      params.set("limit", 500);

      const res = await fetch(
        `${API_BASE}/api/admin/jobs?${params.toString()}`,
        {
          headers: buildAuthHeaders(false),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to fetch jobs");
      }
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err) {
      console.error("fetchJobs error:", err);
      setMessage(err.message || "Błąd przy pobieraniu zleceń");
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.technician_id, authToken]);

  // initial load & when dependencies change
  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // map jobs -> fullcalendar events (only depends on jobs)
  useEffect(() => {
    const evs = (jobs || []).map((j) => {
      const date = j.scheduled_date || j.created_at || j.completed_at;
      // If date is not parseable, fallback to today
      const start = date
        ? new Date(date).toISOString()
        : new Date().toISOString();
      return {
        id: String(j.id),
        title: `${j.external_number || `#${j.id}`} — ${
          j.title || "(brak tytułu)"
        }`,
        start,
        allDay: true,
        extendedProps: {
          status: j.status,
          tech_name: j.tech_name,
          client_name: j.client_name,
          raw: j,
        },
        backgroundColor: statusColor(j.status),
        borderColor: statusColor(j.status),
      };
    });
    setEvents(evs);
  }, [jobs]);

  // --- handlers ---
  function handleEventClick(clickInfo) {
    const id = clickInfo.event.id;
    setJobDetailsId(Number(id));
  }

  function handleDateClick(selectInfo) {
    setQuickCreateDate(selectInfo.dateStr);
    setShowQuickCreate(true);
    setQuickForm((f) => ({ ...f, title: `Zlecenie ${selectInfo.dateStr}` }));
  }

  async function handleQuickCreate(e) {
    e.preventDefault();
    setMessage("");
    if (!quickForm.client_id || !quickForm.title) {
      setMessage("Wypełnij client_id i tytuł");
      return;
    }
    setCreating(true);
    try {
      const body = {
        client_id: Number(quickForm.client_id),
        technician_id: quickForm.technician_id
          ? Number(quickForm.technician_id)
          : null,
        title: quickForm.title,
        description: quickForm.description || "",
        scheduled_date: quickCreateDate,
        priority: Number(quickForm.priority || 2),
      };

      const res = await fetch(`${API_BASE}/api/admin/jobs`, {
        method: "POST",
        headers: buildAuthHeaders(true),
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create job");

      // refresh
      await fetchJobs();
      setShowQuickCreate(false);
      // reset quick form
      setQuickForm({
        client_id: "",
        title: "",
        description: "",
        technician_id: "",
        priority: 2,
      });
    } catch (err) {
      console.error("handleQuickCreate error:", err);
      setMessage(err.message || "Błąd podczas tworzenia zlecenia");
    } finally {
      setCreating(false);
    }
  }

  // pagination/filter UI helpers
  const applyFilter = () => {
    // updating filters triggers fetchJobs via dependency
    setFilters((f) => ({ ...f }));
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Kalendarz zleceń</h1>

        <div className="flex items-center gap-3">
          <select
            value={filters.technician_id}
            onChange={(e) =>
              setFilters((f) => ({ ...f, technician_id: e.target.value }))
            }
            className="px-3 py-2 border rounded"
          >
            <option value="">Wszyscy technicy</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.email})
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: e.target.value }))
            }
            className="px-3 py-2 border rounded"
          >
            <option value="">Wszystkie statusy</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <button
            onClick={applyFilter}
            className="px-3 py-2 bg-indigo-600 text-white rounded"
          >
            Filtruj
          </button>
        </div>
      </header>

      <section className="bg-white rounded shadow p-4">
        {message && <div className="text-sm text-red-600 mb-2">{message}</div>}
        {loading ? (
          <div>Ładowanie kalendarza...</div>
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
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            height={650}
            selectable={true}
          />
        )}
      </section>

      {/* Job details modal */}
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

      {/* Quick create modal */}
      {showQuickCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowQuickCreate(false)}
          />
          <form
            onSubmit={handleQuickCreate}
            className="relative bg-white rounded shadow-lg w-full max-w-lg p-4"
          >
            <h3 className="text-lg font-semibold mb-2">
              Szybkie dodanie zlecenia — {quickCreateDate}
            </h3>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm mb-1">
                  Client ID <span className="text-red-500">*</span>
                </label>
                <input
                  value={quickForm.client_id}
                  onChange={(e) =>
                    setQuickForm((f) => ({ ...f, client_id: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">
                  Tytuł <span className="text-red-500">*</span>
                </label>
                <input
                  value={quickForm.title}
                  onChange={(e) =>
                    setQuickForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Opis</label>
                <textarea
                  value={quickForm.description}
                  onChange={(e) =>
                    setQuickForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded h-24"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">
                  Technik (opcjonalny)
                </label>
                <select
                  value={quickForm.technician_id}
                  onChange={(e) =>
                    setQuickForm((f) => ({
                      ...f,
                      technician_id: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="">-- brak --</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Priorytet</label>
                <select
                  value={quickForm.priority}
                  onChange={(e) =>
                    setQuickForm((f) => ({ ...f, priority: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value={1}>Wysoki</option>
                  <option value={2}>Normalny</option>
                  <option value={3}>Niski</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowQuickCreate(false)}
                className="px-3 py-2 border rounded"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-3 py-2 bg-emerald-600 text-white rounded"
              >
                {creating ? "Tworzenie..." : "Utwórz"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
