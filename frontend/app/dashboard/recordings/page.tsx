"use client";

import { useState, useMemo } from "react";
import { useRecordings, useSyncRecordings, useUpdateRecordingQuality } from "@/hooks/api/useRecording";
import { ChevronLeft, ChevronRight, Play, Loader2, ExternalLink, RefreshCw, ChevronDown, ChevronUp, Check, Bot, Phone, Ban, Zap } from "lucide-react";
import { Page } from "@/components/dashboard/Page";
import { DBRecording, CallQuality } from "@/lib/shared-types";
import { getRecordingAudio } from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Call quality display configuration
const QUALITY_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: typeof Check }> = {
  productive: { label: "Productive", color: "text-green-700", bgColor: "bg-green-100", icon: Check },
  short_call: { label: "Short Call", color: "text-yellow-700", bgColor: "bg-yellow-100", icon: Zap },
  no_conversation: { label: "No Conversation", color: "text-orange-700", bgColor: "bg-orange-100", icon: Phone },
  robocall: { label: "Robocall", color: "text-red-700", bgColor: "bg-red-100", icon: Bot },
  spam: { label: "Spam", color: "text-muted-foreground", bgColor: "bg-muted", icon: Ban },
};

const QUALITY_OPTIONS = [
  { value: "productive", label: "Productive" },
  { value: "short_call", label: "Short Call" },
  { value: "no_conversation", label: "No Conversation" },
  { value: "robocall", label: "Robocall" },
  { value: "spam", label: "Spam" },
];

