# WeCRM365 — Banking CRMS (Next.js)

Staff console for customer management in Cambodian retail banking. Built as an interactive
prototype covering 14 capability domains from the Banking Capability Taxonomy
(excludes: 13 Compliance, 14 Administration, 17 Ecosystem & Open Banking).

## Run

```bash
npm install
npm run dev        # http://localhost:3000 → redirects to /login
npm run build      # production build (verified passing)
```

Sign in with any credentials, then any 6 digits for the OTP (prototype only).

## Stack

- Next.js 14 (App Router) · React 18 · TypeScript (strict)
- Tailwind CSS 3 — design tokens in `tailwind.config.ts` (primary `#0052CC`, navy `#0D1B52`, gold AI accent `#FDF3DC`)
- Fonts: Inter + Noto Sans Khmer (loaded at runtime from Google Fonts), tabular numerals for data

## Structure

```
app/
  login/                  Security — password → OTP 2FA, biometric option
  (console)/              Shared shell: navy sidebar + global topbar (search, EN/ខ្មែរ/한국어, teller identity)
    dashboard/            Analytics — KPIs, txn volume, channel mix, alerts
    customers/            Customer Mgmt — search (Latin + Khmer), segment/KYC filters
    customers/[cif]/      Customer 360° — passport rail + 7 tabs (info form w/ CBC export,
                          accounts & deposits, cards w/ controls, loans, invest & insure,
                          interactions, security/devices)
    onboarding/           eKYC wizard — NID OCR → liveness → sanctions/PEP/CBC screening → activate
    lending/              Pipeline — credit score, CBC, DTI, AI decisioning, maker-checker approval
    payments/             KHQR/Bakong/transfers/bills — refunds, KHQR generator (static/dynamic)
    support/              SLA case queue, chat thread, AI-suggested replies, escalation
    merchants/            Merchant acquiring + corporate payroll batches (maker-checker)
components/               shell.tsx (sidebar/topbar), ui.tsx (Badge, Toast, Modal, AiPanel, …)
lib/                      types.ts · data.ts (mock data) · format.ts (KHR ៛ / USD $)
```

## Notes

- All data is mock (`lib/data.ts`) — replace with API calls when wiring to a backend.
- AI suggestions, OCR, liveness and screening results are simulated for UX validation.
- Tailwind classes match the earlier HTML prototype, so screens can be diffed 1:1.
