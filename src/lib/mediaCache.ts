import { prisma } from "@/lib/prisma";

// Normalizes a lookup key the same way regardless of how callers capitalize
// or space artist/album/track names, since Last.fm is forgiving about case
// but our cache key must be exact.
export function cacheKey(...parts: string[]): string {
  return parts.map((p) => p.trim().toLowerCase()).join("|||");
}

export async function getCached<T>(kind: string, key: string): Promise<T | null> {
  const row = await prisma.mediaCache.findUnique({ where: { kind_key: { kind, key } } });
  return row ? (row.data as T) : null;
}

export async function setCached(kind: string, key: string, data: unknown): Promise<void> {
  await prisma.mediaCache.upsert({
    where: { kind_key: { kind, key } },
    create: { kind, key, data: data as object },
    update: { data: data as object },
  });
}
