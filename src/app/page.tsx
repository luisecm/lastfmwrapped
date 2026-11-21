import { UsernameForm } from "@/components/UsernameForm";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-bold text-[var(--viz-text-primary)]">Last.fm Wrapped</h1>
      <p className="max-w-md text-[var(--viz-text-secondary)]">
        See this year&apos;s listening stats so far, from Jan 1 to today — then export them as shareable
        Instagram Story cards.
      </p>
      <UsernameForm />
      <p className="text-xs text-[var(--viz-text-muted)]">
        Works with any public Last.fm profile — no login required.
      </p>
    </main>
  );
}
