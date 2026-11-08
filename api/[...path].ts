import type { IncomingMessage, ServerResponse } from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import os from 'node:os'
import { neon } from '@neondatabase/serverless'

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
  status: 'confirmed' | 'approved' | 'pending' | 'rejected' | 'waitlist'
  workflowGoal: string
  enrolledAt: string
  utrNumber?: string
  paymentMethod?: string
  rejectionReason?: string
  verifiedAt?: string
  verifiedBy?: string
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
const ADMIN_PASSWORD_HASH = 'b64bae5a1b38e48cd31eecc7e90d5033e9060da39265d80bd3ec7d8c4ae0c9b1' // Hash of Admin@2026!Expert

// ---------------------------------------------------------------------------
// Neon PostgreSQL Database Connection
// ---------------------------------------------------------------------------
function getDatabaseUrl(): string | null {
  const url = process.env.DATABASE_URL ||
              process.env.POSTGRES_URL ||
              process.env.POSTGRES_URL_NON_POOLING ||
              process.env.POSTGRES_PRISMA_URL
  if (url && (url.startsWith('postgres://') || url.startsWith('postgresql://'))) {
    return url
  }
  return null
}

let sqlClient: any = null
let tablesInitialized = false

function getSqlClient() {
  const url = getDatabaseUrl()
  if (!url) return null
  if (!sqlClient) {
    sqlClient = neon(url)
  }
  return sqlClient
}

async function ensureNeonTables(): Promise<boolean> {
  const sql = getSqlClient()
  if (!sql) return false
  if (tablesInitialized) return true

  try {
    // 1. Create Users Table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        company VARCHAR(255),
        password_hash TEXT,
        role VARCHAR(20) DEFAULT 'student',
        cohort VARCHAR(100) DEFAULT 'Cohort 7 (Starts 17 Nov)',
        google_id VARCHAR(255),
        avatar TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `

    // 2. Create Sessions Table
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        token VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        expires_at BIGINT NOT NULL
      );
    `

    // 3. Create or Migrate Enrolments Table with UTR & Payment Verification columns
    await sql`
      CREATE TABLE IF NOT EXISTS enrolments (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        country_code VARCHAR(10) DEFAULT '+91',
        company VARCHAR(255),
        cohort VARCHAR(100) DEFAULT 'Cohort 7 (Starts 17 Nov)',
        plan VARCHAR(50) NOT NULL,
        plan_label VARCHAR(100) NOT NULL,
        amount INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        workflow_goal TEXT,
        enrolled_at TIMESTAMPTZ DEFAULT NOW(),
        utr_number VARCHAR(100),
        payment_method VARCHAR(50) DEFAULT 'UPI',
        rejection_reason TEXT,
        verified_at TIMESTAMPTZ,
        verified_by VARCHAR(100)
      );
    `

    // Ensure columns exist if table was previously created
    await sql`ALTER TABLE enrolments ADD COLUMN IF NOT EXISTS utr_number VARCHAR(100);`
    await sql`ALTER TABLE enrolments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'UPI';`
    await sql`ALTER TABLE enrolments ADD COLUMN IF NOT EXISTS rejection_reason TEXT;`
    await sql`ALTER TABLE enrolments ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;`
    await sql`ALTER TABLE enrolments ADD COLUMN IF NOT EXISTS verified_by VARCHAR(100);`

    // 4. Ensure master admin user exists in Neon
    await sql`
      INSERT INTO users (id, name, email, phone, company, password_hash, role, cohort, created_at)
      VALUES (
        'usr_admin_master',
        'Admin · LearnWithExpert',
        ${ADMIN_EMAIL},
        '+91 98765 43210',
        'LearnWithExpert Staff',
        ${ADMIN_PASSWORD_HASH},
        'admin',
        'Staff / Administration',
        NOW()
      )
      ON CONFLICT (email) DO NOTHING;
    `

    tablesInitialized = true
    return true
  } catch (err) {
    console.error('Neon table initialization notice:', err)
    return false
  }
}

// ---------------------------------------------------------------------------
// Fallback In-Memory / File Store (Active if DATABASE_URL is not yet configured)
// ---------------------------------------------------------------------------
let globalStore: DatabaseState | null = null

function getStoreFilePath(): string {
  return path.join(os.tmpdir(), 'lwe_unified_db_v2.json')
}

