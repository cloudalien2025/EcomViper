export async function exchangeShopifyCode(): Promise<{ ok: boolean }> {
  return { ok: true };
}

export async function getShopifyShop(): Promise<{ shop: string }> {
  return { shop: "mock-shop" };
}

export function normalizeShopDomain(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!normalized) return "mock-shop.myshopify.com";
  return normalized.includes(".") ? normalized : `${normalized}.myshopify.com`;
}

export function verifyShopifyCallbackHmac(
  _search: URLSearchParams,
  _clientSecret: string
): boolean {
  return true;
}

export async function exchangeCodeForAccessToken(_input: {
  shopDomain: string;
  code: string;
  clientId: string;
  clientSecret: string;
}): Promise<{ access_token: string; scope: string }> {
  return {
    access_token: "mock-access-token",
    scope: "read_products,write_products",
  };
}
