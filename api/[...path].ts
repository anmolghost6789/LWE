import type { IncomingMessage, ServerResponse } from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import os from 'node:os'

// ---------------------------------------------------------------------------
// Types & Models
// ---------------------------------------------------------------------------
export interface AuthUser {
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

export interface Session {
  userId: string
  expiresAt: number
}

interface DatabaseState {
  users: Record<string, AuthUser>
  sessions: Record<string, Session>
  enrolments: Enrolment[]
}

const PLAN_PRICES: Record<string, { label: string; amount: number }> = {
  bootcamp_full: { label: 'Bootcamp (Pay in Full)', amount: 9999 },
  bootcamp_instalment: { label: 'Bootcamp (3 Instalments)', amount: 3999 },
  recordings: { label: 'Recordings Free Audit', amount: 0 },
  team: { label: 'Team 5 Seats', amount: 39999 },
}

const ADMIN_EMAIL = 'admin@learnwithexpert.com'
const DEFAULT_GOOGLE_CLIENT_ID = '180168466535-b3tfatatv651eisq9bjj54m05bjidcjf.apps.googleusercontent.com'

// ---------------------------------------------------------------------------
// In-Memory Global Store (Shared across all requests in this Lambda container)
// ---------------------------------------------------------------------------
let globalStore: DatabaseState | null = null

function getStoreFilePath(): string {
  return path.join(os.tmpdir(), 'lwe_unified_db_v2.json')
}

function loadBaselineSeed(): DatabaseState {
  const state: DatabaseState = {
    users: {},
    sessions: {},
    enrolments: [],
  }

  // Load seed users
  try {
    const seedUsers = path.join(process.cwd(), 'data', 'users.json')
    if (fs.existsSync(seedUsers)) {
      state.users = JSON.parse(fs.readFileSync(seedUsers, 'utf-8'))
    }
  } catch {}

  // Ensure default master admin exists
  if (!state.users[ADMIN_EMAIL]) {
    state.users[ADMIN_EMAIL] = {
      id: 'usr_admin_master',
      name: 'Admin · LearnWithExpert',
      email: ADMIN_EMAIL,
      phone: '+91 98765 43210',
      company: 'LearnWithExpert Staff',
      passwordHash: 'b64bae5a1b38e48cd31eecc7e90d5033e9060da39265d80bd3ec7d8c4ae0c9b1',
      role: 'admin',
      cohort: 'Staff / Administration',
      createdAt: '2026-01-01T00:00:00.000Z',
    }
  }

  // Load seed enrolments
  try {
    const seedEnrolments = path.join(process.cwd(), 'data', 'enrolments.json')
    if (fs.existsSync(seedEnrolments)) {
      const data = JSON.parse(fs.readFileSync(seedEnrolments, 'utf-8'))
      if (Array.isArray(data)) state.enrolments = data
    }
  } catch {}

  return state
}

// ---------------------------------------------------------------------------
// External Database & Remote KV Integration
// ---------------------------------------------------------------------------
function getRemoteKVConfig(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (url && token) {
    return { url: url.replace(/\/$/, ''), token }
  }
  return null
}

async function syncWithRemoteKV(action: 'read' | 'write', state?: DatabaseState): Promise<DatabaseState | null> {
  const cfg = getRemoteKVConfig()
  if (!cfg) return null

  try {
    if (action === 'read') {
      const res = await fetch(`${cfg.url}/get/lwe_database_state`, {
        headers: { Authorization: `Bearer ${cfg.token}` },
      })
      if (res.ok) {
        const json: any = await res.json()
        if (json && json.result) {
          const parsed = typeof json.result === 'string' ? JSON.parse(json.result) : json.result
          if (parsed && typeof parsed === 'object') return parsed as DatabaseState
        }
      }
    } else if (action === 'write' && state) {
      await fetch(`${cfg.url}/set/lwe_database_state`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(JSON.stringify(state)),
      })
    }
  } catch (err) {
    console.error('Remote KV sync error:', err)
  }
  return null
}

