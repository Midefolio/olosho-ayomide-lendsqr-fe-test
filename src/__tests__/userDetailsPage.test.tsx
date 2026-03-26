/**
 * ============================================================
 * UserDetailsPage.test.tsx
 * Unit tests for the UserDetailsPage component
 *
 * Covers:
 *  - Skeleton shown while loading (positive)
 *  - Full profile rendered after data loads (positive)
 *  - Tabs switching (positive & negative)
 *  - Action buttons: Blacklist / Activate (positive & negative)
 *  - Offline error state (negative)
 *  - Server error state (negative)
 *  - Retry mechanism (positive)
 *  - Star rating / tier label (positive)
 *  - User not found state (negative)
 *  - Back navigation (positive)
 *  - InfoField em-dash fallback (positive)
 * ============================================================
 */

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return {
    ...actual,
    motion: new Proxy(
      {},
      {
        get: (_: unknown, tag: string) =>
          ({ children, ...props }: React.PropsWithChildren<object>) =>
            React.createElement(tag, props, children),
      }
    ),
    AnimatePresence: ({ children }: React.PropsWithChildren<object>) => <>{children}</>,
  }
})

vi.mock('../styles/admin/userDetailsPage.module.scss', () => ({
  default: new Proxy({}, { get: (_: unknown, key: string) => key }),
}))

// Render only children — isolates UserDetailsPage from AdminLayout
vi.mock('../component/admin/adminLayout', () => ({
  default: ({ children }: React.PropsWithChildren<object>) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}))

vi.mock('../component/admin/LendsqrIcons', () => ({
  IconArrowLeft: () => <span data-testid="icon-arrow-left" />,
  UserIcon: () => <span data-testid="user-icon" />,
}))

vi.mock('../utils/fetcher', () => ({ makeRequest: vi.fn() }))

vi.mock('../apis', () => ({
  GET_USER_API: 'https://api.example.com/user',
  USER_TOKEN: 'mock-token',
}))

// Provide a userId in the URL path so the component can parse it
Object.defineProperty(window, 'location', {
  value: { pathname: '/admin/customers/user/user-42', href: '' },
  writable: true,
})

// Stub history.back so we can assert it was called
window.history.back = vi.fn()

// ── Imports (after mocks) ────────────────────────────────────────────────────
import UserDetailsPage from '../pages/dashboardPages/customerPages/users/userDetailsPage'
import { makeRequest } from '../utils/fetcher'

const mockedMakeRequest = makeRequest as ReturnType<typeof vi.fn>

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_USER = {
  id: 'user-42',
  userName: 'alice_wonder',
  accountNumber: '1234567890',
  tier: 2,
  balance: '250000',
  status: 'Active' as const,
  organization: 'LendTech',
  bank: {
    accountNumber: '0987654321',
    bankName: 'First Bank',
  },
  personalInfo: {
    fullName: 'Alice Wonderland',
    phoneNumber: '08011111111',
    email: 'alice@example.com',
    bvn: '12345678901',
    gender: 'Female',
    maritalStatus: 'Single',
    children: '0',
    typeOfResidence: "Parent's Apartment",
  },
  educationAndEmployment: {
    levelOfEducation: 'B.Sc.',
    employmentStatus: 'Employed',
    sectorOfEmployment: 'FinTech',
    durationOfEmployment: '2 years',
    officeEmail: 'alice@lendtech.com',
    monthlyIncome: { min: '100000', max: '200000' },
    loanRepayment: '30000',
  },
  socials: {
    twitter: '@alice_wonder',
    facebook: 'alice.wonder',
    instagram: '@alice_ig',
  },
  guarantors: [
    {
      fullName: 'Bob Guarantor',
      phoneNumber: '08099999999',
      email: 'bob@guarantor.com',
      relationship: 'Brother',
    },
  ],
}

const successResponse = () => Promise.resolve({ res: { data: MOCK_USER } })

// ── Helpers ───────────────────────────────────────────────────────────────────

const buildStore = () =>
  configureStore({
    reducer: {
      user: (state = { currentUser: { firstName: 'Admin' } }) => state,
    },
  })

