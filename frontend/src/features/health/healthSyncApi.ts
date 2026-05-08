import { apiClient } from '../../shared/lib/apiClient'
import { collectDailyHealth, isHealthKitSupported, type DailyHealthSample } from '../../shared/lib/healthKit'

interface SyncResponse { written: number }

const STORAGE_KEY = 'health-last-synced-at'
const MIN_INTERVAL_MS = 6 * 60 * 60 * 1000 // 6 hours
const SYNC_DAYS = 14

/**
 * Pulls the last 14 days of HealthKit data and posts it to /api/healthkit/sync.
 * Throttled to once per 6 hours per device via localStorage so opening the
 * app many times in a day doesn't hit HealthKit aggressively.
 *
 * Silent on errors — never blocks UI. HealthKit not available, no permission,
 * server down → all return null.
 */
export async function syncHealthDataIfDue(force: boolean = false): Promise<SyncResponse | null> {
  if (!isHealthKitSupported()) return null

  if (!force) {
    try {
      const last = Number(localStorage.getItem(STORAGE_KEY) || '0')
      if (last && Date.now() - last < MIN_INTERVAL_MS) return null
    } catch {}
  }

  let days: DailyHealthSample[]
  try {
    days = await collectDailyHealth(SYNC_DAYS)
  } catch {
    return null
  }
  // Keep only days that have at least one signal — empty rows would just
  // reset existing fields to null on the server.
  const filtered = days.filter(d =>
    d.steps != null || d.activeKcal != null || d.sleepMinutes != null
    || d.workoutMinutes != null || d.workoutCount != null
  )
  if (filtered.length === 0) return null

  try {
    const res = await apiClient.post<SyncResponse>('/api/healthkit/sync', { days: filtered })
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())) } catch {}
    return res
  } catch {
    return null
  }
}
