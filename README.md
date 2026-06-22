# @rocket2mars/react-ripple-effect

A lightweight, zero-dependency ripple effect library for React. No wrapper components needed - just add data attributes!

## Features

- **No wrapper components** - Use regular `<button>` elements with data attributes
- **Zero dependencies** - Pure TypeScript implementation
- **Highly customizable** - Control color, duration, radius, and position via data attributes
- **Lightweight** - Minimal bundle size
- **TypeScript support** - Full type definitions included
- **Touch-friendly** - Works with both mouse and touch events

## Installation

```bash
npm install @rocket2mars/react-ripple-effect
```

## Quick Start

### Option 1: Using the React Hook (Recommended)

```tsx
import { useRippleEffect } from "@rocket2mars/react-ripple-effect";
import "@rocket2mars/react-ripple-effect/dist/styles.css";

function App() {
  useRippleEffect();

  return (
    <button
      className="ripple-host"
      data-ripple-color="rgba(255,255,255,0.3)"
      data-ripple-duration="0.45"
      data-ripple-max-radius="160"
    >
      Click me
    </button>
  );
}
```

### Option 2: Manual Initialization

```tsx
import { useEffect } from "react";
import { initRippleEffect } from "@rocket2mars/react-ripple-effect";
import "@rocket2mars/react-ripple-effect/dist/styles.css";

function App() {
  useEffect(() => {
    return initRippleEffect();
  }, []);

  return (
    <button className="ripple-host" data-ripple-color="rgba(255,255,255,0.3)">
      Click me
    </button>
  );
}
```

## Usage

### Basic Usage

Add the `ripple-host` class to any element you want to have ripple effects:

```tsx
<button className="ripple-host">Click me</button>
```

### Customization

Use data attributes to customize the ripple effect:

| Attribute                | Description                                      | Default            |
| ------------------------ | ------------------------------------------------ | ------------------ |
| `data-ripple-color`      | Ripple color (CSS color value)                   | `rgba(0,0,0,0.15)` |
| `data-ripple-duration`   | Animation duration in seconds                    | `0.4`              |
| `data-ripple-max-radius` | Maximum ripple radius in pixels                  | `2000`             |
| `data-ripple-center`     | Center the ripple effect (`"true"` or `"false"`) | `"false"`          |

> Values are validated: an invalid `data-ripple-color` is ignored (the default is used), and `data-ripple-duration` / `data-ripple-max-radius` are coerced to numbers and clamped to safe ranges.

### Examples

#### Custom Color and Duration

```tsx
<button
  className="ripple-host"
  data-ripple-color="rgba(255,255,255,0.5)"
  data-ripple-duration="0.6"
>
  Custom Ripple
</button>
```

#### Centered Ripple

```tsx
<button
  className="ripple-host"
  data-ripple-center="true"
  data-ripple-color="rgba(0,0,0,0.2)"
>
  Centered Ripple
</button>
```

#### Maximum Radius

```tsx
<button
  className="ripple-host"
  data-ripple-max-radius="100"
  data-ripple-color="rgba(255,0,0,0.3)"
>
  Limited Radius
</button>
```

#### Without `ripple-host` Class

You can also use just the `data-ripple-color` attribute:

```tsx
<button data-ripple-color="rgba(255,255,255,0.3)">Works without class</button>
```

## Styling

The package includes default styles, but you can override CSS variables:

```css
:root {
  --ripple-color: rgba(0, 0, 0, 0.15);
  --ripple-duration: 0.4s;
}
```

You can also customize the `.ripple-host` class to match your design:

```css
.ripple-host {
  /* Your custom styles */
  background: #your-color;
  border-radius: 8px;
  padding: 10px 20px;
}
```

## API Reference

### `initRippleEffect()`

Initializes ripple effects on all matching elements currently in the document, and
starts a `MutationObserver` so elements added later (e.g. by a React re-render) get
ripples automatically.

Returns a cleanup function that disconnects the observer — call it when you're done
(for example on unmount).

```tsx
import { initRippleEffect } from "@rocket2mars/react-ripple-effect";

const cleanup = initRippleEffect();
// later, to stop observing:
cleanup();
```

### `useRippleEffect()`

React hook that initializes ripple effects on mount and automatically cleans up
(disconnects the observer) on unmount.

```tsx
import { useRippleEffect } from "@rocket2mars/react-ripple-effect";

function App() {
  useRippleEffect();
  // ...
}
```

## How It Works

The library automatically attaches ripple effects to any element that:

- Has the `ripple-host` class, OR
- Has a `data-ripple-color` attribute

When you call `initRippleEffect()` or use `useRippleEffect()`, it searches for all matching elements and attaches event listeners for pointer and touch events. It also watches the DOM with a `MutationObserver`, so elements added later (e.g. by a React re-render) get ripple effects automatically. The ripple effect is created dynamically based on the click/touch position, inside a clipping layer so it never affects the host element's layout.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Security

Installs are locked (`npm ci`) with dependency install scripts disabled
(`.npmrc` `ignore-scripts=true`), CI runs `npm audit`, and `data-ripple-*`
inputs are validated before use. See [SECURITY.md](./SECURITY.md) for the full
policy and how to report a vulnerability.

## License

MIT
