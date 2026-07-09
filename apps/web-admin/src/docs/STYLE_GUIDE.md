# Style Guide

## Code Style

- Use functional components with hooks
- Use arrow functions for components
- Use destructuring for props
- Use meaningful variable names
- Keep components small and focused

## File Naming

- Components: PascalCase (e.g., `Button.jsx`)
- Utilities: camelCase (e.g., `formatDate.js`)
- Constants: UPPER_SNAKE_CASE

## Component Structure

```jsx
import { useState } from 'react';
import PropTypes from 'prop-types';

const MyComponent = ({ prop1, prop2 }) => {
  const [state, setState] = useState(null);

  const handleClick = () => {
    // handler logic
  };

  return (
    <div>
      {/* JSX */}
    </div>
  );
};

export default MyComponent;
```

## Tailwind CSS

- Use Tailwind utility classes
- Avoid inline styles
- Use dark mode classes when applicable
- Keep responsive design in mind
