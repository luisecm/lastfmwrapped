import type { YearStats } from "@/lib/aggregate";
import {
  getAlbumArt,
  getArtistTopTags,
  getArtistUserPlaycount,
  getTrackInfo,
} from "@/lib/lastfm";
import { cacheKey, getCached, setCached } from "@/lib/mediaCache";

// How many top artists get a genre-tag lookup and an all-time-playcount
// lookup, and how many top tracks get sampled for duration. Kept small
// because artistPlaycount isn't globally cacheable (it's per-user) and has
// to hit Last.fm fresh on every uncached job.
const TOP_ARTISTS_FOR_TAGS_AND_PLAYCOUNT = 15;
const TOP_TRACKS_FOR_DURATION_SAMPLE = 20;

// Processed per step() call so a single request never has to make 50+
// sequential Last.fm calls in one shot — mirrors PAGES_PER_STEP in statsJob.ts.
export const ENRICH_TASKS_PER_STEP = 6;

type Task =
  | { type: "albumArt"; artist: string; album: string }
  | { type: "trackInfo"; artist: string; track: string }
  | { type: "artistTags"; artist: string }
  | { type: "artistPlaycount"; artist: string };

function taskKey(task: Task): string {
  switch (task.type) {
    case "albumArt":
      return `albumArt:${cacheKey(task.artist, task.album)}`;
    case "trackInfo":
      return `trackInfo:${cacheKey(task.artist, task.track)}`;
    case "artistTags":
      return `artistTags:${cacheKey(task.artist)}`;
    case "artistPlaycount":
      return `artistPlaycount:${cacheKey(task.artist)}`;
  }
}

// Deterministic so enrichStep (a plain cursor index) means the same thing
// across repeated step() calls for the same job.
export function buildEnrichmentTasks(stats: YearStats): Task[] {
  const tasks: Task[] = [];
  const seen = new Set<string>();
  function add(task: Task) {
    const key = taskKey(task);
    if (seen.has(key)) return;
    seen.add(key);
    tasks.push(task);
  }

  const topAlbum = stats.topAlbums[0];
  if (topAlbum) add({ type: "albumArt", artist: topAlbum.artist, album: topAlbum.album });

  const topArtist = stats.topArtists[0];
  if (topArtist) {
    // `topAlbumByArtist` doesn't exist on YearStats blobs cached before this
    // field was added, so a StatsJob row finished by an older deploy can
    // still have it missing entirely — guard rather than assume present.
    const ownTopAlbum = stats.topAlbumByArtist?.[topArtist.name];
    if (ownTopAlbum) add({ type: "albumArt", artist: topArtist.name, album: ownTopAlbum.album });
  }

  for (const t of stats.topTracks.slice(0, TOP_TRACKS_FOR_DURATION_SAMPLE)) {
    add({ type: "trackInfo", artist: t.artist, track: t.track });
  }

  for (const a of stats.topArtists.slice(0, TOP_ARTISTS_FOR_TAGS_AND_PLAYCOUNT)) {
    add({ type: "artistTags", artist: a.name });
    add({ type: "artistPlaycount", artist: a.name });
  }

  return tasks;
}

export type EnrichAccumulator = {
  albumArt: Record<string, string | null>; // key: cacheKey(artist, album)
  trackInfo: Record<string, { imageUrl: string | null; durationMs: number | null }>; // key: cacheKey(artist, track)
  artistTags: Record<string, { name: string; weight: number }[]>; // key: cacheKey(artist)
  artistPlaycount: Record<string, number | null>; // key: cacheKey(artist)
};

export function createEnrichAccumulator(): EnrichAccumulator {
  return { albumArt: {}, trackInfo: {}, artistTags: {}, artistPlaycount: {} };
}

async function runTask(task: Task, username: string, acc: EnrichAccumulator): Promise<void> {
  switch (task.type) {
    case "albumArt": {
      const key = cacheKey(task.artist, task.album);
      const cached = await getCached<{ imageUrl: string | null }>("albumArt", key);
      if (cached) {
        acc.albumArt[key] = cached.imageUrl;
        return;
      }
      const imageUrl = await getAlbumArt(task.artist, task.album);
      acc.albumArt[key] = imageUrl;
      await setCached("albumArt", key, { imageUrl });
      return;
    }
    case "trackInfo": {
      const key = cacheKey(task.artist, task.track);
      const cached = await getCached<{ imageUrl: string | null; durationMs: number | null }>("trackInfo", key);
      if (cached) {
        acc.trackInfo[key] = cached;
        return;
      }
      const info = await getTrackInfo(task.artist, task.track);
      acc.trackInfo[key] = { imageUrl: info.imageUrl, durationMs: info.durationMs };
      await setCached("trackInfo", key, { imageUrl: info.imageUrl, durationMs: info.durationMs });
      return;
    }
    case "artistTags": {
      const key = cacheKey(task.artist);
      const cached = await getCached<{ name: string; weight: number }[]>("artistTags", key);
      if (cached) {
        acc.artistTags[key] = cached;
        return;
      }
      const tags = await getArtistTopTags(task.artist);
      acc.artistTags[key] = tags;
      await setCached("artistTags", key, tags);
      return;
    }
    case "artistPlaycount": {
      // User-specific (all-time plays for THIS listener), so never cached globally.
      const key = cacheKey(task.artist);
      acc.artistPlaycount[key] = await getArtistUserPlaycount(task.artist, username);
      return;
    }
  }
}

