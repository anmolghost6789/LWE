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

function writeStore<T>(filename: string, data: T) {
  const primary = getStorePath(filename)
  try {
    fs.mkdirSync(path.dirname(primary), { recursive: true })
    fs.writeFileSync(primary, JSON.stringify(data, null, 2), 'utf-8')
  } catch (e) {
    console.error('Failed to write store:', e)
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
        return JSON.parse(req.body)
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

function extractId(req: any): string {
  if (req?.query?.id) {
    return Array.isArray(req.query.id) ? req.query.id[0] : req.query.id
  }
  const url = req?.url || ''
  const match = url.match(/\/api\/admin\/enrolments\/([^/?#]+)/)
  return match ? match[1] : ''
}

export default async function handler(req: any, res?: any) {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {})
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

    const id = extractId(req)
    if (!id) {
      return sendJson(res, 400, { error: 'Missing enrolment ID.' })
    }

    const enrolments = readStore<Enrolment[]>('enrolments.json', [])

    if (req.method === 'PATCH') {
      const body = await parseBody<{ status?: string }>(req)
      if (!body.status) {
        return sendJson(res, 400, { error: 'Status is required.' })
      }
      const item = enrolments.find((e) => e.id === id)
      if (!item) {
        return sendJson(res, 404, { error: 'Enrolment not found.' })
      }
      item.status = body.status
      writeStore('enrolments.json', enrolments)
      return sendJson(res, 200, { ok: true, enrolment: item })
    }

    if (req.method === 'DELETE') {
      const index = enrolments.findIndex((e) => e.id === id)
      if (index === -1) {
        return sendJson(res, 404, { error: 'Enrolment not found.' })
      }
      enrolments.splice(index, 1)
      writeStore('enrolments.json', enrolments)
      return sendJson(res, 200, { ok: true, message: 'Enrolment removed.' })
    }

    return sendJson(res, 405, { error: 'Method not allowed' })
  } catch (err: any) {
    console.error('Admin enrolment operation error:', err)
    return sendJson(res, 500, { error: err?.message || 'Server error' })
  }
}
