const API_BASE = "https://ws.audioscrobbler.com/2.0/";

export class LastfmError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

function apiKey(): string {
  const key = process.env.LASTFM_API_KEY;
  if (!key) throw new Error("LASTFM_API_KEY is not set");
  return key;
}

async function request(
  params: Record<string, string>
): Promise<Record<string, unknown>> {
  const url = new URL(API_BASE);
  url.search = new URLSearchParams({
    ...params,
    api_key: apiKey(),
    format: "json",
  }).toString();

  const res = await fetch(url, { cache: "no-store" });
  const body = (await res.json()) as Record<string, unknown>;

  if (typeof body.error === "number") {
    throw new LastfmError(body.error, String(body.message ?? "Last.fm API error"));
  }
  if (!res.ok) {
    throw new LastfmError(res.status, `Last.fm API returned HTTP ${res.status}`);
  }
  return body;
}

export type LastfmUserInfo = {
  name: string;
  playcount: number;
  registeredUts: number;
  imageUrl: string | null;
};

export async function getUserInfo(username: string): Promise<LastfmUserInfo> {
  const body = await request({ method: "user.getinfo", user: username });
  const user = body.user as Record<string, unknown>;
  const images = (user.image as Array<Record<string, string>>) ?? [];
  const bestImage = images.length > 0 ? images[images.length - 1]["#text"] : "";
  const registered = user.registered as Record<string, unknown> | undefined;

  return {
    name: String(user.name),
    playcount: Number(user.playcount ?? 0),
    registeredUts: Number(registered?.unixtime ?? 0),
    imageUrl: bestImage && bestImage.length > 0 ? bestImage : null,
  };
}

export type Scrobble = {
  artist: string;
  track: string;
  album: string;
  uts: number;
};

export type RecentTracksPage = {
  tracks: Scrobble[];
  page: number;
  totalPages: number;
  total: number;
};

// Normalizes Last.fm's "flatten single-item arrays to an object" JSON quirk.
function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export async function getRecentTracksPage(
  username: string,
  options: { fromUts: number; toUts: number; page: number; limit?: number }
): Promise<RecentTracksPage> {
  const body = await request({
    method: "user.getrecenttracks",
    user: username,
    from: String(options.fromUts),
    to: String(options.toUts),
    page: String(options.page),
    limit: String(options.limit ?? 200),
  });

  const recenttracks = body.recenttracks as Record<string, unknown>;
  const attr = recenttracks["@attr"] as Record<string, string> | undefined;
  const rawTracks = asArray(
    recenttracks.track as Record<string, unknown> | Record<string, unknown>[] | undefined
  );

  const tracks: Scrobble[] = rawTracks
    // Skip the "now playing" track: it has no `date` field and isn't a completed scrobble.
    .filter((t) => (t["@attr"] as Record<string, string> | undefined)?.nowplaying !== "true")
    .map((t) => {
      const date = t.date as Record<string, string> | undefined;
      const artist = t.artist as Record<string, string> | undefined;
      const album = t.album as Record<string, string> | undefined;
      return {
        artist: artist?.["#text"] ?? "Unknown Artist",
        track: String(t.name ?? "Unknown Track"),
        album: album?.["#text"] ?? "",
        uts: Number(date?.uts ?? 0),
      };
    });

  return {
    tracks,
    page: Number(attr?.page ?? options.page),
    totalPages: Number(attr?.totalPages ?? 0),
    total: Number(attr?.total ?? 0),
  };
}

// Last.fm stopped serving real artist photos years ago — artist.getInfo
// always returns this same generic placeholder image hash for every artist.
// Detected by comparing against a known-clean artist; callers should treat
// a match as "no image" rather than displaying it.
const PLACEHOLDER_IMAGE_HASH = "2a96cbd8b46e442fc41c2b86b821562f";

function bestImage(images: Array<Record<string, string>> | undefined): string | null {
  if (!images || images.length === 0) return null;
  const url = images[images.length - 1]["#text"];
  if (!url || url.length === 0) return null;
  if (url.includes(PLACEHOLDER_IMAGE_HASH)) return null;
  return url;
}

export async function getAlbumArt(artist: string, album: string): Promise<string | null> {
  try {
    const body = await request({ method: "album.getinfo", artist, album });
    const albumInfo = body.album as Record<string, unknown> | undefined;
    return bestImage(albumInfo?.image as Array<Record<string, string>> | undefined);
  } catch {
    // Unknown/mismatched album on Last.fm's side — not worth failing enrichment over.
    return null;
  }
}

export type TrackInfo = {
  imageUrl: string | null;
  durationMs: number | null;
  album: string | null;
};

export async function getTrackInfo(artist: string, track: string): Promise<TrackInfo> {
  try {
    const body = await request({ method: "track.getinfo", artist, track });
    const trackInfo = body.track as Record<string, unknown> | undefined;
    const album = trackInfo?.album as Record<string, unknown> | undefined;
    const durationRaw = Number(trackInfo?.duration ?? 0);
    return {
      imageUrl: bestImage(album?.image as Array<Record<string, string>> | undefined),
      durationMs: durationRaw > 0 ? durationRaw : null,
      album: (album?.title as string) ?? null,
    };
  } catch {
    return { imageUrl: null, durationMs: null, album: null };
  }
}

export type TopTag = { name: string; weight: number };

export async function getArtistTopTags(artist: string): Promise<TopTag[]> {
  try {
    const body = await request({ method: "artist.gettoptags", artist });
    const toptags = body.toptags as Record<string, unknown> | undefined;
    const rawTags = asArray(toptags?.tag as Record<string, unknown> | Record<string, unknown>[] | undefined);
    return rawTags
      .map((t) => ({ name: String(t.name ?? ""), weight: Number(t.count ?? 0) }))
      .filter((t) => t.name.length > 0 && t.weight > 0);
  } catch {
    return [];
  }
}

// `stats.userplaycount` on a username-scoped artist.getInfo call is the
// user's ALL-TIME playcount for that artist (not scoped to the stats job's
// year window) — used to tell new discoveries from longtime favorites.
export async function getArtistUserPlaycount(artist: string, username: string): Promise<number | null> {
  try {
    const body = await request({ method: "artist.getinfo", artist, username });
    const artistInfo = body.artist as Record<string, unknown> | undefined;
    const stats = artistInfo?.stats as Record<string, unknown> | undefined;
    const count = Number(stats?.userplaycount ?? NaN);
    return Number.isFinite(count) ? count : null;
  } catch {
    return null;
  }
}
