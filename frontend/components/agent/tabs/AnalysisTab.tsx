"use client";

import { useState } from "react";
import { Loader2, Phone, Clock, DollarSign, TrendingUp } from "lucide-react";
import { useAgentAnalytics } from "@/hooks/api/useAgent";

interface AnalysisTabProps {
  agentId: string;
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-medium text-foreground">Calls Over Time</h3>
      <div className="flex items-end gap-1 h-40">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-[#1b191a] rounded-t-md transition-all duration-300"
              style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 4 : 0 }}
            />
            <span className="text-[10px] text-muted-foreground truncate w-full text-center">
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalysisTab({ agentId }: AnalysisTabProps) {
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);

  const { data: analytics, isLoading } = useAgentAnalytics(agentId, startDate, endDate);

  const totalCalls = analytics?.totalCalls ?? 0;
  const avgDuration = analytics?.avgDuration ?? 0;
  const totalCost = analytics?.totalCost ?? 0;
  const avgCost = analytics?.avgCost ?? 0;
  const productiveCalls = analytics?.productiveCalls ?? 0;
  const successRate = totalCalls > 0 ? ((productiveCalls / totalCalls) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      {/* Date Range */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-border"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-border"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard icon={Phone} label="Total Calls" value={totalCalls.toLocaleString()} />
            <MetricCard
              icon={Clock}
              label="Avg Duration"
              value={`${Math.round(avgDuration)}s`}
            />
            <MetricCard
              icon={DollarSign}
              label="Total Cost"
              value={`$${totalCost.toFixed(2)}`}
            />
            <MetricCard
              icon={DollarSign}
              label="Avg Cost"
              value={`$${avgCost.toFixed(2)}`}
            />
          </div>

          {/* Success Rate */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Success Rate</span>
            </div>
            <p className="text-2xl font-semibold text-foreground">{successRate}%</p>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1b191a] rounded-full transition-all duration-500"
                style={{ width: `${successRate}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {productiveCalls} productive out of {totalCalls} total calls
            </p>
          </div>

          {/* Time Series Chart */}
          {analytics?.timeSeries && analytics.timeSeries.length > 0 && (
            <BarChart
              data={analytics.timeSeries.map((item: any) => ({
                label: item.date ?? item.label ?? "",
                value: item.calls ?? item.value ?? 0,
              }))}
            />
          )}
        </>
      )}
    </div>
  );
}
