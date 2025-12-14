"use client";

import { useState, useMemo } from "react";
import { Page } from "@/components/dashboard/Page";
import { useTaskInstancesForAnalytics } from "@/hooks/api/useTask";
import { useRecordingsForAnalytics } from "@/hooks/api/useRecording";
import { useAgents } from "@/hooks/api/useAgent";
import { ListTodo, Video, Bot, TrendingUp, Calendar, Gauge } from "lucide-react";
import { cardStyles } from "@/components/ui/Card";

type DateRange = "24h" | "7d" | "30d" | "custom";

const DATE_RANGES: { id: DateRange; label: string }[] = [
  { id: "24h", label: "24 Hours" },
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "30 Days" },
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
  const { data: agents, isLoading: agentsLoading } = useAgents();

  const tasks = tasksData?.data || [];
  const recordings = recordingsData?.data || [];

  // Calculate chart data
  const chartData = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = getDaysBetween(start, end);

    return days.map((day) => {
      const dayStr = day.toISOString().split("T")[0];
      
      const dayTasks = tasks.filter((t) => {
        const taskDate = new Date(t.createdAt).toISOString().split("T")[0];
        return taskDate === dayStr;
      });

      const dayRecordings = recordings.filter((r) => {
        const recDate = new Date(r.createdAt).toISOString().split("T")[0];
        return recDate === dayStr;
      });

      return {
        date: day,
        label: day.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        tasks: dayTasks.length,
        recordings: dayRecordings.length,
      };
    });
  }, [tasks, recordings, startDate, endDate]);

  const maxValue = Math.max(...chartData.map((d) => Math.max(d.tasks, d.recordings)), 1);

  const isLoading = tasksLoading || recordingsLoading || agentsLoading;

  return (
    <Page title="Dashboard" subtitle="Overview of your organization's activity">
      {/* Date Range Filter */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <div className={`flex gap-1 items-center ${cardStyles} p-1`}>
          {DATE_RANGES.map((range) => (
            <button
              key={range.id}
              onClick={() => setSelectedRange(range.id)}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg cursor-pointer active:bg-gray-100
                ${selectedRange === range.id
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }
              `}
            >
              {range.label}
            </button>
          ))}
          {selectedRange === "custom" && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                aria-label="Start date"
                className="px-3 py-1.5 text-sm text-gray-900 bg-gray-50 border-[0.5px] border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                aria-label="End date"
                className="px-3 py-1.5 text-sm text-gray-900 bg-gray-50 border-[0.5px] border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className={`${cardStyles} p-6`}>
          <div className="flex items-center gap-2 mb-1">
            <ListTodo className="h-4 w-4 text-gray-500" />
            <p className="text-sm font-medium text-gray-500">Total Tasks</p>
          </div>
          <p className="text-3xl font-semibold text-gray-900">
            {isLoading ? "..." : tasks.length}
          </p>
        </div>

        <div className={`${cardStyles} p-6`}>
          <div className="flex items-center gap-2 mb-1">
            <Video className="h-4 w-4 text-gray-500" />
            <p className="text-sm font-medium text-gray-500">Total Recordings</p>
          </div>
          <p className="text-3xl font-semibold text-gray-900">
            {isLoading ? "..." : recordings.length}
          </p>
        </div>

        <div className={`${cardStyles} p-6`}>
          <div className="flex items-center gap-2 mb-1">
            <Gauge className="h-4 w-4 text-gray-500" />
            <p className="text-sm font-medium text-gray-500">Efficiency</p>
          </div>
          <p className="text-3xl font-semibold text-gray-900">
            {isLoading ? "..." : recordings.length === 0 ? "N/A" : `${Math.round((tasks.length / recordings.length) * 100)}%`}
          </p>
          <p className="text-xs text-gray-400 mt-1">Task to recording ratio</p>
        </div>

        <div className={`${cardStyles} p-6`}>
          <div className="flex items-center gap-2 mb-1">
            <Bot className="h-4 w-4 text-gray-500" />
            <p className="text-sm font-medium text-gray-500">Active Agents</p>
          </div>
          <p className="text-3xl font-semibold text-gray-900">
            {isLoading ? "..." : agents?.length || 0}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className={`${cardStyles} p-6`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Activity Overview</h3>
            <p className="text-sm text-gray-500 mt-1">Tasks and recordings over time</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-gray-600">Tasks</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-gray-600">Recordings</span>
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
                  {/* Tasks bar */}
                  <div
                    className="w-[45%] bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                    style={{
                      height: `${(day.tasks / maxValue) * 100}%`,
                      minHeight: day.tasks > 0 ? "4px" : "0",
                    }}
                    title={`${day.tasks} tasks`}
                  />
                  {/* Recordings bar */}
                  <div
                    className="w-[45%] bg-purple-500 rounded-t transition-all duration-300 hover:bg-purple-600"
                    style={{
                      height: `${(day.recordings / maxValue) * 100}%`,
                      minHeight: day.recordings > 0 ? "4px" : "0",
                    }}
                    title={`${day.recordings} recordings`}
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

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Recent Tasks */}
        <div className={`${cardStyles} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Tasks</h3>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No tasks yet</div>
          ) : (
            <div className="space-y-3">
              {tasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{task.taskName}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(task.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      task.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : task.status === "failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Recordings */}
        <div className={`${cardStyles} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Recordings</h3>
            <Calendar className="h-5 w-5 text-gray-400" />
          </div>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : recordings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No recordings yet</div>
          ) : (
            <div className="space-y-3">
              {recordings.slice(0, 5).map((recording) => (
                <div
                  key={recording.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 text-sm truncate max-w-[200px]">
                      {recording.conversationId}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(recording.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {recording.callDurationSeconds ? `${Math.round(recording.callDurationSeconds)}s` : "-"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}

