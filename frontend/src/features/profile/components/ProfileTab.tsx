import { CSSProperties, FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchProfile, updateProfile, type UserProfile, COACH_FOCUS_TAGS, type CoachFocusTag, parseCoachFocus, serializeCoachFocus } from '../model/profileApi'
import type { OnboardingPayload } from '../../onboarding/model/profileApi'
import { NotificationSettings } from '../../notifications/components/NotificationSettings'
import { exportNutritionCsv } from '../model/exportData'
import { useCalorieBank } from '../../calorie-bank/model/useCalorieBank'
import { CalorieBankSheet } from '../../calorie-bank/components/CalorieBankSheet'
import { AboutRumblySheet } from './AboutRumblySheet'
import { localDateString } from '../../statistics/model/formatters'

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
  border: selected ? '1.5px solid var(--opt-border-on)' : '1px solid var(--opt-border-off)',
  color: selected ? 'var(--opt-color-on)' : 'var(--opt-color-off)',
  background: selected ? 'var(--opt-bg-on)' : 'transparent',
  textAlign: 'left',
})

interface Props {
  displayName: string | null
  email: string | null
  onLogout: () => void
  onDeleteAccount: () => void
}

export function ProfileTab({ displayName, email, onLogout, onDeleteAccount }: Props) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const profileQuery = useQuery<UserProfile>({
    queryKey: ['profile'],
    queryFn: () => fetchProfile(),
  })
  const profile = profileQuery.data ?? null
  const loading = profileQuery.isLoading
  const error = profileQuery.error instanceof Error ? 'Failed to load profile' : ''
  function setProfile(updated: UserProfile) {
    queryClient.setQueryData(['profile'], updated)
  }
  const [editing, setEditing] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showBank, setShowBank] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const todayStr = localDateString(new Date())
  const { snapshot: bankSnapshot } = useCalorieBank(todayStr)

  async function handleExport(days: number) {
    setExporting(true)
    try {
      await exportNutritionCsv(days)
    } finally {
      setExporting(false)
      setShowExport(false)
    }
  }

  const [ageYears, setAgeYears] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [heightCm, setHeightCm] = useState('')
  const [startingWeightKg, setStartingWeightKg] = useState('')
  const [targetWeightKg, setTargetWeightKg] = useState('')
  const [activityLevel, setActivityLevel] = useState<OnboardingPayload['activityLevel'] | ''>('')
  const [goal, setGoal] = useState<OnboardingPayload['goal'] | ''>('')
  const [weightLossStrategy, setWeightLossStrategy] = useState<OnboardingPayload['weightLossStrategy'] | ''>('')
  const [proteinTargetG, setProteinTargetG] = useState('')
  const [fatTargetG, setFatTargetG] = useState('')
  const [carbsTargetG, setCarbsTargetG] = useState('')
  const [fiberTargetG, setFiberTargetG] = useState('')
  const [waterGoalGlasses, setWaterGoalGlasses] = useState('')
  const [dailyBankCapKcal, setDailyBankCapKcal] = useState('')
  const [bankMaxKcal, setBankMaxKcal] = useState('')
  const [relaxDaysPerMonth, setRelaxDaysPerMonth] = useState('')
  const [coachFocus, setCoachFocus] = useState<CoachFocusTag[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')


  function startEditing() {
    if (!profile) return
    setAgeYears(String(profile.ageYears))
    setGender(profile.gender as 'male' | 'female')
    setHeightCm(String(profile.heightCm))
    setStartingWeightKg(String(profile.startingWeightKg))
    setTargetWeightKg(profile.targetWeightKg != null ? String(profile.targetWeightKg) : '')
    setActivityLevel(profile.activityLevel as OnboardingPayload['activityLevel'])
    setGoal(profile.goal as OnboardingPayload['goal'])
    setWeightLossStrategy((profile.weightLossStrategy ?? '') as OnboardingPayload['weightLossStrategy'])
    setProteinTargetG(String(Math.round(Number(profile.proteinTargetG))))
    setFatTargetG(String(Math.round(Number(profile.fatTargetG))))
    setCarbsTargetG(String(Math.round(Number(profile.carbsTargetG))))
    setFiberTargetG(String(Math.round(Number(profile.fiberTargetG))))
    setWaterGoalGlasses(String(profile.waterGoalGlasses ?? 4))
    setDailyBankCapKcal(String(profile.dailyBankCapKcal ?? 300))
    setBankMaxKcal(String(profile.bankMaxKcal ?? 2000))
    setRelaxDaysPerMonth(String(profile.relaxDaysPerMonth ?? 2))
    setCoachFocus(parseCoachFocus(profile.coachFocus))
    setSaveError('')
    setEditing(true)
  }

  function toggleFocus(tag: CoachFocusTag) {
    setCoachFocus(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
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
        targetWeightKg: targetWeightKg ? Number(targetWeightKg) : undefined,
        activityLevel,
        goal,
        weightLossStrategy: goal === 'lose' ? weightLossStrategy || undefined : undefined,
        proteinTargetG: Number(proteinTargetG) || undefined,
        fatTargetG: Number(fatTargetG) || undefined,
        carbsTargetG: Number(carbsTargetG) || undefined,
        fiberTargetG: Number(fiberTargetG) || undefined,
        waterGoalGlasses: Number(waterGoalGlasses) || undefined,
        dailyBankCapKcal: dailyBankCapKcal === '' ? undefined : Number(dailyBankCapKcal),
        bankMaxKcal: bankMaxKcal === '' ? undefined : Number(bankMaxKcal),
        relaxDaysPerMonth: relaxDaysPerMonth === '' ? undefined : Number(relaxDaysPerMonth),
        coachFocus: serializeCoachFocus(coachFocus) ?? undefined,
      })
      setProfile(updated)
      // Profile changes (target calories, macros, activity) feed into the
      // daily summary and calorie bank calculations — invalidate both so
      // the user doesn't see stale numbers when they switch tabs.
      queryClient.invalidateQueries({ queryKey: ['today-summary'] })
      queryClient.invalidateQueries({ queryKey: ['calorie-bank'] })
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
      <section className="screen-section screen-section--home-dark">
        <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="skeleton skeleton--circle" style={{ width: 56, height: 56, flexShrink: 0 }} />
          <div className="skeleton-col" style={{ flex: 1 }}>
            <div className="skeleton" style={{ height: '1.1rem', width: '55%' }} />
            <div className="skeleton" style={{ height: '0.85rem', width: '70%' }} />
          </div>
        </div>
        <div className="panel">
          {[1,2,3,4].map(i => (
            <div key={i} style={{ marginBottom: i < 4 ? 14 : 0 }}>
              <div className="skeleton" style={{ height: '0.75rem', width: '35%', marginBottom: 6 }} />
              <div className="skeleton" style={{ height: '2.8rem', borderRadius: '12px' }} />
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (error || !profile) {
    return (
      <section className="screen-section screen-section--home-dark">
        <p className="error-text">{error || 'Profile not found'}</p>
      </section>
    )
  }

  if (editing) {
    return (
      <section className="screen-section screen-section--home-dark">
        <form className="panel profile-edit-form" onSubmit={handleSave}>
          <div className="auth-form-grid">
            <label>
              Age (years)
              <input type="number" min={13} max={120} value={ageYears} onChange={(e) => setAgeYears(e.target.value)} />
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

            <label>
              Target weight (kg) <span style={{ opacity: 0.45, fontWeight: 400, fontSize: '0.85em' }}>optional</span>
              <input type="number" min={30} max={300} step="0.1" value={targetWeightKg} onChange={(e) => setTargetWeightKg(e.target.value)} placeholder="e.g. 75" />
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

            <div>
              <label style={{ display: 'block', marginBottom: '6px' }}>Macro targets (g/day)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <label>
                  Protein
                  <input type="number" min={10} max={500} value={proteinTargetG} onChange={(e) => setProteinTargetG(e.target.value)} />
                </label>
                <label>
                  Fat
                  <input type="number" min={10} max={300} value={fatTargetG} onChange={(e) => setFatTargetG(e.target.value)} />
                </label>
                <label>
                  Carbs
                  <input type="number" min={10} max={600} value={carbsTargetG} onChange={(e) => setCarbsTargetG(e.target.value)} />
                </label>
                <label>
                  Fiber
                  <input type="number" min={5} max={100} value={fiberTargetG} onChange={(e) => setFiberTargetG(e.target.value)} />
                </label>
              </div>
            </div>

            <label>
              Water goal (glasses/day)
              <input type="number" min={1} max={20} value={waterGoalGlasses} onChange={(e) => setWaterGoalGlasses(e.target.value)} />
            </label>

            <div>
              <label style={{ display: 'block', marginBottom: '6px' }}>Calorie bank</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <label>
                  Per day cap (kcal)
                  <input type="number" min={0} max={2000} value={dailyBankCapKcal} onChange={(e) => setDailyBankCapKcal(e.target.value)} />
                </label>
                <label>
                  Bank ceiling (kcal)
                  <input type="number" min={0} max={10000} value={bankMaxKcal} onChange={(e) => setBankMaxKcal(e.target.value)} />
                </label>
                <label style={{ gridColumn: '1 / -1' }}>
                  Relax days per month
                  <input type="number" min={0} max={31} value={relaxDaysPerMonth} onChange={(e) => setRelaxDaysPerMonth(e.target.value)} />
                </label>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px' }}>What does Coach focus on?</label>
              <p className="coach-focus-help">
                Pick any combination. Empty = balanced across all.
              </p>
              <div className="coach-focus-grid">
                {COACH_FOCUS_TAGS.map(({ tag, emoji, label, hint }) => {
                  const active = coachFocus.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      className={`coach-focus-tile${active ? ' coach-focus-tile--active' : ''}`}
                      onClick={() => toggleFocus(tag)}
                    >
                      <span className="coach-focus-tile__label">{emoji} {label}</span>
                      <span className="coach-focus-tile__hint">{hint}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {saveError ? <p className="error-text">{saveError}</p> : null}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="profile-logout-btn" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button type="submit" className="profile-edit-btn" disabled={saving} style={{ flex: 1 }}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </section>
    )
  }

  return (
    <section className="screen-section screen-section--home-dark">
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
          {profile.targetWeightKg != null ? (
            <div className="profile-stat">
              <span className="profile-stat__label">Target weight</span>
              <span className="profile-stat__value">{profile.targetWeightKg} kg</span>
            </div>
          ) : null}
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

      <div className="panel">
        <p className="profile-section-title">Daily macro targets</p>
        <div className="profile-stats-grid">
          <div className="profile-stat">
            <span className="profile-stat__label">Protein</span>
            <span className="profile-stat__value">{Math.round(Number(profile.proteinTargetG))} g</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat__label">Fat</span>
            <span className="profile-stat__value">{Math.round(Number(profile.fatTargetG))} g</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat__label">Carbs</span>
            <span className="profile-stat__value">{Math.round(Number(profile.carbsTargetG))} g</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat__label">Fiber</span>
            <span className="profile-stat__value">{Math.round(Number(profile.fiberTargetG))} g</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <p className="profile-section-title">Calorie bank</p>
        <div className="profile-stats-grid">
          <div className="profile-stat">
            <span className="profile-stat__label">Per day cap</span>
            <span className="profile-stat__value">{profile.dailyBankCapKcal ?? 300} kcal</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat__label">Ceiling</span>
            <span className="profile-stat__value">{profile.bankMaxKcal ?? 2000} kcal</span>
          </div>
          <div className="profile-stat profile-stat--full">
            <span className="profile-stat__label">Relax days / month</span>
            <span className="profile-stat__value">{profile.relaxDaysPerMonth ?? 2}</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <p className="profile-section-title">Hydration goal</p>
        <div className="profile-stats-grid">
          <div className="profile-stat">
            <span className="profile-stat__label">Water goal</span>
            <span className="profile-stat__value">{profile.waterGoalGlasses ?? 4} glasses / day</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <NotificationSettings />
      </div>

      <div className="panel">
        <p className="profile-section-title">Tools</p>
        <button
          type="button"
          className="profile-tool-row"
          onClick={() => setShowBank(true)}
        >
          <span>🏦 Calorie bank</span>
          <span
            className="profile-tool-row__chevron"
            style={bankSnapshot ? { fontSize: '0.9rem', opacity: 0.6 } : undefined}
          >
            {bankSnapshot ? `+${bankSnapshot.bank} kcal` : '›'}
          </span>
        </button>
        <button
          type="button"
          className="profile-tool-row"
          onClick={() => navigate('/fasting')}
        >
          ⏱ Intermittent fasting
        </button>
        <button
          type="button"
          className="profile-tool-row"
          onClick={() => setShowExport(v => !v)}
        >
          📤 Export data
        </button>
        <button
          type="button"
          className="profile-tool-row"
          onClick={() => {
            // App Store / Play Store handle subscription management. Apple
            // requires this link be reachable from in-app. Open both URLs;
            // the OS picks the one that matches its store.
            const isAndroid = /android/i.test(navigator.userAgent)
            const url = isAndroid
              ? 'https://play.google.com/store/account/subscriptions'
              : 'https://apps.apple.com/account/subscriptions'
            window.open(url, '_blank', 'noopener,noreferrer')
          }}
        >
          🧾 Manage subscription
        </button>
        <button
          type="button"
          className="profile-tool-row"
          onClick={() => setShowAbout(true)}
        >
          💛 Behind Rumbly
        </button>
        {showExport && (
          <div className="export-range-picker">
            {([{ label: 'Last 30 days', days: 30 }, { label: 'Last 90 days', days: 90 }, { label: 'Last year', days: 365 }, { label: 'All data', days: 730 }] as const).map(opt => (
              <button
                key={opt.days}
                type="button"
                className="export-range-picker__btn"
                disabled={exporting}
                onClick={() => handleExport(opt.days)}
              >
                {opt.label}
              </button>
            ))}
            {exporting && <p className="export-range-picker__hint">Preparing…</p>}
          </div>
        )}
      </div>

      <div className="panel profile-actions">
        <button type="button" className="profile-edit-btn" onClick={startEditing}>Edit profile</button>
        <button type="button" className="profile-logout-btn" onClick={onLogout}>Log out</button>
        <button
          type="button"
          className="profile-delete-btn"
          onClick={() => {
            if (window.confirm('Delete your account? This will permanently erase all your data and cannot be undone.')) {
              onDeleteAccount()
            }
          }}
        >
          Delete account
        </button>
      </div>

      {showBank && bankSnapshot && (
        <CalorieBankSheet
          snapshot={bankSnapshot}
          date={todayStr}
          onClose={() => setShowBank(false)}
        />
      )}

      {showAbout && <AboutRumblySheet onClose={() => setShowAbout(false)} />}
    </section>
  )
}
