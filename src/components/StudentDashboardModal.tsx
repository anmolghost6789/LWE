import { AnimatePresence, motion } from 'motion/react'
import {
  Clock,
  Code2,
  Download,
  FileText,
  LogOut,
  Play,
  Users,
  Video,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cx } from '../lib/cx'

export function StudentDashboardModal() {
  const { user, enrolment, isDashboardOpen, closeDashboard, logout } = useAuth()

  if (!isDashboardOpen || !user) return null

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeDashboard}
          aria-hidden
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="depth relative z-10 my-8 w-full max-w-[720px] overflow-hidden rounded-card bg-surface p-6 sm:p-9 shadow-glow border border-line"
        >
          {/* Header Bar */}
          <div className="flex items-start justify-between border-b border-line pb-6">
            <div className="flex items-center gap-3.5">
              <div className="flex size-13 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2 font-semibold text-bg text-[17px] shadow-[0_0_20px_rgba(255,122,69,0.3)]">
                {getInitials(user.name)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[20px] font-semibold text-fg tracking-tight">{user.name}</h3>
                  <span className="rounded-[8px] bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent border border-accent/25">
                    {user.cohort}
                  </span>
                </div>
                <p className="text-[13px] text-muted mt-0.5">{user.email} · {user.role}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={closeDashboard}
              className="grid size-8 place-items-center rounded-[10px] text-muted hover:bg-white/[0.08] hover:text-fg transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Active Cohort Progress Card */}
          <div className="mt-6 rounded-card-sm bg-surface-2/70 p-5 border border-line relative overflow-hidden">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -bottom-10 size-40 rounded-full bg-[radial-gradient(circle,rgb(255_122_69/0.15),transparent_70%)] blur-xl"
            />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[12px] text-accent font-medium">
                  <span className="round size-1.5 bg-accent" />
                  Live Bootcamp Status
                </span>
                <h4 className="text-[17px] font-semibold text-fg mt-1">
                  Week 2 of 6: Live Workflow Architecture & Evals
                </h4>
                <p className="text-[13px] text-muted mt-0.5 flex items-center gap-2">
                  <Clock className="size-3.5 text-accent-2" /> Next live call: Thursday 7:00 PM IST (90 mins)
                </p>
              </div>

              <a
                href="#how"
                onClick={closeDashboard}
                className="inline-flex items-center gap-2 rounded-[12px] bg-fg px-4 py-2.5 text-[13px] font-semibold text-bg hover:bg-white transition-all shadow-[0_4px_16px_rgba(255,255,255,0.2)]"
              >
                <Video className="size-4" /> Join Live Room
              </a>
            </div>

            {/* Step progress bar */}
            <div className="mt-5 grid grid-cols-6 gap-2">
              {[
                { week: 'W1', title: 'Scope & Data', done: true },
                { week: 'W2', title: 'Architecture', active: true },
                { week: 'W3', title: 'Prompt & Chain', done: false },
                { week: 'W4', title: 'Guardrails', done: false },
                { week: 'W5', title: 'Evals & Tuning', done: false },
                { week: 'W6', title: 'Production Ship', done: false },
              ].map((step) => (
                <div key={step.week} className="flex flex-col gap-1.5">
                  <div
                    className={cx(
                      'h-1.5 rounded-full',
                      step.done
                        ? 'bg-accent'
                        : step.active
                        ? 'bg-accent-2 animate-pulse'
                        : 'bg-white/10',
                    )}
                  />
                  <span className="text-[10.5px] text-muted truncate">
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

          {/* Quick Resources & Deliverables */}
          <div className="mt-6">
            <h4 className="text-[14px] font-semibold uppercase tracking-wider text-muted mb-3">
              Cohort Deliverables & Materials
            </h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3.5 rounded-[12px] bg-surface-2/40 border border-line hover:border-line-strong transition-colors">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-[8px] bg-accent/10 grid place-items-center text-accent">
                    <Play className="size-4" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-fg">Session 1 Recording</p>
                    <p className="text-[11px] text-muted">90 mins · Data Preparation</p>
                  </div>
                </div>
                <span className="text-[12px] text-accent font-medium cursor-pointer hover:underline">
                  Watch
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-[12px] bg-surface-2/40 border border-line hover:border-line-strong transition-colors">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-[8px] bg-accent-2/10 grid place-items-center text-accent-2">
                    <Code2 className="size-4" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-fg">Project GitHub Repo</p>
                    <p className="text-[11px] text-muted">Private repository scaffold</p>
                  </div>
                </div>
                <span className="text-[12px] text-accent font-medium cursor-pointer hover:underline">
                  Open
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-[12px] bg-surface-2/40 border border-line hover:border-line-strong transition-colors">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-[8px] bg-white/[0.08] grid place-items-center text-fg">
                    <FileText className="size-4" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-fg">Prompt Eval Worksheets</p>
                    <p className="text-[11px] text-muted">Structured test suite & rubrics</p>
                  </div>
                </div>
                <span className="text-[12px] text-muted hover:text-fg font-medium cursor-pointer">
                  <Download className="size-3.5" />
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-[12px] bg-surface-2/40 border border-line hover:border-line-strong transition-colors">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-[8px] bg-accent-3/10 grid place-items-center text-accent-3">
                    <Users className="size-4" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-fg">Private Cohort Slack</p>
                    <p className="text-[11px] text-muted">Direct instructor unblocking</p>
                  </div>
                </div>
                <span className="text-[12px] text-accent font-medium cursor-pointer hover:underline">
                  Connect
                </span>
              </div>
            </div>
          </div>

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
