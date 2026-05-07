import { apiClient } from '../../../shared/lib/apiClient'
import type { MealTemplate, MealTemplateItem } from '../../../shared/types/nutrition'

export function listTemplates(): Promise<MealTemplate[]> {
  return apiClient.get<MealTemplate[]>('/api/meal-templates')
}

export function createTemplate(name: string, items: MealTemplateItem[]): Promise<MealTemplate> {
  return apiClient.post<MealTemplate>('/api/meal-templates', { name, items })
}

export function updateTemplate(id: string, name: string, items: MealTemplateItem[]): Promise<MealTemplate> {
  return apiClient.put<MealTemplate>(`/api/meal-templates/${id}`, { name, items })
}

export function deleteTemplate(id: string): Promise<void> {
  return apiClient.delete(`/api/meal-templates/${id}`)
}

export function logTemplate(id: string, entryDate: string, slotType?: string): Promise<void> {
  return apiClient.post(`/api/meal-templates/${id}/log`, { entryDate, slotType })
}

export function unlogTemplate(id: string, entryDate: string): Promise<void> {
  return apiClient.post(`/api/meal-templates/${id}/unlog`, { entryDate })
}
