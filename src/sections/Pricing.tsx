import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { useState } from 'react'

import { Button } from '../components/Button'
import { Container } from '../components/Container'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import { pricing } from '../content'
import { useAuth } from '../context/AuthContext'
import { cx } from '../lib/cx'

interface PricingProps {
  onOpenAuth?: (mode: 'signin' | 'register') => void
}

export function Pricing({ onOpenAuth: _ }: PricingProps) {
  const { openJoinCohort } = useAuth()
  const [yearly, setYearly] = useState(true)
  return (
    <section id="pricing" className="scroll-mt-24 border-t border-line py-24 sm:py-32">
      <Container>
        <SectionHeading eyebrow={pricing.eyebrow} title={pricing.title} description={pricing.description} />

        <Reveal className="mt-10 flex justify-center">
          <div role="radiogroup" className="depth relative grid h-11 grid-cols-2 rounded-control bg-surface p-1 text-[14px]">
            {(['monthly', 'yearly'] as const).map((period) => {
              const selected = (period === 'yearly') === yearly
              return (
                <button
                  key={period}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setYearly(period === 'yearly')}
                  className={cx('relative z-10 flex items-center justify-center gap-2 rounded-[10px] px-5 transition-colors', selected ? 'text-fg' : 'text-muted hover:text-fg')}
                >
                  {selected && (
                    <motion.span
                      layoutId="billing-pill"
                      className="absolute inset-0 -z-10 rounded-[10px] bg-white/[0.08]"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  )}
                  {pricing.periods[period]}
                  {period === 'yearly' && <span className="rounded-[6px] bg-accent-2/15 px-1.5 py-0.5 text-[11px] text-accent-2">{pricing.yearlyNote}</span>}
                </button>
              )
            })}
          </div>
        </Reveal>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {pricing.tiers.map((tier, i) => {
            const price = yearly ? tier.yearly : tier.monthly
            const originalPrice = yearly ? tier.originalYearly : tier.originalMonthly
            return (
              <Reveal key={tier.name} delay={i * 0.08} className="h-full">
                <article
                  className={cx(
                    'depth relative flex h-full flex-col rounded-card bg-surface p-7',
                    tier.popular ? '[--depth-edge:rgb(255_122_69/0.45)] [--depth-highlight:rgb(255_181_71/0.25)] shadow-[0_40px_80px_-40px_rgb(255_122_69/0.35)]' : 'shadow-glow',
                  )}
                >
                  {tier.badge && (
                    <span
                      className={cx(
                        'absolute right-6 top-6 rounded-[8px] px-2.5 py-1 text-[11.5px] font-medium tracking-tight',
                        tier.popular
                          ? 'border border-accent/30 bg-accent/15 text-accent shadow-[0_0_12px_rgba(255,122,69,0.2)]'
                          : 'border border-line bg-surface-2/80 text-muted',
                      )}
                    >
                      {tier.badge}
                    </span>
                  )}
                  <h3 className="text-[16px] font-semibold">{tier.name}</h3>
                  <p className="mt-1 min-h-[44px] text-[14px] leading-snug text-muted">{tier.description}</p>
                  <div className="mt-6 flex flex-wrap items-baseline gap-2">
                    <span className="text-[36px] font-semibold leading-none tracking-[-0.03em] tabular-nums sm:text-[42px]">
                      {pricing.currency ?? '₹'}{price.toLocaleString('en-IN')}
                    </span>
                    {originalPrice !== undefined && originalPrice > 0 && (
                      <span className="text-[17px] text-faint line-through tabular-nums decoration-faint/60">
                        {pricing.currency ?? '₹'}{originalPrice.toLocaleString('en-IN')}
                      </span>
                    )}
                    <span className="text-[13px] text-muted">{tier.unit[yearly ? 'yearly' : 'monthly']}</span>
                  </div>
                  {tier.popular && (
                    <p className="mt-2 text-[12px] text-accent-2 font-medium">
                      ✨ ₹1,666/session · Live 90-min expert builds
                    </p>
                  )}
                  <Button
                    variant={tier.popular ? 'primary' : 'secondary'}
                    className="mt-7 w-full cursor-pointer"
                    onClick={() => {
                      if (tier.name === 'Recordings') {
                        openJoinCohort('recordings')
                      } else if (tier.name === 'Team') {
                        openJoinCohort('team')
                      } else {
                        openJoinCohort(yearly ? 'bootcamp_full' : 'bootcamp_instalment')
                      }
                    }}
                  >
                    {tier.cta}
                  </Button>
                  <ul className="mt-7 flex flex-col gap-3 border-t border-line pt-7">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-[14px] text-fg/90">
                        <span className="mt-0.5 grid size-4.5 shrink-0 place-items-center rounded-[6px] bg-white/[0.08]">
                          <Check className="size-3" />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            )
          })}
        </div>
      </Container>
    </section>
  )
}
