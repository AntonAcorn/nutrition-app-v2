import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getActiveSession, startFast, stopFast, getFastingHistory, deleteFastingSession, type FastingSession } from '../model/fastingApi'

const PROTOCOLS = [
  { hours: 8,  label: '8 hours'  },
  { hours: 16, label: '16 hours' },
  { hours: 24, label: '24 hours' },
  { hours: 36, label: '36 hours' },
]

const CIRCUMFERENCE = 2 * Math.PI * 54

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatDuration(startedAt: string, endedAt: string): string {
  const sec = Math.floor((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function FastingTab() {
  const queryClient = useQueryClient()
  const activeQuery = useQuery<FastingSession | null>({
    queryKey: ['fasting', 'active'],
    queryFn: () => getActiveSession(),
  })
  const historyQuery = useQuery<FastingSession[]>({
    queryKey: ['fasting', 'history'],
    queryFn: () => getFastingHistory(),
  })
  const active = activeQuery.data ?? null
  const history = historyQuery.data ?? []
  const loading = activeQuery.isLoading || historyQuery.isLoading
  function setActive(next: FastingSession | null) {
    queryClient.setQueryData(['fasting', 'active'], next)
  }
  function setHistory(updater: FastingSession[] | ((prev: FastingSession[]) => FastingSession[])) {
    queryClient.setQueryData<FastingSession[]>(['fasting', 'history'], (prev) => {
      const cur = prev ?? []
      return typeof updater === 'function' ? (updater as (p: FastingSession[]) => FastingSession[])(cur) : updater
    })
  }
  const [elapsed, setElapsed] = useState(0)
  const [selected, setSelected] = useState(16)
  const [customHours, setCustomHours] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState(activeQuery.error || historyQuery.error ? 'Failed to load fasting data' : '')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (!active) { setElapsed(0); return }
    function tick() {
      setElapsed(Math.floor((Date.now() - new Date(active!.startedAt).getTime()) / 1000))
    }
    tick()
    intervalRef.current = setInterval(tick, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [active])

  async function handleStart() {
    const hours = showCustom ? (parseInt(customHours, 10) || 16) : selected
    setActing(true); setError('')
    try {
      setActive(await startFast(hours))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start')
    } finally { setActing(false) }
  }

  async function handleStop() {
    setActing(true); setError('')
    try {
      const sess = await stopFast()
      setActive(null)
      setHistory(prev => [sess, ...prev].slice(0, 10))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to stop')
    } finally { setActing(false) }
  }

  async function handleDelete(id: string) {
    try {
      await deleteFastingSession(id)
      setHistory(prev => prev.filter(s => s.id !== id))
    } catch { /* ignore */ }
  }

  const targetSec = (active?.targetHours ?? selected) * 3600
  const progress = active ? Math.min(elapsed / targetSec, 1) : 0
  const dashOffset = CIRCUMFERENCE * (1 - progress)
  const targetReached = active ? elapsed >= targetSec : false
  const ringColor = targetReached ? '#22c55e' : progress >= 0.85 ? '#f97316' : '#6f4cff'

  if (loading) {
    return (
      <section className="screen-section screen-section--home-dark screen-section--fill">
        <div style={{ padding: '0 16px' }}>
          <div className="skeleton-card skeleton-center">
            <div className="skeleton skeleton--circle" style={{ width: 160, height: 160 }} />
            <div className="skeleton" style={{ height: '1rem', width: '50%' }} />
            <div className="skeleton" style={{ height: '2.8rem', width: '100%', borderRadius: '1rem' }} />
            <div className="skeleton" style={{ height: '2.8rem', width: '100%', borderRadius: '1rem' }} />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="screen-section screen-section--home-dark screen-section--fill">
      <div className="panel fasting-panel">

        {/* Ring */}
        <div className="fasting-ring-wrap">
          <svg viewBox="0 0 120 120" className="fasting-ring" aria-hidden="true">
            <circle cx="60" cy="60" r="54" className="fasting-ring__track" />
            <circle
              cx="60" cy="60" r="54"
              className="fasting-ring__progress"
              stroke={ringColor}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
            />
            <text x="60" y="53" className="fasting-ring__time">{active ? formatElapsed(elapsed) : '--:--:--'}</text>
            <text x="60" y="70" className="fasting-ring__sub">
              {active
                ? (targetReached ? 'goal reached!' : `of ${active.targetHours}h goal`)
                : 'not fasting'}
            </text>
          </svg>
        </div>

        {/* Protocol picker */}
        {!active && (
          <>
            <p className="fasting-section-label">Fast duration</p>
            <div className="fasting-protocols">
              {PROTOCOLS.map(p => (
                <button
                  key={p.hours}
                  type="button"
                  className={`fasting-protocol-btn ${!showCustom && selected === p.hours ? 'fasting-protocol-btn--active' : ''}`}
                  onClick={() => { setSelected(p.hours); setShowCustom(false) }}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                className={`fasting-protocol-btn ${showCustom ? 'fasting-protocol-btn--active' : ''}`}
                onClick={() => setShowCustom(true)}
              >
                Custom
              </button>
            </div>

            {showCustom && (
              <div className="fasting-custom-wrap">
                <input
                  type="number"
                  min={1}
                  max={72}
                  value={customHours}
                  onChange={e => setCustomHours(e.target.value)}
                  placeholder="e.g. 14"
                  className="fasting-custom-input"
                />
                <span className="fasting-custom-unit">hours</span>
              </div>
            )}
          </>
        )}

        {active && (
          <p className="fasting-status-text">
            Started {formatDate(active.startedAt)} · {active.targetHours}h target
          </p>
        )}

        {error ? <p className="error-text" style={{ textAlign: 'center' }}>{error}</p> : null}

        {active ? (
          <button type="button" className="fasting-action-btn fasting-action-btn--stop" onClick={handleStop} disabled={acting}>
            {acting ? 'Stopping...' : 'End fast'}
          </button>
        ) : (
          <button type="button" className="fasting-action-btn" onClick={handleStart} disabled={acting}>
            {acting ? 'Starting...' : `Start ${showCustom ? ((customHours || '?') + 'h') : selected + 'h'} fast`}
          </button>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="panel fasting-history">
          <p className="fasting-history__title">Recent fasts</p>
          {history.map(sess => {
            const dur = sess.endedAt ? Math.floor((new Date(sess.endedAt).getTime() - new Date(sess.startedAt).getTime()) / 1000) : 0
            const achieved = dur >= sess.targetHours * 3600
            return (
              <div key={sess.id} className="fasting-history__item">
                <div className="fasting-history__item-left">
                  <span className="fasting-history__date">{formatDate(sess.startedAt)}</span>
                  <span className="fasting-history__protocol">{sess.targetHours}h target</span>
                </div>
                <div className="fasting-history__right">
                  <span className="fasting-history__duration">{sess.endedAt ? formatDuration(sess.startedAt, sess.endedAt) : '—'}</span>
                  {achieved && <span className="fasting-history__badge fasting-history__badge--achieved">✓</span>}
                  <button type="button" className="fasting-history__delete" onClick={() => handleDelete(sess.id)} aria-label="Delete">×</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
