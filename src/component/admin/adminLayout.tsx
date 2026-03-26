import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styles from '../../styles/admin/adminLayout.module.scss'
import { IconAudit, IconBell, IconChevron, IconChevronTwo, IconDashboard, IconDecision, IconFees, IconFeesPricing, IconGuarantors, IconKarma, IconLoanProd, IconLoanReq, IconLoans, IconMenu, IconOrg, IconPreferences, IconReports, IconSavings, IconSavProd, IconServiceAcc, IconServices, IconSettlements, IconSwitch, IconTx, IconUsers, IconWhitelist, IconX, Logout } from './LendsqrIcons'
import { useSelector } from 'react-redux'
import type { RootState } from '../../states'
import { db } from '../../utils/dexieDB'
import { Link } from 'react-router-dom'

interface NavItem {
  label: string
  icon: React.ReactNode
  path?: string
  active?: boolean
}

// ── Logout Confirm Modal ──────────────────────────────────────────────────────
interface LogoutModalProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  userName?: string
}

const LogoutModal: React.FC<LogoutModalProps> = ({ open, onConfirm, onCancel, userName }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        className={styles.logoutOverlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onCancel}
      >
        <motion.div
          className={styles.logoutModal}
          initial={{ opacity: 0, scale: 0.88, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 24 }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Decorative top band */}
          <div className={styles.logoutBand} />

          {/* Icon */}
          <div className={styles.logoutIconWrap}>
            <div className={styles.logoutIconRing}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9"
                  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                />
                <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12H9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Copy */}
          <h3 className={styles.logoutTitle}>Log out?</h3>
          <p className={styles.logoutSub}>
            {userName
              ? <>Hey <strong>{userName}</strong>, are you sure you want to end your session?</>
              : <>Are you sure you want to end your current session?</>
            }
            <br />
            <span className={styles.logoutSubMuted}>You'll need to sign in again to continue.</span>
          </p>

          {/* Actions */}
          <div className={styles.logoutActions}>
            <button className={styles.logoutCancel} onClick={onCancel}>
              Stay
            </button>
            <button className={styles.logoutConfirm} onClick={onConfirm}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 17L21 12L16 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 12H9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Yes, Log out
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
)

// ── Collapsible Group ─────────────────────────────────────────────────────────
interface CollapseGroupProps {
  label: string
  icon: React.ReactNode
  items: NavItem[]
  defaultOpen?: boolean
  activePath?: string
}

