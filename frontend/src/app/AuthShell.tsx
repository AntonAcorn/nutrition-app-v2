import { FormEvent, useEffect, useState } from 'react'
import { API_BASE } from '../shared/lib/apiBase'
import { MascotSvg } from '../features/current-day/components/MascotSvg'
import {
  login,
  register,
  requestPasswordReset,
  resetPassword,
  resendVerification,
  loginWithApple,
  loginWithGoogleNative,
  EmailNotVerifiedError,
  type AuthUser,
} from '../features/auth/model/authApi'
import { identifyUser, track } from '../shared/lib/analytics'
import * as Sentry from '@sentry/react'
import { GoogleIcon, EyeIcon, EyeOffIcon, SunIcon, MoonIcon } from './icons'

type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-password' | 'check-email'
type Theme = 'dark' | 'light'

interface AuthShellProps {
  authUser: AuthUser | null
  platform: 'ios' | 'android' | 'web'
  theme: Theme
  onToggleTheme: () => void
  onAuthenticated: (user: AuthUser) => void
  onResetUser: () => void
}

function trackUser(user: AuthUser) {
  if (!user.nutritionUserId) return
  // PostHog is declared as Analytics in PrivacyInfo.xcprivacy; email is only declared
  // for AppFunctionality. Keep PostHog limited to the anonymous user id so we don't
  // violate the manifest. Sentry (AppFunctionality) can still receive email.
  identifyUser(user.nutritionUserId)
  Sentry.setUser({ id: user.nutritionUserId, email: user.email ?? undefined })
}

