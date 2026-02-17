'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Info, ArrowUpRight } from 'lucide-react';

export interface DispositionBreakdown {
  dispositionId: string | null;
  label: string;
  color: string;
  count: number;
}

interface CallStatusChartProps {
  data: DispositionBreakdown[];
  isLoading?: boolean;
  onViewCalls?: () => void;
}

const CHART_COLORS = [
  '#4F46E5',
  '#059669',
  '#D97706',
  '#DC2626',
  '#7C3AED',
  '#0891B2',
  '#BE185D',
  '#6B7280',
];

export function CallStatusChart({ data, isLoading, onViewCalls }: CallStatusChartProps) {
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 h-[340px] flex flex-col">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">Call Status</h3>
          <Info className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <div className="flex-1 bg-muted/50 rounded-lg animate-pulse mt-3" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 h-[340px] flex flex-col">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">Call Status</h3>
          <Info className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          No call data for this period
        </div>
      </div>
    );
  }

  const totalCalls = data.reduce((sum, item) => sum + item.count, 0);

  const chartData = data.map((item, index) => ({
    name: item.label,
    value: item.count,
    color: item.color || CHART_COLORS[index % CHART_COLORS.length],
    count: item.count,
    percentage: totalCalls > 0 ? Math.round((item.count / totalCalls) * 100) : 0,
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-5 h-[340px] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Call Status</h3>
          <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
        </div>
        <span className="text-xs text-muted-foreground">{totalCalls} total calls</span>
      </div>

      <div className="flex-1 flex items-center">
        <div className="relative w-[180px] h-[180px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
                itemStyle={{ color: '#0a0a0a', fontSize: '12px' }}
                formatter={(value, name, props) => {
                  const percentage = (props as { payload?: { percentage?: number } }).payload?.percentage || 0;
                  return [`${value} calls (${percentage}%)`, name as string];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-semibold text-foreground">{totalCalls}</span>
            <span className="text-xs text-muted-foreground">total</span>
          </div>
        </div>

        <div className="flex-1 pl-6 space-y-2.5">
          {chartData.slice(0, 6).map((item, index) => (
            <div
              key={index}
              className="w-full flex items-center justify-between text-sm -mx-2 px-2 py-1 rounded"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-foreground/80 truncate max-w-[120px]">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-foreground font-medium tabular-nums">
                  {item.count}
                </span>
                <span className="text-muted-foreground text-xs tabular-nums w-8 text-right">
                  {item.percentage}%
                </span>
              </div>
            </div>
          ))}
          {chartData.length > 6 && (
            <div className="text-xs text-muted-foreground pt-1">
              +{chartData.length - 6} more
            </div>
          )}
        </div>
      </div>

      {onViewCalls && data.length > 0 && (
        <div className="mt-auto pt-3 border-t border-border">
          <button
            onClick={onViewCalls}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
          >
            View calls
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
