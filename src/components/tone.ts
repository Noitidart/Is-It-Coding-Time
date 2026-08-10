export type Tone = 'red' | 'green' | 'amber';

export const toneTextClasses: Record<Tone, string> = {
  red: 'text-red-600 dark:text-red-400',
  green: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400'
};
