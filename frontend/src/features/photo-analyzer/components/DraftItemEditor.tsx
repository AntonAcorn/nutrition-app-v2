import type { DraftItem } from '../../../shared/types/nutrition'
import { numericFields } from '../model/photoAnalysis'

interface DraftItemEditorProps {
  item: DraftItem
  onChange: (itemId: string, field: keyof DraftItem, value: string) => void
}

export function DraftItemEditor({ item, onChange }: DraftItemEditorProps) {
  return (
    <article className="draft-item-card">
      <label>
        Название
        <input value={item.name} onChange={(event) => onChange(item.id, 'name', event.target.value)} />
      </label>

      <label>
        Portion estimate
        <input
          value={item.estimatedPortion}
          onChange={(event) => onChange(item.id, 'estimatedPortion', event.target.value)}
        />
      </label>

      <div className="draft-item-card__grid">
        {numericFields.map((field) => (
          <label key={field}>
            {field}
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
