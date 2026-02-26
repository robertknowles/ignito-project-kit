# CLAUDE.md

## Project Overview

Ignito Project Kit — a real estate investment planning and financial modeling SaaS application. Built for investment-focused buyers' agents in Australia to create property investment roadmaps and portfolio scenarios for their clients. Multi-tenant architecture with white-labeling support.

## Tech Stack

- **Framework:** React 18 + TypeScript 5
- **Build:** Vite (dev server on port 8080)
- **Styling:** Tailwind CSS + shadcn/ui (Radix UI primitives)
- **State:** React Context API (12 context providers) + TanStack React Query
- **Forms:** React Hook Form + Zod validation
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions, RLS)
- **Payments:** Stripe (checkout sessions, webhooks via Supabase Edge Functions)
- **Charts:** Recharts
- **Routing:** React Router DOM v6
- **PDF Export:** jspdf + html2canvas + html2pdf.js
- **Animations:** Framer Motion
- **Onboarding:** driver.js guided tours
- **Drag & Drop:** @dnd-kit

## Commands

```bash
npm run dev        # Start dev server (port 8080)
npm run build      # Production build
npm run build:dev  # Development build
npm run lint       # ESLint
npm run preview    # Preview production build
```

## Project Structure

```
src/
├── pages/              # Full-page route components
├── components/         # Reusable components (76+ files)
│   └── ui/             # shadcn/ui primitives (40+ components)
├── contexts/           # React Context providers (12 files)
├── hooks/              # Custom React hooks (14 files)
├── types/              # TypeScript type definitions
├── utils/              # Utility/calculation functions (23 files)
├── constants/          # Financial parameters & event types
├── config/             # Stripe products/pricing config
├── integrations/       # Supabase client & auto-generated types
├── lib/                # General utility (cn helper)
├── landing/            # Landing page & components
└── client-view/        # Public client-facing report views

supabase/
├── migrations/         # SQL migrations (RLS policies, schema changes)
└── functions/          # Edge Functions (stripe-webhook, create-checkout)
```

## Key Architecture Patterns

### State Management
State flows through nested React Context providers defined in `AppRouter.tsx`. Key contexts:
- `AuthContext` — authentication state (Supabase Auth, JWT)
- `ClientContext` — active client/agent selection
- `PropertySelectionContext` — property types and blocks
- `PropertyInstanceContext` — editable property details
- `DataAssumptionsContext` — financial parameters
- `ScenarioSaveContext` — scenario persistence to Supabase
- `MultiScenarioContext` — multiple scenario management
- `BrandingContext` — white-label dynamic branding (CSS variable injection)

### Calculation Engine
Core financial logic lives in hooks and utils:
- `hooks/useAffordabilityCalculator.ts` — main calculation engine (deposit, borrowing, serviceability tests)
- `hooks/useChartDataGenerator.ts` — chart data generation
- `hooks/useRoadmapData.ts` — roadmap visualization data
- `utils/stampDutyCalculator.ts` — state-specific stamp duty
- `utils/lmiCalculator.ts` — loan mortgage insurance
- `utils/landTaxCalculator.ts` — land tax by state
- `utils/feasibilityChecker.ts` — affordability validation
- `utils/calculateBorrowingCapacity.ts` — borrowing limits
- `utils/guardrailValidator.ts` — constraint validation with auto-fix suggestions

### Financial Constants (`constants/financialParams.ts`)
- `PERIODS_PER_YEAR = 2` (semi-annual modeling)
- `BASE_YEAR = 2025`
- `SERVICEABILITY_FACTOR = 0.06`
- `RENTAL_SERVICEABILITY_CONTRIBUTION_RATE = 0.70`
- `EQUITY_EXTRACTION_LVR_CAP = 0.80`
- `DEFAULT_EQUITY_FACTOR = 0.75`

### Data Flow
User input → Zod validation → Custom hooks/utils → Supabase persistence (via ScenarioSaveContext) → Recharts visualization

### Authentication & Routes
- Supabase Auth (email-based, JWT)
- `ProtectedRoute` wrapper for authenticated pages
- `PublicRoute` wrapper for unauthenticated pages
- Public client views at `/client-view` require no auth
- Roles: owner, agent, client

### Stripe Integration (`config/stripe.ts`)
- Starter: $699 AUD (3 client roadmaps)
- Professional: $999 AUD (10 client roadmaps)
- Edge Functions handle checkout creation and webhook processing

## Database

PostgreSQL via Supabase with RLS on all tables:
- **profiles** — user accounts
- **clients** — client records (belong to user/agent)
- **scenarios** — investment plans (belong to client, include share_id for public links)
- **subscriptions** — Stripe subscription tracking

## Path Aliases

`@/*` maps to `src/*` (configured in tsconfig.json and vite.config.ts)

## Environment Variables

Prefixed with `VITE_` for client-side access:
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Coding Conventions

- Functional components with hooks only (no class components)
- Business logic extracted into custom hooks (`hooks/`) and utility functions (`utils/`)
- shadcn/ui components in `components/ui/` — do not modify these directly
- Tailwind utility classes for styling; CSS variables with HSL values for theming
- Zod schemas for form and data validation
- Toast notifications via Sonner for user feedback
- `cn()` helper from `lib/utils.ts` for conditional class merging (clsx + tailwind-merge)
- TypeScript with path aliases (`@/components/...`, `@/hooks/...`, etc.)
- `strictNullChecks: false` in tsconfig

## Large Files

Some files are very large due to complex financial modeling logic:
- `hooks/useChartDataGenerator.ts` (~23k lines)
- `hooks/useRoadmapData.ts` (~41k lines)
- `components/InvestmentTimeline.tsx` (~61k lines)
- `components/ChartWithRoadmap.tsx` (~52k lines)

When editing these files, read specific line ranges rather than the entire file.
