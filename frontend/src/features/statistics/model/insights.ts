import type { NutritionStatisticsPoint } from '../../../shared/types/nutrition'
import { DOW_NAMES, localDateString, prevDay } from './formatters'

export interface Insight {
  id: string
  icon: string
  title: string
  body: string
  tone: 'good' | 'bad' | 'neutral' | 'info'
}

export interface CalorieSuggestion {
  status: 'too-fast' | 'stalled' | 'on-track' | 'gaining-too-fast' | 'gaining-stalled'
  kgPerWeek: number
  currentTarget: number
  suggestedTarget: number
}

export const SUGGESTION_COPY: Record<CalorieSuggestion['status'], { icon: string; title: string; body: (s: CalorieSuggestion) => string; tone: string }> = {
  'too-fast': {
    icon: '⚡',
    title: 'Losing too fast',
    body: s => `You're dropping ${Math.abs(s.kgPerWeek).toFixed(2)} kg/week — safe range is 0.5–1.0 kg. Consider raising your daily target from ${s.currentTarget} to ~${s.suggestedTarget} kcal.`,
    tone: 'bad',
  },
  'stalled': {
    icon: '📉',
    title: 'Weight not moving',
    body: s => `Almost no change in weight over this period. Try lowering your daily target from ${s.currentTarget} to ~${s.suggestedTarget} kcal.`,
    tone: 'neutral',
  },
  'on-track': {
    icon: '✅',
    title: 'On track',
    body: s => `${s.kgPerWeek.toFixed(2)} kg/week — right in the optimal range. Keep your current target of ${s.currentTarget} kcal.`,
    tone: 'good',
  },
  'gaining-too-fast': {
    icon: '⚡',
    title: 'Gaining too fast',
    body: s => `+${s.kgPerWeek.toFixed(2)} kg/week may mean excess fat gain. Consider lowering your target from ${s.currentTarget} to ~${s.suggestedTarget} kcal.`,
    tone: 'bad',
  },
  'gaining-stalled': {
    icon: '📈',
    title: 'Not gaining',
    body: s => `Weight isn't increasing despite a surplus goal. Try raising your target from ${s.currentTarget} to ~${s.suggestedTarget} kcal.`,
    tone: 'neutral',
  },
}

export function computeStreak(points: NutritionStatisticsPoint[]): number {
  const sorted = [...points].sort((a, b) => a.entryDate.localeCompare(b.entryDate))
  const logged = sorted.filter(p => p.consumedCalories > 0)
  if (logged.length === 0) return 0
  const last = logged[logged.length - 1]
  const today = localDateString(new Date())
  const yesterday = prevDay(today)
  if (last.entryDate !== today && last.entryDate !== yesterday) return 0
  let streak = 0
  let expected = last.entryDate
  for (let i = logged.length - 1; i >= 0; i--) {
    if (logged[i].entryDate === expected) {
      streak++
      expected = prevDay(expected)
    } else {
      break
    }
  }
  return streak
}

