"use client";

import { useRef, useState } from "react";
import type { YearStats } from "@/lib/aggregate";
import { deriveHabits } from "@/lib/aggregate";
import type { Enrichment } from "@/lib/enrich";
import { exportNodeAsPng, shareOrExportPng } from "@/lib/storyExport";
import { CoverCard } from "./CoverCard";
import { TopEntityCard } from "./TopEntityCard";
import { TopListCard } from "./TopListCard";
import { HabitsCard } from "./HabitsCard";
import { GenreCard } from "./GenreCard";
import { MinutesCard } from "./MinutesCard";
import { DayOfWeekCard } from "./DayOfWeekCard";
import { DiscoveryCard } from "./DiscoveryCard";

function CardActions({
  getNode,
  filename,
}: {
  getNode: () => HTMLDivElement | null;
  filename: string;
}) {
  const [busy, setBusy] = useState(false);

  async function run(share: boolean) {
    const node = getNode();
    if (!node) return;
    setBusy(true);
    try {
      if (share) await shareOrExportPng(node, filename, filename);
      else await exportNodeAsPng(node, filename);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => run(false)}
        disabled={busy}
        className="rounded-full bg-[var(--viz-series-1)] px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
      >
        {busy ? "…" : "Download"}
      </button>
      <button
        onClick={() => run(true)}
        disabled={busy}
        className="rounded-full border border-[var(--viz-grid)] px-3 py-1 text-xs font-medium text-[var(--viz-text-secondary)] disabled:opacity-50"
      >
        Share
      </button>
    </div>
  );
}

function CardSlot({
  getNode,
  filename,
  children,
}: {
  getNode: () => HTMLDivElement | null;
  filename: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 snap-start flex-col items-center gap-2">
      <div className="overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/10">{children}</div>
      <CardActions getNode={getNode} filename={filename} />
    </div>
  );
}

export function StoryCarousel({
  stats,
  displayName,
  enrichment,
}: {
  stats: YearStats;
  displayName: string;
  enrichment?: Enrichment | null;
}) {
  const habits = deriveHabits(stats);
  const topArtist = stats.topArtists[0];
  const topTrack = stats.topTracks[0];
  const topAlbum = stats.topAlbums[0];

  const coverRef = useRef<HTMLDivElement>(null);
  const artistRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const albumRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const habitsRef = useRef<HTMLDivElement>(null);
  const genreRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);
  const dayOfWeekRef = useRef<HTMLDivElement>(null);
  const discoveryRef = useRef<HTMLDivElement>(null);

  const discovery = enrichment?.discoveries[0];
  const classic = enrichment?.classics[0];

  return (
    <div className="flex snap-x gap-4 overflow-x-auto pb-4">
      <CardSlot getNode={() => coverRef.current} filename={`${displayName}-${stats.year}-wrapped-cover.png`}>
        <CoverCard
          ref={coverRef}
          displayName={displayName}
          year={stats.year}
          totalScrobbles={stats.totalScrobbles}
          uniqueArtists={stats.uniqueArtists}
        />
      </CardSlot>

      {topArtist && (
        <CardSlot getNode={() => artistRef.current} filename={`${displayName}-${stats.year}-top-artist.png`}>
          <TopEntityCard
            ref={artistRef}
            kind="artist"
            name={topArtist.name}
            count={topArtist.count}
            year={stats.year}
            imageUrl={enrichment?.media.topArtistArt}
          />
        </CardSlot>
      )}

      {topTrack && (
        <CardSlot getNode={() => trackRef.current} filename={`${displayName}-${stats.year}-top-track.png`}>
          <TopEntityCard
            ref={trackRef}
            kind="track"
            name={topTrack.track}
            sublabel={topTrack.artist}
            count={topTrack.count}
            year={stats.year}
            imageUrl={enrichment?.media.topTrackArt}
          />
        </CardSlot>
      )}

      {topAlbum && (
        <CardSlot getNode={() => albumRef.current} filename={`${displayName}-${stats.year}-top-album.png`}>
          <TopEntityCard
            ref={albumRef}
            kind="album"
            name={topAlbum.album}
            sublabel={topAlbum.artist}
            count={topAlbum.count}
            year={stats.year}
            imageUrl={enrichment?.media.topAlbumArt}
          />
        </CardSlot>
      )}

      <CardSlot getNode={() => listRef.current} filename={`${displayName}-${stats.year}-top-5-artists.png`}>
        <TopListCard
          ref={listRef}
          title="Top 5 artists"
          items={stats.topArtists.slice(0, 5).map((a) => ({ label: a.name, count: a.count }))}
          year={stats.year}
        />
      </CardSlot>

      <CardSlot getNode={() => habitsRef.current} filename={`${displayName}-${stats.year}-listening-style.png`}>
        <HabitsCard ref={habitsRef} label={habits.label} detail={habits.detail} year={stats.year} />
      </CardSlot>

      <CardSlot getNode={() => dayOfWeekRef.current} filename={`${displayName}-${stats.year}-day-of-week.png`}>
        <DayOfWeekCard ref={dayOfWeekRef} dayOfWeek={stats.dayOfWeek} year={stats.year} />
      </CardSlot>

      {enrichment && enrichment.genre.top && (
        <CardSlot getNode={() => genreRef.current} filename={`${displayName}-${stats.year}-top-genre.png`}>
          <GenreCard
            ref={genreRef}
            topGenre={enrichment.genre.top}
            breakdown={enrichment.genre.breakdown}
            year={stats.year}
          />
        </CardSlot>
      )}

      {enrichment && enrichment.minutesListened.sampledTracks > 0 && (
        <CardSlot getNode={() => minutesRef.current} filename={`${displayName}-${stats.year}-minutes-listened.png`}>
          <MinutesCard
            ref={minutesRef}
            estimatedMinutes={enrichment.minutesListened.estimatedMinutes}
            year={stats.year}
          />
        </CardSlot>
      )}

      {(discovery || classic) && (
        <CardSlot getNode={() => discoveryRef.current} filename={`${displayName}-${stats.year}-discoveries.png`}>
          <DiscoveryCard ref={discoveryRef} discovery={discovery} classic={classic} year={stats.year} />
        </CardSlot>
      )}
    </div>
  );
}
