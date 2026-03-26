/* eslint-disable @typescript-eslint/no-explicit-any */
// ─────────────────────────────────────────────────────────────────────────────
// src/pages/admin/customers/users/UsersPage.tsx
//
// All data-fetching and state management is now handled by UsersPageContext.
// The component only deals with rendering and user interactions.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AdminLayout from '../../../../component/admin/adminLayout'
import styles from '../../../../styles/admin/usersPage.module.scss'
import {
  IconFilter, IconDots, IconEye, IconBlacklist,
  IconActivate, IconChevLeft, IconChevRight,
  TotalUsers, ActiveUsers, UsersWithLoan, UsersWithSavings,
} from '../../../../component/admin/LendsqrIcons'
import { useNavigate } from 'react-router-dom'
import { useUsersPage } from '../../../../context/usersPageContext'
import type { UsersFilterState } from '../../../../states/tableDataSlice'

// ── Types ──────────────────────────────────────────────────────────────────────
type UserAction = 'blacklist' | 'unblacklist' | 'activate' | 'deactivate' | null

interface ConfirmDialog {
  open: boolean
  userId: string | null
  userName: string
  action: UserAction
}

// ── Constants ──────────────────────────────────────────────────────────────────
const STATUS_CLASSES: Record<string, string> = {
  Active: styles.active,
  Inactive: styles.inactive,
  Pending: styles.pending,
  Blacklisted: styles.blacklisted,
}

// ── Skeleton components ────────────────────────────────────────────────────────
const SkeletonBlock = ({ w, h = 14 }: { w: number | string; h?: number }) => (
  <div className={styles.shimmer} style={{ width: w, height: h, borderRadius: 4 }} />
)

const StatCardSkeleton = () => (
  <div className={styles.skeletonCard}>
    <div className={styles.skeletonIconCircle}>
      <SkeletonBlock w={20} h={20} />
    </div>
    <div style={{ marginTop: 14 }}><SkeletonBlock w="60%" h={10} /></div>
    <div style={{ marginTop: 10 }}><SkeletonBlock w="45%" h={24} /></div>
  </div>
)

const TableSkeleton = () => (
  <div className={styles.tableCard}>
    <div className={styles.skeletonHead}>
      {[90, 110, 150, 100, 130, 110, 80].map((w, i) => (
        <SkeletonBlock key={i} w={w} h={12} />
      ))}
    </div>
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className={styles.skeletonRow} style={{ animationDelay: `${i * 60}ms` }}>
        <SkeletonBlock w={24} h={13} />
        <SkeletonBlock w={90} h={13} />
        <SkeletonBlock w={110} h={13} />
        <SkeletonBlock w={150} h={13} />
        <SkeletonBlock w={100} h={13} />
        <SkeletonBlock w={130} h={13} />
        <SkeletonBlock w={70} h={28} />
      </div>
    ))}
  </div>
)

// ── Error State ────────────────────────────────────────────────────────────────
const OfflineIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
    <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
)

const ServerErrorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
    <line x1="12" y1="18" x2="16" y2="18" />
    <line x1="14" y1="16" x2="14" y2="20" />
  </svg>
)

const ErrorState: React.FC<{
  type: 'offline' | 'server' | null
  onRetry: () => void
  retrying: boolean
}> = ({ type, onRetry, retrying }) => {
  const isOffline = type === 'offline'
  return (
    <motion.div
      className={styles.errorState}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`${styles.errorIcon} ${isOffline ? styles.errorIconOffline : styles.errorIconServer}`}>
        {isOffline ? <OfflineIcon /> : <ServerErrorIcon />}
      </div>
      <p className={styles.errorTitle}>
        {isOffline ? 'No Internet Connection' : 'Something Went Wrong'}
      </p>
      <p className={styles.errorMessage}>
        {isOffline
          ? 'You appear to be offline. Please check your internet connection and try again.'
          : "We couldn't load users. This may be a temporary issue — please try again."}
      </p>
      <button className={styles.retryBtn} onClick={onRetry} disabled={retrying}>
        {retrying ? 'Retrying…' : 'Try Again'}
      </button>
    </motion.div>
  )
}

