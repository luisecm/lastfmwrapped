import type { YearStats } from "@/lib/aggregate";
import type { Enrichment } from "@/lib/enrich";
import { StatTile } from "./StatTile";
import { BarList } from "./BarList";
import { MonthlyChart } from "./MonthlyChart";
import { DayOfWeekChart } from "./DayOfWeekChart";
import { ListeningHeatmap } from "./ListeningHeatmap";
import { DiscoveryList } from "./DiscoveryList";

export function StatsDashboard({ stats, enrichment }: { stats: YearStats; enrichment?: Enrichment | null }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Scrobbles this year" value={stats.totalScrobbles.toLocaleString()} />
        <StatTile label="Unique artists" value={stats.uniqueArtists.toLocaleString()} />
        <StatTile label="Unique tracks" value={stats.uniqueTracks.toLocaleString()} />
        <StatTile label="Unique albums" value={stats.uniqueAlbums.toLocaleString()} />
        {enrichment && enrichment.minutesListened.sampledTracks > 0 && (
          <StatTile
            label="Minutes listened (est.)"
            value={enrichment.minutesListened.estimatedMinutes.toLocaleString()}
          />
        )}
        {enrichment?.genre.top && <StatTile label="Top genre" value={enrichment.genre.top} />}
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        <MonthlyChart monthly={stats.monthly} />
        <DayOfWeekChart dayOfWeek={stats.dayOfWeek} />
      </div>

      <div className="grid gap-8 sm:grid-cols-3">
        <BarList title="Top artists" items={stats.topArtists.map((a) => ({ label: a.name, count: a.count }))} />
        <BarList
          title="Top tracks"
          items={stats.topTracks.map((t) => ({ label: t.track, sublabel: t.artist, count: t.count }))}
        />
        <BarList
          title="Top albums"
          items={stats.topAlbums.map((a) => ({ label: a.album, sublabel: a.artist, count: a.count }))}
        />
      </div>

      {enrichment && enrichment.genre.breakdown.length > 0 && (
        <BarList
          title="Genre breakdown"
          items={enrichment.genre.breakdown.map((g) => ({ label: g.name, count: g.score }))}
        />
      )}

      {enrichment && <DiscoveryList discoveries={enrichment.discoveries} classics={enrichment.classics} />}

      <ListeningHeatmap dayHourHeatmap={stats.dayHourHeatmap} />
    </div>
  );
}
