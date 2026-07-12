import { useState, useEffect } from "react";

/**
 * Delays updating the returned value until `delay` ms after
 * the last change — used for search inputs to avoid firing
 * an API call on every keystroke.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
