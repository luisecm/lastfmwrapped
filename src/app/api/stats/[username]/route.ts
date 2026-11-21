import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureJob, step, stepEnrich, toJobView, UserNotFoundError } from "@/lib/statsJob";

const usernameSchema = z
  .string()
  .trim()
  .min(2)
  .max(15)
  .regex(/^[a-zA-Z0-9_-]+$/, "Last.fm usernames only contain letters, numbers, underscores and hyphens");

const bodySchema = z.object({ force: z.boolean().optional() }).optional();

// Best-effort, single-instance-only throttle: not durable across serverless
// instances or restarts, but cheap insurance against one client hammering
// this endpoint. Swap for a shared store (e.g. Upstash Redis) if this needs
// to hold up under real multi-instance load.
const recentRequests = new Map<string, number>();
const MIN_INTERVAL_MS = 1000;

function throttled(key: string): boolean {
  const last = recentRequests.get(key);
  const now = Date.now();
  if (last && now - last < MIN_INTERVAL_MS) return true;
  recentRequests.set(key, now);
  return false;
}

export async function POST(request: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username: rawUsername } = await params;
  const parsedUsername = usernameSchema.safeParse(rawUsername);
  if (!parsedUsername.success) {
    return NextResponse.json({ error: parsedUsername.error.issues[0].message }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "local";
  if (throttled(`${ip}:${parsedUsername.data}`)) {
    return NextResponse.json({ error: "Too many requests, slow down." }, { status: 429 });
  }

  let force = false;
  try {
    const rawBody = await request.text();
    if (rawBody) {
      const parsedBody = bodySchema.safeParse(JSON.parse(rawBody));
      force = parsedBody.success ? Boolean(parsedBody.data?.force) : false;
    }
  } catch {
    // Ignore malformed bodies; default to force = false.
  }

  const year = new Date().getUTCFullYear();

  try {
    let job = await ensureJob(parsedUsername.data, year, force);
    if (job.status === "pending" || job.status === "processing") {
      job = await step(job);
    } else if (job.status === "done") {
      job = await stepEnrich(job);
    }
    return NextResponse.json(toJobView(job));
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      return NextResponse.json({ error: "Last.fm user not found (or their profile is private)." }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong talking to Last.fm." }, { status: 502 });
  }
}
