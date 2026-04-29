import { CSSProperties, FormEvent, useEffect, useState } from 'react'
import { fetchProfile, updateProfile, type UserProfile } from '../model/profileApi'
import type { OnboardingPayload } from '../../onboarding/model/profileApi'

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary',
  lightly_active: 'Lightly active',
  moderately_active: 'Moderately active',
  very_active: 'Very active',
}

const GOAL_LABELS: Record<string, string> = {
  lose: 'Lose weight',
  maintain: 'Maintain weight',
  gain: 'Gain weight',
}

const STRATEGY_LABELS: Record<string, string> = {
  mild: 'Mild (~0.25 kg/week)',
  optimal: 'Optimal (~0.5 kg/week)',
  aggressive: 'Aggressive (~0.7 kg/week)',
}

const optionStyle = (selected: boolean): CSSProperties => ({
  border: selected ? '1.5px solid rgba(255,255,255,0.75)' : '1px solid rgba(255,255,255,0.12)',
  color: selected ? '#ffffff' : 'rgba(255,255,255,0.45)',
  background: selected ? 'rgba(255,255,255,0.08)' : 'transparent',
  textAlign: 'left',
})

interface Props {
  displayName: string | null
  email: string | null
  onLogout: () => void
}

export function ProfileTab({ displayName, email, onLogout }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)

  const [ageYears, setAgeYears] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [heightCm, setHeightCm] = useState('')
  const [startingWeightKg, setStartingWeightKg] = useState('')
  const [activityLevel, setActivityLevel] = useState<OnboardingPayload['activityLevel'] | ''>('')
  const [goal, setGoal] = useState<OnboardingPayload['goal'] | ''>('')
  const [weightLossStrategy, setWeightLossStrategy] = useState<OnboardingPayload['weightLossStrategy'] | ''>('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    fetchProfile()
      .then(setProfile)
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [])

  function startEditing() {
    if (!profile) return
    setAgeYears(String(profile.ageYears))
    setGender(profile.gender as 'male' | 'female')
    setHeightCm(String(profile.heightCm))
    setStartingWeightKg(String(profile.startingWeightKg))
    setActivityLevel(profile.activityLevel as OnboardingPayload['activityLevel'])
    setGoal(profile.goal as OnboardingPayload['goal'])
    setWeightLossStrategy((profile.weightLossStrategy ?? '') as OnboardingPayload['weightLossStrategy'])
    setSaveError('')
    setEditing(true)
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    if (!goal || !gender || !activityLevel) return
    setSaving(true)
    setSaveError('')
    try {
      const updated = await updateProfile({
        ageYears: Number(ageYears),
        gender,
        heightCm: Number(heightCm),
        startingWeightKg: Number(startingWeightKg),
        activityLevel,
        goal,
        weightLossStrategy: goal === 'lose' ? weightLossStrategy || undefined : undefined,
      })
      setProfile(updated)
      setEditing(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const initials = displayName
    ? displayName.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : email?.[0]?.toUpperCase() ?? '?'

  if (loading) {
    return (
      <section className="screen-section--home-dark">
        <p className="subtle-text">Loading...</p>
      </section>
    )
  }

  if (error || !profile) {
    return (
      <section className="screen-section--home-dark">
        <p className="error-text">{error || 'Profile not found'}</p>
      </section>
    )
  }

  if (editing) {
    return (
      <section className="screen-section--home-dark">
        <form className="auth-panel--dark" onSubmit={handleSave}>
          <div className="auth-form-grid">
            <label>
              Age (years)
              <input type="number" min={10} max={120} value={ageYears} onChange={(e) => setAgeYears(e.target.value)} />
            </label>

            <div>
              <label style={{ display: 'block', marginBottom: '6px' }}>Gender</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(['male', 'female'] as const).map((v) => (
                  <button key={v} type="button" className="tab-button tab-button--dark" style={optionStyle(gender === v)} onClick={() => setGender(v)}>
                    {v === 'male' ? 'Male' : 'Female'}
                  </button>
                ))}
              </div>
            </div>

            <label>
              Height (cm)
              <input type="number" min={100} max={250} value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
            </label>

            <label>
              Starting weight (kg)
              <input type="number" min={30} max={300} step="0.1" value={startingWeightKg} onChange={(e) => setStartingWeightKg(e.target.value)} />
            </label>

            <div>
              <label style={{ display: 'block', marginBottom: '6px' }}>Activity level</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(
                  [
                    { value: 'sedentary', label: 'Sedentary (little or no exercise)' },
                    { value: 'lightly_active', label: 'Lightly active (1–3 days/week)' },
                    { value: 'moderately_active', label: 'Moderately active (3–5 days/week)' },
                    { value: 'very_active', label: 'Very active (6–7 days/week)' },
                  ] as const
                ).map(({ value, label }) => (
                  <button key={value} type="button" className="tab-button tab-button--dark" style={optionStyle(activityLevel === value)} onClick={() => setActivityLevel(value)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px' }}>Goal</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(
                  [
                    { value: 'lose', label: 'Lose weight' },
                    { value: 'maintain', label: 'Maintain weight' },
                    { value: 'gain', label: 'Gain weight' },
                  ] as const
                ).map(({ value, label }) => (
                  <button key={value} type="button" className="tab-button tab-button--dark" style={optionStyle(goal === value)} onClick={() => { setGoal(value); setWeightLossStrategy('') }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {goal === 'lose' && (
              <div>
                <label style={{ display: 'block', marginBottom: '6px' }}>Weight loss pace</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(
                    [
                      { value: 'mild', label: 'Mild', desc: '~0.25 kg/week' },
                      { value: 'optimal', label: 'Optimal', desc: '~0.5 kg/week' },
                      { value: 'aggressive', label: 'Aggressive', desc: '~0.7 kg/week' },
                    ] as const
                  ).map(({ value, label, desc }) => (
                    <button key={value} type="button" className="tab-button tab-button--dark" style={optionStyle(weightLossStrategy === value)} onClick={() => setWeightLossStrategy(value)}>
                      {label} — <span style={{ opacity: 0.65, fontWeight: 400 }}>{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {saveError ? <p className="error-text">{saveError}</p> : null}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="tab-button tab-button--dark" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button type="submit" disabled={saving} style={{ flex: 1 }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </section>
    )
  }

  return (
    <section className="screen-section--home-dark">
      <div className="panel profile-header-card">
        <div className="profile-avatar">{initials}</div>
        <div>
          <p className="profile-header-card__name">{displayName || email}</p>
          {displayName && email ? <p className="profile-header-card__email">{email}</p> : null}
        </div>
      </div>

      <div className="panel">
        <p className="profile-section-title">Body</p>
        <div className="profile-stats-grid">
          <div className="profile-stat">
            <span className="profile-stat__label">Age</span>
            <span className="profile-stat__value">{profile.ageYears} yr</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat__label">Gender</span>
            <span className="profile-stat__value" style={{ textTransform: 'capitalize' }}>{profile.gender}</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat__label">Height</span>
            <span className="profile-stat__value">{profile.heightCm} cm</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat__label">Starting weight</span>
            <span className="profile-stat__value">{profile.startingWeightKg} kg</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <p className="profile-section-title">Goals &amp; activity</p>
        <div className="profile-stats-grid">
          <div className="profile-stat profile-stat--full">
            <span className="profile-stat__label">Goal</span>
            <span className="profile-stat__value">{GOAL_LABELS[profile.goal] ?? profile.goal}</span>
          </div>
          {profile.weightLossStrategy ? (
            <div className="profile-stat profile-stat--full">
              <span className="profile-stat__label">Pace</span>
              <span className="profile-stat__value">{STRATEGY_LABELS[profile.weightLossStrategy] ?? profile.weightLossStrategy}</span>
            </div>
          ) : null}
          <div className="profile-stat profile-stat--full">
            <span className="profile-stat__label">Activity</span>
            <span className="profile-stat__value">{ACTIVITY_LABELS[profile.activityLevel] ?? profile.activityLevel}</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <p className="profile-section-title">Daily calorie target</p>
        <div className="profile-calorie-badge">
          <span className="profile-calorie-badge__number">{Math.round(Number(profile.dailyCalorieTargetKcal))}</span>
          <span className="profile-calorie-badge__unit">kcal / day</span>
        </div>
      </div>

      <div className="auth-form-grid">
        <button type="button" onClick={startEditing}>Edit profile</button>
        <button type="button" className="profile-logout-btn" onClick={onLogout}>Log out</button>
      </div>
    </section>
  )
}
