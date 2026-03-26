// ─────────────────────────────────────────────────────────────────────────────
// Provides all data-fetching logic for the UsersPage.
// Components consume this context instead of calling makeRequest directly,
// keeping the page component clean and making the fetching logic easy to test.
//
// Cache strategy:
//   • If Redux already has data fetched within CACHE_TTL_MS, return immediately
//     (no network call) — this is what prevents refetches on back-navigation.
//   • If the cache is stale or empty, fetch from the API and update Redux.
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../states'
import { makeRequest } from '../utils/fetcher'
import { GET_USERS_API, getUserToken } from '../apis'
import {
  setUsersData,
  setStats,
  applyFilter as applyFilterAction,
  resetFilter as resetFilterAction,
  setPage as setPageAction,
  setLimit as setLimitAction,
  invalidateCache,
  type UsersFilterState,
  type CachedUser,
  type UsersStats,
  type UsersPagination,
} from '../states/tableDataSlice'

// ── How long (ms) before cached data is considered stale ─────────────────────
// 5 minutes — adjust to taste. Set to 0 to always refetch.
const CACHE_TTL_MS = 5 * 60 * 1000

// ── Types ─────────────────────────────────────────────────────────────────────

type ErrorType = 'offline' | 'server' | null

export interface UsersPageContextValue {
  // ── State (read from Redux) ────────────────────────────────────────────────
  users: CachedUser[]
  filteredUsers: CachedUser[]
  stats: UsersStats | null
  pagination: UsersPagination | null
  page: number
  limit: number
  appliedFilter: UsersFilterState
  isFiltered: boolean

  // ── Loading / error flags (local to context — not persisted in Redux) ──────
  tableLoading: boolean
  statsLoading: boolean
  tableError: ErrorType
  actionLoading: boolean

  // ── Actions ────────────────────────────────────────────────────────────────

  /** Fetch table data. Skips the network if the cache is still fresh. */
  fetchTable: (page: number, limit: number, force?: boolean) => Promise<void>

  /** Fetch stats only (used on first mount if stats are missing). */
  fetchStats: () => Promise<void>

  /** Apply a client-side filter over the cached list. */
  applyFilter: (filter: UsersFilterState) => void

  /** Clear the active filter. */
  resetFilter: () => void

  /** Navigate to a different page. */
  goToPage: (page: number) => void

  /** Change the rows-per-page limit. */
  changeLimit: (limit: number) => void

  /**
   * Perform a user action (blacklist / unblacklist / activate / deactivate).
   * Invalidates the cache and refetches the table after success.
   */
  performAction: (
    action: 'blacklist' | 'unblacklist' | 'activate' | 'deactivate',
    userId: string
  ) => Promise<void>
}

// ── Context ───────────────────────────────────────────────────────────────────

