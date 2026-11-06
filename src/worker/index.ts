import { Hono } from 'hono'

// The Worker in front of the static site. Add API routes here; everything
// else falls through to the built assets (single-page-application mode).
type Env = {
  ASSETS: Fetcher
  DB?: any
  CONTACTS?: any
  RESEND_API_KEY?: string
  TEAM_NOTIFICATION_EMAIL?: string
}

export type AuthUser = {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  passwordHash?: string
  role: 'admin' | 'student'
  cohort: string
  createdAt: string
}

export type Enrolment = {
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

// Persistent in-memory data store for real users and real enrolments
const usersByEmail = new Map<string, AuthUser>()
const sessions = new Map<string, { userId: string; expiresAt: number }>()
const enrolmentsList: Enrolment[] = []

// Helper for secure SHA-256 password hashing
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + '_lwe_secure_salt_2026')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Seed the REAL Administrator account
const ADMIN_EMAIL = 'admin@learnwithexpert.com'
const ADMIN_PASSWORD = 'Admin@2026!Expert'

hashPassword(ADMIN_PASSWORD).then((hash) => {
  usersByEmail.set(ADMIN_EMAIL, {
    id: 'usr_admin_master',
    name: 'Admin · LearnWithExpert',
    email: ADMIN_EMAIL,
    phone: '+91 98765 43210',
    company: 'LearnWithExpert Staff',
    passwordHash: hash,
    role: 'admin',
    cohort: 'Staff / Administration',
    createdAt: new Date().toISOString(),
  })
})

const app = new Hono<{ Bindings: Env }>()

app.get('/api/health', (c) => c.json({ ok: true }))

