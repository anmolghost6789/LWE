import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  GitBranch,
  Lock,
  LogOut,
  MessageCircle,
  Mic,
  Play,
  Radio,
  RefreshCw,
  Save,
  Send,
  ShieldAlert,
  Sparkles,
  Terminal,
  Users,
  Video,
  VideoOff,
  X,
  XCircle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cx } from '../lib/cx'

type ActiveView = 'overview' | 'live_room' | 'recording' | 'slack' | 'repo'

export function StudentDashboardModal() {
  const { user, enrolment, isDashboardOpen, closeDashboard, logout, refreshAuth, resubmitPaymentReference } = useAuth()
  const [activeView, setActiveView] = useState<ActiveView>('overview')
  const [isCopied, setIsCopied] = useState(false)
  const [cloneCopied, setCloneCopied] = useState(false)
  const [copiedUpi, setCopiedUpi] = useState(false)
  const [micActive, setMicActive] = useState(true)
  const [cameraActive, setCameraActive] = useState(true)
  const [recordingPlaying, setRecordingPlaying] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshNotice, setRefreshNotice] = useState('')
  const [newRefInput, setNewRefInput] = useState('')
  const [isSubmittingRef, setIsSubmittingRef] = useState(false)
  const [refSubmitMsg, setRefSubmitMsg] = useState('')

  const isApproved = user?.role === 'admin' || enrolment?.status === 'approved' || enrolment?.status === 'confirmed'
  const isRejected = enrolment?.status === 'rejected'

  // Auto-poll approval status every 20 seconds while user is waiting in pending/rejected state
  useEffect(() => {
    if (!isDashboardOpen || isApproved) return
    const interval = setInterval(() => {
      refreshAuth()
    }, 20000)
    return () => clearInterval(interval)
  }, [isDashboardOpen, isApproved, refreshAuth])

  const [studentRepoUrl, setStudentRepoUrl] = useState(() => {
    try {
      return localStorage.getItem('lwe_student_repo_' + (user?.id || '')) || ''
    } catch {
      return ''
    }
  })
  const [repoSaved, setRepoSaved] = useState(false)

  if (!isDashboardOpen || !user) return null

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    setRefreshNotice('')
    await refreshAuth()
    setIsRefreshing(false)
    setRefreshNotice('Status refreshed just now.')
    setTimeout(() => setRefreshNotice(''), 3000)
  }

  const handleCopyUpi = () => {
    navigator.clipboard?.writeText('7488659839@upi')
    setCopiedUpi(true)
    setTimeout(() => setCopiedUpi(false), 2500)
  }

  const handleResubmitPaymentRef = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRefInput.trim()) return
    setIsSubmittingRef(true)
    setRefSubmitMsg('')
    const res = await resubmitPaymentReference(newRefInput.trim())
    setIsSubmittingRef(false)
    if (res.ok) {
      setRefSubmitMsg('Payment reference submitted successfully! Status updated to Pending.')
      setNewRefInput('')
    } else {
      setRefSubmitMsg(res.error || 'Failed to submit payment reference.')
    }
  }

  const scaffoldCloneCmd = 'git clone https://github.com/learnwithexpert/genai-workflow-scaffold.git'

  const handleCopyClone = () => {
    navigator.clipboard?.writeText(scaffoldCloneCmd)
    setCloneCopied(true)
    setTimeout(() => setCloneCopied(false), 2500)
  }

  const handleSaveStudentRepo = () => {
    try {
      localStorage.setItem('lwe_student_repo_' + user.id, studentRepoUrl.trim())
      setRepoSaved(true)
      setTimeout(() => setRepoSaved(false), 2500)
    } catch {}
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  const liveMeetingUrl = 'https://meet.google.com/new'
  const calendarEventUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    'LWE Cohort 7: Live Kickoff & Architecture Session'
  )}&details=${encodeURIComponent(
    '6-week GenAI Bootcamp Live Kickoff Session with Engineer.\nScope: System Architecture, Workflow Scaffolding & Prompt Evaluation.\nMeeting link: ' +
      liveMeetingUrl
  )}&dates=20261117T133000Z/20261117T150000Z`

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(liveMeetingUrl)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2500)
  }

  const handleDownloadWorksheet = () => {
    const content = `# LWE GenAI Bootcamp - Cohort 7 Prompt Evaluation Worksheet
Student: ${user.name} (${user.email})
Target Project: ${enrolment?.workflowGoal || 'Custom GenAI Workflow Development'}
Official ID: ${enrolment?.id || 'ENR-STUDENT'}

