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
  googleId?: string
  avatar?: string
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

const PLAN_PRICES: Record<string, { label: string; amount: number }> = {
  bootcamp_full: { label: 'Bootcamp (Pay in Full)', amount: 9999 },
  bootcamp_instalment: { label: 'Bootcamp (3 Instalments)', amount: 3999 },
  recordings: { label: 'Recordings Free Audit', amount: 0 },
  team: { label: 'Team 5 Seats', amount: 39999 },
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

// ---------------------------------------------------------------------------
// Verify Google Credentials against Google APIs
// ---------------------------------------------------------------------------
interface GoogleProfile {
  email: string
  name: string
  picture?: string
  sub: string
}

async function verifyGoogleToken(credential?: string, accessToken?: string): Promise<GoogleProfile | null> {
  // 1. Verify Google ID Token (from Google Identity Services)
  if (credential) {
    try {
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`)
      if (res.ok) {
        const data = (await res.json()) as any
        if (data && data.email && (data.email_verified === 'true' || data.email_verified === true)) {
          return {
            email: data.email.toLowerCase().trim(),
            name: data.name || data.given_name || 'Google Student',
            picture: data.picture,
            sub: data.sub,
          }
        }
      }
    } catch (err) {
      console.error('Error verifying Google ID token:', err)
    }
  }

  // 2. Verify Google OAuth Access Token
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
            picture: data.picture,
            sub: data.sub,
          }
        }
      }
    } catch (err) {
      console.error('Error verifying Google access token:', err)
    }
  }

  return null
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
      credential?: string
      access_token?: string
      name?: string
      email?: string
      phone?: string
      company?: string
      plan?: string
      workflowGoal?: string
    }>(req)

    const credential = body.credential
    const accessToken = body.access_token

    let profile: GoogleProfile | null = await verifyGoogleToken(credential, accessToken)

    // Fallback in local development if simulated profile was provided
    if (!profile && process.env.NODE_ENV !== 'production' && body.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      profile = {
        email: body.email.toLowerCase().trim(),
        name: body.name || 'Google Student',
        sub: `dev_google_${Date.now()}`,
      }
    }

    if (!profile || !profile.email) {
      return sendJson(res, 401, {
        error: 'Google authorization failed. Unable to verify credentials with Google.',
      })
    }

    const email = profile.email
    const name = profile.name || body.name?.trim() || 'Google Student'
    const phone = body.phone?.trim() || ''
    const company = body.company?.trim() || ''
    const planKey = (body.plan && PLAN_PRICES[body.plan]) ? body.plan : 'bootcamp_full'
    const workflowGoal = body.workflowGoal?.trim() || 'Custom GenAI Workflow Development'

    const users = readStore<Record<string, AuthUser>>('users.json', {})
    if (!users[ADMIN_EMAIL]) {
      users[ADMIN_EMAIL] = ADMIN_USER
      writeStore('users.json', users)
    }

    let user = users[email]
    let isNewUser = false

    if (!user) {
      isNewUser = true
      user = {
        id: `usr_g_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name,
        email,
        phone,
        company,
        role: 'student',
        cohort: 'Cohort 7 (Starts 17 Nov)',
        createdAt: new Date().toISOString(),
        googleId: profile.sub,
        avatar: profile.picture,
      }
      users[email] = user
      writeStore('users.json', users)
    } else {
      // Preserve existing account properties, optionally update avatar/googleId
      if (profile.picture && !user.avatar) user.avatar = profile.picture
      if (profile.sub && !user.googleId) user.googleId = profile.sub
      if (phone && !user.phone) user.phone = phone
      if (company && !user.company) user.company = company
      users[email] = user
      writeStore('users.json', users)
    }

    const enrolments = readStore<Enrolment[]>('enrolments.json', [])
    let userEnrolment = enrolments.find(
      (e) => e.userId === user.id || e.email.toLowerCase() === email,
    )

    // If new user and no enrolment yet, create enrolment for Cohort 7
    if (!userEnrolment) {
      const planDetails = PLAN_PRICES[planKey]
      userEnrolment = {
        id: `ENR-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
        userId: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || 'Not specified',
        countryCode: '+91',
        company: user.company || 'Independent Builder',
        cohort: 'Cohort 7 (Starts 17 Nov)',
        plan: planKey,
        planLabel: planDetails.label,
        amount: planDetails.amount,
        status: 'confirmed',
        workflowGoal,
        enrolledAt: new Date().toISOString(),
      }
      enrolments.unshift(userEnrolment)
      writeStore('enrolments.json', enrolments)
    }

    const token = generateToken()
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
    const sessions = readStore<Record<string, { userId: string; expiresAt: number }>>('sessions.json', {})
    sessions[token] = { userId: user.id, expiresAt }
    writeStore('sessions.json', sessions)

    const { passwordHash: _, ...safeUser } = user
    return sendJson(res, 200, {
      ok: true,
      message: isNewUser
        ? 'Account successfully created with Google!'
        : user.role === 'admin'
          ? 'Welcome back, Administrator!'
          : 'Signed in with Google successfully!',
      user: safeUser,
      enrolment: userEnrolment || null,
      token,
      isAdmin: user.role === 'admin',
      isNewUser,
    })
  } catch (err: any) {
    console.error('Google auth endpoint error:', err)
    return sendJson(res, 500, { error: err?.message || 'Server error during Google authentication.' })
  }
}
