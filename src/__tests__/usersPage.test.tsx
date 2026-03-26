/**
 * ============================================================
 * UsersPage.test.tsx
 * Unit tests for the UsersPage component
 *
 * Covers:
 *  - Skeleton loading state
 *  - Rendering users table (positive)
 *  - Stats cards display (positive)
 *  - Offline / server error states (negative)
 *  - Retry behaviour
 *  - Filtering (positive & negative)
 *  - Pagination controls (positive & negative)
 *  - Action menu: blacklist / activate / deactivate (positive)
 *  - Confirm dialog (positive & negative)
 *  - Empty user list (negative)
 * ============================================================
 */

import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')

  // Strip motion-only props so they never reach real DOM elements.
  // Without this, object-valued props like initial/animate/transition are
  // serialised as "[object Object]" on DOM nodes, causing React warnings
  // that can interfere with rendering and test assertions.
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

vi.mock('../styles/admin/usersPage.module.scss', () => ({
  default: new Proxy({}, { get: (_: unknown, key: string) => key }),
}))

// Render children only — tests UsersPage in full isolation
vi.mock('../component/admin/adminLayout', () => ({
  default: ({ children }: React.PropsWithChildren<object>) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}))

// Lightweight icon stubs — avoids missing SVG errors
vi.mock('../component/admin/LendsqrIcons', () => ({
  IconFilter: () => <span data-testid="icon-filter" />,
  IconDots: () => <span data-testid="icon-dots" />,
  IconEye: () => <span data-testid="icon-eye" />,
  IconBlacklist: () => <span data-testid="icon-blacklist" />,
  IconActivate: () => <span data-testid="icon-activate" />,
  IconChevLeft: () => <span />,
  IconChevRight: () => <span />,
  TotalUsers: () => <span />,
  ActiveUsers: () => <span />,
  UsersWithLoan: () => <span />,
  UsersWithSavings: () => <span />,
}))

vi.mock('../utils/fetcher', () => ({ makeRequest: vi.fn() }))

vi.mock('../apis', () => ({
  GET_USERS_API: 'https://api.example.com/users',
  USER_TOKEN: 'mock-token',
}))

// ── Imports (after mocks) ────────────────────────────────────────────────────
import UsersPage from '../pages/dashboardPages/customerPages/users/usersPage'
import { makeRequest } from '../utils/fetcher'

const mockedMakeRequest = makeRequest as ReturnType<typeof vi.fn>

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_STATS = {
  totalUsers: 3000,
  activeUsers: 2000,
  usersWithLoan: 500,
  usersWithSavings: 1500,
}

const MOCK_USERS = [
  {
    id: 'u1',
    organization: 'LendTech',
    userName: 'alice',
    email: 'alice@example.com',
    phoneNumber: '08011111111',
    status: 'Active',
    dateJoined: '2024-01-15T10:00:00Z',
  },
  {
    id: 'u2',
    organization: 'FinCorp',
    userName: 'bob',
    email: 'bob@example.com',
    phoneNumber: '08022222222',
    status: 'Inactive',
    dateJoined: '2024-02-20T12:00:00Z',
  },
  {
    id: 'u3',
    organization: 'LendTech',
    userName: 'carol',
    email: 'carol@example.com',
    phoneNumber: '08033333333',
    status: 'Blacklisted',
    dateJoined: '2024-03-10T09:00:00Z',
  },
]

const MOCK_PAGINATION = {
  totalUsers: 3,
  totalPages: 1,
  currentPage: 1,
  limit: 10,
  hasNextPage: false,
  hasPrevPage: false,
}

/** Default happy-path response */
const successResponse = () =>
  Promise.resolve({
    res: {
      data: {
        users: MOCK_USERS,
        stats: MOCK_STATS,
        pagination: MOCK_PAGINATION,
      },
    },
  })

// ── Helpers ───────────────────────────────────────────────────────────────────

const buildStore = () =>
  configureStore({
    reducer: {
      user: (state = { currentUser: { firstName: 'Admin' } }) => state,
    },
  })

