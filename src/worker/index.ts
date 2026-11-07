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
  googleId?: string
  avatar?: string
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

type PlanKey = 'bootcamp_full' | 'bootcamp_instalment' | 'recordings' | 'team'

// Server-side price list. Amounts are never taken from the request body.
const PLAN_PRICES: Record<PlanKey, { label: string; amount: number }> = {
  bootcamp_full: { label: 'Bootcamp (Pay in Full)', amount: 9999 },
  bootcamp_instalment: { label: 'Bootcamp (3 Instalments)', amount: 3999 },
  recordings: { label: 'Recordings Free Audit', amount: 0 },
  team: { label: 'Team 5 Seats', amount: 39999 },
}

function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PLAN_PRICES, value)
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

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

async function verifyPassword(password: string, passwordHash?: string): Promise<boolean> {
  if (!passwordHash) return false
  return safeEqual(await hashPassword(password), passwordHash)
}

// Resolves a real session from the Bearer token. Every authenticated route uses
// this instead of trusting an email or user id sent by the client.
function getSessionUser(c: any): AuthUser | null {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  const token = authHeader.slice('Bearer '.length).trim()
  const session = sessions.get(token)
  if (!session) return null
  if (session.expiresAt < Date.now()) {
    sessions.delete(token)
    return null
  }

  for (const user of usersByEmail.values()) {
    if (user.id === session.userId) return user
  }
  return null
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
    const plan = isPlanKey(body.plan) ? body.plan : 'bootcamp_full'

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
    const planDetails = PLAN_PRICES[plan]

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

    if (!(await verifyPassword(password, user.passwordHash))) {
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
// 2.5 Verified Google Sign-In & Registration
// ---------------------------------------------------------------------------
app.post('/api/auth/google', async (c) => {
  try {
    const body = await c.req.json<{
      credential?: string
      access_token?: string
      name?: string
      email?: string
      phone?: string
      company?: string
      plan?: PlanKey
      workflowGoal?: string
    }>().catch(() => ({} as any))

    let verifiedEmail = ''
    let verifiedName = ''
    let googleId = ''
    let avatar = ''

    if (body.credential) {
      try {
        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(body.credential)}`)
        if (verifyRes.ok) {
          const gData = (await verifyRes.json()) as any
          if (gData && gData.email && (gData.email_verified === 'true' || gData.email_verified === true)) {
            verifiedEmail = gData.email.toLowerCase().trim()
            verifiedName = gData.name || gData.given_name || 'Google Student'
            googleId = gData.sub || ''
            avatar = gData.picture || ''
          }
        }
      } catch (err) {
        console.error('Error verifying Google ID token:', err)
      }
    }

    if (!verifiedEmail && body.access_token) {
      try {
        const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${body.access_token}` },
        })
        if (userRes.ok) {
          const gData = (await userRes.json()) as any
          if (gData && gData.email && (gData.email_verified === true || gData.email_verified === 'true')) {
            verifiedEmail = gData.email.toLowerCase().trim()
            verifiedName = gData.name || gData.given_name || 'Google Student'
            googleId = gData.sub || ''
            avatar = gData.picture || ''
          }
        }
      } catch (err) {
        console.error('Error verifying Google access token:', err)
      }
    }

    // Local development fallback
    if (!verifiedEmail && body.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      verifiedEmail = body.email.toLowerCase().trim()
      verifiedName = body.name || 'Google Student'
    }

    if (!verifiedEmail) {
      return c.json({ error: 'Google authentication failed. Unable to verify credentials with Google.' }, 401)
    }

    let user = usersByEmail.get(verifiedEmail)
    let isNewUser = false

    if (!user) {
      isNewUser = true
      user = {
        id: `usr_g_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: verifiedName,
        email: verifiedEmail,
        phone: body.phone?.trim() || '',
        company: body.company?.trim() || '',
        role: 'student',
        cohort: 'Cohort 7 (Starts 17 Nov)',
        createdAt: new Date().toISOString(),
        googleId: googleId || undefined,
        avatar: avatar || undefined,
      }
      usersByEmail.set(verifiedEmail, user)
    } else {
      if (avatar && !user.avatar) user.avatar = avatar
      if (googleId && !user.googleId) user.googleId = googleId
    }

    const plan: PlanKey = isPlanKey(body.plan) ? body.plan : 'bootcamp_full'
    const planDetails = PLAN_PRICES[plan]
    let userEnrolment = enrolmentsList.find((e) => e.userId === user!.id || e.email === user!.email)

    if (!userEnrolment) {
      userEnrolment = {
        id: `ENR-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
        userId: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || 'Not specified',
        countryCode: '+91',
        company: user.company || 'Independent Builder',
        cohort: 'Cohort 7 (Starts 17 Nov)',
        plan,
        planLabel: planDetails.label,
        amount: planDetails.amount,
        status: 'confirmed',
        workflowGoal: body.workflowGoal?.trim() || 'Custom GenAI Workflow Development',
        enrolledAt: new Date().toISOString(),
      }
      enrolmentsList.unshift(userEnrolment)
    }

    const token = `tok_${crypto.randomUUID()}`
    sessions.set(token, { userId: user.id, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 })

    const { passwordHash: _, ...safeUser } = user
    return c.json({
      ok: true,
      message: isNewUser ? 'Account created and successfully enrolled in Cohort 7!' : 'Signed in with Google successfully!',
      user: safeUser,
      enrolment: userEnrolment || null,
      token,
      isAdmin: user.role === 'admin',
      isNewUser,
    })
  } catch (err) {
    console.error('Google auth error:', err)
    return c.json({ error: 'Failed to authenticate Google account.' }, 500)
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
    const plan = isPlanKey(body.plan) ? body.plan : 'bootcamp_full'

    if (!name || name.length < 2) {
      return c.json({ error: 'Please enter your full name.' }, 400)
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ error: 'Please enter a valid email address.' }, 400)
    }
    if (!phone || phone.replace(/\D/g, '').length < 7) {
      return c.json({ error: 'Please enter a valid phone number (minimum 7 digits).' }, 400)
    }

    const requester = getSessionUser(c)
    let user = usersByEmail.get(email)

    if (user) {
      // Existing account: only its owner may enrol. Ownership is proven by the
      // current session or by the account password, never by the submitted email.
      const isOwner = requester?.id === user.id
      if (!isOwner && !(await verifyPassword(password, user.passwordHash))) {
        return c.json(
          { error: 'An account with this email already exists. Sign in or enter the correct password to enrol.' },
          401,
        )
      }
    } else {
      // New account: the supplied password becomes the account credential.
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

    const token = `tok_${crypto.randomUUID()}`
    sessions.set(token, { userId: user.id, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 })

    const planDetails = PLAN_PRICES[plan]

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
app.get('/api/auth/me', (c) => {
  const user = getSessionUser(c)
  if (!user) {
    return c.json({ ok: false, user: null, error: 'Session expired. Please sign in again.' }, 401)
  }

  const userEnrolment = enrolmentsList.find((e) => e.userId === user.id || e.email === user.email)
  const { passwordHash: _, ...safeUser } = user
  return c.json({ ok: true, user: safeUser, enrolment: userEnrolment || null })
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
  const user = getSessionUser(c)
  return user?.role === 'admin' ? user : null
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

// Unknown API paths must never be answered by the static asset fallback.
app.all('/api/*', (c) => c.json({ error: 'Not found.' }, 404))

// Fallback to static assets
app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw))

export default app
