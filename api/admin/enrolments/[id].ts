import {
  getSessionUserFromReq,
  updateEnrolment,
  deleteEnrolment,
  parseRequestBody,
  sendResponse,
} from '../../_store'

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
    return sendResponse(res, 204, {})
  }

  const admin = getSessionUserFromReq(req)
  if (!admin || admin.role !== 'admin') {
    return sendResponse(res, 403, { error: 'Unauthorized. Admin credentials required.' })
  }

  const id = extractId(req)
  if (!id) {
    return sendResponse(res, 400, { error: 'Missing enrolment ID.' })
  }

  if (req.method === 'PATCH') {
    const body = await parseRequestBody<{ status?: 'confirmed' | 'pending' | 'waitlist' }>(req)
    if (!body.status) {
      return sendResponse(res, 400, { error: 'Status is required.' })
    }
    const updated = updateEnrolment(id, { status: body.status })
    if (!updated) {
      return sendResponse(res, 404, { error: 'Enrolment not found.' })
    }
    return sendResponse(res, 200, { ok: true, enrolment: updated })
  }

  if (req.method === 'DELETE') {
    const success = deleteEnrolment(id)
    if (!success) {
      return sendResponse(res, 404, { error: 'Enrolment not found.' })
    }
    return sendResponse(res, 200, { ok: true, message: 'Enrolment removed.' })
  }

  return sendResponse(res, 405, { error: 'Method not allowed' })
}
