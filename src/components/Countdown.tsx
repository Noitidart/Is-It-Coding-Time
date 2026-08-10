import { formatDuration } from '../time';
import { toneTextClasses, type Tone } from './tone';

interface CountdownProps {
  label: string;
  target: Date;
  now: Date;
  tone: Tone;
}

export default function Countdown({ label, target, now, tone }: CountdownProps) {
  const remainingMs = Math.max(0, target.getTime() - now.getTime());

  return (
    <div>
      <div className={`text-sm font-semibold uppercase tracking-wide ${toneTextClasses[tone]}`}>{label}</div>
      <div className="font-mono text-4xl font-semibold tabular-nums tracking-tight">
        {formatDuration(remainingMs)}
      </div>
    </div>
  );
}
