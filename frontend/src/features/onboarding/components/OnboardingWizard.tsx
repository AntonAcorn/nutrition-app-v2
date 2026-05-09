import { CSSProperties, FormEvent, useState } from 'react'
import { submitProfile, type OnboardingPayload } from '../model/profileApi'
import { MascotCameraSvg } from '../../current-day/components/MascotCameraSvg'
import { COACH_FOCUS_TAGS, type CoachFocusTag, serializeCoachFocus } from '../../profile/model/profileApi'
import { WeekScanAnimation } from '../../coach/components/CoachTourAnimations'

interface Props {
  onComplete: () => void
}

type Step = 'welcome' | 1 | 2 | 3 | 4

const WELCOME_SLIDES: Array<{ visual: React.ReactNode; title: string; body: string }> = [
  {
    visual: <div className="onboarding-welcome__hero">🏦</div>,
    title: 'Bad days happen.\nYour coach gets it.',
    body: 'Most apps make you feel guilty for going over. Yours gives you a calorie bank instead — every day under target deposits, bad days withdraw, your streak holds.',
  },
  {
    visual: <div className="onboarding-welcome__hero">🎂</div>,
    title: 'Relax days for real life',
    body: 'Three free-pass days every month. Birthdays, weddings, sick weeks — they don\'t count against you. The streak holds. Built for actual humans.',
  },
  {
    visual: <WeekScanAnimation />,
    title: 'Coach watches your week',
    body: 'Patterns the dashboard hides. "Wednesdays you go 30% over." "Late dinners drop your energy." Quiet pushes when something matters, not three reminders a day.',
  },
]

const optionStyle = (selected: boolean): CSSProperties => ({
  border: selected ? '1.5px solid var(--opt-border-on)' : '1px solid var(--opt-border-off)',
  color: selected ? 'var(--opt-color-on)' : 'var(--opt-color-off)',
  background: selected ? 'var(--opt-bg-on)' : 'transparent',
  textAlign: 'left',
})

