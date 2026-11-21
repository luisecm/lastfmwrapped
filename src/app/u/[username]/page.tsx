import { Suspense } from "react";
import Link from "next/link";
import { WrappedView } from "@/components/WrappedView";

async function WrappedForUsername({ paramsPromise }: { paramsPromise: Promise<{ username: string }> }) {
  const { username } = await paramsPromise;
  return <WrappedView username={username} />;
}

export default function UserWrappedPage({ params }: { params: Promise<{ username: string }> }) {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/" className="text-sm text-[var(--viz-text-muted)]">
        ← Back
      </Link>
      <Suspense fallback={<div className="py-16 text-center text-[var(--viz-text-secondary)]">Loading…</div>}>
        <WrappedForUsername paramsPromise={params} />
      </Suspense>
    </main>
  );
}
