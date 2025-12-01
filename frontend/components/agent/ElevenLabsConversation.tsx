'use client';

import { useConversation } from '@elevenlabs/react';
import { useCallback } from 'react';

interface ElevenLabsConversationProps {
  agentId: string;
}

export function ElevenLabsConversation({ agentId }: ElevenLabsConversationProps) {
  const conversation = useConversation({
    onConnect: () => console.log('Connected'),
    onDisconnect: () => console.log('Disconnected'),
    onMessage: (message) => console.log('Message:', message),
    onError: (error) => console.error('Error:', error),
  });

  const startConversation = useCallback(async () => {
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      // Start the conversation with your agent
      await conversation.startSession({
        agentId: agentId,
        connectionType: 'webrtc', // either "webrtc" or "websocket"
      });
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  }, [conversation, agentId]);

  const stopConversation = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-2">
        <button
          onClick={startConversation}
          disabled={conversation.status === 'connected'}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Start Conversation
        </button>
        <button
          onClick={stopConversation}
          disabled={conversation.status !== 'connected'}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:opacity-90 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Stop Conversation
        </button>
      </div>
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-gray-600">Status: <span className="font-medium text-gray-900">{conversation.status}</span></p>
        <p className="text-sm text-gray-600">Agent is <span className="font-medium text-gray-900">{conversation.isSpeaking ? 'speaking' : 'listening'}</span></p>
      </div>
    </div>
  );
}

