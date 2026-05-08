import { apiClient } from '../../../shared/lib/apiClient'

export const RATING_OPTIONS: { rating: number; emoji: string; label: string }[] = [
  { rating: 1, emoji: '🤢', label: 'Awful' },
  { rating: 2, emoji: '😴', label: 'Tired' },
  { rating: 3, emoji: '😐', label: 'Okay' },
  { rating: 4, emoji: '😌', label: 'Good' },
  { rating: 5, emoji: '⚡', label: 'Energised' },
]

export function submitWellbeingRating(rating: number): Promise<void> {
  return apiClient.post('/api/wellbeing/rate', { rating })
}
