export type WindowKind = 'peak' | 'discount';

export interface WindowEntry {
  type: WindowKind;
  /** Wall-clock "HH:MM" in model.timezone (24-hour). */
  start: string;
  /** Exclusive. May be earlier than start — a window crossing midnight. */
  end: string;
  /**
   * Days the window applies to, JS getDay() convention (0 = Sunday … 6 = Saturday).
   * Absent = every day. A window crossing midnight belongs to its start day.
   */
  days?: number[];
}

export interface ModelConfig {
  id: string;
  name: string;
  timezone: string;
  note?: string;
  sourceUrl?: string;
  windows: WindowEntry[];
  /**
   * Never allow coding for this provider — status is always peak (NO) and it has
   * no countdown or upcoming windows. Use for providers you refuse to support.
   */
  never?: boolean;
}

export interface Config {
  /** Display/SSR fallback timezone only — status math always uses each model's own timezone. */
  timezone: string;
  models: ModelConfig[];
}

export type ModelStatus = 'peak' | 'discount' | 'off-peak' | 'off-discount';

export interface Boundary {
  kind: WindowKind;
  isStart: boolean;
  at: Date;
}

export interface WindowOccurrence {
  kind: WindowKind;
  start: Date;
  end: Date;
}

export interface ModelSnapshot {
  id: string;
  status: ModelStatus;
  /** Null when the model has no windows — e.g. flat pricing, nothing to count down to. */
  boundary: Boundary | null;
  upcoming: WindowOccurrence[];
}

export interface Snapshot {
  computedAt: Date;
  models: ModelSnapshot[];
}

/** Raw JSON shape of a Snapshot (Dates as ISO strings) — what the worker embeds and the client revives. */
export interface SnapshotJson {
  computedAt: string;
  models: {
    id: string;
    status: ModelStatus;
    boundary: { kind: WindowKind; isStart: boolean; at: string } | null;
    upcoming: { kind: WindowKind; start: string; end: string }[];
  }[];
}

export function reviveSnapshot(raw: SnapshotJson): Snapshot {
  return {
    computedAt: new Date(raw.computedAt),
    models: raw.models.map((model) => ({
      id: model.id,
      status: model.status,
      boundary:
        model.boundary === null
          ? null
          : {
              kind: model.boundary.kind,
              isStart: model.boundary.isStart,
              at: new Date(model.boundary.at)
            },
      upcoming: model.upcoming.map((w) => ({
        kind: w.kind,
        start: new Date(w.start),
        end: new Date(w.end)
      }))
    }))
  };
}

interface WallParts {
  year: number;
  /** 0-based, matching Date.UTC. */
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const wallFormatterCache = new Map<string, Intl.DateTimeFormat>();
const timeFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getWallParts(tz: string, date: Date): WallParts {
  let formatter = wallFormatterCache.get(tz);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23'
    });
    wallFormatterCache.set(tz, formatter);
  }

  let year = 0;
  let month = 0;
  let day = 0;
  let hour = 0;
  let minute = 0;
  for (const part of formatter.formatToParts(date)) {
    switch (part.type) {
      case 'year':
        year = Number(part.value);
        break;
      case 'month':
        month = Number(part.value) - 1;
        break;
      case 'day':
        day = Number(part.value);
        break;
      case 'hour':
        hour = Number(part.value);
        break;
      case 'minute':
        minute = Number(part.value);
        break;
    }
  }
  return { year, month, day, hour, minute };
}

/** How far the timezone's wall clock is ahead of the given instant, in ms. */
function getOffsetMs(tz: string, date: Date): number {
  const wall = getWallParts(tz, date);
  return (
    Date.UTC(wall.year, wall.month, wall.day, wall.hour, wall.minute) -
    date.getTime()
  );
}

/**
 * Resolve a wall-clock time (in `tz`) to the exact instant. Two passes converge
 * across DST transitions — the first estimates the offset near the target, the
 * second uses that offset to land on the wall time itself.
 */
