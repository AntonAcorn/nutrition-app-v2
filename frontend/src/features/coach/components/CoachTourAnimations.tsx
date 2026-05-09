/**
 * Tiny inline demos that visualize each tour slide. They are pure CSS-driven
 * so they animate on mount and pause on exit. Re-keyed by index in CoachTour
 * so re-entering an earlier slide replays the animation.
 */

export function WeekScanAnimation() {
  return (
    <div className="tour-anim tour-anim--week">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="tour-anim__day"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
      <div className="tour-anim__brain">🧠</div>
    </div>
  )
}

export function PatternCardAnimation() {
  return (
    <div className="tour-anim tour-anim--pattern">
      <div className="tour-anim__card">
        <div className="tour-anim__card-row">
          <span className="tour-anim__card-emoji">🎯</span>
          <span className="tour-anim__card-title">Wednesdays run high</span>
        </div>
        <div className="tour-anim__card-bars">
          <div className="tour-anim__bar" style={{ animationDelay: '120ms', height: '32%' }} />
          <div className="tour-anim__bar" style={{ animationDelay: '180ms', height: '38%' }} />
          <div className="tour-anim__bar tour-anim__bar--hot" style={{ animationDelay: '240ms', height: '85%' }} />
          <div className="tour-anim__bar" style={{ animationDelay: '300ms', height: '36%' }} />
          <div className="tour-anim__bar" style={{ animationDelay: '360ms', height: '40%' }} />
        </div>
      </div>
    </div>
  )
}

export function PushAnimation() {
  return (
    <div className="tour-anim tour-anim--push">
      <div className="tour-anim__phone">
        <div className="tour-anim__notch" />
        <div className="tour-anim__push">
          <span className="tour-anim__push-icon">🧠</span>
          <div className="tour-anim__push-body">
            <div className="tour-anim__push-title">Yesterday felt rough</div>
            <div className="tour-anim__push-text">Open Coach — there might be a pattern.</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function BankAnimation() {
  return (
    <div className="tour-anim tour-anim--bank">
      <div className="tour-anim__bank-deltas">
        <span className="tour-anim__bank-delta tour-anim__bank-delta--in" style={{ animationDelay: '120ms' }}>+50</span>
        <span className="tour-anim__bank-delta tour-anim__bank-delta--in" style={{ animationDelay: '320ms' }}>+120</span>
        <span className="tour-anim__bank-delta tour-anim__bank-delta--out" style={{ animationDelay: '520ms' }}>−200</span>
      </div>
      <div className="tour-anim__bank-emoji">🏦</div>
    </div>
  )
}

export function FocusTagsAnimation() {
  const tags = [
    { emoji: '⚡', label: 'Energy', delay: 100, picked: true },
    { emoji: '🙂', label: 'Mood', delay: 250, picked: true },
    { emoji: '⚖️', label: 'Weight', delay: 400, picked: false },
    { emoji: '🏃', label: 'Performance', delay: 550, picked: false },
  ]
  return (
    <div className="tour-anim tour-anim--focus">
      {tags.map(t => (
        <div
          key={t.label}
          className={`tour-anim__tag${t.picked ? ' tour-anim__tag--picked' : ''}`}
          style={{ animationDelay: `${t.delay}ms` }}
        >
          <span className="tour-anim__tag-emoji">{t.emoji}</span>
          <span className="tour-anim__tag-label">{t.label}</span>
        </div>
      ))}
    </div>
  )
}
