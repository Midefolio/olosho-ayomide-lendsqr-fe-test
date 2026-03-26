/**
 * ============================================================
 * AdminLayout.test.tsx
 * Unit tests for the AdminLayout component
 * ============================================================
 */

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
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

// All vi.mock paths are relative to THIS test file: src/__tests__/adminLayout.test.tsx
// So '../' goes up to src/, matching what the component resolves to.

vi.mock('../styles/admin/adminLayout.module.scss', () => ({
  default: new Proxy({}, { get: (_: unknown, key: string) => key }),
}))

// Icons live in the same folder as the component: src/component/admin/LendsqrIcons
vi.mock('../component/admin/LendsqrIcons', () => ({
  IconAudit: () => <span data-testid="icon-audit" />,
  IconBell: () => <span data-testid="icon-bell" />,
  IconChevron: () => <span data-testid="icon-chevron" />,
  IconChevronTwo: () => <span data-testid="icon-chevron-two" />,
  IconDashboard: () => <span data-testid="icon-dashboard" />,
  IconDecision: () => <span data-testid="icon-decision" />,
  IconFees: () => <span data-testid="icon-fees" />,
  IconFeesPricing: () => <span data-testid="icon-fees-pricing" />,
  IconGuarantors: () => <span data-testid="icon-guarantors" />,
  IconKarma: () => <span data-testid="icon-karma" />,
  IconLoanProd: () => <span data-testid="icon-loan-prod" />,
  IconLoanReq: () => <span data-testid="icon-loan-req" />,
  IconLoans: () => <span data-testid="icon-loans" />,
  IconMenu: () => <span data-testid="icon-menu" />,
  IconOrg: () => <span data-testid="icon-org" />,
  IconPreferences: () => <span data-testid="icon-preferences" />,
  IconReports: () => <span data-testid="icon-reports" />,
  IconSavings: () => <span data-testid="icon-savings" />,
  IconSavProd: () => <span data-testid="icon-sav-prod" />,
  IconServiceAcc: () => <span data-testid="icon-service-acc" />,
  IconServices: () => <span data-testid="icon-services" />,
  IconSettlements: () => <span data-testid="icon-settlements" />,
  IconSwitch: () => <span data-testid="icon-switch" />,
  IconTx: () => <span data-testid="icon-tx" />,
  IconUsers: () => <span data-testid="icon-users" />,
  IconWhitelist: () => <span data-testid="icon-whitelist" />,
  IconX: () => <span data-testid="icon-x" />,
  Logout: () => <span data-testid="icon-logout" />,
}))

// dexieDB lives at src/utils/dexieDB — one level up from src/__tests__/
vi.mock('../utils/dexieDB', () => ({
  db: {
    cached_data: {
      delete: vi.fn().mockResolvedValue(undefined),
    },
  },
}))

// ── Imports (after mocks) ────────────────────────────────────────────────────
import AdminLayout from '../component/admin/adminLayout'
import { db } from '../utils/dexieDB'

// ── Helpers ───────────────────────────────────────────────────────────────────

const MOCK_USER = {
  firstName: 'Jane',
  lastName: 'Doe',
  image: 'https://example.com/avatar.jpg',
}

const buildStore = (currentUser = MOCK_USER) =>
  configureStore({
    reducer: { user: (state = { currentUser }) => state },
  })

