/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styles from '../../../../styles/admin/userDetailsPage.module.scss'
import { makeRequest } from '../../../../utils/fetcher'
import { GET_USER_API, USER_TOKEN } from '../../../../apis'
import AdminLayout from '../../../../component/admin/adminLayout'
import { IconArrowLeft, UserIcon } from '../../../../component/admin/LendsqrIcons'

// ── Types ──────────────────────────────────────────────────────────────────────
interface Guarantor {
  fullName: string
  phoneNumber: string
  email: string
  relationship: string
}

interface UserDetail {
  id: string
  userName: string
  accountNumber: string
  tier: number
  balance: string
  status: 'Active' | 'Inactive' | 'Pending' | 'Blacklisted'
  organization: string
  bank: {
    accountNumber: string
    bankName: string
  }
  personalInfo: {
    fullName: string
    phoneNumber: string
    email: string
    bvn: string
    gender: string
    maritalStatus: string
    children: string
    typeOfResidence: string
  }
  educationAndEmployment: {
    levelOfEducation: string
    employmentStatus: string
    sectorOfEmployment: string
    durationOfEmployment: string
    officeEmail: string
    monthlyIncome: { min: string; max: string }
    loanRepayment: string
  }
  socials: {
    twitter: string
    facebook: string
    instagram: string
  }
  guarantors: Guarantor[]
}

type TabId = 'general' | 'documents' | 'bank' | 'loans' | 'savings' | 'app'
type ErrorType = 'offline' | 'server' | null

const TABS: { id: TabId; label: string }[] = [
  { id: 'general', label: 'General Details' },
  { id: 'documents', label: 'Documents' },
  { id: 'bank', label: 'Bank Details' },
  { id: 'loans', label: 'Loans' },
  { id: 'savings', label: 'Savings' },
  { id: 'app', label: 'App and System' },
]

