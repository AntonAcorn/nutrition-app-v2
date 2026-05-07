interface FoodItem {
  name: string
  kcal: number
}

const FOODS: FoodItem[] = [
  { name: 'pint of beer', kcal: 200 },
  { name: 'glass of wine', kcal: 125 },
  { name: 'slice of pizza', kcal: 290 },
  { name: 'burger', kcal: 550 },
  { name: 'fries', kcal: 350 },
  { name: 'chocolate bar', kcal: 230 },
  { name: 'donut', kcal: 250 },
  { name: 'ice cream', kcal: 140 },
  { name: 'slice of cake', kcal: 350 },
  { name: 'croissant', kcal: 270 },
  { name: 'cocktail', kcal: 220 },
]

function hashSeed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function pickCombo(kcal: number, seed: number): string | null {
  if (kcal < 100) return null

  type Combo = { label: string; total: number }
  const candidates: Combo[] = []

  FOODS.forEach((a, i) => {
    candidates.push({ label: a.name, total: a.kcal })
    FOODS.forEach((b, j) => {
      if (j <= i) return
      candidates.push({ label: `${a.name} + ${b.name}`, total: a.kcal + b.kcal })
    })
  })

  const tolerance = Math.max(80, kcal * 0.18)
  const within = candidates.filter(c => Math.abs(c.total - kcal) <= tolerance)
  const pool = within.length > 0 ? within : candidates

  pool.sort((a, b) => Math.abs(a.total - kcal) - Math.abs(b.total - kcal))
  const topN = pool.slice(0, Math.min(5, pool.length))
  return topN[seed % topN.length].label
}

export function describeBankAsFood(kcal: number, dateKey: string): string | null {
  if (kcal < 100) return null
  return pickCombo(kcal, hashSeed(dateKey))
}
