import type { IncomingMessage, ServerResponse } from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

interface AuthUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'student'
}

interface Enrolment {
  id: string
  amount: number
  status: string
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

  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method not allowed' })
  }

  try {
    let authHeader = ''
    if (typeof req.headers?.get === 'function') {
      authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || ''
    } else if (req.headers) {
      authHeader = req.headers['authorization'] || req.headers['Authorization'] || ''
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendJson(res, 403, { error: 'Unauthorized. Admin credentials required.' })
    }

    const token = authHeader.slice('Bearer '.length).trim()
    const sessions = readStore<Record<string, { userId: string; expiresAt: number }>>('sessions.json', {})
    const session = sessions[token]

    if (!session || session.expiresAt < Date.now()) {
      return sendJson(res, 403, { error: 'Unauthorized. Admin credentials required.' })
    }

    const users = readStore<Record<string, AuthUser>>('users.json', {})
    let matchedUser: AuthUser | null = null
    for (const u of Object.values(users)) {
      if (u.id === session.userId) {
        matchedUser = u
        break
      }
    }

    if (!matchedUser || matchedUser.role !== 'admin') {
      return sendJson(res, 403, { error: 'Unauthorized. Admin credentials required.' })
    }

    const enrolmentsList = readStore<Enrolment[]>('enrolments.json', [])
    const totalRevenue = enrolmentsList.reduce((acc, curr) => acc + (curr.amount || 0), 0)
    const confirmedCount = enrolmentsList.filter((e) => e.status === 'confirmed').length
    const maxCohortSeats = 6
    const seatsRemaining = Math.max(0, maxCohortSeats - confirmedCount)
    const totalUsers = Object.keys(users).length

    return sendJson(res, 200, {
      ok: true,
      enrolments: enrolmentsList,
      totalUsers,
      stats: {
        totalEnrolled: enrolmentsList.length,
        confirmedCount,
        seatsRemaining,
        maxCohortSeats,
        totalRevenue,
      },
    })
  } catch (err: any) {
    console.error('Admin enrolments error:', err)
    return sendJson(res, 500, { error: err?.message || 'Server error' })
  }
}
