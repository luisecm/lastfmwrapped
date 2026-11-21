"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function UsernameForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    router.push(`/u/${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm gap-2">
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Your Last.fm username"
        className="flex-1 rounded-full border border-[var(--viz-grid)] bg-[var(--viz-surface)] px-4 py-2 text-[var(--viz-text-primary)] outline-none focus:border-[var(--viz-series-1)]"
      />
      <button
        type="submit"
        className="rounded-full bg-[var(--viz-series-1)] px-5 py-2 font-medium text-white"
      >
        Get Wrapped
      </button>
    </form>
  );
}
