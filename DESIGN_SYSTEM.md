# WeCRM365 — Design System

The single source of truth for how WeCRM365 looks and behaves. **Every UI change must
follow these rules** so screens stay consistent and diff cleanly against each other.

Brand: **KB PRASAC** — a warm-charcoal chrome with a single KB-Yellow accent.

---

## 1. Color tokens

Use the Tailwind tokens defined in [`tailwind.config.ts`](tailwind.config.ts). **Never**
hard-code hex values in components — add a token if one is missing.

| Token | Value | Use for |
| --- | --- | --- |
| `gold` | `#FFB600` | The one loud accent — primary buttons, active tab, progress fills, current-step marker |
| `navy` | `#3C3833` | Text on gold, dark chrome (sidebar, brand panels) |
| `goldbg` | `#FFF4D4` | Soft accent panel background (`AiPanel` only) |
| `primary.50–900` | warm charcoal ramp | Brand text/icons/soft fills (`primary-50` bg, `primary-600/700` icons & emphasis) |
| `slate.*` | Tailwind default | All neutral UI — borders (`slate-200`), body text (`slate-700/800`), muted text (`slate-400/500`), surfaces (`slate-50`) |

**Semantic status colors** (keep meanings fixed):
- Success / positive / "clear": `green-500/600`, bg `green-50`, border `green-200`
- Warning / attention / SLA-warning: `amber-500/600`, bg `amber-50`, border `amber-200`
- Danger / error / blocked / breach: `red-600`, bg `red-50`, border `red-200`
- Segment chips: Affluent `purple`, SME `indigo`, Mass `slate`

**The gold rule:** gold is the *only* saturated color in the chrome. One primary action per
view gets gold; everything else is neutral (slate) or brand charcoal (primary). Do not
introduce blue/teal/etc. as decorative accents.

---

## 2. Typography

- Font stack: **Inter** + **Noto Sans Khmer** (`font-sans`); use `font-khmer` for Khmer-only strings.
- Tabular numerals are on globally (`font-feature-settings: "tnum"`) — keep it for all numeric/money data.
- Scale (don't invent new sizes):
  - Page title: `text-2xl font-extrabold text-slate-900 tracking-tight` (use `PageHeader`)
  - Section/card heading: `text-sm font-bold text-slate-900` (or `text-lg font-bold` for step/panel headings)
  - Body: `text-sm`; secondary/meta: `text-xs text-slate-400/500`
  - Micro-labels (uppercase eyebrows): `text-[10px]/[11px] font-bold uppercase tracking-wide text-slate-400`

---

## 3. Layout & shape

- **Standard card / surface:** `bg-white border border-slate-200 rounded-xl shadow-sm`.
- Corner radius: cards `rounded-xl`, controls/buttons/inputs/chips `rounded-lg`, pills/badges `rounded-full`.
- Card inner padding: `p-5` (or `p-6 sm:p-8` for wizard/large panels).
- Vertical rhythm between stacked cards: `space-y-5`; grids use `gap-4`/`gap-5`.
- Responsive: default to mobile-first; two-column grids via `sm:grid-cols-2` / `md:` / `lg:`.
  Tables and wide content live in `overflow-x-auto`.

---

## 4. Reusable components (prefer these over ad-hoc markup)

From [`components/ui.tsx`](components/ui.tsx):

- **`PageHeader`** — every page's title row.
- **`Section`** (defined per page, same pattern) — titled white card wrapper for content groups.
- **`Info`** — read-only label+value pair (this is a view-only CRM; use `Info`, not inputs, for display).
- **`Badge`** — status pills; colors come from `statusClass` in `lib/format.ts`.
- **`AiPanel`** — the gold-tinted panel; reserved for AI suggestions / OCR extractions only.
- **`EmptyState`** — every empty list/tab uses this (icon + message), never a bare "No data".
- **`Toast`**, **`ConfirmModal`**, **`Skeleton`** — for feedback, confirmation, loading.

Icons: **Material Symbols Outlined** via `<Icon name="..." />`. Use outlined names only.

---

## 5. Interaction & motion

- Buttons: primary = `bg-gold text-navy hover:brightness-95`; secondary = `border border-slate-300 text-slate-700 hover:bg-slate-50`. Disabled = `bg-slate-300 text-slate-500 cursor-not-allowed`.
- Tabs/toggles: active = `bg-gold text-navy`; inactive = `bg-white border border-slate-200 text-slate-600 hover:bg-slate-100`.
- Inputs: `border-slate-300` → focus `ring-2 ring-primary-600/20 border-primary-600`; error state uses `red-300/600`.
- Use the existing CSS animations in [`app/globals.css`](app/globals.css) (`page-enter`, `stagger-item`, `modal-enter`, `toast-enter`) — don't add new keyframes casually, and always respect `prefers-reduced-motion`.

---

## 6. Data & money

- Format money with `formatMoney` and dates with `formatDate` from `lib/format.ts` — never inline formatting.
- All demo data lives in `lib/data.ts`; derive display values deterministically (no `Math.random`) so views are stable across renders.

---

## Checklist before shipping any UI change

- [ ] Only tokens/`slate` used — no stray hex, no new decorative accent color.
- [ ] Exactly one gold primary action in the view.
- [ ] Standard card shape + spacing (`rounded-xl border-slate-200 shadow-sm`, `p-5`, `space-y-5`).
- [ ] Reused `Section`/`Info`/`Badge`/`EmptyState`/`AiPanel` instead of new markup.
- [ ] Empty states, loading, and errors handled with the shared components.
- [ ] `formatMoney`/`formatDate` used for all numbers/dates; layout stays responsive.