export function AuthShell({ authUser, platform, theme, onToggleTheme, onAuthenticated, onResetUser }: AuthShellProps) {
  // Apple Sign-In is iOS-only (no Android implementation, button hidden).
  // Google Sign-In: iOS and Android both use the native plugin (returns an
  // idToken to /api/auth/google/token). Web uses the server-side OAuth redirect.
  const isIOS = platform === 'ios'
  const isNative = platform === 'ios' || platform === 'android'
  const initialMode: AuthMode = authUser?.authenticated && !authUser.emailVerified ? 'check-email' : 'login'
  const [authMode, setAuthMode] = useState<AuthMode>(initialMode)
  const [authEmail, setAuthEmail] = useState(authUser?.email ?? '')
  const [authPassword, setAuthPassword] = useState('')
  const [authConfirmPassword, setAuthConfirmPassword] = useState('')
  const [authDisplayName, setAuthDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [authSuccessMessage, setAuthSuccessMessage] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  useEffect(() => {
    function syncFromUrl() {
      const params = new URLSearchParams(window.location.search)

      const token = params.get('reset_token')
      if (token) {
        setResetToken(token)
        setAuthMode('reset-password')
        window.history.replaceState({}, '', window.location.pathname)
        return
      }

      // After the static /email-verified/ page bounces back, the SPA picks
      // up these flags so the user gets immediate feedback inside the app.
      if (params.get('verified') === '1') {
        setAuthSuccessMessage('Email verified! You can now log in.')
        setAuthMode('login')
        window.history.replaceState({}, '', window.location.pathname)
        return
      }
      if (params.get('verify_failed') === '1') {
        setAuthError('Verification link expired or invalid. Resend a new one below.')
        setAuthMode('check-email')
        window.history.replaceState({}, '', window.location.pathname)
        return
      }

      const googleError = params.get('google_error')
      if (googleError) {
        setAuthError('Google sign-in failed. Please try again.')
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
    syncFromUrl()
    // App.tsx fires popstate after handling a Universal Link / App Link so we
    // re-evaluate the URL and pick up a reset_token that arrived while the
    // auth shell was already mounted.
    window.addEventListener('popstate', syncFromUrl)
    return () => window.removeEventListener('popstate', syncFromUrl)
  }, [])

  async function handleGoogleSignInNative() {
    if (platform === 'web') return
    setAuthSubmitting(true)
    setAuthError('')
    try {
      const nextUser = await loginWithGoogleNative(platform)
      trackUser(nextUser)
      onAuthenticated(nextUser)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg.includes('canceled')) return
      // The native GoogleSignIn plugin is bundled into the APK / IPA. If the
      // currently-installed build predates the plugin (true for any device
      // running an APK from before this feature shipped), Capacitor surfaces
      // "Plugin 'GoogleSignIn' is not implemented on <platform>". Translate
      // that into a clearer next-step message instead of a stack-trace string.
      if (msg.toLowerCase().includes('not implemented')) {
        setAuthError('Google Sign-In needs an updated app version. Open the App Store / Play Store and update Rumbly Eats, then try again. You can use email or password sign-in in the meantime.')
      } else {
        setAuthError(msg || 'Google Sign In failed')
      }
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function handleAppleSignIn() {
    setAuthSubmitting(true)
    setAuthError('')
    try {
      const nextUser = await loginWithApple()
      trackUser(nextUser)
      onAuthenticated(nextUser)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      // 1001 = user cancelled the Apple Sign-In sheet; not an error to show.
      if (msg.includes('AuthorizationError error 1001')) return
      if (msg.toLowerCase().includes('not implemented')) {
        setAuthError('Apple Sign-In needs an updated app version. Open the App Store and update Rumbly Eats, then try again.')
      } else {
        setAuthError(msg || 'Apple Sign In failed')
      }
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function handleAuthSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    const email = authEmail.trim()
    if (!email) {
      setAuthError('Please enter your email.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthError('Please enter a valid email.')
      return
    }
    if (!authPassword) {
      setAuthError('Please enter your password.')
      return
    }
    if (authMode === 'register' && authPassword.length < 8) {
      setAuthError('Password must be at least 8 characters.')
      return
    }
    if (authMode === 'register' && !authDisplayName.trim()) {
      setAuthError('Please enter your name.')
      return
    }
    if (authMode === 'register' && authPassword !== authConfirmPassword) {
      setAuthError('Passwords do not match')
      return
    }
    if (authMode === 'register' && !acceptedTerms) {
      setAuthError('Please accept the Terms and Privacy Policy to continue.')
      return
    }
    setAuthSubmitting(true)
    setAuthError('')

    try {
      if (authMode === 'login') {
        const nextUser = await login({ email, password: authPassword })
        trackUser(nextUser)
        track('user_logged_in')
        onAuthenticated(nextUser)
        setAuthPassword('')
        setAuthConfirmPassword('')
      } else {
        const nextUser = await register({ email, password: authPassword, displayName: authDisplayName.trim() })
        onAuthenticated(nextUser)
        setAuthMode('check-email')
        setResendSuccess(false)
        setAuthPassword('')
        setAuthConfirmPassword('')
      }
    } catch (error) {
      if (error instanceof EmailNotVerifiedError) {
        setAuthMode('check-email')
        setResendSuccess(false)
      } else {
        setAuthError(error instanceof Error ? error.message : 'Auth failed')
      }
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function handleForgotPassword(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    setAuthSubmitting(true)
    setAuthError('')
    setAuthSuccessMessage('')
    try {
      await requestPasswordReset(authEmail)
      setAuthSuccessMessage('If this email is registered, you will receive a reset link.')
    } catch {
      setAuthError('Something went wrong. Please try again.')
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function handleResetPassword(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    if (authPassword.length < 8) {
      setAuthError('Password must be at least 8 characters.')
      return
    }
    if (authPassword !== authConfirmPassword) {
      setAuthError('Passwords do not match')
      return
    }
    setAuthSubmitting(true)
    setAuthError('')
    try {
      await resetPassword(resetToken, authPassword)
      setAuthPassword('')
      setAuthConfirmPassword('')
      setAuthSuccessMessage('Password updated. You can now log in.')
      setAuthMode('login')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Reset failed')
    } finally {
      setAuthSubmitting(false)
    }
  }

  async function handleResendVerification() {
    setResendLoading(true)
    setResendSuccess(false)
    try {
      await resendVerification(authEmail || authUser?.email || '')
      setResendSuccess(true)
    } catch {
      // silent — backend never reveals whether email is registered
    } finally {
      setResendLoading(false)
    }
  }

  const showCheckEmail = authMode === 'check-email' || (authUser?.authenticated && !authUser.emailVerified)

  if (showCheckEmail) {
    const verifyEmail = authEmail || authUser?.email || ''
    return (
      <main className="app-shell app-shell--auth">
        <div className="auth-hero">
          <MascotSvg mood="happy" size={100} className="auth-hero__mascot" />
          <div>
            <p className="auth-hero__eyebrow">Daily nutrition</p>
            <h1 className="auth-hero__title">Check your email</h1>
          </div>
          <button type="button" className="theme-toggle-btn auth-theme-toggle" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
        <section className="auth-card">
          <div className="auth-form">
            <p className="auth-verify-msg">
              We sent a verification link to<br />
              <strong className="auth-verify-msg__email">{verifyEmail}</strong>
            </p>
            <p className="auth-verify-hint">
              Click the link to activate your account. Check your spam folder if you don&apos;t see it.
            </p>
            {resendSuccess ? (
              <p className="success-text">Verification email resent. Check your inbox.</p>
            ) : null}
            <button type="button" className="auth-btn-primary" disabled={resendLoading} onClick={handleResendVerification}>
              {resendLoading ? 'Sending...' : 'Resend email'}
            </button>
            <button
              type="button"
              className="auth-switch-link"
              onClick={() => {
                onResetUser()
                setAuthMode('login')
                setResendSuccess(false)
              }}
            >
              ← Back to login
            </button>
          </div>
        </section>
      </main>
    )
  }

  const headerTitle = authMode === 'login' ? 'Welcome back'
    : authMode === 'register' ? 'Create account'
    : authMode === 'forgot-password' ? 'Reset password'
    : 'New password'

  return (
    <main className="app-shell app-shell--auth">
      <div className="auth-hero">
        <MascotSvg mood="happy" size={100} className="auth-hero__mascot" />
        <div>
          <p className="auth-hero__eyebrow">Daily nutrition</p>
          <h1 className="auth-hero__title">{headerTitle}</h1>
        </div>
        <button type="button" className="theme-toggle-btn auth-theme-toggle" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>

      <section className="auth-card">
        {authMode === 'forgot-password' ? (
          <form className="auth-form" onSubmit={handleForgotPassword}>
            <label className="auth-label">
              Email
              <input
                className="auth-input"
                type="email"
                name="email"
                autoComplete="email"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>
            {authSuccessMessage ? <p className="success-text">{authSuccessMessage}</p> : null}
            {authError ? <p className="error-text">{authError}</p> : null}
            <button type="submit" className="auth-btn-primary" disabled={authSubmitting}>
              {authSubmitting ? 'Sending...' : 'Send reset link'}
            </button>
            <button type="button" className="auth-switch-link" onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccessMessage('') }}>
              ← Back to login
            </button>
          </form>
        ) : authMode === 'reset-password' ? (
          <form className="auth-form" onSubmit={handleResetPassword}>
            <label className="auth-label">
              New password
              <div className="password-input-wrap">
                <input
                  className="auth-input"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="new-password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  placeholder="••••••••"
                />
                <button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)} tabIndex={-1} aria-label={showPassword ? 'Hide' : 'Show'}>
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </label>
            <label className="auth-label">
              Confirm password
              <div className="password-input-wrap">
                <input
                  className="auth-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirm-password"
                  autoComplete="new-password"
                  value={authConfirmPassword}
                  onChange={(event) => setAuthConfirmPassword(event.target.value)}
                  placeholder="••••••••"
                />
                <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword((v) => !v)} tabIndex={-1} aria-label={showConfirmPassword ? 'Hide' : 'Show'}>
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </label>
            {authError ? <p className="error-text">{authError}</p> : null}
            <button type="submit" className="auth-btn-primary" disabled={authSubmitting}>
              {authSubmitting ? 'Saving...' : 'Set new password'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleAuthSubmit}>
            {authMode === 'register' ? (
              <label className="auth-label">
                Name
                <input
                  className="auth-input"
                  name="name"
                  autoComplete="name"
                  value={authDisplayName}
                  onChange={(event) => setAuthDisplayName(event.target.value)}
                  placeholder="Your name"
                />
              </label>
            ) : null}

            <label className="auth-label">
              Email
              <input
                className="auth-input"
                type="email"
                name="email"
                autoComplete="email"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>

            <div>
              <div className="auth-password-header">
                <span className="auth-label-text">Password</span>
                {authMode === 'login' ? (
                  <button type="button" className="auth-forgot-link" onClick={() => { setAuthMode('forgot-password'); setAuthError(''); setAuthSuccessMessage('') }}>
                    Forgot?
                  </button>
                ) : null}
              </div>
              <div className="password-input-wrap">
                <input
                  className="auth-input"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  placeholder="••••••••"
                />
                <button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)} tabIndex={-1} aria-label={showPassword ? 'Hide' : 'Show'}>
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {authMode === 'register' ? (
              <label className="auth-label">
                Confirm password
                <div className="password-input-wrap">
                  <input
                    className="auth-input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirm-password"
                    autoComplete="new-password"
                    value={authConfirmPassword}
                    onChange={(event) => setAuthConfirmPassword(event.target.value)}
                    placeholder="••••••••"
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword((v) => !v)} tabIndex={-1} aria-label={showConfirmPassword ? 'Hide' : 'Show'}>
                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </label>
            ) : null}

            {authSuccessMessage ? <p className="success-text">{authSuccessMessage}</p> : null}
            {authError ? <p className="error-text">{authError}</p> : null}

            {authMode === 'register' ? (
              <label className="auth-legal-checkbox">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                />
                <span className="auth-legal-text">
                  I agree to the{' '}
                  <a href="/terms/" target="_blank" rel="noopener noreferrer" className="auth-legal-link">
                    Terms
                  </a>
                  {' '}and{' '}
                  <a href="/privacy/" target="_blank" rel="noopener noreferrer" className="auth-legal-link">
                    Privacy Policy
                  </a>
                </span>
              </label>
            ) : null}
            <button type="submit" className="auth-btn-primary" disabled={authSubmitting}>
              {authSubmitting ? 'Please wait...' : authMode === 'login' ? 'Log in' : 'Create account'}
            </button>

            <div className="auth-divider"><span>or</span></div>

            {isIOS && (
              <button type="button" className="auth-apple-btn" onClick={handleAppleSignIn} disabled={authSubmitting}>
                <svg width="18" height="18" viewBox="0 0 814 1000" fill="currentColor" aria-hidden="true">
                  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.3-161.1-139.4c-48.1-90.3-87.5-230-87.5-365.3 0-225.3 146.3-344.8 290.3-344.8 72.6 0 133.2 47.8 177.3 47.8 42.2 0 112.5-51.9 192.8-51.9 30.8 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
                </svg>
                Sign in with Apple
              </button>
            )}

            {isNative ? (
              <button type="button" className="auth-google-btn" onClick={handleGoogleSignInNative} disabled={authSubmitting}>
                <GoogleIcon />
                Continue with Google
              </button>
            ) : (
              <a href={`${API_BASE}/api/auth/google`} className="auth-google-btn">
                <GoogleIcon />
                Continue with Google
              </a>
            )}

            <p className="auth-switch-text">
              {authMode === 'login' ? (
                <>No account?{' '}
                  <button type="button" className="auth-switch-link" onClick={() => { setAuthMode('register'); setAuthError('') }}>
                    Sign up
                  </button>
                </>
              ) : (
                <>Already have one?{' '}
                  <button type="button" className="auth-switch-link" onClick={() => { setAuthMode('login'); setAuthError('') }}>
                    Log in
                  </button>
                </>
              )}
            </p>
          </form>
        )}
      </section>
    </main>
  )
}
