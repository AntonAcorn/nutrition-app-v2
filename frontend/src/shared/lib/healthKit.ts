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
      read: ['steps', 'calories', 'weight', 'sleep', 'workouts'],
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

export interface HealthWeightSample {
  weightKg: number
  measuredAt: Date
}

export async function getLatestWeightFromHealth(): Promise<HealthWeightSample | null> {
  if (!isHealthKitSupported()) return null
  try {
    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { samples } = await Health.readSamples({
      dataType: 'weight',
      startDate: thirtyDaysAgo.toISOString(),
      endDate: now.toISOString(),
      limit: 1,
      ascending: false,
    })
    if (samples.length === 0) return null
    return {
      weightKg: Math.round(samples[0].value * 10) / 10,
      measuredAt: new Date(samples[0].endDate),
    }
  } catch {
    return null
  }
}

export interface DailyHealthSample {
  date: string // YYYY-MM-DD
  steps?: number
  activeKcal?: number
  sleepMinutes?: number
  workoutMinutes?: number
  workoutCount?: number
}

function dayBoundsLocal(d: Date): { start: Date; end: Date } {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
  return { start, end }
}

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

async function readSampleSum(dataType: 'steps' | 'calories' | 'sleep', start: Date, end: Date): Promise<number> {
  try {
    const { samples } = await Health.readSamples({
      dataType,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    })
    return Math.round(samples.reduce((sum, s) => sum + (s.value ?? 0), 0))
  } catch {
    return 0
  }
}

async function readWorkoutsCount(start: Date, end: Date): Promise<{ count: number; minutes: number }> {
  try {
    const { samples } = await Health.readSamples({
      dataType: 'workouts',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    })
    let minutes = 0
    for (const s of samples) {
      const a = new Date(s.startDate).getTime()
      const b = new Date(s.endDate).getTime()
      if (Number.isFinite(a) && Number.isFinite(b) && b > a) {
        minutes += Math.round((b - a) / 60000)
      }
    }
    return { count: samples.length, minutes }
  } catch {
    return { count: 0, minutes: 0 }
  }
}

/**
 * Pulls a per-day rollup of HealthKit metrics for the last `days` days
 * (including today). Each metric is independent — if HealthKit refuses
 * one type, others still come back. Used by the health-sync hook.
 */
export async function collectDailyHealth(days: number = 14): Promise<DailyHealthSample[]> {
  if (!isHealthKitSupported()) return []
  const out: DailyHealthSample[] = []
  const today = new Date()
  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const { start, end } = dayBoundsLocal(d)
    const [steps, kcal, sleep, workouts] = await Promise.all([
      readSampleSum('steps', start, end),
      readSampleSum('calories', start, end),
      readSampleSum('sleep', start, end),
      readWorkoutsCount(start, end),
    ])
    out.push({
      date: ymd(d),
      steps: steps || undefined,
      activeKcal: kcal || undefined,
      sleepMinutes: sleep || undefined,
      workoutMinutes: workouts.minutes || undefined,
      workoutCount: workouts.count || undefined,
    })
  }
  return out
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
