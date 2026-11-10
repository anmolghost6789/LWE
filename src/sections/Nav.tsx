import { AnimatePresence, motion } from 'motion/react'
import {
  ChevronDown,
  Clock,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  Shield,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '../components/Button'
import { Logo } from '../components/Logo'
import { nav } from '../content'
import { useAuth } from '../context/AuthContext'
import { cx } from '../lib/cx'

export interface NavProps {
  onOpenAuth?: (mode: 'signin' | 'register') => void
}

export function Nav({ onOpenAuth }: NavProps) {
  const { user, enrolment, isAuthenticated, isAdmin, isApproved, logout, openAuthModal, openJoinCohort, openDashboard, openAdminPortal } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // Close user dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  const handleOpenAuthModal = (mode: 'signin' | 'register') => {
    if (onOpenAuth) {
      onOpenAuth(mode)
    } else {
      openAuthModal(mode)
    }
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <motion.nav
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={cx(
          'relative flex h-14 w-full max-w-[1120px] items-center justify-between rounded-control-lg px-3 pl-4 transition-[background-color,box-shadow] duration-300',
          scrolled || open
            ? 'depth bg-bg/70 shadow-[0_10px_40px_-20px_rgb(0_0_0/0.8)] backdrop-blur-xl'
            : 'bg-transparent',
        )}
      >
        <Logo />
        <ul className="hidden items-center gap-1 md:flex">
          {nav.links.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                className="inline-flex h-9 items-center rounded-[12px] px-3 text-[14px] text-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop Auth Controls */}
        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated && user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="depth flex h-9 items-center gap-2 rounded-[12px] bg-surface-2/90 px-2.5 text-[13.5px] font-medium text-fg hover:bg-white/[0.08] transition-colors cursor-pointer border border-line"
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-[10.5px] font-bold text-bg shadow-[0_0_8px_rgba(255,122,69,0.3)]">
                  {getInitials(user.name)}
                </span>
                <span className="max-w-[130px] truncate text-fg/90">{user.name.split(' ')[0]}</span>
                <ChevronDown className={cx('size-3.5 text-muted transition-transform', userMenuOpen && 'rotate-180')} />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    className="depth absolute right-0 top-11 w-64 rounded-card-sm bg-surface p-2 shadow-glow border border-line z-50 overflow-hidden"
                  >
                    <div className="border-b border-line px-3 py-2.5">
                      <p className="text-[13.5px] font-semibold text-fg truncate">{user.name}</p>
                      <p className="text-[11.5px] text-muted truncate">{user.email}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-[6px] bg-accent/15 px-2 py-0.5 text-[10.5px] font-medium text-accent border border-accent/20">
                          <Sparkles className="size-3" />
                          {user.cohort}
                        </span>
                        {!isAdmin && (
                          isApproved ? (
                            <span className="inline-flex items-center gap-1 rounded-[6px] bg-emerald-500/15 px-2 py-0.5 text-[10.5px] font-medium text-emerald-400 border border-emerald-500/30">
                              <span className="size-1.5 rounded-full bg-emerald-400" />
                              Approved
                            </span>
                          ) : enrolment?.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1 rounded-[6px] bg-rose-500/15 px-2 py-0.5 text-[10.5px] font-medium text-rose-400 border border-rose-500/30">
                              <XCircle className="size-3" />
                              Rejected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-[6px] bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-medium text-amber-300 border border-amber-500/30">
                              <Clock className="size-2.5 animate-spin" />
                              Pending Verification
                            </span>
                          )
                        )}
                      </div>
                    </div>

                    <div className="py-1">
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false)
                            openAdminPortal()
                          }}
                          className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] text-accent font-medium hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
                        >
                          <Shield className="size-4" />
                          <span>Admin Control Center</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false)
                            openDashboard()
                          }}
                          className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] text-fg/90 hover:bg-white/[0.06] hover:text-fg transition-colors cursor-pointer text-left"
                        >
                          {isApproved ? (
                            <>
                              <LayoutDashboard className="size-4 text-emerald-400" />
                              <span>Student Dashboard</span>
                            </>
                          ) : enrolment?.status === 'rejected' ? (
                            <>
                              <XCircle className="size-4 text-rose-400" />
                              <span>Check Rejection Reason</span>
                            </>
                          ) : (
                            <>
                              <Lock className="size-4 text-amber-400" />
                              <span>Check Approval Status</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="border-t border-line pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false)
                          logout()
                        }}
                        className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] text-muted hover:bg-accent-3/15 hover:text-accent-3 transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="size-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => handleOpenAuthModal('signin')}
                className="h-9 px-3 text-[14px] cursor-pointer"
              >
                {nav.signIn.label}
              </Button>
              <Button
                onClick={() => openJoinCohort('bootcamp_full')}
                className="h-9 rounded-[12px] px-4 text-[14px] cursor-pointer"
              >
                Join cohort 7
              </Button>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="grid size-9 place-items-center rounded-[12px] text-fg transition-colors hover:bg-white/[0.06] md:hidden"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </motion.nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="sheet"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="depth absolute inset-x-4 top-[76px] rounded-card bg-surface p-3 shadow-glow md:hidden border border-line"
          >
            {isAuthenticated && user && (
              <div className="mb-2 rounded-[12px] bg-surface-2 p-3 border border-line">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2 font-bold text-bg text-[12px]">
                    {getInitials(user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-fg truncate">{user.name}</p>
                    <p className="text-[12px] text-muted truncate">{user.email}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      if (isAdmin) {
                        openAdminPortal()
                      } else {
                        openDashboard()
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-[10px] bg-fg px-3 py-2 text-[12.5px] font-semibold text-bg"
                  >
                    {isAdmin ? <Shield className="size-3.5" /> : <LayoutDashboard className="size-3.5" />}
                    {isAdmin ? 'Admin Portal' : 'Dashboard'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      logout()
                    }}
                    className="flex items-center justify-center rounded-[10px] bg-white/[0.08] px-3 py-2 text-[12.5px] text-muted hover:text-accent-3"
                  >
                    <LogOut className="size-3.5" />
                  </button>
                </div>
              </div>
            )}

            <ul className="flex flex-col">
              {nav.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex h-12 items-center rounded-control px-3 text-[16px] text-fg transition-colors hover:bg-white/[0.06]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>

            {!isAuthenticated && (
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setOpen(false)
                    handleOpenAuthModal('signin')
                  }}
                >
                  {nav.signIn.label}
                </Button>
                <Button
                  onClick={() => {
                    setOpen(false)
                    openJoinCohort('bootcamp_full')
                  }}
                >
                  Join cohort 7
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