export async function stepEnrichment(
  tasks: Task[],
  startIndex: number,
  username: string,
  acc: EnrichAccumulator
): Promise<{ nextIndex: number; done: boolean }> {
  const end = Math.min(startIndex + ENRICH_TASKS_PER_STEP, tasks.length);
  for (let i = startIndex; i < end; i++) {
    await runTask(tasks[i], username, acc);
  }
  return { nextIndex: end, done: end >= tasks.length };
}

export type Enrichment = {
  media: {
    topAlbumArt: string | null;
    topArtistArt: string | null; // the top artist's own best-selling album's art
    topTrackArt: string | null;
  };
  genre: {
    top: string | null;
    breakdown: { name: string; score: number }[];
  };
  minutesListened: {
    estimatedMinutes: number;
    sampledTracks: number;
  };
  discoveries: { artist: string; yearCount: number; allTimeCount: number }[];
  classics: { artist: string; yearCount: number; allTimeCount: number }[];
};

// Heuristics for telling a brand-new favorite from an old one revisited —
// both read off the gap between this year's plays and the artist's
// Last.fm-reported all-time plays for this listener.
const DISCOVERY_MIN_RATIO = 0.9; // this year's plays are essentially ALL of their plays ever
const CLASSIC_MAX_RATIO = 0.4; // this year's plays are a small slice of a much bigger history
const CLASSIC_MIN_GAP = 15; // ...and that history meaningfully predates this year

export function finalizeEnrichment(stats: YearStats, acc: EnrichAccumulator): Enrichment {
  const topAlbum = stats.topAlbums[0];
  const topArtist = stats.topArtists[0];
  const topTrack = stats.topTracks[0];
  const ownTopAlbum = topArtist ? stats.topAlbumByArtist?.[topArtist.name] : undefined;

  const topAlbumArt = topAlbum ? acc.albumArt[cacheKey(topAlbum.artist, topAlbum.album)] ?? null : null;
  const topArtistArt =
    topArtist && ownTopAlbum ? acc.albumArt[cacheKey(topArtist.name, ownTopAlbum.album)] ?? null : null;
  const topTrackArt = topTrack
    ? acc.trackInfo[cacheKey(topTrack.artist, topTrack.track)]?.imageUrl ?? null
    : null;

  const tagScores = new Map<string, number>();
  for (const a of stats.topArtists.slice(0, TOP_ARTISTS_FOR_TAGS_AND_PLAYCOUNT)) {
    const tags = acc.artistTags[cacheKey(a.name)] ?? [];
    for (const tag of tags) {
      // Weight by how much this listener actually played the artist, scaled
      // by how representative the tag is of that artist (0-100 on Last.fm).
      const score = a.count * (tag.weight / 100);
      tagScores.set(tag.name, (tagScores.get(tag.name) ?? 0) + score);
    }
  }
  const breakdown = Array.from(tagScores.entries())
    .map(([name, score]) => ({ name, score: Math.round(score * 10) / 10 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  let sampledDurationMs = 0;
  let sampledScrobbles = 0;
  for (const t of stats.topTracks.slice(0, TOP_TRACKS_FOR_DURATION_SAMPLE)) {
    const durationMs = acc.trackInfo[cacheKey(t.artist, t.track)]?.durationMs;
    if (!durationMs) continue;
    sampledDurationMs += durationMs * t.count;
    sampledScrobbles += t.count;
  }
  const avgDurationMs = sampledScrobbles > 0 ? sampledDurationMs / sampledScrobbles : 3.5 * 60 * 1000;
  const estimatedMinutes = Math.round((avgDurationMs * stats.totalScrobbles) / 60000);

  const discoveries: Enrichment["discoveries"] = [];
  const classics: Enrichment["classics"] = [];
  for (const a of stats.topArtists.slice(0, TOP_ARTISTS_FOR_TAGS_AND_PLAYCOUNT)) {
    const allTimeCount = acc.artistPlaycount[cacheKey(a.name)];
    if (allTimeCount === null || allTimeCount === undefined || allTimeCount <= 0) continue;
    const ratio = a.count / allTimeCount;
    if (ratio >= DISCOVERY_MIN_RATIO) {
      discoveries.push({ artist: a.name, yearCount: a.count, allTimeCount });
    } else if (ratio <= CLASSIC_MAX_RATIO && allTimeCount - a.count >= CLASSIC_MIN_GAP) {
      classics.push({ artist: a.name, yearCount: a.count, allTimeCount });
    }
  }
  discoveries.sort((a, b) => b.yearCount - a.yearCount);
  classics.sort((a, b) => b.allTimeCount - a.allTimeCount);

  return {
    media: { topAlbumArt, topArtistArt, topTrackArt },
    genre: { top: breakdown[0]?.name ?? null, breakdown },
    minutesListened: { estimatedMinutes, sampledTracks: sampledScrobbles > 0 ? sampledScrobbles : 0 },
    discoveries: discoveries.slice(0, 3),
    classics: classics.slice(0, 3),
  };
}
