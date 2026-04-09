import type { DraftItem } from '../../../shared/types/nutrition'
import { numericFields } from '../model/photoAnalysis'

interface DraftItemEditorProps {
  item: DraftItem
  onChange: (itemId: string, field: keyof DraftItem, value: string) => void
}

const fieldLabels: Record<string, string> = {
  calories: 'Калории',
  protein: 'Белки',
  fat: 'Жиры',
  carbs: 'Углеводы',
  fiber: 'Клетчатка',
}

export function DraftItemEditor({ item, onChange }: DraftItemEditorProps) {
  return (
    <article className="draft-item-card">
      <div className="draft-item-card__header">
        <label>
          Название
          <input value={item.name} onChange={(event) => onChange(item.id, 'name', event.target.value)} />
        </label>

        <label>
          Порция
          <input
            value={item.estimatedPortion}
            onChange={(event) => onChange(item.id, 'estimatedPortion', event.target.value)}
          />
        </label>
      </div>

      <div className="draft-item-card__grid">
        {numericFields.map((field) => (
          <label key={field}>
            {fieldLabels[field] ?? field}
            <input
              type="number"
              step="0.1"
              value={item[field]}
              onChange={(event) => onChange(item.id, field, event.target.value)}
            />
          </label>
        ))}
      </div>
    </article>
  )
}
