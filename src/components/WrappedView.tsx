"use client";

import { useEffect, useRef, useState } from "react";
import type { JobView } from "@/lib/statsJob";
import { StatsDashboard } from "./StatsDashboard";
import { StoryCarousel } from "./story/StoryCarousel";

// Must stay comfortably above the server's per-(IP, username) throttle
// window (see src/app/api/stats/[username]/route.ts) or legitimate polling
// starts tripping its own rate limit.
const POLL_INTERVAL_MS = 1500;

export function WrappedView({ username }: { username: string }) {
  const [job, setJob] = useState<JobView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const forceRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const force = forceRef.current;
    forceRef.current = false;

    (async () => {
      try {
        const res = await fetch(`/api/stats/${encodeURIComponent(username)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force }),
        });
        if (cancelled) return;
        if (res.status === 429) {
          // Transient self-throttle, not a real failure — just retry.
          setTimeout(() => {
            if (!cancelled) setTick((t) => t + 1);
          }, POLL_INTERVAL_MS);
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? `Request failed (${res.status})`);
          return;
        }
        const data: JobView = await res.json();
        if (cancelled) return;
        setError(null);
        setJob(data);
        const stillEnriching =
          data.status === "done" && (data.enrichStatus === "pending" || data.enrichStatus === "processing");
        if (data.status === "pending" || data.status === "processing" || stillEnriching) {
          setTimeout(() => {
            if (!cancelled) setTick((t) => t + 1);
          }, POLL_INTERVAL_MS);
        }
      } catch {
        if (!cancelled) setError("Couldn't reach the server. Check your connection and try again.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [username, tick]);

  function retry(force = false) {
    forceRef.current = force;
    setTick((t) => t + 1);
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-[var(--viz-text-primary)]">{error}</p>
        <button
          onClick={() => retry()}
          className="rounded-full bg-[var(--viz-series-1)] px-4 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!job || job.status === "pending" || job.status === "processing") {
    const pct = Math.round((job?.progress ?? 0) * 100);
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <p className="text-[var(--viz-text-secondary)]">
          Fetching {username}&apos;s scrobbles{job?.totalPages ? ` (page ${job.page}/${job.totalPages})` : "…"}
        </p>
        <div className="h-2 w-64 overflow-hidden rounded-full bg-[var(--viz-grid)]">
          <div
            className="h-2 rounded-full bg-[var(--viz-series-1)] transition-all"
            style={{ width: `${Math.max(4, pct)}%` }}
          />
        </div>
      </div>
    );
  }

  if (job.status === "error") {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-[var(--viz-text-primary)]">{job.error ?? "Something went wrong."}</p>
        <button
          onClick={() => retry(true)}
          className="rounded-full bg-[var(--viz-series-1)] px-4 py-2 text-sm font-medium text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!job.result) return null;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {job.profileImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={job.profileImageUrl} alt="" className="h-10 w-10 rounded-full" />
          )}
          <div>
            <div className="font-semibold text-[var(--viz-text-primary)]">{job.displayName ?? job.username}</div>
            <div className="text-xs text-[var(--viz-text-muted)]">@{job.username}</div>
          </div>
        </div>
        <button
          onClick={() => retry(true)}
          className="rounded-full border border-[var(--viz-grid)] px-3 py-1.5 text-xs font-medium text-[var(--viz-text-secondary)]"
        >
          Refresh
        </button>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-[var(--viz-text-primary)]">Share your Wrapped</h2>
        <StoryCarousel
          stats={job.result}
          displayName={job.displayName ?? job.username}
          enrichment={job.enrichment}
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-[var(--viz-text-primary)]">Full stats</h2>
        <StatsDashboard stats={job.result} enrichment={job.enrichment} />
      </section>
    </div>
  );
}