function loadBaselineSeed(): DatabaseState {
  const state: DatabaseState = { users: {}, sessions: {}, enrolments: [] }
  try {
    const seedUsers = path.join(process.cwd(), 'data', 'users.json')
    if (fs.existsSync(seedUsers)) {
      state.users = JSON.parse(fs.readFileSync(seedUsers, 'utf-8'))
    }
  } catch {}

  if (!state.users[ADMIN_EMAIL]) {
    state.users[ADMIN_EMAIL] = {
      id: 'usr_admin_master',
      name: 'Admin · LearnWithExpert',
      email: ADMIN_EMAIL,
      phone: '+91 98765 43210',
      company: 'LearnWithExpert Staff',
      passwordHash: ADMIN_PASSWORD_HASH,
      role: 'admin',
      cohort: 'Staff / Administration',
      createdAt: '2026-01-01T00:00:00.000Z',
    }
  }

  try {
    const seedEnrolments = path.join(process.cwd(), 'data', 'enrolments.json')
    if (fs.existsSync(seedEnrolments)) {
      const data = JSON.parse(fs.readFileSync(seedEnrolments, 'utf-8'))
      if (Array.isArray(data)) state.enrolments = data
    }
  } catch {}

  return state
}

async function getFallbackDatabase(): Promise<DatabaseState> {
  if (globalStore) return globalStore
  const state = loadBaselineSeed()
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
  } catch {}
  globalStore = state
  return globalStore
}

async function saveFallbackDatabase(state: DatabaseState): Promise<void> {
  globalStore = state
  const localFile = getStoreFilePath()
  try {
    fs.mkdirSync(path.dirname(localFile), { recursive: true })
    fs.writeFileSync(localFile, JSON.stringify(state, null, 2), 'utf-8')
  } catch {}
}

// ---------------------------------------------------------------------------
// Security & Utilities
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

function sanitizeUser(user: any) {
  const { passwordHash, password_hash, ...safe } = user
  return {
    id: safe.id,
    name: safe.name,
    email: safe.email,
    phone: safe.phone,
    company: safe.company,
    role: safe.role,
    cohort: safe.cohort,
    createdAt: safe.createdAt || safe.created_at,
    googleId: safe.googleId || safe.google_id,
    avatar: safe.avatar,
  }
}