const renderPage = () =>
  render(
    <Provider store={buildStore()}>
      <UserDetailsPage />
    </Provider>
  )

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('UserDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true })
  })

  // ── 1. Loading state ──────────────────────────────────────────────────────

  describe('Loading state', () => {
    it('✅ [POSITIVE] renders "User Details" heading while data is loading', () => {
      mockedMakeRequest.mockReturnValue(new Promise(() => {}))
      renderPage()
      expect(screen.getByText('User Details')).toBeInTheDocument()
    })

    it('✅ [POSITIVE] action buttons are hidden while loading', () => {
      mockedMakeRequest.mockReturnValue(new Promise(() => {}))
      renderPage()
      expect(
        screen.queryByRole('button', { name: /blacklist user/i })
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /activate user/i })
      ).not.toBeInTheDocument()
    })
  })

  // ── 2. Profile rendering ──────────────────────────────────────────────────

  describe('Profile rendering', () => {
    beforeEach(() => {
      mockedMakeRequest.mockImplementation(successResponse)
    })

    it('✅ [POSITIVE] renders the user\'s username', async () => {
      renderPage()
      expect(await screen.findByText('alice_wonder')).toBeInTheDocument()
    })

    it('✅ [POSITIVE] renders the account number', async () => {
      renderPage()
      expect(await screen.findByText('1234567890')).toBeInTheDocument()
    })

    it('✅ [POSITIVE] renders the formatted balance with currency symbol', async () => {
      renderPage()
      await screen.findByText('alice_wonder')
      expect(screen.getByText(/250,000/)).toBeInTheDocument()
    })

    it('✅ [POSITIVE] renders bank name and account number', async () => {
      renderPage()
      await screen.findByText('alice_wonder')
      expect(screen.getByText(/0987654321\/First Bank/)).toBeInTheDocument()
    })

    it('✅ [POSITIVE] renders Blacklist User and Activate User buttons', async () => {
      renderPage()
      expect(
        await screen.findByRole('button', { name: /blacklist user/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /activate user/i })
      ).toBeInTheDocument()
    })
  })

  // ── 3. General Details tab (default) ─────────────────────────────────────

  describe('General Details tab', () => {
    beforeEach(() => {
      mockedMakeRequest.mockImplementation(successResponse)
    })

    it('✅ [POSITIVE] renders the Personal Information section heading', async () => {
      renderPage()
      await screen.findByText('alice_wonder')
      expect(screen.getByText('Personal Information')).toBeInTheDocument()
    })

    it('✅ [POSITIVE] renders the user\'s full name in the info grid', async () => {
      renderPage()
      await screen.findByText('alice_wonder')
      expect(screen.getByText('Alice Wonderland')).toBeInTheDocument()
    })

    it('✅ [POSITIVE] renders the BVN value', async () => {
      renderPage()
      await screen.findByText('alice_wonder')
      expect(screen.getByText('12345678901')).toBeInTheDocument()
    })

    it('✅ [POSITIVE] renders the Education and Employment section', async () => {
      renderPage()
      await screen.findByText('alice_wonder')
      expect(screen.getByText('Education and Employment')).toBeInTheDocument()
    })

    it('✅ [POSITIVE] renders the formatted monthly income range', async () => {
      renderPage()
      await screen.findByText('alice_wonder')
      // Rendered as ₦100,000- ₦200,000
      expect(screen.getByText(/100,000/)).toBeInTheDocument()
      expect(screen.getByText(/200,000/)).toBeInTheDocument()
    })

    it('✅ [POSITIVE] renders the Socials section with Twitter handle', async () => {
      renderPage()
      await screen.findByText('alice_wonder')
      expect(screen.getByText('@alice_wonder')).toBeInTheDocument()
    })

    it('✅ [POSITIVE] renders the Guarantor section', async () => {
      renderPage()
      await screen.findByText('alice_wonder')
      expect(screen.getByText('Guarantor')).toBeInTheDocument()
      expect(screen.getByText('Bob Guarantor')).toBeInTheDocument()
    })

    it('✅ [POSITIVE] renders the guarantor\'s relationship', async () => {
      renderPage()
      await screen.findByText('alice_wonder')
      expect(screen.getByText('Brother')).toBeInTheDocument()
    })
  })

  // ── 4. Tier / star rating ─────────────────────────────────────────────────

  describe('Tier display', () => {
    it('✅ [POSITIVE] renders the "User\'s Tier" label', async () => {
      mockedMakeRequest.mockImplementation(successResponse)
      renderPage()
      await screen.findByText('alice_wonder')
      expect(screen.getByText("User's Tier")).toBeInTheDocument()
    })
  })

  // ── 5. Tab navigation ─────────────────────────────────────────────────────

  describe('Tab navigation', () => {
    beforeEach(() => {
      mockedMakeRequest.mockImplementation(successResponse)
    })

    it('✅ [POSITIVE] renders all six tab labels', async () => {
      renderPage()
      await screen.findByText('alice_wonder')

      expect(screen.getByText('General Details')).toBeInTheDocument()
      expect(screen.getByText('Documents')).toBeInTheDocument()
      expect(screen.getByText('Bank Details')).toBeInTheDocument()
      expect(screen.getByText('Loans')).toBeInTheDocument()
      expect(screen.getByText('Savings')).toBeInTheDocument()
      expect(screen.getByText('App and System')).toBeInTheDocument()
    })

    it('✅ [POSITIVE] clicking Documents tab shows its placeholder', async () => {
      renderPage()
      await screen.findByText('alice_wonder')
      await userEvent.click(screen.getByText('Documents'))
      expect(screen.getByText(/documents.*coming soon/i)).toBeInTheDocument()
    })

    it('✅ [POSITIVE] clicking Bank Details tab shows its placeholder', async () => {
      renderPage()
      await screen.findByText('alice_wonder')
      await userEvent.click(screen.getByText('Bank Details'))
      expect(screen.getByText(/bank details.*coming soon/i)).toBeInTheDocument()
    })

    it('✅ [POSITIVE] clicking Loans tab shows its placeholder', async () => {
      renderPage()
      await screen.findByText('alice_wonder')
      await userEvent.click(screen.getByText('Loans'))
      expect(screen.getByText(/loans.*coming soon/i)).toBeInTheDocument()
    })

    it('✅ [POSITIVE] clicking Savings tab shows its placeholder', async () => {
      renderPage()
      await screen.findByText('alice_wonder')
      await userEvent.click(screen.getByText('Savings'))
      expect(screen.getByText(/savings.*coming soon/i)).toBeInTheDocument()
    })

    it('❌ [NEGATIVE] switching away from General Details hides personal info', async () => {
      renderPage()
      await screen.findByText('alice_wonder')
      await userEvent.click(screen.getByText('Documents'))
      expect(screen.queryByText('Personal Information')).not.toBeInTheDocument()
    })

    it('✅ [POSITIVE] switching back to General Details restores personal info', async () => {
      renderPage()
      await screen.findByText('alice_wonder')
      await userEvent.click(screen.getByText('Documents'))
      await userEvent.click(screen.getByText('General Details'))
      expect(screen.getByText('Personal Information')).toBeInTheDocument()
    })
  })

  // ── 6. Action buttons ─────────────────────────────────────────────────────

  describe('Blacklist / Activate actions', () => {
    it('✅ [POSITIVE] clicking Blacklist User fires a PATCH request', async () => {
      mockedMakeRequest
        .mockImplementationOnce(successResponse)        // initial fetch
        .mockResolvedValueOnce({ res: { data: {} } })   // PATCH
        .mockImplementation(successResponse)            // refetch

      renderPage()
      await screen.findByText('alice_wonder')
      await userEvent.click(screen.getByRole('button', { name: /blacklist user/i }))

      await waitFor(() => {
        const patchCall = mockedMakeRequest.mock.calls.find((c) => c[0] === 'PATCH')
        expect(patchCall).toBeDefined()
        expect(patchCall![2]).toMatchObject({ userId: 'user-42' })
      })
    })

    it('✅ [POSITIVE] clicking Activate User fires a PATCH request', async () => {
      mockedMakeRequest
        .mockImplementationOnce(successResponse)
        .mockResolvedValueOnce({ res: { data: {} } })
        .mockImplementation(successResponse)

      renderPage()
      await screen.findByText('alice_wonder')
      await userEvent.click(screen.getByRole('button', { name: /activate user/i }))

      await waitFor(() => {
        const patchCall = mockedMakeRequest.mock.calls.find((c) => c[0] === 'PATCH')
        expect(patchCall).toBeDefined()
      })
    })

    it('❌ [NEGATIVE] both action buttons are disabled while an action is processing', async () => {
      mockedMakeRequest
        .mockImplementationOnce(successResponse)
        .mockReturnValueOnce(new Promise(() => {})) // PATCH never resolves

      renderPage()
      await screen.findByText('alice_wonder')
      await userEvent.click(screen.getByRole('button', { name: /blacklist user/i }))

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /blacklist user/i })
        ).toBeDisabled()
        expect(
          screen.getByRole('button', { name: /activate user/i })
        ).toBeDisabled()
      })
    })
  })

  // ── 7. Error states ───────────────────────────────────────────────────────

  describe('Error states', () => {
    it('❌ [NEGATIVE] shows offline error when navigator.onLine is false', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true })
      mockedMakeRequest.mockImplementation(successResponse)
      renderPage()
      expect(await screen.findByText('No Internet Connection')).toBeInTheDocument()
    })

    it('❌ [NEGATIVE] shows server error when the API returns an error', async () => {
      mockedMakeRequest.mockResolvedValue({ error: 'Something went wrong' })
      renderPage()
      expect(await screen.findByText('Something Went Wrong')).toBeInTheDocument()
    })

    it('❌ [NEGATIVE] shows descriptive offline message', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true })
      mockedMakeRequest.mockImplementation(successResponse)
      renderPage()
      expect(
        await screen.findByText(/you appear to be offline/i)
      ).toBeInTheDocument()
    })

    it('❌ [NEGATIVE] shows descriptive server error message', async () => {
      mockedMakeRequest.mockResolvedValue({ error: 'Server Error' })
      renderPage()
      expect(
        await screen.findByText(/we couldn't load this user's details/i)
      ).toBeInTheDocument()
    })

    it('✅ [POSITIVE] clicking retry re-fetches and shows the profile', async () => {
      mockedMakeRequest
        .mockResolvedValueOnce({ error: 'Server Error' }) // first fails
        .mockImplementation(successResponse)              // retry succeeds

      renderPage()
      const retryBtn = await screen.findByRole('button', { name: /try again/i })
      await userEvent.click(retryBtn)

      expect(await screen.findByText('alice_wonder')).toBeInTheDocument()
    })

    it('❌ [NEGATIVE] shows "User not found." when res.data is null', async () => {
      mockedMakeRequest.mockResolvedValue({ res: { data: null } })
      renderPage()
      expect(await screen.findByText('User not found.')).toBeInTheDocument()
    })

    it('❌ [NEGATIVE] action buttons are hidden when there is an error', async () => {
      mockedMakeRequest.mockResolvedValue({ error: 'Server Error' })
      renderPage()
      await screen.findByText('Something Went Wrong')
      expect(
        screen.queryByRole('button', { name: /blacklist user/i })
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /activate user/i })
      ).not.toBeInTheDocument()
    })
  })

  // ── 8. Back navigation ────────────────────────────────────────────────────

  describe('Back navigation', () => {
    beforeEach(() => {
      mockedMakeRequest.mockImplementation(successResponse)
    })

    it('✅ [POSITIVE] renders the "Back to Users" link', async () => {
      renderPage()
      await screen.findByText('alice_wonder')
      expect(screen.getByText(/back to users/i)).toBeInTheDocument()
    })

    it('✅ [POSITIVE] clicking "Back to Users" calls window.history.back', async () => {
      renderPage()
      await screen.findByText('alice_wonder')
      await userEvent.click(screen.getByText(/back to users/i))
      expect(window.history.back).toHaveBeenCalledTimes(1)
    })
  })

  // ── 9. InfoField fallback ─────────────────────────────────────────────────

  describe('InfoField fallback', () => {
    it('✅ [POSITIVE] renders an em dash for empty field values', async () => {
      const userWithEmptyField = {
        ...MOCK_USER,
        personalInfo: { ...MOCK_USER.personalInfo, gender: '' },
      }
      mockedMakeRequest.mockResolvedValue({ res: { data: userWithEmptyField } })
      renderPage()
      await screen.findByText('alice_wonder')
      // The empty gender field should display "—"
      expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1)
    })
  })
})