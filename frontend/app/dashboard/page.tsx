'use client';

import { useState, useMemo } from 'react';
import { useCallAnalytics, useActivityFeed } from '@/hooks/api/useAnalytics';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns';

import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { MetricCards } from '@/components/dashboard/MetricCards';
import { MobileQuickStats } from '@/components/dashboard/MobileQuickStats';
import { CallsOverTimeChart } from '@/components/dashboard/CallsOverTimeChart';
import { CallStatusChart } from '@/components/dashboard/CallStatusChart';
import { DashboardFilters, type DateRange } from '@/components/dashboard/DashboardFilters';

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>('week');
  const [activityFilter, setActivityFilter] = useState<'all' | 'calls' | 'leads' | 'tasks'>('all');

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return {
          startDate: startOfDay(now).toISOString(),
          endDate: endOfDay(now).toISOString(),
        };
      case 'week':
        return {
          startDate: startOfWeek(now, { weekStartsOn: 1 }).toISOString(),
          endDate: endOfWeek(now, { weekStartsOn: 1 }).toISOString(),
        };
      case 'month':
        return {
          startDate: startOfMonth(now).toISOString(),
          endDate: endOfMonth(now).toISOString(),
        };
    }
  }, [dateRange]);

  const {
    data: analyticsData,
    isLoading: isLoadingAnalytics,
  } = useCallAnalytics({ startDate, endDate });

  const analytics = analyticsData?.data;

  const {
    data: activityData,
    isLoading: isLoadingActivity,
    refetch: refetchActivity,
  } = useActivityFeed({ type: activityFilter });

  const handleExport = () => {
    if (!analytics) return;

    const rows = [
      ['Metric', 'Value'],
      ['Total Calls', analytics.metrics.totalCalls.toString()],
      ['Outbound Calls', analytics.metrics.outboundCalls.toString()],
      ['Inbound Calls', analytics.metrics.inboundCalls.toString()],
      ['Connected Calls', analytics.metrics.connectedCalls.toString()],
      ['Connection Rate', `${analytics.metrics.connectionRate}%`],
      ['Total Talk Time (seconds)', analytics.metrics.totalTalkTimeSeconds.toString()],
      ['Avg Call Duration (seconds)', analytics.metrics.avgCallDurationSeconds.toString()],
    ];

    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-analytics-${dateRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-4xl md:text-5xl tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Analytics, activity, and insights at a glance
          </p>
        </div>
        <DashboardFilters
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onExport={handleExport}
        />
      </div>

      {/* Metrics Row - Mobile shows simplified 2x2 grid */}
      <div className="mb-6 sm:hidden">
        <MobileQuickStats
          metrics={analytics?.metrics || {
            totalCalls: 0,
            outboundCalls: 0,
            inboundCalls: 0,
            connectedCalls: 0,
            connectionRate: 0,
            totalTalkTimeSeconds: 0,
            avgCallDurationSeconds: 0,
          }}
          isLoading={isLoadingAnalytics}
        />
      </div>

      {/* Metrics Row - Desktop shows full cards */}
      <div className="mb-6 hidden sm:block">
        <MetricCards
          metrics={analytics?.metrics || {
            totalCalls: 0,
            outboundCalls: 0,
            inboundCalls: 0,
            connectedCalls: 0,
            connectionRate: 0,
            totalTalkTimeSeconds: 0,
            avgCallDurationSeconds: 0,
          }}
          isLoading={isLoadingAnalytics}
        />
      </div>

      {/* Charts Row */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <CallsOverTimeChart
          data={analytics?.callsOverTime || []}
          isLoading={isLoadingAnalytics}
        />
        <CallStatusChart
          data={analytics?.dispositionBreakdown || []}
          isLoading={isLoadingAnalytics}
        />
      </div>

      {/* Activity Row */}
      <div className="mb-6">
        <ActivityFeed
          data={activityData?.items}
          isLoading={isLoadingActivity}
          filter={activityFilter}
          onFilterChange={setActivityFilter}
          onRefresh={() => refetchActivity()}
        />
      </div>
    </div>
  );
}
