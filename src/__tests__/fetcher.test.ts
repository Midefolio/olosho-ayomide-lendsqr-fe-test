/**
 * ============================================================
 * fetcher.test.ts
 * Unit tests for the makeRequest utility
 *
 * Covers:
 *  - Offline guard (negative)
 *  - Successful GET and POST requests (positive)
 *  - Authorization header injection (positive)
 *  - Content-Type headers per content type (positive)
 *  - URL-encoded body serialization (positive)
 *  - JSON body pass-through (positive)
 *  - Network error handling (negative)
 *  - 401 unauthorized — triggers logout (negative)
 *  - JWT expired error (negative)
 *  - Too many requests error (negative)
 *  - Account suspended error (negative)
 *  - Generic server error fallback (negative)
 *  - Callback (cb) is always called in finally (positive)
 *  - GET requests use params, not data (positive)
 * ============================================================
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import axios from 'axios'

// ── Module mocks ──────────────────────────────────────────────────────────────

// Mock axios so no real HTTP calls are made
vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios')
  return {
    ...actual,
    default: vi.fn(),
  }
})

// Silence the import.meta.env usage inside fetcher
vi.stubEnv('VITE_API_CLIENT_SECRET', 'test-secret')

// ── Imports (after mocks) ────────────────────────────────────────────────────
import { makeRequest } from '../utils/fetcher'

const mockedAxios = axios as unknown as ReturnType<typeof vi.fn>

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal successful Axios response */
const axiosSuccess = (data: unknown) =>
  Promise.resolve({ data, status: 200, headers: {}, config: {}, statusText: 'OK' })

/** Build an Axios error with a given status and response body */
const axiosError = (status: number, responseData: unknown, message = 'Request failed') => {
  const err: any = new Error(message)
  err.isAxiosError = true
  err.response = { status, data: responseData }
  // Make axios.isAxiosError return true for this error
  ;(axios.isAxiosError as any) = (e: any) => e?.isAxiosError === true
  return Promise.reject(err)
}

/** Build an Axios network error (no response) */
const networkError = () => {
  const err: any = new Error('Network Error')
  err.isAxiosError = true
  err.message = 'Network Error'
  err.response = undefined
  ;(axios.isAxiosError as any) = (e: any) => e?.isAxiosError === true
  return Promise.reject(err)
}

