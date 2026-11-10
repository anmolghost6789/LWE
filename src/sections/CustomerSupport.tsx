import {
  CreditCard,
  ExternalLink,
  HelpCircle,
  KeyRound,
  Mail,
  MessageCircle,
  Phone,
} from 'lucide-react'
import { Container } from '../components/Container'
import { Reveal } from '../components/Reveal'

export function CustomerSupport() {
  const whatsappNumber = '917488659839'
  const displayPhone = '+91 7488659839'
  const supportEmail = 'support@learnwithexpert.com'

  const supportCategories = [
    {
      icon: CreditCard,
      color: 'text-accent',
      bgColor: 'bg-accent/10 border-accent/25',
      title: 'Payment & UTR Verification',
      description:
        'Sent a UPI or bank transfer? Send your 12-digit UTR or payment screenshot on WhatsApp for priority verification and instant dashboard activation.',
      buttonLabel: 'Verify Payment via WhatsApp',
      whatsappMessage: 'Hi LearnWithExpert team, I made the payment for Cohort 7. Here is my payment receipt and UTR for verification:',
    },
    {
      icon: KeyRound,
      color: 'text-accent-2',
      bgColor: 'bg-accent-2/10 border-accent-2/25',
      title: 'Account Access & Unlocking',
      description:
        'Locked out of your account, need password recovery, or checking your approval status? Our admin desk will assist you right away.',
      buttonLabel: 'Get Account Access Help',
      whatsappMessage: 'Hi LearnWithExpert team, I need help accessing my student account. My registered email is:',
    },
    {
      icon: HelpCircle,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/25',
      title: 'General Bootcamp Assistance',
      description:
        'Questions about the six-week curriculum, session schedules, GST invoices, or corporate team enrolments? Talk with our team.',
      buttonLabel: 'Chat with Admissions',
      whatsappMessage: 'Hi LearnWithExpert team, I have a question about the GenAI Bootcamp curriculum and schedule:',
    },
  ]

  const generalWhatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    'Hi LearnWithExpert team, I need assistance with the GenAI Bootcamp.'
  )}`

  return (
    <section id="support" className="scroll-mt-24 py-20 relative">
      {/* Background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 size-[600px] rounded-full bg-[radial-gradient(circle,rgb(255_122_69/0.08),transparent_70%)] blur-3xl"
      />

      <Container>
        <Reveal>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-[12px] font-semibold text-accent border border-accent/25 mb-3">
              <MessageCircle className="size-3.5" /> Customer Support & Live Help
            </span>
            <h2 className="text-[32px] sm:text-[44px] font-semibold text-fg tracking-tight leading-tight">
              We’re Here to Help You Every Step of the Way
            </h2>
            <p className="mt-3 text-[15px] sm:text-[17px] text-muted leading-relaxed">
              Have questions regarding payment verification, transaction ID approval, or student access?
              Connect directly with our team on WhatsApp for fast, one-on-one resolution.
            </p>
          </div>
        </Reveal>

        {/* 3 Support Columns */}
        <div className="grid gap-6 md:grid-cols-3">
          {supportCategories.map((category, idx) => {
            const Icon = category.icon
            const categoryUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
              category.whatsappMessage
            )}`

            return (
              <Reveal key={category.title} delay={idx * 0.1}>
                <div className="depth flex flex-col justify-between rounded-card bg-surface p-6 sm:p-7 border border-line shadow-glow h-full hover:border-line-strong transition-all">
                  <div>
                    <div
                      className={`size-12 rounded-[14px] ${category.bgColor} border grid place-items-center mb-5`}
                    >
                      <Icon className={`size-6 ${category.color}`} />
                    </div>

                    <h3 className="text-[19px] font-semibold text-fg tracking-tight">
                      {category.title}
                    </h3>
                    <p className="mt-2 text-[13.5px] text-muted leading-relaxed">
                      {category.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-5 border-t border-line">
                    <a
                      href={categoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-[12px] bg-surface-2 hover:bg-white/[0.1] border border-line px-4 py-2.5 text-[13px] font-semibold text-fg transition-all group"
                    >
                      <MessageCircle className="size-4 text-emerald-400" />
                      <span>{category.buttonLabel}</span>
                      <ExternalLink className="size-3 text-muted group-hover:text-fg opacity-70" />
                    </a>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>

        {/* Main WhatsApp Support Banner */}
        <Reveal delay={0.35}>
          <div className="depth mt-10 rounded-[24px] bg-gradient-to-r from-surface via-surface-2 to-surface p-6 sm:p-8 border border-line flex flex-col md:flex-row items-center justify-between gap-6 shadow-glow">
            <div className="flex items-start sm:items-center gap-4">
              <div className="size-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 grid place-items-center shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                <MessageCircle className="size-7" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-[19px] font-semibold text-fg">Direct WhatsApp Support Hotline</h4>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Online & Active
                  </span>
                </div>
                <p className="text-[13px] text-muted mt-1">
                  Connect instantly with our admissions & verification coordinators. Average response time: <strong>10–15 minutes</strong>.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-[12.5px] text-muted">
                  <span className="flex items-center gap-1.5">
                    <Phone className="size-3.5 text-accent" /> WhatsApp: <strong className="text-fg font-mono">{displayPhone}</strong>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Mail className="size-3.5 text-accent" /> Email: <strong className="text-fg">{supportEmail}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
              <a
                href={generalWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-[12px] bg-emerald-500 hover:bg-emerald-400 text-bg px-6 py-3.5 text-[14px] font-semibold transition-all shadow-[0_4px_20px_rgba(16,185,129,0.35)] cursor-pointer hover:scale-[1.02]"
              >
                <MessageCircle className="size-4.5 text-bg fill-current" />
                <span>Contact Support on WhatsApp</span>
                <ExternalLink className="size-3.5 opacity-80" />
              </a>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  )
}

