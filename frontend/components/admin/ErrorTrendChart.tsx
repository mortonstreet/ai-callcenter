"use client";

import { useAdminErrorLogStats } from "@/hooks/api/useErrorLogs";
import { useMemo } from "react";

export default function ErrorTrendChart() {
  const endDate = useMemo(() => new Date().toISOString(), []);
  const startDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString();
  }, []);

  const { data, isLoading } = useAdminErrorLogStats({ startDate, endDate, groupBy: "day" });

  const chartData = useMemo(() => {
    const days: { date: string; label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const match = data?.data?.find((s) => s.date?.startsWith(dateStr));
      days.push({ date: dateStr, label, count: match?.count || 0 });
    }
    return days;
  }, [data]);

  const maxCount = Math.max(...chartData.map((d) => d.count), 1);

  if (isLoading) {
    return (
      <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
        Loading trend data...
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4 mb-6">
      <h4 className="text-sm font-medium text-foreground mb-3">Error Trend (Last 14 Days)</h4>
      <div className="h-32 flex items-end gap-1">
        {chartData.map((day) => (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-red-400 rounded-t transition-all duration-300 hover:bg-red-500"
              style={{
                height: `${(day.count / maxCount) * 100}%`,
                minHeight: day.count > 0 ? "4px" : "0",
              }}
              title={`${day.label}: ${day.count} errors`}
            />
            <span className="text-[9px] text-muted-foreground/70 truncate w-full text-center">
              {day.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
