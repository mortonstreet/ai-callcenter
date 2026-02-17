"use client";

import { useState, useRef } from "react";
import { Play, Square, ChevronDown } from "lucide-react";
import { useVoices } from "@/hooks/api/useAgent";

interface VoiceSelectorProps {
  value: string | null;
  onChange: (voiceId: string) => void;
}

export function VoiceSelector({ value, onChange }: VoiceSelectorProps) {
  const { data, isLoading } = useVoices();
  const [isOpen, setIsOpen] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const voices = data?.voices ?? [];
  const selectedVoice = voices.find((v) => v.voice_id === value);

  function handlePlay(e: React.MouseEvent, previewUrl: string, voiceId: string) {
    e.stopPropagation();
    if (playingId === voiceId) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(previewUrl);
    audio.onended = () => setPlayingId(null);
    audio.play();
    audioRef.current = audio;
    setPlayingId(voiceId);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
      >
        <span>
          {isLoading
            ? "Loading voices..."
            : selectedVoice
              ? `${selectedVoice.name} (${selectedVoice.category})`
              : "Select a voice"}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
          {voices.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No voices available</div>
          )}
          {voices.map((voice) => (
            <div
              key={voice.voice_id}
              onClick={() => {
                onChange(voice.voice_id);
                setIsOpen(false);
              }}
              className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-muted ${
                voice.voice_id === value ? "bg-muted font-medium" : ""
              }`}
            >
              <div>
                <span className="text-foreground">{voice.name}</span>
                <span className="ml-2 text-muted-foreground">{voice.category}</span>
              </div>
              {voice.preview_url && (
                <button
                  type="button"
                  onClick={(e) => handlePlay(e, voice.preview_url!, voice.voice_id)}
                  className="p-1 rounded-lg hover:bg-card transition-colors"
                >
                  {playingId === voice.voice_id ? (
                    <Square className="h-3.5 w-3.5 text-foreground" />
                  ) : (
                    <Play className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
