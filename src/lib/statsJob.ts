import { prisma } from "@/lib/prisma";
import { getRecentTracksPage, getUserInfo, LastfmError } from "@/lib/lastfm";
import { createAccumulator, foldScrobbles, finalizeStats, type Accumulator, type YearStats } from "@/lib/aggregate";
import {
  buildEnrichmentTasks,
  createEnrichAccumulator,
  finalizeEnrichment,
  stepEnrichment,
  type EnrichAccumulator,
  type Enrichment,
} from "@/lib/enrich";
import { Prisma, type StatsJob } from "@/generated/prisma/client";

// How many Last.fm pages (200 scrobbles each) to fetch per step() call, so a
// single invocation stays well inside any serverless function's time limit.
const PAGES_PER_STEP = 5;

// Minimum time between full re-fetches of an already-finished job, so a user
// mashing "refresh" can't repeatedly trigger a full-year re-scan.
const REFRESH_COOLDOWN_MS = 15 * 60 * 1000;

export class UserNotFoundError extends Error {}

function startOfYearUts(year: number): number {
  return Math.floor(Date.UTC(year, 0, 1, 0, 0, 0) / 1000);
}

export async function ensureJob(rawUsername: string, year: number, force = false): Promise<StatsJob> {
  const username = rawUsername.trim().toLowerCase();

  const existing = await prisma.statsJob.findUnique({ where: { username_year: { username, year } } });

  if (existing) {
    const onCooldown = Date.now() - existing.lastRequestedAt.getTime() < REFRESH_COOLDOWN_MS;
    if (existing.status === "done" && (!force || onCooldown)) {
      return existing;
    }
    if (existing.status !== "done" && !force) {
      // A fetch is already pending/processing for this window — keep stepping it.
      return existing;
    }
    if (onCooldown) {
      // Force was requested but we're still on cooldown; serve what we have.
      return existing;
    }
    // Start a fresh full re-fetch.
    return prisma.statsJob.update({
      where: { id: existing.id },
      data: {
        status: "pending",
        page: 0,
        totalPages: null,
        partial: createAccumulator() as object,
        result: Prisma.JsonNull,
        error: null,
        toUts: Math.floor(Date.now() / 1000),
        lastRequestedAt: new Date(),
        enrichStatus: "pending",
        enrichStep: 0,
        enrichPartial: Prisma.JsonNull,
        enrichment: Prisma.JsonNull,
        enrichError: null,
      },
    });
  }

  // Confirms the username exists (and is public) before creating a job for it.
  // Last.fm error code 6 = invalid parameters / user not found; other codes
  // (e.g. 10 = invalid API key, 29 = rate limited) are real failures, not a
  // bad username, so they should surface as a generic error, not a 404.
  let profile;
  try {
    profile = await getUserInfo(username);
  } catch (err) {
    if (err instanceof LastfmError && err.code === 6) throw new UserNotFoundError(err.message);
    throw err;
  }

  return prisma.statsJob.create({
    data: {
      username,
      year,
      displayName: profile.name,
      profileImageUrl: profile.imageUrl,
      libraryPlaycount: profile.playcount,
      status: "pending",
      fromUts: startOfYearUts(year),
      toUts: Math.floor(Date.now() / 1000),
      partial: createAccumulator() as object,
    },
  });
}

export type JobView = {
  username: string;
  displayName: string | null;
  profileImageUrl: string | null;
  libraryPlaycount: number | null;
  status: string;
  page: number;
  totalPages: number | null;
  progress: number; // 0-1
  error: string | null;
  result: YearStats | null;
  enrichStatus: string;
  enrichment: Enrichment | null;
};

export function toJobView(job: StatsJob): JobView {
  const totalPages = job.totalPages;
  const progress = !totalPages || totalPages === 0 ? (job.status === "done" ? 1 : 0) : job.page / totalPages;
  return {
    username: job.username,
    displayName: job.displayName,
    profileImageUrl: job.profileImageUrl,
    libraryPlaycount: job.libraryPlaycount,
    status: job.status,
    page: job.page,
    totalPages,
    progress,
    error: job.error,
    result: (job.result as YearStats | null) ?? null,
    enrichStatus: job.enrichStatus,
    enrichment: (job.enrichment as Enrichment | null) ?? null,
  };
}

// Runs a slice of the secondary enrichment pass (album art, genre tags,
// track durations, all-time playcounts). Only meaningful once the main job
// is "done" — callers should check that first. Never throws: enrichment is
// best-effort, so a Last.fm hiccup here shouldn't take down the main job.
export async function stepEnrich(job: StatsJob): Promise<StatsJob> {
  if (job.status !== "done" || !job.result) return job;
  if (job.enrichStatus === "done" || job.enrichStatus === "error") return job;

  const stats = job.result as YearStats;
  const tasks = buildEnrichmentTasks(stats);
  const acc = (job.enrichPartial as EnrichAccumulator | null) ?? createEnrichAccumulator();

  if (tasks.length === 0) {
    return prisma.statsJob.update({
      where: { id: job.id },
      data: { enrichStatus: "done", enrichStep: 0, enrichment: finalizeEnrichment(stats, acc) as object },
    });
  }

  try {
    const { nextIndex, done } = await stepEnrichment(tasks, job.enrichStep, job.username, acc);
    return prisma.statsJob.update({
      where: { id: job.id },
      data: {
        enrichStep: nextIndex,
        enrichPartial: acc as object,
        enrichStatus: done ? "done" : "processing",
        enrichment: done ? (finalizeEnrichment(stats, acc) as object) : undefined,
      },
    });
  } catch (err) {
    return prisma.statsJob.update({
      where: { id: job.id },
      data: {
        enrichStatus: "error",
        enrichError: err instanceof Error ? err.message : "Unknown error enriching stats",
      },
    });
  }
}

export async function step(job: StatsJob): Promise<StatsJob> {
  if (job.status === "done" || job.status === "error") return job;

  let acc = (job.partial as Accumulator | null) ?? createAccumulator();
  let page = job.page;
  let totalPages = job.totalPages;

  try {
    for (let i = 0; i < PAGES_PER_STEP; i++) {
      const nextPage = page + 1;
      if (totalPages !== null && totalPages !== undefined && nextPage > totalPages) break;

      const result = await getRecentTracksPage(job.username, {
        fromUts: job.fromUts,
        toUts: job.toUts,
        page: nextPage,
      });

      totalPages = result.totalPages;
      page = result.totalPages === 0 ? 0 : nextPage;
      acc = foldScrobbles(acc, result.tracks);

      if (totalPages === 0 || nextPage >= totalPages) break;
    }
  } catch (err) {
    return prisma.statsJob.update({
      where: { id: job.id },
      data: { status: "error", error: err instanceof Error ? err.message : "Unknown error fetching Last.fm data" },
    });
  }

  const finished = totalPages === 0 || (totalPages !== null && page >= (totalPages ?? 0));

  return prisma.statsJob.update({
    where: { id: job.id },
    data: {
      page,
      totalPages,
      partial: acc as object,
      status: finished ? "done" : "processing",
      result: finished ? (finalizeStats(acc, job.year) as object) : undefined,
    },
  });
}