## 1. System Prompt Architecture
- [ ] Persona & Role definition specified
- [ ] Explicit output JSON schema defined
- [ ] 3-shot few-shot examples included
- [ ] Refusal & Safety Guardrails configured

## 2. Evaluation Suite & Rubrics
| Test Case ID | Input Test Scenario | Expected Output Schema | Accuracy (1-5) | Latency (ms) | Pass/Fail |
|---|---|---|---|---|---|
| TC-01 | Standard Workflow Input | Valid Schema JSON | | | |
| TC-02 | Edge Case / Empty Payload | Graceful Error Handling | | | |
| TC-03 | Adversarial / Injection | Strict Guardrail Triggered | | | |
| TC-04 | Long-context Document (>8k) | Complete Extraction | | | |

## 3. Human-in-the-Loop Review Gate
- Confidence threshold score: 0.85
- Approval Channel: Private Slack #cohort-7-approvals
`
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Prompt_Eval_Worksheet_${user.name.replace(/\s+/g, '_')}_Cohort7.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            setActiveView('overview')
            closeDashboard()
          }}
          aria-hidden
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="depth relative z-10 my-6 w-full max-w-[760px] overflow-hidden rounded-card bg-surface p-5 sm:p-8 shadow-glow border border-line"
        >
          {/* Header Bar */}
          <div className="flex items-start justify-between border-b border-line pb-5">
            <div className="flex items-center gap-3.5">
              {isApproved && activeView !== 'overview' && (
                <button
                  type="button"
                  onClick={() => setActiveView('overview')}
                  className="mr-1 grid size-8 place-items-center rounded-[8px] bg-white/[0.06] text-fg hover:bg-white/[0.12] transition-colors cursor-pointer"
                  title="Back to Overview"
                >
                  <ArrowLeft className="size-4" />
                </button>
              )}
              <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2 font-semibold text-bg text-[16px] shadow-[0_0_20px_rgba(255,122,69,0.3)] shrink-0">
                {getInitials(user.name)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[19px] font-semibold text-fg tracking-tight">{user.name}</h3>
                  {isApproved ? (
                    <span className="rounded-[8px] bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Verified Student · Access Approved
                    </span>
                  ) : isRejected ? (
                    <span className="rounded-[8px] bg-rose-500/15 px-2 py-0.5 text-[11px] font-medium text-rose-400 border border-rose-500/25 flex items-center gap-1">
                      <XCircle className="size-3" /> Access Rejected
                    </span>
                  ) : (
                    <span className="rounded-[8px] bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-400 border border-amber-500/25 flex items-center gap-1">
                      <Clock className="size-3 animate-spin" /> Pending Admin Approval
                    </span>
                  )}
                </div>
                <p className="text-[12.5px] text-muted mt-0.5">{user.email} · {user.role}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveView('overview')
                closeDashboard()
              }}
              className="grid size-8 place-items-center rounded-[10px] text-muted hover:bg-white/[0.08] hover:text-fg transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* ACCESS CONTROL GATE: When account is NOT yet approved by admin */}
          {!isApproved ? (
            <div className="mt-6">
              {isRejected ? (
                /* ----------------- STATE: REJECTED ----------------- */
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-card-sm bg-rose-950/20 border border-rose-500/30 p-5 sm:p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="size-12 rounded-full bg-rose-500/20 border border-rose-500/30 grid place-items-center text-rose-400 shrink-0">
                      <ShieldAlert className="size-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-rose-300 border border-rose-500/30">
                          Verification Unsuccessful
                        </span>
                        <span className="text-[12px] text-muted">ID: {enrolment?.id || 'ENR-UNKNOWN'}</span>
                      </div>
                      <h4 className="text-[18px] font-semibold text-fg mt-1.5">
                        Payment Verification Rejected
                      </h4>
                      <p className="text-[13px] text-muted mt-1 leading-relaxed">
                        The administrator reviewed your registration and was unable to confirm receipt of payment. Your dashboard and live room access remain locked.
                      </p>

                      {/* Admin's exact rejection note */}
                      <div className="mt-4 rounded-[10px] bg-surface border border-rose-500/20 p-3.5">
                        <p className="text-[11px] text-muted uppercase font-semibold tracking-wider">
                          Administrator Feedback / Reason:
                        </p>
                        <p className="mt-1 text-[13.5px] text-rose-300 font-medium">
                          "{enrolment?.rejectionReason || 'Transaction reference not found in bank records. Please check and re-enter.'}"
                        </p>
                        {enrolment?.verifiedAt && (
                          <p className="mt-1 text-[11px] text-faint">
                            Reviewed on: {new Date(enrolment.verifiedAt).toLocaleString()}
                          </p>
                        )}
                      </div>

                      {/* Resubmit Payment Reference Form */}
                      <form onSubmit={handleResubmitPaymentRef} className="mt-5 pt-4 border-t border-rose-500/20">
                        <label htmlFor="resubmit-ref" className="block text-[13px] font-semibold text-fg">
                          Resubmit Valid Payment Reference / UTR Number:
                        </label>
                        <p className="text-[12px] text-muted mt-0.5">
                          Enter the correct 12-digit UPI UTR or bank transaction ID so the admin can verify your payment and approve your account.
                        </p>

                        <div className="mt-3 flex flex-col sm:flex-row items-center gap-2.5">
                          <input
                            id="resubmit-ref"
                            type="text"
                            placeholder="e.g. 12-digit UTR (430128912345)"
                            value={newRefInput}
                            onChange={(e) => setNewRefInput(e.target.value)}
                            className="depth w-full rounded-[10px] bg-surface px-3.5 py-2.5 text-[13px] text-fg placeholder:text-muted/50 border border-line focus:border-accent focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={isSubmittingRef || !newRefInput.trim()}
                            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-[10px] bg-accent px-5 py-2.5 text-[13px] font-semibold text-bg hover:bg-accent-2 transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                          >
                            {isSubmittingRef ? (
                              <RefreshCw className="size-4 animate-spin" />
                            ) : (
                              <Send className="size-3.5" />
                            )}
                            Resubmit for Verification
                          </button>
                        </div>

                        {refSubmitMsg && (
                          <p className="mt-2 text-[12px] text-accent-2">{refSubmitMsg}</p>
                        )}
                      </form>

                      {/* Payment Support Helper */}
                      <div className="mt-4 pt-3 border-t border-rose-500/20 flex flex-wrap items-center justify-between gap-3 text-[12px]">
                        <span className="text-muted">
                          Official UPI: <strong className="font-mono text-fg">7488659839@upi</strong>
                        </span>
                        <a
                          href={`https://wa.me/917488659839?text=${encodeURIComponent(
                            `Hi, my payment verification was rejected for Enrolment ID: ${enrolment?.id}. Here is my payment receipt screenshot.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-accent hover:underline font-medium"
                        >
                          <MessageCircle className="size-3.5" /> Send Receipt on WhatsApp for Help
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* ----------------- STATE: PENDING APPROVAL ----------------- */
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-card-sm bg-surface-2/70 border border-amber-500/30 p-5 sm:p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="size-12 rounded-full bg-amber-500/15 border border-amber-500/30 grid place-items-center text-amber-400 shrink-0 shadow-[0_0_15px_rgba(255,184,0,0.2)]">
                      <Lock className="size-6 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300 border border-amber-500/30">
                          <span className="size-1.5 rounded-full bg-amber-400 animate-ping" />
                          Pending Admin Verification
                        </span>
                        <span className="text-[12px] text-muted">ID: <strong className="font-mono text-fg">{enrolment?.id || 'ENR-STUDENT'}</strong></span>
                      </div>

                      <h4 className="text-[18px] font-semibold text-fg mt-2">
                        Dashboard Access Locked
                      </h4>
                      <p className="text-[13px] text-muted mt-1 leading-relaxed">
                        Your registration for <strong className="text-fg">{enrolment?.planLabel || 'Bootcamp'}</strong> (₹{enrolment?.amount?.toLocaleString() || '9,999'}) is awaiting payment verification by the administrator. All session materials and live classroom rooms will be unlocked as soon as your payment is approved.
                      </p>

                      {/* Payment summary grid */}
                      <div className="mt-4 grid sm:grid-cols-2 gap-2.5 text-[12.5px]">
                        <div className="rounded-[10px] bg-surface border border-line p-3">
                          <p className="text-muted text-[11px] uppercase font-semibold">Official Payment Beneficiary</p>
                          <p className="font-semibold text-fg mt-0.5">LearnWithExpert / Anmol Gupta</p>
                          <div className="mt-1 flex items-center justify-between">
                            <span className="font-mono text-accent text-[13px]">7488659839@upi</span>
                            <button
                              type="button"
                              onClick={handleCopyUpi}
                              className="text-[11px] text-muted hover:text-fg underline cursor-pointer"
                            >
                              {copiedUpi ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                        </div>

                        <div className="rounded-[10px] bg-surface border border-line p-3">
                          <p className="text-muted text-[11px] uppercase font-semibold">Submitted Payment Reference</p>
                          <p className="font-mono text-fg font-semibold mt-0.5 break-all">
                            {enrolment?.paymentReference || 'None provided during signup'}
                          </p>
                          <p className="text-[11px] text-faint mt-1">Status: Awaiting bank match</p>
                        </div>
                      </div>

                      {/* Update reference if missing or needs correction */}
                      <form onSubmit={handleResubmitPaymentRef} className="mt-4 pt-3 border-t border-line">
                        <label htmlFor="update-ref" className="block text-[12.5px] font-medium text-fg">
                          {enrolment?.paymentReference ? 'Update Payment Reference / UTR Number:' : 'Enter Payment Reference / UTR to Expedite Verification:'}
                        </label>
                        <div className="mt-2 flex flex-col sm:flex-row items-center gap-2">
                          <input
                            id="update-ref"
                            type="text"
                            placeholder="e.g. 12-digit UPI UTR (430128912345)"
                            value={newRefInput}
                            onChange={(e) => setNewRefInput(e.target.value)}
                            className="depth w-full rounded-[10px] bg-surface px-3 py-2 text-[13px] text-fg placeholder:text-muted/50 border border-line focus:border-accent focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={isSubmittingRef || !newRefInput.trim()}
                            className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-[10px] bg-white/[0.08] hover:bg-white/[0.14] border border-line px-4 py-2 text-[12.5px] font-semibold text-fg transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                          >
                            {isSubmittingRef ? <RefreshCw className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                            Save Reference
                          </button>
                        </div>
                        {refSubmitMsg && <p className="mt-1.5 text-[12px] text-emerald-400">{refSubmitMsg}</p>}
                      </form>

                      {/* Check status button and WhatsApp assistance */}
                      <div className="mt-5 pt-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={handleManualRefresh}
                          disabled={isRefreshing}
                          className="inline-flex items-center gap-2 rounded-[10px] bg-accent px-4 py-2 text-[13px] font-semibold text-bg hover:bg-accent-2 transition-all cursor-pointer shadow-[0_4px_16px_rgba(255,122,69,0.3)] disabled:opacity-60"
                        >
                          <RefreshCw className={cx('size-3.5', isRefreshing && 'animate-spin')} />
                          Check Approval Status
                        </button>

                        <a
                          href={`https://wa.me/917488659839?text=${encodeURIComponent(
                            `Hi! I registered for Cohort 7 (ID: ${enrolment?.id || ''}, Email: ${user.email}). I made the payment via UPI. Please verify and approve my account.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[12.5px] text-emerald-400 hover:underline font-medium"
                        >
                          <MessageCircle className="size-4" /> Fast-track on WhatsApp
                        </a>
                      </div>

                      {refreshNotice && (
                        <p className="mt-2 text-[12px] text-emerald-400 text-center sm:text-left">{refreshNotice}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          ) : (
            /* ----------------- FULL UNLOCKED DASHBOARD (APPROVED) ----------------- */
            <>

          {/* VIEW 1: LIVE CLASSROOM & MEETING ROOM */}
          {activeView === 'live_room' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-[12px] font-semibold text-emerald-400">
                  <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                  Live Classroom Room Active
                </span>
                <span className="text-[12.5px] text-muted flex items-center gap-1.5">
                  <Clock className="size-3.5 text-accent" /> Monday, 17 Nov · 7:00 PM IST (90 Mins)
                </span>
              </div>

              {/* Virtual Classroom Stage */}
              <div className="mt-4 rounded-card-sm bg-surface-2 border border-line overflow-hidden p-5 relative">
                <div className="aspect-[16/9] w-full rounded-[10px] bg-black/60 border border-line-strong relative flex flex-col items-center justify-center p-6 text-center overflow-hidden">
                  <div className="size-16 rounded-full bg-accent/20 border border-accent/30 grid place-items-center text-accent mb-3 animate-pulse">
                    <Radio className="size-8 text-accent" />
                  </div>
                  <h4 className="text-[18px] font-semibold text-fg">Cohort 7: Live Kickoff & Architecture Session</h4>
                  <p className="text-[13px] text-muted mt-1 max-w-md">
                    Instructor: Lead GenAI Engineer · Screen Share & Interactive Student Debugging Room
                  </p>

                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <span className="rounded-full bg-surface-2/80 px-2.5 py-1 text-[11px] text-fg/80 border border-line flex items-center gap-1.5">
                      <Users className="size-3 text-emerald-400" /> 6 seats reserved
                    </span>
                    <span className="rounded-full bg-surface-2/80 px-2.5 py-1 text-[11px] text-fg/80 border border-line flex items-center gap-1.5">
                      <Sparkles className="size-3 text-accent" /> Q&A & Code Review Live
                    </span>
                  </div>

                  {/* Media Controls Preview */}
                  <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMicActive(!micActive)}
                      className={cx(
                        'size-9 rounded-full grid place-items-center transition-all',
                        micActive ? 'bg-white/10 text-fg hover:bg-white/20' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      )}
                      title={micActive ? 'Mute Mic' : 'Unmute Mic'}
                    >
                      {micActive ? <Mic className="size-4" /> : <Mic className="size-4 line-through" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCameraActive(!cameraActive)}
                      className={cx(
                        'size-9 rounded-full grid place-items-center transition-all',
                        cameraActive ? 'bg-white/10 text-fg hover:bg-white/20' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      )}
                      title={cameraActive ? 'Turn Off Camera' : 'Turn On Camera'}
                    >
                      {cameraActive ? <Video className="size-4" /> : <VideoOff className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Primary Launch Buttons */}
                <div className="mt-5 grid sm:grid-cols-3 gap-2.5">
                  <a
                    href={liveMeetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-[12px] bg-accent px-5 py-3 text-[14px] font-semibold text-bg hover:bg-accent-2 transition-all shadow-[0_4px_20px_rgba(255_122_69,0.35)]"
                  >
                    <Video className="size-4.5" /> Launch Live Room in Google Meet <ExternalLink className="size-3.5 opacity-70" />
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-surface border border-line px-4 py-3 text-[13px] font-medium text-fg hover:bg-white/[0.08] transition-colors"
                  >
                    {isCopied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4 text-muted" />}
                    {isCopied ? 'Link Copied!' : 'Copy Meeting Link'}
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between text-[12px] text-muted pt-2 border-t border-line/60">
                  <span>Room ID: <code className="text-accent font-mono">lwe-c7-kickoff</code></span>
                  <a
                    href={calendarEventUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-accent hover:underline font-medium"
                  >
                    <Calendar className="size-3.5" /> Add to Google Calendar
                  </a>
                </div>
              </div>
            </motion.div>
          )}

          {/* VIEW 2: RECORDINGS PLAYER */}
          {activeView === 'recording' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-medium text-accent flex items-center gap-2">
                  <Play className="size-3.5" /> Session 1 Recording (90 mins)
                </span>
                <span className="text-[12px] text-muted">Uploaded on Nov 10 · 1080p</span>
              </div>

              <div className="rounded-card-sm bg-surface-2 border border-line p-5">
                <div className="aspect-[16/9] w-full rounded-[10px] bg-black/80 border border-line-strong relative overflow-hidden flex flex-col items-center justify-center">
                  {!recordingPlaying ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                      <button
                        type="button"
                        onClick={() => setRecordingPlaying(true)}
                        className="size-16 rounded-full bg-accent text-bg grid place-items-center shadow-[0_0_24px_rgba(255,122,69,0.4)] hover:scale-105 transition-transform"
                      >
                        <Play className="size-7 ml-1 fill-current" />
                      </button>
                      <h5 className="mt-4 text-[16px] font-semibold text-fg">Session 1: Data Preparation & Foundation</h5>
                      <p className="mt-1 text-[13px] text-muted">Click to play high-definition cohort replay</p>
                    </div>
                  ) : (
                    <div className="size-full flex flex-col items-center justify-center p-8 bg-black text-center">
                      <p className="text-[14px] text-accent font-medium animate-pulse">Playing Session 1 Recording...</p>
                      <p className="text-[12px] text-muted mt-2">Full video streaming through Cloudflare Stream Player</p>
                      <button
                        type="button"
                        onClick={() => setRecordingPlaying(false)}
                        className="mt-4 rounded-[8px] bg-surface-2 border border-line px-3 py-1.5 text-[12px] text-fg hover:bg-white/10"
                      >
                        Pause Video
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between text-[12.5px] text-muted">
                  <span>Topics: Dataset extraction, cleaning, API schema generation, vector embeddings.</span>
                  <button
                    type="button"
                    onClick={handleDownloadWorksheet}
                    className="inline-flex items-center gap-1.5 text-accent hover:underline font-medium"
                  >
                    <Download className="size-3.5" /> Notes & Timestamps
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* VIEW 3: SLACK COMMUNITY */}
          {activeView === 'slack' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6"
            >
              <div className="rounded-card-sm bg-surface-2 border border-line p-6 text-center">
                <div className="size-14 rounded-full bg-accent-3/15 text-accent-3 grid place-items-center mx-auto mb-3">
                  <Users className="size-7" />
                </div>
                <h4 className="text-[18px] font-semibold text-fg">Private Cohort 7 Slack Workspace</h4>
                <p className="text-[13.5px] text-muted mt-1 max-w-md mx-auto">
                  Collaborate directly with your cohort peers, share prompt evaluations, and get unblocked by engineers between sessions.
                </p>

                <div className="mt-5 max-w-sm mx-auto p-3.5 rounded-[10px] bg-black/40 border border-line text-left text-[12.5px]">
                  <p className="text-muted">Channels included:</p>
                  <ul className="mt-1 space-y-1 text-fg/90">
                    <li>💬 <span className="font-mono text-accent">#cohort-7-general</span>: Daily discussions</li>
                    <li>🛠️ <span className="font-mono text-accent">#cohort-7-projects</span>: Architecture reviews</li>
                    <li>🚨 <span className="font-mono text-accent">#engineer-unblock</span>: Direct help desk</li>
                  </ul>
                </div>

                <div className="mt-5 flex items-center justify-center gap-3">
                  <a
                    href="https://slack.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-[12px] bg-accent-3 px-5 py-2.5 text-[13.5px] font-semibold text-white hover:opacity-90 transition-opacity"
                  >
                    Open Cohort Slack <ExternalLink className="size-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setActiveView('overview')}
                    className="rounded-[12px] bg-surface border border-line px-4 py-2.5 text-[13px] text-muted hover:text-fg"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* VIEW 4: GENAI PROJECT REPOSITORY SCAFFOLD */}
          {activeView === 'repo' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-medium text-accent-2 flex items-center gap-2">
                  <Code2 className="size-4" /> Cohort 7: GenAI Workflow Scaffold & Reviews
                </span>
                <span className="text-[12px] text-muted flex items-center gap-1 font-mono">
                  <GitBranch className="size-3 text-accent" /> main branch template
                </span>
              </div>

              <div className="rounded-card-sm bg-surface-2 border border-line p-5">
                <h4 className="text-[16px] font-semibold text-fg">Official Bootcamp Starter Scaffold</h4>
                <p className="text-[13px] text-muted mt-1 leading-relaxed">
                  Your project starting point pre-configured with LangChain / LlamaIndex, LiteLLM orchestration, automated prompt evals, and production Docker setup.
                </p>

                {/* Clone Terminal Box */}
                <div className="mt-4 rounded-[10px] bg-black/70 border border-line-strong p-3.5 flex items-center justify-between gap-3 font-mono text-[12.5px] text-fg/90">
                  <div className="flex items-center gap-2 overflow-x-auto truncate">
                    <Terminal className="size-4 text-accent shrink-0" />
                    <span className="text-muted shrink-0">$</span>
                    <span className="truncate select-all text-emerald-400">{scaffoldCloneCmd}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyClone}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-[8px] bg-white/[0.08] hover:bg-white/[0.15] px-2.5 py-1 text-[11.5px] font-sans text-fg transition-colors"
                  >
                    {cloneCopied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5 text-muted" />}
                    {cloneCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                {/* File Architecture Preview */}
                <div className="mt-4 grid sm:grid-cols-2 gap-2 text-[12px]">
                  <div className="p-2.5 rounded-[8px] bg-surface border border-line">
                    <p className="font-mono text-accent font-semibold">📁 src/workflow.py</p>
                    <p className="text-muted mt-0.5">Core streaming chain & human-in-the-loop review logic</p>
                  </div>
                  <div className="p-2.5 rounded-[8px] bg-surface border border-line">
                    <p className="font-mono text-accent-2 font-semibold">📁 evals/rubrics.json</p>
                    <p className="text-muted mt-0.5">Automated prompt accuracy & hallucination tests</p>
                  </div>
                  <div className="p-2.5 rounded-[8px] bg-surface border border-line">
                    <p className="font-mono text-emerald-400 font-semibold">📁 guardrails/moderation.py</p>
                    <p className="text-muted mt-0.5">Input sanitization & PII redaction layer</p>
                  </div>
                  <div className="p-2.5 rounded-[8px] bg-surface border border-line">
                    <p className="font-mono text-purple-400 font-semibold">📁 docker-compose.yml</p>
                    <p className="text-muted mt-0.5">Ready for deployment to Railway / AWS</p>
                  </div>
                </div>

                {/* Student's Custom GitHub Repo Input for Instructor PR Reviews */}
                <div className="mt-5 pt-4 border-t border-line">
                  <label className="block text-[13px] font-semibold text-fg">
                    Your Personal GitHub Project Repository:
                  </label>
                  <p className="text-[12px] text-muted mt-0.5">
                    Link your cloned repo here so your instructor can review your pull requests and architecture during Thursday calls.
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <input
                      type="url"
                      value={studentRepoUrl}
                      onChange={(e) => setStudentRepoUrl(e.target.value)}
                      placeholder="https://github.com/your-username/my-genai-workflow"
                      className="flex-1 rounded-[10px] bg-surface border border-line px-3.5 py-2 text-[13px] text-fg placeholder:text-muted/60 focus:border-accent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSaveStudentRepo}
                      className="inline-flex items-center gap-1.5 rounded-[10px] bg-accent px-4 py-2 text-[13px] font-semibold text-bg hover:bg-accent-2 transition-colors cursor-pointer shrink-0"
                    >
                      {repoSaved ? <Check className="size-4" /> : <Save className="size-4" />}
                      {repoSaved ? 'Saved!' : 'Save Repo'}
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-[12px] pt-3 border-t border-line/60">
                  <span className="text-muted">Target: <strong className="text-fg">{enrolment?.workflowGoal || 'Custom GenAI Workflow'}</strong></span>
                  <button
                    type="button"
                    onClick={() => setActiveView('overview')}
                    className="text-accent hover:underline font-medium"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* VIEW 0: MAIN DASHBOARD OVERVIEW */}
          {activeView === 'overview' && (
            <>
              {/* Active Cohort Progress Card */}
              <div className="mt-6 rounded-card-sm bg-surface-2/70 p-5 border border-line relative overflow-hidden">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -bottom-10 size-40 rounded-full bg-[radial-gradient(circle,rgb(255_122_69/0.15),transparent_70%)] blur-xl"
                />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-accent font-medium">
                      <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                      Live Bootcamp Status · {user.cohort || 'Cohort 7 (Starts 17 Nov)'}
                    </span>
                    <h4 className="text-[17px] font-semibold text-fg mt-1">
                      Week 1 of 6: Scope, Live Architecture & Kickoff
                    </h4>
                    <p className="text-[13px] text-muted mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span className="flex items-center gap-1.5 text-accent-2 font-medium">
                        <Clock className="size-3.5" /> Next live call: Monday, 17 Nov · 7:00 PM IST (90 mins)
                      </span>
                      <span className="text-white/20 hidden sm:inline">•</span>
                      <span className="text-white/70 text-[12px] flex items-center gap-1">
                        <Video className="size-3 text-emerald-400" /> Google Meet Live Room
                      </span>
                    </p>
                  </div>

                  {/* ACTIVE JOIN LIVE ROOM BUTTON GROUP */}
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={liveMeetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-fg px-4 py-2.5 text-[13px] font-semibold text-bg hover:bg-white transition-all shadow-[0_4px_16px_rgba(255,255,255,0.2)] cursor-pointer hover:scale-[1.02]"
                    >
                      <Video className="size-4 text-accent fill-accent" /> Join Live Room
                      <ExternalLink className="size-3.5 opacity-60 text-bg" />
                    </a>

                    <button
                      type="button"
                      onClick={() => setActiveView('live_room')}
                      className="inline-flex items-center justify-center gap-1.5 rounded-[12px] bg-white/[0.06] hover:bg-white/[0.12] border border-line px-3 py-2.5 text-[12px] font-medium text-fg transition-all"
                      title="Classroom Details, Mic/Cam Test & Calendar"
                    >
                      <Calendar className="size-3.5 text-accent" />
                      Schedule
                    </button>
                  </div>
                </div>

                {/* Step progress bar */}
                <div className="mt-5 grid grid-cols-6 gap-2">
                  {[
                    { week: 'W1', title: 'Scope & Setup', active: true, done: false },
                    { week: 'W2', title: 'Architecture', active: false, done: false },
                    { week: 'W3', title: 'Prompt & Chain', active: false, done: false },
                    { week: 'W4', title: 'Guardrails', active: false, done: false },
                    { week: 'W5', title: 'Evals & Tuning', active: false, done: false },
                    { week: 'W6', title: 'Production Ship', active: false, done: false },
                  ].map((step) => (
                    <div key={step.week} className="flex flex-col gap-1.5">
                      <div
                        className={cx(
                          'h-1.5 rounded-full transition-all',
                          step.done
                            ? 'bg-accent'
                            : step.active
                            ? 'bg-accent-2 animate-pulse shadow-[0_0_8px_rgba(255,184,0,0.6)]'
                            : 'bg-white/10'
                        )}
                      />
                      <span className={cx('text-[10.5px] truncate font-medium', step.active ? 'text-accent-2' : 'text-muted')}>
                        {step.week}: {step.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Enrolled Workflow Project Scope */}
              {enrolment && (
                <div className="mt-4 rounded-card-sm bg-surface-2/40 p-4 border border-line">
                  <div className="flex items-center justify-between text-[12px] text-muted">
                    <span>
                      Official ID: <strong className="font-mono text-accent">{enrolment.id}</strong> · {enrolment.planLabel}
                    </span>
                    <span className="rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-medium capitalize">
                      {enrolment.status}
                    </span>
                  </div>
                  <h5 className="mt-2 text-[13.5px] font-semibold text-fg">Your Target Project:</h5>
                  <p className="mt-0.5 text-[13px] text-muted leading-relaxed">{enrolment.workflowGoal}</p>
                </div>
              )}

              {/* Quick Resources & Deliverables with ACTIVE INTERACTIVE ACTIONS */}
              <div className="mt-6">
                <h4 className="text-[14px] font-semibold uppercase tracking-wider text-muted mb-3">
                  Cohort Deliverables & Materials
                </h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  {/* Resource 1: Watch Session 1 Recording */}
                  <div
                    onClick={() => setActiveView('recording')}
                    className="flex items-center justify-between p-3.5 rounded-[12px] bg-surface-2/40 border border-line hover:border-accent/40 hover:bg-surface-2/70 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-[8px] bg-accent/10 grid place-items-center text-accent group-hover:scale-105 transition-transform">
                        <Play className="size-4 fill-accent" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-fg group-hover:text-accent transition-colors">Session 1 Recording</p>
                        <p className="text-[11px] text-muted">90 mins · Data Preparation</p>
                      </div>
                    </div>
                    <span className="text-[12px] text-accent font-medium group-hover:underline">
                      Watch
                    </span>
                  </div>

                  {/* Resource 2: Project GitHub Repo */}
                  <div
                    onClick={() => setActiveView('repo')}
                    className="flex items-center justify-between p-3.5 rounded-[12px] bg-surface-2/40 border border-line hover:border-accent-2/40 hover:bg-surface-2/70 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-[8px] bg-accent-2/10 grid place-items-center text-accent-2 group-hover:scale-105 transition-transform">
                        <Code2 className="size-4" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-fg group-hover:text-accent-2 transition-colors">Project GitHub Repo</p>
                        <p className="text-[11px] text-muted">Bootcamp starter scaffold & reviews</p>
                      </div>
                    </div>
                    <span className="text-[12px] text-accent font-medium group-hover:underline inline-flex items-center gap-1">
                      Open <Code2 className="size-3" />
                    </span>
                  </div>

                  {/* Resource 3: Prompt Eval Worksheets */}
                  <div
                    onClick={handleDownloadWorksheet}
                    className="flex items-center justify-between p-3.5 rounded-[12px] bg-surface-2/40 border border-line hover:border-line-strong hover:bg-surface-2/70 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-[8px] bg-white/[0.08] grid place-items-center text-fg group-hover:scale-105 transition-transform">
                        <FileText className="size-4" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-fg group-hover:text-accent transition-colors">Prompt Eval Worksheets</p>
                        <p className="text-[11px] text-muted">Structured test suite & rubrics</p>
                      </div>
                    </div>
                    <span className="text-[12px] text-muted group-hover:text-fg font-medium inline-flex items-center gap-1">
                      <Download className="size-3.5 text-accent" />
                    </span>
                  </div>

                  {/* Resource 4: Private Cohort Slack */}
                  <div
                    onClick={() => setActiveView('slack')}
                    className="flex items-center justify-between p-3.5 rounded-[12px] bg-surface-2/40 border border-line hover:border-accent-3/40 hover:bg-surface-2/70 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-[8px] bg-accent-3/10 grid place-items-center text-accent-3 group-hover:scale-105 transition-transform">
                        <Users className="size-4" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-fg group-hover:text-accent-3 transition-colors">Private Cohort Slack</p>
                        <p className="text-[11px] text-muted">Direct instructor unblocking</p>
                      </div>
                    </div>
                    <span className="text-[12px] text-accent font-medium group-hover:underline">
                      Connect
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}

          {/* Footer Actions */}
          <div className="mt-8 flex items-center justify-between border-t border-line pt-4">
            <span className="text-[12px] text-muted">
              Account ID: <code className="text-faint">{user.id}</code>
            </span>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-accent-3 transition-colors cursor-pointer"
            >
              <LogOut className="size-3.5" /> Sign Out
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
