import type { Scrobble } from "./lastfm";

// All time-bucketing (month/day-of-week/hour) uses UTC, since scrobble
// timestamps are UTC and we don't know each listener's real timezone.
export type Accumulator = {
  totalScrobbles: number;
  artistCounts: Record<string, number>;
  trackCounts: Record<string, { artist: string; track: string; count: number }>;
  albumCounts: Record<string, { artist: string; album: string; count: number }>;
  monthly: number[]; // index 0 = January
  hourOfDay: number[]; // index 0-23, UTC
  dayOfWeek: number[]; // index 0 = Sunday, UTC
  dayHourHeatmap: number[][]; // [dayOfWeek 0-6][hourOfDay 0-23], UTC
  firstScrobble: Scrobble | null;
  lastScrobble: Scrobble | null;
};

export function createAccumulator(): Accumulator {
  return {
    totalScrobbles: 0,
    artistCounts: {},
    trackCounts: {},
    albumCounts: {},
    monthly: new Array(12).fill(0),
    hourOfDay: new Array(24).fill(0),
    dayOfWeek: new Array(7).fill(0),
    dayHourHeatmap: Array.from({ length: 7 }, () => new Array(24).fill(0)),
    firstScrobble: null,
    lastScrobble: null,
  };
}

// JSON-encoded [artist, name] tuple as the map key — safe for any artist/track
// text (unlike a joined string with a separator, which risks collisions or,
// as a literal NUL byte once did here, characters Postgres' JSON type rejects).
function trackKey(artist: string, track: string): string {
  return JSON.stringify([artist, track]);
}

function albumKey(artist: string, album: string): string {
  return JSON.stringify([artist, album]);
}

// Mutates and returns `acc` so callers can fold large batches without
// reallocating; not safe to call concurrently on the same accumulator.
export function foldScrobbles(acc: Accumulator, scrobbles: Scrobble[]): Accumulator {
  for (const s of scrobbles) {
    acc.totalScrobbles += 1;
    acc.artistCounts[s.artist] = (acc.artistCounts[s.artist] ?? 0) + 1;

    const tKey = trackKey(s.artist, s.track);
    const existingTrack = acc.trackCounts[tKey];
    if (existingTrack) existingTrack.count += 1;
    else acc.trackCounts[tKey] = { artist: s.artist, track: s.track, count: 1 };

    if (s.album) {
      const aKey = albumKey(s.artist, s.album);
      const existingAlbum = acc.albumCounts[aKey];
      if (existingAlbum) existingAlbum.count += 1;
      else acc.albumCounts[aKey] = { artist: s.artist, album: s.album, count: 1 };
    }

    const date = new Date(s.uts * 1000);
    const hour = date.getUTCHours();
    const day = date.getUTCDay();
    acc.monthly[date.getUTCMonth()] += 1;
    acc.hourOfDay[hour] += 1;
    acc.dayOfWeek[day] += 1;
    acc.dayHourHeatmap[day][hour] += 1;

    if (!acc.firstScrobble || s.uts < acc.firstScrobble.uts) acc.firstScrobble = s;
    if (!acc.lastScrobble || s.uts > acc.lastScrobble.uts) acc.lastScrobble = s;
  }
  return acc;
}

export type YearStats = {
  year: number;
  totalScrobbles: number;
  uniqueArtists: number;
  uniqueTracks: number;
  uniqueAlbums: number;
  topArtists: { name: string; count: number }[];
  topTracks: { artist: string; track: string; count: number }[];
  topAlbums: { artist: string; album: string; count: number }[];
  // Each top artist's own best-selling album by scrobble count, computed
  // from the full (non-truncated) album tally — topAlbums above is only the
  // overall top 10, which can miss an artist's best album entirely. Optional
  // because a StatsJob.result cached before this field existed won't have
  // it — always access with `?.`.
  topAlbumByArtist?: Record<string, { album: string; count: number }>;
  monthly: number[];
  hourOfDay: number[];
  dayOfWeek: number[];
  dayHourHeatmap: number[][];
  firstScrobble: Scrobble | null;
  lastScrobble: Scrobble | null;
};

export function finalizeStats(acc: Accumulator, year: number, topN = 10): YearStats {
  const topArtists = Object.entries(acc.artistCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);

  const topTracks = Object.values(acc.trackCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);

  const topAlbums = Object.values(acc.albumCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);

  const topAlbumByArtist: Record<string, { album: string; count: number }> = {};
  for (const { name: artist } of topArtists) {
    let best: { album: string; count: number } | null = null;
    for (const entry of Object.values(acc.albumCounts)) {
      if (entry.artist !== artist) continue;
      if (!best || entry.count > best.count) best = { album: entry.album, count: entry.count };
    }
    if (best) topAlbumByArtist[artist] = best;
  }

  return {
    year,
    totalScrobbles: acc.totalScrobbles,
    uniqueArtists: Object.keys(acc.artistCounts).length,
    uniqueTracks: Object.keys(acc.trackCounts).length,
    uniqueAlbums: Object.keys(acc.albumCounts).length,
    topArtists,
    topTracks,
    topAlbums,
    topAlbumByArtist,
    monthly: acc.monthly,
    hourOfDay: acc.hourOfDay,
    dayOfWeek: acc.dayOfWeek,
    dayHourHeatmap: acc.dayHourHeatmap,
    firstScrobble: acc.firstScrobble,
    lastScrobble: acc.lastScrobble,
  };
}

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function argmax(values: number[]): number {
  let bestIndex = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[bestIndex]) bestIndex = i;
  }
  return bestIndex;
}

function hourLabel(hour: number): string {
  if (hour >= 21 || hour < 5) return "Night Owl";
  if (hour < 9) return "Early Bird";
  if (hour < 17) return "Daytime Listener";
  return "Evening Unwinder";
}

export function deriveHabits(stats: YearStats): { label: string; detail: string } {
  const peakHour = argmax(stats.hourOfDay);
  const peakDay = argmax(stats.dayOfWeek);
  return {
    label: hourLabel(peakHour),
    detail: `Busiest around ${peakHour.toString().padStart(2, "0")}:00 UTC on ${DAY_NAMES[peakDay]}s`,
  };
}
