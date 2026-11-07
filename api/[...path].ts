export default function handler(req: any, res?: any) {
  if (req.method === 'OPTIONS') {
    if (res && typeof res.status === 'function') {
      return res.status(204).end()
    }
    return new Response(null, { status: 204 })
  }
  const body = JSON.stringify({ error: 'Not found.' })
  if (res && typeof res.status === 'function' && typeof res.json === 'function') {
    res.setHeader('Content-Type', 'application/json')
    return res.status(404).json({ error: 'Not found.' })
  }
  if (res && typeof res.writeHead === 'function') {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    return res.end(body)
  }
  return new Response(body, {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  })
}
