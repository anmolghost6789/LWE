import {
  getSessionUserFromReq,
  getEnrolments,
  sendResponse,
} from '../_store'

export default async function handler(req: any, res?: any) {
  if (req.method === 'OPTIONS') {
    return sendResponse(res, 204, {})
  }

  if (req.method !== 'GET') {
    return sendResponse(res, 405, { error: 'Method not allowed' })
  }

  const user = getSessionUserFromReq(req)
  if (!user) {
    return sendResponse(res, 401, {
      ok: false,
      user: null,
      error: 'Session expired. Please sign in again.',
    })
  }

  const enrolments = getEnrolments()
  const userEnrolment = enrolments.find(
    (e) => e.userId === user.id || e.email.toLowerCase() === user.email.toLowerCase(),
  )

  const { passwordHash: _, ...safeUser } = user
  return sendResponse(res, 200, {
    ok: true,
    user: safeUser,
    enrolment: userEnrolment || null,
  })
}
