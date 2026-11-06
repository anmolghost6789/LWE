import { AnimatePresence, motion } from 'motion/react'
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
  X,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'

import { useAuth } from '../context/AuthContext'
import { useAuth0Bridge } from '../context/Auth0Bridge'
import { cx } from '../lib/cx'

export interface AuthModalProps {
  isOpen: boolean
  initialMode?: 'signin' | 'register'
  onClose: () => void
}

export function AuthModal({ isOpen, initialMode = 'signin', onClose }: AuthModalProps) {
  const { login, register, openDashboard, openAdminPortal, signInWithGoogle } = useAuth()
  const { isConfigured: isAuth0Ready, loginWithGoogle: auth0LoginWithGoogle } = useAuth0Bridge()
  const [mode, setMode] = useState<'signin' | 'register'>(initialMode)
  const [showPassword, setShowPassword] = useState(false)

  // Sign In Form State
  const [signInEmail, setSignInEmail] = useState('')
  const [signInPassword, setSignInPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)

  // Register Form State
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regCompany, setRegCompany] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regTerms, setRegTerms] = useState(true)

  // Validation & Submission State
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle')
  const [serverError, setServerError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Sync mode when initialMode changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode)
      setErrors({})
      setServerError('')
      setStatus('idle')
      setShowPassword(false)
    }
  }, [isOpen, initialMode])

  // Prevent background scrolling and support Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const validate = () => {
    const errs: Record<string, string> = {}
    setServerError('')

    if (mode === 'signin') {
      if (!signInEmail.trim()) {
        errs.signInEmail = 'Email address is required.'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signInEmail.trim())) {
        errs.signInEmail = 'Please enter a valid email address.'
      }

      if (!signInPassword) {
        errs.signInPassword = 'Password is required.'
      }
    } else {
      if (!regName.trim() || regName.trim().length < 2) {
        errs.regName = 'Please enter your full name (minimum 2 characters).'
      }

      if (!regEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
        errs.regEmail = 'Please enter a valid email address.'
      }

      if (!regPhone.trim() || regPhone.replace(/\D/g, '').length < 10) {
        errs.regPhone = 'Please enter a valid 10-digit phone number.'
      }

      if (!regCompany.trim()) {
        errs.regCompany = 'Please enter your organization, company or college.'
      }

      if (!regPassword || regPassword.length < 8) {
        errs.regPassword = 'Password must be at least 8 characters long.'
      }

      if (!regTerms) {
        errs.regTerms = 'You must agree to the Terms of Service to continue.'
      }
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setStatus('submitting')
    setServerError('')

    if (mode === 'signin') {
      const result = await login(signInEmail.trim().toLowerCase(), signInPassword, rememberMe)
      if (result.ok) {
        setStatus('success')
        setSuccessMessage(`Signed in as ${signInEmail}.`)
        setTimeout(() => {
          onClose()
          setStatus('idle')
          if (result.isAdmin) {
            openAdminPortal()
          } else {
            openDashboard()
          }
        }, 1000)
      } else {
        setStatus('idle')
        setServerError(result.error || 'Failed to sign in. Please verify your credentials.')
      }
    } else {
      const result = await register(
        regName.trim(),
        regEmail.trim().toLowerCase(),
        regPassword,
        regPhone.trim(),
        regCompany.trim(),
      )
      if (result.ok) {
        setStatus('success')
        setSuccessMessage(`Account created for ${regName}! Enrolled in Cohort 7.`)
        setTimeout(() => {
          onClose()
          setStatus('idle')
          openDashboard()
        }, 1000)
      } else {
        setStatus('idle')
        setServerError(result.error || 'Failed to complete registration.')
      }
    }
  }

  const handleGoogleAuth = async () => {
    setStatus('submitting')
    setServerError('')

    if (!isAuth0Ready) {
      setStatus('idle')
      setServerError(
        'Google Sign-In requires your Auth0 credentials. Please add VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID to your .env file, or use the email & password form below to sign in or register securely.',
      )
      return
    }

    try {
      const auth0User = await auth0LoginWithGoogle()
      if (!auth0User || !auth0User.email) {
        setStatus('idle')
        setServerError('Google authorization was cancelled or failed to return your verified email.')
        return
      }

      const result = await signInWithGoogle({
        name: auth0User.name || auth0User.nickname || 'Student',
        email: auth0User.email,
        phone: regPhone.trim(),
        company: regCompany.trim(),
        plan: 'bootcamp_full',
        workflowGoal: 'Custom GenAI Workflow Development',
      })

      if (result.ok) {
        setStatus('success')
        setSuccessMessage(`Signed in as ${auth0User.email} via Google.`)
        setTimeout(() => {
          onClose()
          setStatus('idle')
          if (result.isAdmin) {
            openAdminPortal()
          } else {
            openDashboard()
          }
        }, 1000)
      } else {
        setStatus('idle')
        setServerError(result.error || 'Failed to authenticate Google account.')
      }
    } catch (err: unknown) {
      setStatus('idle')
      const msg = err instanceof Error ? err.message : 'Google authorization popup closed or failed.'
      setServerError(msg)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            aria-hidden
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={mode === 'signin' ? 'Sign in to your account' : 'Create an account'}
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="depth relative z-10 my-8 w-full max-w-[480px] overflow-hidden rounded-card bg-surface p-6 sm:p-9 shadow-glow border border-line"
          >
            {/* Ambient ember glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-20 -z-10 size-72 rounded-full bg-[radial-gradient(circle,rgb(255_122_69/0.16),transparent_70%)] blur-2xl"
            />

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="absolute right-5 top-5 grid size-9 place-items-center rounded-[12px] text-muted transition-colors hover:bg-white/[0.08] hover:text-fg focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
            >
              <X className="size-4" />
            </button>

            {/* Mode Switcher Tabs */}
            <div className="flex rounded-control bg-surface-2/80 p-1 border border-line mb-6 max-w-[280px]">
              <button
                type="button"
                onClick={() => {
                  setMode('signin')
                  setErrors({})
                  setServerError('')
                }}
                className={cx(
                  'relative flex-1 py-1.5 text-[13.5px] font-medium transition-colors text-center rounded-[10px] cursor-pointer',
                  mode === 'signin' ? 'text-fg font-semibold' : 'text-muted hover:text-fg',
                )}
              >
                {mode === 'signin' && (
                  <motion.div
                    layoutId="auth-tab-pill"
                    className="absolute inset-0 rounded-[10px] bg-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-line-strong"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('register')
                  setErrors({})
                  setServerError('')
                }}
                className={cx(
                  'relative flex-1 py-1.5 text-[13.5px] font-medium transition-colors text-center rounded-[10px] cursor-pointer',
                  mode === 'register' ? 'text-fg font-semibold' : 'text-muted hover:text-fg',
                )}
              >
                {mode === 'register' && (
                  <motion.div
                    layoutId="auth-tab-pill"
                    className="absolute inset-0 rounded-[10px] bg-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.3)] border border-line-strong"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">Register</span>
              </button>
            </div>

            {/* Header Content */}
            <div className="mb-6">
              <h3 className="text-[22px] font-semibold tracking-tight text-fg">
                {mode === 'signin' ? 'Sign In to Account' : 'Create Student Account'}
              </h3>
              <p className="mt-1 text-[14px] text-muted">
                {mode === 'signin'
                  ? 'Access your cohort schedule, learning resources, and projects.'
                  : 'Register your real student profile to enrol in Cohort 7.'}
              </p>
            </div>

            {/* Server Error Alert Banner */}
            {serverError && (
              <div className="mb-5 flex items-start gap-3 rounded-[12px] bg-accent-3/15 border border-accent-3/30 p-3.5 text-[13px] text-accent-3">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Google Authentication Button */}
            {status !== 'success' && (
              <div className="mb-5">
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={status === 'submitting'}
                  className="flex h-12 w-full items-center justify-center gap-3 rounded-[12px] bg-white text-gray-900 font-semibold text-[14.5px] shadow-[0_4px_16px_rgba(255,255,255,0.18)] hover:bg-gray-100 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
                >
                  <svg className="size-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{mode === 'signin' ? 'Continue with Google' : 'Sign up with Google'}</span>
                </button>

                <div className="relative mt-5 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-line" />
                  </div>
                  <span className="relative bg-surface px-3 text-[12px] text-faint uppercase tracking-wider">
                    Or continue with email
                  </span>
                </div>
              </div>
            )}

            {/* Success state */}
            {status === 'success' ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-10 text-center"
              >
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-accent/15 text-accent shadow-[0_0_24px_rgba(255,122,69,0.25)]">
                  <CheckCircle2 className="size-7" />
                </div>
                <h4 className="mt-4 text-[18px] font-semibold text-fg">
                  {mode === 'signin' ? 'Signed in successfully!' : 'Registration complete!'}
                </h4>
                <p className="mt-1 text-[14px] text-muted">{successMessage}</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                {/* Full Name (Register only) */}
                {mode === 'register' && (
                  <div>
                    <label htmlFor="auth-name" className="block text-[13px] font-medium text-fg/90">
                      Full Name <span className="text-accent">*</span>
                    </label>
                    <div className="relative mt-1.5">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted/70" />
                      <input
                        id="auth-name"
                        type="text"
                        placeholder="Rohan Sharma"
                        value={regName}
                        onChange={(e) => {
                          setRegName(e.target.value)
                          if (errors.regName) setErrors((prev) => ({ ...prev, regName: '' }))
                        }}
                        className={cx(
                          'depth w-full rounded-[12px] bg-surface-2/70 px-4 py-2.5 pl-10 text-[14px] text-fg placeholder:text-muted/50 transition-colors focus:outline-none',
                          errors.regName
                            ? 'border border-accent-3 focus:ring-1 focus:ring-accent-3'
                            : 'focus:ring-1 focus:ring-accent',
                        )}
                      />
                    </div>
                    {errors.regName && <p className="mt-1 text-[12px] text-accent-3">{errors.regName}</p>}
                  </div>
                )}

                {/* Email Address */}
                <div>
                  <label
                    htmlFor={mode === 'signin' ? 'signin-email' : 'reg-email'}
                    className="block text-[13px] font-medium text-fg/90"
                  >
                    Email Address <span className="text-accent">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted/70" />
                    <input
                      id={mode === 'signin' ? 'signin-email' : 'reg-email'}
                      type="email"
                      placeholder="you@domain.com"
                      value={mode === 'signin' ? signInEmail : regEmail}
                      onChange={(e) => {
                        if (mode === 'signin') {
                          setSignInEmail(e.target.value)
                          if (errors.signInEmail) setErrors((prev) => ({ ...prev, signInEmail: '' }))
                        } else {
                          setRegEmail(e.target.value)
                          if (errors.regEmail) setErrors((prev) => ({ ...prev, regEmail: '' }))
                        }
                      }}
                      className={cx(
                        'depth w-full rounded-[12px] bg-surface-2/70 px-4 py-2.5 pl-10 text-[14px] text-fg placeholder:text-muted/50 transition-colors focus:outline-none',
                        (mode === 'signin' ? errors.signInEmail : errors.regEmail)
                          ? 'border border-accent-3 focus:ring-1 focus:ring-accent-3'
                          : 'focus:ring-1 focus:ring-accent',
                      )}
                    />
                  </div>
                  {(mode === 'signin' ? errors.signInEmail : errors.regEmail) && (
                    <p className="mt-1 text-[12px] text-accent-3">
                      {mode === 'signin' ? errors.signInEmail : errors.regEmail}
                    </p>
                  )}
                </div>

                {/* Phone & Company (Register only) */}
                {mode === 'register' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="reg-phone" className="block text-[13px] font-medium text-fg/90">
                        Phone (IN +91) <span className="text-accent">*</span>
                      </label>
                      <div className="relative mt-1.5">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted/70" />
                        <input
                          id="reg-phone"
                          type="tel"
                          placeholder="98765 43210"
                          value={regPhone}
                          onChange={(e) => {
                            setRegPhone(e.target.value)
                            if (errors.regPhone) setErrors((prev) => ({ ...prev, regPhone: '' }))
                          }}
                          className={cx(
                            'depth w-full rounded-[12px] bg-surface-2/70 px-4 py-2.5 pl-10 text-[14px] text-fg placeholder:text-muted/50 transition-colors focus:outline-none',
                            errors.regPhone
                              ? 'border border-accent-3 focus:ring-1 focus:ring-accent-3'
                              : 'focus:ring-1 focus:ring-accent',
                          )}
                        />
                      </div>
                      {errors.regPhone && <p className="mt-1 text-[12px] text-accent-3">{errors.regPhone}</p>}
                    </div>

                    <div>
                      <label htmlFor="reg-company" className="block text-[13px] font-medium text-fg/90">
                        Organization / College <span className="text-accent">*</span>
                      </label>
                      <div className="relative mt-1.5">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted/70" />
                        <input
                          id="reg-company"
                          type="text"
                          placeholder="Infosys / IIT"
                          value={regCompany}
                          onChange={(e) => {
                            setRegCompany(e.target.value)
                            if (errors.regCompany) setErrors((prev) => ({ ...prev, regCompany: '' }))
                          }}
                          className={cx(
                            'depth w-full rounded-[12px] bg-surface-2/70 px-4 py-2.5 pl-10 text-[14px] text-fg placeholder:text-muted/50 transition-colors focus:outline-none',
                            errors.regCompany
                              ? 'border border-accent-3 focus:ring-1 focus:ring-accent-3'
                              : 'focus:ring-1 focus:ring-accent',
                          )}
                        />
                      </div>
                      {errors.regCompany && <p className="mt-1 text-[12px] text-accent-3">{errors.regCompany}</p>}
                    </div>
                  </div>
                )}

                {/* Password Field */}
                <div>
                  <label
                    htmlFor={mode === 'signin' ? 'signin-password' : 'reg-password'}
                    className="block text-[13px] font-medium text-fg/90"
                  >
                    Password <span className="text-accent">*</span>
                  </label>
                  <div className="relative mt-1.5">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted/70" />
                    <input
                      id={mode === 'signin' ? 'signin-password' : 'reg-password'}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimum 8 characters"
                      value={mode === 'signin' ? signInPassword : regPassword}
                      onChange={(e) => {
                        if (mode === 'signin') {
                          setSignInPassword(e.target.value)
                          if (errors.signInPassword) setErrors((prev) => ({ ...prev, signInPassword: '' }))
                        } else {
                          setRegPassword(e.target.value)
                          if (errors.regPassword) setErrors((prev) => ({ ...prev, regPassword: '' }))
                        }
                      }}
                      className={cx(
                        'depth w-full rounded-[12px] bg-surface-2/70 px-4 py-2.5 pl-10 pr-10 text-[14px] text-fg placeholder:text-muted/50 transition-colors focus:outline-none',
                        (mode === 'signin' ? errors.signInPassword : errors.regPassword)
                          ? 'border border-accent-3 focus:ring-1 focus:ring-accent-3'
                          : 'focus:ring-1 focus:ring-accent',
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted/70 hover:text-fg transition-colors cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {(mode === 'signin' ? errors.signInPassword : errors.regPassword) && (
                    <p className="mt-1 text-[12px] text-accent-3">
                      {mode === 'signin' ? errors.signInPassword : errors.regPassword}
                    </p>
                  )}
                </div>

                {/* Sign In Options: Remember Me & Forgot Password */}
                {mode === 'signin' ? (
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-[13px] text-muted hover:text-fg">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="size-4 rounded-[4px] border-line bg-surface-2 accent-accent text-accent focus:ring-0"
                      />
                      Remember this device
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        alert(`Password reset link sent to ${signInEmail || 'your email'}.`)
                      }}
                      className="text-[13px] text-accent hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                ) : (
                  <div className="pt-1">
                    <label className="flex items-start gap-2.5 cursor-pointer text-[12.5px] text-muted">
                      <input
                        type="checkbox"
                        checked={regTerms}
                        onChange={(e) => {
                          setRegTerms(e.target.checked)
                          if (errors.regTerms) setErrors((prev) => ({ ...prev, regTerms: '' }))
                        }}
                        className="mt-0.5 size-4 rounded-[4px] border-line bg-surface-2 accent-accent text-accent focus:ring-0"
                      />
                      <span>
                        I agree to the Terms of Service & Privacy Policy.
                      </span>
                    </label>
                    {errors.regTerms && <p className="mt-1 text-[12px] text-accent-3">{errors.regTerms}</p>}
                  </div>
                )}

                {/* Primary Submit Button */}
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-fg px-6 text-[15px] font-semibold text-bg transition-all hover:bg-white active:scale-[0.99] disabled:opacity-60 cursor-pointer shadow-[0_4px_16px_rgba(255,255,255,0.25)]"
                >
                  {status === 'submitting' ? (
                    <span className="flex items-center gap-2">
                      <span className="size-4 animate-spin rounded-full border-2 border-bg border-t-transparent" />
                      {mode === 'signin' ? 'Authenticating...' : 'Creating Account...'}
                    </span>
                  ) : (
                    <>
                      <span>{mode === 'signin' ? 'Sign In' : 'Create Account & Enrol'}</span>
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Footer Switcher */}
            <div className="mt-5 text-center text-[13px] text-muted">
              {mode === 'signin' ? (
                <>
                  New to the bootcamp?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register')
                      setErrors({})
                      setServerError('')
                    }}
                    className="font-medium text-accent hover:underline cursor-pointer"
                  >
                    Register here
                  </button>
                </>
              ) : (
                <>
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin')
                      setErrors({})
                      setServerError('')
                    }}
                    className="font-medium text-accent hover:underline cursor-pointer"
                  >
                    Sign in here
                  </button>
                </>
              )}
            </div>

            <div className="mt-6 flex items-center justify-center gap-2 text-center text-[12px] text-muted/80 border-t border-line pt-3">
              <ShieldCheck className="size-4 text-accent shrink-0" />
              <span>SSL Encrypted. Direct access to expert code reviews.</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
