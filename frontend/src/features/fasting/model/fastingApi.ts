import { API_BASE } from '../../../shared/lib/apiBase'

export interface FastingSession {
  id: string
  startedAt: string
  endedAt: string | null
  targetHours: number
  createdAt: string
}

export async function getActiveSession(): Promise<FastingSession | null> {
  const res = await fetch(`${API_BASE}/api/fasting/active`, { credentials: 'include' })
  if (!res.ok) throw new Error(`Failed to load active session (${res.status})`)
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

export async function startFast(targetHours: number): Promise<FastingSession> {
  const res = await fetch(`${API_BASE}/api/fasting/start`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetHours }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message ?? `Failed to start fast (${res.status})`)
  }
  return res.json()
}

export async function stopFast(): Promise<FastingSession> {
  const res = await fetch(`${API_BASE}/api/fasting/stop`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message ?? `Failed to stop fast (${res.status})`)
  }
  return res.json()
}

export async function getFastingHistory(): Promise<FastingSession[]> {
  const res = await fetch(`${API_BASE}/api/fasting/history`, { credentials: 'include' })
  if (!res.ok) throw new Error(`Failed to load history (${res.status})`)
  return res.json()
}