const UsersPageContext = createContext<UsersPageContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export const UsersPageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const dispatch = useDispatch()

  // Pull everything from Redux
  const {
    users,
    filteredUsers,
    stats,
    pagination,
    page,
    limit,
    appliedFilter,
    isFiltered,
    lastFetchedAt,
  } = useSelector((state: RootState) => state.user)

  // Local loading / error state — these don't need to survive navigation
  const [tableLoading, setTableLoading] = React.useState(false)
  const [statsLoading, setStatsLoading] = React.useState(false)
  const [tableError, setTableError] = React.useState<ErrorType>(null)
  const [actionLoading, setActionLoading] = React.useState(false)

  // ── fetchStats ─────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    if (stats) return // already have them
    setStatsLoading(true)
    const { res } = await makeRequest(
      'POST',
      GET_USERS_API,
      { page: 1, limit: 1 },
      () => {},
      getUserToken(),
      null,
      'json'
    )
    if (res?.data?.stats) {
      dispatch(setStats(res.data.stats))
    }
    setStatsLoading(false)
  }, [dispatch, stats])

  // ── fetchTable ─────────────────────────────────────────────────────────────
  const fetchTable = useCallback(
    async (currentPage: number, currentLimit: number, force = false) => {
      // ── Cache check ──────────────────────────────────────────────────────
      // If we have fresh data for the same page/limit, skip the network call
      const isCacheFresh =
        lastFetchedAt !== null &&
        Date.now() - lastFetchedAt < CACHE_TTL_MS &&
        pagination?.currentPage === currentPage &&
        pagination?.limit === currentLimit

      if (!force && isCacheFresh) {
        // Data is still fresh — nothing to do
        return
      }

      // ── Offline check ────────────────────────────────────────────────────
      if (!navigator.onLine) {
        setTableError('offline')
        setTableLoading(false)
        return
      }

      setTableLoading(true)
      setTableError(null)

      const { res, error } = await makeRequest(
        'POST',
        GET_USERS_API,
        { page: currentPage, limit: currentLimit },
        () => {},
        getUserToken(),
        null,
        'json'
      )

      if (res?.data) {
        dispatch(
          setUsersData({
            users: res.data.users,
            pagination: res.data.pagination,
            stats: res.data.stats,
          })
        )
        setTableError(null)
      } else {
        const isOffline =
          !navigator.onLine ||
          error?.toLowerCase().includes('offline') ||
          error?.toLowerCase().includes('network')
        setTableError(isOffline ? 'offline' : 'server')
      }

      setTableLoading(false)
    },
    [dispatch, lastFetchedAt, pagination]
  )

  // ── applyFilter ────────────────────────────────────────────────────────────
  const applyFilter = useCallback(
    (filter: UsersFilterState) => {
      dispatch(applyFilterAction(filter))
    },
    [dispatch]
  )

  // ── resetFilter ────────────────────────────────────────────────────────────
  const resetFilter = useCallback(() => {
    dispatch(resetFilterAction())
  }, [dispatch])

  // ── goToPage ───────────────────────────────────────────────────────────────
  const goToPage = useCallback(
    (newPage: number) => {
      dispatch(setPageAction(newPage))
    },
    [dispatch]
  )

  // ── changeLimit ────────────────────────────────────────────────────────────
  const changeLimit = useCallback(
    (newLimit: number) => {
      dispatch(setLimitAction(newLimit))
    },
    [dispatch]
  )

  // ── performAction ──────────────────────────────────────────────────────────
  const performAction = useCallback(
    async (
      action: 'blacklist' | 'unblacklist' | 'activate' | 'deactivate',
      userId: string
    ) => {
      const endpointMap = {
        blacklist: 'BLACKLIST_USER',
        unblacklist: 'UNBLACKLIST_USER',
        activate: 'ACTIVATE_USER',
        deactivate: 'DEACTIVATE_USER',
      }

      setActionLoading(true)
      await makeRequest(
        'PATCH',
        endpointMap[action],
        { userId },
        () => {},
        getUserToken(),
        null,
        'json'
      )
      setActionLoading(false)

      // Bust the cache so the next fetchTable call hits the network
      dispatch(invalidateCache())

      // Force a fresh fetch to reflect the updated user status
      await fetchTable(page, limit, true)
    },
    [dispatch, fetchTable, page, limit]
  )

  const value: UsersPageContextValue = {
    // State
    users,
    filteredUsers,
    stats,
    pagination,
    page,
    limit,
    appliedFilter,
    isFiltered,
    // Loading / error
    tableLoading,
    statsLoading,
    tableError,
    actionLoading,
    // Actions
    fetchTable,
    fetchStats,
    applyFilter,
    resetFilter,
    goToPage,
    changeLimit,
    performAction,
  }

  return (
    <UsersPageContext.Provider value={value}>
      {children}
    </UsersPageContext.Provider>
  )
}

// ── Consumer hook ─────────────────────────────────────────────────────────────

/**
 * Use inside any component that is a descendant of <UsersPageProvider>.
 *
 * @example
 * const { users, fetchTable, tableLoading } = useUsersPage()
 */
export const useUsersPage = (): UsersPageContextValue => {
  const ctx = useContext(UsersPageContext)
  if (!ctx) {
    throw new Error('useUsersPage must be used inside <UsersPageProvider>')
  }
  return ctx
}