# Component Guidelines

## 1. Composition Over Props
Avoid "God Components" with 20+ props. Use composition.
- **Bad**: `<Card title="..." description="..." footer="..." />`
- **Good**: 
  ```tsx
  <Card>
    <CardHeader title="..." />
    <CardContent>...</CardContent>
    <CardFooter>...</CardFooter>
  </Card>
  ```

## 2. Small and Focused
- Keep files under 250 lines.
- Extract sub-components into the same file if they are private.
- Move to `@/components/ui` if they are generic.

## 3. Server by Default
- Always start as a Server Component.
- Move interactivity to the smallest possible Client Component child.