export function computeInsights(
  loggedPoints: NutritionStatisticsPoint[],
  allPoints: NutritionStatisticsPoint[],
  targetWeightKg: number | null,
  rangeDays: number,
): Insight[] {
  if (loggedPoints.length === 0) return []
  const insights: Insight[] = []

  // 1. Logging consistency
  const pct = (loggedPoints.length / rangeDays) * 100
  if (pct < 60) {
    insights.push({
      id: 'consistency-low',
      icon: '📅',
      title: 'Logging gaps',
      body: `${loggedPoints.length} of ${rangeDays} days logged (${Math.round(pct)}%). Missing days hide the full picture.`,
      tone: 'bad',
    })
  } else if (pct >= 85) {
    insights.push({
      id: 'consistency-high',
      icon: '✅',
      title: 'Consistent tracker',
      body: `${Math.round(pct)}% of days logged. Consistency is the #1 predictor of long-term results.`,
      tone: 'good',
    })
  }

  // 2. Momentum — first half vs second half average calorie balance
  if (loggedPoints.length >= 6) {
    const mid = Math.floor(loggedPoints.length / 2)
    const avgFirst  = loggedPoints.slice(0, mid).reduce((s, p) => s + p.calorieBalance, 0) / mid
    const avgSecond = loggedPoints.slice(mid).reduce((s, p) => s + p.calorieBalance, 0) / (loggedPoints.length - mid)
    const delta = avgFirst - avgSecond // positive = recent half is better (lower balance)
    if (delta > 100) {
      insights.push({
        id: 'momentum-improving',
        icon: '📈',
        title: 'Improving momentum',
        body: `Recent days are ${Math.round(delta)} kcal/day better vs the earlier half of this period.`,
        tone: 'good',
      })
    } else if (delta < -100) {
      insights.push({
        id: 'momentum-declining',
        icon: '📉',
        title: 'Momentum slipping',
        body: `Recent days are ${Math.round(-delta)} kcal/day worse than the earlier half. Time to refocus.`,
        tone: 'bad',
      })
    }
  }

  // 3. Worst day-of-week (needs ≥14 logged days, ≥2 per DOW)
  if (loggedPoints.length >= 14) {
    const byDow: Record<number, number[]> = {}
    for (const p of loggedPoints) {
      const dow = new Date(p.entryDate + 'T12:00:00').getDay()
      byDow[dow] = byDow[dow] ?? []
      byDow[dow].push(p.calorieBalance)
    }
    let worstDow = -1, worstAvg = -Infinity
    for (const [dow, balances] of Object.entries(byDow)) {
      if (balances.length < 2) continue
      const avg = balances.reduce((s, v) => s + v, 0) / balances.length
      if (avg > worstAvg) { worstAvg = avg; worstDow = Number(dow) }
    }
    if (worstDow >= 0 && worstAvg > 100) {
      insights.push({
        id: 'worst-dow',
        icon: '📆',
        title: `${DOW_NAMES[worstDow]}s are tough`,
        body: `Avg surplus of +${Math.round(worstAvg)} kcal on ${DOW_NAMES[worstDow]}s. Plan that day more carefully.`,
        tone: 'bad',
      })
    }
  }

  // 4. High day-to-day variance (≥7 logged days, std dev > 600, avg balance positive)
  if (loggedPoints.length >= 7) {
    const balances = loggedPoints.map(p => p.calorieBalance)
    const avgBal = balances.reduce((s, v) => s + v, 0) / balances.length
    const stdDev = Math.sqrt(balances.reduce((s, v) => s + (v - avgBal) ** 2, 0) / balances.length)
    if (stdDev > 600 && avgBal > 0) {
      insights.push({
        id: 'high-variance',
        icon: '🎢',
        title: 'Feast-or-famine pattern',
        body: `High day-to-day variance (σ ${Math.round(stdDev)} kcal). Steady days beat big swings.`,
        tone: 'neutral',
      })
    }
  }

  // 5. Weight goal ETA (≥4 weight entries + target set)
  if (targetWeightKg != null) {
    const wPoints = allPoints.filter(p => p.weightKg != null)
    if (wPoints.length >= 4) {
      const first = wPoints[0], last = wPoints[wPoints.length - 1]
      const daysDiff = Math.max(1,
        (new Date(last.entryDate + 'T12:00:00').getTime() - new Date(first.entryDate + 'T12:00:00').getTime()) / 86400000,
      )
      const kgPerDay = ((last.weightKg ?? 0) - (first.weightKg ?? 0)) / daysDiff
      const kgToGo   = targetWeightKg - (last.weightKg ?? 0)
      if (kgToGo !== 0 && kgPerDay !== 0 && Math.sign(kgToGo) === Math.sign(kgPerDay)) {
        const daysToGoal = Math.round(kgToGo / kgPerDay)
        if (daysToGoal > 0 && daysToGoal < 365) {
          const eta = new Date()
          eta.setDate(eta.getDate() + daysToGoal)
          const etaStr = eta.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          const rateStr = `${kgPerDay > 0 ? '+' : ''}${(kgPerDay * 7).toFixed(2)} kg/wk`
          insights.push({
            id: 'goal-eta',
            icon: '🏁',
            title: 'Goal ETA',
            body: `At ${rateStr}, you reach ${targetWeightKg} kg around ${etaStr}.`,
            tone: 'info',
          })
        }
      }
    }
  }

  return insights.slice(0, 3)
}

function weightTrendKgPerWeek(wPoints: NutritionStatisticsPoint[]): number {
  const base = new Date(wPoints[0].entryDate + 'T12:00:00').getTime()
  const xs = wPoints.map(p => (new Date(p.entryDate + 'T12:00:00').getTime() - base) / 86400000)
  const ys = wPoints.map(p => p.weightKg ?? 0)
  const n = xs.length
  const sumX = xs.reduce((s, x) => s + x, 0)
  const sumY = ys.reduce((s, y) => s + y, 0)
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0)
  const sumXX = xs.reduce((s, x) => s + x * x, 0)
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  return slope * 7
}

export function computeCalorieSuggestion(
  loggedPoints: NutritionStatisticsPoint[],
  allPoints: NutritionStatisticsPoint[],
  targetWeightKg: number | null,
): CalorieSuggestion | null {
  if (targetWeightKg == null) return null

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 28)
  const cutoffStr = localDateString(cutoff)

  const recentLogged = loggedPoints.filter(p => p.entryDate >= cutoffStr)
  const recentAll = allPoints.filter(p => p.entryDate >= cutoffStr)

  if (recentLogged.length < 14) return null
  const wPoints = recentAll.filter(p => p.weightKg != null)
  if (wPoints.length < 4) return null

  const kgPerWeek = weightTrendKgPerWeek(wPoints)
  const currentWeight = wPoints[wPoints.length - 1].weightKg ?? 0

  const recentTarget = recentLogged[recentLogged.length - 1]?.calorieTarget
  if (!recentTarget || recentTarget <= 0) return null
  const currentTarget = Math.round(recentTarget)

  const isLossGoal = targetWeightKg < currentWeight
  const isGainGoal = targetWeightKg > currentWeight

  if (isLossGoal) {
    if (kgPerWeek < -1.0) {
      return { status: 'too-fast', kgPerWeek, currentTarget, suggestedTarget: Math.round((currentTarget + 300) / 50) * 50 }
    }
    if (kgPerWeek > -0.15) {
      return { status: 'stalled', kgPerWeek, currentTarget, suggestedTarget: Math.round((currentTarget - 200) / 50) * 50 }
    }
    return { status: 'on-track', kgPerWeek, currentTarget, suggestedTarget: currentTarget }
  }

  if (isGainGoal) {
    if (kgPerWeek > 0.5) {
      return { status: 'gaining-too-fast', kgPerWeek, currentTarget, suggestedTarget: Math.round((currentTarget - 200) / 50) * 50 }
    }
    if (kgPerWeek < 0.1) {
      return { status: 'gaining-stalled', kgPerWeek, currentTarget, suggestedTarget: Math.round((currentTarget + 200) / 50) * 50 }
    }
    return { status: 'on-track', kgPerWeek, currentTarget, suggestedTarget: currentTarget }
  }

  return null
}