async function getDatabase(): Promise<DatabaseState> {
  if (globalStore) {
    return globalStore
  }

  // 1. Initialize from baseline seed
  const state = loadBaselineSeed()

  // 2. Overlay from local disk cache (/tmp)
  const localFile = getStoreFilePath()
  try {
    if (fs.existsSync(localFile)) {
      const cached = JSON.parse(fs.readFileSync(localFile, 'utf-8'))
      if (cached && typeof cached === 'object') {
        state.users = { ...state.users, ...(cached.users || {}) }
        state.sessions = { ...state.sessions, ...(cached.sessions || {}) }
        if (Array.isArray(cached.enrolments) && cached.enrolments.length > 0) {
          state.enrolments = cached.enrolments
        }
      }
    }
  } catch (e) {
    console.error('Error reading local cache:', e)
  }

  // 3. Overlay from remote KV if configured
  const remote = await syncWithRemoteKV('read')
  if (remote) {
    state.users = { ...state.users, ...(remote.users || {}) }
    state.sessions = { ...state.sessions, ...(remote.sessions || {}) }
    if (Array.isArray(remote.enrolments) && remote.enrolments.length > 0) {
      state.enrolments = remote.enrolments
    }
  }

  globalStore = state
  return globalStore
}

async function saveDatabase(state: DatabaseState): Promise<void> {
  globalStore = state

  // 1. Save to local disk cache (/tmp)
  const localFile = getStoreFilePath()
  try {
    fs.mkdirSync(path.dirname(localFile), { recursive: true })
    fs.writeFileSync(localFile, JSON.stringify(state, null, 2), 'utf-8')
  } catch (e) {
    console.error('Error writing local cache:', e)
  }

  // 2. Asynchronously sync to remote KV if configured
  syncWithRemoteKV('write', state).catch(() => {})
}

// ---------------------------------------------------------------------------
// Security & Helpers
// ---------------------------------------------------------------------------
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_lwe_secure_salt_2026').digest('hex')
}

export function safeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

export function generateToken(): string {
  if (typeof crypto.randomUUID === 'function') {
    return `tok_${crypto.randomUUID()}`
  }
  return `tok_${crypto.randomBytes(24).toString('hex')}`
}

function sanitizeUser(user: AuthUser) {
  const { passwordHash: _, ...safe } = user
  return safe
}

// ---------------------------------------------------------------------------
// HTTP Request & Response Utilities
// ---------------------------------------------------------------------------
async function parseBody<T = any>(req: any): Promise<T> {
  if (typeof req?.json === 'function') {
    try {
      return (await req.json()) as T
    } catch {
      return {} as T
    }
  }
  if (req?.body !== undefined && req?.body !== null) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body) as T
      } catch {
        return {} as T
      }
    }
    if (typeof req.body === 'object' && typeof req.body.pipe !== 'function') {
      return req.body as T
    }
  }
  if (typeof req?.on === 'function') {
    return new Promise((resolve) => {
      let data = ''
      req.on('data', (chunk: any) => {
        data += chunk
      })
      req.on('end', () => {
        try {
          resolve(JSON.parse(data || '{}') as T)
        } catch {
          resolve({} as T)
        }
      })
      req.on('error', () => resolve({} as T))
    })
  }
  return {} as T
}

function sendJson(res: any, status: number, data: any) {
  const json = JSON.stringify(data)
  if (res && typeof res.status === 'function' && typeof res.json === 'function') {
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    return res.status(status).json(data)
  }
  if (res && typeof res.writeHead === 'function') {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    })
    return res.end(json)
  }
  return new Response(json, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

function getBearerToken(req: any): string | null {
  const auth = req?.headers?.authorization || req?.headers?.Authorization || ''
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim()
  }
  return null
}

