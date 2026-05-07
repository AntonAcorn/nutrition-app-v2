import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient, ApiError, UnauthorizedError, UNAUTHORIZED_EVENT } from '../../src/shared/lib/apiClient'

const realFetch = global.fetch

function mockFetch(response: Partial<Response> & { jsonBody?: unknown; textBody?: string }) {
  const headers = new Headers(response.headers ?? {})
  global.fetch = vi.fn(async () => ({
    status: response.status ?? 200,
    ok: response.ok ?? (response.status ?? 200) < 400,
    headers,
    json: async () => response.jsonBody ?? null,
    text: async () => response.textBody ?? JSON.stringify(response.jsonBody ?? null),
  })) as unknown as typeof global.fetch
}

describe('apiClient', () => {
  beforeEach(() => {
    // happy default: JSON, 200, empty
  })
  afterEach(() => {
    global.fetch = realFetch
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('GET parses JSON body', async () => {
      mockFetch({ status: 200, jsonBody: { x: 1 }, headers: { 'content-type': 'application/json' } })
      const result = await apiClient.get<{ x: number }>('/api/test')
      expect(result).toEqual({ x: 1 })
    })

    it('POST sends JSON body with correct headers', async () => {
      mockFetch({ status: 200, jsonBody: { ok: true }, headers: { 'content-type': 'application/json' } })
      await apiClient.post('/api/test', { foo: 'bar' })
      const call = (global.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]
      const init = call[1] as RequestInit
      expect(init.method).toBe('POST')
      expect(init.body).toBe('{"foo":"bar"}')
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
      expect(init.credentials).toBe('include')
    })

    it('POST with FormData does NOT set Content-Type (browser sets boundary)', async () => {
      mockFetch({ status: 200, jsonBody: null })
      const fd = new FormData()
      fd.append('field', 'value')
      await apiClient.post('/api/test', fd)
      const call = (global.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]
      const init = call[1] as RequestInit
      expect(init.body).toBe(fd)
      expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined()
    })

    it('returns undefined for 204 No Content', async () => {
      mockFetch({ status: 204, headers: { 'content-length': '0' } })
      const result = await apiClient.delete('/api/test')
      expect(result).toBeUndefined()
    })

    it('PUT and PATCH use correct method', async () => {
      mockFetch({ status: 200, jsonBody: {} })
      await apiClient.put('/api/test', { a: 1 })
      let init = (global.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][1] as RequestInit
      expect(init.method).toBe('PUT')

      mockFetch({ status: 200, jsonBody: {} })
      await apiClient.patch('/api/test', { a: 2 })
      init = (global.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][1] as RequestInit
      expect(init.method).toBe('PATCH')
    })
  })

  describe('error handling', () => {
    it('throws ApiError with status and body for non-OK response', async () => {
      mockFetch({ status: 400, ok: false, jsonBody: { message: 'Bad input' }, headers: { 'content-type': 'application/json' } })
      await expect(apiClient.get('/api/test')).rejects.toMatchObject({
        name: 'ApiError',
        status: 400,
        message: 'Bad input',
      })
    })

    it('uses fallback message when body has no message field', async () => {
      mockFetch({ status: 500, ok: false, jsonBody: null })
      try {
        await apiClient.get('/api/foo')
        expect.fail('should throw')
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError)
        expect((e as ApiError).message).toContain('500')
      }
    })

    it('throws UnauthorizedError on 401', async () => {
      mockFetch({ status: 401, ok: false, jsonBody: { message: 'Session expired' }, headers: { 'content-type': 'application/json' } })
      await expect(apiClient.get('/api/test')).rejects.toBeInstanceOf(UnauthorizedError)
    })

    it('dispatches UNAUTHORIZED_EVENT on 401 by default', async () => {
      mockFetch({ status: 401, ok: false, jsonBody: null })
      const handler = vi.fn()
      window.addEventListener(UNAUTHORIZED_EVENT, handler)
      try {
        await apiClient.get('/api/test')
      } catch {
        // expected
      }
      expect(handler).toHaveBeenCalledOnce()
      window.removeEventListener(UNAUTHORIZED_EVENT, handler)
    })

    it('does NOT dispatch UNAUTHORIZED_EVENT when skipUnauthorizedHandler=true', async () => {
      mockFetch({ status: 401, ok: false, jsonBody: null })
      const handler = vi.fn()
      window.addEventListener(UNAUTHORIZED_EVENT, handler)
      try {
        await apiClient.get('/api/test', { skipUnauthorizedHandler: true })
      } catch {
        // expected
      }
      expect(handler).not.toHaveBeenCalled()
      window.removeEventListener(UNAUTHORIZED_EVENT, handler)
    })
  })

  describe('AbortSignal', () => {
    it('passes signal through to fetch', async () => {
      mockFetch({ status: 200, jsonBody: {} })
      const controller = new AbortController()
      await apiClient.get('/api/test', { signal: controller.signal })
      const call = (global.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]
      const init = call[1] as RequestInit
      expect(init.signal).toBe(controller.signal)
    })
  })
})
