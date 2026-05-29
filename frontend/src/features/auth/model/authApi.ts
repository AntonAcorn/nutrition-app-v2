import { apiClient, ApiError } from '../../../shared/lib/apiClient'

export interface AuthUser {
  accountId: string | null
  email: string | null
  displayName: string | null
  nutritionUserId: string | null
  authenticated: boolean
  hasProfile: boolean
  emailVerified: boolean
}

export class EmailNotVerifiedError extends Error {
  constructor(public readonly email: string) {
    super('EMAIL_NOT_VERIFIED')
    this.name = 'EmailNotVerifiedError'
  }
}

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
  displayName: string
}

// fetchMe is the auth check itself — don't trigger global 401 handler on its 401.
export function fetchMe(): Promise<AuthUser> {
  return apiClient.get<AuthUser>('/api/auth/me', { skipUnauthorizedHandler: true })
}

export async function login(payload: LoginPayload): Promise<AuthUser> {
  try {
    return await apiClient.post<AuthUser>('/api/auth/login', payload, { skipUnauthorizedHandler: true })
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) {
      throw new EmailNotVerifiedError(payload.email)
    }
    throw e
  }
}

export async function resendVerification(email: string): Promise<void> {
  try {
    await apiClient.post('/api/auth/resend-verification', { email }, { skipUnauthorizedHandler: true })
  } catch {
    // backend never reveals if email is registered — silent fail is intentional
  }
}

export function register(payload: RegisterPayload): Promise<AuthUser> {
  return apiClient.post<AuthUser>('/api/auth/register', payload, { skipUnauthorizedHandler: true })
}

export function requestPasswordReset(email: string): Promise<void> {
  return apiClient.post('/api/auth/forgot-password', { email }, { skipUnauthorizedHandler: true })
}

export function resetPassword(token: string, newPassword: string): Promise<void> {
  return apiClient.post('/api/auth/reset-password', { token, newPassword }, { skipUnauthorizedHandler: true })
}

export function logout(): Promise<void> {
  return apiClient.post('/api/auth/logout')
}

const GOOGLE_IOS_CLIENT_ID = '12070092066-84aqttkj4oa7786751ifg1huf0stvsja.apps.googleusercontent.com'
// Android's GoogleSignIn SDK requires the OAuth **Web** Client ID in
// requestIdToken() — not the Android client ID. The Android client ID only
// binds the package + SHA-1 fingerprint; the Web client ID is what ends up as
// the `aud` claim on the returned ID token, so it must also be present in the
// backend's GOOGLE_NATIVE_CLIENT_IDS allowlist.
const GOOGLE_ANDROID_WEB_CLIENT_ID = '12070092066-kkh8fuffj7nhke6e4r2iujugk1b5ra9o.apps.googleusercontent.com'

export async function loginWithGoogleNative(platform: 'ios' | 'android'): Promise<AuthUser> {
  const { registerPlugin } = await import('@capacitor/core')
  const GoogleSignIn = registerPlugin<{
    signIn(opts: { clientId: string }): Promise<{
      idToken: string
      email: string
      displayName: string
    }>
  }>('GoogleSignIn')

  const clientId = platform === 'ios' ? GOOGLE_IOS_CLIENT_ID : GOOGLE_ANDROID_WEB_CLIENT_ID
  const result = await GoogleSignIn.signIn({ clientId })
  return apiClient.post<AuthUser>(
    '/api/auth/google/token',
    { idToken: result.idToken, displayName: result.displayName },
    { skipUnauthorizedHandler: true },
  )
}

export async function loginWithApple(): Promise<AuthUser> {
  const { SignInWithApple } = await import('@capacitor-community/apple-sign-in')

  let result: Awaited<ReturnType<typeof SignInWithApple.authorize>>
  try {
    result = await SignInWithApple.authorize({
      clientId: 'com.aiduparc.rumblyeats',
      redirectURI: '',
      scopes: 'email name',
    })
  } catch (e) {
    throw new Error(`[plugin] ${e instanceof Error ? e.message : String(e)}`)
  }

  const { identityToken, givenName, familyName } = result.response
  if (!identityToken) {
    throw new Error(`[bridge] no token. response=${JSON.stringify(result.response)}`)
  }

  const displayName = [givenName, familyName].filter(Boolean).join(' ') || undefined
  return apiClient.post<AuthUser>(
    '/api/auth/apple',
    { identityToken, displayName },
    { skipUnauthorizedHandler: true },
  )
}

export function deleteAccount(): Promise<void> {
  return apiClient.post('/api/auth/delete-account')
}
