import type { ModelConfig, ModelSnapshot } from '../time';
import { formatDuration } from '../time';
import { badgeClasses, badgeFor, countdownFor } from './statusUi';
import { toneTextClasses } from './tone';

interface CompactRowProps {
  model: ModelConfig;
  snapshot: ModelSnapshot;
  now: Date;
}

export default function CompactRow({ model, snapshot, now }: CompactRowProps) {
  const badge = badgeFor(snapshot.status);
  const countdown = countdownFor(snapshot.status, snapshot.boundary);
  const remainingMs = Math.max(0, snapshot.boundary.at.getTime() - now.getTime());

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-900/60">
      <div className="min-w-0">
        <div className="truncate font-semibold">{model.name}</div>
        <div className={`text-xs font-semibold uppercase tracking-wide ${toneTextClasses[countdown.tone]}`}>
          {countdown.label}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <div className="font-mono text-lg tabular-nums">{formatDuration(remainingMs)}</div>
        <div className={`rounded-md border px-3 py-1 text-lg font-bold ${badgeClasses[badge.tone]}`}>
          {badge.text}
        </div>
      </div>
    </div>
  );
}
