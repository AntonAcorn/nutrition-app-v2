import { useMemo } from 'react'
import { DraftItemEditor } from './DraftItemEditor'
import { calculateTotals } from '../model/photoAnalysis'
import type { DraftItem, PhotoAnalysisDraft } from '../../../shared/types/nutrition'
import { FoodEnergyHint } from '../../wellbeing/components/FoodEnergyHint'

export type DraftEntryStatus = 'analyzing' | 'idle' | 'saving' | 'saved' | 'error'

export interface DraftEntry {
  localId: string
  thumbnail: string
  status: DraftEntryStatus
  draft: PhotoAnalysisDraft | null
  saveError: string
  analyzeError: string
  expanded: boolean
}

interface Props {
  entry: DraftEntry
  onSave: (localId: string) => void
  onDiscard: (localId: string) => void
  onToggleExpand: (localId: string) => void
  onUpdateItem: (localId: string, itemId: string, field: keyof DraftItem, value: string) => void
  onUpdateNotes: (localId: string, value: string) => void
  onSaveToLibrary?: (localId: string) => void
}

export function PhotoDraftCard({ entry, onSave, onDiscard, onToggleExpand, onUpdateItem, onUpdateNotes, onSaveToLibrary }: Props) {
  const totals = useMemo(
    () => (entry.draft ? calculateTotals(entry.draft.items) : calculateTotals([])),
    [entry.draft],
  )

  const mealName = useMemo(() => {
    if (!entry.draft || entry.draft.items.length === 0) return 'Analyzed meal'
    return entry.draft.items.slice(0, 2).map(i => i.name).join(', ')
  }, [entry.draft])

  const confidenceLevel = useMemo(() => {
    if (!entry.draft) return null
    const pct = entry.draft.confidence > 1 ? entry.draft.confidence : entry.draft.confidence * 100
    if (pct >= 80) return 'high'
    if (pct >= 55) return 'medium'
    return 'low'
  }, [entry.draft])

  if (entry.status === 'saved') {
    return (
      <div className="photo-draft-card photo-draft-card--saved">
        <img src={entry.thumbnail} className="photo-draft-card__thumb" alt="" />
        <span className="photo-draft-card__saved-label">✓ Saved</span>
      </div>
    )
  }

  if (entry.status === 'analyzing') {
    return (
      <div className="photo-draft-card photo-draft-card--analyzing">
        <img src={entry.thumbnail} className="photo-draft-card__thumb" alt="" />
        <div className="photo-draft-card__info">
          <span className="subtle-text">Analyzing…</span>
        </div>
      </div>
    )
  }

  if (entry.status === 'error') {
    return (
      <div className="photo-draft-card photo-draft-card--error">
        <img src={entry.thumbnail} className="photo-draft-card__thumb" alt="" />
        <div className="photo-draft-card__info">
          <p className="error-text" style={{ fontSize: '0.8rem', margin: 0 }}>
            {entry.analyzeError || 'Analysis failed'}
          </p>
        </div>
        <button
          type="button"
          className="photo-draft-card__discard-btn"
          onClick={() => onDiscard(entry.localId)}
          title="Remove"
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <div className="photo-draft-card">
      <div className="photo-draft-card__top">
        <img src={entry.thumbnail} className="photo-draft-card__thumb" alt="" />
        <div className="photo-draft-card__summary">
          <div className="photo-draft-card__name-row">
            <p className="photo-draft-card__name">{mealName}</p>
            {confidenceLevel && (
              <span className={`photo-draft-card__confidence photo-draft-card__confidence--${confidenceLevel}`}>
                {confidenceLevel === 'high' ? 'Good match' : confidenceLevel === 'medium' ? 'Review' : 'Check carefully'}
              </span>
            )}
          </div>
          <p className="photo-draft-card__macros">
            {Math.round(totals.calories)} kcal
            <span className="photo-draft-card__sep">·</span>P {totals.protein}g
            <span className="photo-draft-card__sep">·</span>F {totals.fat}g
            <span className="photo-draft-card__sep">·</span>C {totals.carbs}g
          </p>
        </div>
      </div>

      <FoodEnergyHint name={mealName} />

      <div className="photo-draft-card__actions">
        <button
          type="button"
          className="photo-draft-card__save-btn"
          onClick={() => onSave(entry.localId)}
          disabled={entry.status === 'saving'}
        >
          {entry.status === 'saving' ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          className="photo-draft-card__edit-btn"
          onClick={() => onToggleExpand(entry.localId)}
        >
          {entry.expanded ? 'Details ▲' : 'Details ▼'}
        </button>
        <button
          type="button"
          className="photo-draft-card__discard-btn"
          onClick={() => onDiscard(entry.localId)}
          disabled={entry.status === 'saving'}
          title="Discard"
        >
          ✕
        </button>
      </div>

      {entry.saveError && (
        <p className="error-text" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
          {entry.saveError}
        </p>
      )}

      {entry.expanded && entry.draft && (
        <div className="photo-draft-card__details">
          <div className="draft-items-list">
            {entry.draft.items.map(item => (
              <DraftItemEditor
                key={item.id}
                item={item}
                onChange={(itemId, field, value) => onUpdateItem(entry.localId, itemId, field, value)}
              />
            ))}
          </div>
          <div className="notes-block" style={{ marginTop: '8px' }}>
            <label>
              Notes
              <textarea
                value={entry.draft.notes.join('\n')}
                onChange={e => onUpdateNotes(entry.localId, e.target.value)}
                rows={2}
              />
            </label>
          </div>
          {onSaveToLibrary && (
            <button
              type="button"
              className="photo-draft-save-to-library-btn"
              onClick={() => onSaveToLibrary(entry.localId)}
            >
              Save to library →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
