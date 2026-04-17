import { useEffect, useState } from 'react'
import type { DraftItem } from '../../../shared/types/nutrition'
import { numericFields } from '../model/photoAnalysis'

interface DraftItemEditorProps {
  item: DraftItem
  onChange: (itemId: string, field: keyof DraftItem, value: string) => void
}

const fieldLabels: Record<string, string> = {
  calories: 'Calories',
  protein: 'Protein',
  fat: 'Fat',
  carbs: 'Carbs',
  fiber: 'Fiber',
}

export function DraftItemEditor({ item, onChange }: DraftItemEditorProps) {
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})

  useEffect(() => {
    setFieldValues({
      calories: String(item.calories),
      protein: String(item.protein),
      fat: String(item.fat),
      carbs: String(item.carbs),
      fiber: String(item.fiber),
    })
  }, [item.calories, item.protein, item.fat, item.carbs, item.fiber])

  return (
    <article className="draft-item-card">
      <div className="draft-item-card__header">
        <label className="draft-item-card__name-field">
          <span className="draft-item-card__field-label">Name</span>
          <input value={item.name} onChange={(event) => onChange(item.id, 'name', event.target.value)} />
        </label>

        <label className="draft-item-card__portion-field">
          <span className="draft-item-card__field-label">Portion</span>
          <input
            value={item.estimatedPortion}
            onChange={(event) => onChange(item.id, 'estimatedPortion', event.target.value)}
          />
        </label>
      </div>

      <div className="draft-item-card__grid">
        {numericFields.map((field) => (
          <label key={field} className="draft-item-card__metric-field">
            <span className="draft-item-card__field-label">{fieldLabels[field] ?? field}</span>
            <input
              type="number"
              step="0.1"
              value={fieldValues[field] ?? String(item[field])}
              onChange={(event) => {
                const nextValue = event.target.value
                setFieldValues((current) => ({ ...current, [field]: nextValue }))
                if (nextValue.trim() === '') {
                  return
                }
                onChange(item.id, field, nextValue)
              }}
              onBlur={(event) => {
                const nextValue = event.target.value.trim()
                if (nextValue === '') {
                  setFieldValues((current) => ({ ...current, [field]: '0' }))
                  onChange(item.id, field, '0')
                }
              }}
            />
          </label>
        ))}
      </div>
    </article>
  )
}
