import { API_BASE } from './apiBase'

export class ApiError extends Error {
  status: number
  body: unknown
  constructor(status: number, message: string, body: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export class UnauthorizedError extends ApiError {
  constructor(body: unknown) {
    super(401, 'Unauthorized', body)
    this.name = 'UnauthorizedError'
  }
}

interface ApiOptions {
  signal?: AbortSignal
  /** Skip the global 401 dispatch — used by auth endpoints themselves. */
  skipUnauthorizedHandler?: boolean
}

/** Custom event name dispatched on 401. AppShell listens for it to trigger logout. */
export const UNAUTHORIZED_EVENT = 'api:unauthorized'

async function parseBody(response: Response): Promise<unknown> {
  const ct = response.headers.get('content-type') ?? ''
  if (response.status === 204 || response.headers.get('content-length') === '0') return null
  if (ct.includes('application/json')) {
    try { return await response.json() } catch { return null }
  }
  try { return await response.text() } catch { return null }
}

async function request<T>(method: string, path: string, body?: unknown, opts: ApiOptions = {}): Promise<T> {
  const isFormData = body instanceof FormData
  const headers: Record<string, string> = {}
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json'

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    signal: opts.signal,
  })

  if (response.status === 401) {
    const parsedBody = await parseBody(response)
    if (!opts.skipUnauthorizedHandler && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
    }
    throw new UnauthorizedError(parsedBody)
  }

  if (!response.ok) {
    const parsedBody = await parseBody(response)
    const message = typeof parsedBody === 'object' && parsedBody !== null && 'message' in parsedBody
      ? String((parsedBody as { message: unknown }).message)
      : `${method} ${path} failed (${response.status})`
    throw new ApiError(response.status, message, parsedBody)
  }

  if (response.status === 204) return undefined as T
  const ct = response.headers.get('content-type') ?? ''
  if (ct.includes('application/json')) return (await response.json()) as T
  return undefined as T
}

export const apiClient = {
  get: <T>(path: string, opts?: ApiOptions) => request<T>('GET', path, undefined, opts),
  post: <T>(path: string, body?: unknown, opts?: ApiOptions) => request<T>('POST', path, body, opts),
  put: <T>(path: string, body?: unknown, opts?: ApiOptions) => request<T>('PUT', path, body, opts),
  patch: <T>(path: string, body?: unknown, opts?: ApiOptions) => request<T>('PATCH', path, body, opts),
  delete: <T>(path: string, opts?: ApiOptions) => request<T>('DELETE', path, undefined, opts),
}