export function OnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState<Step>('welcome')
  const [welcomeIndex, setWelcomeIndex] = useState(0)
  const [ageYears, setAgeYears] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [heightCm, setHeightCm] = useState('')
  const [startingWeightKg, setStartingWeightKg] = useState('')
  const [targetWeightKg, setTargetWeightKg] = useState('')
  const [activityLevel, setActivityLevel] = useState<OnboardingPayload['activityLevel'] | ''>('')
  const [goal, setGoal] = useState<OnboardingPayload['goal'] | ''>('')
  const [weightLossStrategy, setWeightLossStrategy] = useState<OnboardingPayload['weightLossStrategy'] | ''>('')
  const [coachFocus, setCoachFocus] = useState<CoachFocusTag[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function toggleFocus(tag: CoachFocusTag) {
    setCoachFocus(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  function canAdvanceStep1() {
    return ageYears && gender && heightCm
  }

  function missingStep1() {
    const missing = []
    if (!ageYears) missing.push('age')
    if (!gender) missing.push('gender')
    if (!heightCm) missing.push('height')
    return missing
  }

  function canAdvanceStep2() {
    return startingWeightKg && activityLevel
  }

  function missingStep2() {
    const missing = []
    if (!startingWeightKg) missing.push('weight')
    if (!activityLevel) missing.push('activity level')
    return missing
  }

  function canFinish() {
    if (!goal) return false
    if (goal === 'lose' && !weightLossStrategy) return false
    return true
  }

  async function handleFinish(event: FormEvent) {
    event.preventDefault()
    if (!canFinish()) return
    setSubmitting(true)
    setError('')
    try {
      await submitProfile({
        ageYears: Number(ageYears),
        gender: gender as 'male' | 'female',
        heightCm: Number(heightCm),
        startingWeightKg: Number(startingWeightKg),
        targetWeightKg: targetWeightKg ? Number(targetWeightKg) : undefined,
        activityLevel: activityLevel as OnboardingPayload['activityLevel'],
        goal: goal as OnboardingPayload['goal'],
        weightLossStrategy: goal === 'lose' ? weightLossStrategy as OnboardingPayload['weightLossStrategy'] : undefined,
        coachFocus: serializeCoachFocus(coachFocus) ?? undefined,
      })
      setStep(4)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const welcomeSlide = step === 'welcome' ? WELCOME_SLIDES[welcomeIndex] : null
  const isLastWelcome = welcomeIndex === WELCOME_SLIDES.length - 1

  function nextWelcome() {
    if (isLastWelcome) {
      setStep(1)
    } else {
      setWelcomeIndex(welcomeIndex + 1)
    }
  }

  function prevWelcome() {
    if (welcomeIndex > 0) setWelcomeIndex(welcomeIndex - 1)
  }

  return (
    <section className="auth-panel auth-panel--dark">
      {step !== 'welcome' && (
        <p className="app-header__eyebrow" style={{ marginBottom: '0.5rem' }}>
          {step !== 4 ? `Step ${step} of 3` : 'How it works'}
        </p>
      )}

      {step === 'welcome' && welcomeSlide && (
        <div className="onboarding-welcome">
          <div className="onboarding-welcome__slide" key={welcomeIndex}>
            <div className="onboarding-welcome__visual">{welcomeSlide.visual}</div>
            <h2 className="onboarding-welcome__title">{welcomeSlide.title}</h2>
            <p className="onboarding-welcome__body">{welcomeSlide.body}</p>
          </div>

          <div className="onboarding-welcome__dots" aria-hidden>
            {WELCOME_SLIDES.map((_, i) => (
              <span
                key={i}
                className={`onboarding-welcome__dot${i === welcomeIndex ? ' onboarding-welcome__dot--active' : ''}`}
              />
            ))}
          </div>

          <div className="onboarding-welcome__nav">
            {welcomeIndex > 0 ? (
              <button type="button" className="tab-button tab-button--dark" onClick={prevWelcome}>
                Back
              </button>
            ) : (
              <button type="button" className="tab-button tab-button--dark" onClick={() => setStep(1)}>
                Skip
              </button>
            )}
            <button type="button" onClick={nextWelcome} style={{ flex: 1 }}>
              {isLastWelcome ? 'Get started' : 'Next'}
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="auth-form-grid">
          <label>
            Age (years)
            <input
              type="number"
              min={10}
              max={120}
              value={ageYears}
              onChange={(e) => setAgeYears(e.target.value)}
              placeholder="e.g. 30"
            />
          </label>

          <label>Gender</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="tab-button tab-button--dark"
              style={optionStyle(gender === 'male')}
              onClick={() => setGender('male')}
            >
              Male
            </button>
            <button
              type="button"
              className="tab-button tab-button--dark"
              style={optionStyle(gender === 'female')}
              onClick={() => setGender('female')}
            >
              Female
            </button>
          </div>

          <label>
            Height (cm)
            <input
              type="number"
              min={100}
              max={250}
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="e.g. 175"
            />
          </label>

          <button
            type="button"
            disabled={!canAdvanceStep1()}
            onClick={() => setStep(2)}
          >
            Next
          </button>
          {!canAdvanceStep1() && (
            <p className="onboarding-hint">
              Still need: {missingStep1().join(', ')}
            </p>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="auth-form-grid">
          <label>
            Starting weight (kg)
            <input
              type="number"
              min={30}
              max={300}
              step="0.1"
              value={startingWeightKg}
              onChange={(e) => setStartingWeightKg(e.target.value)}
              placeholder="e.g. 85"
            />
          </label>

          <label>
            Target weight (kg) <span style={{ opacity: 0.45, fontWeight: 400, fontSize: '0.85em' }}>optional</span>
            <input
              type="number"
              min={30}
              max={300}
              step="0.1"
              value={targetWeightKg}
              onChange={(e) => setTargetWeightKg(e.target.value)}
              placeholder="e.g. 75"
            />
          </label>

          <label>Activity level</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(
              [
                { value: 'sedentary', label: 'Sedentary (little or no exercise)' },
                { value: 'lightly_active', label: 'Lightly active (1–3 days/week)' },
                { value: 'moderately_active', label: 'Moderately active (3–5 days/week)' },
                { value: 'very_active', label: 'Very active (6–7 days/week)' },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className="tab-button tab-button--dark"
                style={optionStyle(activityLevel === value)}
                onClick={() => setActivityLevel(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="tab-button tab-button--dark" onClick={() => setStep(1)}>
              Back
            </button>
            <button
              type="button"
              disabled={!canAdvanceStep2()}
              onClick={() => setStep(3)}
              style={{ flex: 1 }}
            >
              Next
            </button>
          </div>
          {!canAdvanceStep2() && (
            <p className="onboarding-hint">
              Still need: {missingStep2().join(', ')}
            </p>
          )}
        </div>
      )}

      {step === 3 && (
        <form className="auth-form-grid" onSubmit={handleFinish}>
          <label>Goal</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(
              [
                { value: 'lose', label: 'Lose weight' },
                { value: 'maintain', label: 'Maintain weight' },
                { value: 'gain', label: 'Gain weight' },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className="tab-button tab-button--dark"
                style={optionStyle(goal === value)}
                onClick={() => { setGoal(value); setWeightLossStrategy('') }}
              >
                {label}
              </button>
            ))}
          </div>

          {goal === 'lose' && (
            <>
              <label style={{ marginTop: '0.25rem' }}>Weight loss pace</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(
                  [
                    { value: 'mild',       label: 'Mild',       desc: '~0.25 kg per week' },
                    { value: 'optimal',    label: 'Optimal',    desc: '~0.5 kg per week' },
                    { value: 'aggressive', label: 'Aggressive', desc: '~0.7 kg per week' },
                  ] as const
                ).map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    className="tab-button tab-button--dark"
                    style={optionStyle(weightLossStrategy === value)}
                    onClick={() => setWeightLossStrategy(value)}
                  >
                    {label} — <span style={{ opacity: 0.65, fontWeight: 400 }}>{desc}</span>
                  </button>
                ))}
              </div>
              {weightLossStrategy === 'aggressive' && (
                <p className="onboarding-pace-warning">
                  ⚠️ Warning: your fridge will start looking at you funny.
                </p>
              )}
            </>
          )}

          <label style={{ marginTop: '0.25rem' }}>What should Coach focus on?</label>
          <p className="coach-focus-help">
            Pick what matters most. You can change this anytime.
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

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="tab-button tab-button--dark" onClick={() => setStep(2)}>
              Back
            </button>
            <button
              type="submit"
              disabled={!canFinish() || submitting}
              style={{ flex: 1 }}
            >
              {submitting ? 'Saving...' : 'Finish'}
            </button>
          </div>

          {!canFinish() && (
            <p className="onboarding-hint">
              {!goal ? 'Select your goal' : 'Select a weight loss pace'}
            </p>
          )}

          {error ? <p className="error-text">{error}</p> : null}
        </form>
      )}

      {step === 4 && (
        <div className="auth-form-grid">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.25rem' }}><MascotCameraSvg size={80} /></div>
          <p className="onboarding-complete__title" style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.2rem', lineHeight: 1.2 }}>You're all set!</p>
          <p className="onboarding-complete__subtitle" style={{ textAlign: 'center', fontSize: '0.875rem', margin: '0 0 1rem' }}>
            Here's how to log your meals
          </p>

          <div className="onboarding-feature-cards">
            <div className="onboarding-feature-card">
              <span className="onboarding-feature-card__icon">📸</span>
              <div>
                <p className="onboarding-feature-card__title">Snap a photo</p>
                <p className="onboarding-feature-card__desc">AI recognises the meal and estimates calories. Glance at the numbers, fix anything off.</p>
              </div>
            </div>
            <div className="onboarding-feature-card">
              <span className="onboarding-feature-card__icon">🎤</span>
              <div>
                <p className="onboarding-feature-card__title">Say or type it</p>
                <p className="onboarding-feature-card__desc">"Chicken rice and salad" is enough. Faster than searching a database.</p>
              </div>
            </div>
            <div className="onboarding-feature-card">
              <span className="onboarding-feature-card__icon">🔍</span>
              <div>
                <p className="onboarding-feature-card__title">Scan a barcode</p>
                <p className="onboarding-feature-card__desc">Point at any packaged food. Calories and macros fill in instantly.</p>
              </div>
            </div>
          </div>

          <button type="button" style={{ marginTop: '0.5rem' }} onClick={onComplete}>
            Let's go
          </button>
        </div>
      )}
    </section>
  )
}
