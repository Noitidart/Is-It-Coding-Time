import type { ModelConfig, ModelSnapshot } from '../time';
import Countdown from './Countdown';
import { badgeClasses, badgeFor, countdownFor } from './statusUi';
import UpcomingWindows from './UpcomingWindows';

interface ModelCardProps {
  model: ModelConfig;
  snapshot: ModelSnapshot;
  now: Date;
  displayTz: string;
  hour12: boolean;
}

export default function ModelCard({
  model,
  snapshot,
  now,
  displayTz,
  hour12
}: ModelCardProps) {
  const badge = badgeFor(snapshot.status);
  const countdown = countdownFor(snapshot.status, snapshot.boundary);

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-zinc-900/60">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">{model.name}</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {model.note && (
              <>
                {model.note}
                {' · '}
              </>
            )}
            {model.sourceUrl && (
              <a
                href={model.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:text-zinc-700 hover:underline dark:hover:text-zinc-200"
              >
                View Source →
              </a>
            )}
          </p>
        </div>
        <div
          className={`rounded-lg border px-4 py-2 text-2xl font-bold ${badgeClasses[badge.tone]}`}
        >
          {badge.text}
        </div>
      </div>

      <div className="mt-5">
        <Countdown
          label={countdown.label}
          target={snapshot.boundary.at}
          now={now}
          tone={countdown.tone}
        />
      </div>

      <UpcomingWindows
        windows={snapshot.upcoming}
        now={now}
        displayTz={displayTz}
        hour12={hour12}
      />
    </article>
  );
}
