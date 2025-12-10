"use client";

import { useState, useMemo } from "react";
import { Page } from "@/components/dashboard/Page";
import { useTaskInstances } from "@/hooks/api/useTask";
import { ChevronLeft, ChevronRight, Clock, MapPin, Phone, User } from "lucide-react";

type ViewMode = "day" | "week" | "month";

const VIEW_MODES: { id: ViewMode; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

// Helper to get days in a month
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// Helper to get the day of week for the first day of month (0 = Sunday)
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// Helper to format time
function formatTime(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// Helper to check if two dates are the same day
function isSameDay(date1: Date, date2: Date) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// Get week days starting from a date
function getWeekDays(startDate: Date) {
  const days: Date[] = [];
  const start = new Date(startDate);
  start.setDate(start.getDate() - start.getDay()); // Start from Sunday
  
  for (let i = 0; i < 7; i++) {
    days.push(new Date(start));
    start.setDate(start.getDate() + 1);
  }
  return days;
}

// Time slots for day/week view (6 AM to 9 PM for full business coverage)
const TIME_SLOTS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM to 9 PM

export default function SchedulePage() {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Fetch all task instances that have appointments
  const { data, isLoading } = useTaskInstances({
    page: 1,
    limit: 1000, // Get all for calendar
  });
  
  const appointments = useMemo(() => {
    if (!data?.data) return [];
    
    return data.data
      .filter((task) => task.appointmentTime)
      .map((task) => ({
        id: task.id,
        title: task.taskName,
        time: new Date(task.appointmentTime!),
        status: task.status,
        customerName: (task.info as Record<string, string>)?.["full-name"] ||
                      (task.info as Record<string, string>)?.name || 
                      (task.info as Record<string, string>)?.["customer-name"] || 
                      "Unknown",
        customerPhone: (task.info as Record<string, string>)?.["phone-number"] || 
                       (task.info as Record<string, string>)?.phone || "",
        customerAddress: (task.info as Record<string, string>)?.address || 
                         (task.info as Record<string, string>)?.["customer-address"] || "",
      }));
  }, [data]);

  // Navigation handlers
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "day") {
      newDate.setDate(newDate.getDate() - 1);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "day") {
      newDate.setDate(newDate.getDate() + 1);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get title based on view mode
  const getTitle = () => {
    if (viewMode === "day") {
      return currentDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } else if (viewMode === "week") {
      const weekDays = getWeekDays(currentDate);
      const start = weekDays[0];
      const end = weekDays[6];
      if (start.getMonth() === end.getMonth()) {
        return `${start.toLocaleDateString("en-US", { month: "long" })} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
      }
      return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  // Get appointments for a specific day
  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter((apt) => isSameDay(apt.time, date));
  };

  // Get appointments for a specific hour on a day
  const getAppointmentsForHour = (date: Date, hour: number) => {
    return appointments.filter((apt) => {
      return isSameDay(apt.time, date) && apt.time.getHours() === hour;
    });
  };

  // Render month view
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();

    const days: (number | null)[] = [];
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="py-3 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const date = day ? new Date(year, month, day) : null;
            const dayAppointments = date ? getAppointmentsForDay(date) : [];
            const isToday = date && isSameDay(date, today);
            
            return (
              <div
                key={index}
                className={`
                  min-h-[120px] p-2 border-b border-r border-gray-100
                  ${day ? "bg-white hover:bg-gray-50" : "bg-gray-50"}
                  ${isToday ? "bg-blue-50" : ""}
                `}
              >
                {day && (
                  <>
                    <span
                      className={`
                        inline-flex items-center justify-center w-7 h-7 text-sm rounded-full
                        ${isToday ? "bg-[var(--color-primary)] text-white font-semibold" : "text-gray-700"}
                      `}
                    >
                      {day}
                    </span>
                    <div className="mt-1 space-y-1">
                      {dayAppointments.slice(0, 3).map((apt) => (
                        <div
                          key={apt.id}
                          className="px-2 py-1 text-xs rounded truncate cursor-pointer bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                          title={`${formatTime(apt.time)} - ${apt.customerName}`}
                        >
                          {formatTime(apt.time)} {apt.customerName}
                        </div>
                      ))}
                      {dayAppointments.length > 3 && (
                        <div className="text-xs text-gray-500 px-2">
                          +{dayAppointments.length - 3} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    const today = new Date();

    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-8 border-b border-gray-200">
          <div className="py-3 px-2 text-center text-sm font-medium text-gray-500 border-r border-gray-200">
            Time
          </div>
          {weekDays.map((day, index) => {
            const isToday = isSameDay(day, today);
            return (
              <div
                key={index}
                className={`py-3 text-center ${isToday ? "bg-blue-50" : ""}`}
              >
                <div className="text-xs text-gray-500">
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div
                  className={`
                    inline-flex items-center justify-center w-8 h-8 text-sm rounded-full mt-1
                    ${isToday ? "bg-[var(--color-primary)] text-white font-semibold" : "text-gray-700"}
                  `}
                >
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="max-h-[600px] overflow-y-auto">
          {TIME_SLOTS.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b border-gray-100">
              <div className="py-4 px-2 text-xs text-gray-500 text-right pr-3 border-r border-gray-200">
                {hour > 12 ? `${hour - 12} PM` : hour === 12 ? "12 PM" : `${hour} AM`}
              </div>
              {weekDays.map((day, dayIndex) => {
                const hourAppointments = getAppointmentsForHour(day, hour);
                const isToday = isSameDay(day, today);
                
                return (
                  <div
                    key={dayIndex}
                    className={`
                      min-h-[60px] p-1 border-r border-gray-100
                      ${isToday ? "bg-blue-50/30" : ""}
                      hover:bg-gray-50
                    `}
                  >
                    {hourAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="px-2 py-1 text-xs rounded mb-1 cursor-pointer bg-blue-100 text-blue-700 border-l-2 border-blue-500 hover:bg-blue-200 transition"
                      >
                        <div className="font-medium truncate">{apt.customerName}</div>
                        <div className="text-[10px] opacity-75">{apt.title}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const today = new Date();
    const isToday = isSameDay(currentDate, today);

    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className={`py-4 px-6 border-b border-gray-200 ${isToday ? "bg-blue-50" : ""}`}>
          <div className="text-lg font-semibold text-gray-900">
            {currentDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
        </div>

        {/* Time slots */}
        <div className="max-h-[600px] overflow-y-auto">
          {TIME_SLOTS.map((hour) => {
            const hourAppointments = getAppointmentsForHour(currentDate, hour);
            
            return (
              <div key={hour} className="flex border-b border-gray-100">
                <div className="w-20 py-4 px-3 text-xs text-gray-500 text-right border-r border-gray-200 flex-shrink-0">
                  {hour > 12 ? `${hour - 12} PM` : hour === 12 ? "12 PM" : `${hour} AM`}
                </div>
                <div className="flex-1 min-h-[80px] p-2">
                  {hourAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="p-3 rounded-lg mb-2 cursor-pointer bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-900">
                          {formatTime(apt.time)}
                        </span>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
                          Scheduled
                        </span>
                      </div>
                      <div className="font-medium text-gray-900 mb-1">{apt.title}</div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {apt.customerName}
                        </div>
                        {apt.customerPhone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {apt.customerPhone}
                          </div>
                        )}
                      </div>
                      {apt.customerAddress && (
                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                          <MapPin className="h-3 w-3" />
                          {apt.customerAddress}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Page title="Schedule" subtitle="View and manage your appointments">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {/* View mode toggle */}
        <div className="flex bg-white rounded-xl border border-gray-200 p-1">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id)}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg transition
                ${viewMode === mode.id
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }
              `}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            Today
          </button>
          <div className="flex items-center bg-white border border-gray-200 rounded-lg">
            <button
              onClick={goToPrevious}
              className="p-2 hover:bg-gray-50 rounded-l-lg transition"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="px-4 py-2 text-sm font-medium text-gray-900 min-w-[200px] text-center">
              {getTitle()}
            </div>
            <button
              onClick={goToNext}
              className="p-2 hover:bg-gray-50 rounded-r-lg transition"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>


      {/* Calendar */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          Loading schedule...
        </div>
      ) : (
        <>
          {viewMode === "month" && renderMonthView()}
          {viewMode === "week" && renderWeekView()}
          {viewMode === "day" && renderDayView()}
        </>
      )}

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Total Appointments</div>
          <div className="text-2xl font-semibold text-gray-900">{appointments.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">This Week</div>
          <div className="text-2xl font-semibold text-gray-900">
            {appointments.filter((apt) => {
              const weekStart = new Date();
              weekStart.setDate(weekStart.getDate() - weekStart.getDay());
              weekStart.setHours(0, 0, 0, 0);
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekEnd.getDate() + 7);
              return apt.time >= weekStart && apt.time < weekEnd;
            }).length}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-500">Today</div>
          <div className="text-2xl font-semibold text-gray-900">
            {getAppointmentsForDay(new Date()).length}
          </div>
        </div>
      </div>
    </Page>
  );
}

