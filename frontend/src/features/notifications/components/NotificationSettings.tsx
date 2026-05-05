import { useEffect, useState } from 'react'
import { getSubscriptionStatus, subscribePush, unsubscribePush, updatePushSettings, isPushSupported } from '../model/pushApi'
import type { PushSubscriptionStatus } from '../model/pushApi'

const HOURS = Array.from({ length: 24 }, (_, i) => i)

function formatHour(h: number) {
  const ampm = h < 12 ? 'AM' : 'PM'
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display}:00 ${ampm}`
}

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
      setStatus({ subscribed: false, enabled: false, reminderHour })
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

  if (!supported) return (
    <div className="notif-settings-section">
      <p className="screen-header__meta">Notifications</p>
      <p className="notif-settings__unsupported">Push notifications are not supported in this browser.</p>
    </div>
  )

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
            <p className="notif-settings-card__title">Daily reminder</p>
            <p className="notif-settings-card__desc">
              {isOn
                ? `Reminder at ${formatHour(reminderHour)} if you haven't logged`
                : 'Get a nudge when you forget to log'}
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
        )}

        {error && <p className="error-text" style={{ marginTop: '0.5rem' }}>{error}</p>}
      </div>
    </div>
  )
}