export function getInstantForWallClock(
  tz: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): Date {
  const approximateUtc = Date.UTC(year, month, day, hour, minute);
  const firstPass = new Date(
    approximateUtc - getOffsetMs(tz, new Date(approximateUtc))
  );
  return new Date(approximateUtc - getOffsetMs(tz, firstPass));
}

function parseTimeToMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

/** Weekday (0 = Sunday … 6 = Saturday) of a wall-clock date. */
function weekdayOf(y: number, m: number, d: number): number {
  return new Date(Date.UTC(y, m, d)).getUTCDay();
}

function windowAppliesOnDay(window: WindowEntry, weekday: number): boolean {
  return !window.days || window.days.includes(weekday);
}

function minutesInWindow(minutes: number, window: WindowEntry): boolean {
  const start = parseTimeToMinutes(window.start);
  const end = parseTimeToMinutes(window.end);
  if (start === end) {
    // Zero-length window — never "in" it and it has no boundaries.
    return false;
  }
  if (start < end) {
    return minutes >= start && minutes < end;
  }
  // Window crosses midnight: 23:00–03:00 means [23:00, 24:00) or [00:00, 03:00).
  return minutes >= start || minutes < end;
}

export function getMinutesInTz(date: Date, tz: string): number {
  const wall = getWallParts(tz, date);
  return wall.hour * 60 + wall.minute;
}

/** The three booleans the API/UI expose; off-peak and off-discount differ only in the countdown label. */
export function statusFlags(status: ModelStatus): {
  canCode: boolean;
  discount: boolean;
  peak: boolean;
} {
  return {
    canCode: status !== 'peak',
    discount: status === 'discount',
    peak: status === 'peak'
  };
}

export function getStatusAt(now: Date, model: ModelConfig): ModelStatus {
  // A `never` provider is always peak, so the badge always reads NO.
  if (model.never) return 'peak';
  const wall = getWallParts(model.timezone, now);
  const minutes = wall.hour * 60 + wall.minute;
  const weekday = weekdayOf(wall.year, wall.month, wall.day);
  // Peak wins if a model ever defines overlapping peak and discount windows.
  for (const window of model.windows) {
    if (
      window.type === 'peak' &&
      windowAppliesOnDay(window, weekday) &&
      minutesInWindow(minutes, window)
    )
      return 'peak';
  }
  for (const window of model.windows) {
    if (
      window.type === 'discount' &&
      windowAppliesOnDay(window, weekday) &&
      minutesInWindow(minutes, window)
    ) {
      return 'discount';
    }
  }
  const hasDiscount = model.windows.some(
    (window) => window.type === 'discount'
  );
  return hasDiscount ? 'off-discount' : 'off-peak';
}

// Windows recur weekly at most, so every future boundary lies within the next week;
// a couple extra days of margin keeps DST edge cases (nonexistent wall times) covered.
const BOUNDARY_SCAN_DAYS = 8;

/**
 * The earliest future instant where this model's status changes — the countdown target.
 * It is the end of the current window when one is active, otherwise the next window's start.
 * Null when the model has no windows — its status never changes (e.g. flat pricing).
 */
export function getNextBoundary(
  now: Date,
  model: ModelConfig
): Boundary | null {
  if (model.windows.length === 0) return null;
  const today = getWallParts(model.timezone, now);
  const candidates: Boundary[] = [];

  for (let dayOffset = 0; dayOffset < BOUNDARY_SCAN_DAYS; dayOffset++) {
    const weekday = weekdayOf(today.year, today.month, today.day + dayOffset);
    for (const window of model.windows) {
      if (!windowAppliesOnDay(window, weekday)) continue;
      const startMinutes = parseTimeToMinutes(window.start);
      const endMinutes = parseTimeToMinutes(window.end);
      if (startMinutes === endMinutes) continue;

      const start = getInstantForWallClock(
        model.timezone,
        today.year,
        today.month,
        today.day + dayOffset,
        Math.floor(startMinutes / 60),
        startMinutes % 60
      );
      // A window crossing midnight (start > end) ends on the NEXT wall day.
      const endDayOffset =
        startMinutes > endMinutes ? dayOffset + 1 : dayOffset;
      const end = getInstantForWallClock(
        model.timezone,
        today.year,
        today.month,
        today.day + endDayOffset,
        Math.floor(endMinutes / 60),
        endMinutes % 60
      );

      if (start.getTime() > now.getTime())
        candidates.push({ kind: window.type, isStart: true, at: start });
      if (end.getTime() > now.getTime())
        candidates.push({ kind: window.type, isStart: false, at: end });
    }
  }

  if (candidates.length === 0) {
    throw new Error(
      `dev-error: no future boundary for ${model.id}, but its windows recur weekly at most so one must exist`
    );
  }

  return candidates.reduce((soonest, candidate) =>
    candidate.at < soonest.at ? candidate : soonest
  );
}

