export const WIZARD_FORBIDDEN_FIELD_KEYS = new Set([
  'systemPrompt',
  'system_prompt',
  'llmModel',
  'llm',
  'temperature',
  'maxTokens',
  'max_tokens',
  'workflow',
  'workflowConfig',
  'analysis',
  'analysisSchema',
  'security',
  'tools',
  'toolPolicy',
  'advanced',
  'knowledgeBase',
  'knowledge_base',
  'evaluationCriteria',
  'dataCollection',
  'platformSettings',
  'conversationConfig',
])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const collectForbiddenWizardFieldsAtPath = (
  value: unknown,
  path: string,
  fields: Set<string>,
) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const nextPath = path ? `${path}[${index}]` : `[${index}]`
      collectForbiddenWizardFieldsAtPath(item, nextPath, fields)
    })
    return
  }

  if (!isRecord(value)) {
    return
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const keyPath = path ? `${path}.${key}` : key
    if (WIZARD_FORBIDDEN_FIELD_KEYS.has(key)) {
      fields.add(keyPath)
    }
    collectForbiddenWizardFieldsAtPath(nestedValue, keyPath, fields)
  }
}

export const collectForbiddenWizardFields = (payload: unknown): string[] => {
  const fields = new Set<string>()
  collectForbiddenWizardFieldsAtPath(payload, '', fields)
  return [...fields].sort((a, b) => a.localeCompare(b))
}
