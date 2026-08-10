import type { ModelSnapshot, ModelStatus } from '../time';
import type { Tone } from './tone';

export const badgeClasses: Record<Tone, string> = {
  red: 'bg-red-500/10 text-red-700 border-red-500/40 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/40',
  green:
    'bg-emerald-500/10 text-emerald-700 border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/40',
  amber:
    'bg-amber-500/10 text-amber-700 border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/40',
};

/** The badge always reads YES except during peak (NO, red). */
export function badgeFor(status: ModelStatus): { text: 'YES' | 'NO'; tone: Tone } {
  if (status === 'peak') return { text: 'NO', tone: 'red' };
  if (status === 'off-discount') return { text: 'YES', tone: 'amber' };
  return { text: 'YES', tone: 'green' };
}

/**
 * The countdown label always frames how much time you have left:
 * "in" a state = until you leave it, "until" a state = until it begins.
 */
export function countdownFor(status: ModelStatus, boundary: ModelSnapshot['boundary']): { label: string; tone: Tone } {
  if (status === 'peak') return { label: 'Can code again in', tone: 'red' };
  if (status === 'discount') return { label: 'Time left in discount', tone: 'green' };
  // Off states: the next boundary is always the start of a window.
  const isPeakNext = boundary.kind === 'peak';
  return {
    label: isPeakNext ? 'Can code for' : 'Discount starts in',
    tone: isPeakNext ? 'green' : 'amber',
  };
}
