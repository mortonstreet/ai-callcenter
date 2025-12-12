import logger from '@/lib/logger'

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1'

interface ElevenLabsConversation {
  agent_id: string
  conversation_id: string
  status: 'processing' | 'done' | 'failed'
  transcript?:
    | string
    | Array<{
        role: 'agent' | 'user'
        message: string
        time_in_call_secs?: number
        tool_calls?: Array<{
          tool_name: string
          params_as_json?: string
        }>
        tool_results?: Array<{
          tool_name: string
          result_value?: string
          is_error?: boolean
        }>
      }>
  metadata?: {
    start_time_unix_secs?: number
    end_time_unix_secs?: number
    call_duration_secs?: number
    cost?: number
    phone_call?: {
      call_sid?: string
      to_number?: string
      from_number?: string
    }
  }
  analysis?: {
    transcript_summary?: string
    evaluation_criteria_results?: Record<string, unknown>
    data_collection_results?: Record<string, unknown>
    call_successful?: string
  }
}

interface ElevenLabsConversationDetail extends ElevenLabsConversation {
  transcript: Array<{
    role: 'agent' | 'user'
    message: string
    time_in_call_secs?: number
    tool_calls?: Array<{
      tool_name: string
      params_as_json?: string
    }>
    tool_results?: Array<{
      tool_name: string
      result_value?: string
      is_error?: boolean
    }>
  }>
}

interface ListConversationsResponse {
  conversations: ElevenLabsConversation[]
  has_more: boolean
  last_history_id?: string
}

export class ElevenLabsClient {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${ELEVENLABS_API_URL}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(`ElevenLabs API error: ${response.status} - ${errorText}`)
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`)
    }

    return response.json()
  }

  /**
   * List conversations for an agent
   * @param agentId - The ElevenLabs agent ID
   * @param pageSize - Number of conversations to return (default 100)
   */
  async listConversations(
    agentId: string,
    pageSize: number = 100,
  ): Promise<ListConversationsResponse> {
    return this.request<ListConversationsResponse>(
      `/convai/conversations?agent_id=${agentId}&page_size=${pageSize}`,
    )
  }

  /**
   * Get conversation details including full transcript
   * @param conversationId - The conversation ID
   */
  async getConversation(
    conversationId: string,
  ): Promise<ElevenLabsConversationDetail> {
    return this.request<ElevenLabsConversationDetail>(
      `/convai/conversations/${conversationId}`,
    )
  }

  /**
   * Get conversation audio as a buffer
   * @param conversationId - The conversation ID
   */
  async getConversationAudio(
    conversationId: string,
  ): Promise<{ buffer: Buffer; contentType: string }> {
    const url = `${ELEVENLABS_API_URL}/convai/conversations/${conversationId}/audio`

    const response = await fetch(url, {
      headers: {
        'xi-api-key': this.apiKey,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(
        `ElevenLabs audio API error: ${response.status} - ${errorText}`,
      )
      throw new Error(
        `ElevenLabs audio API error: ${response.status} - ${errorText}`,
      )
    }

    const arrayBuffer = await response.arrayBuffer()
    return {
      buffer: Buffer.from(arrayBuffer),
      contentType: response.headers.get('content-type') || 'audio/mpeg',
    }
  }

  /**
   * Fetch new conversations since last sync and return processed data
   * @param agentId - The ElevenLabs agent ID
   * @param sinceTimestamp - Only get conversations after this timestamp (Unix seconds)
   */
  async getNewConversations(
    agentId: string,
    sinceTimestamp?: number,
  ): Promise<ElevenLabsConversationDetail[]> {
    const response = await this.listConversations(agentId)

    const newConversations: ElevenLabsConversationDetail[] = []

    for (const conv of response.conversations) {
      // Skip if conversation is still processing
      if (conv.status !== 'done') {
        continue
      }

      // Skip if older than sinceTimestamp
      if (
        sinceTimestamp &&
        conv.metadata?.start_time_unix_secs &&
        conv.metadata.start_time_unix_secs < sinceTimestamp
      ) {
        continue
      }

      // Get full conversation details
      try {
        const details = await this.getConversation(conv.conversation_id)
        newConversations.push(details)
      } catch (error) {
        logger.error(
          `Failed to get conversation ${conv.conversation_id}:`,
          error,
        )
      }
    }

    return newConversations
  }
}

// Singleton instance
let elevenLabsClientInstance: ElevenLabsClient | null = null

export const getElevenLabsClient = (apiKey?: string): ElevenLabsClient => {
  if (!elevenLabsClientInstance && apiKey) {
    elevenLabsClientInstance = new ElevenLabsClient(apiKey)
  }
  if (!elevenLabsClientInstance) {
    throw new Error('ElevenLabs client not initialized. Provide API key.')
  }
  return elevenLabsClientInstance
}

export const initElevenLabsClient = (apiKey: string): ElevenLabsClient => {
  elevenLabsClientInstance = new ElevenLabsClient(apiKey)
  return elevenLabsClientInstance
}
