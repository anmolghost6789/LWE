import { sendResponse } from './_store'

export default function handler(req: any, res?: any) {
  if (req.method === 'OPTIONS') {
    return sendResponse(res, 204, {})
  }
  return sendResponse(res, 404, { error: 'Not found.' })
}
