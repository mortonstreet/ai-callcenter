/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { use, useState } from "react";
import { Page } from "@/components/dashboard/Page";
import { useTaskInstance, useUpdateTaskInstanceStatus } from "@/hooks/api/useTask";
import { ArrowLeft, Calendar, User, Clock, Play, Loader2, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { TaskStatus, TaskField } from "@shared/types/src";
import { getRecordingAudio } from "../../recordings/actions";
import { toast } from "sonner";

const STATUS_OPTIONS = Object.values(TaskStatus);

const STATUS_COLORS: Record<string, string> = {
  [TaskStatus.PENDING]: "bg-yellow-100 text-yellow-800",
  [TaskStatus.DISPATCHED]: "bg-blue-100 text-blue-800",
  [TaskStatus.IN_PROGRESS]: "bg-purple-100 text-purple-800",
  [TaskStatus.COMPLETED]: "bg-green-100 text-green-800",
  [TaskStatus.CANCELLED]: "bg-gray-100 text-gray-800",
};

export default function TaskInstanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  
  const { data, isLoading } = useTaskInstance(id);
  const updateStatus = useUpdateTaskInstanceStatus();

  const taskInstance = data?.taskInstance;
  const task = data?.task;
  const recording = data?.recording;

  const handleStatusChange = async (newStatus: string) => {
    await updateStatus.mutateAsync({ id, status: newStatus });
  };

  const handlePlayAudio = async () => {
    if (!recording?.conversationId) return;

    if (audioUrl) {
      setPlayingAudio(true);
      return;
    }

    setLoadingAudio(true);
    try {
      const result = await getRecordingAudio(recording.conversationId);
      
      if (result.success && result.audio) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(result.audio), c => c.charCodeAt(0))],
          { type: result.contentType }
        );
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setPlayingAudio(true);
      } else {
        toast.error(result.error || 'Failed to load audio');
      }
    } catch (error) {
      toast.error('Failed to load audio');
      console.error(error);
    } finally {
      setLoadingAudio(false);
    }
  };

  if (isLoading) {
    return (
      <Page title="Task Instance" subtitle="Loading...">
        <div className="text-center text-gray-500">Loading task instance...</div>
      </Page>
    );
  }

  if (!taskInstance || !task) {
    return (
      <Page title="Task Instance" subtitle="Not found">
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">Task instance not found</p>
          <button
            onClick={() => router.push('/dashboard/tasks')}
            className="text-[var(--color-primary)] hover:underline"
          >
            Back to tasks
          </button>
        </div>
      </Page>
    );
  }

  const formatDate = (dateInput: string | Date) => {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
    };
  };

  const createdDate = formatDate(taskInstance.createdAt);
  const updatedDate = formatDate(taskInstance.updatedAt);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Parse task required info (it's stored as requiredInfo, not fields)
  const taskFields: TaskField[] = taskInstance.requiredInfo ? 
    (typeof taskInstance.requiredInfo === 'string' ? JSON.parse(taskInstance.requiredInfo) : taskInstance.requiredInfo) 
    : [];
  const collectedInfo = (taskInstance.info || {}) as Record<string, any>;
  
  // If no task fields are defined, create fields from collected info
  const displayFields: TaskField[] = taskFields.length > 0 
    ? taskFields 
    : Object.keys(collectedInfo).map(key => ({
        name: key.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        nameSlug: key,
        type: typeof collectedInfo[key] as any,
        description: '',
      }));

  // Parse transcript from recording payload
  let transcript: any[] = [];
  if (recording?.payload) {
    try {
      const payload = typeof recording.payload === 'string' ? JSON.parse(recording.payload) : recording.payload;
      transcript = payload?.data?.transcript || [];
    } catch (e) {
      console.error('Failed to parse recording payload', e);
    }
  }

  return (
    <Page 
      title={task.name} 
      subtitle={`Task Instance: ${id.slice(0, 8)}...`}
    >
      <button
        onClick={() => router.push('/dashboard/tasks')}
        className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tasks
      </button>

      <div className="grid gap-6">
        {/* Details Card with Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
          
          {/* Status Selector */}
          <div className="mb-6">
            <div className="text-sm font-medium text-gray-700 mb-2">Status</div>
            <select
              value={taskInstance.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updateStatus.isPending}
              aria-label="Task status"
              className={`px-4 py-2 text-sm font-medium rounded-full border-0 cursor-pointer ${
                STATUS_COLORS[taskInstance.status] || "bg-gray-100 text-gray-800"
              }`}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-gray-700">Assigned to</div>
                <div className="text-sm text-gray-900">
                  {taskInstance.dispatcherName || taskInstance.dispatcherEmail || "Unassigned"}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-gray-700">Created</div>
                <div className="text-sm text-gray-900">
                  {createdDate.date} at {createdDate.time}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-gray-700">Last Updated</div>
                <div className="text-sm text-gray-900">
                  {updatedDate.date} at {updatedDate.time}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 md:col-span-2 lg:col-span-3">
              <MessageSquare className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-700">Conversation ID</div>
                <div className="text-sm text-gray-900 font-mono break-all">
                  {taskInstance.conversationId}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Collected Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Collected Information</h2>
          {displayFields.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayFields.map((field, index) => {
                // Use field.nameSlug to match with collected info keys
                const fieldValue = collectedInfo[field.nameSlug];
                return (
                  <div key={index} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-sm font-medium text-gray-900">
                        {field.name}
                      </div>
                      <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {field.type}
                      </div>
                    </div>
                    {field.description && (
                      <div className="text-xs text-gray-500 mb-2">
                        {field.description}
                      </div>
                    )}
                    <div className="text-sm text-gray-900 mt-2">
                      {fieldValue !== undefined && fieldValue !== null
                        ? typeof fieldValue === 'object'
                          ? <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">{JSON.stringify(fieldValue, null, 2)}</pre>
                          : <div className="break-words">{String(fieldValue)}</div>
                        : <span className="text-gray-400 italic">Not collected</span>
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No information collected for this task</p>
            </div>
          )}
        </div>

        {/* Recording Section */}
        {recording && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recording</h2>
            <div className="space-y-4">
              {/* Call Duration */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Call Duration</div>
                <div className="text-sm text-gray-900">
                  {formatDuration(recording.callDurationSeconds)}
                </div>
              </div>

              {/* Summary */}
              {recording.transcriptSummary && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Summary</div>
                  <div className="text-sm text-gray-900">
                    {recording.transcriptSummary}
                  </div>
                </div>
              )}

              {/* Audio Player */}
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">Audio</div>
                {playingAudio && audioUrl ? (
                  <audio
                    src={audioUrl}
                    controls
                    autoPlay
                    onEnded={() => setPlayingAudio(false)}
                    className="w-full"
                  />
                ) : (
                  <button
                    onClick={handlePlayAudio}
                    disabled={loadingAudio}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
                  >
                    {loadingAudio ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Play Recording
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Transcript Section */}
        {transcript.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversation Transcript</h2>
            <div className="space-y-4">
              {transcript.map((turn: any, index: number) => {
                const isAgent = turn.role === 'agent';
                const hasToolCalls = turn.tool_calls && turn.tool_calls.length > 0;
                const hasToolResults = turn.tool_results && turn.tool_results.length > 0;
                
                return (
                  <div key={index} className={`flex gap-3 ${isAgent ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] ${isAgent ? 'order-1' : 'order-2'}`}>
                      {/* Role Label */}
                      <div className={`text-xs font-medium mb-1 ${isAgent ? 'text-blue-600' : 'text-green-600'}`}>
                        {isAgent ? 'Agent' : 'User'}
                        {turn.time_in_call_secs !== undefined && (
                          <span className="ml-2 text-gray-500">
                            {Math.floor(turn.time_in_call_secs / 60)}:{(turn.time_in_call_secs % 60).toString().padStart(2, '0')}
                          </span>
                        )}
                      </div>
                      
                      {/* Message */}
                      {turn.message && (
                        <div className={`rounded-lg p-3 ${
                          isAgent ? 'bg-blue-50 text-gray-900' : 'bg-green-50 text-gray-900'
                        }`}>
                          {turn.message}
                        </div>
                      )}

                      {/* Tool Calls */}
                      {hasToolCalls && (
                        <div className="mt-2 space-y-1">
                          {turn.tool_calls.map((toolCall: any, idx: number) => (
                            <div key={idx} className="text-xs bg-purple-50 text-purple-900 rounded p-2">
                              <div className="font-medium">🔧 Tool Call: {toolCall.tool_name}</div>
                              {toolCall.params_as_json && (
                                <div className="mt-1 font-mono text-xs">
                                  {toolCall.params_as_json}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Tool Results */}
                      {hasToolResults && (
                        <div className="mt-2 space-y-1">
                          {turn.tool_results.map((result: any, idx: number) => (
                            <div key={idx} className="text-xs bg-gray-50 text-gray-900 rounded p-2">
                              <div className="font-medium">
                                ⚡ Result: {result.tool_name}
                                {result.is_error && <span className="ml-2 text-red-600">(Error)</span>}
                              </div>
                              {result.result_value && (
                                <div className="mt-1">
                                  {result.result_value}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
