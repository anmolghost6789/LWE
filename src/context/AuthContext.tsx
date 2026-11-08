import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  role: 'admin' | 'student'
  cohort: string
  createdAt: string
}

export interface Enrolment {
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
  status: 'confirmed' | 'pending' | 'waitlist'
  workflowGoal: string
  enrolledAt: string
}

interface ApiResponse {
  ok?: boolean
  error?: string
  message?: string
  user?: User
  enrolment?: Enrolment | null
  token?: string
}

interface EnrolData {
  name: string
  email: string
  phone: string
  company: string
  password?: string
  plan: 'bootcamp_full' | 'bootcamp_instalment' | 'recordings' | 'team'
  workflowGoal: string
}

interface AuthContextType {
  user: User | null
  enrolment: Enrolment | null
  token: string | null
  isAuthenticated: boolean
  isAdmin: boolean
  isLoading: boolean

  // Modals
  isAuthModalOpen: boolean
  authModalMode: 'signin' | 'register'
  isJoinCohortOpen: boolean
  selectedPlan: 'bootcamp_full' | 'bootcamp_instalment' | 'recordings' | 'team'
  isDashboardOpen: boolean
  isAdminPortalOpen: boolean

  // Actions
  openAuthModal: (mode?: 'signin' | 'register') => void
  closeAuthModal: () => void
  openJoinCohort: (plan?: 'bootcamp_full' | 'bootcamp_instalment' | 'recordings' | 'team') => void
  closeJoinCohort: () => void
  openDashboard: () => void
  closeDashboard: () => void
  openAdminPortal: () => void
  closeAdminPortal: () => void

  // API calls
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ ok: boolean; error?: string; isAdmin?: boolean }>
  register: (name: string, email: string, password: string, phone?: string, company?: string) => Promise<{ ok: boolean; error?: string }>
  enrolStudent: (data: EnrolData) => Promise<{ ok: boolean; error?: string; enrolment?: Enrolment }>
  signInWithGoogle: (details?: {
    credential?: string
    access_token?: string
    name?: string
    email?: string
    phone?: string
    company?: string
    plan?: 'bootcamp_full' | 'bootcamp_instalment' | 'recordings' | 'team'
    workflowGoal?: string
  }) => Promise<{ ok: boolean; error?: string; enrolment?: Enrolment; isAdmin?: boolean }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = 'lwe_auth_token'