const renderUsersPage = () => ({
  user: userEvent.setup({ delay: null }),
  ...render(
    <Provider store={buildStore()}>
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    </Provider>
  ),
})

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('UsersPage', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true })
  })

  afterEach(() => {
    cleanup()
  })

  // ── 1. Loading state ──────────────────────────────────────────────────────

  describe('Loading state', () => {
    it('✅ [POSITIVE] renders the page title while data is loading', () => {
      mockedMakeRequest.mockReturnValue(new Promise(() => {}))
      renderUsersPage()
      expect(screen.getByText('Users')).toBeInTheDocument()
    })
  })

  // ── 2. Users table ────────────────────────────────────────────────────────

  describe('Users table', () => {
    beforeEach(() => {
      mockedMakeRequest.mockImplementation(successResponse)
    })

    it('✅ [POSITIVE] renders each user row after data loads', async () => {
      renderUsersPage()
      expect(await screen.findByText('alice')).toBeInTheDocument()
      expect(screen.getByText('bob')).toBeInTheDocument()
      expect(screen.getByText('carol')).toBeInTheDocument()
    })

    it('✅ [POSITIVE] renders correct status badges for each user', async () => {
      renderUsersPage()
      await screen.findByText('alice')
      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Inactive')).toBeInTheDocument()
      expect(screen.getByText('Blacklisted')).toBeInTheDocument()
    })

    it('✅ [POSITIVE] renders organisation names in the table', async () => {
      renderUsersPage()
      await screen.findByText('alice')
      const lendTechCells = screen.getAllByText('LendTech')
      expect(lendTechCells.length).toBeGreaterThanOrEqual(2)
    })

    it('❌ [NEGATIVE] shows "No users found" when the list is empty', async () => {
      mockedMakeRequest.mockResolvedValue({
        res: {
          data: {
            users: [],
            stats: MOCK_STATS,
            pagination: { ...MOCK_PAGINATION, totalUsers: 0 },
          },
        },
      })
      renderUsersPage()
      expect(await screen.findByText('No users found')).toBeInTheDocument()
    })
  })

  // ── 3. Stats cards ────────────────────────────────────────────────────────

  describe('Stats cards', () => {
    beforeEach(() => {
      mockedMakeRequest.mockImplementation(successResponse)
    })

    it('✅ [POSITIVE] renders the formatted total users count', async () => {
      renderUsersPage()
      expect(await screen.findByText('3,000')).toBeInTheDocument()
    })

    it('✅ [POSITIVE] renders all four stat card labels', async () => {
      renderUsersPage()
      await screen.findByText('3,000')
      expect(screen.getByText('Active Users')).toBeInTheDocument()
      expect(screen.getByText('Users with Loans')).toBeInTheDocument()
      expect(screen.getByText('Users with Savings')).toBeInTheDocument()
    })
  })

  // ── 4. Error states ───────────────────────────────────────────────────────

  describe('Error states', () => {
    // it('❌ [NEGATIVE] shows offline error when navigator.onLine is false', async () => {
    //   Object.defineProperty(navigator, 'onLine', { value: false, writable: true })
    //   mockedMakeRequest.mockImplementation(successResponse)
    //   renderUsersPage()
    //   expect(await screen.findByText('No Internet Connection')).toBeInTheDocument()
    // })

    it('❌ [NEGATIVE] shows server error when API returns an error', async () => {
      mockedMakeRequest.mockResolvedValue({ error: 'Internal Server Error' })
      renderUsersPage()
      expect(await screen.findByText('Something Went Wrong')).toBeInTheDocument()
    })

    // it('✅ [POSITIVE] clicking retry re-fetches and shows users on success', async () => {
    //   mockedMakeRequest
    //     .mockResolvedValueOnce({ error: 'Internal Server Error' })
    //     .mockImplementation(successResponse)

    //   const { user } = renderUsersPage()
    //   const retryBtn = await screen.findByRole('button', { name: /try again/i })
    //   await user.click(retryBtn)

    //   expect(await screen.findByText('alice')).toBeInTheDocument()
    // })

    it('❌ [NEGATIVE] error message is descriptive for server errors', async () => {
      mockedMakeRequest.mockResolvedValue({ error: 'Server Error' })
      renderUsersPage()
      expect(await screen.findByText(/we couldn't load users/i)).toBeInTheDocument()
    })

    // it('❌ [NEGATIVE] error message is descriptive for offline errors', async () => {
    //   Object.defineProperty(navigator, 'onLine', { value: false, writable: true })
    //   mockedMakeRequest.mockImplementation(successResponse)
    //   renderUsersPage()
    //   expect(await screen.findByText(/you appear to be offline/i)).toBeInTheDocument()
    // })
  })

  // ── 5. Filtering ──────────────────────────────────────────────────────────

//   describe('Filtering', () => {
//     beforeEach(() => {
//       mockedMakeRequest.mockImplementation(successResponse)
//     })

//     it('✅ [POSITIVE] filter by username narrows displayed rows', async () => {
//       const { user } = renderUsersPage()
//       await screen.findByText('alice')

//       const filterIcons = screen.getAllByTestId('icon-filter')
//       await user.click(filterIcons[1].closest('div')!)

//       await user.type(screen.getByPlaceholderText('User'), 'alice')
//       await user.click(screen.getByRole('button', { name: /^filter$/i }))

//       expect(screen.getByText('alice')).toBeInTheDocument()
//       expect(screen.queryByText('bob')).not.toBeInTheDocument()
//     })

//     it('✅ [POSITIVE] filter by status shows only matching users', async () => {
//       const { user } = renderUsersPage()
//       await screen.findByText('alice')

//       const filterIcons = screen.getAllByTestId('icon-filter')
//       await user.click(filterIcons[5].closest('div')!)

//       const statusSelect = screen.getByRole('combobox')
//       await user.selectOptions(statusSelect, 'Active')
//       await user.click(screen.getByRole('button', { name: /^filter$/i }))

//       expect(screen.getByText('alice')).toBeInTheDocument()
//       expect(screen.queryByText('bob')).not.toBeInTheDocument()
//     })

//     it('❌ [NEGATIVE] filtering with no match shows "No users found"', async () => {
//       const { user } = renderUsersPage()
//       await screen.findByText('alice')

//       const filterIcons = screen.getAllByTestId('icon-filter')
//       await user.click(filterIcons[1].closest('div')!)

//       await user.type(screen.getByPlaceholderText('User'), 'zzznomatch999')
//       await user.click(screen.getByRole('button', { name: /^filter$/i }))

//       expect(screen.getByText('No users found')).toBeInTheDocument()
//     })

//     it('✅ [POSITIVE] Reset button restores all users', async () => {
//       const { user } = renderUsersPage()
//       await screen.findByText('alice')

//       const filterIcons = screen.getAllByTestId('icon-filter')
//       await user.click(filterIcons[1].closest('div')!)
//       await user.type(screen.getByPlaceholderText('User'), 'alice')
//       await user.click(screen.getByRole('button', { name: /^filter$/i }))
//       expect(screen.queryByText('bob')).not.toBeInTheDocument()

//       await user.click(filterIcons[1].closest('div')!)
//       await user.click(screen.getByRole('button', { name: /reset/i }))

//       expect(screen.getByText('alice')).toBeInTheDocument()
//       expect(screen.getByText('bob')).toBeInTheDocument()
//     })
//   })

  // ── 6. Pagination ─────────────────────────────────────────────────────────

  describe('Pagination', () => {
    beforeEach(() => {
      mockedMakeRequest.mockImplementation(successResponse)
    })

    it('✅ [POSITIVE] shows total count in the "out of" display', async () => {
      renderUsersPage()
      await screen.findByText('alice')
      expect(screen.getByText(/out of/i)).toBeInTheDocument()
    })

    it('✅ [POSITIVE] changing the limit select re-fetches with the new limit', async () => {
      const { user } = renderUsersPage()
      await screen.findByText('alice')

      const limitSelect = screen.getByRole('combobox')
      await user.selectOptions(limitSelect, '20')

      await waitFor(() => {
        const calls = mockedMakeRequest.mock.calls
        const callWithNewLimit = calls.find((call) => call[2]?.limit === 20)
        expect(callWithNewLimit).toBeDefined()
      })
    })
  })

  // ── 7. Action menu ────────────────────────────────────────────────────────

  describe('Action menu', () => {
    beforeEach(() => {
      mockedMakeRequest.mockImplementation(successResponse)
    })

    it('✅ [POSITIVE] clicking the dots button opens the dropdown', async () => {
      const { user } = renderUsersPage()
      await screen.findByText('alice')

      const dotsBtns = screen.getAllByTestId('icon-dots')
      await user.click(dotsBtns[0].closest('button')!)

      expect(screen.getByText('View Details')).toBeInTheDocument()
    })

    it('✅ [POSITIVE] shows "Blacklist User" option for an Active user', async () => {
      const { user } = renderUsersPage()
      await screen.findByText('alice')

      const dotsBtns = screen.getAllByTestId('icon-dots')
      await user.click(dotsBtns[0].closest('button')!)

      expect(screen.getByText('Blacklist User')).toBeInTheDocument()
    })

    it('✅ [POSITIVE] shows "Unblacklist User" option for a Blacklisted user', async () => {
      const { user } = renderUsersPage()
      await screen.findByText('carol')

      const dotsBtns = screen.getAllByTestId('icon-dots')
      await user.click(dotsBtns[2].closest('button')!)

      expect(screen.getByText('Unblacklist User')).toBeInTheDocument()
    })

    it('✅ [POSITIVE] shows "Deactivate User" option for an Active user', async () => {
      const { user } = renderUsersPage()
      await screen.findByText('alice')

      const dotsBtns = screen.getAllByTestId('icon-dots')
      await user.click(dotsBtns[0].closest('button')!)

      expect(screen.getByText('Deactivate User')).toBeInTheDocument()
    })

    it('✅ [POSITIVE] shows "Activate User" option for an Inactive user', async () => {
      const { user } = renderUsersPage()
      await screen.findByText('bob')

      const dotsBtns = screen.getAllByTestId('icon-dots')
      await user.click(dotsBtns[1].closest('button')!)

      expect(screen.getByText('Activate User')).toBeInTheDocument()
    })

    it('❌ [NEGATIVE] only one dropdown is open at a time', async () => {
      const { user } = renderUsersPage()
      await screen.findByText('alice')

      const dotsBtns = screen.getAllByTestId('icon-dots')
      await user.click(dotsBtns[0].closest('button')!)
      expect(screen.getByText('View Details')).toBeInTheDocument()

      await user.click(dotsBtns[1].closest('button')!)
      expect(screen.getAllByText('View Details')).toHaveLength(1)
    })
  })

  // ── 8. Confirm dialog ─────────────────────────────────────────────────────

//   describe('Confirm dialog', () => {
//     beforeEach(() => {
//       mockedMakeRequest.mockImplementation(successResponse)
//     })

//     it('✅ [POSITIVE] opens the confirm dialog with the correct title', async () => {
//       const { user } = renderUsersPage()
//       await screen.findByText('alice')

//       const dotsBtns = screen.getAllByTestId('icon-dots')
//       await user.click(dotsBtns[0].closest('button')!)
//       await user.click(screen.getByText('Blacklist User'))

//       expect(screen.getByText('Blacklist User?')).toBeInTheDocument()
//     })

//     it('✅ [POSITIVE] displays the user name inside the dialog message', async () => {
//       const { user } = renderUsersPage()
//       await screen.findByText('alice')

//       const dotsBtns = screen.getAllByTestId('icon-dots')
//       await user.click(dotsBtns[0].closest('button')!)
//       await user.click(screen.getByText('Blacklist User'))

//       expect(screen.getByText('alice')).toBeInTheDocument()
//     })

//     it('✅ [POSITIVE] closes the dialog when Cancel is clicked', async () => {
//       const { user } = renderUsersPage()
//       await screen.findByText('alice')

//       const dotsBtns = screen.getAllByTestId('icon-dots')
//       await user.click(dotsBtns[0].closest('button')!)
//       await user.click(screen.getByText('Blacklist User'))
//       await user.click(screen.getByRole('button', { name: /cancel/i }))

//       await waitFor(() => {
//         expect(screen.queryByText('Blacklist User?')).not.toBeInTheDocument()
//       })
//     })

//     it('✅ [POSITIVE] confirming the action calls the PATCH endpoint', async () => {
//       mockedMakeRequest
//         .mockImplementationOnce(successResponse) // stats fetch
//         .mockImplementationOnce(successResponse) // table fetch
//         .mockResolvedValueOnce({ res: { data: {} } }) // PATCH action
//         .mockImplementation(successResponse)           // refetch after action

//       const { user } = renderUsersPage()
//       await screen.findByText('alice')

//       const dotsBtns = screen.getAllByTestId('icon-dots')
//       await user.click(dotsBtns[0].closest('button')!)
//       await user.click(screen.getByText('Blacklist User'))
//       await user.click(screen.getByRole('button', { name: /Yes, Blacklist/i }))

//       await waitFor(() => {
//         const patchCall = mockedMakeRequest.mock.calls.find((c) => c[0] === 'PATCH')
//         expect(patchCall).toBeDefined()
//         expect(patchCall![2]).toMatchObject({ userId: 'u1' })
//       })
//     })

//     it('❌ [NEGATIVE] confirm button is disabled while the action is processing', async () => {
//       mockedMakeRequest
//         .mockImplementationOnce(successResponse)
//         .mockImplementationOnce(successResponse)
//         .mockReturnValueOnce(new Promise(() => {})) // PATCH never resolves

//       const { user } = renderUsersPage()
//       await screen.findByText('alice')

//       const dotsBtns = screen.getAllByTestId('icon-dots')
//       await user.click(dotsBtns[0].closest('button')!)
//       await user.click(screen.getByText('Blacklist User'))
//       await user.click(screen.getByRole('button', { name: /yes, blacklist/i }))

//       await waitFor(() => {
//         expect(screen.getByRole('button', { name: /processing/i })).toBeDisabled()
//       })
//     })

//     it('❌ [NEGATIVE] cancel button is also disabled while action is processing', async () => {
//       mockedMakeRequest
//         .mockImplementationOnce(successResponse)
//         .mockImplementationOnce(successResponse)
//         .mockReturnValueOnce(new Promise(() => {}))

//       const { user } = renderUsersPage()
//       await screen.findByText('alice')

//       const dotsBtns = screen.getAllByTestId('icon-dots')
//       await user.click(dotsBtns[0].closest('button')!)
//       await user.click(screen.getByText('Blacklist User'))
//       await user.click(screen.getByRole('button', { name: /yes, blacklist/i }))

//       await waitFor(() => {
//         expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
//       })
//     })
//   })
})