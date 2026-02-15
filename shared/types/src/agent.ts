export const AgentExternalType = {
  ELEVEN_LABS: 'eleven_labs',
  LOCAL_FALLBACK: 'local_fallback',
} as const

export type AgentExternalType = (typeof AgentExternalType)[keyof typeof AgentExternalType]

export const Industry = {
  PEST_CONTROL: 'pest_control',
  HVAC: 'hvac',
  ROOFING: 'roofing',
  ELECTRICAL: 'electrical',
  CLEANING_SERVICES: 'cleaning_services',
} as const

export type Industry = (typeof Industry)[keyof typeof Industry]

export const UseCase = {
  CUSTOMER_SUPPORT: 'customer_support',
  OUTBOUND_SALES: 'outbound_sales',
  SCHEDULING: 'scheduling',
  LEAD_QUALIFICATION: 'lead_qualification',
  ANSWERING_SERVICE: 'answering_service',
} as const

export type UseCase = (typeof UseCase)[keyof typeof UseCase]

export const AgentStatus = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  ARCHIVED: 'archived',
} as const

export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus]
