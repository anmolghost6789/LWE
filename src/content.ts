// All copy lives here so the page can be re-themed for a product without
// touching layout. Sections read from this file; remove a section by deleting
// it from App.tsx.

export const brand = {
  name: 'learnwithexpert*',
  tagline: 'The GenAI bootcamp where you build with an expert',
}

export const nav = {
  links: [
    { label: 'The bootcamp', href: '#features' },
    { label: 'How it works', href: '#how' },
    { label: 'Results', href: '#customers' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Work with us', href: '#contact' },
  ],
  signIn: { label: 'Sign in', href: '#' },
  cta: { label: 'Join cohort 7', href: '#cta' },
}

export const hero = {
  badge: 'GenAI Bootcamp · cohort 7 starts 17 November',
  title: ['It’s easier with', 'an Expert'],
  highlight: 'Expert',
  description:
    'A six-week GenAI bootcamp, not a video library. You bring one real workflow from your job and build it live with an engineer who has put GenAI into production.',
  primary: { label: 'Reserve a seat', href: '#cta' },
  secondary: { label: 'See what you build', href: '#how' },
  footnote: 'Six weeks · 90 minutes live each Thursday · Recordings and worksheets included',
}

export const logos = ['Northwind', 'Vertex', 'Lumen', 'Halcyon', 'Fathom', 'Orbital', 'Meridian', 'Quill']

export const features = {
  eyebrow: 'What the bootcamp gives you',
  title: 'A working system, not a certificate',
  description:
    'Six weeks of live building leaves you with a GenAI workflow running on your own data, owned by someone on your team — plus the judgement to know what to build next.',
  items: [
    {
      key: 'live',
      title: 'Build live with an expert',
      description: 'Your screen, your workflow, and an expert who has shipped it, answering live.',
      span: 2,
    },
    {
      key: 'automation',
      title: 'From inbox to draft, with a human check',
      description: 'The workflow runs on your real queue, and nothing sends until a person approves it.',
      span: 1,
    },
    {
      key: 'analytics',
      title: 'Prove the hours saved',
      description: 'We measure before and after, so you can show your manager the number that matters.',
      span: 1,
    },
    {
      key: 'integrations',
      title: 'Plugs into what you already pay for',
      description: 'OpenAI, Anthropic, Gemini, LangChain, n8n, Zapier, Slack, Notion — no new platform to buy.',
      span: 2,
    },
  ],
}

export const steps = {
  eyebrow: 'How the bootcamp runs',
  title: 'Six weeks, one project, live',
  items: [
    {
      title: 'Bring one real workflow',
      description: 'A support queue, a weekly report, a research task. Something you do every week and would rather not.',
    },
    {
      title: 'Build it on the call',
      description: 'You share your screen. We wire, debug and prompt together until it works on your data, not a demo set.',
    },
    {
      title: 'Hand it over',
      description: 'Week six is guardrails, documentation and a handover, so it keeps running when the course ends.',
    },
  ],
}

export const showcase = {
  eyebrow: 'Inside the bootcamp',
  title: 'What a Thursday looks like',
  tabs: [
    {
      key: 'inbox',
      title: 'The session',
      description: '90 minutes, six people, everyone’s screen. We start with whatever broke this week.',
    },
    {
      key: 'board',
      title: 'The projects',
      description: 'Six projects in flight, one per seat. You can see exactly what everyone is building.',
    },
    {
      key: 'report',
      title: 'The numbers',
      description: 'Hours saved and tasks automated, before and after — per project, not per cohort.',
    },
  ],
}

export const transformation = {
  eyebrow: 'The transformation',
  title: 'Same desk. Same workflow. Six weeks apart.',
  description:
    'Nobody here rebuilt their job from scratch. Each person brought one workflow they dreaded, and six Thursdays later the same workflow runs without them.',
  stages: [
    {
      key: 'before',
      label: 'Before',
      meta: 'Week 0',
      title: 'Two of you, one laptop, every Friday',
      description:
        'One exports the numbers, the other rebuilds the deck, and both lose an afternoon. The workflow works — it just runs on people.',
      image: '/images/transformation-build.jpg',
      alt: 'Two colleagues leaning toward the same laptop in an office, one gesturing as they walk the other through a dashboard on screen',
    },
    {
      key: 'build',
      label: 'Building',
      meta: 'Weeks 2–5',
      title: 'Your screen, an expert beside you',
      description:
        'This is the week it fights back: retrieval returns nothing, an eval disagrees, the draft invents a number. You debug it live, not alone at 10pm.',
      image: '/images/transformation-before.jpg',
      alt: 'A man at his desk pressing a hand to his forehead in front of a spreadsheet, midway through a workflow that is not working yet',
    },
    {
      key: 'after',
      label: 'After',
      meta: 'Week 6',
      title: 'It runs before you sit down',
      description:
        'The report builds itself overnight, a person still approves it, and the hours show up in the numbers your manager reads.',
      image: '/images/transformation-after.jpg',
      alt: 'A smiling man at his desk while colleagues behind him clap, with a completed chart on the laptop screen',
    },
  ],
  footnote: 'Average across the last cohort: 9 hours a week returned by week six, measured before and after.',
}

export const metrics = [
  { value: 640, decimals: 0, suffix: '+', label: 'Practitioners trained' },
  { value: 4.9, decimals: 1, suffix: '', label: 'Average cohort rating' },
  { value: 9, decimals: 0, suffix: ' hrs', label: 'Saved per week, average' },
  { value: 92, decimals: 0, suffix: '%', label: 'Ship their project by week six' },
]

export const testimonials = {
  eyebrow: 'Alumni',
  title: 'What they did with the six weeks',
  items: [
    {
      quote:
        'We were summarising 400 support tickets a week by hand. By week three the agent was triaging them and my team got their mornings back.',
      name: 'Maya Chen',
      role: 'Head of Operations, Northwind',
      hue: 250,
    },
    {
      quote:
        'I had tried three courses before this one. The difference is someone looking at your screen and saying "no, the retrieval step is the problem".',
      name: 'Daniel Okafor',
      role: 'Engineering Manager, Vertex',
      hue: 170,
    },
    {
      quote:
        'Our finance team now closes the month two days earlier. That came out of a single session on document extraction.',
      name: 'Sofia Marin',
      role: 'Product Lead, Lumen',
      hue: 20,
    },
    {
      quote:
        'The guardrails session stopped us shipping something that would have invented invoice numbers. Worth the fee on its own.',
      name: 'Jonas Weber',
      role: 'Director of Delivery, Halcyon',
      hue: 300,
    },
    {
      quote: 'My employer paid for the seat. The workflow I built paid that back in five weeks.',
      name: 'Priya Natarajan',
      role: 'VP Engineering, Fathom',
      hue: 120,
    },
    {
      quote: 'No videos to binge. You show up, you build, you leave with something that runs.',
      name: 'Lucas Ferreira',
      role: 'Founder, Orbital',
      hue: 40,
    },
  ],
}

export const pricing = {
  eyebrow: 'Enrolment',
  title: 'One bootcamp, six weeks, one working project',
  description: 'Seats are capped at six, so everyone gets time on the call.',
  currency: '₹',
  periods: { monthly: 'Instalments', yearly: 'Pay in full' },
  yearlyNote: 'Save ₹20,000',
  tiers: [
    {
      name: 'Recordings',
      monthly: 0,
      yearly: 0,
      unit: { monthly: 'free forever', yearly: 'free forever' },
      description: 'For people who want to watch a session before booking.',
      cta: 'Get the free session',
      popular: false,
      features: ['All six session recordings', 'Worksheets and prompt templates', 'The cohort reading list', 'No live calls or review'],
    },
    {
      name: 'Bootcamp',
      monthly: 39999,
      yearly: 99999,
      unit: { monthly: 'per month, 3 instalments', yearly: 'one-off, paid up front' },
      description: 'One seat in the next GenAI bootcamp — one project, six live Thursdays.',
      cta: 'Reserve a seat',
      popular: true,
      features: [
        'Six live 90-minute sessions',
        'Your project built on your data',
        'Prompt, guardrail and eval reviews',
        'Recordings and worksheets',
        'Private cohort channel',
        'Two weeks of follow-up support',
      ],
    },
    {
      name: 'Team',
      monthly: 149999,
      yearly: 419999,
      unit: { monthly: 'per month, 3 instalments', yearly: 'for five seats, one-off' },
      description: 'Five seats in one bootcamp, sharing one workflow.',
      cta: 'Talk to us',
      popular: false,
      features: [
        'Five seats in the same cohort',
        'A workflow the whole team owns',
        'Session with your data owners',
        'Internal handover document',
        'Invoice and PO support',
        'Priority scheduling',
      ],
    },
  ],
}

export const faq = {
  title: 'Questions people ask before joining',
  items: [
    {
      q: 'What makes this a bootcamp and not a course?',
      a: 'A course gives you lessons to watch. A bootcamp gives you six live weeks, a deadline and a build: you bring one workflow from your job and get it running with an expert on the call.',
    },
    {
      q: 'Do I need to be technical?',
      a: 'No. Half the room is product, ops and marketing. If you can use a spreadsheet and follow a walkthrough, you can build the project — we pair you with the approach that fits your skill level.',
    },
    {
      q: 'What do I need to bring?',
      a: 'One workflow you repeat every week, and access to the data behind it. If you do not have one yet, the first session is for choosing it.',
    },
    {
      q: 'Which tools do we use?',
      a: 'Whatever you already pay for: OpenAI, Anthropic or Gemini, plus n8n, Zapier, LangChain or plain code. We are not selling a platform.',
    },
    {
      q: 'What if I miss a session?',
      a: 'Every session is recorded and posted the same evening, and you can book a 20-minute catch-up with the instructor.',
    },
    {
      q: 'Can my employer pay by invoice?',
      a: 'Yes. Choose invoice at checkout, or reply to your confirmation email and we send a PO-ready invoice with GST details.',
    },
    {
      q: 'What if it does not work for me?',
      a: 'Tell us after session two and we refund the full amount. After that, you keep the recordings, worksheets and anything you built.',
    },
  ],
}

export const contact = {
  eyebrow: 'Work With Us',
  title: 'Let’s build your production GenAI project',
  description:
    'Need a custom GenAI workflow, a dedicated team bootcamp cohort, or hands-on LLMOps review? Tell us about your goals and our senior engineering team will respond within 24 hours.',
  services: [
    'Custom GenAI Workflow Development',
    'Private Team Bootcamp / Cohort',
    'AI Architecture & Tech Consultation',
    'Guardrails, Evals & Production Review',
    'Enterprise Integration & Fine-Tuning',
    'Other / General Inquiry',
  ],
  commitments: [
    {
      title: 'Direct Engineer Dialogue',
      description: 'You speak directly with engineers who ship production GenAI daily, not a sales representative.',
    },
    {
      title: 'Enterprise Confidentiality',
      description: 'Strict mutual NDA upfront. We build directly against your private infrastructure and enterprise accounts.',
    },
    {
      title: '24-Hour Scope Turnaround',
      description: 'Fast technical feasibility assessment and clear implementation milestones within one business day.',
    },
  ],
  email: 'contact@learnwithexpert.com',
  phone: '+91 98765 43210',
  location: 'Bangalore · Remote Worldwide',
}

export const cta = {
  title: 'Bring a workflow. Leave with it running.',
  description: 'The GenAI bootcamp starts 17 November. Six seats, six Thursdays, one project that works.',
  placeholder: 'you@company.com',
  button: 'Reserve my seat',
  success: 'You are on the list. Joining details are on the way.',
}

export const footer = {
  blurb: 'The GenAI bootcamp: six live weeks, one workflow that ships.',
  columns: [
    { title: 'Course', links: ['The course', 'Curriculum', 'Cohorts', 'For teams', 'Recordings'] },
    { title: 'Company', links: ['About', 'Instructors', 'Careers', 'Contact', 'Press'] },
    { title: 'Resources', links: ['Free session', 'Prompt library', 'Case studies', 'Community', 'FAQ'] },
    { title: 'Legal', links: ['Privacy', 'Terms', 'Cookies'] },
  ],
  legal: `© ${new Date().getFullYear()} learnwithexpert*`,
}