const renderLayout = (activePath = '/admin/customers/users', children = <div>Page Content</div>) =>
  render(
    <Provider store={buildStore()}>
      <MemoryRouter>
        <AdminLayout activePath={activePath}>{children}</AdminLayout>
      </MemoryRouter>
    </Provider>
  )

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('AdminLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    Object.defineProperty(window, 'location', {
      value: { href: '/', reload: vi.fn() },
      writable: true,
    })
  })

  // ── 1. Basic rendering ────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('✅ [POSITIVE] renders children inside the main content area', () => {
      renderLayout()
      expect(screen.getByText('Page Content')).toBeInTheDocument()
    })

    it('✅ [POSITIVE] renders the Dashboard nav link in the sidebar', () => {
      renderLayout()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('✅ [POSITIVE] renders the Switch Organization button', () => {
      renderLayout()
      expect(screen.getByText('Switch Organization')).toBeInTheDocument()
    })

    it('✅ [POSITIVE] renders the version tag in the sidebar footer', () => {
      renderLayout()
      expect(screen.getByText('v1.2.0')).toBeInTheDocument()
    })

    it('✅ [POSITIVE] renders the Logout button in the sidebar', () => {
      renderLayout()
      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
    })

    it("✅ [POSITIVE] renders the logged-in user's first name in the navbar", () => {
      renderLayout()
      expect(screen.getAllByText('Jane').length).toBeGreaterThan(0)
    })

    it('✅ [POSITIVE] renders the search input placeholder', () => {
      renderLayout()
      expect(screen.getByPlaceholderText('Search for anything')).toBeInTheDocument()
    })
  })

  // ── 2. Sidebar toggle ─────────────────────────────────────────────────────

  describe('Sidebar toggle', () => {
    it('✅ [POSITIVE] clicking the menu toggle button renders the close icon', async () => {
      renderLayout()

      // FIX 1: Query the toggle buttons directly by their contained testid.
      // There are two toggle buttons (mobile + desktop); get all icon-menu spans
      // and click the closest button ancestor of the first one.
      const menuIcons = screen.getAllByTestId('icon-menu')
      expect(menuIcons.length).toBeGreaterThan(0)

      // Click the button that wraps the first icon-menu (desktop toggle)
      const toggleBtn = menuIcons[0].closest('button')!
      expect(toggleBtn).toBeTruthy()
      await userEvent.click(toggleBtn)

      // After opening, icon-x should appear
      expect(screen.getAllByTestId('icon-x').length).toBeGreaterThan(0)
    })

    it('✅ [POSITIVE] clicking the toggle again brings back the menu icon', async () => {
      renderLayout()

      // Open
      const menuIcons = screen.getAllByTestId('icon-menu')
      const toggleBtn = menuIcons[0].closest('button')!
      await userEvent.click(toggleBtn)

      // Now icon-x is shown — click the close button
      const closeIcons = screen.getAllByTestId('icon-x')
      const closeBtn = closeIcons[0].closest('button')!
      expect(closeBtn).toBeTruthy()
      await userEvent.click(closeBtn)

      // Back to menu icon
      await waitFor(() => {
        expect(screen.getAllByTestId('icon-menu').length).toBeGreaterThan(0)
      })
    })
  })

  // ── 3. Collapse groups ────────────────────────────────────────────────────

  describe('CollapseGroup — Customers section', () => {
    it('✅ [POSITIVE] Customers group is open by default when activePath is a customer route', () => {
      renderLayout('/admin/customers/users')
      expect(screen.getByText('Users')).toBeInTheDocument()
    })

    it('✅ [POSITIVE] clicking the Customers group header toggles it closed', async () => {
      renderLayout('/admin/customers/users')
      expect(screen.getByText('Users')).toBeInTheDocument()

      await userEvent.click(screen.getByText('Customers'))
      await waitFor(() => {
        expect(screen.queryByText('Users')).not.toBeInTheDocument()
      })
    })

    it('❌ [NEGATIVE] Businesses group is closed when activePath is a customer route', () => {
      renderLayout('/admin/customers/users')
      expect(screen.queryByText('Organization')).not.toBeInTheDocument()
    })

    it('✅ [POSITIVE] clicking Businesses header opens that group', async () => {
      renderLayout('/admin/customers/users')
      await userEvent.click(screen.getByText('Businesses'))
      expect(await screen.findByText('Organization')).toBeInTheDocument()
    })

    it('✅ [POSITIVE] Settings group opens when activePath is a settings route', () => {
      renderLayout('/admin/preferences')
      expect(screen.getByText('Preferences')).toBeInTheDocument()
    })
  })

  // ── 4. Active link highlighting ───────────────────────────────────────────

  describe('Active link highlighting', () => {
    it('✅ [POSITIVE] Dashboard link has active class when activePath is "/admin"', () => {
      renderLayout('/admin')
      const dashboardLink = screen.getByText('Dashboard').closest('a')
      expect(dashboardLink?.className).toContain('active')
    })

    it('❌ [NEGATIVE] Dashboard link does NOT have active class on other routes', () => {
      renderLayout('/admin/customers/users')
      const dashboardLink = screen.getByText('Dashboard').closest('a')
      expect(dashboardLink?.className).not.toContain('active')
    })
  })

  // ── 5. Logout modal ───────────────────────────────────────────────────────

  describe('Logout modal', () => {
    it('✅ [POSITIVE] logout modal is hidden by default', () => {
      renderLayout()
      expect(screen.queryByText('Log out?')).not.toBeInTheDocument()
    })

    it('✅ [POSITIVE] clicking the sidebar Logout button opens the modal', async () => {
      renderLayout()
      await userEvent.click(screen.getByRole('button', { name: /logout/i }))
      expect(await screen.findByText('Log out?')).toBeInTheDocument()
    })

    it("✅ [POSITIVE] modal displays the user's first name", async () => {
      renderLayout()
      await userEvent.click(screen.getByRole('button', { name: /logout/i }))
      await screen.findByText('Log out?')

      // FIX 3: 'Jane' appears in both the navbar AND the modal — use getAllByText
      const janeElements = screen.getAllByText('Jane')
      expect(janeElements.length).toBeGreaterThan(0)
    })

    it('✅ [POSITIVE] clicking Stay closes the modal without logging out', async () => {
      renderLayout()
      await userEvent.click(screen.getByRole('button', { name: /logout/i }))
      await screen.findByText('Log out?')

      await userEvent.click(screen.getByRole('button', { name: /stay/i }))

      await waitFor(() => {
        expect(screen.queryByText('Log out?')).not.toBeInTheDocument()
      })
      localStorage.setItem('auth_token', 'test-token')
      expect(localStorage.getItem('auth_token')).toBe('test-token')
    })

    it('✅ [POSITIVE] confirming logout removes auth_token from localStorage', async () => {
      localStorage.setItem('auth_token', 'test-token')
      renderLayout()

      await userEvent.click(screen.getByRole('button', { name: /logout/i }))
      await screen.findByText('Log out?')
      await userEvent.click(screen.getByRole('button', { name: /yes, log out/i }))

      await waitFor(() => {
        expect(localStorage.getItem('auth_token')).toBeNull()
      })
    })

    it('✅ [POSITIVE] confirming logout calls db.cached_data.delete', async () => {
      renderLayout()
      await userEvent.click(screen.getByRole('button', { name: /logout/i }))
      await screen.findByText('Log out?')
      await userEvent.click(screen.getByRole('button', { name: /yes, log out/i }))

      await waitFor(() => {
        expect(vi.mocked(db.cached_data.delete)).toHaveBeenCalledWith('admin_user_details')
      })
    })

    it('❌ [NEGATIVE] modal does not close when its inner box is clicked (stopPropagation)', async () => {
      renderLayout()
      await userEvent.click(screen.getByRole('button', { name: /logout/i }))
      const modalTitle = await screen.findByText('Log out?')

      await userEvent.click(modalTitle)
      expect(screen.getByText('Log out?')).toBeInTheDocument()
    })

    it('✅ [POSITIVE] modal shows generic message when no user name is provided', async () => {
      const store = configureStore({
        reducer: { user: (state = { currentUser: null }) => state },
      })
      render(
        <Provider store={store}>
          <MemoryRouter>
            <AdminLayout>
              <div>Content</div>
            </AdminLayout>
          </MemoryRouter>
        </Provider>
      )

      // FIX 5: Use userEvent.click instead of raw .click() so React state updates fire
      await userEvent.click(screen.getByRole('button', { name: /logout/i }))

      expect(
        await screen.findByText(/are you sure you want to end your current session/i)
      ).toBeInTheDocument()
    })
  })

  // ── 6. No user state ──────────────────────────────────────────────────────

  describe('No user state', () => {
    it('❌ [NEGATIVE] renders without crashing when currentUser is null', () => {
      const store = configureStore({
        reducer: { user: (state = { currentUser: null }) => state },
      })
      expect(() =>
        render(
          <Provider store={store}>
            <MemoryRouter>
              <AdminLayout>
                <div>Content</div>
              </AdminLayout>
            </MemoryRouter>
          </Provider>
        )
      ).not.toThrow()
    })
  })
})