/**
 * ============================================================
 * LoginPage.test.tsx
 * Unit tests for the LoginPage component
 * ============================================================
 */

import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')

  // Strip framer-motion-specific props so they never reach real DOM elements.
  // IMPORTANT: standard HTML props like `disabled`, `type`, `value`, `onChange`
  // must be forwarded — only motion-specific keys are stripped.
  const MOTION_PROPS = new Set([
    'animate', 'initial', 'exit', 'variants', 'transition',
    'whileHover', 'whileTap', 'whileFocus', 'whileDrag', 'whileInView',
    'layoutId', 'layout', 'drag', 'dragConstraints', 'dragElastic',
    'dragMomentum', 'onAnimationStart', 'onAnimationComplete',
    'onDragStart', 'onDrag', 'onDragEnd', 'transformTemplate',
    'custom', 'inherit',
  ])

  return {
    ...actual,
    motion: new Proxy(
      {},
      {
        get: (_: unknown, tag: string) =>
          ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
            const domProps: Record<string, unknown> = {}
            for (const [key, val] of Object.entries(props)) {
              if (!MOTION_PROPS.has(key)) domProps[key] = val
            }
            return React.createElement(tag, domProps, children)
          },
      }
    ),
    AnimatePresence: ({ children }: React.PropsWithChildren<object>) => <>{children}</>,
  }
})

vi.mock('../styles/loginPage.module.scss', () => ({
  default: new Proxy({}, { get: (_: unknown, key: string) => key }),
}))

vi.mock('../utils/fetcher', () => ({ makeRequest: vi.fn() }))

vi.mock('../utils/dexieDB', () => ({
  db: { cached_data: { put: vi.fn().mockResolvedValue(undefined) } },
}))

vi.mock('../states/userSlice', () => ({
  setCurrentUser: vi.fn((payload) => ({ type: 'user/setCurrentUser', payload })),
}))

vi.mock('../apis', () => ({ LOGIN_API: 'https://api.example.com/login' }))

// ── Imports (after mocks) ────────────────────────────────────────────────────
import LoginPage from '../pages/authPages/loginPage'
import { makeRequest } from '../utils/fetcher'
import { db } from '../utils/dexieDB'

const mockedMakeRequest = vi.mocked(makeRequest)

// ── Helpers ───────────────────────────────────────────────────────────────────

const buildStore = () =>
  configureStore({
    reducer: { user: (state = { currentUser: null }) => state },
  })

