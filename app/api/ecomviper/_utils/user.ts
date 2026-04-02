import type { NextRequest } from "next/server";
import crypto from "crypto";
import { query } from "./db";

const DEFAULT_USER_ID = "00000000-0000-4000-8000-000000000001";

function normalizeUuid(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  const valid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
    trimmed
  );
  return valid ? trimmed : null;
}

function deriveDeterministicUuid(input: string): string {
  const hash = crypto.createHash("sha256").update(input.trim().toLowerCase()).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

type HeaderReader = {
  get(name: string): string | null;
};

export function resolveUserIdFromHeaders(headers: HeaderReader): string {
  const fromHeader = normalizeUuid(headers.get("x-user-id"));
  if (fromHeader) return fromHeader;

  const externalIdRaw =
    headers.get("x-user-id") ??
    headers.get("x-user-email") ??
    headers.get("x-forwarded-email") ??
    headers.get("cf-access-authenticated-user-email");

  if (externalIdRaw && externalIdRaw.trim().length > 0) {
    return deriveDeterministicUuid(externalIdRaw);
  }

  return DEFAULT_USER_ID;
}

export function resolveUserId(req?: NextRequest): string {
  if (!req) return DEFAULT_USER_ID;
  const fromHeader = normalizeUuid(req.headers.get("x-user-id"));
  if (fromHeader) return fromHeader;
  const fromSearch = normalizeUuid(req.nextUrl.searchParams.get("user_id"));
  if (fromSearch) return fromSearch;

  const externalIdRaw =
    req.headers.get("x-user-id") ??
    req.headers.get("x-user-email") ??
    req.headers.get("x-forwarded-email") ??
    req.headers.get("cf-access-authenticated-user-email");

  if (externalIdRaw && externalIdRaw.trim().length > 0) {
    return deriveDeterministicUuid(externalIdRaw);
  }

  return DEFAULT_USER_ID;
}

export async function ensureUser(userId: string): Promise<void> {
  await query(
    `
    INSERT INTO users (id, external_id, email)
    VALUES ($1, $2, $3)
    ON CONFLICT (id) DO NOTHING
    `,
    [userId, `local:${userId}`, null]
  );
}
