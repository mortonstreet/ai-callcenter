'use client';

import { useConversation } from '@elevenlabs/react';
import { useCallback } from 'react';
import Button from '@/components/ui/Button';

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

  const isConnected = conversation.status === 'connected';
  const isConnecting = conversation.status === 'connecting';

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <Button
        onClick={isConnected ? stopConversation : startConversation}
        variant={isConnected ? 'outline' : 'primary'}
        className="w-full"
        disabled={isConnecting}
      >
        {isConnecting ? '...' : isConnected ? 'Stop Conversation' : 'Start Conversation'}
      </Button>
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-gray-600">Status: <span className="font-medium text-gray-900">{conversation.status}</span></p>
        <p className="text-sm text-gray-600">Agent is <span className="font-medium text-gray-900">{conversation.isSpeaking ? 'speaking' : 'listening'}</span></p>
      </div>
    </div>
  );
}

