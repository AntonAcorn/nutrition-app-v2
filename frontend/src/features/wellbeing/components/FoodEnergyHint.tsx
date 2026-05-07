import { useQuery } from '@tanstack/react-query'
import { getFoodEnergyHint } from '../model/wellbeingApi'

interface Props {
  name: string
}

export function FoodEnergyHint({ name }: Props) {
  const trimmed = name.trim()

  const { data } = useQuery({
    queryKey: ['food-hint', trimmed.toLowerCase()],
    queryFn: () => getFoodEnergyHint(trimmed),
    enabled: trimmed.length >= 3,
    staleTime: 5 * 60_000,
  })

  if (!data) return null

  if (!data.hasHint && data.firstTime) {
    return (
      <div className="food-energy-hint food-energy-hint--new">
        <span className="food-energy-hint__icon">🔋</span>
        <span>First time logging this — we'll check your energy after</span>
      </div>
    )
  }

  if (!data.hasHint) return null

  if (data.tone === 'good') {
    return (
      <div className="food-energy-hint food-energy-hint--good">
        <span className="food-energy-hint__icon">⚡</span>
        <span>Your energy after this is typically {data.avgRating.toFixed(1)}/5 · {data.sampleCount} check-ins</span>
      </div>
    )
  }

  return (
    <div className="food-energy-hint food-energy-hint--bad">
      <span className="food-energy-hint__icon">⚠️</span>
      <span>Tends to lower your energy · {data.avgRating.toFixed(1)}/5 · {data.sampleCount} check-ins</span>
    </div>
  )
}
