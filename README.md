# FPDesigner

Next.js App Router application for FPDesigner v2.

## Scope

**B1-P0:** foundation shell, env validation, CI, tests, build.

**B1-P1:** website entry, Supabase Auth/session, pre-account draft, authenticated
Factory customer-gateway calls, and protected project resume.

**Not included:** B2 deeper onboarding, public-business-link capture, pricing/payment,
Factory deployment, or provider configuration.

## Requirements

- Node.js 24+ (see `.nvmrc`)
- npm

## Environment

Copy `.env.example` to `.env.local` and set:

- `APP_ENV` / `NEXT_PUBLIC_APP_ENV`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `FACTORY_CUSTOMER_GATEWAY_URL` (server-only)

Never commit real credentials. Provider configuration for Supabase and the deployed
Factory customer-gateway is handled in a separately authorized gate.

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Auth architecture

- Browser client: `@supabase/ssr` + publishable Supabase keys only
- Server client: cookie-backed SSR session in server actions/pages
- `proxy.ts`: refreshes Supabase auth cookies using `getClaims()`
- Protected server paths verify identity with `getClaims()` before Factory calls
- Access tokens are forwarded to Factory only as `Authorization: Bearer ...`

## Factory gateway boundary

FPDesigner server code calls the frozen B1-F HTTP contract:

- `POST /api/v1/projects/start`
- `GET /api/v1/projects/resume`
- `GET /api/v1/projects/{projectId}/resume`

Browser code never calls Factory directly. Unit tests mock the HTTP boundary and do
not claim live cross-repository end-to-end proof.

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run verify
```

## Deferred by design

Optional public business links (Instagram/Yelp/etc.) are intentionally not collected
in B1-P1 because the frozen B1-F first-three-answer contract does not persist them.
They remain deferred to the later onboarding/import contract.

When a Person belongs to multiple Customers, the frozen B1-F contract may require
`targetCustomerId` on project start but does not expose a structured subtype for that
case inside `invalid_input` responses. FPDesigner therefore maps all `invalid_input`
results generically and cannot reliably distinguish multi-Customer account selection
from other invalid requests without a future structured Factory signal.
