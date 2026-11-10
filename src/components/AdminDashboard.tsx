import { AnimatePresence, motion } from 'motion/react'
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Filter,
  Lock,
  LogOut,
  Mail,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { useAuth } from '../context/AuthContext'
import { cx } from '../lib/cx'

interface AdminEnrolment {
  id: string
  userId: string
  name: string
  email: string
  phone: string
  countryCode: string
  company: string
  cohort: string
  plan: 'bootcamp_full' | 'bootcamp_instalment' | 'recordings' | 'team'
  planLabel: string
  amount: number
  status: 'approved' | 'pending' | 'rejected' | 'confirmed' | 'waitlist'
  workflowGoal: string
  paymentMethod?: string
  paymentReference?: string
  rejectionReason?: string
  verifiedAt?: string
  verifiedBy?: string
  enrolledAt: string
}

interface AdminStats {
  totalEnrolled: number
  totalEnrolments?: number
  confirmedCount: number
  approvedCount?: number
  pendingCount?: number
  rejectedCount?: number
  seatsRemaining: number
  maxCohortSeats: number
  totalRevenue: number
}

export function AdminDashboard() {
  const { isAdminPortalOpen, closeAdminPortal, token, user, login, logout } = useAuth()

  // Admin login states (if not logged in as admin yet)
  const [adminEmail, setAdminEmail] = useState('admin@learnwithexpert.com')
  const [adminPassword, setAdminPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // Admin data states
  const [enrolments, setEnrolments] = useState<AdminEnrolment[]>([])
  const [stats, setStats] = useState<AdminStats>({
    totalEnrolled: 0,
    confirmedCount: 0,
    approvedCount: 0,
    pendingCount: 0,
    rejectedCount: 0,
    seatsRemaining: 6,
    maxCohortSeats: 6,
    totalRevenue: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  // Rejection modal state
  const [rejectingStudent, setRejectingStudent] = useState<AdminEnrolment | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isSubmittingReject, setIsSubmittingReject] = useState(false)
  const [copiedUtrId, setCopiedUtrId] = useState<string | null>(null)

  const isAdmin = user?.role === 'admin'

  const fetchAdminData = async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/enrolments', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = (await res.json()) as { ok: boolean; enrolments?: AdminEnrolment[]; stats?: AdminStats }
      if (data.ok && data.enrolments && data.stats) {
        setEnrolments(data.enrolments)
        setStats(data.stats)
      }
    } catch (err) {
      console.error('Failed to fetch admin data', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isAdminPortalOpen && isAdmin && token) {
      fetchAdminData()
    }
  }, [isAdminPortalOpen, isAdmin, token])

  if (!isAdminPortalOpen) return null

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setIsLoggingIn(true)

    const result = await login(adminEmail, adminPassword)
    setIsLoggingIn(false)

    if (result.ok && result.isAdmin) {
      // Admin authenticated successfully
    } else {
      setLoginError(result.error || 'Invalid administrator credentials.')
    }
  }

  const updateStatus = async (id: string, newStatus: 'approved' | 'pending' | 'rejected' | 'confirmed', reason?: string) => {
    try {
      const res = await fetch(`/api/admin/enrolments/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
          rejectionReason: reason,
        }),
      })
      if (res.ok) {
        fetchAdminData()
      }
    } catch (err) {
      console.error('Failed to update status', err)
    }
  }

  const handleApprove = (student: AdminEnrolment) => {
    updateStatus(student.id, 'approved')
  }

  const openRejectDialog = (student: AdminEnrolment) => {
    setRejectingStudent(student)
    setRejectionReason('Payment reference / UTR not found in bank statement.')
  }

  const submitRejection = async () => {
    if (!rejectingStudent) return
    setIsSubmittingReject(true)
    await updateStatus(rejectingStudent.id, 'rejected', rejectionReason)
    setIsSubmittingReject(false)
    setRejectingStudent(null)
  }

  const handleCopyUtr = (id: string, utr: string) => {
    navigator.clipboard?.writeText(utr)
    setCopiedUtrId(id)
    setTimeout(() => setCopiedUtrId(null), 2500)
  }

  const deleteEnrolment = async (id: string, studentName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${studentName}'s enrolment?`)) return

    try {
      const res = await fetch(`/api/admin/enrolments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        fetchAdminData()
      }
    } catch (err) {
      console.error('Failed to delete enrolment', err)
    }
  }

  const exportCSV = () => {
    if (enrolments.length === 0) {
      alert('No enrolments to export.')
      return
    }

    const headers = ['Enrolment ID,Name,Email,Phone,Company,Plan,Amount (INR),Payment Ref,Status,Rejection Reason,Date']
    const rows = enrolments.map((e) =>
      `"${e.id}","${e.name}","${e.email}","${e.phone}","${e.company}","${e.planLabel}","${e.amount}","${e.paymentReference || ''}","${e.status}","${(e.rejectionReason || '').replace(/"/g, '""')}","${new Date(e.enrolledAt).toLocaleString('en-IN')}"`,
    )
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `cohort7_enrolments_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredEnrolments = enrolments.filter((e) => {
    const query = searchQuery.toLowerCase()
    const matchesSearch =
      e.name.toLowerCase().includes(query) ||
      e.email.toLowerCase().includes(query) ||
      e.phone.includes(query) ||
      e.company.toLowerCase().includes(query) ||
      (e.paymentReference && e.paymentReference.toLowerCase().includes(query)) ||
      e.id.toLowerCase().includes(query)

    if (statusFilter === 'all') return matchesSearch
    if (statusFilter === 'approved') return matchesSearch && (e.status === 'approved' || e.status === 'confirmed')
    if (statusFilter === 'pending') return matchesSearch && e.status === 'pending'
    if (statusFilter === 'rejected') return matchesSearch && e.status === 'rejected'
    return matchesSearch
  })

  const pendingCount = enrolments.filter((e) => e.status === 'pending').length
  const approvedCount = enrolments.filter((e) => e.status === 'approved' || e.status === 'confirmed').length
  const rejectedCount = enrolments.filter((e) => e.status === 'rejected').length

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAdminPortal}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal / Portal Container */}
        <motion.div
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0, scale: 0.96, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="depth relative z-10 my-6 w-full max-w-[1080px] overflow-hidden rounded-card bg-surface p-5 sm:p-8 shadow-glow border border-line max-h-[92vh] flex flex-col"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-[12px] bg-accent/15 text-accent border border-accent/30">
                <Shield className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[19px] font-semibold tracking-tight text-fg">Admin Control Center</h3>
                  <span className="rounded-[6px] bg-accent/20 px-2 py-0.5 text-[11px] font-semibold text-accent">
                    Staff Portal
                  </span>
                </div>
                <p className="text-[12.5px] text-muted">
                  Cohort 7 Enrolment Roster, Student Verification & Capacity Management
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeAdminPortal}
                className="grid size-9 place-items-center rounded-[10px] text-muted hover:bg-white/[0.08] hover:text-fg transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* If NOT authenticated as Admin: Show Admin Login */}
          {!isAdmin ? (
            <div className="my-auto py-12 max-w-[420px] mx-auto w-full">
              <div className="text-center mb-6">
                <div className="mx-auto flex size-13 items-center justify-center rounded-full bg-accent/15 text-accent mb-3">
                  <Lock className="size-6" />
                </div>
                <h4 className="text-[20px] font-semibold text-fg">Administrator Sign In</h4>
                <p className="text-[13px] text-muted mt-1">
                  Access restricted to cohort directors and admissions staff.
                </p>
              </div>

              {loginError && (
                <div className="mb-4 flex items-center gap-2 rounded-[10px] bg-accent-3/15 p-3 text-[13px] text-accent-3 border border-accent-3/20">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-fg/90 mb-1">Admin Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted" />
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="depth w-full rounded-[12px] bg-surface-2 px-4 py-2.5 pl-10 text-[14px] text-fg focus:ring-1 focus:ring-accent focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-fg/90 mb-1">Admin Security Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted" />
                    <input
                      type="password"
                      required
                      placeholder="Admin@2026!Expert"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="depth w-full rounded-[12px] bg-surface-2 px-4 py-2.5 pl-10 text-[14px] text-fg focus:ring-1 focus:ring-accent focus:outline-none"
                    />
                  </div>
                </div>

                <div className="rounded-[10px] bg-surface-2/60 p-3 text-[11.5px] text-muted border border-line">
                  <span className="font-semibold text-fg">Admin Credentials:</span>
                  <br />
                  Email: <code className="text-accent">admin@learnwithexpert.com</code>
                  <br />
                  Password: <code className="text-accent">Admin@2026!Expert</code>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="flex h-11 items-center justify-center gap-2 rounded-[12px] bg-fg text-bg font-semibold text-[14px] hover:bg-white transition-all cursor-pointer"
                >
                  {isLoggingIn ? 'Authenticating...' : 'Access Admin Dashboard'}
                  <ArrowRight className="size-4" />
                </button>
              </form>
            </div>
          ) : (
            /* Admin Logged In: Full Roster & Management */
            <div className="flex-1 overflow-y-auto pt-5 flex flex-col gap-6">
              {/* Stat Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="rounded-[16px] bg-surface-2/70 p-4 border border-line">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-muted font-medium">Approved Students</span>
                    <UserCheck className="size-4 text-emerald-400" />
                  </div>
                  <p className="mt-2 text-[26px] font-semibold text-fg tracking-tight">
                    {approvedCount} <span className="text-[14px] font-normal text-muted">/ {stats.maxCohortSeats}</span>
                  </p>
                  <div className="mt-2 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (approvedCount / stats.maxCohortSeats) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-[16px] bg-amber-500/10 p-4 border border-amber-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-amber-300 font-medium">Pending Verification</span>
                    <Clock className="size-4 text-amber-400 animate-pulse" />
                  </div>
                  <p className="mt-2 text-[26px] font-semibold text-amber-300 tracking-tight">
                    {pendingCount}
                  </p>
                  <p className="text-[11px] text-amber-300/80 mt-1">Awaiting manual admin review</p>
                </div>

                <div className="rounded-[16px] bg-surface-2/70 p-4 border border-line">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-muted font-medium">Verified Revenue</span>
                    <TrendingUp className="size-4 text-accent" />
                  </div>
                  <p className="mt-2 text-[26px] font-semibold text-fg tracking-tight">
                    ₹{stats.totalRevenue.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[11px] text-muted mt-1">From approved students only</p>
                </div>

                <div className="rounded-[16px] bg-surface-2/70 p-4 border border-line">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-muted font-medium">Admin Actions</span>
                    <button
                      type="button"
                      onClick={fetchAdminData}
                      title="Refresh Roster"
                      className="cursor-pointer"
                    >
                      <RefreshCw
                        className={cx('size-4 text-muted hover:text-fg transition-transform', isLoading && 'animate-spin')}
                      />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={exportCSV}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[10px] bg-white/[0.08] hover:bg-white/[0.12] py-2 text-[12.5px] font-medium text-fg transition-colors cursor-pointer"
                  >
                    <Download className="size-3.5" /> Export Roster (CSV)
                  </button>
                </div>
              </div>

              {/* Roster Controls: Search & Filter */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-2/40 p-3 rounded-[14px] border border-line">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
                  <input
                    type="text"
                    placeholder="Search by student, email, UTR reference..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-[10px] bg-surface-2 px-3 py-1.5 pl-9 text-[13px] text-fg placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                  <span className="text-[12px] text-muted flex items-center gap-1 mr-1">
                    <Filter className="size-3.5" /> Filter:
                  </span>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={cx(
                      'rounded-[8px] px-2.5 py-1 text-[12px] font-medium transition-colors cursor-pointer',
                      statusFilter === 'all' ? 'bg-fg text-bg font-semibold' : 'bg-surface-2 text-muted hover:text-fg'
                    )}
                  >
                    All ({enrolments.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('pending')}
                    className={cx(
                      'rounded-[8px] px-2.5 py-1 text-[12px] font-medium transition-colors cursor-pointer flex items-center gap-1',
                      statusFilter === 'pending'
                        ? 'bg-amber-500 text-bg font-semibold'
                        : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30'
                    )}
                  >
                    <Clock className="size-3" /> Pending ({pendingCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('approved')}
                    className={cx(
                      'rounded-[8px] px-2.5 py-1 text-[12px] font-medium transition-colors cursor-pointer flex items-center gap-1',
                      statusFilter === 'approved'
                        ? 'bg-emerald-500 text-bg font-semibold'
                        : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30'
                    )}
                  >
                    <CheckCircle2 className="size-3" /> Approved ({approvedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('rejected')}
                    className={cx(
                      'rounded-[8px] px-2.5 py-1 text-[12px] font-medium transition-colors cursor-pointer flex items-center gap-1',
                      statusFilter === 'rejected'
                        ? 'bg-rose-500 text-bg font-semibold'
                        : 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30'
                    )}
                  >
                    <XCircle className="size-3" /> Rejected ({rejectedCount})
                  </button>
                </div>
              </div>

              {/* Students Enrolment Table */}
              <div className="rounded-[16px] border border-line overflow-hidden bg-surface-2/20">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead className="bg-surface-2/90 text-muted uppercase text-[11px] tracking-wider border-b border-line">
                      <tr>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">Plan & Amount</th>
                        <th className="py-3 px-4">Payment & UTR</th>
                        <th className="py-3 px-4">Approval Status</th>
                        <th className="py-3 px-4 text-right">Verification Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {filteredEnrolments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-muted">
                            <User className="size-8 mx-auto mb-2 opacity-40" />
                            {searchQuery ? 'No student matches your search query.' : 'No students found in this filter view.'}
                          </td>
                        </tr>
                      ) : (
                        filteredEnrolments.map((student) => {
                          const isStudentApproved = student.status === 'approved' || student.status === 'confirmed'
                          const isStudentRejected = student.status === 'rejected'
                          const isStudentPending = student.status === 'pending'

                          return (
                            <tr key={student.id} className="hover:bg-white/[0.02] transition-colors">
                              {/* Student Name */}
                              <td className="py-3 px-4">
                                <div className="font-semibold text-fg">{student.name}</div>
                                <div className="text-[11px] font-mono text-muted">{student.id}</div>
                                <div className="text-[11px] text-faint mt-0.5">{student.company || 'Independent'}</div>
                              </td>

                              {/* Contact */}
                              <td className="py-3 px-4">
                                <a href={`mailto:${student.email}`} className="text-fg hover:text-accent flex items-center gap-1.5">
                                  <Mail className="size-3 text-muted shrink-0" />
                                  <span className="truncate max-w-[140px]">{student.email}</span>
                                </a>
                                <a href={`tel:${student.phone}`} className="text-muted hover:text-fg text-[12px] flex items-center gap-1.5 mt-0.5">
                                  <Phone className="size-3 text-muted shrink-0" />
                                  {student.phone}
                                </a>
                              </td>

                              {/* Plan & Amount */}
                              <td className="py-3 px-4">
                                <span className="font-semibold text-fg">₹{student.amount.toLocaleString('en-IN')}</span>
                                <div className="text-[11px] text-muted">{student.planLabel}</div>
                              </td>

                              {/* Offline Payment & UTR */}
                              <td className="py-3 px-4">
                                {student.paymentReference ? (
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[12px] font-semibold text-accent-2 border border-line">
                                        {student.paymentReference}
                                      </code>
                                      <button
                                        type="button"
                                        onClick={() => handleCopyUtr(student.id, student.paymentReference || '')}
                                        className="size-6 grid place-items-center rounded bg-surface hover:bg-white/[0.1] text-muted hover:text-fg transition-colors cursor-pointer"
                                        title="Copy UTR / Reference"
                                      >
                                        {copiedUtrId === student.id ? (
                                          <Check className="size-3 text-emerald-400" />
                                        ) : (
                                          <Copy className="size-3" />
                                        )}
                                      </button>
                                    </div>
                                    <div className="text-[11px] text-muted mt-0.5">
                                      Method: <span className="capitalize">{student.paymentMethod?.replace('offline_', '') || 'offline'}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-[12px] text-muted italic">No UTR submitted</span>
                                )}
                              </td>

                              {/* Status */}
                              <td className="py-3 px-4">
                                {isStudentApproved && (
                                  <span className="inline-flex items-center gap-1 rounded-[6px] bg-emerald-500/15 px-2.5 py-1 text-[11.5px] font-semibold text-emerald-400 border border-emerald-500/30">
                                    <CheckCircle2 className="size-3" /> Approved & Active
                                  </span>
                                )}
                                {isStudentPending && (
                                  <span className="inline-flex items-center gap-1 rounded-[6px] bg-amber-500/15 px-2.5 py-1 text-[11.5px] font-semibold text-amber-300 border border-amber-500/30">
                                    <Clock className="size-3 animate-spin" /> Pending Verification
                                  </span>
                                )}
                                {isStudentRejected && (
                                  <div>
                                    <span className="inline-flex items-center gap-1 rounded-[6px] bg-rose-500/15 px-2.5 py-1 text-[11.5px] font-semibold text-rose-300 border border-rose-500/30">
                                      <XCircle className="size-3" /> Rejected
                                    </span>
                                    {student.rejectionReason && (
                                      <p className="mt-1 text-[11px] text-rose-300/80 max-w-[160px] truncate" title={student.rejectionReason}>
                                        {student.rejectionReason}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Action Buttons */}
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Approve Button */}
                                  {!isStudentApproved && (
                                    <button
                                      type="button"
                                      onClick={() => handleApprove(student)}
                                      className="inline-flex items-center gap-1 rounded-[8px] bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 text-[11.5px] font-semibold text-white transition-all cursor-pointer shadow-sm"
                                      title="Approve Payment & Unlock Access"
                                    >
                                      <Check className="size-3" /> Approve
                                    </button>
                                  )}

                                  {/* Reject Button */}
                                  {!isStudentRejected && (
                                    <button
                                      type="button"
                                      onClick={() => openRejectDialog(student)}
                                      className="inline-flex items-center gap-1 rounded-[8px] bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 px-2.5 py-1 text-[11.5px] font-semibold text-rose-300 transition-all cursor-pointer"
                                      title="Reject Payment & Lock Access"
                                    >
                                      <X className="size-3" /> Reject
                                    </button>
                                  )}

                                  {/* Reset to Pending Button (if already approved or rejected) */}
                                  {(isStudentApproved || isStudentRejected) && (
                                    <button
                                      type="button"
                                      onClick={() => updateStatus(student.id, 'pending')}
                                      className="size-7 grid place-items-center rounded-[8px] bg-surface hover:bg-white/[0.1] text-muted hover:text-fg border border-line transition-colors cursor-pointer"
                                      title="Reset to Pending"
                                    >
                                      <RotateCcw className="size-3" />
                                    </button>
                                  )}

                                  {/* Delete Button */}
                                  <button
                                    type="button"
                                    onClick={() => deleteEnrolment(student.id, student.name)}
                                    className="size-7 grid place-items-center rounded-[8px] text-muted hover:bg-accent-3/15 hover:text-accent-3 transition-colors cursor-pointer"
                                    title="Delete Enrolment Record"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rejection Modal Dialog */}
              <AnimatePresence>
                {rejectingStudent && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setRejectingStudent(null)}
                      className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="relative z-10 w-full max-w-[480px] rounded-card bg-surface p-6 shadow-glow border border-rose-500/30"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="size-10 rounded-full bg-rose-500/20 text-rose-400 grid place-items-center">
                          <ShieldAlert className="size-5" />
                        </div>
                        <div>
                          <h4 className="text-[17px] font-semibold text-fg">Reject Payment & Lock Access</h4>
                          <p className="text-[12px] text-muted">
                            For {rejectingStudent.name} ({rejectingStudent.id})
                          </p>
                        </div>
                      </div>

                      <div className="rounded-[10px] bg-surface-2 p-3 text-[12px] text-muted mb-4 border border-line">
                        <p>Plan: <strong className="text-fg">{rejectingStudent.planLabel}</strong> (₹{rejectingStudent.amount})</p>
                        <p className="mt-0.5">Submitted UTR: <strong className="font-mono text-accent-2">{rejectingStudent.paymentReference || 'None'}</strong></p>
                      </div>

                      <label className="block text-[12.5px] font-medium text-fg mb-1.5">
                        Select Preset Reason or Enter Feedback:
                      </label>
                      <div className="flex flex-col gap-1.5 mb-3">
                        {[
                          'Payment reference / UTR not found in bank statement.',
                          'Transferred amount does not match plan price.',
                          'Invalid or illegible payment reference.',
                          'Transaction reversed or cancelled.',
                        ].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setRejectionReason(preset)}
                            className={cx(
                              'text-left rounded-[8px] px-2.5 py-1.5 text-[12px] transition-colors cursor-pointer border',
                              rejectionReason === preset
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : 'bg-surface-2 text-muted hover:text-fg border-line'
                            )}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>

                      <textarea
                        rows={2}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Provide custom rejection reason..."
                        className="depth w-full rounded-[10px] bg-surface-2 p-3 text-[13px] text-fg placeholder:text-muted/50 border border-line focus:border-rose-500 focus:outline-none resize-none"
                      />

                      <div className="mt-5 flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setRejectingStudent(null)}
                          className="rounded-[10px] bg-surface-2 px-4 py-2 text-[13px] font-medium text-muted hover:text-fg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSubmittingReject || !rejectionReason.trim()}
                          onClick={submitRejection}
                          className="rounded-[10px] bg-rose-600 hover:bg-rose-500 px-4 py-2 text-[13px] font-semibold text-white transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                        >
                          {isSubmittingReject ? 'Rejecting...' : 'Confirm Rejection'}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-line pt-3 text-[12px] text-muted">
                <span>
                  Admin Session: <code className="text-accent">{user?.email}</code>
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center gap-1.5 text-accent-3 hover:underline cursor-pointer"
                >
                  <LogOut className="size-3.5" /> Sign Out of Admin
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
