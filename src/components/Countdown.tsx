import { formatDuration, formatTimeInTz } from '../time';
import { toneTextClasses, type Tone } from './tone';

interface CountdownProps {
  label: string;
  target: Date;
  now: Date;
  tone: Tone;
  /** "until" when the countdown ends your current state, "at" when one begins. */
  boundaryPreposition: 'until' | 'at';
  displayTz: string;
  hour12: boolean;
}

export default function Countdown({
  label,
  target,
  now,
  tone,
  boundaryPreposition,
  displayTz,
  hour12,
}: CountdownProps) {
  const remainingMs = Math.max(0, target.getTime() - now.getTime());
  const landsAt = formatTimeInTz(displayTz, target, hour12);

  return (
    <div>
      <div className={`text-sm font-semibold uppercase tracking-wide ${toneTextClasses[tone]}`}>{label}</div>
      <div className="font-mono text-4xl font-semibold tabular-nums tracking-tight">
        {formatDuration(remainingMs)}
      </div>
      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        {boundaryPreposition} {landsAt}
      </div>
    </div>
  );
}
