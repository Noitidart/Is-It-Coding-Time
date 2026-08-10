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
export interface CountdownInfo {
  label: string;
  tone: Tone;
  /**
   * Preposition for the compact "… 11:00 AM" line: "until" when the countdown ends
   * your current state (Can code for, Time left in discount), "at" when it marks a
   * new state beginning (Can code again in, Discount starts in).
   */
  boundaryPreposition: 'until' | 'at';
}

export function countdownFor(status: ModelStatus, boundary: ModelSnapshot['boundary']): CountdownInfo {
  if (status === 'peak') {
    return { label: 'Can code again in', tone: 'red', boundaryPreposition: 'at' };
  }
  if (status === 'discount') {
    return { label: 'Time left in discount', tone: 'green', boundaryPreposition: 'until' };
  }
  // Off states: the next boundary is always the start of a window.
  const isPeakNext = boundary.kind === 'peak';
  return {
    label: isPeakNext ? 'Can code for' : 'Discount starts in',
    tone: isPeakNext ? 'green' : 'amber',
    boundaryPreposition: isPeakNext ? 'until' : 'at',
  };
}
