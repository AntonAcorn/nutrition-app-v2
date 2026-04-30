import { API_BASE } from '../../../shared/lib/apiBase'
import type { MealTemplate, MealTemplateItem } from '../../../shared/types/nutrition'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try { const b = await res.json(); if (b.message) msg = b.message } catch {}
    throw new Error(msg)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export function listTemplates(): Promise<MealTemplate[]> {
  return request('/api/meal-templates')
}

export function createTemplate(name: string, items: MealTemplateItem[]): Promise<MealTemplate> {
  return request('/api/meal-templates', {
    method: 'POST',
    body: JSON.stringify({ name, items }),
  })
}

export function updateTemplate(id: string, name: string, items: MealTemplateItem[]): Promise<MealTemplate> {
  return request(`/api/meal-templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name, items }),
  })
}

export function deleteTemplate(id: string): Promise<void> {
  return request(`/api/meal-templates/${id}`, { method: 'DELETE' })
}

export function logTemplate(id: string, entryDate: string): Promise<void> {
  return request(`/api/meal-templates/${id}/log`, {
    method: 'POST',
    body: JSON.stringify({ entryDate }),
  })
}