/** The next occurrence of one window that has not started yet — never the one currently active. */
function nextOccurrence(
  now: Date,
  tz: string,
  today: WallParts,
  window: WindowEntry
): WindowOccurrence | null {
  const startMinutes = parseTimeToMinutes(window.start);
  const endMinutes = parseTimeToMinutes(window.end);
  if (startMinutes === endMinutes) return null;

  for (let dayOffset = 0; dayOffset < BOUNDARY_SCAN_DAYS; dayOffset++) {
    if (
      !windowAppliesOnDay(
        window,
        weekdayOf(today.year, today.month, today.day + dayOffset)
      )
    )
      continue;
    const start = getInstantForWallClock(
      tz,
      today.year,
      today.month,
      today.day + dayOffset,
      Math.floor(startMinutes / 60),
      startMinutes % 60
    );
    // A window crossing midnight (start > end) ends on the NEXT wall day.
    const endDayOffset = startMinutes > endMinutes ? dayOffset + 1 : dayOffset;
    const end = getInstantForWallClock(
      tz,
      today.year,
      today.month,
      today.day + endDayOffset,
      Math.floor(endMinutes / 60),
      endMinutes % 60
    );
    // "Upcoming" means it has not begun: the active window (start <= now) must not
    // appear here, so skip to its next occurrence.
    if (start.getTime() > now.getTime()) {
      return { kind: window.type, start, end };
    }
  }
  return null;
}

/** One upcoming occurrence per configured window (e.g. DeepSeek always shows its 2). */
export function getUpcomingWindows(
  now: Date,
  model: ModelConfig
): WindowOccurrence[] {
  const today = getWallParts(model.timezone, now);
  return model.windows
    .map((window) => nextOccurrence(now, model.timezone, today, window))
    .filter((occurrence): occurrence is WindowOccurrence => occurrence !== null)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function computeSnapshot(now: Date, config: Config): Snapshot {
  return {
    computedAt: now,
    models: config.models.map((model) => ({
      id: model.id,
      status: getStatusAt(now, model),
      boundary: getNextBoundary(now, model),
      upcoming: getUpcomingWindows(now, model)
    }))
  };
}

/** "1h 02m 03s" — leading units omitted when zero ("02m 03s", "45s"). */
export function formatDuration(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function formatTimeInTz(
  tz: string,
  date: Date,
  hour12: boolean
): string {
  const cacheKey = `${tz}:${hour12}`;
  let formatter = timeFormatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      // 12h hours conventionally have no leading zero ("6:00 PM"); 24h keeps it ("06:00").
      hour: hour12 ? 'numeric' : '2-digit',
      minute: '2-digit',
      hour12
    });
    timeFormatterCache.set(cacheKey, formatter);
  }
  return formatter.format(date);
}

/** Calendar-day difference (in `tz`) between two instants: 0 = same day, 1 = next day, etc. */
export function dayDifferenceInTz(tz: string, from: Date, to: Date): number {
  const fromWall = getWallParts(tz, from);
  const toWall = getWallParts(tz, to);
  const fromDay = Date.UTC(fromWall.year, fromWall.month, fromWall.day);
  const toDay = Date.UTC(toWall.year, toWall.month, toWall.day);
  return Math.round((toDay - fromDay) / 86_400_000);
}