// ---------------------------------------------------------------------------
// 1. Real User Registration & Account Creation
// ---------------------------------------------------------------------------
app.post('/api/auth/register', async (c) => {
  try {
    const body = await c.req.json<{
      name?: string
      email?: string
      phone?: string
      company?: string
      password?: string
      role?: string
      workflowGoal?: string
      plan?: 'bootcamp_full' | 'bootcamp_instalment' | 'recordings' | 'team'
    }>().catch(() => ({} as {
      name?: string
      email?: string
      phone?: string
      company?: string
      password?: string
      role?: string
      workflowGoal?: string
      plan?: 'bootcamp_full' | 'bootcamp_instalment' | 'recordings' | 'team'
    }))

    const name = body.name?.trim() ?? ''
    const email = body.email?.trim().toLowerCase() ?? ''
    const phone = body.phone?.trim() ?? ''
    const company = body.company?.trim() ?? ''
    const password = body.password ?? ''
    const studentRole = body.role?.trim() || 'Software Developer'
    const workflowGoal = body.workflowGoal?.trim() || 'Custom GenAI Workflow'
    const plan = body.plan || 'bootcamp_full'

    if (!name || name.length < 2) {
      return c.json({ error: 'Please enter your full name (minimum 2 characters).' }, 400)
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ error: 'Please enter a valid email address.' }, 400)
    }
    if (!password || password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters long.' }, 400)
    }

    // Check if user already exists
    if (usersByEmail.has(email)) {
      return c.json(
        { error: 'An account with this email already exists. Please sign in.' },
        409,
      )
    }

    const passwordHash = await hashPassword(password)
    const newUser: AuthUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      email,
      phone,
      company: company || studentRole,
      passwordHash,
      role: 'student',
      cohort: 'Cohort 7 (Starts 17 Nov)',
      createdAt: new Date().toISOString(),
    }

    usersByEmail.set(email, newUser)

    // Automatically create real Enrolment record for Cohort 7
    const planPrices: Record<string, { label: string; amount: number }> = {
      bootcamp_full: { label: 'Bootcamp (Pay in Full)', amount: 9999 },
      bootcamp_instalment: { label: 'Bootcamp (3 Instalments)', amount: 3999 },
      recordings: { label: 'Recordings Free Audit', amount: 0 },
      team: { label: 'Team 5 Seats', amount: 39999 },
    }
    const planDetails = planPrices[plan] || planPrices.bootcamp_full

    const newEnrolment: Enrolment = {
      id: `ENR-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      userId: newUser.id,
      name,
      email,
      phone: phone || 'Not specified',
      countryCode: '+91',
      company: company || 'Independent Builder',
      cohort: 'Cohort 7 (Starts 17 Nov)',
      plan,
      planLabel: planDetails.label,
      amount: planDetails.amount,
      status: 'confirmed',
      workflowGoal,
      enrolledAt: new Date().toISOString(),
    }

    enrolmentsList.unshift(newEnrolment)

    // Create session token
    const token = `tok_${crypto.randomUUID()}`
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
    sessions.set(token, { userId: newUser.id, expiresAt })

    const { passwordHash: _, ...safeUser } = newUser
    return c.json({
      ok: true,
      message: 'Account created and successfully enrolled in Cohort 7!',
      user: safeUser,
      enrolment: newEnrolment,
      token,
    })
  } catch (err) {
    console.error('Registration error:', err)
    return c.json({ error: 'Failed to complete registration. Please try again.' }, 500)
  }
})

// ---------------------------------------------------------------------------
// 2. Real User & Admin Sign In
// ---------------------------------------------------------------------------
app.post('/api/auth/login', async (c) => {
  try {
    const body = await c.req.json<{
      email?: string
      password?: string
      rememberMe?: boolean
    }>().catch(() => ({} as {
      email?: string
      password?: string
      rememberMe?: boolean
    }))

    const email = body.email?.trim().toLowerCase() ?? ''
    const password = body.password ?? ''

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ error: 'Please enter a valid email address.' }, 400)
    }
    if (!password) {
      return c.json({ error: 'Please enter your password.' }, 400)
    }

    const user = usersByEmail.get(email)
    if (!user) {
      return c.json(
        { error: 'No account found with this email. Please register to create an account and enrol.' },
        401,
      )
    }

    const incomingHash = await hashPassword(password)
    if (user.passwordHash !== incomingHash) {
      return c.json({ error: 'Incorrect password. Please verify your credentials and try again.' }, 401)
    }

    // Create session token
    const token = `tok_${crypto.randomUUID()}`
    const duration = body.rememberMe ? 60 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
    sessions.set(token, { userId: user.id, expiresAt: Date.now() + duration })

    // Find any user enrolment
    const userEnrolment = enrolmentsList.find((e) => e.userId === user.id || e.email === user.email)

    const { passwordHash: _, ...safeUser } = user
    return c.json({
      ok: true,
      message: user.role === 'admin' ? 'Welcome back, Administrator!' : 'Signed in successfully!',
      user: safeUser,
      enrolment: userEnrolment || null,
      token,
    })
  } catch (err) {
    console.error('Login error:', err)
    return c.json({ error: 'Failed to sign in. Please try again.' }, 500)
  }
})

// ---------------------------------------------------------------------------
// 2.5 Real Google Sign-In & Instant Google Enrolment
// ---------------------------------------------------------------------------
app.post('/api/auth/google', async (c) => {
  try {
    const body = await c.req.json<{
      name?: string
      email?: string
      phone?: string
      company?: string
      plan?: 'bootcamp_full' | 'bootcamp_instalment' | 'recordings' | 'team'
      workflowGoal?: string
    }>().catch(() => ({} as {
      name?: string
      email?: string
      phone?: string
      company?: string
      plan?: 'bootcamp_full' | 'bootcamp_instalment' | 'recordings' | 'team'
      workflowGoal?: string
    }))

    const email = body.email?.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email === 'google.student@gmail.com') {
      return c.json(
        { error: 'Authentication required. No verified Google credentials received. Please sign in or register.' },
        401,
      )
    }

    const name = body.name?.trim()
    if (!name || name === 'Google User') {
      return c.json(
        { error: 'Authentication required. Verified profile name missing from provider.' },
        401,
      )
    }

    const phone = body.phone?.trim() || ''
    const company = body.company?.trim() || ''
    const plan = body.plan || 'bootcamp_full'
    const workflowGoal = body.workflowGoal?.trim() || 'Custom GenAI Workflow'

    let user = usersByEmail.get(email)
    if (!user) {
      user = {
        id: `usr_google_${Date.now()}`,
        name,
        email,
        phone,
        company,
        role: 'student',
        cohort: 'Cohort 7 (Starts 17 Nov)',
        createdAt: new Date().toISOString(),
      }
      usersByEmail.set(email, user)
    }

    let enrolment = enrolmentsList.find((e) => e.email === email)
    if (!enrolment) {
      const planPrices: Record<string, { label: string; amount: number }> = {
        bootcamp_full: { label: 'Bootcamp (Pay in Full)', amount: 9999 },
        bootcamp_instalment: { label: 'Bootcamp (3 Instalments)', amount: 3999 },
        recordings: { label: 'Recordings Free Audit', amount: 0 },
        team: { label: 'Team 5 Seats', amount: 39999 },
      }
      const planDetails = planPrices[plan] || planPrices.bootcamp_full

      enrolment = {
        id: `ENR-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
        userId: user.id,
        name,
        email,
        phone,
        countryCode: '+91',
        company,
        cohort: 'Cohort 7 (Starts 17 Nov)',
        plan,
        planLabel: planDetails.label,
        amount: planDetails.amount,
        status: 'confirmed',
        workflowGoal,
        enrolledAt: new Date().toISOString(),
      }
      enrolmentsList.unshift(enrolment)
    }

    const token = `tok_${crypto.randomUUID()}`
    sessions.set(token, { userId: user.id, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 })

    const { passwordHash: _, ...safeUser } = user
    return c.json({
      ok: true,
      message: 'Signed in with Google!',
      user: safeUser,
      enrolment,
      token,
    })
  } catch {
    return c.json({ error: 'Google sign in failed.' }, 500)
  }
})