const TEST_URL = 'https://api.example.com/test'

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('makeRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    // Default: online
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true })
    // Reset location
    Object.defineProperty(window, 'location', {
      value: { href: '/', reload: vi.fn() },
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ── 1. Offline guard ──────────────────────────────────────────────────────

  describe('Offline guard', () => {
    it('❌ [NEGATIVE] returns an error without calling axios when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true })

      const { res, error } = await makeRequest('GET', TEST_URL)

      expect(res).toBeUndefined()
      expect(error).toMatch(/offline/i)
      expect(mockedAxios).not.toHaveBeenCalled()
    })

    it('❌ [NEGATIVE] calls the cb callback even when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true })
      const cb = vi.fn()

      await makeRequest('GET', TEST_URL, null, cb)

      expect(cb).toHaveBeenCalledTimes(1)
    })
  })

  // ── 2. Successful requests ────────────────────────────────────────────────

  describe('Successful requests', () => {
    it('✅ [POSITIVE] returns res.data on a successful POST', async () => {
      const mockData = { token: 'abc123', user: { id: 1 } }
      mockedAxios.mockResolvedValue({ data: mockData })

      const { res, error } = await makeRequest('POST', TEST_URL, { email: 'a@b.com' })

      expect(error).toBeUndefined()
      expect(res).toEqual(mockData)
    })

    it('✅ [POSITIVE] returns res.data on a successful GET', async () => {
      const mockData = { users: [] }
      mockedAxios.mockResolvedValue({ data: mockData })

      const { res, error } = await makeRequest('GET', TEST_URL)

      expect(error).toBeUndefined()
      expect(res).toEqual(mockData)
    })

    it('✅ [POSITIVE] calls the cb callback after a successful request', async () => {
      mockedAxios.mockResolvedValue({ data: {} })
      const cb = vi.fn()

      await makeRequest('POST', TEST_URL, {}, cb)

      expect(cb).toHaveBeenCalledTimes(1)
    })
  })

  // ── 3. Headers ────────────────────────────────────────────────────────────

  describe('Request headers', () => {
    it('✅ [POSITIVE] sends Content-Type: application/json by default', async () => {
      mockedAxios.mockResolvedValue({ data: {} })

      await makeRequest('POST', TEST_URL, { foo: 'bar' }, null, null, null, 'json')

      const config = mockedAxios.mock.calls[0][0]
      expect(config.headers['Content-Type']).toBe('application/json')
    })

    it('✅ [POSITIVE] sends Content-Type: application/x-www-form-urlencoded for urlencoded', async () => {
      mockedAxios.mockResolvedValue({ data: {} })

      await makeRequest('POST', TEST_URL, { email: 'a@b.com' }, null, null, null, 'urlencoded')

      const config = mockedAxios.mock.calls[0][0]
      expect(config.headers['Content-Type']).toBe('application/x-www-form-urlencoded')
    })

    it('✅ [POSITIVE] sends Content-Type: multipart/form-data for multipart', async () => {
      mockedAxios.mockResolvedValue({ data: {} })

      await makeRequest('POST', TEST_URL, { file: 'data' }, null, null, null, 'multipart')

      const config = mockedAxios.mock.calls[0][0]
      expect(config.headers['Content-Type']).toBe('multipart/form-data')
    })

    it('✅ [POSITIVE] injects Authorization header when a token is provided', async () => {
      mockedAxios.mockResolvedValue({ data: {} })

      await makeRequest('GET', TEST_URL, null, null, 'my-token')

      const config = mockedAxios.mock.calls[0][0]
      expect(config.headers['Authorization']).toBe('Bearer my-token')
    })

    it('❌ [NEGATIVE] does NOT inject Authorization header when token is null', async () => {
      mockedAxios.mockResolvedValue({ data: {} })

      await makeRequest('GET', TEST_URL, null, null, null)

      const config = mockedAxios.mock.calls[0][0]
      expect(config.headers['Authorization']).toBeUndefined()
    })
  })

  // ── 4. Request body serialization ─────────────────────────────────────────

  describe('Body serialization', () => {
    it('✅ [POSITIVE] serializes body as query string for urlencoded', async () => {
      mockedAxios.mockResolvedValue({ data: {} })

      await makeRequest('POST', TEST_URL, { email: 'a@b.com', password: '123' }, null, null, null, 'urlencoded')

      const config = mockedAxios.mock.calls[0][0]
      // qs.stringify output
      expect(config.data).toBe('email=a%40b.com&password=123')
    })

    it('✅ [POSITIVE] passes params object directly for JSON content type', async () => {
      mockedAxios.mockResolvedValue({ data: {} })
      const body = { page: 1, limit: 10 }

      await makeRequest('POST', TEST_URL, body, null, null, null, 'json')

      const config = mockedAxios.mock.calls[0][0]
      expect(config.data).toEqual(body)
    })

    it('✅ [POSITIVE] uses params (not data) for GET requests', async () => {
      mockedAxios.mockResolvedValue({ data: {} })
      const query = { search: 'alice' }

      await makeRequest('GET', TEST_URL, query)

      const config = mockedAxios.mock.calls[0][0]
      expect(config.params).toEqual(query)
      expect(config.data).toBeUndefined()
    })

    it('✅ [POSITIVE] serializes multipart body as FormData', async () => {
      mockedAxios.mockResolvedValue({ data: {} })

      await makeRequest('POST', TEST_URL, { name: 'Alice' }, null, null, null, 'multipart')

      const config = mockedAxios.mock.calls[0][0]
      expect(config.data).toBeInstanceOf(FormData)
      expect(config.data.get('name')).toBe('Alice')
    })

    it('✅ [POSITIVE] handles null params gracefully', async () => {
      mockedAxios.mockResolvedValue({ data: {} })

      const { error } = await makeRequest('POST', TEST_URL, null)

      expect(error).toBeUndefined()
    })
  })

  // ── 5. Error handling ─────────────────────────────────────────────────────

  describe('Network error', () => {
    it('❌ [NEGATIVE] returns a friendly error message on network failure', async () => {
      mockedAxios.mockImplementation(networkError)

      const { res, error } = await makeRequest('POST', TEST_URL, {})

      expect(res).toBeUndefined()
      expect(error).toMatch(/cannot reach the server/i)
    })

    it('❌ [NEGATIVE] still calls cb on network failure', async () => {
      mockedAxios.mockImplementation(networkError)
      const cb = vi.fn()

      await makeRequest('POST', TEST_URL, {}, cb)

      expect(cb).toHaveBeenCalledTimes(1)
    })
  })

  describe('401 Unauthorized', () => {
    it('❌ [NEGATIVE] returns session expired message on 401', async () => {
      mockedAxios.mockImplementation(() =>
        axiosError(401, { error: 'jwt expired' })
      )

      const { error } = await makeRequest('GET', TEST_URL)

      expect(error).toMatch(/session has expired/i)
    })

    it('❌ [NEGATIVE] clears localStorage on 401', async () => {
      localStorage.setItem('auth_token', 'stale-token')
      mockedAxios.mockImplementation(() =>
        axiosError(401, { error: 'jwt expired' })
      )

      await makeRequest('GET', TEST_URL)

      // logout() calls localStorage.removeItem(USER_TOKEN)
      // USER_TOKEN = import.meta.env.VITE_API_CLIENT_SECRET = 'test-secret'
      expect(localStorage.getItem('test-secret')).toBeNull()
    })
  })

  describe('JWT expired in response body', () => {
    it('❌ [NEGATIVE] returns session expired message when jwt expired in body', async () => {
      mockedAxios.mockImplementation(() =>
        axiosError(400, { error: 'jwt expired' })
      )

      const { error } = await makeRequest('GET', TEST_URL)

      expect(error).toMatch(/session has expired/i)
    })
  })

  describe('Too many requests', () => {
    it('❌ [NEGATIVE] returns rate-limit message for too many requests error', async () => {
      mockedAxios.mockImplementation(() =>
        axiosError(429, {
          message: 'Too many requests in a short period. Please wait a moment and try again.',
        })
      )

      const { error } = await makeRequest('POST', TEST_URL, {})

      expect(error).toMatch(/too many requests/i)
    })
  })

  describe('Account suspended', () => {
    it('❌ [NEGATIVE] returns account suspended message', async () => {
      mockedAxios.mockImplementation(() =>
        axiosError(403, {
          error: 'Your account has been suspended. Please contact support.',
        })
      )

      const { error } = await makeRequest('GET', TEST_URL)

      expect(error).toMatch(/account has been suspended/i)
    })
  })

  describe('Generic server error', () => {
    it('❌ [NEGATIVE] returns the error field from the response body', async () => {
      mockedAxios.mockImplementation(() =>
        axiosError(500, { error: 'Database connection failed' })
      )

      const { error } = await makeRequest('POST', TEST_URL, {})

      expect(error).toBe('Database connection failed')
    })

    it('❌ [NEGATIVE] falls back to the message field when error field is absent', async () => {
      mockedAxios.mockImplementation(() =>
        axiosError(500, { message: 'Internal server error' })
      )

      const { error } = await makeRequest('POST', TEST_URL, {})

      expect(error).toBe('Internal server error')
    })

    it('❌ [NEGATIVE] returns a generic fallback when response body has no useful fields', async () => {
      mockedAxios.mockImplementation(() =>
        axiosError(500, {})
      )

      const { error } = await makeRequest('POST', TEST_URL, {})

      expect(error).toMatch(/something went wrong/i)
    })

    it('❌ [NEGATIVE] handles completely unexpected (non-Axios) errors gracefully', async () => {
      mockedAxios.mockImplementation(() => {
        throw new TypeError('Unexpected TypeError')
      })

      const { error } = await makeRequest('POST', TEST_URL, {})

      expect(error).toMatch(/unexpected error/i)
    })
  })

  // ── 6. Callback (cb) always fires ─────────────────────────────────────────

  describe('Callback always fires', () => {
    it('✅ [POSITIVE] cb is called after a successful response', async () => {
      mockedAxios.mockResolvedValue({ data: { ok: true } })
      const cb = vi.fn()
      await makeRequest('POST', TEST_URL, {}, cb)
      expect(cb).toHaveBeenCalledTimes(1)
    })

    it('✅ [POSITIVE] cb is called after a failed response', async () => {
      mockedAxios.mockImplementation(() => axiosError(500, { error: 'fail' }))
      const cb = vi.fn()
      await makeRequest('POST', TEST_URL, {}, cb)
      expect(cb).toHaveBeenCalledTimes(1)
    })

    it('✅ [POSITIVE] cb is called even when it is null (no crash)', async () => {
      mockedAxios.mockResolvedValue({ data: {} })
      await expect(makeRequest('POST', TEST_URL, {}, null)).resolves.not.toThrow()
    })
  })
})