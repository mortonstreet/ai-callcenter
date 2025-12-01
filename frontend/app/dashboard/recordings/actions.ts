'use server';

export async function getRecordingAudio(conversationId: string) {
  const apiKey = process.env.ELEVEN_LABS_API_KEY;
  
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`,
      {
        headers: {
          'xi-api-key': apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    
    return {
      success: true,
      audio: base64Audio,
      contentType: response.headers.get('content-type') || 'audio/mpeg',
    };
  } catch (error) {
    console.error('Error fetching recording audio:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch audio',
    };
  }
}

