import type { IncomingMessage, ServerResponse } from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import os from 'node:os'

interface AuthUser {
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

interface Enrolment {
  id: string
  userId: string
  name: string
  email: string
  phone: string
  countryCode: string
  company: string
  cohort: string
  plan: string
  planLabel: string
  amount: number
  status: string
  workflowGoal: string
  enrolledAt: string
}

const ADMIN_EMAIL = 'admin@learnwithexpert.com'
const ADMIN_PASSWORD_HASH = 'b64bae5a1b38e48cd31eecc7e90d5033e9060da39265d80bd3ec7d8c4ae0c9b1'

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

function getStorePath(filename: string): string {
  return path.join(os.tmpdir(), 'lwe_' + filename)
}

function readStore<T>(filename: string, fallback: T): T {
  const primary = getStorePath(filename)
  try {
    if (fs.existsSync(primary)) {
      return JSON.parse(fs.readFileSync(primary, 'utf-8'))
    }
  } catch {}

  const seed = path.join(process.cwd(), 'data', filename)
  try {
    if (fs.existsSync(seed)) {
      return JSON.parse(fs.readFileSync(seed, 'utf-8'))
    }
  } catch {}

  return fallback
}

function writeStore<T>(filename: string, data: T) {
  const primary = getStorePath(filename)
  try {
    fs.mkdirSync(path.dirname(primary), { recursive: true })
    fs.writeFileSync(primary, JSON.stringify(data, null, 2), 'utf-8')
  } catch (e) {
    console.error('Failed to write store:', e)
  }
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_lwe_secure_salt_2026').digest('hex')
}

function verifyPassword(password: string, hash?: string): boolean {
  if (!hash) return false
  return hashPassword(password) === hash
}

function generateToken(): string {
  if (typeof crypto.randomUUID === 'function') {
    return `tok_${crypto.randomUUID()}`
  }
  return `tok_${crypto.randomBytes(24).toString('hex')}`
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

export default async function handler(req: any, res?: any) {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {})
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' })
  }

  try {
    const body = await parseBody<{
      email?: string
      password?: string
      rememberMe?: boolean
    }>(req)

    const email = body.email?.trim().toLowerCase() ?? ''
    const password = body.password ?? ''

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return sendJson(res, 400, { error: 'Please enter a valid email address.' })
    }
    if (!password) {
      return sendJson(res, 400, { error: 'Please enter your password.' })
    }

    const users = readStore<Record<string, AuthUser>>('users.json', {})
    if (!users[ADMIN_EMAIL]) {
      users[ADMIN_EMAIL] = ADMIN_USER
      writeStore('users.json', users)
    }

    const user = users[email]
    if (!user) {
      return sendJson(res, 401, {
        error: 'No account found with this email. Please register to create an account and enrol.',
      })
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return sendJson(res, 401, {
        error: 'Incorrect password. Please verify your credentials and try again.',
      })
    }

    const token = generateToken()
    const duration = body.rememberMe ? 60 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
    const sessions = readStore<Record<string, { userId: string; expiresAt: number }>>('sessions.json', {})
    sessions[token] = { userId: user.id, expiresAt: Date.now() + duration }
    writeStore('sessions.json', sessions)

    const enrolments = readStore<Enrolment[]>('enrolments.json', [])
    const userEnrolment = enrolments.find((e) => e.userId === user.id || e.email.toLowerCase() === user.email.toLowerCase())

    const { passwordHash: _, ...safeUser } = user
    return sendJson(res, 200, {
      ok: true,
      message: user.role === 'admin' ? 'Welcome back, Administrator!' : 'Signed in successfully!',
      user: safeUser,
      enrolment: userEnrolment || null,
      token,
    })
  } catch (err: any) {
    console.error('Login error:', err)
    return sendJson(res, 500, { error: err?.message || 'Failed to sign in. Please try again.' })
  }
}
