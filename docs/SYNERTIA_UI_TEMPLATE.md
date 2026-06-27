# Synertia UI Template

A reusable design system for Synertia client platforms (Next.js 14 + Tailwind).
Built and proven on **DS Matrix** (DS Crédito Ramada). This document is the
source of truth for spinning up the same look & feel on a new platform.

> **Mental model:** the **Synertia brand is the chrome** (navy sidebar, brand
> watermark, Montserrat, outline icons). The **client brand lives in the
> content area** (client logo lockup in the top header, client accent colour,
> client page content). Keep the chrome identical across clients; swap only the
> per-client tokens listed in [§9](#9-per-client-customisation-checklist).

---

## 1. Stack

- **Next.js 14** (App Router), **React 18**, **TypeScript**
- **Tailwind CSS 3** (+ `@apply` component classes in `globals.css`)
- **next/font/google** for the typeface (self-hosted at build)
- Inline **SVG icons** (Heroicons outline style) — no icon dependency
- Chrome lives in a single client component (`components/AppChrome.tsx`) that
  wraps every page; the login page renders bare.

---

## 2. Brand tokens

### 2.1 Colour palette (Synertia — fixed)

| Token | Hex | Use |
|---|---|---|
| Navy | `#0d132a` | Sidebar, brand watermark, footer (if any) |
| Violet | `#7c3aed` | Accent / icon colour |
| Blue | `#3b6cf0` | Accent / icon colour |
| Teal | `#14b8a6` | Accent / icon colour |
| Indigo | `#6366f1` | Accent / icon colour |
| Page bg | `#d7dce8` | App background (light cool slate) |

### 2.2 Neutral (ink) scale — Tailwind `ink-*`

```ts
ink: { 50:'#f7f8fb', 100:'#eef0f5', 400:'#727a8a', 700:'#1f2533', 900:'#0c0f17' }
```

### 2.3 Client accent — per platform

Each client gets one accent ramp (buttons, links, active states in content).
Example (DS Crédito magenta):

```ts
ds: { 50:'#fdf2f7', 100:'#fbe2ed', 200:'#f5c3da', 500:'#a91b60', 600:'#8e1551', 700:'#741043', 900:'#3f0623' }
```

### 2.4 Typography — Montserrat (fixed)

Weights 400/500/600/700. Wired through a CSS variable so Tailwind's `font-sans`
resolves to it everywhere.

### 2.5 Iconography — outline (fixed)

Heroicons **outline** style: `stroke="currentColor"`, `strokeWidth≈1.7`, `fill="none"`,
24×24 viewBox. Brand-coloured in cards; white/translucent in the navy sidebar.

---

## 3. Tailwind config

`tailwind.config.ts` (extend):

```ts
theme: {
  extend: {
    colors: {
      ink: { 50:'#f7f8fb', 100:'#eef0f5', 400:'#727a8a', 700:'#1f2533', 900:'#0c0f17' },
      // <client accent ramp here, keyed e.g. `ds`, `acme`, …>
    },
    fontFamily: {
      sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
    },
    boxShadow: { card: '0 1px 2px rgba(15,23,42,.04), 0 4px 12px rgba(15,23,42,.04)' },
  },
}
```

---

## 4. Global CSS (`app/globals.css`)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body {
  background-color: #d7dce8;
  /* Single large navy Synertia watermark, centred + fixed, behind every page */
  background-image: url('/logo-synertia-watermark.png');
  background-repeat: no-repeat;
  background-position: center center;
  background-size: min(78vw, 1100px) auto;
  background-attachment: fixed;
  color: #0c0f17;
}

