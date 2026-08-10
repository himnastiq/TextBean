/**
 * useDebounce — delays updating a value until a specified period of
 * inactivity has elapsed.
 *
 * Primary use case: the SearchBar and SearchPage debounce user input
 * so FTS5 queries don't fire on every keystroke.
 *
 * @param value  The raw, fast-changing value (e.g., text input state)
 * @param delay  Debounce window in milliseconds (default 200ms)
 * @returns      The debounced value, updated only after `delay` ms of silence
 */

import { useEffect, useState } from 'react';

function useDebounce<T>(value: T, delay: number = 200): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export { useDebounce };
