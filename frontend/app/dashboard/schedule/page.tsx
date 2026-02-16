"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useTaskInstances } from "@/hooks/api/useTask";
import { useIntegrationStatus } from "@/hooks/api/useIntegrations";
import { ChevronLeft, ChevronRight, X, Clock, User, Phone, MapPin } from "lucide-react";
import {
  buildScheduleAppointments,
  ScheduleAppointment as Appointment,
} from "./scheduleProjection";

type ViewMode = "day" | "week" | "month";

const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

const DAY_NAMES_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0-23

function formatHour(hour: number) {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function getWeekDays(date: Date) {
  const days: Date[] = [];
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  for (let i = 0; i < 7; i++) {
    days.push(new Date(start));
    start.setDate(start.getDate() + 1);
  }
  return days;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// Color palette for events (Google Cal style)
const EVENT_COLORS = [
  { bg: "#039be5", text: "#fff" },
  { bg: "#7986cb", text: "#fff" },
  { bg: "#33b679", text: "#fff" },
  { bg: "#8e24aa", text: "#fff" },
  { bg: "#e67c73", text: "#fff" },
  { bg: "#f6bf26", text: "#333" },
  { bg: "#f4511e", text: "#fff" },
  { bg: "#616161", text: "#fff" },
  { bg: "#3f51b5", text: "#fff" },
  { bg: "#0b8043", text: "#fff" },
];

function getEventColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return EVENT_COLORS[Math.abs(hash) % EVENT_COLORS.length];
}

// Event detail popover
function EventPopover({
  appointment,
  onClose,
  anchorRect,
}: {
  appointment: Appointment;
  onClose: () => void;
  anchorRect: DOMRect | null;
}) {
  const color = getEventColor(appointment.id);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  if (!anchorRect) return null;

  // Position the popover near the clicked event
  const top = Math.min(anchorRect.top, window.innerHeight - 320);
  const left = anchorRect.right + 8 > window.innerWidth - 20
    ? anchorRect.left - 328
    : anchorRect.right + 8;

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        ref={popoverRef}
        className="absolute bg-white rounded-lg shadow-[0_24px_38px_3px_rgba(0,0,0,0.14),0_9px_46px_8px_rgba(0,0,0,0.12),0_11px_15px_-7px_rgba(0,0,0,0.2)] w-[320px] overflow-hidden"
        style={{ top: Math.max(8, top), left: Math.max(8, left) }}
      >
        {/* Color bar */}
        <div className="h-2" style={{ backgroundColor: color.bg }} />
        <div className="p-4">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-normal text-[#3c4043] leading-snug pr-2">{appointment.title}</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 transition flex-shrink-0 -mr-1 -mt-1"
            >
              <X className="h-5 w-5 text-[#5f6368]" />
            </button>
          </div>
          <div className="space-y-2.5 text-sm text-[#5f6368]">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 flex-shrink-0 text-[#5f6368]" />
              <span>{appointment.time.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} &middot; {formatTime(appointment.time)}</span>
            </div>
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 flex-shrink-0 text-[#5f6368]" />
              <span>{appointment.customerName}</span>
            </div>
            {appointment.customerPhone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 flex-shrink-0 text-[#5f6368]" />
                <span>{appointment.customerPhone}</span>
              </div>
            )}
            {appointment.customerAddress && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 flex-shrink-0 text-[#5f6368]" />
                <span>{appointment.customerAddress}</span>
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <span
              className="inline-block px-2 py-0.5 rounded text-xs font-medium"
              style={{ backgroundColor: color.bg + "22", color: color.bg }}
            >
              {appointment.status}
            </span>
            <span
              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ml-2 ${
                appointment.source === "google-calendar"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "bg-gray-100 text-gray-700 border border-gray-200"
              }`}
            >
              {appointment.sourceLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<{ appointment: Appointment; rect: DOMRect } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading: isTaskLoading } = useTaskInstances({ page: 1, limit: 1000 });
  const googleCalendarStatus = useIntegrationStatus("google-calendar");

  const appointments: Appointment[] = useMemo(() => {
    return buildScheduleAppointments({
      tasks: data?.data || [],
      integrationConfig: googleCalendarStatus.data?.data?.config || {},
    });
  }, [data?.data, googleCalendarStatus.data?.data?.config]);

  const isLoading = isTaskLoading || (googleCalendarStatus.isLoading && !googleCalendarStatus.data);

  // Scroll to ~8am on mount
  useEffect(() => {
    if (scrollRef.current) {
      const hourHeight = 60;
      scrollRef.current.scrollTop = hourHeight * 8;
    }
  }, [viewMode]);

  const today = new Date();

  const goToPrevious = () => {
    const d = new Date(currentDate);
    if (viewMode === "day") d.setDate(d.getDate() - 1);
    else if (viewMode === "week") d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const goToNext = () => {
    const d = new Date(currentDate);
    if (viewMode === "day") d.setDate(d.getDate() + 1);
    else if (viewMode === "week") d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const goToToday = () => setCurrentDate(new Date());

  const getTitle = () => {
    if (viewMode === "day") {
      return currentDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    } else if (viewMode === "week") {
      const week = getWeekDays(currentDate);
      const s = week[0];
      const e = week[6];
      if (s.getMonth() === e.getMonth()) {
        return `${s.toLocaleDateString("en-US", { month: "long" })} ${s.getDate()}\u2009\u2013\u2009${e.getDate()}, ${s.getFullYear()}`;
      }
      return `${s.toLocaleDateString("en-US", { month: "short" })} ${s.getDate()} \u2013 ${e.toLocaleDateString("en-US", { month: "short" })} ${e.getDate()}, ${e.getFullYear()}`;
    }
    return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const getAppointmentsForDay = (date: Date) => appointments.filter((a) => isSameDay(a.time, date));
  const getAppointmentsForHour = (date: Date, hour: number) =>
    appointments.filter((a) => isSameDay(a.time, date) && a.time.getHours() === hour);

  const handleEventClick = (e: React.MouseEvent, apt: Appointment) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setSelectedEvent({ appointment: apt, rect });
  };

  // Current time indicator position
  const now = new Date();
  const currentTimeTop = (now.getHours() + now.getMinutes() / 60) * 60;

  // ── WEEK VIEW ──
  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);

    return (
      <div className="flex flex-col flex-1 min-h-0">
        {/* Sticky day headers */}
        <div className="flex border-b border-[#dadce0] flex-shrink-0">
          {/* Time gutter spacer */}
          <div className="w-[56px] flex-shrink-0" />
          {/* Day columns */}
          <div className="flex-1 grid grid-cols-7">
            {weekDays.map((day, i) => {
              const isToday_ = isSameDay(day, today);
              return (
                <div key={i} className="flex flex-col items-center py-2 border-l border-[#dadce0]">
                  <span className={`text-[11px] font-medium tracking-wide ${isToday_ ? "text-[#1a73e8]" : "text-[#70757a]"}`}>
                    {DAY_NAMES_SHORT[day.getDay()]}
                  </span>
                  <span
                    className={`
                      mt-0.5 w-[46px] h-[46px] flex items-center justify-center text-[24px] font-normal rounded-full transition
                      ${isToday_ ? "bg-[#1a73e8] text-white" : "text-[#3c4043] hover:bg-[#f1f3f4]"}
                    `}
                  >
                    {day.getDate()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable time grid */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          <div className="flex relative" style={{ height: `${24 * 60}px` }}>
            {/* Time labels gutter */}
            <div className="w-[56px] flex-shrink-0 relative">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute right-2 text-[10px] text-[#70757a] leading-none"
                  style={{ top: `${h * 60 - 5}px` }}
                >
                  {h === 0 ? "" : formatHour(h)}
                </div>
              ))}
            </div>

            {/* Day columns */}
            <div className="flex-1 grid grid-cols-7 relative">
              {/* Horizontal hour lines */}
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-[#dadce0]"
                  style={{ top: `${h * 60}px` }}
                />
              ))}

              {/* Current time indicator */}
              {weekDays.some((d) => isSameDay(d, today)) && (
                <div
                  className="absolute left-0 right-0 z-10 pointer-events-none"
                  style={{ top: `${currentTimeTop}px` }}
                >
                  <div className="relative" style={{
                    left: `${(today.getDay() / 7) * 100}%`,
                    width: `${100 / 7}%`,
                  }}>
                    <div className="absolute left-0 right-0 flex items-center">
                      <div className="w-3 h-3 rounded-full bg-[#ea4335] -ml-1.5 flex-shrink-0" />
                      <div className="flex-1 h-[2px] bg-[#ea4335]" />
                    </div>
                  </div>
                </div>
              )}

              {/* Day column overlays + events */}
              {weekDays.map((day, dayIdx) => {
                const isToday_ = isSameDay(day, today);
                const dayAppts = getAppointmentsForDay(day);

                return (
                  <div
                    key={dayIdx}
                    className={`relative border-l border-[#dadce0] ${isToday_ ? "bg-[#1a73e8]/[0.04]" : ""}`}
                  >
                    {/* Events */}
                    {dayAppts.map((apt) => {
                      const color = getEventColor(apt.id);
                      const topPos = (apt.time.getHours() + apt.time.getMinutes() / 60) * 60;
                      return (
                        <div
                          key={apt.id}
                          className="absolute left-[2px] right-[2px] rounded-[4px] px-2 py-1 cursor-pointer overflow-hidden z-10 hover:brightness-95 transition-[filter]"
                          style={{
                            top: `${topPos}px`,
                            minHeight: "44px",
                            height: "56px",
                            backgroundColor: color.bg,
                            color: color.text,
                          }}
                          onClick={(e) => handleEventClick(e, apt)}
                        >
                          <div className="text-xs font-medium leading-tight truncate">{apt.title}</div>
                          <div className="text-[11px] leading-tight truncate opacity-90">{apt.customerName}</div>
                          <div className="text-[10px] leading-tight opacity-75">{formatTime(apt.time)}</div>
                          <div className="text-[10px] leading-tight opacity-70">{apt.sourceLabel}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── DAY VIEW ──
  const renderDayView = () => {
    const isToday_ = isSameDay(currentDate, today);

    return (
      <div className="flex flex-col flex-1 min-h-0">
        {/* Day header */}
        <div className="flex border-b border-[#dadce0] flex-shrink-0">
          <div className="w-[56px] flex-shrink-0" />
          <div className="flex-1 flex flex-col items-center py-2 border-l border-[#dadce0]">
            <span className={`text-[11px] font-medium tracking-wide ${isToday_ ? "text-[#1a73e8]" : "text-[#70757a]"}`}>
              {DAY_NAMES_SHORT[currentDate.getDay()]}
            </span>
            <span
              className={`
                mt-0.5 w-[46px] h-[46px] flex items-center justify-center text-[24px] font-normal rounded-full
                ${isToday_ ? "bg-[#1a73e8] text-white" : "text-[#3c4043]"}
              `}
            >
              {currentDate.getDate()}
            </span>
          </div>
        </div>

        {/* Scrollable time grid */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
          <div className="flex relative" style={{ height: `${24 * 60}px` }}>
            {/* Time gutter */}
            <div className="w-[56px] flex-shrink-0 relative">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute right-2 text-[10px] text-[#70757a] leading-none"
                  style={{ top: `${h * 60 - 5}px` }}
                >
                  {h === 0 ? "" : formatHour(h)}
                </div>
              ))}
            </div>

            <div className="flex-1 relative border-l border-[#dadce0]">
              {/* Hour lines */}
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-[#dadce0]"
                  style={{ top: `${h * 60}px` }}
                />
              ))}

              {/* Current time indicator */}
              {isToday_ && (
                <div
                  className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
                  style={{ top: `${currentTimeTop}px` }}
                >
                  <div className="w-3 h-3 rounded-full bg-[#ea4335] -ml-1.5 flex-shrink-0" />
                  <div className="flex-1 h-[2px] bg-[#ea4335]" />
                </div>
              )}

              {/* Events */}
              {getAppointmentsForDay(currentDate).map((apt) => {
                const color = getEventColor(apt.id);
                const topPos = (apt.time.getHours() + apt.time.getMinutes() / 60) * 60;
                return (
                  <div
                    key={apt.id}
                    className="absolute left-[2px] right-[2px] rounded-[4px] px-3 py-1.5 cursor-pointer overflow-hidden z-10 hover:brightness-95 transition-[filter]"
                    style={{
                      top: `${topPos}px`,
                      minHeight: "44px",
                      height: "56px",
                      backgroundColor: color.bg,
                      color: color.text,
                    }}
                    onClick={(e) => handleEventClick(e, apt)}
                  >
                    <div className="text-sm font-medium leading-tight truncate">{apt.title}</div>
                    <div className="text-xs leading-tight opacity-90">{apt.customerName} &middot; {formatTime(apt.time)}</div>
                    <div className="text-[10px] leading-tight opacity-75">{apt.sourceLabel}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── MONTH VIEW ──
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let i = 1; i <= daysInMonth; i++) cells.push(i);
    // Fill remaining to complete last row
    while (cells.length % 7 !== 0) cells.push(null);

    const rows = Math.ceil(cells.length / 7);

    return (
      <div className="flex flex-col flex-1 min-h-0">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-[#dadce0] flex-shrink-0">
          {DAY_NAMES_SHORT.map((d) => (
            <div key={d} className="py-2 text-center text-[11px] font-medium text-[#70757a] tracking-wide">
              {d}
            </div>
          ))}
        </div>

        {/* Month grid - fills remaining space */}
        <div className="flex-1 grid grid-cols-7 min-h-0" style={{ gridTemplateRows: `repeat(${rows}, 1fr)` }}>
          {cells.map((day, idx) => {
            const date = day ? new Date(year, month, day) : null;
            const isToday_ = date ? isSameDay(date, today) : false;
            const dayAppts = date ? getAppointmentsForDay(date) : [];

            return (
              <div
                key={idx}
                className={`border-b border-r border-[#dadce0] overflow-hidden ${day ? "" : "bg-[#f8f9fa]"}`}
              >
                {day !== null && (
                  <div className="p-1 h-full flex flex-col">
                    <span
                      className={`
                        inline-flex items-center justify-center w-6 h-6 text-xs rounded-full mb-0.5 self-center
                        ${isToday_ ? "bg-[#1a73e8] text-white font-medium" : "text-[#3c4043]"}
                      `}
                    >
                      {day}
                    </span>
                    <div className="flex-1 overflow-hidden space-y-px">
                      {dayAppts.slice(0, 3).map((apt) => {
                        const color = getEventColor(apt.id);
                        return (
                          <div
                            key={apt.id}
                            className="rounded-[4px] px-1.5 py-px text-[11px] leading-tight truncate cursor-pointer hover:brightness-95 transition-[filter]"
                            style={{ backgroundColor: color.bg, color: color.text }}
                            onClick={(e) => handleEventClick(e, apt)}
                          >
                            {formatTime(apt.time)} {apt.customerName} • {apt.source === "google-calendar" ? "GCal" : "RC"}
                          </div>
                        );
                      })}
                      {dayAppts.length > 3 && (
                        <div className="text-[11px] text-[#70757a] pl-1.5 font-medium cursor-pointer hover:text-[#3c4043]">
                          +{dayAppts.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-49px)] -m-4 md:-m-6">
      {/* Toolbar - Google Cal style */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0 border-b border-[#dadce0]">
        {/* Left: view toggle */}
        <div className="flex items-center gap-1 bg-[#f1f3f4] rounded-lg p-0.5">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id)}
              className={`
                px-3.5 py-1.5 text-sm font-medium rounded-md transition
                ${viewMode === mode.id
                  ? "bg-white text-[#1a73e8] shadow-sm"
                  : "text-[#3c4043] hover:bg-[#e8eaed]"
                }
              `}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Right: navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-4 py-1.5 text-sm font-medium text-[#3c4043] border border-[#dadce0] rounded-md hover:bg-[#f1f3f4] transition"
          >
            Today
          </button>
          <div className="flex items-center">
            <button onClick={goToPrevious} className="p-1.5 rounded-full hover:bg-[#f1f3f4] transition">
              <ChevronLeft className="h-5 w-5 text-[#5f6368]" />
            </button>
            <button onClick={goToNext} className="p-1.5 rounded-full hover:bg-[#f1f3f4] transition">
              <ChevronRight className="h-5 w-5 text-[#5f6368]" />
            </button>
          </div>
          <h2 className="text-[22px] font-normal text-[#3c4043] ml-2 select-none">{getTitle()}</h2>
        </div>
      </div>

      {/* Calendar body */}
      {isLoading ? (
        <div className="flex-1 grid place-items-center text-[#5f6368]">Loading schedule...</div>
      ) : (
        <>
          {viewMode === "week" && renderWeekView()}
          {viewMode === "day" && renderDayView()}
          {viewMode === "month" && renderMonthView()}
        </>
      )}

      {/* Event popover */}
      {selectedEvent && (
        <EventPopover
          appointment={selectedEvent.appointment}
          anchorRect={selectedEvent.rect}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
