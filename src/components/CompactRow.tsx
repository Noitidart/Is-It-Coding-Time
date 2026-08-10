import type { ModelConfig, ModelSnapshot } from '../time';
import { formatDuration, formatTimeInTz } from '../time';
import { badgeClasses, badgeFor, countdownFor } from './statusUi';
import { toneTextClasses } from './tone';

interface CompactRowProps {
  model: ModelConfig;
  snapshot: ModelSnapshot;
  now: Date;
  displayTz: string;
  hour12: boolean;
}

export default function CompactRow({ model, snapshot, now, displayTz, hour12 }: CompactRowProps) {
  const badge = badgeFor(snapshot.status);
  const countdown = countdownFor(snapshot.status, snapshot.boundary);

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-900/60">
      <div className="min-w-0">
        <div className="truncate font-semibold">{model.name}</div>
        {countdown === null ? (
          // countdownFor returns null exactly when boundary is null (flat pricing).
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            Can code
          </div>
        ) : (
          <div className={`text-xs font-semibold uppercase tracking-wide ${toneTextClasses[countdown.tone]}`}>
            {countdown.label}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-4">
        {countdown !== null && (
          // countdownFor returns null exactly when boundary is null, so boundary is set here.
          <div className="text-right">
            <div className="font-mono text-lg tabular-nums">
              {formatDuration(Math.max(0, snapshot.boundary!.at.getTime() - now.getTime()))}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {countdown.boundaryPreposition} {formatTimeInTz(displayTz, snapshot.boundary!.at, hour12)}
            </div>
          </div>
        )}
        <div className={`rounded-md border px-3 py-1 text-lg font-bold ${badgeClasses[badge.tone]}`}>
          {badge.text}
        </div>
      </div>
    </div>
  );
}
