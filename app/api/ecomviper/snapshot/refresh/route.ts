export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { scheduleSnapshotRefresh } from "@/app/api/ecomviper/_utils/snapshots";
import { ensureUser, resolveUserId } from "@/app/api/ecomviper/_utils/user";

export async function POST(req: NextRequest) {
  try {
    const userId = resolveUserId(req);
    await ensureUser(userId);

    const result = await scheduleSnapshotRefresh({ userId, brainId: "ecomviper", runIngest: true });
    return NextResponse.json({ status: result.status === "locked" ? "updating" : result.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown refresh error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
