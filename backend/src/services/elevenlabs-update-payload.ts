export const buildElevenLabsUpdatePayload = (updates: Record<string, any>) => {
  const elevenLabsUpdate: Record<string, any> = {}

  if (updates.name) {
    elevenLabsUpdate.name = updates.name
  }

  const conversationConfig: Record<string, any> = {}
  const agentConfig: Record<string, any> = {}
  const promptConfig: Record<string, any> = {}

  if (updates.systemPrompt !== undefined) {
    promptConfig.prompt = updates.systemPrompt
  }
  if (updates.llmModel !== undefined) {
    promptConfig.llm = updates.llmModel
  }
  if (updates.temperature !== undefined) {
    promptConfig.temperature = updates.temperature
  }
  if (updates.maxTokens !== undefined) {
    promptConfig.max_tokens = updates.maxTokens
  }
  if (updates.tools !== undefined) {
    promptConfig.tools = updates.tools
  }
  if (updates.toolIds !== undefined) {
    elevenLabsUpdate.tool_ids = updates.toolIds
  }
  if (updates.builtInTools !== undefined) {
    elevenLabsUpdate.built_in_tools = updates.builtInTools
  }
  if (updates.knowledgeBase !== undefined) {
    promptConfig.knowledge_base = updates.knowledgeBase
  }

  if (Object.keys(promptConfig).length > 0) {
    agentConfig.prompt = promptConfig
  }

  if (updates.firstMessage !== undefined) {
    agentConfig.first_message = updates.firstMessage
  }
  if (updates.language !== undefined) {
    agentConfig.language = updates.language
  }
  if (updates.dataCollection !== undefined) {
    agentConfig.data_collection = updates.dataCollection
  }
  if (updates.evaluationCriteria !== undefined) {
    agentConfig.evaluation_criteria = updates.evaluationCriteria
  }

  if (Object.keys(agentConfig).length > 0) {
    conversationConfig.agent = agentConfig
  }

  const ttsConfig: Record<string, any> = {}
  if (updates.voiceId !== undefined) {
    ttsConfig.voice_id = updates.voiceId
  }
  if (updates.stability !== undefined) {
    ttsConfig.stability = updates.stability
  }
  if (updates.similarityBoost !== undefined) {
    ttsConfig.similarity_boost = updates.similarityBoost
  }
  if (updates.speed !== undefined) {
    ttsConfig.speed = updates.speed
  }
  if (Object.keys(ttsConfig).length > 0) {
    conversationConfig.tts = ttsConfig
  }

  if (updates.advanced?.maxCallDuration !== undefined) {
    conversationConfig.max_duration_seconds = updates.advanced.maxCallDuration
  }
  if (updates.advanced?.silenceEndCallTimeout !== undefined) {
    conversationConfig.silence_end_call_timeout =
      updates.advanced.silenceEndCallTimeout
  }
  if (updates.advanced?.turnTimeout !== undefined) {
    conversationConfig.turn_timeout = updates.advanced.turnTimeout
  }
  if (updates.conversation?.maxDurationSeconds !== undefined) {
    conversationConfig.max_duration_seconds =
      updates.conversation.maxDurationSeconds
  }
  if (updates.conversation?.textOnlyMode !== undefined) {
    conversationConfig.text_only_mode = updates.conversation.textOnlyMode
  }
  if (updates.conversation?.silenceEndCallTimeout !== undefined) {
    conversationConfig.silence_end_call_timeout =
      updates.conversation.silenceEndCallTimeout
  }
  if (updates.conversation?.turnTimeout !== undefined) {
    conversationConfig.turn_timeout = updates.conversation.turnTimeout
  }

  if (Object.keys(conversationConfig).length > 0) {
    elevenLabsUpdate.conversation_config = conversationConfig
  }

  const platformSettings: Record<string, any> = {}

  if (updates.security !== undefined) {
    platformSettings.security = {}
    if (updates.security.authTokenEnabled !== undefined) {
      platformSettings.security.auth_token_enabled =
        updates.security.authTokenEnabled
    }
    if (updates.security.allowedOrigins !== undefined) {
      platformSettings.security.allowed_origins =
        updates.security.allowedOrigins
    }
  }

  if (updates.callLimits !== undefined) {
    platformSettings.call_limits = {}
    if (updates.callLimits.maxConcurrent !== undefined) {
      platformSettings.call_limits.max_concurrent =
        updates.callLimits.maxConcurrent
    }
    if (updates.callLimits.dailyCap !== undefined) {
      platformSettings.call_limits.daily_cap = updates.callLimits.dailyCap
    }
  }

  if (updates.advanced?.maxConcurrentCalls !== undefined) {
    platformSettings.call_limits = platformSettings.call_limits || {}
    if (platformSettings.call_limits.max_concurrent === undefined) {
      platformSettings.call_limits.max_concurrent =
        updates.advanced.maxConcurrentCalls
    }
  }

  if (updates.privacy !== undefined) {
    platformSettings.privacy = {}
    if (updates.privacy.recordingRetention !== undefined) {
      platformSettings.privacy.recording_retention =
        updates.privacy.recordingRetention
    }
  }

  const webhooksSettings: Record<string, any> = {}
  if (updates.webhooks?.postCallUrl !== undefined) {
    webhooksSettings.post_call_url = updates.webhooks.postCallUrl
  }
  if (updates.webhooks?.events !== undefined) {
    webhooksSettings.events = updates.webhooks.events
  }
  if (updates.advanced?.postCallWebhookUrl !== undefined) {
    webhooksSettings.post_call_url = updates.advanced.postCallWebhookUrl
  }
  if (Object.keys(webhooksSettings).length > 0) {
    platformSettings.webhooks = webhooksSettings
  }

  if (Object.keys(platformSettings).length > 0) {
    elevenLabsUpdate.platform_settings = platformSettings
  }

  if (updates.workflow !== undefined) {
    elevenLabsUpdate.workflow = updates.workflow
  }

  return elevenLabsUpdate
}
