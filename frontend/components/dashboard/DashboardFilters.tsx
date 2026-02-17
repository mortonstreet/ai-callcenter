'use client';

import { Download } from 'lucide-react';

export type DateRange = 'today' | 'week' | 'month';

interface DashboardFiltersProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onExport?: () => void;
}

export function DashboardFilters({
  dateRange,
  onDateRangeChange,
  onExport,
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
        <button
          onClick={() => onDateRangeChange('today')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
            dateRange === 'today'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Today
        </button>
        <button
          onClick={() => onDateRangeChange('week')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
            dateRange === 'week'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          This Week
        </button>
        <button
          onClick={() => onDateRangeChange('month')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
            dateRange === 'month'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          This Month
        </button>
      </div>

      {onExport && (
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-border bg-card hover:bg-muted transition"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      )}
    </div>
  );
}
