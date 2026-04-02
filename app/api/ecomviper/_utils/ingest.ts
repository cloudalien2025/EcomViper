export async function runEcomIngest(): Promise<{ ok: boolean }> {
  return { ok: true };
}

export async function runFullShopifyIngest(_input: {
  userId: string;
  integrationId: string;
}): Promise<{ status: "succeeded" | "failed"; errorMessage?: string }> {
  return { status: "succeeded" };
}