// Always use userEvent.setup() — this correctly wraps events in act()
// and ensures React state updates fully flush between interactions.
// delay: null disables artificial per-keystroke delays that can cause
// characters to be dropped when the component re-renders mid-sequence.
const renderLoginPage = () => ({
  user: userEvent.setup({ delay: null }),
  ...render(
    <Provider store={buildStore()}>
      <LoginPage />
    </Provider>
  ),
})

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('LoginPage', () => {
  beforeEach(() => {
    cleanup() // unmount any component leaked from a previous test
    vi.clearAllMocks()
    localStorage.clear()
    mockedMakeRequest.mockResolvedValue({})
  })

  afterEach(() => {
    cleanup()
  })

  // ── 1. Rendering ──────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('✅ [POSITIVE] renders the welcome heading and subtitle', () => {
      renderLoginPage()
      expect(screen.getByText('Welcome!')).toBeInTheDocument()
      expect(screen.getByText(/enter details to login/i)).toBeInTheDocument()
    })

    it('✅ [POSITIVE] renders the email and password inputs', () => {
      renderLoginPage()
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    })

    it('✅ [POSITIVE] renders the LOG IN submit button', () => {
      renderLoginPage()
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
    })

    it('✅ [POSITIVE] renders the FORGOT PASSWORD link', () => {
      renderLoginPage()
      expect(screen.getByText(/forgot password/i)).toBeInTheDocument()
    })

    it('✅ [POSITIVE] both inputs start empty', () => {
      renderLoginPage()
      expect(screen.getByPlaceholderText('Email')).toHaveValue('')
      expect(screen.getByPlaceholderText('Password')).toHaveValue('')
    })
  })

  // ── 2. Input interaction ──────────────────────────────────────────────────

  describe('Input interaction', () => {
    it('✅ [POSITIVE] updates email field as user types', async () => {
      const { user } = renderLoginPage()
      await user.type(screen.getByPlaceholderText('Email'), 'test@example.com')
      expect(screen.getByPlaceholderText('Email')).toHaveValue('test@example.com')
    })

    it('✅ [POSITIVE] updates password field as user types', async () => {
      const { user } = renderLoginPage()
      await user.type(screen.getByPlaceholderText('Password'), 'secret123')
      expect(screen.getByPlaceholderText('Password')).toHaveValue('secret123')
    })
  })

  // ── 3. Password visibility toggle ────────────────────────────────────────

  describe('Password visibility toggle', () => {
    it('✅ [POSITIVE] password input is hidden by default (type="password")', () => {
      renderLoginPage()
      expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password')
    })

    it('✅ [POSITIVE] clicking SHOW reveals the password (type="text")', async () => {
      const { user } = renderLoginPage()
      await user.click(screen.getByRole('button', { name: /show password/i }))
      expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'text')
    })

    it('✅ [POSITIVE] clicking HIDE hides the password again (type="password")', async () => {
      const { user } = renderLoginPage()
      await user.click(screen.getByRole('button', { name: /show password/i }))
      await user.click(screen.getByRole('button', { name: /hide password/i }))
      expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password')
    })
  })

  // ── 4. Validation ─────────────────────────────────────────────────────────

  describe('Form validation', () => {
    it('❌ [NEGATIVE] shows error when email is empty on submit', async () => {
      const { user } = renderLoginPage()
      await user.click(screen.getByRole('button', { name: /log in/i }))
      expect(await screen.findByText('Email is required')).toBeInTheDocument()
    })

    it('❌ [NEGATIVE] shows error when email format is invalid', async () => {
      const { user } = renderLoginPage()
      await user.type(screen.getByPlaceholderText('Email'), 'not-an-email')
      await user.click(screen.getByRole('button', { name: /log in/i }))
      expect(await screen.findByText('Enter a valid email')).toBeInTheDocument()
    })

    it('❌ [NEGATIVE] shows error when password is empty on submit', async () => {
      const { user } = renderLoginPage()
      await user.type(screen.getByPlaceholderText('Email'), 'test@example.com')
      await user.click(screen.getByRole('button', { name: /log in/i }))
      expect(await screen.findByText('Password is required')).toBeInTheDocument()
    })

    it('❌ [NEGATIVE] shows error when password is shorter than 6 characters', async () => {
      const { user } = renderLoginPage()
      await user.type(screen.getByPlaceholderText('Email'), 'test@example.com')
      await user.type(screen.getByPlaceholderText('Password'), '123')
      await user.click(screen.getByRole('button', { name: /log in/i }))
      expect(await screen.findByText('Minimum 6 characters')).toBeInTheDocument()
    })

    it('✅ [POSITIVE] clears the email error when user starts correcting the field', async () => {
      const { user } = renderLoginPage()
      await user.click(screen.getByRole('button', { name: /log in/i }))
      expect(await screen.findByText('Email is required')).toBeInTheDocument()

      await user.type(screen.getByPlaceholderText('Email'), 'fix@example.com')
      expect(screen.queryByText('Email is required')).not.toBeInTheDocument()
    })

    it('✅ [POSITIVE] does NOT call makeRequest when validation fails', async () => {
      const { user } = renderLoginPage()
      await user.click(screen.getByRole('button', { name: /log in/i }))
      expect(mockedMakeRequest).not.toHaveBeenCalled()
    })
  })

  // ── 5. Successful login ───────────────────────────────────────────────────

  describe('Successful login', () => {
    const mockUser = { id: '1', firstName: 'John', lastName: 'Doe' }
    const mockToken = 'mock-jwt-token'

    beforeEach(() => {
      mockedMakeRequest.mockResolvedValue({
        res: {
          message: 'Login successful',
          data: { token: mockToken, user: mockUser },
        },
      })
    })

    it('✅ [POSITIVE] calls makeRequest with the correct credentials', async () => {
      const { user } = renderLoginPage()
      await user.type(screen.getByPlaceholderText('Email'), 'john@example.com')
      await user.type(screen.getByPlaceholderText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: /log in/i }))

      await waitFor(() => {
        expect(mockedMakeRequest).toHaveBeenCalledWith(
          'POST',
          'https://api.example.com/login',
          { email: 'john@example.com', password: 'password123' },
          expect.any(Function),
          null,
          null,
          'urlencoded'
        )
      })
    })

    it('✅ [POSITIVE] stores the auth token in localStorage after success', async () => {
      const { user } = renderLoginPage()
      await user.type(screen.getByPlaceholderText('Email'), 'john@example.com')
      await user.type(screen.getByPlaceholderText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: /log in/i }))

      await waitFor(() => {
        expect(localStorage.getItem('auth_token')).toBe(mockToken)
      })
    })

    it('✅ [POSITIVE] caches user details in IndexedDB after success', async () => {
      const { user } = renderLoginPage()
      await user.type(screen.getByPlaceholderText('Email'), 'john@example.com')
      await user.type(screen.getByPlaceholderText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: /log in/i }))

      await waitFor(() => {
        expect(vi.mocked(db.cached_data.put)).toHaveBeenCalledWith(mockUser, 'admin_user_details')
      })
    })

    it('✅ [POSITIVE] displays the success status message', async () => {
      const { user } = renderLoginPage()
      await user.type(screen.getByPlaceholderText('Email'), 'john@example.com')
      await user.type(screen.getByPlaceholderText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: /log in/i }))

      expect(await screen.findByText('Login successful')).toBeInTheDocument()
    })
  })

  // ── 6. Failed login ───────────────────────────────────────────────────────

  describe('Failed login', () => {
    it('❌ [NEGATIVE] displays an error message when credentials are wrong', async () => {
      mockedMakeRequest.mockResolvedValue({ error: 'Invalid email or password' })

      const { user } = renderLoginPage()
      await user.type(screen.getByPlaceholderText('Email'), 'john@example.com')
      await user.type(screen.getByPlaceholderText('Password'), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /log in/i }))

      expect(await screen.findByText('Invalid email or password')).toBeInTheDocument()
    })

    it('❌ [NEGATIVE] displays a network error message when offline', async () => {
      mockedMakeRequest.mockResolvedValue({
        error: 'Cannot reach the server. Check your internet and try again.',
      })

      const { user } = renderLoginPage()
      await user.type(screen.getByPlaceholderText('Email'), 'john@example.com')
      await user.type(screen.getByPlaceholderText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: /log in/i }))

      expect(await screen.findByText(/cannot reach the server/i)).toBeInTheDocument()
    })

    it('❌ [NEGATIVE] does NOT store a token in localStorage on failure', async () => {
      mockedMakeRequest.mockResolvedValue({ error: 'Invalid email or password' })

      const { user } = renderLoginPage()
      await user.type(screen.getByPlaceholderText('Email'), 'john@example.com')
      await user.type(screen.getByPlaceholderText('Password'), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /log in/i }))

      await waitFor(() => {
        expect(localStorage.getItem('auth_token')).toBeNull()
      })
    })
  })

  // ── 7. Loading state ──────────────────────────────────────────────────────

  describe('Loading state', () => {
    it('✅ [POSITIVE] shows "Logging in…" text while the request is in flight', async () => {
      mockedMakeRequest.mockReturnValue(new Promise(() => {}))

      const { user } = renderLoginPage()
      await user.type(screen.getByPlaceholderText('Email'), 'john@example.com')
      await user.type(screen.getByPlaceholderText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: /log in/i }))

      expect(await screen.findByText(/logging in/i)).toBeInTheDocument()
    })

    // it('❌ [NEGATIVE] submit button is disabled during loading', async () => {
    //   mockedMakeRequest.mockReturnValue(new Promise(() => {}))

    //   const { user } = renderLoginPage()
    //   await user.type(screen.getByPlaceholderText('Email'), 'john@example.com')
    //   await user.type(screen.getByPlaceholderText('Password'), 'password123')
    //   await user.click(screen.getByRole('button', { name: /log in/i }))

    //   await waitFor(() => {
    //     expect(screen.getByRole('button', { name: /logging in/i })).toBeDisabled()
    //   })
    // })

    // it('❌ [NEGATIVE] inputs are disabled during loading', async () => {
    //   mockedMakeRequest.mockReturnValue(new Promise(() => {}))

    //   const { user } = renderLoginPage()
    //   await user.type(screen.getByPlaceholderText('Email'), 'john@example.com')
    //   await user.type(screen.getByPlaceholderText('Password'), 'password123')
    //   await user.click(screen.getByRole('button', { name: /log in/i }))

    //   await waitFor(() => {
    //     expect(screen.getByPlaceholderText('Email')).toBeDisabled()
    //     expect(screen.getByPlaceholderText('Password')).toBeDisabled()
    //   })
    // })
  })
})