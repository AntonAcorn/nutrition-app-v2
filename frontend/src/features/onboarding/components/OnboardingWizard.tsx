import { CSSProperties, FormEvent, useState } from 'react'
import { submitProfile, type OnboardingPayload } from '../model/profileApi'

interface Props {
  onComplete: () => void
}

type Step = 1 | 2 | 3

const optionStyle = (selected: boolean): CSSProperties => ({
  border: selected ? '1.5px solid rgba(255,255,255,0.75)' : '1px solid rgba(255,255,255,0.12)',
  color: selected ? '#ffffff' : 'rgba(255,255,255,0.45)',
  background: selected ? 'rgba(255,255,255,0.08)' : 'transparent',
  textAlign: 'left',
})

export function OnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [ageYears, setAgeYears] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [heightCm, setHeightCm] = useState('')
  const [startingWeightKg, setStartingWeightKg] = useState('')
  const [activityLevel, setActivityLevel] = useState<OnboardingPayload['activityLevel'] | ''>('')
  const [goal, setGoal] = useState<OnboardingPayload['goal'] | ''>('')
  const [weightLossStrategy, setWeightLossStrategy] = useState<OnboardingPayload['weightLossStrategy'] | ''>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function canAdvanceStep1() {
    return ageYears && gender && heightCm
  }

  function canAdvanceStep2() {
    return startingWeightKg && activityLevel
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
        activityLevel: activityLevel as OnboardingPayload['activityLevel'],
        goal: goal as OnboardingPayload['goal'],
        weightLossStrategy: goal === 'lose' ? weightLossStrategy as OnboardingPayload['weightLossStrategy'] : undefined,
      })
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-panel auth-panel--dark">
      <p className="app-header__eyebrow" style={{ marginBottom: '0.5rem' }}>
        Step {step} of 3
      </p>

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
              placeholder="30"
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
              placeholder="175"
            />
          </label>

          <button
            type="button"
            disabled={!canAdvanceStep1()}
            onClick={() => setStep(2)}
          >
            Next
          </button>
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
              placeholder="75"
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
                    { value: 'aggressive', label: 'Aggressive', desc: '~1 kg per week' },
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
            </>
          )}

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

          {error ? <p className="error-text">{error}</p> : null}
        </form>
      )}
    </section>
  )
}
