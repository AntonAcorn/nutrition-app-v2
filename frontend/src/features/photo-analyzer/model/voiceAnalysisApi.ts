import { apiClient } from '../../../shared/lib/apiClient'
import { normalizeDraft } from './photoAnalysis'
import type { PhotoAnalysisDraft } from '../../../shared/types/nutrition'

export async function analyzeVoice(description: string, locale: string, entryDate: string): Promise<PhotoAnalysisDraft> {
  const payload = await apiClient.post<unknown>('/api/voice-analysis', { description, locale, entryDate })
  return normalizeDraft(payload as Parameters<typeof normalizeDraft>[0])
}
