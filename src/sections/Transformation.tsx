import { Sparkles } from 'lucide-react'

import { Container } from '../components/Container'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import { transformation } from '../content'
import { cx } from '../lib/cx'

// Colour runs with the story: red for the painful status quo, amber while it is
// being built, ember once it runs. Same tokens as the rest of the page.
const stageDot: Record<string, string> = {
  before: 'bg-accent-3',
  build: 'bg-accent-2',
  after: 'bg-accent',
}

const stageFilter: Record<string, string> = {
  before: 'saturate-[0.7]',
  build: 'saturate-[0.92]',
  after: 'saturate-100',
}

export function Transformation() {
  return (
    <section
      id="transformation"
      className="relative scroll-mt-24 overflow-hidden border-t border-line py-24 sm:py-32"
    >
      {/* Warm wash behind the row so the photos read as lit rather than pasted on. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-10 h-[460px] bg-[radial-gradient(55%_60%_at_50%_0%,rgb(255_122_69/0.10),transparent)] blur-2xl"
      />

      <Container className="relative">
        <SectionHeading
          eyebrow={transformation.eyebrow}
          title={transformation.title}
          description={transformation.description}
        />

        <div className="mx-auto mt-14 grid max-w-[960px] gap-4 sm:gap-5 md:grid-cols-3">
          {transformation.stages.map((stage, i) => {
            const isBuild = stage.key === 'build'
            return (
              <Reveal key={stage.key} delay={i * 0.1} className="h-full">
                <figure
                  className={cx(
                    'depth group relative flex h-full flex-col overflow-hidden rounded-card bg-surface shadow-glow transition-colors duration-300',
                    isBuild
                      ? 'shadow-[0_40px_90px_-45px_rgb(255_122_69/0.55)] [--depth-edge:rgb(255_122_69/0.4)] [--depth-highlight:rgb(255_181_71/0.22)]'
                      : 'hover:[--depth-edge:rgb(255_236_224/0.22)]',
                  )}
                >
                  {/* Landscape on phones, the images' native portrait crop on desktop. */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-surface-2 sm:aspect-[16/11] md:aspect-[3/4]">
                    <img
                      src={stage.image}
                      alt={stage.alt}
                      loading="lazy"
                      decoding="async"
                      className={cx(
                        'size-full object-cover object-[50%_38%] transition-[transform,filter] duration-[900ms] ease-out group-hover:scale-[1.02] group-hover:saturate-100',
                        stageFilter[stage.key],
                      )}
                    />
                    {/* Fade the photo into the card so captions never sit on bare pixels. */}
                    <div
                      aria-hidden
                      className="absolute inset-0 bg-gradient-to-t from-surface via-surface/25 to-transparent"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-bg/40 to-transparent"
                    />

                    <span className="depth absolute left-4 top-4 inline-flex items-center gap-2 rounded-[12px] bg-bg/55 px-3 py-1.5 text-[12px] text-fg backdrop-blur">
                      <span className={cx('round size-1.5', stageDot[stage.key])} />
                      {stage.label}
                    </span>
                    <span className="absolute right-4 top-4 rounded-[10px] bg-bg/45 px-2 py-1 text-[11px] tabular-nums text-fg/75 backdrop-blur">
                      {stage.meta}
                    </span>
                  </div>

                  <figcaption className="relative flex flex-1 flex-col gap-2 p-6 pt-5">
                    <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-faint">
                      {String(i + 1).padStart(2, '0')} / {String(transformation.stages.length).padStart(2, '0')}
                    </span>
                    <h3 className="text-[17px] font-semibold tracking-tight">{stage.title}</h3>
                    <p className="text-[14px] leading-relaxed text-muted">{stage.description}</p>
                  </figcaption>
                </figure>
              </Reveal>
            )
          })}
        </div>

        <Reveal delay={0.15}>
          <p className="mt-8 flex items-center justify-center gap-2 text-center text-[13px] text-faint">
            <Sparkles className="size-3.5 shrink-0 text-accent" />
            {transformation.footnote}
          </p>
        </Reveal>
      </Container>
    </section>
  )
}
