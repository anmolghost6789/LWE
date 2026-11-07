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
  plan: 'bootcamp_full' | 'bootcamp_instalment' | 'recordings' | 'team'
  planLabel: string
  amount: number
  status: 'confirmed' | 'pending' | 'waitlist'
  workflowGoal: string
  enrolledAt: string
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

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_lwe_secure_salt_2026').digest('hex')
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

    const users = readStore<Record<string, AuthUser>>('users.json', {})
    if (users[email]) {
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

    users[email] = newUser
    writeStore('users.json', users)

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

    const enrolments = readStore<Enrolment[]>('enrolments.json', [])
    enrolments.unshift(newEnrolment)
    writeStore('enrolments.json', enrolments)

    const token = generateToken()
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
    const sessions = readStore<Record<string, { userId: string; expiresAt: number }>>('sessions.json', {})
    sessions[token] = { userId: newUser.id, expiresAt }
    writeStore('sessions.json', sessions)

    const { passwordHash: _, ...safeUser } = newUser
    return sendJson(res, 200, {
      ok: true,
      message: 'Account created and successfully enrolled in Cohort 7!',
      user: safeUser,
      enrolment: newEnrolment,
      token,
    })
  } catch (err: any) {
    console.error('Registration error:', err)
    return sendJson(res, 500, { error: err?.message || 'Failed to complete registration. Please try again.' })
  }
}