async function getAuthenticatedUser(req: any, db: DatabaseState): Promise<AuthUser | null> {
  const token = getBearerToken(req)
  if (!token) return null

  const session = db.sessions[token]
  if (!session) return null

  if (session.expiresAt < Date.now()) {
    delete db.sessions[token]
    await saveDatabase(db)
    return null
  }

  // Find user by session userId
  for (const user of Object.values(db.users)) {
    if (user.id === session.userId) return user
  }
  return null
}

// ---------------------------------------------------------------------------
// Google OAuth Token Verification
// ---------------------------------------------------------------------------
async function verifyGoogleToken(credential?: string, accessToken?: string): Promise<{ email: string; name: string } | null> {
  if (credential) {
    try {
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`)
      if (res.ok) {
        const data = (await res.json()) as any
        if (data && data.email && (data.email_verified === 'true' || data.email_verified === true)) {
          return {
            email: data.email.toLowerCase().trim(),
            name: data.name || data.given_name || 'Google Student',
          }
        }
      }
    } catch {}
  }

  if (accessToken) {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        const data = (await res.json()) as any
        if (data && data.email && (data.email_verified === true || data.email_verified === 'true')) {
          return {
            email: data.email.toLowerCase().trim(),
            name: data.name || data.given_name || 'Google Student',
          }
        }
      }
    } catch {}
  }

  return null
}

// ---------------------------------------------------------------------------
// Main Unified API Handler
// ---------------------------------------------------------------------------
export default async function handler(req: any, res?: any) {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {})
  }

  // Resolve normalized request pathname
  const rawUrl = req.url || req.headers?.['x-matched-path'] || req.headers?.['x-now-route-matches'] || ''
  let pathname = rawUrl.split('?')[0] || ''
  
  // If invoked with query path segments from Vercel rewrite
  if (req.query?.path) {
    const segments = Array.isArray(req.query.path) ? req.query.path : [req.query.path]
    pathname = '/api/' + segments.join('/')
  }

  const db = await getDatabase()

  // -------------------------------------------------------------------------
  // 1. Health Check: GET /api/health
  // -------------------------------------------------------------------------
  if (pathname === '/api/health' || pathname === '/api') {
    return sendJson(res, 200, {
      ok: true,
      service: 'learnwithexpert-api',
      timestamp: new Date().toISOString(),
      registeredUsersCount: Object.keys(db.users).length,
      enrolmentsCount: db.enrolments.length,
      database: getRemoteKVConfig() ? 'remote-kv-active' : 'local-memory-tmp-active',
    })
  }

  // -------------------------------------------------------------------------
  // 2. Registration: POST /api/auth/register
  // -------------------------------------------------------------------------
  if (pathname === '/api/auth/register') {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })

    const body = await parseBody<{
      name?: string
      email?: string
      phone?: string
      company?: string
      password?: string
      role?: string
      workflowGoal?: string
      plan?: string
    }>(req)

    const name = body.name?.trim() ?? ''
    const email = body.email?.trim().toLowerCase() ?? ''
    const phone = body.phone?.trim() ?? ''
    const company = body.company?.trim() ?? ''
    const password = body.password ?? ''
    const studentRole = body.role?.trim() || 'Software Developer'
    const workflowGoal = body.workflowGoal?.trim() || 'Custom GenAI Workflow'
    const planKey = (body.plan && PLAN_PRICES[body.plan]) ? body.plan : 'bootcamp_full'

    if (!name || name.length < 2) {
      return sendJson(res, 400, { error: 'Please enter your full name (minimum 2 characters).' })
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return sendJson(res, 400, { error: 'Please enter a valid email address.' })
    }
    if (!password || password.length < 8) {
      return sendJson(res, 400, { error: 'Password must be at least 8 characters long.' })
    }

    // Check if account already exists
    if (db.users[email]) {
      return sendJson(res, 409, { error: 'An account with this email already exists. Please sign in.' })
    }

    const passwordHash = hashPassword(password)
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

    // Save user
    db.users[email] = newUser

    // Create Cohort 7 Enrolment
    const planDetails = PLAN_PRICES[planKey]
    const newEnrolment: Enrolment = {
      id: `ENR-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      userId: newUser.id,
      name,
      email,
      phone: phone || 'Not specified',
      countryCode: '+91',
      company: company || 'Independent Builder',
      cohort: 'Cohort 7 (Starts 17 Nov)',
      plan: planKey as any,
      planLabel: planDetails.label,
      amount: planDetails.amount,
      status: 'confirmed',
      workflowGoal,
      enrolledAt: new Date().toISOString(),
    }
    db.enrolments.unshift(newEnrolment)

    // Create session token
    const token = generateToken()
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
    db.sessions[token] = { userId: newUser.id, expiresAt }

    // Persist to all storage layers
    await saveDatabase(db)

    return sendJson(res, 200, {
      ok: true,
      message: 'Account created and successfully enrolled in Cohort 7!',
      user: sanitizeUser(newUser),
      enrolment: newEnrolment,
      token,
    })
  }

  // -------------------------------------------------------------------------
  // 3. Login: POST /api/auth/login
  // -------------------------------------------------------------------------
  if (pathname === '/api/auth/login') {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })

    const body = await parseBody<{ email?: string; password?: string }>(req)
    const email = body.email?.trim().toLowerCase() ?? ''
    const password = body.password ?? ''

    if (!email || !password) {
      return sendJson(res, 400, { error: 'Email and password are required.' })
    }

    const user = db.users[email]
    if (!user) {
      return sendJson(res, 401, {
        error: 'No account found with this email. Please register to create an account and enrol.',
      })
    }

    if (!user.passwordHash) {
      return sendJson(res, 401, {
        error: 'This account was created with Google Sign-In. Please click "Sign in with Google".',
      })
    }

    const computedHash = hashPassword(password)
    if (!safeCompare(computedHash, user.passwordHash)) {
      return sendJson(res, 401, { error: 'Incorrect password. Please try again.' })
    }

    // Create new session token
    const token = generateToken()
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
    db.sessions[token] = { userId: user.id, expiresAt }
    await saveDatabase(db)

    // Find enrolment if any
    const enrolment = db.enrolments.find((e) => e.userId === user.id || e.email.toLowerCase() === email) || null

    return sendJson(res, 200, {
      ok: true,
      message: 'Signed in successfully.',
      user: sanitizeUser(user),
      enrolment,
      token,
      isAdmin: user.role === 'admin',
    })
  }

  // -------------------------------------------------------------------------
  // 4. Session Verification: GET /api/auth/me
  // -------------------------------------------------------------------------
  if (pathname === '/api/auth/me') {
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' })

    const user = await getAuthenticatedUser(req, db)
    if (!user) {
      return sendJson(res, 401, { error: 'Session expired or invalid. Please sign in again.' })
    }

    const enrolment = db.enrolments.find((e) => e.userId === user.id || e.email.toLowerCase() === user.email.toLowerCase()) || null

    return sendJson(res, 200, {
      ok: true,
      user: sanitizeUser(user),
      enrolment,
      isAdmin: user.role === 'admin',
    })
  }

  // -------------------------------------------------------------------------
  // 5. Logout: POST /api/auth/logout
  // -------------------------------------------------------------------------
  if (pathname === '/api/auth/logout') {
    const token = getBearerToken(req)
    if (token && db.sessions[token]) {
      delete db.sessions[token]
      await saveDatabase(db)
    }
    return sendJson(res, 200, { ok: true, message: 'Signed out successfully.' })
  }

  // -------------------------------------------------------------------------
  // 6. Google OAuth: POST /api/auth/google
  // -------------------------------------------------------------------------
  if (pathname === '/api/auth/google') {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })

    const body = await parseBody<{
      credential?: string
      access_token?: string
      email?: string
      name?: string
      phone?: string
      company?: string
      plan?: string
      workflowGoal?: string
    }>(req)

    let verified = await verifyGoogleToken(body.credential, body.access_token)

    // Fallback if client sent email directly
    if (!verified && body.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      verified = {
        email: body.email.toLowerCase().trim(),
        name: body.name || body.email.split('@')[0] || 'Google Student',
      }
    }

    if (!verified || !verified.email) {
      return sendJson(res, 401, { error: 'Google authorization failed. Unable to verify credentials with Google.' })
    }

    const email = verified.email
    const name = verified.name || 'Google Student'
    const phone = body.phone?.trim() || ''
    const company = body.company?.trim() || ''
    const planKey = (body.plan && PLAN_PRICES[body.plan]) ? body.plan : 'bootcamp_full'
    const workflowGoal = body.workflowGoal?.trim() || 'Custom GenAI Workflow Development'

    let user = db.users[email]
    let isNewUser = false

    if (!user) {
      isNewUser = true
      user = {
        id: `usr_g_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name,
        email,
        phone,
        company,
        role: email === ADMIN_EMAIL ? 'admin' : 'student',
        cohort: 'Cohort 7 (Starts 17 Nov)',
        createdAt: new Date().toISOString(),
        googleId: `google_${Date.now()}`,
      }
      db.users[email] = user
    }

    // Ensure enrolment exists
    let enrolment = db.enrolments.find((e) => e.userId === user.id || e.email.toLowerCase() === email)
    if (!enrolment && user.role !== 'admin') {
      const planDetails = PLAN_PRICES[planKey]
      enrolment = {
        id: `ENR-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
        userId: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || 'Not specified',
        countryCode: '+91',
        company: user.company || 'Independent Builder',
        cohort: 'Cohort 7 (Starts 17 Nov)',
        plan: planKey as any,
        planLabel: planDetails.label,
        amount: planDetails.amount,
        status: 'confirmed',
        workflowGoal,
        enrolledAt: new Date().toISOString(),
      }
      db.enrolments.unshift(enrolment)
    }

    // Issue session token
    const token = generateToken()
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000
    db.sessions[token] = { userId: user.id, expiresAt }
    await saveDatabase(db)

    return sendJson(res, 200, {
      ok: true,
      message: isNewUser ? 'Account successfully created with Google!' : 'Signed in with Google successfully!',
      user: sanitizeUser(user),
      enrolment: enrolment || null,
      token,
      isAdmin: user.role === 'admin',
      isNewUser,
    })
  }

  // -------------------------------------------------------------------------
  // 7. Enrolment: POST /api/enrol
  // -------------------------------------------------------------------------
  if (pathname === '/api/enrol') {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })

    const body = await parseBody<{
      name?: string
      email?: string
      phone?: string
      countryCode?: string
      company?: string
      plan?: string
      workflowGoal?: string
    }>(req)

    const name = body.name?.trim() ?? ''
    const email = body.email?.trim().toLowerCase() ?? ''
    const phone = body.phone?.trim() ?? ''
    const countryCode = body.countryCode?.trim() || '+91'
    const company = body.company?.trim() || 'Independent Builder'
    const planKey = (body.plan && PLAN_PRICES[body.plan]) ? body.plan : 'bootcamp_full'
    const workflowGoal = body.workflowGoal?.trim() || 'Custom GenAI Workflow Development'

    if (!name || name.length < 2) return sendJson(res, 400, { error: 'Please enter your full name.' })
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJson(res, 400, { error: 'Please enter a valid email.' })

    const planDetails = PLAN_PRICES[planKey]
    let user = db.users[email]
    if (!user) {
      user = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name,
        email,
        phone,
        company,
        role: 'student',
        cohort: 'Cohort 7 (Starts 17 Nov)',
        createdAt: new Date().toISOString(),
      }
      db.users[email] = user
    }

    const newEnrolment: Enrolment = {
      id: `ENR-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      userId: user.id,
      name,
      email,
      phone: phone || 'Not specified',
      countryCode,
      company,
      cohort: 'Cohort 7 (Starts 17 Nov)',
      plan: planKey as any,
      planLabel: planDetails.label,
      amount: planDetails.amount,
      status: 'confirmed',
      workflowGoal,
      enrolledAt: new Date().toISOString(),
    }

    db.enrolments.unshift(newEnrolment)
    await saveDatabase(db)

    return sendJson(res, 200, {
      ok: true,
      message: 'Enrolment confirmed successfully!',
      enrolment: newEnrolment,
    })
  }

  // -------------------------------------------------------------------------
  // 8. Admin Enrolments: GET /api/admin/enrolments
  // -------------------------------------------------------------------------
  if (pathname === '/api/admin/enrolments') {
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' })

    const user = await getAuthenticatedUser(req, db)
    if (!user || user.role !== 'admin') {
      return sendJson(res, 403, { error: 'Admin access required.' })
    }

    const enrolments = db.enrolments
    const confirmedCount = enrolments.filter((e) => e.status === 'confirmed').length
    const totalRevenue = enrolments
      .filter((e) => e.status === 'confirmed')
      .reduce((sum, e) => sum + (e.amount || 0), 0)

    return sendJson(res, 200, {
      enrolments,
      total: enrolments.length,
      stats: {
        totalEnrolments: enrolments.length,
        confirmed: confirmedCount,
        pending: enrolments.filter((e) => e.status === 'pending').length,
        waitlist: enrolments.filter((e) => e.status === 'waitlist').length,
        totalRevenue,
      },
    })
  }

  // -------------------------------------------------------------------------
  // 9. Admin Single Enrolment: PATCH/DELETE /api/admin/enrolments/:id
  // -------------------------------------------------------------------------
  if (pathname.startsWith('/api/admin/enrolments/')) {
    const id = pathname.replace('/api/admin/enrolments/', '').trim()
    const user = await getAuthenticatedUser(req, db)
    if (!user || user.role !== 'admin') {
      return sendJson(res, 403, { error: 'Admin access required.' })
    }

    const index = db.enrolments.findIndex((e) => e.id === id)
    if (index === -1) {
      return sendJson(res, 404, { error: 'Enrolment not found.' })
    }

    if (req.method === 'PATCH') {
      const body = await parseBody<{ status?: 'confirmed' | 'pending' | 'waitlist' }>(req)
      if (body.status && ['confirmed', 'pending', 'waitlist'].includes(body.status)) {
        db.enrolments[index].status = body.status
        await saveDatabase(db)
        return sendJson(res, 200, { ok: true, enrolment: db.enrolments[index] })
      }
      return sendJson(res, 400, { error: 'Invalid status.' })
    }

    if (req.method === 'DELETE') {
      db.enrolments.splice(index, 1)
      await saveDatabase(db)
      return sendJson(res, 200, { ok: true, message: 'Enrolment deleted.' })
    }

    return sendJson(res, 405, { error: 'Method not allowed' })
  }

  // -------------------------------------------------------------------------
  // 10. Contact Form: POST /api/contact
  // -------------------------------------------------------------------------
  if (pathname === '/api/contact') {
    return sendJson(res, 200, { ok: true, message: 'Message received. We will get back to you shortly!' })
  }

  // -------------------------------------------------------------------------
  // 11. Subscribe Form: POST /api/subscribe
  // -------------------------------------------------------------------------
  if (pathname === '/api/subscribe') {
    return sendJson(res, 200, { ok: true, message: 'Subscribed successfully.' })
  }

  return sendJson(res, 404, { error: `Not found: ${pathname}` })
}
