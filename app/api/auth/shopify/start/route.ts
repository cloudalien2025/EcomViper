export const runtime = "nodejs";

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/app/api/ecomviper/_utils/db";
import { ensureUser, resolveUserId } from "@/app/api/ecomviper/_utils/user";
import { normalizeShopDomain } from "@/app/api/ecomviper/_utils/shopify";

export async function GET(req: NextRequest) {
  try {
    const userId = resolveUserId(req);
    await ensureUser(userId);

    const clientId = process.env.SHOPIFY_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: "SHOPIFY_CLIENT_ID is not configured" }, { status: 500 });
    }

    const appBaseUrl = process.env.APP_BASE_URL ?? "http://127.0.0.1:3001";
    const shopDomain = normalizeShopDomain(req.nextUrl.searchParams.get("shop") ?? "");
    if (!shopDomain.endsWith(".myshopify.com")) {
      return NextResponse.json({ error: "shop must be a myshopify.com domain" }, { status: 400 });
    }

    const state = crypto.randomBytes(18).toString("hex");
    await query(
      `
      INSERT INTO oauth_states (user_id, provider, shop_domain, state, expires_at)
      VALUES ($1, 'shopify', $2, $3, now() + interval '10 minutes')
      `,
      [userId, shopDomain, state]
    );

    const redirectUri = `${appBaseUrl}/api/auth/shopify/callback`;
    const authUrl = new URL(`https://${shopDomain}/admin/oauth/authorize`);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("scope", "read_products,read_content");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);

    const dryRun = req.nextUrl.searchParams.get("dry_run") === "1";
    if (dryRun) {
      return NextResponse.json({ ok: true, redirect_to: authUrl.toString() });
    }

    return NextResponse.redirect(authUrl, { status: 302 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start Shopify OAuth";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
