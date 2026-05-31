import { useEffect, useState } from 'react'
import { getSubscriptionStatus, subscribePush, unsubscribePush, updatePushSettings, isPushSupported } from '../model/pushApi'
import type { PushSubscriptionStatus } from '../model/pushApi'

const HOURS = Array.from({ length: 24 }, (_, i) => i)

function formatHour(h: number) {
  const ampm = h < 12 ? 'AM' : 'PM'
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display}:00 ${ampm}`
}

type TypeKey = 'notifyDailyLog' | 'notifyBankWin' | 'notifyStreak'

const TYPES: { key: TypeKey; emoji: string; title: string; desc: string }[] = [
  { key: 'notifyDailyLog', emoji: '🍽',  title: 'Daily log reminder', desc: "Nudge if you haven't logged yet today" },
  { key: 'notifyBankWin',  emoji: '🏦', title: 'Calorie bank wins',  desc: 'Celebrate days under target' },
  { key: 'notifyStreak',   emoji: '🔥', title: 'Streak milestones',  desc: 'Heads-up on 3-day+ streaks' },
]

export function NotificationSettings() {
  const [status, setStatus] = useState<PushSubscriptionStatus | null>(null)
  const [reminderHour, setReminderHour] = useState(20)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [supported, setSupported] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    isPushSupported().then(s => {
      setSupported(s)
      if (!s) { setLoading(false); return }
      getSubscriptionStatus()
        .then(st => { setStatus(st); setReminderHour(st.reminderHour) })
        .catch(() => {})
        .finally(() => setLoading(false))
    })
  }, [])

  async function handleEnable() {
    setError('')
    setSaving(true)
    try {
      const next = await subscribePush(reminderHour)
      setStatus(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to enable notifications')
    } finally {
      setSaving(false)
    }
  }

  async function handleDisable() {
    setSaving(true)
    try {
      await unsubscribePush()
      setStatus({
        subscribed: false,
        enabled: false,
        reminderHour,
        notifyDailyLog: true,
        notifyBankWin: true,
        notifyStreak: true,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to disable')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveTime() {
    if (!status?.subscribed) return
    setSaving(true)
    setError('')
    try {
      const next = await updatePushSettings(status.enabled, reminderHour)
      setStatus(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function toggleType(key: TypeKey) {
    if (!status?.subscribed) return
    const nextValue = !status[key]
    // Optimistic update so the toggle responds instantly; revert on failure.
    const prev = status
    setStatus({ ...status, [key]: nextValue })
    setSaving(true)
    setError('')
    try {
      const next = await updatePushSettings(status.enabled, reminderHour, { [key]: nextValue })
      setStatus(next)
    } catch (e) {
      setStatus(prev)
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!supported) {
    const isIOSWeb = /iPad|iPhone|iPod/.test(navigator.userAgent)
      && (window.navigator as { standalone?: boolean }).standalone !== true
    return (
      <div className="notif-settings-section">
        <p className="screen-header__meta">Notifications</p>
        <p className="notif-settings__unsupported">
          {isIOSWeb
            ? 'To get reminders, install the Rumbly Eats app from the App Store, or open this site once and add it to your Home Screen.'
            : 'Push notifications are not supported in this browser. Install the app to enable reminders.'}
        </p>
      </div>
    )
  }

  if (loading) return (
    <div className="notif-settings-section">
      <p className="screen-header__meta">Notifications</p>
      <p className="notif-settings__unsupported">Loading...</p>
    </div>
  )

  const isOn = status?.subscribed && status?.enabled

  return (
    <div className="notif-settings-section">
      <p className="screen-header__meta">Notifications</p>

      <div className="notif-settings-card">
        <div className="notif-settings-card__row">
          <div>
            <p className="notif-settings-card__title">Push notifications</p>
            <p className="notif-settings-card__desc">
              {isOn
                ? `On — quiet hours unchecked at ${formatHour(reminderHour)}`
                : 'Get coach nudges, streak news, and gentle reminders'}
            </p>
          </div>
          <button
            type="button"
            className={`notif-toggle ${isOn ? 'notif-toggle--on' : ''}`}
            onClick={isOn ? handleDisable : handleEnable}
            disabled={saving}
          >
            {saving ? '...' : isOn ? 'On' : 'Off'}
          </button>
        </div>

        {isOn && (
          <>
            <div className="notif-settings-card__time">
              <label className="notif-settings-card__time-label">
                Reminder time
                <select
                  value={reminderHour}
                  onChange={e => setReminderHour(Number(e.target.value))}
                  className="notif-settings-card__time-select"
                >
                  {HOURS.map(h => (
                    <option key={h} value={h}>{formatHour(h)}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="notif-settings-card__save-btn"
                onClick={handleSaveTime}
                disabled={saving || reminderHour === status?.reminderHour}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>

            <div className="notif-settings-types">
              {TYPES.map(({ key, emoji, title, desc }) => {
                const on = !!status?.[key]
                return (
                  <button
                    key={key}
                    type="button"
                    className="notif-settings-type"
                    onClick={() => toggleType(key)}
                    disabled={saving}
                  >
                    <div className="notif-settings-type__main">
                      <span className="notif-settings-type__emoji">{emoji}</span>
                      <div>
                        <p className="notif-settings-type__title">{title}</p>
                        <p className="notif-settings-type__desc">{desc}</p>
                      </div>
                    </div>
                    <span className={`notif-mini-toggle ${on ? 'notif-mini-toggle--on' : ''}`}>
                      {on ? 'On' : 'Off'}
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {error && <p className="error-text" style={{ marginTop: '0.5rem' }}>{error}</p>}
      </div>
    </div>
  )
}