const USER_KEY = 'lwe_auth_user'
const ENROLMENT_KEY = 'lwe_auth_enrolment'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'register'>('signin')
  const [isJoinCohortOpen, setIsJoinCohortOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'bootcamp_full' | 'bootcamp_instalment' | 'recordings' | 'team'>('bootcamp_full')
  const [isDashboardOpen, setIsDashboardOpen] = useState(false)
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState(false)

  // Listen to hash or pathname for #admin or /admin
  useEffect(() => {
    const checkAdminRoute = () => {
      if (window.location.hash === '#admin' || window.location.pathname === '/admin') {
        setIsAdminPortalOpen(true)
      }
    }
    checkAdminRoute()
    window.addEventListener('hashchange', checkAdminRoute)
    return () => window.removeEventListener('hashchange', checkAdminRoute)
  }, [])

  // Restore and verify active session
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY)
      const storedUser = localStorage.getItem(USER_KEY)
      const storedEnrolment = localStorage.getItem(ENROLMENT_KEY)

      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
        if (storedEnrolment) setEnrolment(JSON.parse(storedEnrolment))

        fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${storedToken}` },
        })
          .then((res) => res.json() as Promise<ApiResponse>)
          .then((data) => {
            if (data.ok && data.user) {
              setUser(data.user)
              localStorage.setItem(USER_KEY, JSON.stringify(data.user))
              if (data.enrolment) {
                setEnrolment(data.enrolment)
                localStorage.setItem(ENROLMENT_KEY, JSON.stringify(data.enrolment))
              }
            } else {
              localStorage.removeItem(TOKEN_KEY)
              localStorage.removeItem(USER_KEY)
              localStorage.removeItem(ENROLMENT_KEY)
              setToken(null)
              setUser(null)
              setEnrolment(null)
            }
          })
          .catch(() => {})
          .finally(() => setIsLoading(false))
      } else {
        setIsLoading(false)
      }
    } catch {
      setIsLoading(false)
    }
  }, [])

  const openAuthModal = (mode: 'signin' | 'register' = 'signin') => {
    setAuthModalMode(mode)
    setIsAuthModalOpen(true)
  }

  const closeAuthModal = () => {
    setIsAuthModalOpen(false)
  }

  const openJoinCohort = (plan: 'bootcamp_full' | 'bootcamp_instalment' | 'recordings' | 'team' = 'bootcamp_full') => {
    setSelectedPlan(plan)
    setIsJoinCohortOpen(true)
  }

  const closeJoinCohort = () => {
    setIsJoinCohortOpen(false)
  }

  const openDashboard = () => {
    setIsDashboardOpen(true)
  }

  const closeDashboard = () => {
    setIsDashboardOpen(false)
  }

  const openAdminPortal = () => {
    setIsAdminPortalOpen(true)
  }

  const closeAdminPortal = () => {
    setIsAdminPortalOpen(false)
    if (window.location.hash === '#admin') {
      window.location.hash = ''
    }
  }

  const login = async (email: string, password: string, rememberMe = true) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      })
      const text = await res.text()
      let data: ApiResponse = {}
      try {
        data = JSON.parse(text) as ApiResponse
      } catch {
        return { ok: false, error: `Server error (${res.status}): ${text.slice(0, 150) || 'Invalid response'}` }
      }

      if (!res.ok || !data.ok || !data.user || !data.token) {
        return { ok: false, error: data.error || 'Failed to sign in. Please check your credentials.' }
      }

      setUser(data.user)
      setToken(data.token)
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))

      if (data.enrolment) {
        setEnrolment(data.enrolment)
        localStorage.setItem(ENROLMENT_KEY, JSON.stringify(data.enrolment))
      }

      // If logging in as admin, automatically open Admin Portal
      if (data.user.role === 'admin') {
        setIsAdminPortalOpen(true)
      }

      return { ok: true, isAdmin: data.user.role === 'admin' }
    } catch {
      return { ok: false, error: 'Connection error. Please check your internet connection.' }
    }
  }

  const register = async (name: string, email: string, password: string, phone?: string, company?: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone, company, plan: 'bootcamp_full' }),
      })
      const text = await res.text()
      let data: ApiResponse = {}
      try {
        data = JSON.parse(text) as ApiResponse
      } catch {
        return { ok: false, error: `Server error (${res.status}): ${text.slice(0, 150) || 'Invalid response'}` }
      }

      if (!res.ok || !data.ok || !data.user || !data.token) {
        return { ok: false, error: data.error || 'Failed to complete registration.' }
      }

      setUser(data.user)
      setToken(data.token)
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))

      if (data.enrolment) {
        setEnrolment(data.enrolment)
        localStorage.setItem(ENROLMENT_KEY, JSON.stringify(data.enrolment))
      }

      return { ok: true }
    } catch {
      return { ok: false, error: 'Connection error. Please try again.' }
    }
  }

  const enrolStudent = async (data: EnrolData) => {
    try {
      const res = await fetch('/api/enrol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const text = await res.text()
      let resData: ApiResponse = {}
      try {
        resData = JSON.parse(text) as ApiResponse
      } catch {
        return { ok: false, error: `Server error (${res.status}): ${text.slice(0, 150) || 'Invalid response'}` }
      }

      if (!res.ok || !resData.ok || !resData.enrolment) {
        return { ok: false, error: resData.error || 'Failed to process enrolment.' }
      }

      if (resData.user) {
        setUser(resData.user)
        localStorage.setItem(USER_KEY, JSON.stringify(resData.user))
      }
      if (resData.token) {
        setToken(resData.token)
        localStorage.setItem(TOKEN_KEY, resData.token)
      }
      if (resData.enrolment) {
        setEnrolment(resData.enrolment)
        localStorage.setItem(ENROLMENT_KEY, JSON.stringify(resData.enrolment))
      }

      return { ok: true, enrolment: resData.enrolment }
    } catch {
      return { ok: false, error: 'Connection error. Please try again.' }
    }
  }

  const signInWithGoogle = async (details?: {
    credential?: string
    access_token?: string
    name?: string
    email?: string
    phone?: string
    company?: string
    plan?: 'bootcamp_full' | 'bootcamp_instalment' | 'recordings' | 'team'
    workflowGoal?: string
  }) => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details || {}),
      })
      const text = await res.text()
      let data: ApiResponse = {}
      try {
        data = JSON.parse(text) as ApiResponse
      } catch {
        return { ok: false, error: `Server error (${res.status}): ${text.slice(0, 150) || 'Invalid response'}` }
      }

      if (!res.ok || !data.ok || !data.user || !data.token) {
        return { ok: false, error: data.error || 'Google sign in failed.' }
      }

      setUser(data.user)
      setToken(data.token)
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))

      if (data.enrolment) {
        setEnrolment(data.enrolment)
        localStorage.setItem(ENROLMENT_KEY, JSON.stringify(data.enrolment))
      }

      if (data.user.role === 'admin') {
        setIsAdminPortalOpen(true)
      }

      return {
        ok: true,
        enrolment: data.enrolment || undefined,
        isAdmin: data.user.role === 'admin',
      }
    } catch {
      return { ok: false, error: 'Connection error during Google authentication.' }
    }
  }

  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {})
      }
    } finally {
      setUser(null)
      setEnrolment(null)
      setToken(null)
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(ENROLMENT_KEY)
      setIsDashboardOpen(false)
      setIsAdminPortalOpen(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        enrolment,
        token,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isLoading,
        isAuthModalOpen,
        authModalMode,
        isJoinCohortOpen,
        selectedPlan,
        isDashboardOpen,
        isAdminPortalOpen,
        openAuthModal,
        closeAuthModal,
        openJoinCohort,
        closeJoinCohort,
        openDashboard,
        closeDashboard,
        openAdminPortal,
        closeAdminPortal,
        login,
        register,
        enrolStudent,
        signInWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
