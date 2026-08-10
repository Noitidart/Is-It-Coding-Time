import {
  dayDifferenceInTz,
  formatTimeInTz,
  type WindowOccurrence
} from '../time';

interface UpcomingWindowsProps {
  windows: WindowOccurrence[];
  now: Date;
  displayTz: string;
  hour12: boolean;
}

function dayLabel(tz: string, date: Date, now: Date): string {
  const diff = dayDifferenceInTz(tz, now, date);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short'
  }).format(date);
}

export default function UpcomingWindows({
  windows,
  now,
  displayTz,
  hour12
}: UpcomingWindowsProps) {
  // A model with no windows (flat pricing) has nothing upcoming — hide the section.
  if (windows.length === 0) return null;
  return (
    <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-white/10">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
        Upcoming windows
      </div>
      <ul className="mt-2 space-y-1">
        {windows.map((window, index) => (
          <li key={index} className="flex items-center gap-2 text-sm">
            <span
              className={`w-20 rounded px-1.5 py-0.5 text-center text-xs font-semibold ${
                window.kind === 'peak'
                  ? 'bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-400'
                  : 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
              }`}
            >
              {window.kind === 'peak' ? 'PEAK' : 'DISCOUNT'}
            </span>
            <span className="text-zinc-700 dark:text-zinc-300">
              {dayLabel(displayTz, window.start, now)}{' '}
              {formatTimeInTz(displayTz, window.start, hour12)}
              {' – '}
              {formatTimeInTz(displayTz, window.end, hour12)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