const CollapseGroup: React.FC<CollapseGroupProps> = ({ label, icon, items, defaultOpen = false, activePath }) => {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={styles.collapseGroup}>
      <div className={styles.collapseHeader} onClick={() => setOpen(v => !v)}>
        <div style={{ textTransform: 'uppercase', color: '#213F7D', fontWeight: 500 }}>{label}</div>
        <IconChevron className={`${styles.chevron} ${open ? styles.open : ''}`} />
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className={styles.collapseItems}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {items.map((item) => (
              <Link
                key={item.label}
                to={item.path || '#'}
                className={`${styles.singleLink} ${activePath === item.path ? styles.active : ''}`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Layout ───────────────────────────────────────────────────────────────
interface AdminLayoutProps {
  children: React.ReactNode
  activePath?: string
}

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  activePath = '/admin/users',
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)

  const avatarRef = React.useRef<HTMLDivElement>(null)
  const mobileSearchRef = React.useRef<HTMLDivElement>(null)
  const mobileSearchInputRef = React.useRef<HTMLInputElement>(null)
  const currentUser = useSelector((state: RootState) => state.adminUser.currentUser)

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false)
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(e.target as Node)) setMobileSearchOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    localStorage.removeItem('auth_token');
    await db.cached_data.delete(`admin_user_details`);
    window.location.href = '/'
  }

  const customerItems: NavItem[] = [
    { label: 'Users', icon: <IconUsers />, path: '/admin/customers/users' },
    { label: 'Guarantors', icon: <IconGuarantors />, path: '/admin/customers/guarantors' },
    { label: 'Loans', icon: <IconLoans />, path: '/admin/customers/loans' },
    { label: 'Decision Models', icon: <IconDecision />, path: '/admin/customers/decision-models' },
    { label: 'Savings', icon: <IconSavings />, path: '/admin/customers/savings' },
    { label: 'Loan Requests', icon: <IconLoanReq />, path: '/admin/customers/loan-requests' },
    { label: 'Whitelist', icon: <IconWhitelist />, path: '/admin/customers/whitelist' },
    { label: 'Karma', icon: <IconKarma />, path: '/admin/customers/karma' },
  ]

  const businessItems: NavItem[] = [
    { label: 'Organization', icon: <IconOrg />, path: '/admin/business/organization' },
    { label: 'Loan Products', icon: <IconLoanProd />, path: '/admin/business/loan-products' },
    { label: 'Savings Products', icon: <IconSavProd />, path: '/admin/business/savings-products' },
    { label: 'Fees and Charges', icon: <IconFees />, path: '/admin/business/fees' },
    { label: 'Transactions', icon: <IconTx />, path: '/admin/business/transactions' },
    { label: 'Services', icon: <IconServices />, path: '/admin/business/services' },
    { label: 'Service Account', icon: <IconServiceAcc />, path: '/admin/business/service-account' },
    { label: 'Settlements', icon: <IconSettlements />, path: '/admin/business/settlements' },
    { label: 'Reports', icon: <IconReports />, path: '/admin/business/reports' },
  ]

  const settingsItems: NavItem[] = [
    { label: 'Preferences', icon: <IconPreferences />, path: '/admin/settings/preferences' },
    { label: 'Fees and Pricing', icon: <IconFeesPricing />, path: '/admin/settings/fees-pricing' },
    { label: 'Audit Logs', icon: <IconAudit />, path: '/admin/settings/audit-logs' },
  ]

  return (
    <div className={styles.adminLayout}>
      {/* Navbar */}
      <nav className={styles.navbar}>

        {/* Desktop logo */}
        <Link to="/admin" className={styles.navLogo}>
          <img src="/logo.png" alt="Lendsqr" />
        </Link>

        {/* Mobile: avatar on the left */}
        <div className={styles.mobileAvatarWrap} ref={avatarRef}>
          <img
            src={currentUser?.image}
            alt={currentUser?.firstName}
            className={styles.mobileAvatar}
            onClick={() => setAvatarOpen(v => !v)}
          />
          <AnimatePresence>
            {avatarOpen && (
              <motion.div
                className={styles.avatarDropdown}
                initial={{ opacity: 0, scale: 0.95, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                <div className={styles.avatarDropdownHeader}>
                  <img src={currentUser?.image} alt={currentUser?.firstName} className={styles.avatarDropdownImg} />
                  <div>
                    <div className={styles.avatarDropdownName}>
                      {currentUser?.firstName} {currentUser?.lastName}
                    </div>
                    <div className={styles.avatarDropdownRole}>Admin</div>
                  </div>
                </div>
                <div className={styles.avatarDropdownDivider} />
                <a href="/admin/settings" className={styles.avatarDropdownItem}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Account Settings
                </a>
                <a href="/docs" className={styles.avatarDropdownItem}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    <path d="M14 2v6h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Docs
                </a>
                <div className={styles.avatarDropdownDivider} />
                {/* Logout from avatar dropdown also triggers modal */}
                <button className={styles.avatarDropdownLogout} onClick={() => { setAvatarOpen(false); setLogoutOpen(true) }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <img src="/logo.png" style={{ width: 100 }} alt="Lendsqr" />
        </div>

        {/* Desktop search */}
        <div className={styles.navSearch}>
          <input type="text" placeholder="Search for anything" />
          <button className={styles.searchBtn}>
            <svg viewBox="0 0 24 24"><path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" /></svg>
          </button>
        </div>

        {/* Desktop right */}
        <div className={styles.navRight}>
          <span className={styles.docsLink}>Docs</span>
          <button className={styles.notifBtn}><IconBell /></button>
          <div className={styles.userMenu}>
            <img src={currentUser?.image} alt={currentUser?.firstName} className={styles.avatar} />
            <span className={styles.userName}>{currentUser?.firstName}</span>
            <IconChevronTwo />
          </div>
        </div>

        {/* Mobile right */}
        <div className={styles.mobileNavRight}>
          <div className={styles.mobileSearchWrap} ref={mobileSearchRef}>
            <button
              className={styles.mobileSearchBtn}
              onClick={() => {
                setMobileSearchOpen(v => !v)
                setTimeout(() => mobileSearchInputRef.current?.focus(), 120)
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <AnimatePresence>
              {mobileSearchOpen && (
                <motion.div
                  className={styles.mobileSearchOverlay}
                  initial={{ opacity: 0, scaleX: 0.6, x: 40 }}
                  animate={{ opacity: 1, scaleX: 1, x: 0 }}
                  exit={{ opacity: 0, scaleX: 0.6, x: 40 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  style={{ originX: 1 }}
                >
                  <input
                    ref={mobileSearchInputRef}
                    type="text"
                    placeholder="Search for anything…"
                    className={styles.mobileSearchInput}
                  />
                  <button className={styles.mobileSearchSubmit} onClick={() => setMobileSearchOpen(false)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2" />
                      <path d="M21 21l-4.35-4.35" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <span className={styles.notifBtn}><IconBell /></span>
          <button className={styles.menuToggle} onClick={() => setSidebarOpen(v => !v)}>
            {sidebarOpen ? <IconX /> : <IconMenu />}
          </button>
        </div>

        <button className={styles.menuToggleDesktop} onClick={() => setSidebarOpen(v => !v)}>
          {sidebarOpen ? <IconX /> : <IconMenu />}
        </button>
      </nav>

      <div className={styles.adminBody}>
        {/* Overlay */}
        <div
          className={`${styles.overlay} ${sidebarOpen ? styles.visible : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Sidebar */}
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
          <div className={styles.sidebarNav}>
            <div className={styles.switchOrg}>
              <IconSwitch />
              Switch Organization
              <IconChevron />
            </div>

            <a href="/admin" className={`${styles.singleLink} ${activePath === '/admin' ? styles.active : ''}`}>
              <IconDashboard />
              Dashboard
            </a>

            <div className={styles.divider} />

            <CollapseGroup
              label="Customers"
              icon={<IconUsers />}
              items={customerItems}
              defaultOpen={customerItems.some(i => i.path === activePath)}
              activePath={activePath}
            />

            <div className={styles.divider} />

            <CollapseGroup
              label="Businesses"
              icon={<IconOrg />}
              items={businessItems}
              defaultOpen={businessItems.some(i => i.path === activePath)}
              activePath={activePath}
            />

            <div className={styles.divider} />

            <CollapseGroup
              label="Settings"
              icon={<IconPreferences />}
              items={settingsItems}
              defaultOpen={settingsItems.some(i => i.path === activePath)}
              activePath={activePath}
            />

            {/* Logout */}
            <div className={styles.sidebarFooter}>
              <button className={styles.logoutBtn} onClick={() => setLogoutOpen(true)}>
                <Logout />
                Logout
              </button>
              <span className={styles.versionTag}>v1.2.0</span>
            </div>
          </div>
        </aside>

        {/* Page content */}
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>

      {/* Logout confirmation modal */}
      <LogoutModal
        open={logoutOpen}
        onConfirm={handleLogout}
        onCancel={() => setLogoutOpen(false)}
        userName={currentUser?.firstName}
      />
    </div>
  )
}

export default AdminLayout