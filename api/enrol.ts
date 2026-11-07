import {
  getUserByEmail,
  hashPassword,
  verifyPassword,
  saveUser,
  saveEnrolment,
  saveSession,
  generateToken,
  getSessionUserFromReq,
  isPlanKey,
  PLAN_PRICES,
  parseRequestBody,
  sendResponse,
  type Enrolment,
} from './_store'

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
      plan?: 'bootcamp_full' | 'bootcamp_instalment' | 'recordings' | 'team'
      workflowGoal?: string
    }>(req)

    const name = body.name?.trim() ?? ''
    const email = body.email?.trim().toLowerCase() ?? ''
    const phone = body.phone?.trim() ?? ''
    const company = body.company?.trim() ?? ''
    const password = body.password ?? ''
    const workflowGoal = body.workflowGoal?.trim() || 'Production GenAI Workflow'
    const plan = isPlanKey(body.plan) ? body.plan : 'bootcamp_full'

    if (!name || name.length < 2) {
      return sendResponse(res, 400, { error: 'Please enter your full name.' })
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return sendResponse(res, 400, { error: 'Please enter a valid email address.' })
    }
    if (!phone || phone.replace(/\D/g, '').length < 7) {
      return sendResponse(res, 400, { error: 'Please enter a valid phone number (minimum 7 digits).' })
    }

    const requester = getSessionUserFromReq(req)
    let user = getUserByEmail(email)

    if (user) {
      const isOwner = requester?.id === user.id
      if (!isOwner && !verifyPassword(password, user.passwordHash)) {
        return sendResponse(res, 401, {
          error: 'An account with this email already exists. Sign in or enter the correct password to enrol.',
        })
      }
    } else {
      if (!password || password.length < 8) {
        return sendResponse(res, 400, {
          error: 'Please set a secure password (minimum 8 characters) for your learning portal.',
        })
      }

      const passwordHash = hashPassword(password)
      user = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name,
        email,
        phone,
        company,
        passwordHash,
        role: 'student',
        cohort: 'Cohort 7 (Starts 17 Nov)',
        createdAt: new Date().toISOString(),
      }
      saveUser(user)
    }

    const token = generateToken()
    saveSession(token, { userId: user.id, expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 })

    const planDetails = PLAN_PRICES[plan]
    const enrolmentRecord: Enrolment = {
      id: `ENR-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      userId: user.id,
      name,
      email,
      phone,
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

    saveEnrolment(enrolmentRecord)

    const { passwordHash: _, ...safeUser } = user
    return sendResponse(res, 200, {
      ok: true,
      message: 'Enrolment confirmed for Cohort 7!',
      enrolment: enrolmentRecord,
      user: safeUser,
      token,
    })
  } catch (err) {
    console.error('Enrolment error:', err)
    return sendResponse(res, 500, { error: 'Failed to process enrolment. Please try again.' })
  }
}
