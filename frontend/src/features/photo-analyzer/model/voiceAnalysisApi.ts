import { API_BASE } from '../../../shared/lib/apiBase'
import { normalizeDraft } from './photoAnalysis'
import type { PhotoAnalysisDraft } from '../../../shared/types/nutrition'

export async function analyzeVoice(description: string, locale: string, entryDate: string): Promise<PhotoAnalysisDraft> {
  const response = await fetch(`${API_BASE}/api/voice-analysis`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, locale, entryDate }),
  })

  if (!response.ok) {
    let message = `Voice analysis failed (${response.status})`
    try {
      const body = await response.json()
      if (body.message) message = body.message
    } catch {}
    throw new Error(message)
  }

  const payload = await response.json()
  return normalizeDraft(payload)
}
