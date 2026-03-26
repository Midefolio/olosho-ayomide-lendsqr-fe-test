// ─────────────────────────────────────────────────────────────────────────────
// src/states/usersSlice.ts
//
// Caches the UsersPage data in Redux so navigating to UserDetailsPage and
// back does NOT trigger a fresh network fetch — the cached data is shown
// instantly and a background refresh only runs when the cache is stale.
// ─────────────────────────────────────────────────────────────────────────────

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CachedUser {
  id: string
  organization: string
  userName: string
  email: string
  phoneNumber: string
  status: 'Active' | 'Inactive' | 'Pending' | 'Blacklisted'
  dateJoined: string
}

export interface UsersStats {
  totalUsers: number
  activeUsers: number
  usersWithLoan: number
  usersWithSavings: number
}

export interface UsersPagination {
  totalUsers: number
  totalPages: number
  currentPage: number
  limit: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface UsersFilterState {
  organization: string
  username: string
  email: string
  date: string
  phoneNumber: string
  status: string
}

export interface UsersPageState {
  /** The raw list fetched from the API for the current page */
  users: CachedUser[]

  /** Summary stats (total, active, with loan, with savings) */
  stats: UsersStats | null

  /** Pagination metadata returned by the API */
  pagination: UsersPagination | null

  /** Currently active page number */
  page: number

  /** Rows per page */
  limit: number

  /** The filter values the user last applied */
  appliedFilter: UsersFilterState

  /** Users after the client-side filter has been applied */
  filteredUsers: CachedUser[]

  /** Whether a client-side filter is currently active */
  isFiltered: boolean

  /**
   * Unix timestamp (ms) of the last successful fetch.
   * Used by the context to decide whether to re-fetch or serve cached data.
   * null means the cache is empty and a fetch is mandatory.
   */
  lastFetchedAt: number | null
}

// ── Initial state ─────────────────────────────────────────────────────────────

export const EMPTY_FILTER: UsersFilterState = {
  organization: '',
  username: '',
  email: '',
  date: '',
  phoneNumber: '',
  status: '',
}

const initialState: UsersPageState = {
  users: [],
  stats: null,
  pagination: null,
  page: 1,
  limit: 10,
  appliedFilter: EMPTY_FILTER,
  filteredUsers: [],
  isFiltered: false,
  lastFetchedAt: null,
}

// ── Slice ─────────────────────────────────────────────────────────────────────

const usersSlice = createSlice({
  name: 'usersPage',
  initialState,
  reducers: {
    /**
     * Called after a successful table fetch.
     * Stores users, pagination, and stamps the cache time.
     */
    setUsersData(
      state,
      action: PayloadAction<{
        users: CachedUser[]
        pagination: UsersPagination
        stats?: UsersStats
      }>
    ) {
      state.users = action.payload.users
      state.pagination = action.payload.pagination
      // Reset filter whenever new data comes in
      state.filteredUsers = action.payload.users
      state.isFiltered = false
      state.appliedFilter = EMPTY_FILTER
      state.lastFetchedAt = Date.now()
      // Only update stats if the API returned them
      if (action.payload.stats) {
        state.stats = action.payload.stats
      }
    },

    /**
     * Called after a successful stats-only fetch.
     */
    setStats(state, action: PayloadAction<UsersStats>) {
      state.stats = action.payload
    },

    /**
     * Apply a client-side filter over the cached users list.
     */
    applyFilter(state, action: PayloadAction<UsersFilterState>) {
      const draft = action.payload
      let result = [...state.users]

      if (draft.organization)
        result = result.filter(u =>
          u.organization.toLowerCase().includes(draft.organization.toLowerCase())
        )
      if (draft.username)
        result = result.filter(u =>
          u.userName.toLowerCase().includes(draft.username.toLowerCase())
        )
      if (draft.email)
        result = result.filter(u =>
          u.email.toLowerCase().includes(draft.email.toLowerCase())
        )
      if (draft.date)
        result = result.filter(u => u.dateJoined.startsWith(draft.date))
      if (draft.phoneNumber)
        result = result.filter(u => u.phoneNumber.includes(draft.phoneNumber))
      if (draft.status)
        result = result.filter(u => u.status === draft.status)

      state.appliedFilter = draft
      state.filteredUsers = result
      state.isFiltered = true
    },

    /**
     * Clear the active filter and show the full cached list again.
     */
    resetFilter(state) {
      state.appliedFilter = EMPTY_FILTER
      state.filteredUsers = state.users
      state.isFiltered = false
    },

    /**
     * Change the current page (triggers a re-fetch via the context).
     */
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload
    },

    /**
     * Change the rows-per-page limit and reset to page 1.
     */
    setLimit(state, action: PayloadAction<number>) {
      state.limit = action.payload
      state.page = 1
    },

    /**
     * Wipe the entire cache — forces a fresh fetch next time the page mounts.
     * Call this after a successful blacklist / activate / deactivate action
     * so the list reflects the updated status.
     */
    invalidateCache(state) {
      state.lastFetchedAt = null
    },
  },
})

export const {
  setUsersData,
  setStats,
  applyFilter,
  resetFilter,
  setPage,
  setLimit,
  invalidateCache,
} = usersSlice.actions

export default usersSlice.reducer