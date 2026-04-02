export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { encryptSecret } from "@/app/api/ecomviper/_utils/crypto";
import { query } from "@/app/api/ecomviper/_utils/db";
import { scheduleSnapshotRefresh } from "@/app/api/ecomviper/_utils/snapshots";
import {
  exchangeCodeForAccessToken,
  normalizeShopDomain,
  verifyShopifyCallbackHmac,
} from "@/app/api/ecomviper/_utils/shopify";

interface OAuthStateRow {
  id: string;
  user_id: string;
  shop_domain: string;
  state: string;
  expires_at: string;
  used_at: string | null;
}

export async function GET(req: NextRequest) {
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://127.0.0.1:3001";
  const redirect = new URL("/ecomviper", appBaseUrl);

  try {
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      redirect.searchParams.set("error", "shopify_env_missing");
      return NextResponse.redirect(redirect, { status: 302 });
    }

    const search = req.nextUrl.searchParams;
    const shopDomain = normalizeShopDomain(search.get("shop") ?? "");
    const code = search.get("code");
    const state = search.get("state");

    if (!code || !state) {
      redirect.searchParams.set("error", "missing_code_or_state");
      return NextResponse.redirect(redirect, { status: 302 });
    }

    if (!verifyShopifyCallbackHmac(search, clientSecret)) {
      redirect.searchParams.set("error", "invalid_hmac");
      return NextResponse.redirect(redirect, { status: 302 });
    }

    const stateRows = await query<OAuthStateRow>(
      `
      SELECT id, user_id, shop_domain, state, expires_at, used_at
      FROM oauth_states
      WHERE provider = 'shopify' AND state = $1
      LIMIT 1
      `,
      [state]
    );

    const stateRow = stateRows[0];
    if (!stateRow) {
      redirect.searchParams.set("error", "state_not_found");
      return NextResponse.redirect(redirect, { status: 302 });
    }

    if (stateRow.shop_domain !== shopDomain) {
      redirect.searchParams.set("error", "shop_mismatch");
      return NextResponse.redirect(redirect, { status: 302 });
    }

    if (stateRow.used_at) {
      redirect.searchParams.set("error", "state_already_used");
      return NextResponse.redirect(redirect, { status: 302 });
    }

    if (Date.parse(stateRow.expires_at) < Date.now()) {
      redirect.searchParams.set("error", "state_expired");
      return NextResponse.redirect(redirect, { status: 302 });
    }

    const tokenResult = await exchangeCodeForAccessToken({
      shopDomain,
      code,
      clientId,
      clientSecret,
    });

    const encryptedToken = encryptSecret(tokenResult.access_token, `${stateRow.user_id}:shopify`);

    await query(
      `
      INSERT INTO integrations (
        user_id, provider, shop_domain, access_token_ciphertext, scopes, status, installed_at, last_verified_at
      )
      VALUES ($1, 'shopify', $2, $3, $4, 'connected', now(), now())
      ON CONFLICT (user_id, provider, shop_domain)
      DO UPDATE SET
        access_token_ciphertext = EXCLUDED.access_token_ciphertext,
        scopes = EXCLUDED.scopes,
        status = 'connected',
        last_verified_at = now(),
        updated_at = now()
      `,
      [stateRow.user_id, shopDomain, encryptedToken, tokenResult.scope]
    );

    await query(`UPDATE oauth_states SET used_at = now() WHERE id = $1`, [stateRow.id]);
    await scheduleSnapshotRefresh({ userId: stateRow.user_id, brainId: "ecomviper", runIngest: true });

    redirect.searchParams.set("connected", "1");
    redirect.searchParams.set("shop", shopDomain);
    return NextResponse.redirect(redirect, { status: 302 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "callback_error";
    redirect.searchParams.set("error", message.slice(0, 120));
    return NextResponse.redirect(redirect, { status: 302 });
  }
}
