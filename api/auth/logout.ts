import {
  deleteSession,
  sendResponse,
} from '../_store.ts'

export default async function handler(req: any, res?: any) {
  if (req.method === 'OPTIONS') {
    return sendResponse(res, 204, {})
  }

  if (req.method !== 'POST') {
    return sendResponse(res, 405, { error: 'Method not allowed' })
  }

  let authHeader = ''
  if (req && typeof req.headers?.get === 'function') {
    authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || ''
  } else if (req && req.headers) {
    authHeader = req.headers['authorization'] || req.headers['Authorization'] || ''
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim()
    deleteSession(token)
  }

  return sendResponse(res, 200, { ok: true, message: 'Logged out successfully.' })
}
