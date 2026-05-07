import { apiClient } from '../../../shared/lib/apiClient'

export interface FastingSession {
  id: string
  startedAt: string
  endedAt: string | null
  targetHours: number
  createdAt: string
}

export function getActiveSession(): Promise<FastingSession | null> {
  return apiClient.get<FastingSession | null>('/api/fasting/active')
}

export function startFast(targetHours: number): Promise<FastingSession> {
  return apiClient.post<FastingSession>('/api/fasting/start', { targetHours })
}

export function stopFast(): Promise<FastingSession> {
  return apiClient.post<FastingSession>('/api/fasting/stop')
}

export function getFastingHistory(): Promise<FastingSession[]> {
  return apiClient.get<FastingSession[]>('/api/fasting/history')
}

export function deleteFastingSession(id: string): Promise<void> {
  return apiClient.delete(`/api/fasting/${id}`)
}