// ── Icons ──────────────────────────────────────────────────────────────────────
const StarFilled = () => (
  <svg viewBox="0 0 24 24" fill="#E9B200" stroke="#E9B200" strokeWidth="1">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

const StarEmpty = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#E9B200" strokeWidth="1.5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

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

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Sk = ({ w, h = 14 }: { w: number | string; h?: number }) => (
  <div className={styles.shimmer} style={{ width: w, height: h, borderRadius: 4 }} />
)

const UserDetailsSkeleton = () => (
  <>
    <div className={styles.skeletonProfileCard}>
      <div className={styles.skeletonProfileTop}>
        <div className={styles.shimmer} style={{ width: 72, height: 72, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Sk w={160} h={22} />
          <Sk w={100} h={14} />
        </div>
        <div style={{ width: 1, height: 60, background: 'rgba(33,63,125,0.1)', margin: '0 8px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Sk w={70} h={12} />
          <div style={{ display: 'flex', gap: 4 }}>
            <Sk w={16} h={16} /><Sk w={16} h={16} /><Sk w={16} h={16} />
          </div>
        </div>
        <div style={{ width: 1, height: 60, background: 'rgba(33,63,125,0.1)', margin: '0 8px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Sk w={140} h={22} />
          <Sk w={160} h={12} />
        </div>
      </div>
      <div className={styles.skeletonTabs}>
        {[120, 90, 100, 60, 80, 120].map((w, i) => (
          <div key={i} className={styles.skeletonTab}>
            <Sk w={w} h={13} />
          </div>
        ))}
      </div>
    </div>

    <div className={styles.skeletonDetailsCard}>
      {[
        { title: 160, cols: 5, fields: [100, 110, 130, 90, 80, 110, 70, 130] },
        { title: 200, cols: 4, fields: [120, 130, 140, 100, 140, 130, 120] },
        { title: 80, cols: 3, fields: [100, 110, 110] },
        { title: 100, cols: 4, fields: [130, 110, 150, 110, 130, 110, 150, 110] },
      ].map((section, si) => (
        <div key={si} className={styles.skeletonSection}>
          <div className={styles.skeletonSectionTitle}>
            <Sk w={section.title} h={16} />
          </div>
          <div
            className={styles.skeletonGrid}
            style={{ gridTemplateColumns: `repeat(${section.cols}, 1fr)` }}
          >
            {section.fields.map((w, fi) => (
              <div key={fi} className={styles.skeletonField}>
                <Sk w={70} h={10} />
                <Sk w={w} h={16} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </>
)

// ── Error State ────────────────────────────────────────────────────────────────
const ErrorState = ({
  type,
  onRetry,
  retrying,
}: {
  type: ErrorType
  onRetry: () => void
  retrying: boolean
}) => {
  const isOffline = type === 'offline'

  return (
    <motion.div
      className={styles.errorState}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`${styles.errorIcon} ${isOffline ? styles.offline : styles.server}`}>
        {isOffline ? <OfflineIcon /> : <ServerErrorIcon />}
      </div>

      <p className={styles.errorTitle}>
        {isOffline ? 'No Internet Connection' : 'Something Went Wrong'}
      </p>

      <p className={styles.errorMessage}>
        {isOffline
          ? "You appear to be offline. Please check your internet connection and try again."
          : "We couldn't load this user's details. This may be a temporary issue on our end."}
      </p>

      <button
        className={styles.retryBtn}
        onClick={onRetry}
        disabled={retrying}
      >
        {retrying ? 'Retrying…' : 'Try Again'}
      </button>
    </motion.div>
  )
}

// ── Info field ─────────────────────────────────────────────────────────────────
const InfoField = ({ label, value }: { label: string; value: string }) => (
  <div className={styles.infoField}>
    <span className={styles.fieldLabel}>{label}</span>
    <span className={styles.fieldValue}>{value || '—'}</span>
  </div>
)

// ── Stars ─────────────────────────────────────────────────────────────────────
const Stars = ({ count, max = 3 }: { count: number; max?: number }) => (
  <div className={styles.stars}>
    {Array.from({ length: max }).map((_, i) =>
      i < count ? <StarFilled key={i} /> : <StarEmpty key={i} />
    )}
  </div>
)

// ── Empty tab placeholder ──────────────────────────────────────────────────────
const EmptyTab = ({ label }: { label: string }) => (
  <div style={{ padding: '40px 0', textAlign: 'center', color: '#545f7d', fontSize: 14 }}>
    {label} — coming soon
  </div>
)

// ── Main Component ─────────────────────────────────────────────────────────────
const UserDetailsPage: React.FC = () => {
  const userId = window.location.pathname.split('/').filter(Boolean).pop() ?? ''

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserDetail | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('general')
  const [actionLoading, setActionLoading] = useState(false)
  const [errorType, setErrorType] = useState<ErrorType>(null)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchUser = useCallback(async () => {
    setLoading(true)
    setErrorType(null)

    // Check offline before even making the request
    if (!navigator.onLine) {
      setErrorType('offline')
      setLoading(false)
      return
    }

    const { res, error } = await makeRequest(
      'POST',
      GET_USER_API,
      { id: userId },
      () => setLoading(false),
      USER_TOKEN, null, 'json'
    )

    if (res?.data) {
      setUser(res.data)
      setErrorType(null)
    } else {
      // Distinguish offline vs server error
      if (!navigator.onLine || error?.toLowerCase().includes('offline') || error?.toLowerCase().includes('network')) {
        setErrorType('offline')
      } else {
        setErrorType('server')
      }
    }
    setLoading(false)
  }, [userId])

  const errorTypeRef = React.useRef(errorType)
  useEffect(() => { errorTypeRef.current = errorType }, [errorType])

  useEffect(() => {
    fetchUser()
    const handleOnline = () => {
      if (errorTypeRef.current === 'offline') fetchUser()
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [fetchUser])

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleAction = async (action: 'blacklist' | 'activate') => {
    if (!user) return
    setActionLoading(true)
    const endpoint = action === 'blacklist' ? 'BLACKLIST_USER' : 'ACTIVATE_USER'
    await makeRequest('PATCH', endpoint, { userId: user.id }, () => { }, USER_TOKEN, null, 'json')
    setActionLoading(false)
    fetchUser()
  }

  // ── Render tabs ────────────────────────────────────────────────────────────
  const renderTabContent = () => {
    if (!user) return null
    const { personalInfo: p, educationAndEmployment: e, socials: s, guarantors } = user

    switch (activeTab) {
      case 'general':
        return (
          <>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Personal Information</h3>
              <div className={`${styles.infoGrid}`}>
                <InfoField label="Full Name" value={p.fullName} />
                <InfoField label="Phone Number" value={p.phoneNumber} />
                <InfoField label="Email Address" value={p.email} />
                <InfoField label="BVN" value={p.bvn} />
                <InfoField label="Gender" value={p.gender} />
                <InfoField label="Marital Status" value={p.maritalStatus} />
                <InfoField label="Children" value={p.children} />
                <InfoField label="Type of Residence" value={p.typeOfResidence} />
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Education and Employment</h3>
              <div className={`${styles.infoGrid} ${styles.cols4}`}>
                <InfoField label="Level of Education" value={e.levelOfEducation} />
                <InfoField label="Employment Status" value={e.employmentStatus} />
                <InfoField label="Sector of Employment" value={e.sectorOfEmployment} />
                <InfoField label="Duration of Employment" value={e.durationOfEmployment} />
                <InfoField label="Office Email" value={e.officeEmail} />
                <InfoField
                  label="Monthly Income"
                  value={`₦${Number(e.monthlyIncome.min).toLocaleString()}- ₦${Number(e.monthlyIncome.max).toLocaleString()}`}
                />
                <InfoField label="Loan Repayment" value={Number(e.loanRepayment).toLocaleString()} />
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Socials</h3>
              <div className={`${styles.infoGrid} ${styles.cols3}`}>
                <InfoField label="Twitter" value={s.twitter} />
                <InfoField label="Facebook" value={s.facebook} />
                <InfoField label="Instagram" value={s.instagram} />
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Guarantor</h3>
              {guarantors.map((g, i) => (
                <div key={i} className={styles.guarantorBlock}>
                  <div className={`${styles.infoGrid} ${styles.cols4}`}>
                    <InfoField label="Full Name" value={g.fullName} />
                    <InfoField label="Phone Number" value={g.phoneNumber} />
                    <InfoField label="Email Address" value={g.email} />
                    <InfoField label="Relationship" value={g.relationship} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )
      case 'documents': return <EmptyTab label="Documents" />
      case 'bank': return <EmptyTab label="Bank Details" />
      case 'loans': return <EmptyTab label="Loans" />
      case 'savings': return <EmptyTab label="Savings" />
      case 'app': return <EmptyTab label="App and System" />
      default: return null
    }
  }

  return (
    <AdminLayout activePath="/admin/customers/users">
      <div className={styles.userDetailsPage}>

        {/* Back */}
        <a className={styles.backLink} onClick={() => window.history.back()}>
          <IconArrowLeft />
          Back to Users
        </a>

        {/* Page header */}
        <div className={styles.pageHeader}>
          <h1>User Details</h1>
          {!loading && user && !errorType && (
            <div className={styles.headerActions}>
              <button
                className={styles.blacklistBtn}
                onClick={() => handleAction('blacklist')}
                disabled={actionLoading}
              >
                Blacklist User
              </button>
              <button
                className={styles.activateBtn}
                onClick={() => handleAction('activate')}
                disabled={actionLoading}
              >
                Activate User
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <UserDetailsSkeleton />
        ) : errorType ? (
          <ErrorState
            type={errorType}
            onRetry={fetchUser}
            retrying={loading}
          />
        ) : !user ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#545f7d', fontSize: 15 }}>
            User not found.
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {/* Profile card */}
            <div className={styles.profileCard}>
              <div className={styles.profileTop}>
                <div className={styles.profileIdentity}>
                  <div className={styles.avatarCircle}>
                    <UserIcon />
                  </div>
                  <div className={styles.profileName}>
                    <h2>{user.userName}</h2>
                    <span className={styles.accountNum}>{user.accountNumber}</span>
                  </div>
                </div>

                <div className={styles.profileTier}>
                  <span className={styles.tierLabel}>User's Tier</span>
                  <Stars count={user.tier} />
                </div>

                <div className={styles.profileBalance}>
                  <span className={styles.balanceAmount}>
                    ₦{Number(user.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </span>
                  <span className={styles.bankInfo}>
                    {user.bank.accountNumber}/{user.bank.bankName}
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <div className={styles.tabs}>
                {TABS.map(tab => (
                  <div
                    key={tab.id}
                    className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Details card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                className={styles.detailsCard}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </AdminLayout>
  )
}

export default UserDetailsPage