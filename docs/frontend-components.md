# React Component Design & Tailwind CSS styling

This document defines standards for component composition, styling sequences, and design patterns within the Next.js frontend.

---

## 🎨 1. Premium Visual Aesthetics

Agentic RAG uses a modern dark-mode palette designed to feel professional and responsive.
- **Glassmorphism**: Use semi-transparent blur backdrops for floating menus or dashboard cards:
  `bg-neutral-900/80 backdrop-blur-md border border-neutral-800`
- **Gradients**: Use smooth, harmonious color gradients for focus highlights or badges:
  `bg-gradient-to-r from-teal-500 to-emerald-600`
- **Micro-Animations**: Smooth out hover transitions and scale transformations:
  `transition-all duration-300 ease-in-out hover:scale-[1.02]`

---

## ⚛️ 2. React Component Guidelines

### Composition Over Props
Avoid building giant "God Components" with dozens of configuration parameters. Instead, break elements down into composable elements.
* **BAD**: `<Dialog title="..." desc="..." footer="..." primaryAction={...} />`
* **GOOD**:
  ```tsx
  <Dialog>
    <DialogHeader title="..." description="..." />
    <DialogBody>...</DialogBody>
    <DialogFooter primaryAction={...} />
  </Dialog>
  ```

### File Size & Logic Segregation
* **250-Line Threshold**: If a component file exceeds 250 lines, split it.
* **Logic Isolation**: Extract complex state management or API fetch timers into custom feature-scoped hooks (e.g. `useChatConnection` inside `features/chat/hooks/`).
* **Reusability rule**: If a component or styling structure is duplicated in **2 or more locations**, refactor and lift it into `@/components/shared/` or `@/components/ui/`.

---

## 📐 3. Strict Tailwind CSS Ordering

To maintain readable, predictable class listings, sort Tailwind classes in every component according to this specific structural sequence:

1. **Layout & Display**: `flex`, `grid`, `block`, `hidden`, `items-center`, `justify-between`
2. **Box Model (Sizing & Spacing)**: `w-full`, `h-32`, `p-4`, `m-2`, `gap-4`
3. **Typography**: `text-sm`, `font-semibold`, `tracking-wide`, `text-slate-100`
4. **Visuals (Colors, Borders, Backgrounds)**: `bg-neutral-950`, `border`, `border-neutral-800`, `rounded-xl`, `shadow-lg`
5. **Transitions & Interactivity**: `transition-all`, `duration-300`, `hover:bg-neutral-900`, `focus:ring-2`

---

## ♿ 4. Accessibility (a11y) Standards

- **Interactive Labeling**: All buttons or controls that display icons without text must include explicit, descriptive `aria-label` tags.
- **Focus Rings**: Never suppress keyboard focus rings. Use visible, clean focus loops:
  `focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none`
- **Semantic DOM Elements**: Choose native elements (`<button>`, `<input>`, `<aside>`) over arbitrary nested `<div>` structures with generic click bindings to ensure native screen-reader indexing.
