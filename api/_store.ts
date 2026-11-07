import fs from 'node:fs'
import path from 'node:path'

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

export type PlanKey = 'bootcamp_full' | 'bootcamp_instalment' | 'recordings' | 'team'

export const PLAN_PRICES: Record<PlanKey, { label: string; amount: number }> = {
  bootcamp_full: { label: 'Bootcamp (Pay in Full)', amount: 9999 },
  bootcamp_instalment: { label: 'Bootcamp (3 Instalments)', amount: 3999 },
  recordings: { label: 'Recordings Free Audit', amount: 0 },
  team: { label: 'Team 5 Seats', amount: 39999 },
}

export function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PLAN_PRICES, value)
}

export const ADMIN_EMAIL = 'admin@learnwithexpert.com'
export const ADMIN_PASSWORD_HASH = 'b64bae5a1b38e48cd31eecc7e90d5033e9060da39265d80bd3ec7d8c4ae0c9b1'

const ADMIN_USER: AuthUser = {
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

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------
export async function hashPassword(password: string): Promise<string> {
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

export async function verifyPassword(password: string, passwordHash?: string): Promise<boolean> {
  if (!passwordHash) return false
  return safeEqual(await hashPassword(password), passwordHash)
}

// ---------------------------------------------------------------------------
// File storage helper
// ---------------------------------------------------------------------------
function getStoragePath(filename: string): string {
  const dataDir = path.join(process.cwd(), 'data')
  try {
    if (fs.existsSync(dataDir)) {
      const testFile = path.join(dataDir, '.write_test')
      fs.writeFileSync(testFile, '1')
      fs.unlinkSync(testFile)
      return path.join(dataDir, filename)
    }
  } catch {
    // dataDir read-only
  }

  const tmpDir = '/tmp'
  try {
    fs.mkdirSync(tmpDir, { recursive: true })
  } catch {
    // ignore
  }
  return path.join(tmpDir, filename)
}

function readJsonFile<T>(filename: string, fallback: T): T {
  const primaryPath = getStoragePath(filename)
  try {
    if (fs.existsSync(primaryPath)) {
      const content = fs.readFileSync(primaryPath, 'utf-8')
      return JSON.parse(content) as T
    }
  } catch {
    // ignore
  }

  // Fallback to static seed in data/ if available
  const seedPath = path.join(process.cwd(), 'data', filename)
  try {
    if (seedPath !== primaryPath && fs.existsSync(seedPath)) {
      const content = fs.readFileSync(seedPath, 'utf-8')
      return JSON.parse(content) as T
    }
  } catch {
    // ignore
  }

  return fallback
}

function writeJsonFile<T>(filename: string, data: T) {
  const primaryPath = getStoragePath(filename)
  try {
    fs.mkdirSync(path.dirname(primaryPath), { recursive: true })
    fs.writeFileSync(primaryPath, JSON.stringify(data, null, 2), 'utf-8')
  } catch (err) {
    console.error(`Failed to write ${filename}:`, err)
  }
}

// ---------------------------------------------------------------------------
// Store Operations
// ---------------------------------------------------------------------------
export function getAllUsers(): Record<string, AuthUser> {
  const users = readJsonFile<Record<string, AuthUser>>('users.json', {})
  if (!users[ADMIN_EMAIL]) {
    users[ADMIN_EMAIL] = ADMIN_USER
    writeJsonFile('users.json', users)
  }
  return users
}

export function getUserByEmail(email: string): AuthUser | null {
  const users = getAllUsers()
  return users[email.trim().toLowerCase()] || null
}

export function getUserById(id: string): AuthUser | null {
  const users = getAllUsers()
  for (const user of Object.values(users)) {
    if (user.id === id) return user
  }
  return null
}

export function saveUser(user: AuthUser) {
  const users = getAllUsers()
  users[user.email.trim().toLowerCase()] = user
  writeJsonFile('users.json', users)
}

export function getSessions(): Record<string, { userId: string; expiresAt: number }> {
  return readJsonFile<Record<string, { userId: string; expiresAt: number }>>('sessions.json', {})
}

export function saveSession(token: string, session: { userId: string; expiresAt: number }) {
  const sessions = getSessions()
  sessions[token] = session
  writeJsonFile('sessions.json', sessions)
}

export function deleteSession(token: string) {
  const sessions = getSessions()
  if (sessions[token]) {
    delete sessions[token]
    writeJsonFile('sessions.json', sessions)
  }
}

export function getEnrolments(): Enrolment[] {
  return readJsonFile<Enrolment[]>('enrolments.json', [])
}

export function saveEnrolment(enrolment: Enrolment) {
  const enrolments = getEnrolments()
  enrolments.unshift(enrolment)
  writeJsonFile('enrolments.json', enrolments)
}

export function updateEnrolment(id: string, updates: Partial<Enrolment>): Enrolment | null {
  const enrolments = getEnrolments()
  const enrolment = enrolments.find((e) => e.id === id)
  if (!enrolment) return null
  Object.assign(enrolment, updates)
  writeJsonFile('enrolments.json', enrolments)
  return enrolment
}

export function deleteEnrolment(id: string): boolean {
  const enrolments = getEnrolments()
  const index = enrolments.findIndex((e) => e.id === id)
  if (index === -1) return false
  enrolments.splice(index, 1)
  writeJsonFile('enrolments.json', enrolments)
  return true
}

// ---------------------------------------------------------------------------
// Session & Auth Helpers
// ---------------------------------------------------------------------------
export function getSessionUserFromReq(req: any): AuthUser | null {
  let authHeader = ''
  if (req && typeof req.headers?.get === 'function') {
    authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || ''
  } else if (req && req.headers) {
    authHeader = req.headers['authorization'] || req.headers['Authorization'] || ''
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  const token = authHeader.slice('Bearer '.length).trim()
  const sessions = getSessions()
  const session = sessions[token]
  if (!session) return null
  if (session.expiresAt < Date.now()) {
    deleteSession(token)
    return null
  }

  return getUserById(session.userId)
}

// ---------------------------------------------------------------------------
// HTTP Request & Response Helpers
// ---------------------------------------------------------------------------
export async function parseRequestBody<T = any>(req: any): Promise<T> {
  if (req && typeof req.json === 'function') {
    try {
      return (await req.json()) as T
    } catch {
      return {} as T
    }
  }

  if (req && req.body) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body) as T
      } catch {
        return {} as T
      }
    }
    return req.body as T
  }

  if (req && typeof req.on === 'function') {
    return new Promise((resolve) => {
      let body = ''
      req.on('data', (chunk: any) => {
        body += chunk
      })
      req.on('end', () => {
        try {
          resolve(JSON.parse(body || '{}') as T)
        } catch {
          resolve({} as T)
        }
      })
      req.on('error', () => resolve({} as T))
    })
  }

  return {} as T
}

export function sendResponse(res: any, status: number, data: any): Response | void {
  const jsonString = JSON.stringify(data)

  // Standard Next/Vercel Serverless (res.status().json())
  if (res && typeof res.status === 'function' && typeof res.json === 'function') {
    res.setHeader('Content-Type', 'application/json')
    res.status(status).json(data)
    return
  }

  // Node.js ServerResponse
  if (res && typeof res.writeHead === 'function') {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    })
    res.end(jsonString)
    return
  }

  // Web API / Edge runtime
  return new Response(jsonString, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

