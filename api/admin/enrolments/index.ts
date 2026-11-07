import {
  getSessionUserFromReq,
  getEnrolments,
  getAllUsers,
  sendResponse,
} from '../../_store'

export default async function handler(req: any, res?: any) {
  if (req.method === 'OPTIONS') {
    return sendResponse(res, 204, {})
  }

  if (req.method !== 'GET') {
    return sendResponse(res, 405, { error: 'Method not allowed' })
  }

  const admin = getSessionUserFromReq(req)
  if (!admin || admin.role !== 'admin') {
    return sendResponse(res, 403, { error: 'Unauthorized. Admin credentials required.' })
  }

  const enrolmentsList = getEnrolments()
  const totalRevenue = enrolmentsList.reduce((acc, curr) => acc + curr.amount, 0)
  const confirmedCount = enrolmentsList.filter((e) => e.status === 'confirmed').length
  const maxCohortSeats = 6
  const seatsRemaining = Math.max(0, maxCohortSeats - confirmedCount)
  const totalUsers = Object.keys(getAllUsers()).length

  return sendResponse(res, 200, {
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
}
