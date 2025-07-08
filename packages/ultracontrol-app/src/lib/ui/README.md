# UltraControl UI Component Library

A unified component library for the UltraControl application, providing consistent UI components across all integrated tools (bolt.new, devin-clone, OpenHands).

## Installation

The components are part of the ultracontrol-app package and don't require separate installation.

## Usage

```tsx
import { Button, Input, Dialog, Tooltip, Icon } from '@/lib/ui/components';
```

## Components

### Button

A versatile button component with multiple variants and states.

```tsx
<Button variant="primary" size="md" onClick={handleClick}>
  Click me
</Button>

<Button variant="secondary" loading loadingText="Saving...">
  Save
</Button>

<Button variant="danger" leftIcon={<Icon name="delete" />}>
  Delete
</Button>
```

#### Props
- `variant`: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning'
- `size`: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
- `loading`: boolean
- `disabled`: boolean
- `fullWidth`: boolean
- `leftIcon`: ReactNode
- `rightIcon`: ReactNode
- `loadingText`: string

### Input

A flexible input component with built-in error handling and helper text.

```tsx
<Input
  label="Email"
  type="email"
  placeholder="Enter your email"
  error={hasError}
  errorMessage="Invalid email address"
  helperText="We'll never share your email"
/>
```

#### Props
- `label`: string
- `error`: boolean
- `errorMessage`: string
- `helperText`: string
- `leftIcon`: ReactNode
- `rightIcon`: ReactNode
- `size`: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
- All standard HTML input attributes

### IconButton

An icon-only button for toolbar actions and compact interfaces.

```tsx
<IconButton
  icon={<Icon name="settings" />}
  aria-label="Settings"
  variant="ghost"
  size="sm"
/>
```

#### Props
- `icon`: ReactNode (required)
- `variant`: same as Button
- `size`: same as Button
- `rounded`: boolean (for circular buttons)
- `aria-label`: string (required for accessibility)

### Dialog

A modal dialog component with customizable content and actions.

```tsx
const [open, setOpen] = useState(false);

<Dialog
  open={open}
  onClose={() => setOpen(false)}
  title="Confirm Action"
  description="Are you sure you want to proceed?"
  footer={
    <>
      <Button variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleConfirm}>
        Confirm
      </Button>
    </>
  }
>
  <p>This action cannot be undone.</p>
</Dialog>
```

#### Props
- `open`: boolean
- `onClose`: () => void
- `title`: string
- `description`: string
- `size`: 'sm' | 'md' | 'lg' | 'xl' | 'full'
- `closeOnOverlayClick`: boolean (default: true)
- `closeOnEscape`: boolean (default: true)
- `showCloseButton`: boolean (default: true)
- `footer`: ReactNode

### Tooltip

A tooltip component for providing contextual information.

```tsx
<Tooltip content="This is helpful information" placement="top">
  <Button>Hover me</Button>
</Tooltip>
```

#### Props
- `content`: ReactNode
- `placement`: 'top' | 'bottom' | 'left' | 'right'
- `delay`: number (milliseconds, default: 200)
- `disabled`: boolean

### Icon

A comprehensive icon component with built-in icon set.

```tsx
<Icon name="check" size="md" />
<Icon name="loading" className="animate-spin" />
```

#### Props
- `name`: IconName (see types.ts for full list)
- `size`: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
- `color`: string (default: 'currentColor')

## Theming

The component library uses CSS custom properties for theming. You can switch between light and dark themes by setting the `data-theme` attribute on the root element.

```javascript
// Light theme (default)
document.documentElement.removeAttribute('data-theme');

// Dark theme
document.documentElement.setAttribute('data-theme', 'dark');
```

### Custom Theme

You can override theme variables in your CSS:

```css
:root {
  --ui-color-primary: hsl(250 80% 60%);
  --ui-radius-md: 0.5rem;
  /* ... other overrides */
}
```

## Styling

Import the base styles in your main CSS file:

```css
@import '@/lib/ui/styles.css';
```

### Utility Functions

The library provides utility functions for working with styles:

```tsx
import { cn } from '@/lib/ui/utils';

// Combine class names conditionally
<div className={cn(
  'base-class',
  isActive && 'active-class',
  isDisabled && 'disabled-class'
)} />
```

## Best Practices

1. **Accessibility**: Always provide proper ARIA labels for icon buttons and interactive elements.
2. **Loading States**: Use the built-in loading props instead of disabling buttons during async operations.
3. **Error Handling**: Utilize the error props in form components for consistent validation feedback.
4. **Keyboard Navigation**: All components support keyboard navigation out of the box.
5. **Theme Consistency**: Use the predefined variants and sizes for visual consistency.

## Migration Guide

### From devin-clone-mvp (shadcn/ui)
- Replace `<Button>` imports with our unified Button component
- Update variant names if needed (most are compatible)
- Remove cn utility imports and use our provided one

### From OpenHands
- Replace custom Button/Input components with our unified versions
- Update icon usage to use our Icon component
- Migrate from Storybook stories to our documentation

### From ultracontrol-app legacy
- Update Dialog imports to use the new unified Dialog
- Replace custom IconButton with our standardized version
- Update Tooltip to use the new implementation

## Contributing

When adding new components:
1. Follow the established patterns for props and styling
2. Include TypeScript types
3. Support all size variants where applicable
4. Ensure dark mode compatibility
5. Add proper ARIA attributes
6. Document usage examples