import { useEffect, useMemo, useState } from 'react';
import { config } from './config';
import { loadStoredValue, storeValue } from './storage';
import { computeSnapshot, type Snapshot, type SnapshotJson } from './time';
import CompactRow from './components/CompactRow';
import ModelCard from './components/ModelCard';
import ViewToggle, { type ViewChoice } from './components/ViewToggle';
import { useNow } from './hooks/useNow';

export type TzSource = 'ip' | 'config';

const VIEW_STORAGE_KEY = 'ict-view';

/** What the worker embeds in the page for hydration — snapshot dates are ISO strings here. */
export interface SsrPayload {
  tz: string;
  tzSource: TzSource;
  snapshot: SnapshotJson;
}

/**
 * Firefox's `resolvedOptions().hourCycle` reports 'h23' even on 12-hour systems,
 * so detect by formatting: a 12-hour system never renders 13:00 as "13".
 */
function detectHour12Preference(): boolean {
  const formatted = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).format(new Date(2026, 0, 1, 13, 0));
  return !formatted.includes('13');
}

interface ClientPrefs {
  tz: string;
  hour12: boolean;
}

interface AppProps {
  serverTz: string;
  tzSource: TzSource;
  serverSnapshot: Snapshot;
}

export default function App({ serverTz, tzSource, serverSnapshot }: AppProps) {
  const now = useNow(1000);
  const [clientPrefs, setClientPrefs] = useState<ClientPrefs | null>(null);
  const [view, setView] = useState<ViewChoice>('compact');
  // SSR renders with the server tz and 24h; the client's own prefs arrive post-mount.
  const localTz = clientPrefs?.tz ?? null;
  const hour12 = clientPrefs?.hour12 ?? false;

  useEffect(() => {
    // Runs after hydration (never during SSR), so the server-rendered markup stays
    // verbatim on first render — the sync setState is intentional one-time detection.
    let tz = serverTz;
    let detectedHour12 = false;
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      detectedHour12 = detectHour12Preference();
    } catch {
      // Detection failed — keep the server-resolved fallbacks.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time post-mount detection
    setClientPrefs({ tz, hour12: detectedHour12 });
  }, [serverTz]);

  useEffect(() => {
    // SSR always renders the default view; restore the saved preference after
    // hydration so the first paint still matches the server markup.
    const savedView = loadStoredValue(VIEW_STORAGE_KEY, 'compact') === 'details' ? 'details' : 'compact';
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time post-mount restore
    setView(savedView);
  }, []);

  const handleViewChange = (next: ViewChoice) => {
    setView(next);
    storeValue(VIEW_STORAGE_KEY, next);
  };

  // Before mount, render the server snapshot verbatim (hydration must match SSR markup).
  // After mount, recompute every tick so status flips and countdowns stay live.
  const snapshot = useMemo(() => (now ? computeSnapshot(now, config) : serverSnapshot), [now, serverSnapshot]);
  const effectiveNow = now ?? serverSnapshot.computedAt;
  // Times are always shown in the viewer's local timezone.
  const displayTz = localTz ?? serverTz;

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Is it coding time?</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Peak &amp; discount windows for your models</p>
        </div>
        <ViewToggle value={view} onChange={handleViewChange} />
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-16">
        {view === 'compact' ? (
          <div className="space-y-2">
            {config.models.map((model) => {
              const modelSnapshot = snapshot.models.find((m) => m.id === model.id);
              if (!modelSnapshot) {
                throw new Error(`dev-error: snapshot missing for model ${model.id} but it was computed from this config`);
              }
              return (
                <CompactRow
                  key={model.id}
                  model={model}
                  snapshot={modelSnapshot}
                  now={effectiveNow}
                  displayTz={displayTz}
                  hour12={hour12}
                />
              );
            })}
          </div>
        ) : (
          <div className="space-y-6">
            {config.models.map((model) => {
              const modelSnapshot = snapshot.models.find((m) => m.id === model.id);
              if (!modelSnapshot) {
                throw new Error(`dev-error: snapshot missing for model ${model.id} but it was computed from this config`);
              }
              return (
                <ModelCard
                  key={model.id}
                  model={model}
                  snapshot={modelSnapshot}
                  now={effectiveNow}
                  displayTz={displayTz}
                  hour12={hour12}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Only useful for curl/no-JS hits: once JS detects the exact local timezone,
          the approximate IP line is noise for humans and disappears. */}
      {!localTz && (
        <footer className="mx-auto max-w-3xl px-6 pb-8 text-xs text-zinc-500">
          <p>
            {tzSource === 'ip'
              ? `Timezone detected from your IP (approximate): ${serverTz}`
              : `Showing times in ${serverTz} (config fallback).`}
          </p>
        </footer>
      )}
    </div>
  );
}
