import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useActiveOrganization } from './auth-client'

interface ImpersonatedOrg {
  id: string
  name: string
}

interface AdminStore {
  impersonatedOrg: ImpersonatedOrg | null
  setImpersonatedOrg: (org: ImpersonatedOrg | null) => void
  clearImpersonation: () => void
}

export const useAdminStore = create<AdminStore>()(
  persist(
    (set) => ({
      impersonatedOrg: null,
      setImpersonatedOrg: (org) => set({ impersonatedOrg: org }),
      clearImpersonation: () => set({ impersonatedOrg: null }),
    }),
    {
      name: 'admin-impersonation',
    }
  )
)

/**
 * Returns the effective organization - impersonated org if set, otherwise active org
 */
export function useEffectiveOrganization() {
  const impersonatedOrg = useAdminStore((s) => s.impersonatedOrg)
  const activeOrganization = useActiveOrganization()
  
  if (impersonatedOrg) {
    return { data: impersonatedOrg, isPending: false }
  }
  
  return activeOrganization
}

