"use client";

import { useState, useMemo } from "react";
import { useRecordings } from "@/hooks/api/useRecording";
import { ChevronLeft, ChevronRight, Play, Loader2, ExternalLink } from "lucide-react";
import { Page } from "@/components/dashboard/Page";
import { DBRecording } from "@shared/types/src";
import { getRecordingAudio } from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function RecordingsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [audioUrls, setAudioUrls] = useState<Map<string, string>>(new Map());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  const filters = useMemo(() => ({
    page,
    limit: 20,
  }), [page]);
  
  const { data, isLoading } = useRecordings(filters);

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
    // Don't navigate if clicking on audio controls
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
        <div className="text-center text-gray-500">Loading recordings...</div>
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
      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Summary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Audio
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recordings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No recordings found
                  </td>
                </tr>
              ) : (
                recordings.map((recording: DBRecording) => (
                  <tr 
                    key={recording.id} 
                    onClick={(e) => handleRowClick(recording, e)}
                    className={`hover:bg-gray-50 ${recording.taskInstanceId ? 'cursor-pointer' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {new Date(recording.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(recording.createdAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDuration(recording.callDurationSeconds)}
                    </td>
                    <td 
                      className="px-6 py-4 relative"
                      onMouseEnter={() => setHoveredId(recording.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-gray-900 max-w-md truncate">
                          {recording.transcriptSummary || 'No summary available'}
                        </div>
                        {recording.taskInstanceId && (
                          <ExternalLink className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                      {hoveredId === recording.id && recording.transcriptSummary && (
                        <div className="absolute z-10 left-6 right-6 top-full mt-1 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg max-w-2xl">
                          {recording.transcriptSummary}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {loadingId === recording.id ? (
                        <button
                          disabled
                          className="p-2 text-gray-400 rounded-lg"
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
                          className="p-2 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-lg transition"
                          aria-label="Play recording"
                        >
                          <Play className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={!pagination.hasPrevPage}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={!pagination.hasNextPage}
                className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
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
