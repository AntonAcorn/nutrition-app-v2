import { Health } from '@capgo/capacitor-health'
import { Capacitor } from '@capacitor/core'

export function isHealthKitSupported(): boolean {
  return Capacitor.getPlatform() === 'ios'
}

export async function requestHealthPermissions(): Promise<boolean> {
  if (!isHealthKitSupported()) return false
  try {
    const available = await Health.isAvailable()
    if (!available.available) return false

    await Health.requestAuthorization({
      read: ['steps', 'calories', 'weight'],
      write: ['weight'],
    })
    return true
  } catch {
    return false
  }
}

function todayRange(): { startDate: string; endDate: string } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return {
    startDate: start.toISOString(),
    endDate: now.toISOString(),
  }
}

export async function getTodaySteps(): Promise<number> {
  if (!isHealthKitSupported()) return 0
  try {
    const { samples } = await Health.readSamples({
      dataType: 'steps',
      ...todayRange(),
    })
    return Math.round(samples.reduce((sum, s) => sum + s.value, 0))
  } catch {
    return 0
  }
}

export async function getTodayActiveCalories(): Promise<number> {
  if (!isHealthKitSupported()) return 0
  try {
    const { samples } = await Health.readSamples({
      dataType: 'calories',
      ...todayRange(),
    })
    return Math.round(samples.reduce((sum, s) => sum + s.value, 0))
  } catch {
    return 0
  }
}

export async function writeWeightToHealth(weightKg: number, date: string): Promise<void> {
  if (!isHealthKitSupported()) return
  try {
    const d = new Date(date)
    await Health.saveSample({
      dataType: 'weight',
      value: weightKg,
      startDate: d.toISOString(),
      endDate: d.toISOString(),
    })
  } catch {
    // non-critical — silently ignore
  }
}
