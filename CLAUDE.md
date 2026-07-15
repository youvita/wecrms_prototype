# WeCRM365

Staff console for customer management in Cambodian retail banking (KB PRASAC brand).
Next.js 16 (App Router) · React 18 · TypeScript (strict) · Tailwind CSS 3. All data is
mock (`lib/data.ts`); AI/OCR/screening are simulated. See [README.md](README.md) for the
full capability map and run instructions.

## Design system — mandatory

**RULE: Every UI update must follow [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).** Before adding
or changing any component, screen, or style, read that file and apply its tokens, layout,
and shared components. Do not hard-code colors, invent new accent colors, or hand-roll
markup that a shared `ui.tsx` component already covers. Run the checklist at the bottom of
DESIGN_SYSTEM.md before considering a UI change done.

Key invariants:
- Gold (`#FFB600`) is the only loud accent — one gold primary action per view; everything
  else is neutral `slate` or brand `primary` (warm charcoal). Tokens live in `tailwind.config.ts`.
- Standard surface: `bg-white border border-slate-200 rounded-xl shadow-sm`.
- Reuse `PageHeader`, `Section`, `Info`, `Badge`, `AiPanel`, `EmptyState`, `Toast`,
  `ConfirmModal` from `components/ui.tsx`. Icons are Material Symbols via `<Icon />`.
- Format money/dates with `formatMoney`/`formatDate` from `lib/format.ts`. Keep demo data
  deterministic (no `Math.random`).

## Verify

Run `npm run build` after changes to confirm the app still compiles (strict TS).
