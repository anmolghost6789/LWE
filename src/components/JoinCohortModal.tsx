import { AnimatePresence, motion } from 'motion/react'
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { useAuth } from '../context/AuthContext'
import { promptGoogleSignIn } from '../lib/googleAuth'
import { cx } from '../lib/cx'

const plans = [
  {
    key: 'bootcamp_full' as const,
    name: 'Bootcamp · Pay in Full',
    price: '₹9,999',
    unit: 'one-off upfront',
    badge: 'Save ₹2,000 (Recommended)',
  },
  {
    key: 'bootcamp_instalment' as const,
    name: 'Bootcamp · 3 Instalments',
    price: '₹3,999',
    unit: 'per month',
    badge: 'Student Friendly',
  },
  {
    key: 'team' as const,
    name: 'Team · 5 Cohort Seats',
    price: '₹39,999',
    unit: 'for 5 seats',
    badge: '₹8,000 / seat',
  },
]

export function JoinCohortModal() {
  const { isJoinCohortOpen, closeJoinCohort, selectedPlan, enrolStudent, signInWithGoogle, openDashboard } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [password, setPassword] = useState('')
  const [workflowGoal, setWorkflowGoal] = useState('')
  const [plan, setPlan] = useState<'bootcamp_full' | 'bootcamp_instalment' | 'recordings' | 'team'>(selectedPlan || 'bootcamp_full')
  const [paymentReference, setPaymentReference] = useState('')
  const [agreed, setAgreed] = useState(true)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle')
  const [enrolmentId, setEnrolmentId] = useState('')

  if (!isJoinCohortOpen) return null

  const validate = () => {
    const errs: Record<string, string> = {}
    setServerError('')

    if (!name.trim() || name.trim().length < 2) {
      errs.name = 'Please enter your full name (minimum 2 characters).'
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid work or academic email address.'
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      errs.phone = 'Please enter a valid 10-digit phone number.'
    }
    if (!company.trim()) {
      errs.company = 'Please enter your company, college or organization name.'
    }
    if (!password || password.length < 8) {
      errs.password = 'Please create a secure password (minimum 8 characters).'
    }
    if (!workflowGoal.trim() || workflowGoal.trim().length < 5) {
      errs.workflowGoal = 'Please specify what workflow or use-case you want to build.'
    }
    if (!agreed) {
      errs.agreed = 'You must agree to cohort terms to complete enrolment.'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setStatus('submitting')
    setServerError('')

    const result = await enrolStudent({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      company: company.trim(),
      password,
      plan,
      workflowGoal: workflowGoal.trim(),
      paymentReference: paymentReference.trim(),
      paymentMethod: 'upi',
    })

    if (result.ok && result.enrolment) {
      setEnrolmentId(result.enrolment.id)
      setStatus('success')
    } else {
      setStatus('idle')
      setServerError(result.error || 'Failed to process enrolment. Please try again.')
    }
  }

  const handleGoogleEnrol = async () => {
    setStatus('submitting')
    setServerError('')

    try {
      const googleResult = await promptGoogleSignIn()
      const result = await signInWithGoogle({
        credential: googleResult.credential,
        access_token: googleResult.access_token,
        email: googleResult.email,
        name: googleResult.name,
        phone: phone.trim(),
        company: company.trim(),
        plan,
        workflowGoal: workflowGoal || 'Custom GenAI Workflow Development',
      })

      if (result.ok && result.enrolment) {
        setEnrolmentId(result.enrolment.id)
        setName(result.enrolment.name)
        setEmail(result.enrolment.email)
        setStatus('success')
      } else {
        setStatus('idle')
        setServerError(result.error || 'Failed to complete enrolment with Google account.')
      }
    } catch (err: unknown) {
      setStatus('idle')
      const msg = err instanceof Error ? err.message : 'Google authorization popup closed or failed.'
      setServerError(msg)
    }
  }

  const selectedPlanDetails = plans.find((p) => p.key === plan) || plans[0]

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeJoinCohort}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        <motion.div
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="depth relative z-10 my-8 w-full max-w-[620px] overflow-hidden rounded-card bg-surface p-6 sm:p-9 shadow-glow border border-line"
        >
          {/* Ambient ember wash */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 -z-10 size-80 rounded-full bg-[radial-gradient(circle,rgb(255_122_69/0.18),transparent_70%)] blur-2xl"
          />

          <button
            type="button"
            onClick={closeJoinCohort}
            className="absolute right-5 top-5 grid size-9 place-items-center rounded-[12px] text-muted hover:bg-white/[0.08] hover:text-fg transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>

          {status === 'success' ? (
            <div className="py-6 text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent-2/15 text-accent-2 shadow-[0_0_30px_rgba(255,184,0,0.3)]">
                <CheckCircle2 className="size-9" />
              </div>
              <h3 className="mt-5 text-[24px] font-semibold tracking-tight text-fg">
                Payment Details Submitted!
              </h3>
              <p className="mt-2 text-[15px] text-muted max-w-md mx-auto">
                Thank you, <strong className="text-fg">{name}</strong>. Your enrolment in{' '}
                <strong className="text-fg">{selectedPlanDetails.name}</strong> has been received.
              </p>

              {/* Status banner */}
              <div className="mt-5 rounded-card-sm bg-accent-2/10 border border-accent-2/30 p-4 max-w-md mx-auto text-left">
                <div className="flex items-center gap-2 text-accent-2 font-semibold text-[13px]">
                  <span className="size-2 rounded-full bg-accent-2 animate-ping" />
                  Status: Pending Admin Verification
                </div>
                <p className="mt-1 text-[12.5px] text-muted leading-relaxed">
                  Your submitted Transaction ID / UTR is being verified by the admin in the backend. Full access to the student dashboard and live session room will be unlocked upon approval.
                </p>
                <div className="mt-3 pt-3 border-t border-accent-2/20 flex flex-wrap items-center justify-between gap-2 text-[12px]">
                  <span className="text-muted">Enrolment ID: <strong className="font-mono text-fg">{enrolmentId}</strong></span>
                  {paymentReference && (
                    <span className="text-muted">Transaction ID: <strong className="font-mono text-accent-2">{paymentReference}</strong></span>
                  )}
                </div>
              </div>

              {/* WhatsApp Quick Verification Link */}
              <div className="mt-4 p-3 rounded-[12px] bg-emerald-500/10 border border-emerald-500/25 max-w-md mx-auto flex items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-full bg-emerald-500/20 grid place-items-center text-emerald-400 shrink-0">
                    <MessageCircle className="size-4" />
                  </div>
                  <div>
                    <p className="text-[12.5px] font-semibold text-fg">WhatsApp Support</p>
                    <p className="text-[11px] text-muted">Send screenshot for instant approval</p>
                  </div>
                </div>
                <a
                  href={`https://wa.me/917488659839?text=${encodeURIComponent(
                    `Hi, I have submitted my payment for GenAI Bootcamp. Enrolment ID: ${enrolmentId}, Name: ${name}, UTR: ${paymentReference}. Please verify my payment.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-[8px] bg-emerald-500 hover:bg-emerald-400 text-bg px-3 py-1.5 text-[11.5px] font-semibold transition-colors cursor-pointer shrink-0"
                >
                  Send on WhatsApp
                </a>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    closeJoinCohort()
                    openDashboard()
                  }}
                  className="flex items-center justify-center gap-2 rounded-[12px] bg-fg px-6 py-3.5 text-[14px] font-semibold text-bg hover:bg-white transition-all cursor-pointer shadow-[0_4px_16px_rgba(255,255,255,0.2)]"
                >
                  <Sparkles className="size-4" /> Open Student Portal
                </button>
                <button
                  type="button"
                  onClick={closeJoinCohort}
                  className="rounded-[12px] bg-surface-2 px-5 py-3.5 text-[14px] font-medium text-muted hover:text-fg transition-colors cursor-pointer"
                >
                  Done & Back to Site
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 rounded-[8px] bg-accent/15 px-2.5 py-1 text-[12px] font-medium text-accent border border-accent/25 mb-2">
                  <Calendar className="size-3.5" />
                  Cohort 7 · Starts 17 November (6 Seats Max)
                </div>
                <h3 className="text-[24px] font-semibold tracking-tight text-fg">
                  Enrol in the GenAI Bootcamp
                </h3>
                <p className="mt-1 text-[14px] text-muted">
                  Lock in your live building seat. Six weeks of hands-on deployment with an engineer.
                </p>
              </div>

              {serverError && (
                <div className="mb-5 flex items-start gap-3 rounded-[12px] bg-accent-3/15 border border-accent-3/30 p-3.5 text-[13px] text-accent-3">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{serverError}</span>
                </div>
              )}

              {/* 1-Click Fast Enrolment with Google */}
              <button
                type="button"
                onClick={handleGoogleEnrol}
                disabled={status === 'submitting'}
                className="flex h-12 w-full items-center justify-center gap-3 rounded-[12px] bg-white text-gray-900 font-semibold text-[14.5px] shadow-[0_4px_16px_rgba(255,255,255,0.18)] hover:bg-gray-100 active:scale-[0.99] transition-all cursor-pointer mb-5 disabled:opacity-60"
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
                <span>Continue & Enrol with Google</span>
              </button>

              <div className="relative mb-5 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-line" />
                </div>
                <span className="relative bg-surface px-3 text-[12px] text-faint uppercase tracking-wider">
                  Or enter your details manually
                </span>
              </div>

              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
                {/* Plan Selector */}
                <div>
                  <label className="block text-[13px] font-medium text-fg/90 mb-2">
                    Select Enrolment Plan <span className="text-accent">*</span>
                  </label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {plans.map((p) => {
                      const isSelected = plan === p.key
                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => setPlan(p.key)}
                          className={cx(
                            'flex flex-col rounded-card-sm p-3.5 text-left transition-all cursor-pointer',
                            isSelected
                              ? 'border border-accent bg-accent/10 shadow-[0_0_16px_rgba(255,122,69,0.15)]'
                              : 'border border-line bg-surface-2/60 hover:border-line-strong',
                          )}
                        >
                          <span className={cx('text-[13px] font-semibold', isSelected ? 'text-accent' : 'text-fg')}>
                            {p.name.split('·')[1]}
                          </span>
                          <span className="text-[17px] font-semibold text-fg mt-1">
                            {p.price} <span className="text-[11px] font-normal text-muted">{p.unit}</span>
                          </span>
                          <span className="mt-1.5 text-[10.5px] text-muted font-medium">{p.badge}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Payment Verification & UTR Submission Box */}
                <div className="rounded-[12px] bg-surface-2/80 border border-accent/25 p-4 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent">
                      <CreditCard className="size-4" /> Payment Verification
                    </span>
                    <span className="text-[12px] text-muted">Amount: <strong className="text-fg">{selectedPlanDetails.price}</strong></span>
                  </div>

                  <p className="text-[12.5px] text-muted leading-relaxed">
                    Enter your Transaction ID or UTR Number below to unlock your student dashboard & live session room.
                  </p>

                  {/* Payment Reference Input */}
                  <div className="mt-3">
                    <label htmlFor="enrol-utr" className="block text-[12.5px] font-medium text-fg/90 mb-1">
                      Transaction ID / UTR Number:
                    </label>
                    <input
                      id="enrol-utr"
                      type="text"
                      placeholder="Enter 12-digit UPI UTR or Transaction ID (e.g. 430128912345)"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="depth w-full rounded-[10px] bg-surface px-3.5 py-2.5 text-[13px] text-fg placeholder:text-muted/50 border border-line focus:border-accent focus:outline-none font-mono"
                    />
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted">
                      <span>Admin verifies this reference to activate your dashboard.</span>
                      <a
                        href={`https://wa.me/917488659839?text=${encodeURIComponent(
                          'Hi LearnWithExpert team, I need assistance with payment and UTR verification for Cohort 7.'
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                      >
                        <MessageCircle className="size-3" /> WhatsApp Support
                      </a>
                    </div>
                  </div>
                </div>

                {/* Name & Email */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="enrol-name" className="block text-[13px] font-medium text-fg/90">
                      Your Full Name <span className="text-accent">*</span>
                    </label>
                    <div className="relative mt-2">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted/70" />
                      <input
                        id="enrol-name"
                        type="text"
                        placeholder="Rohan Sharma"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value)
                          if (errors.name) setErrors((prev) => ({ ...prev, name: '' }))
                        }}
                        className={cx(
                          'depth w-full rounded-[12px] bg-surface-2/70 px-4 py-3 pl-10 text-[14px] text-fg placeholder:text-muted/50 transition-colors focus:outline-none',
                          errors.name ? 'border border-accent-3 focus:ring-1 focus:ring-accent-3' : 'focus:ring-1 focus:ring-accent',
                        )}
                      />
                    </div>
                    {errors.name && <p className="mt-1 text-[12px] text-accent-3">{errors.name}</p>}
                  </div>

                  <div>
                    <label htmlFor="enrol-email" className="block text-[13px] font-medium text-fg/90">
                      Email Address <span className="text-accent">*</span>
                    </label>
                    <div className="relative mt-2">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted/70" />
                      <input
                        id="enrol-email"
                        type="email"
                        placeholder="rohan@techcorp.in"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          if (errors.email) setErrors((prev) => ({ ...prev, email: '' }))
                        }}
                        className={cx(
                          'depth w-full rounded-[12px] bg-surface-2/70 px-4 py-3 pl-10 text-[14px] text-fg placeholder:text-muted/50 transition-colors focus:outline-none',
                          errors.email ? 'border border-accent-3 focus:ring-1 focus:ring-accent-3' : 'focus:ring-1 focus:ring-accent',
                        )}
                      />
                    </div>
                    {errors.email && <p className="mt-1 text-[12px] text-accent-3">{errors.email}</p>}
                  </div>
                </div>

                {/* Phone & Company */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="enrol-phone" className="block text-[13px] font-medium text-fg/90">
                      Phone Number (IN +91) <span className="text-accent">*</span>
                    </label>
                    <div className="relative mt-2">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted/70" />
                      <input
                        id="enrol-phone"
                        type="tel"
                        placeholder="98765 43210"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value)
                          if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }))
                        }}
                        className={cx(
                          'depth w-full rounded-[12px] bg-surface-2/70 px-4 py-3 pl-10 text-[14px] text-fg placeholder:text-muted/50 transition-colors focus:outline-none',
                          errors.phone ? 'border border-accent-3 focus:ring-1 focus:ring-accent-3' : 'focus:ring-1 focus:ring-accent',
                        )}
                      />
                    </div>
                    {errors.phone && <p className="mt-1 text-[12px] text-accent-3">{errors.phone}</p>}
                  </div>

                  <div>
                    <label htmlFor="enrol-company" className="block text-[13px] font-medium text-fg/90">
                      Company / Organization / College <span className="text-accent">*</span>
                    </label>
                    <div className="relative mt-2">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted/70" />
                      <input
                        id="enrol-company"
                        type="text"
                        placeholder="Razorpay / IIT / Self"
                        value={company}
                        onChange={(e) => {
                          setCompany(e.target.value)
                          if (errors.company) setErrors((prev) => ({ ...prev, company: '' }))
                        }}
                        className={cx(
                          'depth w-full rounded-[12px] bg-surface-2/70 px-4 py-3 pl-10 text-[14px] text-fg placeholder:text-muted/50 transition-colors focus:outline-none',
                          errors.company ? 'border border-accent-3 focus:ring-1 focus:ring-accent-3' : 'focus:ring-1 focus:ring-accent',
                        )}
                      />
                    </div>
                    {errors.company && <p className="mt-1 text-[12px] text-accent-3">{errors.company}</p>}
                  </div>
                </div>

                {/* What workflow/system do you want to build? */}
                <div>
                  <label htmlFor="enrol-workflow" className="block text-[13px] font-medium text-fg/90">
                    What GenAI workflow or project do you want to build? <span className="text-accent">*</span>
                  </label>
                  <textarea
                    id="enrol-workflow"
                    rows={2}
                    placeholder="e.g. Automated PDF invoice parsing with Claude, or LLM-powered internal code reviewer..."
                    value={workflowGoal}
                    onChange={(e) => {
                      setWorkflowGoal(e.target.value)
                      if (errors.workflowGoal) setErrors((prev) => ({ ...prev, workflowGoal: '' }))
                    }}
                    className={cx(
                      'depth w-full rounded-[12px] bg-surface-2/70 p-3 text-[14px] text-fg placeholder:text-muted/50 transition-colors focus:outline-none resize-none mt-2',
                      errors.workflowGoal ? 'border border-accent-3 focus:ring-1 focus:ring-accent-3' : 'focus:ring-1 focus:ring-accent',
                    )}
                  />
                  {errors.workflowGoal && <p className="mt-1 text-[12px] text-accent-3">{errors.workflowGoal}</p>}
                </div>

                {/* Password to create student portal login */}
                <div>
                  <label htmlFor="enrol-password" className="block text-[13px] font-medium text-fg/90">
                    Create Portal Password <span className="text-accent">*</span>
                  </label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted/70" />
                    <input
                      id="enrol-password"
                      type="password"
                      placeholder="Minimum 8 characters"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (errors.password) setErrors((prev) => ({ ...prev, password: '' }))
                      }}
                      className={cx(
                        'depth w-full rounded-[12px] bg-surface-2/70 px-4 py-3 pl-10 text-[14px] text-fg placeholder:text-muted/50 transition-colors focus:outline-none',
                        errors.password ? 'border border-accent-3 focus:ring-1 focus:ring-accent-3' : 'focus:ring-1 focus:ring-accent',
                      )}
                    />
                  </div>
                  {errors.password && <p className="mt-1 text-[12px] text-accent-3">{errors.password}</p>}
                </div>

                {/* Guarantee & Terms Agreement */}
                <div className="pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer text-[12.5px] text-muted">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-0.5 size-4 rounded-[4px] border-line bg-surface-2 accent-accent text-accent focus:ring-0"
                    />
                    <span>
                      I understand seats are capped at 6. Backed by our{' '}
                      <strong className="text-fg">100% money-back refund guarantee</strong> after session two if not satisfied.
                    </span>
                  </label>
                  {errors.agreed && <p className="mt-1 text-[12px] text-accent-3">{errors.agreed}</p>}
                </div>

                {/* Submit Enrolment */}
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-fg px-6 text-[15px] font-semibold text-bg transition-all hover:bg-white active:scale-[0.99] disabled:opacity-60 cursor-pointer shadow-[0_4px_20px_rgba(255,255,255,0.25)]"
                >
                  {status === 'submitting' ? (
                    <span className="flex items-center gap-2">
                      <span className="size-4 animate-spin rounded-full border-2 border-bg border-t-transparent" />
                      Submitting Registration...
                    </span>
                  ) : (
                    <>
                      <span>Confirm Enrolment & Submit Details</span>
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-5 flex items-center justify-center gap-2 text-center text-[12px] text-muted/80 border-t border-line pt-3">
                <ShieldCheck className="size-4 text-accent shrink-0" />
                <span>Zero Risk: Manual verification by admin. Full refund up to session two.</span>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

