# Landing Page Redesign — Session Handover

## What We're Doing

Full visual redesign of the PropPath landing page to match the **Untitled UI (UUI) Landing Page 01** aesthetic. The page structure/content ("the flow") stays the same — only the styling and component treatment changed.

## Reference

- **UUI Landing Page 01**: https://www.untitledui.com/react/iframe/landing-pages/landing-page-01
- Open this in Chrome MCP alongside `http://localhost:8080/` for side-by-side comparison
- Dev server: `npm run dev` (port 8080, may auto-port if occupied)

## What's Been Completed

### Route Restoration
Landing page was disabled for an investor demo. All routes restored:
- `src/AppRouter.tsx` — root `/` renders `<Landing />` again
- `src/pages/Login.tsx`, `SignUp.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx` — home buttons → `/`
- `src/components/AppSidebar.tsx`, `src/components/LeftRail.tsx`, `src/portal/PortalSidebar.tsx` — logout → `/`

### Navbar (`src/landing/components-new/Navbar.tsx`)
- **Floating rounded card** layout matching UUI exactly (`rounded-2xl`, `ring-1 ring-gray-200`, `shadow-sm`, `pt-3` offset from top)
- Changed from `<nav>` with bottom border to `<header>` with card container
- PropPath logo image (`/images/proppath-icon.png`) instead of TrendingUp lucide icon
- Nav links: 14px/600 weight, `text-gray-700`
- "Log in" outlined button, "Sign up" filled `bg-gray-900`
- Mobile hamburger menu retained

### Hero (`src/landing/components-new/Hero.tsx`)
- Center-aligned layout (was left-aligned)
- Badge pill: green dot + "Founding agencies" + "Join the first 10 agencies →"
- Heading: 60px/semibold, -0.02em tracking
- Subtitle: 20px, gray-600
- CTAs: "Demo" (outlined with Play icon) + "Sign up" (filled gray-900)
- **Grid background**: `opacity-[0.08]`, 80px spacing, `#98A2B3` color — visible but subtle
- **Dashboard mockup**: Full static JSX showing:
  - Sidebar (220px): PropPath logo image, search bar (⌘K), 5 nav items, user profile "RK"
  - 3 tabs: Portfolio Plan (active), Next Purchase Brief, Existing Portfolio
  - Chart card: Total Equity $1,694,820 ↑412%, SVG chart with purple (#7F56D9) equity line + gradient
  - Floating AI chat widget (280px): "PropPath AI" header, conversation bubbles, quick chips
- DemoVideoModal still functional

### HowItWorks (`src/landing/components-new/HowItWorks.tsx`)
- Structure preserved (3 animated illustration cards + descriptions)
- All `black/[opacity]` patterns → Tailwind gray scale
- Illustration containers: `bg-gray-50 rounded-xl border border-gray-200`
- Chat bubbles, checkmarks, SEND button: `bg-gray-900`
- Framer Motion animations retained for illustrations

### Features (`src/landing/components-new/Features.tsx`)
- 3-column grid with `gap-px bg-gray-200 border border-gray-200 rounded-2xl`
- Cards: `bg-white hover:bg-gray-50`
- Icons: `text-gray-400 group-hover:text-gray-900`

### Pricing (`src/landing/components-new/Pricing.tsx`)
- Two-column grid with `gap-px` divider treatment
- Starter: white bg, outlined button (`border border-gray-300`)
- Professional: `bg-gray-50`, "Popular" badge `bg-gray-900`, filled button `bg-gray-900`
- Check icons: `text-gray-400` (Starter), `text-gray-600` (Professional)

### Footer (`src/landing/components-new/Footer.tsx`)
- CTA section: "Clarity closes clients." 48px heading, "Start building today." gray-400 subtitle
- "Get Early Access" button: `bg-gray-900`
- Footer links grid with PropPath logo image
- Copyright bar with Twitter/Github icons
- Removed Framer Motion, removed TrendingUp import

### Landing Wrapper (`src/landing/Landing.tsx`)
- Clean wrapper: Navbar → Hero → HowItWorks → Features → Pricing → Footer
- No scroll progress bar, no framer-motion at wrapper level

## Design System Tokens Used

| Element | Value |
|---------|-------|
| Container max-width | 1280px |
| Primary button | `bg-gray-900 hover:bg-gray-800` |
| Secondary button | `bg-white border border-gray-300 hover:bg-gray-50 shadow-sm` |
| Nav links | 14px/600, `text-gray-700 hover:text-gray-900` |
| Section headings | `text-3xl font-semibold text-gray-900` |
| Body text | `text-gray-500` or `text-gray-600` |
| Borders | `border-gray-200` |
| Card grids | `gap-px bg-gray-200 border border-gray-200 rounded-2xl` |
| Chart accent | `#7F56D9` (purple) — only in SVG chart, not buttons |
| Navbar | Floating card: `rounded-2xl ring-1 ring-gray-200 shadow-sm` |
| Grid background | `opacity-[0.08]`, 80px spacing, `#98A2B3` |

## Key Files

```
src/landing/Landing.tsx                    — Page wrapper
src/landing/components-new/Navbar.tsx      — Floating card navbar
src/landing/components-new/Hero.tsx        — Hero + dashboard mockup
src/landing/components-new/HowItWorks.tsx  — 3-card animated section
src/landing/components-new/Features.tsx    — 6-feature grid
src/landing/components-new/Pricing.tsx     — 2-tier pricing cards
src/landing/components-new/Footer.tsx      — CTA + footer links
src/landing/components-new/DemoVideoModal.tsx — Video modal (unchanged)
public/images/proppath-icon.png            — PropPath logo asset
```

## Current Status

All sections are restyled and rendering correctly. Build passes clean (`npm run build`).

Rob's latest feedback has been addressed:
1. ✅ Navbar matches UUI floating card pattern
2. ✅ Buttons use gray-900 (matching the software) instead of purple
3. ✅ Grid background opacity doubled and spacing tightened for visibility

## What Might Come Next

- Rob reviewing the page and providing further style tweaks
- Mobile responsiveness review
- Any content copy changes
- Potential animation refinements
- Compare specific sections side-by-side with UUI for pixel-level polish
