# 4. Design Brief

Source of truth in code: `frontend/app/globals.css` and `.impeccable/design.json`. This brief keeps the tenth screen as on-brand as the first.

## 1. Personality

Calm, precise, trustworthy — a tool for people handling sensitive material. Dense but unhurried; no decoration that doesn't carry meaning. Local/private is a feature: show it (lock/“on-device” cues) rather than shouting it.

## 2. Logo

Component: `components/shared/logo.tsx`. Use it at ≥ 24 px; keep clear space equal to its cap height; on brand-green backgrounds use the monochrome white variant. Never stretch, recolour outside the palette, or place on busy imagery.

## 3. Colour (OKLCH)

| Role | Light | Dark |
|------|-------|------|
| Background | neutral-0 | neutral-950 |
| Card / popover | neutral-25 / neutral-0 | neutral-900 / neutral-800 |
| Foreground | neutral-950 | neutral-50 |
| Muted text | neutral-500 | (muted-foreground token) |
| Border / input | neutral-200 | (dark border token) |
| **Primary** | brand-600 `oklch(0.52 0.15 150)` | brand-500 `oklch(0.60 0.14 150)` |
| Ring / focus | brand-500 | brand-500 |

Brand is a single **green hue (150)** scale 50→950. Neutrals are pure grey. Status: success `0.65 0.15 150`, warning `0.75 0.15 75`, danger `0.60 0.18 25`, info `0.65 0.15 250`. Charts use the 5-step green ramp. Rules: one primary action per view; never convey meaning by colour alone; use semantic tokens (`--primary`, `--muted`…), never raw values in components.

## 4. Typography

Avenir Next → SF Pro → Segoe UI fallback; mono: SF Mono → Cascadia → Liberation Mono.

| Style | Size / line | Weight |
|-------|-------------|--------|
| Display XL / L | 72 / 60 px, 1.1, −0.04/−0.03em | 700 |
| Heading XL / L / M | 48 / 36 / 24 px, 1.2–1.3 | 600 |
| Title | 20 px, 1.4 | 600 |
| Body large / body | 18 / 15 px, 1.6, max 72ch | 400 |
| Small / caption / overline | 13 / 11 / 10 px | 400 / 500 / 600 (overline uppercase, +0.05em) |
| Mono | 13 px | — |

Base text scale is bumped one step (xs 13, sm 15, base 17 px) in the app shell.

## 5. Shape, spacing, motion

- Radius: base 12 px; scale 2/4/6/8/12/16/full. Cards 12, inputs/buttons 8, pills full.
- Spacing on a 4 px grid; page gutters 16 px mobile / 24+ desktop; sidebar 260 px, collapsible.
- Motion via Framer Motion helpers in `lib/motion.ts`: 150–250 ms ease-out, no motion that blocks input; respect `prefers-reduced-motion`.
- Elevation: borders first, shadow only on popovers/dialogs.

## 6. Components (shadcn/ui on Base UI)

| Element | Spec |
|---------|------|
| **Button** | Primary (brand fill), secondary (muted), ghost, destructive (danger); 36 px default height; visible focus ring; loading state replaces label with spinner, keeps width |
| **Input / textarea / select** | 1 px border, 8 px radius, label above, helper/error below in danger colour with icon |
| **Cards** | card bg, 1 px border, 12 px radius, 16–24 px padding |
| **Badges** | Document status: pending (muted), processing (info), completed (success), failed (danger) |
| **Dialogs / sheets** | Centered dialog for forms; sheet for sources/context preview |
| **Toasts** | Sonner, bottom-right, auto-dismiss 5 s, errors persist until closed |
| **Skeletons** | For lists and message loading; no spinners on full pages |
| **Chat bubble** | User: right, primary tint. Assistant: left, no bubble fill, markdown, citation chips `[1]` linking to Sources |
| **Tables** | Sticky header, mono numerals right-aligned (Financial) |

## 7. Screen patterns

- **App shell:** sidebar + content; header shows page title and primary action.
- **Empty states:** one-line explanation + single CTA (e.g. "Upload your first document").
- **Chat:** composer pinned bottom, max-width 72ch message column, welcome suggestions on empty thread.
- **Landing:** hero, features grid, AI section, pricing teaser, testimonials, CTA footer — same tokens, display type sizes.

## 8. Accessibility

WCAG 2.2 AA minimum: 4.5:1 text contrast (verify muted text on both themes), 3:1 UI components, full keyboard path including command palette, visible focus, labelled controls, `aria-live` for streaming responses, 44 px touch targets on mobile.

## 9. Responsive & theming

Mobile-first; sidebar becomes a sheet < 768 px. Light/dark/system via `next-themes`, stored per user (`theme_preference`).
