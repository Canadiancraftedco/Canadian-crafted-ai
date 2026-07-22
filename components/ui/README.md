# UI Component Library — `components/ui/`

A small, real component library extracted from the app's previously duplicated
inline-styled markup. Every primitive here is used in production (see
`AdminDashboard.js` for a live example of all of them together).

## Architecture

```
components/ui/
├── Button.js       — every clickable action
├── GlassCard.js     — the frosted-glass panel used for all cards/panels
├── Input.js          — labeled text/textarea field
├── Spinner.js        — exports Spinner + Select (small enough to share a file)
├── Badge.js          — status pills
├── EmptyState.js     — "nothing here" / error messaging
├── Modal.js           — accessible dialog
└── index.js            — barrel export: `import { Button, Modal } from '@/components/ui'`
```

**Design principles:**
- **Real elements, not styled divs.** Button renders `<button>` or `<a>`, never a
  clickable `<div>`. This gets keyboard operability and screen-reader semantics
  for free instead of having to re-implement them.
- **Labels are mandatory, not decorative.** `Input`/`Select` always take a
  `label` prop and wire it to the control via `htmlFor`/`id` (using React's
  `useId()` so multiple instances never collide). Placeholder text is not a
  substitute for a label — it disappears the moment someone starts typing.
- **State is a prop, not a class name someone has to remember.** `loading`,
  `error`, `disabled` are actual props with real behavior (aria attributes,
  disabled interaction), not just visual styling left to the caller.
- **One component, one job.** `GlassCard` only does the glass panel look.
  Layout (grid, flex, gaps) stays in the page/feature component that uses it —
  the primitive doesn't guess at your layout.

## Props / API design

### `<Button variant size loading disabled as href fullWidth />`
| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'secondary'` | primary = filled ember, danger = for destructive actions |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | |
| `loading` | `boolean` | `false` | shows spinner, disables, sets `aria-busy` |
| `href` | `string` | — | renders `<a>` instead of `<button>` |
| `fullWidth` | `boolean` | `false` | |
| ...rest | — | — | spread onto the element — `onClick`, `type`, `target`, `aria-*`, all pass through |

### `<Input label error hint required as />`
Same shape as `<Select>` for consistency — swap between them without relearning the API.

### `<Modal open onClose title maxWidth />`
Escape-to-close and focus-on-open are automatic. You never wire that up per-usage.

### `<Badge tone />`
`tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral'`

### `<EmptyState title description action tone />`
`action` accepts any ReactNode — typically a `<Button>` for a retry/create action.

## Usage examples

```jsx
import { Button, Modal, Input, Select, Badge, EmptyState } from '@/components/ui';

// A form in a modal — this is the real pattern used in AdminDashboard.js
<Modal open={open} onClose={() => setOpen(false)} title="Add product">
  <form onSubmit={handleSubmit}>
    <Input label="Product name" required value={name} onChange={(e) => setName(e.target.value)} />
    <Select label="Category" options={['outdoors', 'health']} value={category} onChange={handleCategoryChange} />
    <Button type="submit" variant="primary" loading={saving} fullWidth>Save</Button>
  </form>
</Modal>

// Status pill
<Badge tone={product.canada_verified ? 'success' : 'warning'}>
  {product.canada_verified ? 'Verified' : 'Pending'}
</Badge>

// Empty/error state with a retry action
{error ? (
  <EmptyState tone="error" title="Couldn't load products" action={<Button onClick={retry}>Retry</Button>} />
) : products.length === 0 ? (
  <EmptyState title="No products yet" description="Run the discovery agent or add one manually." />
) : (
  <ProductGrid products={products} />
)}
```

## Accessibility checklist (built into the primitives, not bolted on after)
- Focus ring is never suppressed — see `:focus-visible` in `globals.css`, applies globally
- Every form control has a real, associated `<label>`
- Modal: `role="dialog"`, `aria-modal`, `aria-labelledby`, Escape to close, focus moves in on open
- Buttons use real `<button>`/`<a>` elements — full keyboard support and correct screen-reader role for free
- Loading states use `aria-busy` rather than just visually swapping content
- Error states use `aria-invalid` + `aria-describedby`, not color alone

## Adopting this further
`AdminDashboard.js`'s two modals and empty/loading states now use these
primitives — that's the reference implementation. The rest of the app
(category pages, trip planner form, `AffiliatePrograms`/`InstagramPerformance`
tabs) still has some hand-rolled buttons and inputs predating this library.
Migrating them is mechanical (swap `<button style={{...}}>` for `<Button
variant="...">`) and safe to do incrementally, file by file, without touching
behavior — worth doing next time you're in one of those files.
