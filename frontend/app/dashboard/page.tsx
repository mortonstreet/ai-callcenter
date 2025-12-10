"use client";

import { useState, useMemo } from "react";
import { Page } from "@/components/dashboard/Page";
import { useTaskInstancesForAnalytics } from "@/hooks/api/useTask";
import { useRecordingsForAnalytics } from "@/hooks/api/useRecording";
import { 
  Phone, 
  CalendarCheck, 
  TrendingUp, 
  Target,
  Clock,
  ExternalLink,
  CheckCircle2,
  XCircle
} from "lucide-react";
import Link from "next/link";

type DateRange = "24h" | "7d" | "30d" | "all" | "custom";

const DATE_RANGES: { id: DateRange; label: string }[] = [
  { id: "24h", label: "24 Hours" },
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
  { id: "all", label: "All Time" },
  { id: "custom", label: "Custom" },
];

function getDateRange(range: DateRange, customStart?: string, customEnd?: string) {
  const now = new Date();
  let startDate: Date;
  let endDate = now;

  switch (range) {
    case "24h":
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "all":
      // Go back 2 years to capture all historical data
      startDate = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
      break;
    case "custom":
      startDate = customStart ? new Date(customStart) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = customEnd ? new Date(customEnd) : now;
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

function getDaysBetween(start: Date, end: Date) {
  const days: Date[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  
  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return days;
}

export default function DashboardPage() {
  const [selectedRange, setSelectedRange] = useState<DateRange>("7d");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const { startDate, endDate } = useMemo(
    () => getDateRange(selectedRange, customStartDate, customEndDate),
    [selectedRange, customStartDate, customEndDate]
  );

  const { data: tasksData, isLoading: tasksLoading } = useTaskInstancesForAnalytics(startDate, endDate);
  const { data: recordingsData, isLoading: recordingsLoading } = useRecordingsForAnalytics(startDate, endDate);

  const tasks = tasksData?.data || [];
  const recordings = recordingsData?.data || [];

  // Calculate REAL metrics based on actual Cal.com bookings and PRODUCTIVE calls only
  const metrics = useMemo(() => {
    // Actual Cal.com bookings (have a calcomBookingId - check for both null and undefined)
    const actualBookings = tasks.filter(t => t.calcomBookingId != null && t.calcomBookingId !== '');
    
    // Filter to PRODUCTIVE calls only (exclude short_call, robocall, spam, no_conversation)
    const productiveCalls = recordings.filter(r => 
      (r as any).callQuality === 'productive' || 
      (r as any).callQuality === null || 
      (r as any).callQuality === undefined
    );
    
    // Non-productive calls for reference
    const nonProductiveCalls = recordings.filter(r => 
      (r as any).callQuality && 
      (r as any).callQuality !== 'productive'
    );
    
    // Total calls (all recordings)
    const totalCalls = recordings.length;
    
    // Productive call count
    const productiveCallCount = productiveCalls.length;
    
    // Book rate = actual Cal.com bookings / PRODUCTIVE calls (not total calls)
    const bookRate = productiveCallCount > 0 ? (actualBookings.length / productiveCallCount) * 100 : 0;
    
    // Upcoming appointments (booked with future date)
    const now = new Date();
    const upcomingAppointments = actualBookings.filter(t => 
      t.appointmentTime && new Date(t.appointmentTime) > now
    );
    
    // Completed appointments (in the past)
    const completedAppointments = actualBookings.filter(t => 
      t.appointmentTime && new Date(t.appointmentTime) <= now
    );
    
    // Average call duration (of productive calls only)
    const avgCallDuration = productiveCalls.length > 0 
      ? productiveCalls.reduce((sum, r) => sum + (r.callDurationSeconds || 0), 0) / productiveCalls.length
      : 0;

    return {
      totalCalls,
      productiveCallCount,
      nonProductiveCallCount: nonProductiveCalls.length,
      actualBookings: actualBookings.length,
      bookRate,
      upcomingAppointments: upcomingAppointments.length,
      completedAppointments: completedAppointments.length,
      avgCallDuration,
      recentBookings: actualBookings.slice(0, 5),
    };
  }, [tasks, recordings]);

  // Calculate chart data - PRODUCTIVE Calls vs Bookings over time
  const chartData = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = getDaysBetween(start, end);

    return days.map((day) => {
      const dayStr = day.toISOString().split("T")[0];
      
      // PRODUCTIVE calls on this day only
      const dayCalls = recordings.filter((r) => {
        const recDate = new Date(r.createdAt).toISOString().split("T")[0];
        const isProductive = (r as any).callQuality === 'productive' || 
                            (r as any).callQuality === null || 
                            (r as any).callQuality === undefined;
        return recDate === dayStr && isProductive;
      });

      // All calls on this day (for comparison)
      const dayAllCalls = recordings.filter((r) => {
        const recDate = new Date(r.createdAt).toISOString().split("T")[0];
        return recDate === dayStr;
      });

      // Bookings created on this day (based on actual Cal.com booking)
      const dayBookings = tasks.filter((t) => {
        if (!t.calcomBookingId) return false;
        const taskDate = new Date(t.createdAt).toISOString().split("T")[0];
        return taskDate === dayStr;
      });

      return {
        date: day,
        label: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        calls: dayCalls.length,
        totalCalls: dayAllCalls.length,
        bookings: dayBookings.length,
      };
    });
  }, [tasks, recordings, startDate, endDate]);

  const maxValue = Math.max(...chartData.map((d) => Math.max(d.calls, d.bookings)), 1);

  const isLoading = tasksLoading || recordingsLoading;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Page title="Dashboard" subtitle="Track your booking performance">
      {/* Date Range Filter */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <div className="flex bg-white rounded-xl border border-gray-200 p-1">
          {DATE_RANGES.map((range) => (
            <button
              key={range.id}
              onClick={() => setSelectedRange(range.id)}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg transition
                ${selectedRange === range.id
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }
              `}
            >
              {range.label}
            </button>
          ))}
        </div>

        {selectedRange === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              aria-label="Start date"
              className="px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              aria-label="End date"
              className="px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>
        )}
      </div>

      {/* Main Stats Cards - Focus on BOOKING RATE */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Book Rate - Primary Metric (based on PRODUCTIVE calls) */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-100">Book Rate</p>
              <p className="text-4xl font-bold mt-1">
                {isLoading ? "..." : `${metrics.bookRate.toFixed(1)}%`}
              </p>
              <p className="text-xs text-emerald-200 mt-2">
                {isLoading ? "" : `${metrics.actualBookings} bookings / ${metrics.productiveCallCount} real calls`}
              </p>
            </div>
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
              <Target className="h-7 w-7 text-white" />
            </div>
          </div>
        </div>

        {/* Productive Calls (excludes spam/robocalls) */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Real Calls</p>
              <p className="text-3xl font-semibold text-gray-900 mt-1">
                {isLoading ? "..." : metrics.productiveCallCount}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {isLoading ? "" : (
                  metrics.nonProductiveCallCount > 0 
                    ? `+${metrics.nonProductiveCallCount} filtered (${metrics.totalCalls} total)` 
                    : `Avg: ${formatDuration(metrics.avgCallDuration)}`
                )}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Phone className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Cal.com Bookings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Bookings</p>
              <p className="text-3xl font-semibold text-gray-900 mt-1">
                {isLoading ? "..." : metrics.actualBookings}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Cal.com confirmed
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <CalendarCheck className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Upcoming</p>
              <p className="text-3xl font-semibold text-gray-900 mt-1">
                {isLoading ? "..." : metrics.upcomingAppointments}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {metrics.completedAppointments} completed
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Chart - Calls vs Bookings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Calls vs Bookings</h3>
            <p className="text-sm text-gray-500 mt-1">Track your conversion over time</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-gray-600">Calls</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-gray-600">Bookings</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-gray-500">
            Loading chart data...
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No data for selected period
          </div>
        ) : (
          <div className="h-64 flex items-end gap-1">
            {chartData.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                {/* Bars container */}
                <div className="w-full flex-1 flex items-end justify-center gap-0.5">
                  {/* Calls bar */}
                  <div
                    className="w-[45%] bg-purple-500 rounded-t transition-all duration-300 hover:bg-purple-600"
                    style={{
                      height: `${(day.calls / maxValue) * 100}%`,
                      minHeight: day.calls > 0 ? "4px" : "0",
                    }}
                    title={`${day.calls} calls`}
                  />
                  {/* Bookings bar */}
                  <div
                    className="w-[45%] bg-emerald-500 rounded-t transition-all duration-300 hover:bg-emerald-600"
                    style={{
                      height: `${(day.bookings / maxValue) * 100}%`,
                      minHeight: day.bookings > 0 ? "4px" : "0",
                    }}
                    title={`${day.bookings} bookings`}
                  />
                </div>
                {/* Label */}
                <span className="text-[10px] text-gray-400 mt-2 rotate-0">
                  {chartData.length <= 14 ? day.label : (i % Math.ceil(chartData.length / 7) === 0 ? day.label : "")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings - From Cal.com */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-emerald-500" />
              <h3 className="text-lg font-semibold text-gray-900">Recent Bookings</h3>
            </div>
            <Link 
              href="/dashboard/schedule" 
              className="text-sm text-[var(--color-primary)] hover:underline flex items-center gap-1"
            >
              View schedule <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : metrics.recentBookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CalendarCheck className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No bookings yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Bookings are created when a call leads to a Cal.com appointment
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.recentBookings.map((booking) => {
                const appointmentDate = booking.appointmentTime ? new Date(booking.appointmentTime) : null;
                const isPast = appointmentDate && appointmentDate < new Date();
                const info = booking.info as Record<string, unknown> | null;
                const customerName = info?.customerName as string || info?.name as string || 'Unknown Customer';
                
                return (
                  <Link
                    key={booking.id}
                    href={`/dashboard/tasks/${booking.id}`}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isPast ? 'bg-gray-200' : 'bg-emerald-100'
                      }`}>
                        {isPast ? (
                          <CheckCircle2 className="h-5 w-5 text-gray-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-emerald-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm group-hover:text-[var(--color-primary)]">
                          {customerName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {appointmentDate 
                            ? appointmentDate.toLocaleString('en-US', { 
                                weekday: 'short',
                                month: 'short', 
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })
                            : 'No date set'
                          }
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      isPast 
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {isPast ? 'Completed' : 'Upcoming'}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Calls */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-purple-500" />
              <h3 className="text-lg font-semibold text-gray-900">Recent Calls</h3>
            </div>
            <Link 
              href="/dashboard/recordings" 
              className="text-sm text-[var(--color-primary)] hover:underline flex items-center gap-1"
            >
              View all <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : recordings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Phone className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No calls recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recordings.slice(0, 5).map((recording) => {
                // Find if this call led to a booking
                const linkedLead = tasks.find(t => t.conversationId === recording.conversationId);
                const hasBooking = linkedLead?.calcomBookingId !== null;
                
                return (
                  <div
                    key={recording.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        hasBooking ? 'bg-emerald-100' : 'bg-gray-200'
                      }`}>
                        {hasBooking ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {formatDuration(recording.callDurationSeconds)} call
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(recording.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      hasBooking 
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {hasBooking ? 'Booked' : 'No booking'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}