// ── Stat icons ─────────────────────────────────────────────────────────────────
const STAT_ICONS = {
  totalUsers: <TotalUsers />,
  activeUsers: <ActiveUsers />,
  usersWithLoan: <UsersWithLoan />,
  usersWithSavings: <UsersWithSavings />,
}

// ── Pagination helper ──────────────────────────────────────────────────────────
const getPageNumbers = (current: number, total: number): (number | '...')[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 3) return [1, 2, 3, '...', total - 1, total]
  if (current >= total - 2) return [1, 2, '...', total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

const formatNumber = (n: number) => n?.toLocaleString() ?? '—'

// ── Action config ──────────────────────────────────────────────────────────────
const ACTION_CONFIG: Record<NonNullable<UserAction>, {
  bandColor: string
  ringBg: string
  ringBorder: string
  iconColor: string
  confirmBg: string
  confirmHover: string
  title: string
  message: (name: string) => React.ReactNode
  confirmLabel: string
  icon: React.ReactNode
}> = {
  blacklist: {
    bandColor: 'linear-gradient(90deg, #e4033b 0%, #7a0020 100%)',
    ringBg: 'rgba(228, 3, 59, 0.07)',
    ringBorder: 'rgba(228, 3, 59, 0.18)',
    iconColor: '#e4033b',
    confirmBg: '#e4033b',
    confirmHover: '#c4022f',
    title: 'Blacklist User?',
    message: (name) => <>This will immediately revoke <strong>{name}</strong>'s access. They won't be able to log in.</>,
    confirmLabel: 'Yes, Blacklist',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" /><path d="M4.93 4.93l14.14 14.14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>,
  },
  unblacklist: {
    bandColor: 'linear-gradient(90deg, #39cdcc 0%, #213f7d 100%)',
    ringBg: 'rgba(57, 205, 204, 0.08)',
    ringBorder: 'rgba(57, 205, 204, 0.22)',
    iconColor: '#39cdcc',
    confirmBg: '#39cdcc',
    confirmHover: '#2eb8b7',
    title: 'Remove from Blacklist?',
    message: (name) => <>This will restore <strong>{name}</strong>'s access and remove their blacklisted status.</>,
    confirmLabel: 'Yes, Remove',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.2" /><path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  },
  activate: {
    bandColor: 'linear-gradient(90deg, #39CD62 0%, #1a7a3a 100%)',
    ringBg: 'rgba(57, 205, 98, 0.07)',
    ringBorder: 'rgba(57, 205, 98, 0.2)',
    iconColor: '#39CD62',
    confirmBg: '#39CD62',
    confirmHover: '#2daf54',
    title: 'Activate User?',
    message: (name) => <><strong>{name}</strong> will regain full access to their account.</>,
    confirmLabel: 'Yes, Activate',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>,
  },
  deactivate: {
    bandColor: 'linear-gradient(90deg, #e9b200 0%, #a07800 100%)',
    ringBg: 'rgba(233, 178, 0, 0.08)',
    ringBorder: 'rgba(233, 178, 0, 0.22)',
    iconColor: '#e9b200',
    confirmBg: '#e9b200',
    confirmHover: '#c49a00',
    title: 'Deactivate User?',
    message: (name) => <><strong>{name}</strong> will be set to inactive and lose access until reactivated.</>,
    confirmLabel: 'Yes, Deactivate',
    icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 2a5 5 0 1 0 0 10A5 5 0 0 0 12 2z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /><path d="M17 17l4 4M21 17l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>,
  },
}

// ── Confirm Dialog Modal ───────────────────────────────────────────────────────
const ConfirmDialogModal: React.FC<{
  dialog: ConfirmDialog
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}> = ({ dialog, onConfirm, onCancel, loading }) => {
  if (!dialog.action) return null
  const cfg = ACTION_CONFIG[dialog.action]

  return (
    <AnimatePresence>
      {dialog.open && (
        <motion.div
          className={styles.dialogOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onCancel}
        >
          <motion.div
            className={styles.dialogBox}
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 24 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.dialogBand} style={{ background: cfg.bandColor }} />
            <div className={styles.dialogIconWrap}>
              <div
                className={styles.dialogIconRing}
                style={{ background: cfg.ringBg, border: `2px solid ${cfg.ringBorder}`, color: cfg.iconColor }}
              >
                {cfg.icon}
              </div>
            </div>
            <h3 className={styles.dialogTitle}>{cfg.title}</h3>
            <p className={styles.dialogMessage}>{cfg.message(dialog.userName)}</p>
            <div className={styles.dialogSplitActions}>
              <button className={styles.dialogSplitCancel} onClick={onCancel} disabled={loading}>
                Cancel
              </button>
              <button
                className={styles.dialogSplitConfirm}
                style={{ background: cfg.confirmBg, ['--confirm-hover' as string]: cfg.confirmHover }}
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? (<><span className={styles.dialogSpinner} /> Processing…</>) : cfg.confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Filter Popover ─────────────────────────────────────────────────────────────
const FilterPopover: React.FC<{
  col: string
  organizations: string[]
  initialFilter: UsersFilterState
  onApply: (f: UsersFilterState) => void
  onReset: () => void
}> = ({ organizations, initialFilter, onApply, onReset }) => {
  const [draft, setDraft] = useState<UsersFilterState>(initialFilter)

  const set = (key: keyof UsersFilterState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDraft((prev:any) => ({ ...prev, [key]: e.target.value }))

  return (
    <div className={styles.filterPopover}>
      <div className={styles.filterField}>
        <label>Organization</label>
        <select value={draft.organization} onChange={set('organization')}>
          <option value=''>Select</option>
          {organizations.map(o => <option key={o}>{o}</option>)}
        </select>
      </div>
      <div className={styles.filterField}>
        <label>Username</label>
        <input placeholder="User" value={draft.username} onChange={set('username')} />
      </div>
      <div className={styles.filterField}>
        <label>Email</label>
        <input placeholder="Email" value={draft.email} onChange={set('email')} />
      </div>
      <div className={styles.filterField}>
        <label>Date</label>
        <div className={styles.dateInputWrap}>
          <input type="date" value={draft.date} onChange={set('date')} className={styles.dateInput} />
        </div>
      </div>
      <div className={styles.filterField}>
        <label>Phone Number</label>
        <input placeholder="Phone Number" value={draft.phoneNumber} onChange={set('phoneNumber')} />
      </div>
      <div className={styles.filterField}>
        <label>Status</label>
        <select value={draft.status} onChange={set('status')}>
          <option value=''>Select</option>
          {['Active', 'Inactive', 'Pending', 'Blacklisted'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className={styles.filterActions}>
        <button className={styles.resetBtn} onClick={onReset}>Reset</button>
        <button className={styles.applyBtn} onClick={() => onApply(draft)}>Filter</button>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
const UsersPage: React.FC = () => {
  const navigate = useNavigate()

  // All data + actions come from context
  const {
    users,
    filteredUsers,
    stats,
    pagination,
    page,
    limit,
    appliedFilter,
    isFiltered,
    tableLoading,
    statsLoading,
    tableError,
    actionLoading,
    fetchTable,
    fetchStats,
    applyFilter,
    resetFilter,
    goToPage,
    changeLimit,
    performAction,
  } = useUsersPage()

  // Local UI state — doesn't need to persist
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterCol, setFilterCol] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>({
    open: false, userId: null, userName: '', action: null,
  })

  const filterRef = useRef<HTMLDivElement>(null)

  // ── Initial fetch on mount ─────────────────────────────────────────────────
  useEffect(() => {
    fetchStats()
    fetchTable(page, limit)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally empty — only run on mount; context handles caching

  // ── Re-fetch when page or limit changes ───────────────────────────────────
  useEffect(() => {
    fetchTable(page, limit)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit])

  // ── Online recovery ────────────────────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      if (tableError === 'offline') fetchTable(page, limit, true)
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [tableError, fetchTable, page, limit])

  // ── Close dropdowns on outside click ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
        setFilterCol(null)
      }
      setOpenMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Action handlers ────────────────────────────────────────────────────────
  const openConfirm = (userId: string, userName: string, action: NonNullable<UserAction>) => {
    setOpenMenu(null)
    setConfirmDialog({ open: true, userId, userName, action })
  }

  const handleConfirmAction = async () => {
    if (!confirmDialog.userId || !confirmDialog.action) return
    await performAction(confirmDialog.action, confirmDialog.userId)
    setConfirmDialog({ open: false, userId: null, userName: '', action: null })
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const displayUsers = isFiltered ? filteredUsers : users
  const totalPages = isFiltered
    ? Math.max(1, Math.ceil(filteredUsers.length / limit))
    : pagination?.totalPages ?? 1
  const totalCount = isFiltered ? filteredUsers.length : pagination?.totalUsers ?? 0
  const organizations = [...new Set(users.map(u => u.organization))]

  const STAT_CARDS = [
    { label: 'Users', value: stats?.totalUsers, colorClass: 'pink', icon: STAT_ICONS.totalUsers },
    { label: 'Active Users', value: stats?.activeUsers, colorClass: 'purple', icon: STAT_ICONS.activeUsers },
    { label: 'Users with Loans', value: stats?.usersWithLoan, colorClass: 'peach', icon: STAT_ICONS.usersWithLoan },
    { label: 'Users with Savings', value: stats?.usersWithSavings, colorClass: 'red', icon: STAT_ICONS.usersWithSavings },
  ]

  // ── Column header with filter ──────────────────────────────────────────────
  const ThWithFilter = ({ col, label }: { col: string; label: string }) => (
    <th style={{ position: 'relative' }}>
      <div
        className={styles.thInner}
        onClick={() => {
          const next = filterCol !== col
          setFilterCol(next ? col : null)
          setFilterOpen(next)
        }}
      >
        {label} <IconFilter />
      </div>
      <AnimatePresence>
        {filterOpen && filterCol === col && (
          <motion.div
            ref={filterRef}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <FilterPopover
              col={col}
              organizations={organizations}
              initialFilter={appliedFilter}
              onApply={(f) => { applyFilter(f); setFilterOpen(false); setFilterCol(null) }}
              onReset={() => { resetFilter(); setFilterOpen(false); setFilterCol(null) }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </th>
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AdminLayout activePath="/admin/customers/users">
      <div className={styles.usersPage}>
        <h1 className={styles.pageTitle}>Users</h1>

        {/* Stats */}
        <div className={styles.statsGrid}>
          {statsLoading
            ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
            : STAT_CARDS.map((s, i) => (
              <motion.div
                key={s.label}
                className={styles.statCard}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <div className={`${styles.statIconWrap} ${styles[s.colorClass]}`}>{s.icon}</div>
                <div className={styles.statLabel}>{s.label}</div>
                <div className={styles.statValue}>{formatNumber(s.value ?? 0)}</div>
              </motion.div>
            ))
          }
        </div>

        {/* Table / Error */}
        {tableLoading ? (
          <TableSkeleton />
        ) : tableError ? (
          <ErrorState
            type={tableError}
            onRetry={() => fetchTable(page, limit, true)}
            retrying={tableLoading}
          />
        ) : (
          <motion.div
            className={styles.tableCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            <div className={styles.tableWrapper}>
              <table>
                <thead>
                  <tr>
                    <th className={styles.snCol}>S/N</th>
                    <ThWithFilter col="organization" label="Organization" />
                    <ThWithFilter col="username" label="Username" />
                    <ThWithFilter col="email" label="Email" />
                    <ThWithFilter col="phoneNumber" label="Phone Number" />
                    <ThWithFilter col="dateJoined" label="Date Joined" />
                    <ThWithFilter col="status" label="Status" />
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {displayUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className={styles.emptyState}>No users found</td>
                    </tr>
                  ) : (
                    displayUsers.map((user, index) => (
                      <tr key={user.id}>
                        <td className={styles.snCol}>{(page - 1) * limit + index + 1}</td>
                        <td>{user.organization}</td>
                        <td>{user.userName}</td>
                        <td>{user.email}</td>
                        <td>{user.phoneNumber}</td>
                        <td>{new Date(user.dateJoined).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}</td>
                        <td>
                          <span className={`${styles.badge} ${STATUS_CLASSES[user.status] ?? styles.inactive}`}>
                            {user.status}
                          </span>
                        </td>
                        <td className={styles.actionsCell}>
                          <button
                            className={styles.dotsBtn}
                            onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                          >
                            <IconDots />
                          </button>
                          <AnimatePresence>
                            {openMenu === user.id && (
                              <motion.div
                                className={styles.dropdown}
                                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                transition={{ duration: 0.15 }}
                              >
                                <div className={styles.dropItem} onClick={() => navigate(`/admin/customers/user/${user.id}`)}>
                                  <IconEye /> View Details
                                </div>
                                <div className={styles.dropDivider} />
                                {user.status === 'Blacklisted' ? (
                                  <div
                                    className={`${styles.dropItem} ${styles.dropItemSuccess}`}
                                    onClick={() => openConfirm(user.id, user.userName, 'unblacklist')}
                                  >
                                    <IconActivate /> Unblacklist User
                                  </div>
                                ) : (
                                  <div
                                    className={`${styles.dropItem} ${styles.dropItemDanger}`}
                                    onClick={() => openConfirm(user.id, user.userName, 'blacklist')}
                                  >
                                    <IconBlacklist /> Blacklist User
                                  </div>
                                )}
                                {user.status !== 'Blacklisted' && (
                                  user.status === 'Active' ? (
                                    <div
                                      className={`${styles.dropItem} ${styles.dropItemWarning}`}
                                      onClick={() => openConfirm(user.id, user.userName, 'deactivate')}
                                    >
                                      <IconBlacklist /> Deactivate User
                                    </div>
                                  ) : (
                                    <div
                                      className={`${styles.dropItem} ${styles.dropItemSuccess}`}
                                      onClick={() => openConfirm(user.id, user.userName, 'activate')}
                                    >
                                      <IconActivate /> Activate User
                                    </div>
                                  )
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Pagination */}
        {!tableLoading && !tableError && (
          <div className={styles.pagination}>
            <div className={styles.showingInfo}>
              Showing
              <select
                className={styles.limitSelect}
                value={limit}
                onChange={e => changeLimit(Number(e.target.value))}
              >
                {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              out of {formatNumber(totalCount)}
            </div>
            <div className={styles.pages}>
              <button
                className={styles.pageArrow}
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
              >
                <IconChevLeft />
              </button>
              {getPageNumbers(page, totalPages).map((p, i) =>
                p === '...'
                  ? <span key={`e${i}`} className={styles.ellipsis}>…</span>
                  : (
                    <button
                      key={p}
                      className={`${styles.pageBtn} ${page === p ? styles.activePage : ''}`}
                      onClick={() => goToPage(p as number)}
                    >
                      {p}
                    </button>
                  )
              )}
              <button
                className={styles.pageArrow}
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
              >
                <IconChevRight />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialogModal
        dialog={confirmDialog}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmDialog({ open: false, userId: null, userName: '', action: null })}
        loading={actionLoading}
      />
    </AdminLayout>
  )
}

export default UsersPage