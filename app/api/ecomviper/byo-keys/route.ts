export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { encryptSecret } from "@/app/api/ecomviper/_utils/crypto";
import { query } from "@/app/api/ecomviper/_utils/db";
import { ensureUser, resolveUserId } from "@/app/api/ecomviper/_utils/user";
import {
  buildByoSavePayload,
  isByoProvider,
  type ByoProvider,
  type ByoKeyRecord,
  toByoStatusMap,
} from "@/lib/ecomviper/byoKeys";

interface KeyRow {
  id: string;
  provider: string;
  key_last4: string | null;
  key_length: number | null;
  label: string | null;
  updated_at: string;
}

export async function GET(req: NextRequest) {
  try {
    const userId = resolveUserId(req);
    await ensureUser(userId);

    const rows = await query<KeyRow & ByoKeyRecord>(
      `
      SELECT id, provider, key_last4, key_length, label, updated_at
      FROM byo_api_keys
      WHERE user_id = $1
      ORDER BY provider ASC
      `,
      [userId]
    );

    const providers = Object.values(toByoStatusMap(rows));

    return NextResponse.json({ providers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown BYO keys error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = resolveUserId(req);
    await ensureUser(userId);

    const body = (await req.json()) as { provider?: string; api_key?: string; label?: string | null };
    const provider = (body.provider ?? "").toLowerCase().trim() as ByoProvider;
    const apiKey = (body.api_key ?? "").trim();

    if (!isByoProvider(provider)) {
      return NextResponse.json({ error: "provider must be openai|ga4|serpapi" }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: "api_key is required" }, { status: 400 });
    }

    const savePayload = buildByoSavePayload({ provider, apiKey, label: body.label });
    const ciphertext = encryptSecret(apiKey, `${userId}:byo:${provider}`);

    await query(
      `
      INSERT INTO byo_api_keys (user_id, provider, key_ciphertext, key_last4, key_length, label, last_verified_at)
      VALUES ($1, $2, $3, $4, $5, $6, now())
      ON CONFLICT (user_id, provider)
      DO UPDATE SET
        key_ciphertext = EXCLUDED.key_ciphertext,
        key_last4 = EXCLUDED.key_last4,
        key_length = EXCLUDED.key_length,
        label = EXCLUDED.label,
        last_verified_at = now(),
        updated_at = now()
      `,
      [userId, provider, ciphertext, savePayload.keyLast4, savePayload.keyLength, savePayload.label]
    );

    return NextResponse.json({ ok: true, provider, connected: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown BYO key save error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = resolveUserId(req);
    await ensureUser(userId);

    const provider = (req.nextUrl.searchParams.get("provider") ?? "").toLowerCase().trim() as ByoProvider;
    if (!isByoProvider(provider)) {
      return NextResponse.json({ error: "provider must be openai|ga4|serpapi" }, { status: 400 });
    }

    await query(`DELETE FROM byo_api_keys WHERE user_id = $1 AND provider = $2`, [userId, provider]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown BYO key delete error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
