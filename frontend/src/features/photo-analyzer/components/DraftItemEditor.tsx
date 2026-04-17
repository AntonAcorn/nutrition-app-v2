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
              value={item[field]}
              onChange={(event) => onChange(item.id, field, event.target.value)}
            />
          </label>
        ))}
      </div>
    </article>
  )
}