.card        { @apply bg-white/70 backdrop-blur-sm rounded-2xl shadow-card p-5; }
.btn-primary { @apply inline-flex items-center gap-2 rounded-xl bg-ds-500 hover:bg-ds-600 text-white font-medium px-4 py-2 text-sm; }
.btn-ghost   { @apply inline-flex items-center gap-2 rounded-xl border border-ink-100 hover:bg-ink-50 text-ink-700 font-medium px-4 py-2 text-sm; }
.chip        { @apply inline-flex items-center rounded-full bg-ink-100 text-ink-700 text-xs font-medium px-2.5 py-1; }
```

> Replace `bg-ds-500/600` with the client accent ramp. Cards are **translucent**
> (`bg-white/70`) so the watermark reads softly through them.

---

## 5. Typeface wiring (`app/layout.tsx`)

```tsx
import { Montserrat } from 'next/font/google';
const montserrat = Montserrat({ subsets:['latin'], weight:['400','500','600','700'], variable:'--font-sans', display:'swap' });

export default function RootLayout({ children }) {
  return (
    <html lang="pt-PT" className={montserrat.variable}>
      <body className="min-h-screen font-sans antialiased">
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
```

---

## 6. The watermark asset

A single navy wordmark on transparent, low alpha. Generated from the full-colour
Synertia logo with PIL:

```python
from PIL import Image
src = Image.open('logo-synertia.png').convert('RGB')
w, h = src.size
BG, NAVY, MAXA = (13,19,42), (13,19,42), 20   # MAXA = peak alpha; 20 ≈ "muito leve"
out = Image.new('RGBA', (w,h), (0,0,0,0)); sp, op = src.load(), out.load()
for y in range(h):
    for x in range(w):
        r,g,b = sp[x,y]
        d = ((r-BG[0])**2+(g-BG[1])**2+(b-BG[2])**2)**0.5
        t = (d-40)/90                      # foreground = far from the navy bg
        if t > 0: op[x,y] = (*NAVY, int(MAXA*min(t,1.0)))
out.crop(out.getbbox()).save('logo-synertia-watermark.png')   # crop → clean single mark
```

Drop the result in `public/logo-synertia-watermark.png`. Tune `MAXA` for intensity
(20 light, 34 medium, 64 strong). For a tiled variant use `background-repeat: repeat`
+ `background-size: 360px` instead of the single centred one.

---

## 7. Layout & chrome (`components/AppChrome.tsx`)

```
┌──────────┬─────────────────────────────────────────────┐
│ SIDEBAR  │  TOP HEADER  ‹ Voltar      [client lockup]    │ ← sticky, white
│ (navy)   ├─────────────────────────────────────────────┤
│ logo     │                                              │
│ ──────   │              MAIN CONTENT                    │
│ ▢ nav    │      (max-w-7xl, or w-full on dashboards)    │
│ ▢ nav*   │                                              │
│ …        │                                              │
│ ──────   │                                              │
│ [user]   │                                              │
└──────────┴─────────────────────────────────────────────┘
   w-60         background: page bg + centred watermark
```

**Sidebar** — `fixed inset-y-0 left-0 w-60 z-30`, `background:#0d132a`, `text-white`,
flex column:
- Top: Synertia logo (`logo-synertia.png` — its navy box blends into the bar).
- Nav (`flex-1`): each item `flex items-center gap-3 rounded-lg px-3 py-2` with an
  outline icon + label.
  - **active**: `bg-white/15 text-white font-medium`
  - **idle**: `text-white/70 hover:text-white hover:bg-white/10`
  - active test: `pathname === href || pathname.startsWith(href + '/')`
- Optional live link in emerald (`text-emerald-300`, pulsing dot).
- Bottom (`border-t border-white/10`): compact user pill (see §8.4).

**Content** — wrapper offset `ml-60`. Sticky top header (`bg-white border-b`,
`h-16`, `relative`):
- Back button on the left, shown when `pathname !== '/'`, `onClick={() => router.back()}`,
  chevron-left + “Voltar”.
- Client lockup centred (`absolute left-1/2 -translate-x-1/2` or flex-centre):
  client logo + `Product · Client` (e.g. `DS Matrix · DS Crédito Ramada`).
  Lettering `text-2xl font-semibold`, client suffix `text-base text-ink-400`.
- `<main className={fullWidth ? 'w-full' : 'max-w-7xl mx-auto'} px-6 py-8>`.

The **login route renders bare** (no sidebar/chrome): `if (pathname === '/login') return <main>…`.

No footer — the Synertia brand already lives in the sidebar + watermark.

---

## 8. Component recipes

### 8.1 Card (content)
`.card` → `bg-white/70 backdrop-blur-sm rounded-2xl shadow-card p-5`. Translucent
by design.

### 8.2 Welcome page
Vertically centred (`min-h-[80vh] flex flex-col items-center justify-center text-center`):
client logo (h-20) → `Bem-vindo à <Product>` (`text-3xl md:text-4xl font-semibold`)
→ primary CTA → grid of brand-icon cards.

**Brand-icon card** (the "Nossas Soluções" pattern):

```tsx
<Link href={c.href} className="group block text-left rounded-2xl shadow-card
  bg-white/40 backdrop-blur-sm p-8 transition-all duration-200
  hover:-translate-y-1 hover:shadow-xl hover:bg-white/60">
  <div className="h-16 w-16 rounded-2xl flex items-center justify-center mb-6"
       style={{ backgroundColor: `${c.color}1f`, color: c.color }}>{c.icon}</div>
  <div className="text-xl font-semibold text-ink-900">{c.title}</div>
  <div className="text-sm text-ink-400 mt-2">{c.desc}</div>
  <ArrowRight className="mt-6 group-hover:translate-x-1" style={{ color:c.color }} />
</Link>
```

Each card: an outline icon in a `color + '1f'` (≈12% alpha) rounded square, brand
colour per card (violet / blue / teal / indigo), title, description, arrow.

### 8.3 Login (no solid card)
Fields **float on the background** — no white panel:

```tsx
<div className="flex items-stretch rounded-xl border border-white/70 bg-white/70
  backdrop-blur-sm shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-ds-300">
  <span className="flex items-center px-3 border-r border-ink-200/60 text-ink-500">
    {/* user / lock outline icon */}
  </span>
  <input className="flex-1 bg-transparent px-3 py-2.5 text-sm focus:outline-none"
         placeholder="Utilizador" />
</div>
```

Client logo + `Product` title above, wide primary button below. No
remember-me / forgot-password unless the backend actually supports them.

### 8.4 User pill + logout (sidebar bottom)
Compact, translucent on navy:

```tsx
<div className="flex items-center justify-between gap-2 rounded-full border border-white/15
  bg-white/10 pl-3 pr-1 py-0.5">
  <span className="text-xs text-white/80 font-medium truncate">{name ?? 'Utilizador'}</span>
  <button className="rounded-full bg-white/15 border border-white/15 px-2 py-0.5
    text-[11px] text-white/75 hover:text-white hover:bg-white/25">Sair</button>
</div>
```

### 8.5 Chat dock (optional)
Floating action button `fixed bottom-6 right-6 z-40` that opens a panel.

---

## 9. Per-client customisation checklist

When standing up a new platform from this template, change **only** these:

1. **Client logo** → `public/<client>-logo.svg` (used in the top-header lockup +
   welcome). Keep it transparent (no white box).
2. **Product name + client name** → the lockup string `Product · Client`, the
   welcome `Bem-vindo à <Product>`, the login title, `<title>` metadata, and any
   assistant system prompt.
3. **Accent ramp** → the client colour scale in `tailwind.config.ts` and the
   `bg-*-500/600/300` references in `.btn-primary` / focus rings.
4. **Nav items** → the `NAV` array (href + label + icon) and any "live" link.
5. **Language** → `<html lang>` and copy.

**Do NOT change** (Synertia chrome, keep identical): navy `#0d132a`, Montserrat,
outline icon style, sidebar layout, translucent cards, the watermark asset +
background recipe, page bg `#d7dce8`.

---

## 10. Reference implementation

The canonical, working implementation is this repo (DS Matrix):
`frontend/components/AppChrome.tsx`, `frontend/app/page.tsx`,
`frontend/app/login/page.tsx`, `frontend/components/LogoutButton.tsx`,
`frontend/app/globals.css`, `frontend/app/layout.tsx`,
`frontend/tailwind.config.ts`, `frontend/public/logo-synertia*.png`.
