# Component Guide

## Common Components

### Button
Primary button component with variants and loading state.

```jsx
<Button variant="primary" onClick={handleClick}>
  Click Me
</Button>
```

### Modal
Reusable modal dialog.

```jsx
<Modal isOpen={isOpen} onClose={onClose} title="Modal Title">
  <p>Modal content</p>
</Modal>
```

### FormInput
Form input with label and error handling.

```jsx
<FormInput
  label="Email"
  name="email"
  value={email}
  onChange={handleChange}
  error={errors.email}
/>
```

## Layout Components

### Sidebar
Navigation sidebar with menu items.

### Navbar
Top navigation bar with user menu.

### AdminLayout
Main layout wrapper for authenticated pages.

## Data Components

### Table
Data table with sorting and pagination.

### ChartCard
Wrapper for chart components.
