import type { IncomingMessage, ServerResponse } from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

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
    let authHeader = ''
    if (typeof req.headers?.get === 'function') {
      authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || ''
    } else if (req.headers) {
      authHeader = req.headers['authorization'] || req.headers['Authorization'] || ''
    }

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice('Bearer '.length).trim()
      const sessions = readStore<Record<string, { userId: string; expiresAt: number }>>('sessions.json', {})
      if (sessions[token]) {
        delete sessions[token]
        writeStore('sessions.json', sessions)
      }
    }

    return sendJson(res, 200, { ok: true, message: 'Logged out successfully.' })
  } catch (err: any) {
    return sendJson(res, 500, { error: err?.message || 'Server error' })
  }
}
