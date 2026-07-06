import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Plus, RefreshCw, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";

import { bodyTextClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useAcademicSessionsApi } from "@/hooks/useAcademicSessionsApi";
import { useAcademicYearsApi } from "@/hooks/useAcademicYearsApi";
import { useCalendarApi } from "@/hooks/useCalendarApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const HARDCODED_EVENT_TYPES = [
  { code: "exams",          label: "Exams",          color: "#8b5cf6" },
  { code: "graduation",     label: "Graduation",     color: "#f59e0b" },
  { code: "fee_collection", label: "Fee Collection", color: "#10b981" },
  { code: "session_break",  label: "Session Break",  color: "#6366f1" },
  { code: "holiday",        label: "Public Holiday", color: "#ef4444" },
  { code: "others",         label: "Others",         color: "#3b82f6" },
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [codeToId, setCodeToId] = useState({});

  const [viewScope, setViewScope] = useState("calendar");
  const [navDate, setNavDate] = useState(() => new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);

  const [downloading, setDownloading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [quickDate, setQuickDate] = useState("");
  const [dateWarnings, setDateWarnings] = useState([]);
  const [formData, setFormData] = useState({
    event_type_id: "",
    title: "",
    description: "",
    start_date: "",
    end_date: "",
  });

  // Load initial data
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
          setYears(yearsRes.data ?? []);
          const map = {};
          for (const t of (typesRes.data ?? [])) {
            map[t.code] = t.id;
          }
          setCodeToId(map);
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

  // Fetch session calendar (calendar view + session events view)
  useEffect(() => {
    if (!selectedSessionId || viewScope === "year") return;
    let mounted = true;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const cal = await calendarApi.get(selectedSessionId);
        if (mounted) {
          setCalendar(cal);
          if (viewScope === "calendar" && cal.session?.start_date) {
            setNavDate(parseLocalDate(cal.session.start_date));
          }
        }
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load calendar."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [selectedSessionId, viewScope]);

  // Fetch year calendar (year events view)
  useEffect(() => {
    if (!selectedYearId || viewScope !== "year") return;
    let mounted = true;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const cal = await calendarApi.yearCalendar(selectedYearId);
        if (mounted) {
          setYearCalendar(cal);
        }
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load year calendar."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [selectedYearId, viewScope]);

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
    if (viewScope === "year" && selectedYearId) {
      setIsLoading(true);
      setError("");
      try {
        const cal = await calendarApi.yearCalendar(selectedYearId);
        setYearCalendar(cal);
      } catch (e) {
        setError(getApiErrorMessage(e, "Failed to load calendar."));
      } finally {
        setIsLoading(false);
      }
    } else if (selectedSessionId) {
      setIsLoading(true);
      setError("");
      try {
        const cal = await calendarApi.get(selectedSessionId);
        setCalendar(cal);
      } catch (e) {
        setError(getApiErrorMessage(e, "Failed to load calendar."));
      } finally {
        setIsLoading(false);
      }
    }
  }, [selectedSessionId, selectedYearId, viewScope, calendarApi]);

  const activeData = viewScope === "year" ? yearCalendar : calendar;
  const sessionObj = activeData?.session ?? null;
  const yearObj = activeData?.year ?? null;
  const events = activeData?.events ?? [];

  const rangeStart = useMemo(() => {
    if (viewScope === "year" && yearObj) return parseLocalDate(yearObj.start_date);
    if (sessionObj) return parseLocalDate(sessionObj.start_date);
    return null;
  }, [viewScope, yearObj, sessionObj]);

  const rangeEnd = useMemo(() => {
    if (viewScope === "year" && yearObj) return parseLocalDate(yearObj.end_date);
    if (sessionObj) return parseLocalDate(sessionObj.end_date);
    return null;
  }, [viewScope, yearObj, sessionObj]);

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

  const holidays = useMemo(() => {
    return events.filter((e) => e.event_type?.code === "holiday");
  }, [events]);

  useEffect(() => {
    const { start_date, end_date } = formData;
    if (!start_date) {
      setDateWarnings([]);
      return;
    }
    const start = parseLocalDate(start_date);
    const end = end_date ? parseLocalDate(end_date) : start;
    if (!start || !end) {
      setDateWarnings([]);
      return;
    }
    const warnings = [];
    const seen = new Set();
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = dateStr(d);
      if (seen.has(key)) continue;
      seen.add(key);
      if (isWeekend(d)) {
        warnings.push({ date: key, type: "weekend", message: `${key} is a weekend` });
      }
      const holiday = holidays.find((h) => {
        const hStart = parseLocalDate(h.start_date);
        const hEnd = parseLocalDate(h.end_date);
        const d2 = new Date(d);
        return hStart <= d2 && d2 <= hEnd;
      });
      if (holiday) {
        warnings.push({ date: key, type: "holiday", message: `${key} is a public holiday: ${holiday.title}` });
      }
    }
    setDateWarnings(warnings);
  }, [formData.start_date, formData.end_date, holidays]);

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
    const t = HARDCODED_EVENT_TYPES.find((et) => et.code === typeCode);
    return t?.color ?? "#3b82f6";
  }

  function getTypeLabel(typeCode) {
    const t = HARDCODED_EVENT_TYPES.find((et) => et.code === typeCode);
    return t?.label ?? typeCode;
  }

  const monthRange = useMemo(() => {
    if (!rangeStart || !rangeEnd) {
      const now = new Date();
      return [{ year: now.getFullYear(), month: now.getMonth() }];
    }
    const months = [];
    const start = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    const end = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);
    for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
      months.push({ year: d.getFullYear(), month: d.getMonth() });
    }
    return months;
  }, [rangeStart, rangeEnd]);

  const currentMonthData = useMemo(() => {
    const { first, last, days } = getMonthDays(navDate.getFullYear(), navDate.getMonth());
    const padStart = (first.getDay() + 6) % 7;
    const padEnd = (7 - ((padStart + days.length) % 7)) % 7;
    return { first, last, days, padStart, padEnd };
  }, [navDate]);

  // Filter events excluding weekends and holidays for the table
  const tableEvents = useMemo(() => {
    return events.filter((e) => !["weekend", "holiday"].includes(e.event_type?.code));
  }, [events]);

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
      event_type_id: HARDCODED_EVENT_TYPES[0]?.code ?? "",
      title: "",
      description: "",
      start_date: d,
      end_date: d,
    });
    setShowForm(true);
  }

  function openEdit(event) {
    setEditingEvent(event);
    const typeCode = event.event_type?.code
      ?? Object.entries(codeToId).find(([, id]) => id === event.event_type?.id)?.[0]
      ?? "";
    setFormData({
      event_type_id: typeCode,
      title: event.title,
      description: event.description ?? "",
      start_date: event.start_date,
      end_date: event.end_date,
    });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const sessionId = selectedSessionId;
    if (!sessionId) return;
    const realId = codeToId[formData.event_type_id] || formData.event_type_id;
    const payload = { ...formData, event_type_id: realId };
    setIsLoading(true);
    try {
      if (editingEvent) {
        await calendarApi.updateEvent(sessionId, editingEvent.id, payload);
        toast.success("Event updated.");
      } else {
        await calendarApi.createEvent(sessionId, payload);
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

  async function handleExportPdf() {
    setDownloading(true);
    try {
      const response = viewScope === "year" && selectedYearId
        ? await calendarApi.exportYearPdf(selectedYearId)
        : await calendarApi.exportSessionPdf(selectedSessionId);
      const blob = response.data;
      const disposition = response.headers?.["content-disposition"] ?? "";
      const encodedMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const regularMatch = disposition.match(/filename="?([^";]+)"?/i);
      const filename = encodedMatch
        ? decodeURIComponent(encodedMatch[1])
        : regularMatch?.[1] ?? "calendar-events.pdf";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Failed to export PDF."));
    } finally {
      setDownloading(false);
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

  function renderMonthGrid(monthYear) {
    const { first, last, days, padStart, padEnd } = getMonthDays(monthYear.year, monthYear.month);

    return (
      <div key={`${monthYear.year}-${monthYear.month}`}>
        <div className="mb-1 text-center text-[13px] font-semibold text-slate-700">
          {new Date(monthYear.year, monthYear.month).toLocaleDateString("en-KE", { month: "long", year: "numeric" })}
        </div>

        <div className="grid grid-cols-7">
          {DAY_LABELS.map((label) => (
            <div key={label} className="border-b border-slate-200 px-1 py-1 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-500">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {Array.from({ length: padStart }).map((_, i) => (
            <div key={`ps-${i}`} className="min-h-[100px] border-b border-r border-slate-100 bg-slate-50/50" />
          ))}
          {days.map((d) => {
            const key = dateStr(d);
            const dayEvts = dateEventMap[key] ?? [];
            const inSess = isInSession(d);
            const weekend = isWeekend(d);
            const today = isToday(d);
            const evtColor = dayEvts.length > 0 ? getTypeColor(dayEvts[0].event_type?.code) : null;

            return (
              <button
                type="button"
                key={key}
                onClick={() => {
                  const evts = dateEventMap[key] ?? [];
                  setSelectedDayEvents({ date: key, events: evts, numDate: d.getDate() });
                }}
                className={`group relative min-h-[100px] p-1.5 border-r border-slate-100 text-left align-top transition-colors hover:bg-blue-50/40 ${
                  !inSess ? "bg-slate-50/70 border-b border-slate-100" : weekend ? "bg-slate-50 border-b border-slate-100" : dayEvts.length > 0 ? "bg-white border-b-2" : "bg-white border-b border-slate-100"
                }`}
                style={inSess && dayEvts.length > 0 ? { borderBottomColor: evtColor } : undefined}
              >
                <span
                  className={`inline-flex items-center justify-center rounded-full h-6 w-6 text-[12px] font-medium ${
                    today ? "bg-blue-600 text-white" : weekend ? "text-slate-400" : "text-slate-700"
                  } ${!inSess ? "opacity-40" : ""}`}
                >
                  {d.getDate()}
                </span>
                {inSess && dayEvts.length > 0 && (
                  <div className="mt-1 space-y-1">
                    {dayEvts.slice(0, 3).map((evt) => {
                      const color = getTypeColor(evt.event_type?.code);
                      const evtDate = new Date(evt.start_date + "T00:00:00");
                      const dayNum = evtDate.getDate();
                      const monthAbbr = evtDate.toLocaleDateString("en-KE", { month: "short" });
                      return (
                        <div
                          key={evt.id}
                          className="rounded px-1 py-0.5 text-[10px] leading-tight"
                          style={{
                            backgroundColor: color + "20",
                            color: color,
                            borderLeft: `3px solid ${color}`,
                          }}
                          title={evt.title}
                        >
                          <span className="font-bold">{dayNum} {monthAbbr}</span>
                          <span className="ml-1">{evt.title}</span>
                        </div>
                      );
                    })}
                    {dayEvts.length > 3 && (
                      <div className="text-[10px] font-medium text-slate-400">
                        +{dayEvts.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
          {Array.from({ length: padEnd }).map((_, i) => (
            <div key={`pe-${i}`} className="min-h-[100px] border-b border-r border-slate-100 bg-slate-50/50" />
          ))}
        </div>
      </div>
    );
  }

  // Loading / error
  if (!activeData && !error) {
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
          <FormButton
            type="button"
            size="sm"
            onClick={handleExportPdf}
            disabled={downloading || (viewScope !== "year" && !selectedSessionId)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Download className="size-3.5" /> {downloading ? "Exporting..." : "Export PDF"}
          </FormButton>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-0.5">
          <button
            type="button"
            onClick={() => setViewScope("calendar")}
            className={`rounded-md px-3 py-1 text-[12px] font-medium transition ${
              viewScope === "calendar"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Calendar
          </button>
          <button
            type="button"
            onClick={() => setViewScope("session")}
            className={`rounded-md px-3 py-1 text-[12px] font-medium transition ${
              viewScope === "session"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            By Session
          </button>
          <button
            type="button"
            onClick={() => setViewScope("year")}
            className={`rounded-md px-3 py-1 text-[12px] font-medium transition ${
              viewScope === "year"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            By Academic Year
          </button>
        </div>

        {sessionObj && viewScope !== "year" && (
          <p className="text-[13px] text-slate-500">
            {sessionObj.name} &middot; {sessionObj.start_date} &ndash; {sessionObj.end_date}
          </p>
        )}
        {viewScope === "year" && yearObj && (
          <p className="text-[13px] text-slate-500">
            {yearObj.name} &middot; {yearObj.start_date} &ndash; {yearObj.end_date}
          </p>
        )}
      </div>

      {/* Calendar View: Month Grid */}
      {viewScope === "calendar" && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            {HARDCODED_EVENT_TYPES.map((t) => (
              <span key={t.code} className="inline-flex items-center gap-1.5 text-[12px] text-slate-600">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                {t.label}
              </span>
            ))}
          </div>

          {currentMonthData && (
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
                  {renderMonthGrid({ year: navDate.getFullYear(), month: navDate.getMonth() })}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Events Table (session and year views only) */}
      {viewScope !== "calendar" && (
        <div className="rounded-xl border border-slate-200/80 bg-white">
          <div className="border-b border-slate-200 px-5 py-3">
            <h2 className="text-[15px] font-semibold text-slate-900">
              {viewScope === "session" ? "Session Events" : "Year Events"}
            </h2>
            <p className="text-[12px] text-slate-500">Excludes weekends</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="w-12 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">#</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Event</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Type</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Start Date</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">End Date</th>
                  <th className="w-24 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tableEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[13px] text-slate-400">No events found.</td>
                  </tr>
                ) : (
                  tableEvents.map((evt, index) => {
                    const color = getTypeColor(evt.event_type?.code);
                    const isSystem = evt.source === "system_api" || evt.source === "system_computed";
                    return (
                      <tr key={evt.id} className="border-b border-slate-100 transition hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 text-slate-400">{index + 1}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                            <span className="font-medium text-slate-800">{evt.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">{getTypeLabel(evt.event_type?.code)}</td>
                        <td className="px-4 py-2.5 text-slate-700">{evt.start_date}</td>
                        <td className="px-4 py-2.5 text-slate-700">{evt.end_date}</td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(evt)}
                              className="rounded px-2 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50"
                            >
                              edit
                            </button>
                            {!isSystem && (
                              <button
                                type="button"
                                onClick={() => handleDelete(evt.id)}
                                className="rounded px-2 py-1 text-[11px] font-medium text-red-500 hover:bg-red-50"
                              >
                                delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
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
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(evt)}
                            className="rounded px-1.5 py-0.5 text-[11px] text-blue-600 hover:bg-blue-50"
                          >
                            edit
                          </button>
                          {!isSystem && (
                            <button
                              type="button"
                              onClick={() => handleDelete(evt.id)}
                              className="rounded px-1.5 py-0.5 text-[11px] text-red-500 hover:bg-red-50"
                            >
                              delete
                            </button>
                          )}
                        </div>
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
              {dateWarnings.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <p className="text-[12px] font-medium text-amber-800">Selected dates include:</p>
                  <ul className="mt-1 list-inside list-disc space-y-0.5">
                    {dateWarnings.map((w, i) => (
                      <li key={i} className="text-[11px] text-amber-700">{w.message}</li>
                    ))}
                  </ul>
                  <p className="mt-1 text-[11px] text-amber-600">You can still proceed to create this event.</p>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">Type</label>
                      <select
                        value={formData.event_type_id}
                        onChange={(e) => setFormData({ ...formData, event_type_id: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-[13px]"
                        required
                      >
                        <option value="">Select event type</option>
                        {HARDCODED_EVENT_TYPES.filter((t) => t.code !== "holiday").map((t) => (
                          <option key={t.code} value={t.code}>{t.label}</option>
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
