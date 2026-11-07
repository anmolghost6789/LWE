import {
  getUserByEmail,
  hashPassword,
  saveUser,
  saveEnrolment,
  saveSession,
  generateToken,
  isPlanKey,
  PLAN_PRICES,
  parseRequestBody,
  sendResponse,
  type AuthUser,
  type Enrolment,
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
      name?: string
      email?: string
      phone?: string
      company?: string
      password?: string
      role?: string
      workflowGoal?: string
      plan?: 'bootcamp_full' | 'bootcamp_instalment' | 'recordings' | 'team'
    }>(req)

    const name = body.name?.trim() ?? ''
    const email = body.email?.trim().toLowerCase() ?? ''
    const phone = body.phone?.trim() ?? ''
    const company = body.company?.trim() ?? ''
    const password = body.password ?? ''
    const studentRole = body.role?.trim() || 'Software Developer'
    const workflowGoal = body.workflowGoal?.trim() || 'Custom GenAI Workflow'
    const plan = isPlanKey(body.plan) ? body.plan : 'bootcamp_full'

    if (!name || name.length < 2) {
      return sendResponse(res, 400, { error: 'Please enter your full name (minimum 2 characters).' })
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return sendResponse(res, 400, { error: 'Please enter a valid email address.' })
    }
    if (!password || password.length < 8) {
      return sendResponse(res, 400, { error: 'Password must be at least 8 characters long.' })
    }

    if (getUserByEmail(email)) {
      return sendResponse(res, 409, { error: 'An account with this email already exists. Please sign in.' })
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

    saveUser(newUser)

    const planDetails = PLAN_PRICES[plan]
    const newEnrolment: Enrolment = {
      id: `ENR-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      userId: newUser.id,
      name,
      email,
      phone: phone || 'Not specified',
      countryCode: '+91',
      company: company || 'Independent Builder',
      cohort: 'Cohort 7 (Starts 17 Nov)',
      plan,
      planLabel: planDetails.label,
      amount: planDetails.amount,
      status: 'confirmed',
      workflowGoal,
      enrolledAt: new Date().toISOString(),
    }

    saveEnrolment(newEnrolment)

    const token = generateToken()
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
    saveSession(token, { userId: newUser.id, expiresAt })

    const { passwordHash: _, ...safeUser } = newUser
    return sendResponse(res, 200, {
      ok: true,
      message: 'Account created and successfully enrolled in Cohort 7!',
      user: safeUser,
      enrolment: newEnrolment,
      token,
    })
  } catch (err: any) {
    console.error('Registration error:', err)
    return sendResponse(res, 500, { error: err?.message || 'Failed to complete registration. Please try again.' })
  }
}