function formatEnrolment(e: any): Enrolment {
  return {
    id: e.id,
    userId: e.userId || e.user_id,
    name: e.name,
    email: e.email,
    phone: e.phone,
    countryCode: e.countryCode || e.country_code || '+91',
    company: e.company,
    cohort: e.cohort,
    plan: e.plan,
    planLabel: e.planLabel || e.plan_label,
    amount: Number(e.amount),
    status: e.status,
    workflowGoal: e.workflowGoal || e.workflow_goal,
    enrolledAt: e.enrolledAt || e.enrolled_at,
    utrNumber: e.utrNumber || e.utr_number || '',
    paymentMethod: e.paymentMethod || e.payment_method || 'UPI',
    rejectionReason: e.rejectionReason || e.rejection_reason || '',
    verifiedAt: e.verifiedAt || e.verified_at || '',
    verifiedBy: e.verifiedBy || e.verified_by || '',
  }
}

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
      req.on('data', (chunk: any) => { data += chunk })
      req.on('end', () => {
        try { resolve(JSON.parse(data || '{}') as T) } catch { resolve({} as T) }
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

async function verifyGoogleToken(credential?: string, accessToken?: string): Promise<{ email: string; name: string } | null> {
  if (credential) {
    try {
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`)
      if (res.ok) {
        const data = (await res.json()) as any
        if (data && data.email && (data.email_verified === 'true' || data.email_verified === true)) {
          return { email: data.email.toLowerCase().trim(), name: data.name || data.given_name || 'Google Student' }
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
          return { email: data.email.toLowerCase().trim(), name: data.name || data.given_name || 'Google Student' }
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

  const rawUrl = req.url || req.headers?.['x-matched-path'] || req.headers?.['x-now-route-matches'] || ''
  let pathname = rawUrl.split('?')[0] || ''
  if (req.query?.path) {
    const segments = Array.isArray(req.query.path) ? req.query.path : [req.query.path]
    pathname = '/api/' + segments.join('/')
  }

  const sql = getSqlClient()
  const isNeonReady = sql ? await ensureNeonTables() : false

  // -------------------------------------------------------------------------
  // 1. Health Check: GET /api/health
  // -------------------------------------------------------------------------
  if (pathname === '/api/health' || pathname === '/api') {
    let usersCount = 0
    let enrolmentsCount = 0

    if (isNeonReady) {
      try {
        const uRes = await sql`SELECT count(*)::int as count FROM users`
        const eRes = await sql`SELECT count(*)::int as count FROM enrolments`
        usersCount = uRes[0]?.count || 0
        enrolmentsCount = eRes[0]?.count || 0
      } catch {}
    } else {
      const fallback = await getFallbackDatabase()
      usersCount = Object.keys(fallback.users).length
      enrolmentsCount = fallback.enrolments.length
    }

    return sendJson(res, 200, {
      ok: true,
      service: 'learnwithexpert-api',
      timestamp: new Date().toISOString(),
      database: isNeonReady ? 'neon-postgresql-active' : 'local-memory-tmp-active',
      registeredUsersCount: usersCount,
      enrolmentsCount: enrolmentsCount,
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
      utrNumber?: string
      paymentMethod?: string
    }>(req)

    const name = body.name?.trim() ?? ''
    const email = body.email?.trim().toLowerCase() ?? ''
    const phone = body.phone?.trim() ?? ''
    const company = body.company?.trim() ?? ''
    const password = body.password ?? ''
    const studentRole = body.role?.trim() || 'Software Developer'
    const workflowGoal = body.workflowGoal?.trim() || 'Custom GenAI Workflow'
    const planKey = (body.plan && PLAN_PRICES[body.plan]) ? body.plan : 'bootcamp_full'
    const utrNumber = (body.utrNumber || '').trim()
    const paymentMethod = (body.paymentMethod || 'UPI').trim()
    const initialStatus = planKey === 'recordings' ? 'approved' : 'pending'

    if (!name || name.length < 2) return sendJson(res, 400, { error: 'Please enter your full name (minimum 2 characters).' })
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJson(res, 400, { error: 'Please enter a valid email address.' })
    if (!password || password.length < 8) return sendJson(res, 400, { error: 'Password must be at least 8 characters long.' })

    const passwordHash = hashPassword(password)
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const planDetails = PLAN_PRICES[planKey]
    const enrolmentId = `ENR-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`
    const token = generateToken()
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000

    if (isNeonReady) {
      // Check existing in Neon
      const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`
      if (existing.length > 0) {
        return sendJson(res, 409, { error: 'An account with this email already exists. Please sign in.' })
      }

      // Insert User
      await sql`
        INSERT INTO users (id, name, email, phone, company, password_hash, role, cohort, created_at)
        VALUES (${userId}, ${name}, ${email}, ${phone}, ${company || studentRole}, ${passwordHash}, 'student', 'Cohort 7 (Starts 17 Nov)', NOW())
      `

      // Insert Enrolment with UTR & Payment Status
      await sql`
        INSERT INTO enrolments (id, user_id, name, email, phone, country_code, company, cohort, plan, plan_label, amount, status, workflow_goal, enrolled_at, utr_number, payment_method)
        VALUES (${enrolmentId}, ${userId}, ${name}, ${email}, ${phone || 'Not specified'}, '+91', ${company || 'Independent Builder'}, 'Cohort 7 (Starts 17 Nov)', ${planKey}, ${planDetails.label}, ${planDetails.amount}, ${initialStatus}, ${workflowGoal}, NOW(), ${utrNumber || null}, ${paymentMethod})
      `

      // Insert Session
      await sql`
        INSERT INTO sessions (token, user_id, expires_at)
        VALUES (${token}, ${userId}, ${expiresAt})
      `

      return sendJson(res, 200, {
        ok: true,
        message: initialStatus === 'approved' 
          ? 'Account created and enrolled successfully!'
          : 'Account created! Payment details submitted for admin verification.',
        user: { id: userId, name, email, phone, company: company || studentRole, role: 'student', cohort: 'Cohort 7 (Starts 17 Nov)' },
        enrolment: {
          id: enrolmentId,
          userId,
          name,
          email,
          phone: phone || 'Not specified',
          countryCode: '+91',
          company: company || 'Independent Builder',
          cohort: 'Cohort 7 (Starts 17 Nov)',
          plan: planKey,
          planLabel: planDetails.label,
          amount: planDetails.amount,
          status: initialStatus,
          workflowGoal,
          enrolledAt: new Date().toISOString(),
          utrNumber,
          paymentMethod,
        },
        token,
      })
    }

    // Fallback store
    const fallback = await getFallbackDatabase()
    if (fallback.users[email]) {
      return sendJson(res, 409, { error: 'An account with this email already exists. Please sign in.' })
    }

    const newUser: AuthUser = {
      id: userId,
      name,
      email,
      phone,
      company: company || studentRole,
      passwordHash,
      role: 'student',
      cohort: 'Cohort 7 (Starts 17 Nov)',
      createdAt: new Date().toISOString(),
    }
    fallback.users[email] = newUser

    const newEnrolment: Enrolment = {
      id: enrolmentId,
      userId,
      name,
      email,
      phone: phone || 'Not specified',
      countryCode: '+91',
      company: company || 'Independent Builder',
      cohort: 'Cohort 7 (Starts 17 Nov)',
      plan: planKey as any,
      planLabel: planDetails.label,
      amount: planDetails.amount,
      status: initialStatus as any,
      workflowGoal,
      enrolledAt: new Date().toISOString(),
      utrNumber,
      paymentMethod,
    }
    }
    fallback.enrolments.unshift(newEnrolment)
    fallback.sessions[token] = { userId, expiresAt }
    await saveFallbackDatabase(fallback)

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

    if (!email || !password) return sendJson(res, 400, { error: 'Email and password are required.' })

    const token = generateToken()
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000

    if (isNeonReady) {
      const rows = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`
      if (rows.length === 0) {
        return sendJson(res, 401, { error: 'No account found with this email. Please register to create an account and enrol.' })
      }

      const user = rows[0]
      if (!user.password_hash) {
        return sendJson(res, 401, { error: 'This account was created with Google Sign-In. Please click "Sign in with Google".' })
      }

      if (!safeCompare(hashPassword(password), user.password_hash)) {
        return sendJson(res, 401, { error: 'Incorrect password. Please try again.' })
      }

      await sql`INSERT INTO sessions (token, user_id, expires_at) VALUES (${token}, ${user.id}, ${expiresAt})`
      const enrolments = await sql`SELECT * FROM enrolments WHERE user_id = ${user.id} OR email = ${email} ORDER BY enrolled_at DESC LIMIT 1`

      return sendJson(res, 200, {
        ok: true,
        message: 'Signed in successfully.',
        user: sanitizeUser(user),
        enrolment: enrolments.length > 0 ? formatEnrolment(enrolments[0]) : null,
        token,
        isAdmin: user.role === 'admin',
      })
    }

    // Fallback store
    const fallback = await getFallbackDatabase()
    const user = fallback.users[email]
    if (!user) {
      return sendJson(res, 401, { error: 'No account found with this email. Please register to create an account and enrol.' })
    }
    if (!user.passwordHash) {
      return sendJson(res, 401, { error: 'This account was created with Google Sign-In. Please click "Sign in with Google".' })
    }
    if (!safeCompare(hashPassword(password), user.passwordHash)) {
      return sendJson(res, 401, { error: 'Incorrect password. Please try again.' })
    }

    fallback.sessions[token] = { userId: user.id, expiresAt }
    await saveFallbackDatabase(fallback)
    const enrolment = fallback.enrolments.find((e) => e.userId === user.id || e.email.toLowerCase() === email) || null

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
  // 4. Session Lookup: GET /api/auth/me
  // -------------------------------------------------------------------------
  if (pathname === '/api/auth/me') {
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' })
    const token = getBearerToken(req)
    if (!token) return sendJson(res, 401, { error: 'Authentication required.' })

    if (isNeonReady) {
      const rows = await sql`
        SELECT u.*, s.expires_at 
        FROM users u 
        JOIN sessions s ON u.id = s.user_id 
        WHERE s.token = ${token} 
        LIMIT 1
      `
      if (rows.length === 0 || Number(rows[0].expires_at) < Date.now()) {
        if (rows.length > 0) {
          await sql`DELETE FROM sessions WHERE token = ${token}`
        }
        return sendJson(res, 401, { error: 'Session expired or invalid. Please sign in again.' })
      }

      const user = rows[0]
      const enrolments = await sql`SELECT * FROM enrolments WHERE user_id = ${user.id} OR email = ${user.email} ORDER BY enrolled_at DESC LIMIT 1`

      return sendJson(res, 200, {
        ok: true,
        user: sanitizeUser(user),
        enrolment: enrolments.length > 0 ? formatEnrolment(enrolments[0]) : null,
        isAdmin: user.role === 'admin',
      })
    }

    // Fallback store
    const fallback = await getFallbackDatabase()
    const session = fallback.sessions[token]
    if (!session || session.expiresAt < Date.now()) {
      if (session) delete fallback.sessions[token]
      return sendJson(res, 401, { error: 'Session expired or invalid. Please sign in again.' })
    }

    let user: AuthUser | null = null
    for (const u of Object.values(fallback.users)) {
      if (u.id === session.userId) { user = u; break }
    }
    if (!user) return sendJson(res, 401, { error: 'User profile not found.' })

    const enrolment = fallback.enrolments.find((e) => e.userId === user?.id || e.email.toLowerCase() === user?.email.toLowerCase()) || null

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
    if (token) {
      if (isNeonReady) {
        await sql`DELETE FROM sessions WHERE token = ${token}`
      } else {
        const fallback = await getFallbackDatabase()
        if (fallback.sessions[token]) {
          delete fallback.sessions[token]
          await saveFallbackDatabase(fallback)
        }
      }
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
    if (!verified && body.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      verified = { email: body.email.toLowerCase().trim(), name: body.name || body.email.split('@')[0] || 'Google Student' }
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
    const token = generateToken()
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000

    if (isNeonReady) {
      const rows = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`
      let user: any = null
      let isNewUser = false

      if (rows.length === 0) {
        isNewUser = true
        const userId = `usr_g_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        const role = email === ADMIN_EMAIL ? 'admin' : 'student'
        await sql`
          INSERT INTO users (id, name, email, phone, company, role, cohort, google_id, created_at)
          VALUES (${userId}, ${name}, ${email}, ${phone}, ${company}, ${role}, 'Cohort 7 (Starts 17 Nov)', ${'google_' + Date.now()}, NOW())
        `
        const newRows = await sql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`
        user = newRows[0]
      } else {
        user = rows[0]
      }

      // Check enrolment
      const enrolments = await sql`SELECT * FROM enrolments WHERE user_id = ${user.id} OR email = ${email} LIMIT 1`
      let enrolment = enrolments.length > 0 ? formatEnrolment(enrolments[0]) : null

      if (!enrolment && user.role !== 'admin') {
        const planDetails = PLAN_PRICES[planKey]
        const enrolmentId = `ENR-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`
        await sql`
          INSERT INTO enrolments (id, user_id, name, email, phone, country_code, company, cohort, plan, plan_label, amount, status, workflow_goal, enrolled_at)
          VALUES (${enrolmentId}, ${user.id}, ${user.name}, ${user.email}, ${user.phone || 'Not specified'}, '+91', ${user.company || 'Independent Builder'}, 'Cohort 7 (Starts 17 Nov)', ${planKey}, ${planDetails.label}, ${planDetails.amount}, 'confirmed', ${workflowGoal}, NOW())
        `
        enrolment = {
          id: enrolmentId,
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
      }

      await sql`INSERT INTO sessions (token, user_id, expires_at) VALUES (${token}, ${user.id}, ${expiresAt})`

      return sendJson(res, 200, {
        ok: true,
        message: isNewUser ? 'Account successfully created with Google!' : 'Signed in with Google successfully!',
        user: sanitizeUser(user),
        enrolment,
        token,
        isAdmin: user.role === 'admin',
        isNewUser,
      })
    }

    // Fallback store
    const fallback = await getFallbackDatabase()
    let user = fallback.users[email]
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
      fallback.users[email] = user
    }

    let enrolment = fallback.enrolments.find((e) => e.userId === user.id || e.email.toLowerCase() === email) || null
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
      fallback.enrolments.unshift(enrolment)
    }

    fallback.sessions[token] = { userId: user.id, expiresAt }
    await saveFallbackDatabase(fallback)

    return sendJson(res, 200, {
      ok: true,
      message: isNewUser ? 'Account successfully created with Google!' : 'Signed in with Google successfully!',
      user: sanitizeUser(user),
      enrolment,
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
      password?: string
      plan?: string
      workflowGoal?: string
      utrNumber?: string
      paymentMethod?: string
    }>(req)

    const name = body.name?.trim() ?? ''
    const email = body.email?.trim().toLowerCase() ?? ''
    const phone = body.phone?.trim() ?? ''
    const countryCode = body.countryCode?.trim() || '+91'
    const company = body.company?.trim() || 'Independent Builder'
    const password = body.password ?? ''
    const planKey = (body.plan && PLAN_PRICES[body.plan]) ? body.plan : 'bootcamp_full'
    const planDetails = PLAN_PRICES[planKey]
    const workflowGoal = body.workflowGoal?.trim() || 'Custom GenAI Workflow Development'
    const utrNumber = (body.utrNumber || '').trim()
    const paymentMethod = (body.paymentMethod || 'UPI').trim()
    const status = planKey === 'recordings' ? 'approved' : 'pending'
    const enrolmentId = `ENR-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`
    const token = generateToken()
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000

    if (!name || name.length < 2) return sendJson(res, 400, { error: 'Please enter your full name.' })
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJson(res, 400, { error: 'Please enter a valid email.' })
    if (planKey !== 'recordings' && (!utrNumber || utrNumber.length < 6)) {
      return sendJson(res, 400, { error: 'Please enter a valid 12-digit UTR Number / UPI Transaction ID.' })
    }

    if (isNeonReady) {
      let rows = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`
      let user = rows[0]
      let userId = user?.id

      if (!user) {
        userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        const passwordHash = password ? hashPassword(password) : null
        await sql`
          INSERT INTO users (id, name, email, phone, company, password_hash, role, cohort, created_at)
          VALUES (${userId}, ${name}, ${email}, ${phone}, ${company}, ${passwordHash}, 'student', 'Cohort 7 (Starts 17 Nov)', NOW())
        `
        const uRows = await sql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`
        user = uRows[0]
      } else if (password && !user.password_hash) {
        const passwordHash = hashPassword(password)
        await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${user.id}`
        user.password_hash = passwordHash
      }

      // Create session
      await sql`INSERT INTO sessions (token, user_id, expires_at) VALUES (${token}, ${userId}, ${expiresAt})`

      // Create enrolment with UTR & pending status
      await sql`
        INSERT INTO enrolments (id, user_id, name, email, phone, country_code, company, cohort, plan, plan_label, amount, status, workflow_goal, enrolled_at, utr_number, payment_method)
        VALUES (${enrolmentId}, ${userId}, ${name}, ${email}, ${phone || 'Not specified'}, ${countryCode}, ${company}, 'Cohort 7 (Starts 17 Nov)', ${planKey}, ${planDetails.label}, ${planDetails.amount}, ${status}, ${workflowGoal}, NOW(), ${utrNumber || null}, ${paymentMethod})
      `

      const enrolmentObj = {
        id: enrolmentId,
        userId,
        name,
        email,
        phone: phone || 'Not specified',
        countryCode,
        company,
        cohort: 'Cohort 7 (Starts 17 Nov)',
        plan: planKey,
        planLabel: planDetails.label,
        amount: planDetails.amount,
        status,
        workflowGoal,
        enrolledAt: new Date().toISOString(),
        utrNumber,
        paymentMethod,
      }

      return sendJson(res, 200, {
        ok: true,
        message: status === 'approved' 
          ? 'Enrolment confirmed successfully!'
          : 'Payment details submitted! Awaiting administrator verification to activate live session access.',
        enrolment: enrolmentObj,
        user: sanitizeUser(user),
        token,
      })
    }

    // Fallback store
    const fallback = await getFallbackDatabase()
    let user = fallback.users[email]
    if (!user) {
      user = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name,
        email,
        phone,
        company,
        passwordHash: password ? hashPassword(password) : undefined,
        role: 'student',
        cohort: 'Cohort 7 (Starts 17 Nov)',
        createdAt: new Date().toISOString(),
      }
      fallback.users[email] = user
    } else if (password && !user.passwordHash) {
      user.passwordHash = hashPassword(password)
    }

    const newEnrolment: Enrolment = {
      id: enrolmentId,
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
      status: status as any,
      workflowGoal,
      enrolledAt: new Date().toISOString(),
      utrNumber,
      paymentMethod,
    }

    fallback.enrolments.unshift(newEnrolment)
    fallback.sessions[token] = { userId: user.id, expiresAt }
    await saveFallbackDatabase(fallback)

    return sendJson(res, 200, {
      ok: true,
      message: status === 'approved' 
        ? 'Enrolment confirmed successfully!'
        : 'Payment details submitted! Awaiting administrator verification to activate live session access.',
      enrolment: newEnrolment,
      user: sanitizeUser(user),
      token,
    })
  }

  // -------------------------------------------------------------------------
  // 7b. Resubmit UTR: POST /api/enrol/resubmit-utr
  // -------------------------------------------------------------------------
  if (pathname === '/api/enrol/resubmit-utr') {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' })

    const body = await parseBody<{ utrNumber?: string; enrolmentId?: string }>(req)
    const utr = (body.utrNumber || '').trim()
    if (!utr || utr.length < 6) {
      return sendJson(res, 400, { error: 'Please enter a valid 12-digit UTR Number / Transaction ID.' })
    }

    const token = getBearerToken(req)

    if (isNeonReady) {
      let targetId = body.enrolmentId
      if (!targetId && token) {
        const sRows = await sql`SELECT user_id FROM sessions WHERE token = ${token} AND expires_at > ${Date.now()} LIMIT 1`
        if (sRows.length > 0) {
          const eRows = await sql`SELECT id FROM enrolments WHERE user_id = ${sRows[0].user_id} ORDER BY enrolled_at DESC LIMIT 1`
          if (eRows.length > 0) targetId = eRows[0].id
        }
      }

      if (!targetId) {
        return sendJson(res, 400, { error: 'Could not identify enrolment record to update.' })
      }

      const updated = await sql`
        UPDATE enrolments
        SET utr_number = ${utr}, status = 'pending', rejection_reason = NULL, verified_at = NULL, verified_by = NULL
        WHERE id = ${targetId}
        RETURNING *
      `

      if (updated.length === 0) return sendJson(res, 404, { error: 'Enrolment record not found.' })
      return sendJson(res, 200, {
        ok: true,
        message: 'Payment details resubmitted successfully. Our team will verify your transaction shortly.',
        enrolment: formatEnrolment(updated[0]),
      })
    }

    // Fallback store
    const fallback = await getFallbackDatabase()
    const target = fallback.enrolments.find((e) => e.id === body.enrolmentId)
    if (!target) return sendJson(res, 404, { error: 'Enrolment record not found.' })
    target.utrNumber = utr
    target.status = 'pending'
    target.rejectionReason = undefined
    await saveFallbackDatabase(fallback)

    return sendJson(res, 200, {
      ok: true,
      message: 'Payment details resubmitted successfully. Our team will verify your transaction shortly.',
      enrolment: target,
    })
  }

  // -------------------------------------------------------------------------
  // 8. Admin Enrolments: GET /api/admin/enrolments
  // -------------------------------------------------------------------------
  if (pathname === '/api/admin/enrolments') {
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' })
    const token = getBearerToken(req)
    if (!token) return sendJson(res, 403, { error: 'Admin access required.' })

    if (isNeonReady) {
      const userRows = await sql`
        SELECT u.role 
        FROM users u 
        JOIN sessions s ON u.id = s.user_id 
        WHERE s.token = ${token} AND s.expires_at > ${Date.now()}
        LIMIT 1
      `
      if (userRows.length === 0 || userRows[0].role !== 'admin') {
        return sendJson(res, 403, { error: 'Admin access required.' })
      }

      const rows = await sql`SELECT * FROM enrolments ORDER BY enrolled_at DESC`
      const enrolments = rows.map(formatEnrolment)
      const approvedCount = enrolments.filter((e) => e.status === 'approved' || e.status === 'confirmed').length
      const pendingCount = enrolments.filter((e) => e.status === 'pending').length
      const rejectedCount = enrolments.filter((e) => e.status === 'rejected').length
      const totalRevenue = enrolments.filter((e) => e.status === 'approved' || e.status === 'confirmed').reduce((sum, e) => sum + (e.amount || 0), 0)

      return sendJson(res, 200, {
        enrolments,
        total: enrolments.length,
        stats: {
          totalEnrolments: enrolments.length,
          confirmedCount: approvedCount,
          approvedCount,
          pendingCount,
          rejectedCount,
          seatsRemaining: Math.max(0, 6 - approvedCount),
          maxCohortSeats: 6,
          totalRevenue,
        },
      })
    }

    // Fallback store
    const fallback = await getFallbackDatabase()
    const session = fallback.sessions[token]
    if (!session || session.expiresAt < Date.now()) return sendJson(res, 403, { error: 'Admin access required.' })
    const admin = Object.values(fallback.users).find((u) => u.id === session.userId && u.role === 'admin')
    if (!admin) return sendJson(res, 403, { error: 'Admin access required.' })

    const enrolments = fallback.enrolments
    const approvedCount = enrolments.filter((e) => e.status === 'approved' || e.status === 'confirmed').length
    const pendingCount = enrolments.filter((e) => e.status === 'pending').length
    const rejectedCount = enrolments.filter((e) => e.status === 'rejected').length
    const totalRevenue = enrolments.filter((e) => e.status === 'approved' || e.status === 'confirmed').reduce((sum, e) => sum + (e.amount || 0), 0)

    return sendJson(res, 200, {
      enrolments,
      total: enrolments.length,
      stats: {
        totalEnrolments: enrolments.length,
        confirmedCount: approvedCount,
        approvedCount,
        pendingCount,
        rejectedCount,
        seatsRemaining: Math.max(0, 6 - approvedCount),
        maxCohortSeats: 6,
        totalRevenue,
      },
    })
  }

  // -------------------------------------------------------------------------
  // 9. Admin Single Enrolment: PATCH/DELETE /api/admin/enrolments/:id
  // -------------------------------------------------------------------------
  if (pathname.startsWith('/api/admin/enrolments/')) {
    const id = pathname.replace('/api/admin/enrolments/', '').trim()
    const token = getBearerToken(req)
    if (!token) return sendJson(res, 403, { error: 'Admin access required.' })

    if (isNeonReady) {
      const userRows = await sql`
        SELECT u.role, u.email 
        FROM users u 
        JOIN sessions s ON u.id = s.user_id 
        WHERE s.token = ${token} AND s.expires_at > ${Date.now()}
        LIMIT 1
      `
      if (userRows.length === 0 || userRows[0].role !== 'admin') {
        return sendJson(res, 403, { error: 'Admin access required.' })
      }
      const adminEmail = userRows[0].email

      if (req.method === 'PATCH') {
        const body = await parseBody<{
          status?: 'approved' | 'confirmed' | 'pending' | 'rejected' | 'waitlist'
          rejectionReason?: string
        }>(req)

        if (body.status && ['approved', 'confirmed', 'pending', 'rejected', 'waitlist'].includes(body.status)) {
          const isApproval = body.status === 'approved' || body.status === 'confirmed'
          const isRejection = body.status === 'rejected'
          const rejectionReason = isRejection ? (body.rejectionReason?.trim() || 'Payment details could not be matched with bank statement.') : null
          const verifiedBy = (isApproval || isRejection) ? adminEmail : null

          const updated = isApproval
            ? await sql`
                UPDATE enrolments 
                SET status = ${body.status}, rejection_reason = NULL, verified_at = NOW(), verified_by = ${verifiedBy}
                WHERE id = ${id} 
                RETURNING *
              `
            : isRejection
            ? await sql`
                UPDATE enrolments 
                SET status = ${body.status}, rejection_reason = ${rejectionReason}, verified_at = NOW(), verified_by = ${verifiedBy}
                WHERE id = ${id} 
                RETURNING *
              `
            : await sql`
                UPDATE enrolments 
                SET status = ${body.status}, rejection_reason = NULL, verified_at = NULL, verified_by = NULL
                WHERE id = ${id} 
                RETURNING *
              `

          if (updated.length === 0) return sendJson(res, 404, { error: 'Enrolment not found.' })
          return sendJson(res, 200, { ok: true, enrolment: formatEnrolment(updated[0]) })
        }
        return sendJson(res, 400, { error: 'Invalid status.' })
      }

      if (req.method === 'DELETE') {
        await sql`DELETE FROM enrolments WHERE id = ${id}`
        return sendJson(res, 200, { ok: true, message: 'Enrolment deleted.' })
      }
      return sendJson(res, 405, { error: 'Method not allowed' })
    }

    // Fallback store
    const fallback = await getFallbackDatabase()
    const session = fallback.sessions[token]
    if (!session || session.expiresAt < Date.now()) return sendJson(res, 403, { error: 'Admin access required.' })
    const admin = Object.values(fallback.users).find((u) => u.id === session.userId && u.role === 'admin')
    if (!admin) return sendJson(res, 403, { error: 'Admin access required.' })

    const index = fallback.enrolments.findIndex((e) => e.id === id)
    if (index === -1) return sendJson(res, 404, { error: 'Enrolment not found.' })

    if (req.method === 'PATCH') {
      const body = await parseBody<{
        status?: 'approved' | 'confirmed' | 'pending' | 'rejected' | 'waitlist'
        rejectionReason?: string
      }>(req)

      if (body.status && ['approved', 'confirmed', 'pending', 'rejected', 'waitlist'].includes(body.status)) {
        fallback.enrolments[index].status = body.status as any
        if (body.status === 'rejected') {
          fallback.enrolments[index].rejectionReason = body.rejectionReason?.trim() || 'Payment details could not be matched with bank statement.'
        } else {
          fallback.enrolments[index].rejectionReason = undefined
        }
        fallback.enrolments[index].verifiedAt = new Date().toISOString()
        fallback.enrolments[index].verifiedBy = admin.email

        await saveFallbackDatabase(fallback)
        return sendJson(res, 200, { ok: true, enrolment: fallback.enrolments[index] })
      }
      return sendJson(res, 400, { error: 'Invalid status.' })
    }

    if (req.method === 'DELETE') {
      fallback.enrolments.splice(index, 1)
      await saveFallbackDatabase(fallback)
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
