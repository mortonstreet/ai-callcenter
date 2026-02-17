'use client';

import { Phone, UserPlus, CheckCircle2, Users, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface ActivityItem {
  id: string;
  type: 'call' | 'lead_added' | 'lead_updated' | 'task_completed' | 'campaign_created';
  userId: string;
  userName: string;
  description: string;
  metadata: {
    leadId?: string;
    leadName?: string;
    campaignId?: string;
    campaignName?: string;
    taskId?: string;
    callDuration?: number;
    disposition?: string;
  };
  createdAt: string;
}

interface ActivityFeedProps {
  data?: ActivityItem[];
  isLoading: boolean;
  filter?: 'all' | 'calls' | 'leads' | 'tasks';
  onFilterChange?: (filter: 'all' | 'calls' | 'leads' | 'tasks') => void;
  onRefresh?: () => void;
}

function getActivityIcon(type: ActivityItem['type']) {
  switch (type) {
    case 'call':
      return <Phone className="h-4 w-4 text-blue-500" />;
    case 'lead_added':
    case 'lead_updated':
      return <UserPlus className="h-4 w-4 text-green-500" />;
    case 'task_completed':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    default:
      return <Users className="h-4 w-4 text-muted-foreground" />;
  }
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function ActivityFeed({
  data = [],
  isLoading,
  filter = 'all',
  onFilterChange,
  onRefresh,
}: ActivityFeedProps) {
  const filterOptions: { value: 'all' | 'calls' | 'leads' | 'tasks'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'calls', label: 'Calls' },
    { value: 'leads', label: 'Leads' },
    { value: 'tasks', label: 'Tasks' },
  ];

  return (
    <div className="bg-card border border-border rounded-xl">
      <div className="flex items-center justify-between p-5 pb-3">
        <h3 className="text-base font-semibold text-foreground">Activity Feed</h3>
        <div className="flex items-center gap-2">
          {onFilterChange && (
            <select
              value={filter}
              onChange={(e) => onFilterChange(e.target.value as typeof filter)}
              className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-md hover:bg-muted transition"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
      <div className="px-5 pb-5 max-h-[400px] overflow-y-auto scrollbar-minimal">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No recent activity
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  {getActivityIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {item.description}
                    {item.metadata.callDuration ? (
                      <span className="ml-2 text-muted-foreground">
                        - {formatDuration(item.metadata.callDuration)}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    {item.metadata.disposition && (
                      <span className="ml-2 text-emerald-500">{item.metadata.disposition}</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
