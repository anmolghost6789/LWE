import { motion } from 'motion/react'
import { ArrowRight, Sparkles } from 'lucide-react'

import { Aurora } from '../components/Aurora'
import { Button } from '../components/Button'
import { Container } from '../components/Container'
import { hero } from '../content'

const ease = [0.22, 1, 0.36, 1] as const

export function Hero() {
  const [line1, line2] = hero.title
  return (
    <section className="relative overflow-hidden pt-36 pb-10 sm:pt-44">
      <Aurora />
      <div aria-hidden className="grid-lines absolute inset-x-0 top-0 h-[720px]" />
      <div aria-hidden className="noise pointer-events-none absolute inset-0" />

      <Container className="relative">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <motion.a
            href="#"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="depth relative inline-flex h-8 items-center gap-2 rounded-[12px] bg-white/[0.04] pl-2 pr-3 text-[13px] text-muted backdrop-blur transition-colors hover:text-fg"
          >
            <Sparkles className="size-3.5 text-accent" />
            {hero.badge}
            <ArrowRight className="size-3.5" />
          </motion.a>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            className="mt-6 text-balance text-[40px] font-semibold leading-[1.04] tracking-[-0.035em] sm:text-[64px] sm:leading-[1.02] md:text-[76px]"
          >
            {line1}
            <br className="hidden sm:block" />{' '}
            {line2.split(hero.highlight)[0]}
            <span className="text-gradient">{hero.highlight}</span>
            {line2.split(hero.highlight)[1]}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease }}
            className="mt-6 max-w-xl text-pretty text-[17px] leading-relaxed text-muted sm:text-[19px]"
          >
            {hero.description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease }}
            className="mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row"
          >
            <Button size="lg" href={hero.primary.href} className="w-full sm:w-auto">
              {hero.primary.label}
              <ArrowRight />
            </Button>
            <Button size="lg" variant="secondary" href={hero.secondary.href} className="w-full sm:w-auto">
              {hero.secondary.label}
            </Button>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-4 text-[13px] text-faint"
          >
            {hero.footnote}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 12 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1.1, delay: 0.35, ease }}
          style={{ transformPerspective: 1400 }}
          className="relative mx-auto mt-16 max-w-[1040px] sm:mt-20"
        >
          <div
            aria-hidden
            className="absolute -inset-x-10 -top-10 bottom-0 -z-10 rounded-[40px] bg-[radial-gradient(60%_50%_at_50%_0%,rgb(255_122_69/0.22),transparent)] blur-2xl"
          />
          {/* A real room, not a diagram: this is what a Thursday actually looks like. */}
          <figure className="depth relative overflow-hidden rounded-window bg-surface shadow-glow">
            <div className="relative aspect-[16/11] sm:aspect-[16/9]">
              <img
                src="/hero-expert.jpg"
                alt="An instructor standing at a table, walking four colleagues through a step on a laptop during a small workshop"
                className="size-full object-cover object-[50%_35%]"
              />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-bg via-bg/20 to-transparent" />
              <span className="depth absolute left-4 top-4 inline-flex items-center gap-2 rounded-[12px] bg-bg/60 px-3 py-1.5 text-[12px] text-fg backdrop-blur">
                <span className="round size-1.5 bg-accent" />
                Live · week 2 of 6
              </span>
              <figcaption className="absolute inset-x-4 bottom-4 text-[13px] text-fg/90">
                <span className="font-medium">Six people, one screen, ninety minutes.</span>{' '}
                <span className="text-muted">Tonight we fix Priya’s invoice extractor.</span>
              </figcaption>
            </div>
          </figure>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-px h-40 bg-gradient-to-t from-bg to-transparent" />
        </motion.div>
      </Container>
    </section>
  )
}
