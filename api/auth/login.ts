import {
  getUserByEmail,
  verifyPassword,
  saveSession,
  generateToken,
  getEnrolments,
  parseRequestBody,
  sendResponse,
} from '../_store'

export default async function handler(req: any, res?: any) {
  if (req.method === 'OPTIONS') {
    return sendResponse(res, 204, {})
  }

  if (req.method !== 'POST') {
    return sendResponse(res, 405, { error: 'Method not allowed' })
  }

  try {
    const body = await parseRequestBody<{
      email?: string
      password?: string
      rememberMe?: boolean
    }>(req)

    const email = body.email?.trim().toLowerCase() ?? ''
    const password = body.password ?? ''

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return sendResponse(res, 400, { error: 'Please enter a valid email address.' })
    }
    if (!password) {
      return sendResponse(res, 400, { error: 'Please enter your password.' })
    }

    const user = getUserByEmail(email)
    if (!user) {
      return sendResponse(res, 401, {
        error: 'No account found with this email. Please register to create an account and enrol.',
      })
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return sendResponse(res, 401, {
        error: 'Incorrect password. Please verify your credentials and try again.',
      })
    }

    const token = generateToken()
    const duration = body.rememberMe ? 60 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
    saveSession(token, { userId: user.id, expiresAt: Date.now() + duration })

    const enrolments = getEnrolments()
    const userEnrolment = enrolments.find((e) => e.userId === user.id || e.email.toLowerCase() === user.email.toLowerCase())

    const { passwordHash: _, ...safeUser } = user
    return sendResponse(res, 200, {
      ok: true,
      message: user.role === 'admin' ? 'Welcome back, Administrator!' : 'Signed in successfully!',
      user: safeUser,
      enrolment: userEnrolment || null,
      token,
    })
  } catch (err: any) {
    console.error('Login error:', err)
    return sendResponse(res, 500, { error: err?.message || 'Failed to sign in. Please try again.' })
  }
}
