export const AgentExternalType = {
  ELEVEN_LABS: 'eleven_labs',
} as const

export type AgentExternalType = (typeof AgentExternalType)[keyof typeof AgentExternalType]