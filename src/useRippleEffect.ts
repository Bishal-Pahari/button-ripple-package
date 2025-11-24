import { useEffect } from 'react';
import { initRippleEffect } from './initRippleEffect';

/**
 * React hook to initialize ripple effects.
 * Call this once in your root component or App component.
 *
 * @example
 * ```tsx
 * function App() {
 *   useRippleEffect();
 *
 *   return (
 *     <button className="ripple-host" data-ripple-color="rgba(255,255,255,0.3)">
 *       Click me
 *     </button>
 *   );
 * }
 * ```
 */
export function useRippleEffect() {
  useEffect(() => {
    const cleanup = initRippleEffect();
    return cleanup;
  }, []);
}

