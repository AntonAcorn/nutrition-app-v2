import { apiClient } from '../lib/apiClient'

export type EntitlementTier = 'FREE' | 'TRIAL' | 'PRO' | 'FOUNDER'

export interface AiQuota {
  used: number
  cap: number
  unlimited: boolean
}

export interface Entitlement {
  tier: EntitlementTier
  trialEndsAt: string | null
  proActiveUntil: string | null
  founderNumber: number | null
  foundersRemaining: number
  photoQuota: AiQuota
  voiceQuota: AiQuota
}

export function fetchEntitlement(): Promise<Entitlement> {
  return apiClient.get('/api/me/entitlement')
}

export function hasAiAccess(e: Entitlement | undefined | null): boolean {
  if (!e) return false
  return e.tier === 'TRIAL' || e.tier === 'PRO' || e.tier === 'FOUNDER'
}

export function trialDaysRemaining(e: Entitlement | undefined | null): number | null {
  if (!e || e.tier !== 'TRIAL' || !e.trialEndsAt) return null
  const msLeft = new Date(e.trialEndsAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))
}
