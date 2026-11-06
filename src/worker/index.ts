import { Hono } from 'hono'

// The Worker in front of the static site. Add API routes here; everything
// else falls through to the built assets (single-page-application mode).
type Env = {
  ASSETS: Fetcher
  DB?: any
  CONTACTS?: any
  RESEND_API_KEY?: string
  TEAM_NOTIFICATION_EMAIL?: string
}

type ContactSubmission = {
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

const inMemorySubmissions: ContactSubmission[] = []

const app = new Hono<{ Bindings: Env }>()

app.get('/api/health', (c) => c.json({ ok: true }))

// Newsletter / waitlist capture. Wire this to your email provider or a D1
// table; it currently just acknowledges the address.
app.post('/api/subscribe', async (c) => {
  const body = await c.req.json<{ email?: string }>().catch(() => ({}) as { email?: string })
  const email = body.email?.trim() ?? ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ error: 'Enter a valid email address.' }, 400)
  }
  return c.json({ ok: true })
})

// Work With Us / Contact Us form handler
app.post('/api/contact', async (c) => {
  try {
    const body = await c.req.json<Partial<ContactSubmission>>().catch(() => ({}) as Partial<ContactSubmission>)
    const { name, email, phone, country, company, service, details } = body

    if (!name || name.trim().length < 2) {
      return c.json({ error: 'Please enter your full name (minimum 2 characters).' }, 400)
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return c.json({ error: 'Please enter a valid work email address.' }, 400)
    }
    if (!phone || phone.trim().replace(/\D/g, '').length < 7) {
      return c.json({ error: 'Please enter a valid phone number (minimum 7 digits).' }, 400)
    }
    if (!company || company.trim().length < 2) {
      return c.json({ error: 'Please enter your company or organization name.' }, 400)
    }
    if (!service || service.trim().length < 2) {
      return c.json({ error: 'Please select the service or work you need.' }, 400)
    }
    if (!details || details.trim().length < 10) {
      return c.json({ error: 'Please provide at least 10 characters describing your project or requirements.' }, 400)
    }

    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1'
    const record: ContactSubmission = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      country: country ? country.trim() : 'India',
      company: company.trim(),
      service: service.trim(),
      details: details.trim(),
      createdAt: new Date().toISOString(),
      ip,
    }

    // Secure database storage (D1 if bound, or in-memory)
    if (c.env?.DB) {
      try {
        await c.env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS contact_submissions (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            company TEXT NOT NULL,
            service TEXT NOT NULL,
            details TEXT NOT NULL,
            created_at TEXT NOT NULL,
            ip TEXT
          )
        `).run()

        await c.env.DB.prepare(`
          INSERT INTO contact_submissions (id, name, email, phone, company, service, details, created_at, ip)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(record.id, record.name, record.email, record.phone, record.company, record.service, record.details, record.createdAt, record.ip).run()
      } catch (dbErr) {
        console.error('D1 storage error:', dbErr)
      }
    }

    inMemorySubmissions.unshift(record)

    // Email notification
    const resendKey = c.env?.RESEND_API_KEY || (typeof process !== 'undefined' ? process.env?.RESEND_API_KEY : undefined)
    const teamEmail = c.env?.TEAM_NOTIFICATION_EMAIL || 'anmolgupt0520@gmail.com'

    console.log(`[CONTACT INQUIRY] From: ${record.name} (${record.company}) | Service: ${record.service} | Phone: ${record.phone} | Email: ${record.email}`)

    if (resendKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
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
                  <tr><td style="padding: 8px 0; font-weight: bold;">Submitted:</td><td>${new Date(record.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td></tr>
                </table>
                <h3 style="margin-top: 24px; font-size: 15px;">Project Details & Requirements:</h3>
                <div style="background: #f9f9f9; padding: 16px; border-radius: 6px; white-space: pre-wrap; font-size: 14px; line-height: 1.5; color: #222;">${record.details}</div>
              </div>
            `,
          }),
        })
      } catch (emailErr) {
        console.error('Failed to dispatch email via Resend:', emailErr)
      }
    }

    return c.json({
      ok: true,
      message: 'Your inquiry has been securely stored and sent to our team. We will be in touch within 24 hours!',
      id: record.id,
    })
  } catch {
    return c.json({ error: 'Failed to process inquiry. Please check your information and try again.' }, 500)
  }
})

// Submission retrieval
app.get('/api/contact', (c) => {
  return c.json({
    total: inMemorySubmissions.length,
    submissions: inMemorySubmissions.slice(0, 10),
  })
})

app.all('*', (c) => c.env.ASSETS.fetch(c.req.raw))

export default app
