import { API_BASE } from '../../../shared/lib/apiBase'

export interface AuthUser {
  accountId: string | null
  email: string | null
  displayName: string | null
  nutritionUserId: string | null
  authenticated: boolean
  hasProfile: boolean
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

  return parseAuthResponse(response)
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