export default function RecordingsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [audioUrls, setAudioUrls] = useState<Map<string, string>>(new Map());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingQualityId, setEditingQualityId] = useState<string | null>(null);
  
  const filters = useMemo(() => ({
    page,
    limit: 20,
  }), [page]);
  
  const { data, isLoading, refetch } = useRecordings(filters);
  const syncRecordings = useSyncRecordings();
  const updateQuality = useUpdateRecordingQuality();

  const handleQualityChange = async (recordingId: string, newQuality: string) => {
    try {
      await updateQuality.mutateAsync({ recordingId, callQuality: newQuality });
      toast.success('Call quality updated');
      setEditingQualityId(null);
      refetch();
    } catch (error) {
      toast.error('Failed to update call quality');
    }
  };

  const handleSync = async () => {
    try {
      const result = await syncRecordings.mutateAsync();
      if (result.synced > 0) {
        toast.success(`Synced ${result.synced} new recording(s)`);
        refetch();
      } else {
        toast.info('No new recordings to sync');
      }
    } catch (error) {
      toast.error('Failed to sync recordings');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handlePlayAudio = async (recording: DBRecording) => {
    // If already have audio URL, just play
    if (audioUrls.has(recording.id)) {
      setPlayingId(recording.id);
      return;
    }

    // Fetch audio
    setLoadingId(recording.id);
    try {
      const result = await getRecordingAudio(recording.conversationId);
      
      if (result.success && result.audio) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(result.audio), c => c.charCodeAt(0))],
          { type: result.contentType }
        );
        const url = URL.createObjectURL(audioBlob);
        setAudioUrls(prev => new Map(prev).set(recording.id, url));
        setPlayingId(recording.id);
      } else {
        toast.error(result.error || 'Failed to load audio');
      }
    } catch (error) {
      toast.error('Failed to load audio');
      console.error(error);
    } finally {
      setLoadingId(null);
    }
  };

  const handleAudioEnded = () => {
    setPlayingId(null);
  };

  const handleRowClick = (recording: DBRecording, e: React.MouseEvent) => {
    // Don't navigate if clicking on audio controls or expand button
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('audio')) {
      return;
    }
    
    if (recording.taskInstanceId) {
      router.push(`/dashboard/tasks/${recording.taskInstanceId}`);
    }
  };

  if (isLoading) {
    return (
      <Page title="Recordings" subtitle="Listen to call recordings">
        <div className="text-center text-muted-foreground">Loading recordings...</div>
      </Page>
    );
  }

  const recordings = data?.data || [];
  const pagination = data?.pagination;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Page title="Recordings" subtitle="Listen to call recordings">
      {/* Sync Button */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={handleSync}
          disabled={syncRecordings.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${syncRecordings.isPending ? 'animate-spin' : ''}`} />
          {syncRecordings.isPending ? 'Syncing...' : 'Sync Recordings'}
        </button>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Quality
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Summary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Audio
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {recordings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="space-y-2">
                      <p>No recordings found</p>
                      <p className="text-sm">Click &quot;Sync Recordings&quot; to pull recent call recordings</p>
                    </div>
                  </td>
                </tr>
              ) : (
                recordings.map((recording: DBRecording) => {
                  const isExpanded = expandedIds.has(recording.id);
                  const hasSummary = !!recording.transcriptSummary;
                  
                  return (
                    <tr 
                      key={recording.id} 
                      onClick={(e) => handleRowClick(recording, e)}
                      className={`hover:bg-accent ${recording.taskInstanceId ? 'cursor-pointer' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm text-foreground">
                          {new Date(recording.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(recording.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-foreground">
                        {formatDuration(recording.callDurationSeconds)}
                      </td>
                      <td className="px-6 py-4">
                        {editingQualityId === recording.id ? (
                          <select
                            value={(recording as any).callQuality || 'productive'}
                            onChange={(e) => {
                              handleQualityChange(recording.id, e.target.value);
                            }}
                            onBlur={() => setEditingQualityId(null)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                            className="text-xs px-2 py-1 border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-transparent"
                          >
                            {QUALITY_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingQualityId(recording.id);
                            }}
                            className={`
                              inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full
                              transition hover:opacity-80
                              ${QUALITY_CONFIG[(recording as any).callQuality || 'productive']?.bgColor || 'bg-muted'}
                              ${QUALITY_CONFIG[(recording as any).callQuality || 'productive']?.color || 'text-muted-foreground'}
                            `}
                          >
                            {(() => {
                              const config = QUALITY_CONFIG[(recording as any).callQuality || 'productive'];
                              const Icon = config?.icon || Check;
                              return <Icon className="h-3 w-3" />;
                            })()}
                            {QUALITY_CONFIG[(recording as any).callQuality || 'productive']?.label || 'Productive'}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          {hasSummary ? (
                            <>
                              {/* Expand button and summary preview in one row */}
                              <div className="flex items-start gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(recording.id);
                                  }}
                                  className={`
                                    flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition flex-shrink-0
                                    ${isExpanded
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted text-muted-foreground hover:bg-accent'
                                    }
                                  `}
                                  aria-label={isExpanded ? 'Collapse summary' : 'Expand summary'}
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="h-3 w-3" />
                                      Hide
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-3 w-3" />
                                      Show
                                    </>
                                  )}
                                </button>
                                {!isExpanded && (
                                  <div className="text-sm text-muted-foreground truncate max-w-sm">
                                    {recording.transcriptSummary}
                                  </div>
                                )}
                                {recording.taskInstanceId && (
                                  <ExternalLink className="h-4 w-4 text-muted-foreground/70 flex-shrink-0 ml-auto" />
                                )}
                              </div>
                              {/* Expanded summary */}
                              {isExpanded && (
                                <div className="text-sm text-foreground/80 bg-muted rounded-lg p-3 border border-border mt-1">
                                  {recording.transcriptSummary}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground/70 italic">No summary available</span>
                              {recording.taskInstanceId && (
                                <ExternalLink className="h-4 w-4 text-muted-foreground/70 flex-shrink-0 ml-auto" />
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {loadingId === recording.id ? (
                          <button
                            disabled
                            className="p-2 text-muted-foreground/70 rounded-lg"
                            aria-label="Loading audio"
                          >
                            <Loader2 className="h-5 w-5 animate-spin" />
                          </button>
                        ) : playingId === recording.id ? (
                          <div className="flex items-center gap-2">
                            <audio
                              src={audioUrls.get(recording.id)}
                              controls
                              autoPlay
                              onEnded={handleAudioEnded}
                              className="h-8"
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => handlePlayAudio(recording)}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition"
                            aria-label="Play recording"
                          >
                            <Play className="h-5 w-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-card">
            <div className="text-sm text-foreground/80">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={!pagination.hasPrevPage}
                className="px-3 py-1 border border-border rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={!pagination.hasNextPage}
                className="px-3 py-1 border border-border rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
