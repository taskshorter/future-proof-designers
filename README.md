# FPDesigner

Next.js App Router application foundation for FPDesigner v2.

## Scope

**B1-P0 = foundation only.**

Included:

- Next.js App Router + TypeScript
- accessible application shell and public route structure
- lint / typecheck / tests / production build
- CI workflow
- generic typed environment validation (`APP_ENV` / `NEXT_PUBLIC_APP_ENV`)

Not included (B1-P1 and later):

- Supabase Auth / sessions
- customer-gateway integration
- project creation / membership
- pricing / payments
- final brand design system

## Requirements

- Node.js 24+ (see `.nvmrc`)
- npm

## Setup

```bash
cp .env.example .env.local
npm install
```

## Scripts

```bash
npm run dev        # local development server
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm test           # Vitest
npm run build      # production build
npm run verify     # lint + typecheck + test + build
```

## Environment

See `.env.example`.

B1-P0 requires only:

- `APP_ENV` — `local` | `preview` | `production`
- `NEXT_PUBLIC_APP_ENV` — must match `APP_ENV` when set

No secrets are required for foundation development.
