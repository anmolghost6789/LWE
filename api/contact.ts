import type { IncomingMessage, ServerResponse } from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

interface ContactSubmission {
  id: string
  name: string
  email: string
  phone: string
  country?: string
  company: string
  service: string
  details: string
  createdAt: string
  ip?: string
}

const DATA_FILE = path.join(process.cwd(), 'data', 'contacts.json')
const TMP_DATA_FILE = '/tmp/contacts.json'

function getStoragePath(): string {
  try {
    if (fs.existsSync(path.dirname(DATA_FILE))) {
      return DATA_FILE
    }
  } catch {
    // ignore
  }
  return TMP_DATA_FILE
}

function loadSubmissions(): ContactSubmission[] {
  const filePath = getStoragePath()
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(data)
    }
  } catch {
    // fallback
  }
  return []
}

function saveSubmission(submission: ContactSubmission) {
  const filePath = getStoragePath()
  try {
    const list = loadSubmissions()
    list.unshift(submission)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8')
  } catch (err) {
    console.error('Failed to write submission to disk:', err)
  }
}

async function sendNotificationEmail(record: ContactSubmission) {
  const resendApiKey = process.env.RESEND_API_KEY
  const teamEmail = process.env.TEAM_NOTIFICATION_EMAIL || 'contact@learnwithexpert.com'

  console.log(`[CONTACT NOTIFICATION] Received from ${record.name} (${record.company}) for service: ${record.service}`)

  if (!resendApiKey) {
    console.log('[EMAIL NOTICE] RESEND_API_KEY not configured. To receive inbox notifications, add RESEND_API_KEY in your environment variables.')
    return
  }

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'learnwithexpert Inquiries <onboarding@resend.dev>',
        to: [teamEmail],
        reply_to: record.email,
        subject: `🚀 New Project Inquiry: ${record.service} - ${record.company}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #ff7a45; margin-top: 0;">New Project Inquiry Received</h2>
            <p style="font-size: 15px; color: #555;">A new lead has submitted the Work With Us form on learnwithexpert*.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr><td style="padding: 8px 0; font-weight: bold; width: 140px;">Name:</td><td>${record.name}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td><a href="mailto:${record.email}">${record.email}</a></td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Phone:</td><td><a href="tel:${record.phone}">${record.phone}</a></td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Company:</td><td>${record.company}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Country / Location:</td><td>${record.country || 'Not specified'}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Service Needed:</td><td style="color: #ff7a45; font-weight: bold;">${record.service}</td></tr>
              <tr><td style="padding: 8px 0; font-weight: bold;">Submitted At:</td><td>${new Date(record.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td></tr>
            </table>
            <h3 style="margin-top: 24px; font-size: 15px;">Project Details & Requirements:</h3>
            <div style="background: #f9f9f9; padding: 16px; border-radius: 6px; white-space: pre-wrap; font-size: 14px; line-height: 1.5; color: #222;">${record.details}</div>
          </div>
        `,
      }),
    })
  } catch (err) {
    console.error('Failed to send Resend email:', err)
  }
}

export default async function handler(req: any, res?: any) {
  // Support both standard Node.js (req, res) and Fetch Web API (Request)
  if (req instanceof Request) {
    if (req.method === 'GET') {
      const submissions = loadSubmissions()
      return new Response(JSON.stringify({ total: submissions.length, submissions: submissions.slice(0, 10) }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    try {
      const body = (await req.json()) as Partial<ContactSubmission>
      const validationError = validate(body)
      if (validationError) {
        return new Response(JSON.stringify({ error: validationError }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const record: ContactSubmission = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: body.name!.trim(),
        email: body.email!.trim().toLowerCase(),
        phone: body.phone!.trim(),
        country: body.country ? body.country.trim() : 'India',
        company: body.company!.trim(),
        service: body.service!.trim(),
        details: body.details!.trim(),
        createdAt: new Date().toISOString(),
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
      }

      saveSubmission(record)
      await sendNotificationEmail(record)

      return new Response(
        JSON.stringify({
          ok: true,
          message: 'Your inquiry has been received and saved! Our engineering team will review it and reply within 24 hours.',
          id: record.id,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON request payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  // Node.js handler
  if (req.method === 'GET') {
    const submissions = loadSubmissions()
    res.setHeader('Content-Type', 'application/json')
    res.status(200).json({ total: submissions.length, submissions: submissions.slice(0, 10) })
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const body = req.body || {}
    const validationError = validate(body)
    if (validationError) {
      res.status(400).json({ error: validationError })
      return
    }

    const record: ContactSubmission = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone.trim(),
      country: body.country ? body.country.trim() : 'India',
      company: body.company.trim(),
      service: body.service.trim(),
      details: body.details.trim(),
      createdAt: new Date().toISOString(),
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1',
    }

    saveSubmission(record)
    await sendNotificationEmail(record)

    res.status(200).json({
      ok: true,
      message: 'Your inquiry has been received and saved! Our engineering team will review it and reply within 24 hours.',
      id: record.id,
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Server error' })
  }
}

function validate(body: Partial<ContactSubmission>): string | null {
  if (!body.name || body.name.trim().length < 2) {
    return 'Please enter your full name (minimum 2 characters).'
  }
  if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
    return 'Please enter a valid work email address.'
  }
  if (!body.phone || body.phone.trim().replace(/\D/g, '').length < 7) {
    return 'Please enter a valid phone number with country/area code (minimum 7 digits).'
  }
  if (!body.company || body.company.trim().length < 2) {
    return 'Please enter your company or organization name.'
  }
  if (!body.service || body.service.trim().length < 2) {
    return 'Please select the type of work or service you need.'
  }
  if (!body.details || body.details.trim().length < 10) {
    return 'Please provide at least 10 characters describing your project or requirements.'
  }
  return null
}

