import { motion, AnimatePresence } from 'motion/react'
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { Button } from '../components/Button'
import { Container } from '../components/Container'
import { PhoneInput } from '../components/PhoneInput'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import { contact } from '../content'
import {
  getCountryByCode,
  validatePhoneByCountry,
} from '../lib/countries'
import { cx } from '../lib/cx'

interface FormData {
  name: string
  email: string
  phone: string
  countryCode: string
  company: string
  service: string
  details: string
}

interface FormErrors {
  name?: string
  email?: string
  phone?: string
  company?: string
  service?: string
  details?: string
}

export function Contact() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    countryCode: 'IN',
    company: '',
    service: contact.services[0],
    details: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [serverMessage, setServerMessage] = useState('')

  const selectedCountry = getCountryByCode(formData.countryCode)

  function validate(data: FormData): FormErrors {
    const errs: FormErrors = {}

    if (!data.name.trim()) {
      errs.name = 'Full name is required.'
    } else if (data.name.trim().length < 2) {
      errs.name = 'Name must be at least 2 characters.'
    }

    if (!data.email.trim()) {
      errs.email = 'Work email is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      errs.email = 'Please enter a valid email address.'
    }

    const countryConfig = getCountryByCode(data.countryCode)
    const phoneError = validatePhoneByCountry(countryConfig, data.phone)
    if (phoneError) {
      errs.phone = phoneError
    }

    if (!data.company.trim()) {
      errs.company = 'Company or organization name is required.'
    } else if (data.company.trim().length < 2) {
      errs.company = 'Company name must be at least 2 characters.'
    }

    if (!data.service.trim()) {
      errs.service = 'Please select a service or type of work.'
    }

    if (!data.details.trim()) {
      errs.details = 'Project details are required.'
    } else if (data.details.trim().length < 10) {
      errs.details = 'Please provide at least 10 characters describing your project.'
    }

    return errs
  }

  function handleBlur(field: keyof FormData) {
    setTouched((prev) => ({ ...prev, [field]: true }))
    setErrors(validate(formData))
  }

  function handleChange(field: keyof FormData, value: string) {
    const updated = { ...formData, [field]: value }
    setFormData(updated)
    if (touched[field]) {
      setErrors(validate(updated))
    }
  }

  function handleCountrySelect(countryCode: string) {
    const updated: FormData = {
      ...formData,
      countryCode,
    }
    setFormData(updated)
    if (touched.phone) {
      setErrors(validate(updated))
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    setTouched({
      name: true,
      email: true,
      phone: true,
      company: true,
      service: true,
      details: true,
    })

    const validationErrors = validate(formData)
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setStatus('submitting')
    setServerMessage('')

    // Format full international phone number with dial code
    const fullPhone =
      selectedCountry.dialCode === '+'
        ? formData.phone.trim()
        : `${selectedCountry.dialCode} ${formData.phone.trim()}`

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: fullPhone,
      country: `${selectedCountry.flag} ${selectedCountry.name}`,
      company: formData.company.trim(),
      service: formData.service.trim(),
      details: formData.details.trim(),
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = (await response.json()) as { error?: string; message?: string }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit form. Please check your information.')
      }

      setStatus('success')
      setServerMessage(data.message || 'Inquiry submitted successfully!')
    } catch (err: any) {
      setStatus('error')
      setServerMessage(err.message || 'Something went wrong while submitting. Please try again.')
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      email: '',
      phone: '',
      countryCode: 'IN',
      company: '',
      service: contact.services[0],
      details: '',
    })
    setTouched({})
    setErrors({})
    setStatus('idle')
    setServerMessage('')
  }

  return (
    <section id="contact" className="scroll-mt-24 border-t border-line py-24 sm:py-32">
      <Container>
        <SectionHeading
          eyebrow={contact.eyebrow}
          title={contact.title}
          description={contact.description}
        />

        <div className="mt-14 grid gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Left Column: Contact info & value guarantees */}
          <Reveal delay={0.1} className="flex flex-col gap-6 lg:col-span-5">
            <div className="depth rounded-card bg-surface p-7 sm:p-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-[12px] font-medium text-accent">
                <span className="size-2 rounded-full bg-accent animate-pulse" />
                Available for Global & Indian Enterprise Projects
              </div>

              <h3 className="mt-5 text-[22px] font-semibold tracking-[-0.02em]">
                Direct engineering access. Zero agency fluff.
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">
                Whether you need a custom automation on private company data, a dedicated 6-week cohort for your tech team, or production LLM guardrails, we scope your architecture directly.
              </p>

              <div className="mt-8 flex flex-col gap-4 border-t border-line pt-6">
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-3 text-[14px] text-fg/90 transition-colors hover:text-accent"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-white/[0.06] text-accent">
                    <Mail className="size-4" />
                  </span>
                  <div>
                    <p className="text-[12px] text-muted">Team Direct Email</p>
                    <p className="font-medium">{contact.email}</p>
                  </div>
                </a>

                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-3 text-[14px] text-fg/90 transition-colors hover:text-accent"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-white/[0.06] text-accent">
                    <Phone className="size-4" />
                  </span>
                  <div>
                    <p className="text-[12px] text-muted">Direct Phone / WhatsApp</p>
                    <p className="font-medium">{contact.phone}</p>
                  </div>
                </a>

                <div className="flex items-center gap-3 text-[14px] text-fg/90">
                  <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-white/[0.06] text-accent">
                    <Clock className="size-4" />
                  </span>
                  <div>
                    <p className="text-[12px] text-muted">Response Guarantee</p>
                    <p className="font-medium">Within 24 business hours</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Commitments & Guarantees */}
            <div className="flex flex-col gap-3">
              {contact.commitments.map((c, i) => (
                <div key={i} className="depth flex items-start gap-3.5 rounded-[18px] bg-surface/70 p-4">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-[8px] bg-white/[0.08] text-accent">
                    {i === 0 && <User className="size-3.5" />}
                    {i === 1 && <ShieldCheck className="size-3.5" />}
                    {i === 2 && <Sparkles className="size-3.5" />}
                  </span>
                  <div>
                    <h4 className="text-[14px] font-semibold text-fg">{c.title}</h4>
                    <p className="mt-0.5 text-[13px] leading-snug text-muted">{c.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Right Column: Contact & Project Form */}
          <Reveal delay={0.2} className="lg:col-span-7">
            <div className="depth relative overflow-hidden rounded-card bg-surface p-7 sm:p-10 shadow-glow">
              <AnimatePresence mode="wait">
                {status === 'success' ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex flex-col items-center py-10 text-center"
                  >
                    <div className="grid size-16 place-items-center rounded-full bg-accent/15 text-accent shadow-[0_0_30px_rgb(255_122_69/0.3)]">
                      <CheckCircle2 className="size-8" />
                    </div>

                    <h3 className="mt-6 text-[24px] font-semibold tracking-tight text-fg">
                      Inquiry Received!
                    </h3>
                    <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted">
                      Thank you, <strong className="text-fg">{formData.name}</strong>. Your project details for{' '}
                      <span className="text-accent">{formData.service}</span> at{' '}
                      <strong className="text-fg">{formData.company}</strong> ({selectedCountry.flag} {selectedCountry.name}) have been securely saved and emailed to our engineering leads.
                    </p>

                    <div className="depth mt-6 w-full max-w-md rounded-[16px] bg-white/[0.02] p-5 text-left text-[13px]">
                      <p className="font-medium text-fg">Next Steps:</p>
                      <ul className="mt-2 space-y-1.5 text-muted">
                        <li>• Technical review by a senior GenAI engineer.</li>
                        <li>• Reply sent to <strong className="text-fg">{formData.email}</strong> within 24 hours.</li>
                        <li>• Contact via phone at <strong className="text-fg">{selectedCountry.dialCode} {formData.phone}</strong>.</li>
                        <li>• Optional 20-minute Zoom architecture sync to discuss data & scope.</li>
                      </ul>
                    </div>

                    <Button onClick={resetForm} variant="secondary" className="mt-8">
                      Submit Another Project Request
                    </Button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    noValidate
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col gap-6"
                  >
                    <div>
                      <h3 className="text-[20px] font-semibold text-fg">Tell us about your project</h3>
                      <p className="mt-1 text-[14px] text-muted">
                        Fill in your details below and our team will prepare a scoped recommendation.
                      </p>
                    </div>

                    {status === 'error' && (
                      <div className="flex items-start gap-3 rounded-[12px] bg-accent-3/15 p-4 text-[14px] text-accent-3 border border-accent-3/20">
                        <AlertCircle className="size-5 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Submission failed</p>
                          <p className="mt-0.5 text-[13px] opacity-90">{serverMessage}</p>
                        </div>
                      </div>
                    )}

                    {/* Row 1: Name & Email */}
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="contact-name" className="block text-[13px] font-medium text-fg/90">
                          Your Full Name <span className="text-accent">*</span>
                        </label>
                        <div className="relative mt-2">
                          <input
                            id="contact-name"
                            type="text"
                            placeholder="Sarah Jenkins"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            onBlur={() => handleBlur('name')}
                            disabled={status === 'submitting'}
                            className={cx(
                              'depth w-full rounded-[12px] bg-surface-2/70 px-4 py-3 pl-10 text-[14px] text-fg placeholder:text-muted/50 transition-colors focus:outline-none',
                              errors.name && touched.name
                                ? 'border border-accent-3 focus:ring-1 focus:ring-accent-3'
                                : 'focus:ring-1 focus:ring-accent/50',
                            )}
                          />
                          <User className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-muted" />
                        </div>
                        {errors.name && touched.name && (
                          <p className="mt-1.5 text-[12px] text-accent-3">{errors.name}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="contact-email" className="block text-[13px] font-medium text-fg/90">
                          Work Email Address <span className="text-accent">*</span>
                        </label>
                        <div className="relative mt-2">
                          <input
                            id="contact-email"
                            type="email"
                            placeholder="sarah@company.com"
                            value={formData.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            onBlur={() => handleBlur('email')}
                            disabled={status === 'submitting'}
                            className={cx(
                              'depth w-full rounded-[12px] bg-surface-2/70 px-4 py-3 pl-10 text-[14px] text-fg placeholder:text-muted/50 transition-colors focus:outline-none',
                              errors.email && touched.email
                                ? 'border border-accent-3 focus:ring-1 focus:ring-accent-3'
                                : 'focus:ring-1 focus:ring-accent/50',
                            )}
                          />
                          <Mail className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-muted" />
                        </div>
                        {errors.email && touched.email && (
                          <p className="mt-1.5 text-[12px] text-accent-3">{errors.email}</p>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Company & International Phone */}
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="contact-company" className="block text-[13px] font-medium text-fg/90">
                          Company / Organization <span className="text-accent">*</span>
                        </label>
                        <div className="relative mt-2">
                          <input
                            id="contact-company"
                            type="text"
                            placeholder="Vertex Technologies"
                            value={formData.company}
                            onChange={(e) => handleChange('company', e.target.value)}
                            onBlur={() => handleBlur('company')}
                            disabled={status === 'submitting'}
                            className={cx(
                              'depth w-full rounded-[12px] bg-surface-2/70 px-4 py-3 pl-10 text-[14px] text-fg placeholder:text-muted/50 transition-colors focus:outline-none',
                              errors.company && touched.company
                                ? 'border border-accent-3 focus:ring-1 focus:ring-accent-3'
                                : 'focus:ring-1 focus:ring-accent/50',
                            )}
                          />
                          <Building2 className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-muted" />
                        </div>
                        {errors.company && touched.company && (
                          <p className="mt-1.5 text-[12px] text-accent-3">{errors.company}</p>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <label htmlFor="contact-phone" className="block text-[13px] font-medium text-fg/90">
                            Phone Number <span className="text-accent">*</span>
                          </label>
                          <span className="text-[11px] text-muted">
                            {selectedCountry.flag} {selectedCountry.name} ({selectedCountry.dialCode})
                          </span>
                        </div>

                        <PhoneInput
                          id="contact-phone"
                          countryCode={formData.countryCode}
                          phoneNumber={formData.phone}
                          onCountryChange={handleCountrySelect}
                          onPhoneChange={(val) => handleChange('phone', val)}
                          onBlur={() => handleBlur('phone')}
                          disabled={status === 'submitting'}
                          hasError={!!(errors.phone && touched.phone)}
                        />

                        {/* Error or Hint */}
                        {errors.phone && touched.phone ? (
                          <p className="mt-1.5 text-[12px] text-accent-3">{errors.phone}</p>
                        ) : (
                          <p className="mt-1 text-[11px] text-muted/70">
                            Format: {selectedCountry.hint}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Services Needed Selection */}
                    <div>
                      <label className="block text-[13px] font-medium text-fg/90">
                        Type of Work or Services Needed <span className="text-accent">*</span>
                      </label>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {contact.services.map((service) => {
                          const selected = formData.service === service
                          return (
                            <button
                              key={service}
                              type="button"
                              onClick={() => handleChange('service', service)}
                              className={cx(
                                'depth rounded-[10px] px-3.5 py-2 text-[13px] font-medium transition-all text-left',
                                selected
                                  ? 'bg-accent/15 text-accent border border-accent/40 shadow-[0_0_15px_rgb(255_122_69/0.2)]'
                                  : 'bg-surface-2/60 text-muted hover:text-fg hover:bg-surface-2',
                              )}
                            >
                              {service}
                            </button>
                          )
                        })}
                      </div>
                      {errors.service && touched.service && (
                        <p className="mt-1.5 text-[12px] text-accent-3">{errors.service}</p>
                      )}
                    </div>

                    {/* Project Details */}
                    <div>
                      <div className="flex items-center justify-between">
                        <label htmlFor="contact-details" className="block text-[13px] font-medium text-fg/90">
                          Project Details & Requirements <span className="text-accent">*</span>
                        </label>
                        <span className="text-[11px] text-muted">
                          {formData.details.length} characters (min 10)
                        </span>
                      </div>
                      <div className="relative mt-2">
                        <textarea
                          id="contact-details"
                          rows={4}
                          placeholder="Describe your current manual workflow, what you want to automate, tools you use (OpenAI, Anthropic, LangChain, n8n, etc.), and your timeline..."
                          value={formData.details}
                          onChange={(e) => handleChange('details', e.target.value)}
                          onBlur={() => handleBlur('details')}
                          disabled={status === 'submitting'}
                          className={cx(
                            'depth w-full resize-y rounded-[12px] bg-surface-2/70 p-3.5 pl-10 text-[14px] text-fg placeholder:text-muted/50 transition-colors focus:outline-none',
                            errors.details && touched.details
                              ? 'border border-accent-3 focus:ring-1 focus:ring-accent-3'
                              : 'focus:ring-1 focus:ring-accent/50',
                          )}
                        />
                        <MessageSquare className="pointer-events-none absolute left-3.5 top-4 size-4 text-muted" />
                      </div>
                      {errors.details && touched.details && (
                        <p className="mt-1.5 text-[12px] text-accent-3">{errors.details}</p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        disabled={status === 'submitting'}
                        className="w-full font-semibold shadow-glow"
                      >
                        {status === 'submitting' ? (
                          <>
                            <span className="size-4 animate-spin rounded-full border-2 border-bg border-t-transparent" />
                            <span>Sending Project Details...</span>
                          </>
                        ) : (
                          <>
                            <Send className="size-4" />
                            <span>Submit Project Request</span>
                          </>
                        )}
                      </Button>

                      <p className="mt-3.5 flex items-center justify-center gap-1.5 text-center text-[12px] text-muted">
                        <ShieldCheck className="size-3.5 text-accent" />
                        <span>Confidential. Secured with database encryption and mutual NDA protection.</span>
                      </p>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  )
}
