import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, RefreshCw, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

import { bodyTextClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useAcademicSessionsApi } from "@/hooks/useAcademicSessionsApi";
import { useAcademicYearsApi } from "@/hooks/useAcademicYearsApi";
import { useCalendarApi } from "@/hooks/useCalendarApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const VIEW_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "termly", label: "Termly" },
  { value: "yearly", label: "Yearly" },
];

function getMonthDays(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days = [];
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return { first, last, days };
}

function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(str) {
  if (!str) return null;
  const [y, mo, d] = str.split("-").map(Number);
  return new Date(y, mo - 1, d);
}

export function CalendarPage() {
  const calendarApi = useCalendarApi();
  const sessionsApi = useAcademicSessionsApi();
  const yearsApi = useAcademicYearsApi();

  const [sessions, setSessions] = useState([]);
  const [years, setYears] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedYearId, setSelectedYearId] = useState("");
  const [calendar, setCalendar] = useState(null);
  const [yearCalendar, setYearCalendar] = useState(null);
  const [eventTypes, setEventTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [viewMode, setViewMode] = useState("monthly");
  const [navDate, setNavDate] = useState(() => new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [quickDate, setQuickDate] = useState("");
  const [formData, setFormData] = useState({
    event_type_id: "",
    title: "",
    description: "",
    start_date: "",
    end_date: "",
  });

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const [sessRes, typesRes, yearsRes] = await Promise.all([
          sessionsApi.list({ per_page: 50 }),
          calendarApi.eventTypes(),
          yearsApi.list({ per_page: 50 }),
        ]);
        if (!mounted) return;
        setSessions(sessRes.data ?? []);
        setEventTypes(typesRes.data ?? []);
        setYears(yearsRes.data ?? []);
        const yr = yearsRes.data?.[0];
        if (yr) {
          setSelectedYearId(yr.id);
        } else if (sessRes.data?.length) {
          setSelectedSessionId(sessRes.data[0].id);
        }
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load initial data."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  // Fetch session calendar
  useEffect(() => {
    if (!selectedSessionId || viewMode === "yearly") return;
    let mounted = true;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const cal = await calendarApi.get(selectedSessionId);
        if (mounted) {
          setCalendar(cal);
          const s = cal.session;
          if (s?.start_date) setNavDate(parseLocalDate(s.start_date));
        }
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load calendar."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [selectedSessionId, viewMode]);

  // Fetch year calendar
  useEffect(() => {
    if (!selectedYearId || viewMode !== "yearly") return;
    let mounted = true;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const cal = await calendarApi.yearCalendar(selectedYearId);
        if (mounted) {
          setYearCalendar(cal);
          const y = cal.year;
          if (y?.start_date) setNavDate(parseLocalDate(y.start_date));
        }
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load year calendar."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [selectedYearId, viewMode]);

  // When year changes, select the first session in that year
  const filteredSessions = useMemo(() => {
    if (!selectedYearId) return sessions;
    return sessions.filter((s) => s.academic_year_id === selectedYearId);
  }, [sessions, selectedYearId]);

  useEffect(() => {
    if (!selectedYearId) return;
    const currentInYear = filteredSessions.find((s) => s.id === selectedSessionId);
    if (!currentInYear && filteredSessions.length > 0) {
      setSelectedSessionId(filteredSessions[0].id);
    }
  }, [selectedYearId, filteredSessions, selectedSessionId]);

  const refreshCalendar = useCallback(async () => {
    if (!selectedSessionId) return;
    setIsLoading(true);
    setError("");
    try {
      if (viewMode === "yearly" && selectedYearId) {
        const cal = await calendarApi.yearCalendar(selectedYearId);
        setYearCalendar(cal);
      } else {
        const cal = await calendarApi.get(selectedSessionId);
        setCalendar(cal);
      }
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load calendar."));
    } finally {
      setIsLoading(false);
    }
  }, [selectedSessionId, selectedYearId, viewMode, calendarApi]);

  // Determine which data to use based on view mode
  const activeData = viewMode === "yearly" ? yearCalendar : calendar;
  const sessionObj = activeData?.session ?? null;
  const yearObj = activeData?.year ?? null;
  const events = activeData?.events ?? [];

  let rangeStart = null;
  let rangeEnd = null;
  if (viewMode === "yearly" && yearObj) {
    rangeStart = parseLocalDate(yearObj.start_date);
    rangeEnd = parseLocalDate(yearObj.end_date);
  } else if (sessionObj) {
    rangeStart = parseLocalDate(sessionObj.start_date);
    rangeEnd = parseLocalDate(sessionObj.end_date);
  }

  const dateEventMap = useMemo(() => {
    const map = {};
    for (const e of events) {
      const start = parseLocalDate(e.start_date);
      const end = parseLocalDate(e.end_date);
      if (!start || !end) continue;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = dateStr(d);
        if (!map[key]) map[key] = [];
        map[key].push(e);
      }
    }
    return map;
  }, [events]);

  function isWeekend(d) {
    const wd = d.getDay();
    return wd === 0 || wd === 6;
  }

  function isInSession(d) {
    if (!rangeStart || !rangeEnd) return true;
    return d >= rangeStart && d <= rangeEnd;
  }

  function isToday(d) {
    const t = new Date();
    return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
  }

  function getTypeColor(typeCode) {
    const t = eventTypes.find((et) => et.code === typeCode);
    return t?.color ?? "#3b82f6";
  }

  function getTypeLabel(typeCode) {
    const t = eventTypes.find((et) => et.code === typeCode);
    return t?.label ?? typeCode;
  }

  // Generate the month range based on view mode
  const monthRange = useMemo(() => {
    if (!rangeStart || !rangeEnd) {
      if (viewMode === "monthly") {
        const now = new Date();
        return [{ year: now.getFullYear(), month: now.getMonth() }];
      }
      return [];
    }
    const months = [];
    const start = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    const end = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);
    for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
      months.push({ year: d.getFullYear(), month: d.getMonth() });
    }
    return months;
  }, [rangeStart, rangeEnd, viewMode]);

  const activeMonthIndex = useMemo(() => {
    if (viewMode !== "monthly") return -1;
    return monthRange.findIndex(
      (m) => m.year === navDate.getFullYear() && m.month === navDate.getMonth(),
    );
  }, [viewMode, monthRange, navDate]);

  const currentMonthData = useMemo(() => {
    if (viewMode !== "monthly") return null;
    const { first, last, days } = getMonthDays(navDate.getFullYear(), navDate.getMonth());
    const padStart = (first.getDay() + 6) % 7;
    const padEnd = (7 - ((padStart + days.length) % 7)) % 7;
    return { first, last, days, padStart, padEnd };
  }, [viewMode, navDate]);

  // CRUD handlers

  async function handleGenerate() {
    if (!selectedSessionId) return;
    setIsLoading(true);
    setError("");
    try {
      await calendarApi.generate(selectedSessionId);
      toast.success("Calendar generated.");
      await refreshCalendar();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Generation failed."));
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateForm(date) {
    setEditingEvent(null);
    const d = date ?? new Date().toISOString().slice(0, 10);
    setQuickDate(d);
    setFormData({
      event_type_id: eventTypes[0]?.id ?? "",
      title: "",
      description: "",
      start_date: d,
      end_date: d,
    });
    setShowForm(true);
  }

  function openEdit(event) {
    setEditingEvent(event);
    setFormData({
      event_type_id: event.event_type?.id ?? "",
      title: event.title,
      description: event.description ?? "",
      start_date: event.start_date,
      end_date: event.end_date,
    });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedSessionId) return;
    setIsLoading(true);
    try {
      if (editingEvent) {
        await calendarApi.updateEvent(selectedSessionId, editingEvent.id, formData);
        toast.success("Event updated.");
      } else {
        await calendarApi.createEvent(selectedSessionId, formData);
        toast.success("Event created.");
      }
      setShowForm(false);
      setEditingEvent(null);
      await refreshCalendar();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Failed to save event."));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(eventId) {
    if (!selectedSessionId) return;
    if (!window.confirm("Delete this event?")) return;
    setIsLoading(true);
    try {
      await calendarApi.deleteEvent(selectedSessionId, eventId);
      toast.success("Event deleted.");
      setSelectedDayEvents(null);
      await refreshCalendar();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Failed to delete event."));
    } finally {
      setIsLoading(false);
    }
  }

  // Render a month grid (used by all views)
  function renderMonthGrid(monthYear, compact = false) {
    const { first, last, days, padStart, padEnd } = getMonthDays(monthYear.year, monthYear.month);
    const cellH = compact ? "min-h-[36px]" : "min-h-[100px]";
    const cellPad = compact ? "p-0.5" : "p-1.5";
    const dateSize = compact ? "h-5 w-5 text-[10px]" : "h-6 w-6 text-[12px]";

    return (
      <div key={`${monthYear.year}-${monthYear.month}`} className={compact ? "min-w-[220px]" : ""}>
        {/* Month header */}
        <div className="mb-1 text-center text-[13px] font-semibold text-slate-700">
          {new Date(monthYear.year, monthYear.month).toLocaleDateString("en-KE", { month: "long", year: "numeric" })}
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7">
          {DAY_LABELS.map((label) => (
            <div
              key={label}
              className="border-b border-slate-200 px-1 py-1 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-500"
            >
              {compact ? label[0] : label}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {Array.from({ length: padStart }).map((_, i) => (
            <div key={`ps-${i}`} className={`${cellH} border-b border-r border-slate-100 bg-slate-50/50`} />
          ))}
          {days.map((d) => {
            const key = dateStr(d);
            const dayEvts = dateEventMap[key] ?? [];
            const inSess = isInSession(d);
            const weekend = isWeekend(d);
            const today = isToday(d);

            return (
              <button
                type="button"
                key={key}
                onClick={() => {
                  const evts = dateEventMap[key] ?? [];
                  setSelectedDayEvents({ date: key, events: evts, numDate: d.getDate() });
                }}
                className={`group relative ${cellH} ${cellPad} border-b border-r border-slate-100 text-left align-top transition-colors hover:bg-blue-50/40 ${
                  !inSess ? "bg-slate-50/70" : weekend ? "bg-slate-50" : "bg-white"
                }`}
              >
                <span
                  className={`inline-flex items-center justify-center rounded-full ${dateSize} font-medium ${
                    today ? "bg-blue-600 text-white" : weekend ? "text-slate-400" : "text-slate-700"
                  } ${!inSess ? "opacity-40" : ""}`}
                >
                  {d.getDate()}
                </span>
                {inSess && dayEvts.length > 0 && (
                  <div className={compact ? "mt-0.5 flex flex-wrap gap-0.5" : "mt-0.5 space-y-0.5"}>
                    {compact
                      ? dayEvts.slice(0, 4).map((evt) => (
                          <span
                            key={evt.id}
                            className="inline-block h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: getTypeColor(evt.event_type?.code) }}
                          />
                        ))
                      : dayEvts.slice(0, 3).map((evt) => {
                          const color = getTypeColor(evt.event_type?.code);
                          return (
                            <div
                              key={evt.id}
                              className="truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight"
                              style={{ backgroundColor: color + "20", color: color }}
                              title={evt.title}
                            >
                              {evt.title}
                            </div>
                          );
                        })}
                    {dayEvts.length > (compact ? 4 : 3) && (
                      <div className="text-[10px] font-medium text-slate-400">
                        +{dayEvts.length - (compact ? 4 : 3)}
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
          {Array.from({ length: padEnd }).map((_, i) => (
            <div key={`pe-${i}`} className={`${cellH} border-b border-r border-slate-100 bg-slate-50/50`} />
          ))}
        </div>
      </div>
    );
  }

  // Loading / error
  if (isLoading && !activeData) {
    return <div className={bodyTextClassName}>Loading calendar...</div>;
  }
  if (error && !activeData) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">
          School Calendar
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-[13px]"
          >
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-[13px]"
          >
            {filteredSessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <FormButton type="button" variant="secondary" size="sm" onClick={handleGenerate} disabled={isLoading}>
            <RefreshCw className="size-3.5" /> Generate
          </FormButton>
          <FormButton type="button" size="sm" onClick={() => openCreateForm(null)} disabled={isLoading}>
            <Plus className="size-3.5" /> Add Event
          </FormButton>
        </div>
      </div>

      {/* View Toggle + Range Info */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-0.5">
          {VIEW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setViewMode(opt.value)}
              className={`rounded-md px-3 py-1 text-[12px] font-medium transition ${
                viewMode === opt.value
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {viewMode === "yearly" && yearObj && (
          <p className="text-[13px] text-slate-500">
            {yearObj.name} &middot; {yearObj.start_date} &ndash; {yearObj.end_date}
          </p>
        )}
        {viewMode !== "yearly" && sessionObj && (
          <p className="text-[13px] text-slate-500">
            {sessionObj.name} &middot; {sessionObj.start_date} &ndash; {sessionObj.end_date}
          </p>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3">
        {eventTypes
          .filter((t) => t.code !== "weekend")
          .map((t) => (
            <span key={t.id} className="inline-flex items-center gap-1.5 text-[12px] text-slate-600">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
              {t.label}
            </span>
          ))}
        <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-600">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-300" />
          Weekend
        </span>
      </div>

      {/* MONTHLY VIEW */}
      {viewMode === "monthly" && currentMonthData && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setNavDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="min-w-[160px] text-center text-[15px] font-semibold text-slate-800">
                {navDate.toLocaleDateString("en-KE", { month: "long", year: "numeric" })}
              </span>
              <button
                type="button"
                onClick={() => setNavDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <FormButton type="button" variant="secondary" size="sm" onClick={() => setNavDate(new Date())}>
              Today
            </FormButton>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {renderMonthGrid({ year: navDate.getFullYear(), month: navDate.getMonth() }, false)}
            </div>
          </div>
        </>
      )}

      {/* TERMLY / YEARLY VIEW */}
      {(viewMode === "termly" || viewMode === "yearly") && (
        <div className="space-y-6">
          {monthRange.length === 0 && (
            <p className="py-8 text-center text-[13px] text-slate-400">
              No date range available for this period.
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-4">
            {monthRange.map((m) => renderMonthGrid(m, true))}
          </div>
        </div>
      )}

      {/* Day Events Popover */}
      {selectedDayEvents && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="fixed inset-0 bg-black/30" onClick={() => setSelectedDayEvents(null)} />
          <div className="relative z-10 w-full max-w-md rounded-t-xl bg-white p-5 shadow-xl sm:rounded-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-slate-900">
                {selectedDayEvents.numDate}{" "}
                {navDate.toLocaleDateString("en-KE", { month: "long", year: "numeric" })}
              </h3>
              <div className="flex items-center gap-1">
                <FormButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    openCreateForm(selectedDayEvents.date);
                    setSelectedDayEvents(null);
                  }}
                >
                  <Plus className="size-3.5" /> Add
                </FormButton>
                <button
                  type="button"
                  onClick={() => setSelectedDayEvents(null)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {selectedDayEvents.events.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-slate-400">No events on this day.</p>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.events.map((evt) => {
                  const color = getTypeColor(evt.event_type?.code);
                  const isSystem = evt.source === "system_api" || evt.source === "system_computed";
                  return (
                    <div
                      key={evt.id}
                      className="rounded-lg border border-slate-200 px-3 py-2.5"
                      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-slate-800">{evt.title}</p>
                          <p className="text-[11px] text-slate-500">{getTypeLabel(evt.event_type?.code)}</p>
                          {evt.start_date !== evt.end_date && (
                            <p className="text-[11px] text-slate-400">
                              {evt.start_date} &ndash; {evt.end_date}
                            </p>
                          )}
                          {evt.description && (
                            <p className="mt-0.5 text-[12px] text-slate-500">{evt.description}</p>
                          )}
                        </div>
                        {!isSystem && (
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(evt)}
                              className="rounded px-1.5 py-0.5 text-[11px] text-blue-600 hover:bg-blue-50"
                            >
                              edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(evt.id)}
                              className="rounded px-1.5 py-0.5 text-[11px] text-red-500 hover:bg-red-50"
                            >
                              delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Event Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="fixed inset-0 bg-black/30" onClick={() => { setShowForm(false); setEditingEvent(null); }} />
          <div className="relative z-10 w-full max-w-lg rounded-t-xl bg-white p-5 shadow-xl sm:rounded-xl">
            <h2 className="mb-4 text-[15px] font-semibold text-slate-900">
              {editingEvent ? "Edit Event" : "New Event"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">Type</label>
                  <select
                    value={formData.event_type_id}
                    onChange={(e) => setFormData({ ...formData, event_type_id: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-[13px]"
                    required
                  >
                    {eventTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">Title</label>
                  <input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-[13px]"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-[13px]"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-[13px]"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-[13px]"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <FormButton type="submit" size="sm" disabled={isLoading}>
                  {editingEvent ? "Update" : "Create"}
                </FormButton>
                <FormButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => { setShowForm(false); setEditingEvent(null); }}
                >
                  Cancel
                </FormButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
