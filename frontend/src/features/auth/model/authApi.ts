import { API_BASE } from '../../../shared/lib/apiBase'

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

async function parseAuthResponse(response: Response): Promise<AuthUser> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message ?? `Auth request failed (${response.status})`)
  }

  return (await response.json()) as AuthUser
}

export async function fetchMe(): Promise<AuthUser> {
  const response = await fetch(`${API_BASE}/api/auth/me`, {
    credentials: 'include',
  })

  return parseAuthResponse(response)
}

export async function login(payload: LoginPayload): Promise<AuthUser> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (response.status === 403) {
    throw new EmailNotVerifiedError(payload.email)
  }

  return parseAuthResponse(response)
}

export async function resendVerification(email: string): Promise<void> {
  await fetch(`${API_BASE}/api/auth/resend-verification`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
}

export async function register(payload: RegisterPayload): Promise<AuthUser> {
  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return parseAuthResponse(response)
}

export async function requestPasswordReset(email: string): Promise<void> {
  await fetch(`${API_BASE}/api/auth/forgot-password`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message ?? 'Reset failed')
  }
}

export async function logout(): Promise<void> {
  const response = await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })

  if (!response.ok && response.status !== 204) {
    throw new Error(`Logout failed (${response.status})`)
  }
}

const GOOGLE_IOS_CLIENT_ID = '45553583079-uapqsj71o7kn3rr18op0feb4p1qdfnem.apps.googleusercontent.com'

export async function loginWithGoogleNative(): Promise<AuthUser> {
  const { registerPlugin } = await import('@capacitor/core')
  const GoogleSignIn = registerPlugin<{
    signIn(opts: { clientId: string }): Promise<{
      idToken: string
      email: string
      displayName: string
    }>
  }>('GoogleSignIn')

  const result = await GoogleSignIn.signIn({ clientId: GOOGLE_IOS_CLIENT_ID })
  const res = await fetch(`${API_BASE}/api/auth/google/token`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: result.idToken, displayName: result.displayName }),
  })
  return parseAuthResponse(res)
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
  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/auth/apple`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identityToken, displayName }),
    })
  } catch (e) {
    throw new Error(`[fetch] ${e instanceof Error ? e.message : String(e)}`)
  }
  return parseAuthResponse(res)
}

export async function deleteAccount(): Promise<void> {
  const response = await fetch(`${API_BASE}/api/auth/delete-account`, {
    method: 'POST',
    credentials: 'include',
  })

  if (!response.ok && response.status !== 204) {
    throw new Error(`Account deletion failed (${response.status})`)
  }
}
