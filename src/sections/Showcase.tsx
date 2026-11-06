import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { Container } from '../components/Container'
import { Monogram } from '../components/DashboardMock'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import { showcase } from '../content'
import { cx } from '../lib/cx'

export function Showcase() {
  const [active, setActive] = useState(showcase.tabs[0].key)
  return (
    <section className="border-t border-line py-24 sm:py-32">
      <Container>
        <SectionHeading eyebrow={showcase.eyebrow} title={showcase.title} align="left" />
        <div className="mt-12 grid gap-8 lg:grid-cols-[320px_1fr] lg:gap-12">
          <Reveal>
            <ul className="flex flex-col gap-1">
              {showcase.tabs.map((tab) => {
                const isActive = tab.key === active
                return (
                  <li key={tab.key}>
                    <button
                      type="button"
                      onClick={() => setActive(tab.key)}
                      aria-pressed={isActive}
                      className={cx(
                        'relative w-full rounded-card-sm px-5 py-4 text-left transition-colors',
                        isActive ? 'bg-surface' : 'hover:bg-white/[0.03]',
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="showcase-active"
                          className="depth absolute inset-0 rounded-card-sm"
                          transition={{ type: 'spring', stiffness: 400, damping: 36 }}
                        />
                      )}
                      <span className={cx('relative block text-[16px] font-semibold', isActive ? 'text-fg' : 'text-muted')}>
                        {tab.title}
                      </span>
                      <span className="relative mt-1 block text-[14px] leading-relaxed text-muted">{tab.description}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="depth relative aspect-[16/10] overflow-hidden rounded-card bg-surface shadow-glow">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 12, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.99 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 p-5 sm:p-7"
                >
                  {active === 'inbox' && <InboxPanel />}
                  {active === 'board' && <BoardPanel />}
                  {active === 'report' && <ReportPanel />}
                </motion.div>
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  )
}

const inbox = [
  { who: 'PN', hue: 120, title: 'Priya opens her invoice extractor — 40 PDFs in one pass', when: '0:05' },
  { who: 'DO', hue: 170, title: 'Daniel’s retrieval step returns nothing. We debug it live.', when: '0:22' },
  { who: 'SM', hue: 20, title: 'Sofia’s summary is too long — prompt rewrite on screen', when: '0:48' },
  { who: 'JW', hue: 300, title: 'Jonas adds a guardrail: no numbers without a source', when: '1:03' },
  { who: 'LF', hue: 40, title: 'Lucas ships his first run to the team Slack channel', when: '1:18' },
  { who: 'MC', hue: 250, title: 'Wrap-up: what each person builds before next Thursday', when: '1:26' },
]

function InboxPanel() {
  return (
    <ul className="flex h-full flex-col gap-2">
      {inbox.map((item, i) => (
        <motion.li
          key={item.title}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          className={cx(
            'depth relative flex items-center gap-3 rounded-[14px] px-4 py-3',
            i === 0 ? 'bg-white/[0.04] [--depth-edge:rgb(255_236_224/0.22)]' : '[--depth-edge:var(--color-line)]',
          )}
        >
          <Monogram initials={item.who} hue={item.hue} className="size-7 text-[11px]" />
          <span className="min-w-0 flex-1 truncate text-[13px] sm:text-[14px]">{item.title}</span>
          <span className="text-[12px] tabular-nums text-faint">{item.when}</span>
        </motion.li>
      ))}
    </ul>
  )
}

const columns = [
  { title: 'Picking', cards: ['Support triage', 'Invoice extraction'] },
  { title: 'Building', cards: ['Meeting notes to CRM', 'Weekly ops report', 'RFP first drafts'] },
  { title: 'In review', cards: ['Contract summariser'] },
  { title: 'Running', cards: ['Ticket router', 'Onboarding Q&A bot'] },
]

function BoardPanel() {
  return (
    <div className="grid h-full grid-cols-2 gap-3 sm:grid-cols-4">
      {columns.map((col, ci) => (
        <div key={col.title} className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[12px] font-medium text-muted">{col.title}</span>
            <span className="text-[11px] tabular-nums text-faint">{col.cards.length}</span>
          </div>
          {col.cards.map((card, i) => (
            <motion.div
              key={card}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: ci * 0.05 + i * 0.06 }}
              className="depth relative rounded-[12px] bg-white/[0.03] p-3"
            >
              <p className="text-[12px] leading-snug sm:text-[13px]">{card}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="h-1.5 w-10 rounded-[3px] bg-accent/50" />
                <Monogram initials={['MC', 'DO', 'SM', 'JW'][(ci + i) % 4]} hue={[250, 170, 20, 300][(ci + i) % 4]} className="size-5 text-[9px]" />
              </div>
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  )
}

function ReportPanel() {
  const series = [
    { label: 'Hours saved', values: [20, 34, 38, 52, 60, 66, 74], color: '#ff7a45' },
    { label: 'Tasks automated', values: [12, 26, 30, 44, 50, 58, 66], color: '#ffb547' },
  ]
  const w = 600
  const h = 220
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-5">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-2 text-[12px] text-muted">
            <span className="round size-2" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
        <span className="ml-auto text-[12px] text-faint">Last 7 weeks</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-4 h-full w-full flex-1" preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={w} y1={h * f} y2={h * f} stroke="rgba(255,255,255,0.06)" />
        ))}
        {series.map((s) => {
          const step = w / (s.values.length - 1)
          const d = s.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${i * step},${h - (v / 100) * h}`).join(' ')
          return (
            <motion.path
              key={s.label}
              d={d}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
            />
          )
        })}
      </svg>
    </div>
  )
}