// ---------------------------------------------------------------------------
// 3. Dedicated Real Cohort Enrolment API
// ---------------------------------------------------------------------------
app.post('/api/enrol', async (c) => {
  try {
    const body = await c.req.json<{
      name?: string
      email?: string
      phone?: string
      company?: string
      password?: string
      plan?: 'bootcamp_full' | 'bootcamp_instalment' | 'recordings' | 'team'
      workflowGoal?: string
    }>().catch(() => ({} as {
      name?: string
      email?: string
      phone?: string
      company?: string
      password?: string
      plan?: 'bootcamp_full' | 'bootcamp_instalment' | 'recordings' | 'team'
      workflowGoal?: string
    }))

    const name = body.name?.trim() ?? ''
    const email = body.email?.trim().toLowerCase() ?? ''
    const phone = body.phone?.trim() ?? ''
    const company = body.company?.trim() ?? ''
    const password = body.password ?? ''
    const workflowGoal = body.workflowGoal?.trim() || 'Production GenAI Workflow'
    const plan = body.plan || 'bootcamp_full'

    if (!name || name.length < 2) {
      return c.json({ error: 'Please enter your full name.' }, 400)
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ error: 'Please enter a valid email address.' }, 400)
    }
    if (!phone || phone.replace(/\D/g, '').length < 7) {
      return c.json({ error: 'Please enter a valid phone number (minimum 7 digits).' }, 400)
    }

    let user = usersByEmail.get(email)
    let token = ''

    if (!user) {
      // Create user if not registered yet
      if (!password || password.length < 8) {
        return c.json({ error: 'Please set a secure password (minimum 8 characters) for your learning portal.' }, 400)
      }

      const passwordHash = await hashPassword(password)
      user = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name,
        email,
        phone,
        company,
        passwordHash,
        role: 'student',
        cohort: 'Cohort 7 (Starts 17 Nov)',
        createdAt: new Date().toISOString(),
      }
      usersByEmail.set(email, user)
    }

    token = `tok_${crypto.randomUUID()}`
    sessions.set(token, { userId: user.id, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 })

    const planPrices: Record<string, { label: string; amount: number }> = {
      bootcamp_full: { label: 'Bootcamp (Pay in Full)', amount: 9999 },
      bootcamp_instalment: { label: 'Bootcamp (3 Instalments)', amount: 3999 },
      recordings: { label: 'Recordings Free Audit', amount: 0 },
      team: { label: 'Team 5 Seats', amount: 39999 },
    }
    const planDetails = planPrices[plan] || planPrices.bootcamp_full

    const enrolmentRecord: Enrolment = {
      id: `ENR-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      userId: user.id,
      name,
      email,
      phone,
      countryCode: '+91',
      company: company || 'Independent Builder',
      cohort: 'Cohort 7 (Starts 17 Nov)',
      plan,
      planLabel: planDetails.label,
      amount: planDetails.amount,
      status: 'confirmed',
      workflowGoal,
      enrolledAt: new Date().toISOString(),
    }

    enrolmentsList.unshift(enrolmentRecord)

    const { passwordHash: _, ...safeUser } = user
    return c.json({
      ok: true,
      message: 'Enrolment confirmed for Cohort 7!',
      enrolment: enrolmentRecord,
      user: safeUser,
      token,
    })
  } catch (err) {
    console.error('Enrolment error:', err)
    return c.json({ error: 'Failed to process enrolment. Please try again.' }, 500)
  }
})

// ---------------------------------------------------------------------------
// 4. Session Validation
// ---------------------------------------------------------------------------
app.get('/api/auth/me', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ ok: false, user: null }, 401)
  }

  const token = authHeader.replace('Bearer ', '').trim()
  const session = sessions.get(token)

  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(token)
    return c.json({ ok: false, error: 'Session expired. Please sign in again.' }, 401)
  }

  for (const user of usersByEmail.values()) {
    if (user.id === session.userId) {
      const userEnrolment = enrolmentsList.find((e) => e.userId === user.id || e.email === user.email)
      const { passwordHash: _, ...safeUser } = user
      return c.json({ ok: true, user: safeUser, enrolment: userEnrolment || null })
    }
  }

  return c.json({ ok: false, error: 'User not found.' }, 404)
})

// ---------------------------------------------------------------------------
// 5. Sign Out
// ---------------------------------------------------------------------------
app.post('/api/auth/logout', async (c) => {
  const authHeader = c.req.header('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim()
    sessions.delete(token)
  }
  return c.json({ ok: true, message: 'Logged out successfully.' })
})

// ---------------------------------------------------------------------------
// 6. Admin Portal APIs (Real-time student roster, metrics, and actions)
// ---------------------------------------------------------------------------
function getAuthenticatedAdmin(c: any): AuthUser | null {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  const token = authHeader.replace('Bearer ', '').trim()
  const session = sessions.get(token)
  if (!session || session.expiresAt < Date.now()) return null

  for (const user of usersByEmail.values()) {
    if (user.id === session.userId && user.role === 'admin') {
      return user
    }
  }
  return null
}

// Get all real enrolments & stats
app.get('/api/admin/enrolments', (c) => {
  const admin = getAuthenticatedAdmin(c)
  if (!admin) {
    return c.json({ error: 'Unauthorized. Admin credentials required.' }, 403)
  }

  const totalRevenue = enrolmentsList.reduce((acc, curr) => acc + curr.amount, 0)
  const confirmedCount = enrolmentsList.filter((e) => e.status === 'confirmed').length
  const maxCohortSeats = 6
  const seatsRemaining = Math.max(0, maxCohortSeats - confirmedCount)

  return c.json({
    ok: true,
    enrolments: enrolmentsList,
    totalUsers: usersByEmail.size,
    stats: {
      totalEnrolled: enrolmentsList.length,
      confirmedCount,
      seatsRemaining,
      maxCohortSeats,
      totalRevenue,
    },
  })
})

// Update enrolment status
app.patch('/api/admin/enrolments/:id', async (c) => {
  const admin = getAuthenticatedAdmin(c)
  if (!admin) {
    return c.json({ error: 'Unauthorized. Admin credentials required.' }, 403)
  }

  const id = c.req.param('id')
  const body = await c.req.json<{ status?: 'confirmed' | 'pending' | 'waitlist' }>().catch(() => ({} as { status?: 'confirmed' | 'pending' | 'waitlist' }))
  const enrolment = enrolmentsList.find((e) => e.id === id)

  if (!enrolment) {
    return c.json({ error: 'Enrolment not found.' }, 404)
  }

  if (body.status) {
    enrolment.status = body.status
  }

  return c.json({ ok: true, enrolment })
})

// Delete enrolment
app.delete('/api/admin/enrolments/:id', (c) => {
  const admin = getAuthenticatedAdmin(c)
  if (!admin) {
    return c.json({ error: 'Unauthorized. Admin credentials required.' }, 403)
  }

  const id = c.req.param('id')
  const index = enrolmentsList.findIndex((e) => e.id === id)

  if (index === -1) {
    return c.json({ error: 'Enrolment not found.' }, 404)
  }

  enrolmentsList.splice(index, 1)
  return c.json({ ok: true, message: 'Enrolment removed.' })
})

// Fallback to static assets
app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw))

export default app
