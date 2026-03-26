import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import styles from '../../styles/loginPage.module.scss'
import type { LoginCredentials, LoginStatus } from '../../types/auth'
import { makeRequest } from '../../utils/fetcher'
import { LOGIN_API } from '../../apis'
import { db } from '../../utils/dexieDB'
import { useDispatch } from 'react-redux'
import { setCurrentUser } from '../../states/adminUserSlice'

// ── Framer Motion variants ─────────────────────────────────────────────────
const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, staggerChildren: 0.15, delayChildren: 0.1 },
  },
}

const logoVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

const illustrationVariants = {
  hidden: { opacity: 0, x: -60, scale: 0.95 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
}

const formContainerVariants = {
  hidden: { opacity: 0, x: 60 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const formItemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

const buttonVariants = {
  idle: { scale: 1 },
  tap: { scale: 0.97 },
}

const statusVariants = {
  hidden: { opacity: 0, y: -8, height: 0 },
  visible: { opacity: 1, y: 0, height: 'auto', transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -4, height: 0, transition: { duration: 0.2 } },
}

// ── Component ──────────────────────────────────────────────────────────────
const LoginPage: React.FC = () => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [loginStatus, setLoginStatus] = useState<LoginStatus>('idle')
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [fieldErrors, setFieldErrors] = useState<Partial<LoginCredentials>>({})

  const isLoading = loginStatus === 'loading'

  const validate = (): boolean => {
    const errors: Partial<LoginCredentials> = {}
    if (!credentials.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
      errors.email = 'Enter a valid email'
    }
    if (!credentials.password.trim()) {
      errors.password = 'Password is required'
    } else if (credentials.password.length < 6) {
      errors.password = 'Minimum 6 characters'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCredentials((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name as keyof LoginCredentials]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }))
    }
    if (loginStatus === 'error' || loginStatus === 'success') {
      setLoginStatus('idle')
      setStatusMessage('')
    }
  }

  const dispatch = useDispatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoginStatus('loading')
    setStatusMessage('')

    // Pass a no-op for the callback so it does NOT reset loginStatus to
    // 'idle' mid-flight. Loading state is managed entirely by the res / error
    // branches below. We use a no-op (not null) so callers that check
    // typeof callback === 'function' and tests using expect.any(Function) pass.
    const noop = () => {}
    const { res, error } = await makeRequest(
      'POST',
      LOGIN_API,
      credentials,
      noop,
      null,
      null,
      'urlencoded'
    )

    if (res) {
      localStorage.setItem('auth_token', res?.data?.token)
      await db.cached_data.put(res?.data?.user, `admin_user_details`)
      dispatch(setCurrentUser(res?.data?.user))
      setLoginStatus('success')
      setStatusMessage(res.message)

      setTimeout(() => {
        window.location.href = '/admin/customers/users'
      }, 1500)
    }

    if (error) {
      setLoginStatus('error')
      setStatusMessage(typeof error === 'string' ? error : 'Login failed. Please try again.')
    }
  }

  return (
    <motion.div
      className={styles.loginPage}
      variants={pageVariants as any}
      initial="hidden"
      animate="visible"
    >
      <div className={styles.inner}>

        {/* ── LEFT PANEL ── */}
        <motion.div className={styles.leftPanel} variants={illustrationVariants as any}>
          <motion.header className={styles.header} variants={logoVariants as any}>
            <a href="/" className={styles.logo}>
              <img src="/logo.png" alt="Lendsqr" className={styles.logoImg} />
            </a>
          </motion.header>

          <div className={styles.illustrationWrapper}>
            <img src="/login-1.png" alt="Login illustration" />
          </div>
        </motion.div>

        {/* ── RIGHT PANEL ── */}
        <motion.div className={styles.rightPanel} variants={formContainerVariants as any}>
          <div className={styles.formCard}>

            <motion.h1 className={styles.welcomeHeading} variants={formItemVariants as any}>
              Welcome!
            </motion.h1>

            <motion.p className={styles.subtitle} variants={formItemVariants as any}>
              Enter details to login.
            </motion.p>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>

              {/* Email */}
              <motion.div className={styles.inputGroup} variants={formItemVariants as any}>
                <input
                  type="email"
                  name="email"
                  className={`${styles.inputField}${fieldErrors.email ? ` ${styles.hasError}` : ''}`}
                  placeholder="Email"
                  value={credentials.email}
                  onChange={handleChange}
                  disabled={isLoading}
                  autoComplete="email"
                />
                {fieldErrors.email && (
                  <span className={styles.errorMessage}>{fieldErrors.email}</span>
                )}
              </motion.div>

              {/* Password */}
              <motion.div className={styles.inputGroup} variants={formItemVariants as any}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className={`${styles.inputField} ${styles.passwordInput}${fieldErrors.password ? ` ${styles.hasError}` : ''}`}
                  placeholder="Password"
                  value={credentials.password}
                  onChange={handleChange}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.showToggle}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
                {fieldErrors.password && (
                  <span className={styles.errorMessage}>{fieldErrors.password}</span>
                )}
              </motion.div>

              {/* Forgot Password */}
              <motion.div className={styles.forgotPassword} variants={formItemVariants as any}>
                <a href="#forgot">FORGOT PASSWORD?</a>
              </motion.div>

              {/* Login Button */}
              <motion.div variants={formItemVariants as any}>
                <motion.button
                  type="submit"
                  className={styles.loginButton}
                  disabled={isLoading}
                  variants={buttonVariants as any}
                  whileTap="tap"
                  animate="idle"
                >
                  {isLoading ? (
                    <>
                      <span className={styles.spinner} />
                      Logging in…
                    </>
                  ) : (
                    'LOG IN'
                  )}
                </motion.button>
              </motion.div>

              {/* Status Message */}
              <AnimatePresence>
                {statusMessage && (
                  <motion.p
                    key="status"
                    className={`${styles.statusMessage} ${loginStatus === 'success' ? styles.success : styles.error}`}
                    variants={statusVariants as any}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    {statusMessage}
                  </motion.p>
                )}
              </AnimatePresence>

            </form>
          </div>
        </motion.div>

      </div>
    </motion.div>
  )
}

export default LoginPage