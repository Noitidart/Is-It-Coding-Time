import { useEffect, useState } from 'react';

/** Ticks every `intervalMs`; null before mount so SSR markup can be reused verbatim. */
export function useNow(intervalMs = 1000): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // The clock must start immediately after hydration. The sync setState is
    // intentional: effects run after the hydration render, so it can never
    // cause a markup mismatch — only one extra render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const intervalId = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(intervalId);
  }, [intervalMs]);

  return now;
}
