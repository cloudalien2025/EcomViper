export const BYO_PROVIDERS = ["openai", "ga4", "serpapi"] as const;

export type ByoProvider = (typeof BYO_PROVIDERS)[number];

export type ByoKeyStatus = {
  provider: ByoProvider;
  label: string | null;
  connected: boolean;
  masked_key: string;
  updated_at: string | null;
};

export type ByoKeyRecord = {
  provider: string;
  label: string | null;
  key_last4: string | null;
  key_length: number | null;
  updated_at: string;
};

export type ByoKeySaveInput = {
  provider: ByoProvider;
  apiKey: string;
  label?: string | null;
};

export function isByoProvider(value: string): value is ByoProvider {
  return (BYO_PROVIDERS as readonly string[]).includes(value);
}

export function maskSecretWithMetadata(last4: string | null, keyLength: number | null): string {
  if (!keyLength || keyLength <= 0) return "Saved";
  const hiddenCount = Math.max(0, keyLength - 4);
  const hidden = "*".repeat(Math.min(hiddenCount, 12));
  if (!last4) return hidden || "Saved";
  return `${hidden}${last4}`;
}

export function toByoStatusMap(rows: ByoKeyRecord[]): Record<ByoProvider, ByoKeyStatus> {
  const rowByProvider = new Map(rows.map((row) => [row.provider, row]));

  return BYO_PROVIDERS.reduce<Record<ByoProvider, ByoKeyStatus>>((acc, provider) => {
    const row = rowByProvider.get(provider);
    acc[provider] = {
      provider,
      label: row?.label ?? null,
      connected: Boolean(row),
      masked_key: row ? maskSecretWithMetadata(row.key_last4 ?? null, row.key_length ?? null) : "",
      updated_at: row?.updated_at ?? null,
    };
    return acc;
  }, {} as Record<ByoProvider, ByoKeyStatus>);
}

export function buildByoSavePayload(input: ByoKeySaveInput): {
  provider: ByoProvider;
  keyLast4: string;
  keyLength: number;
  label: string | null;
} {
  const key = input.apiKey.trim();
  const keyLast4 = key.slice(-4);

  return {
    provider: input.provider,
    keyLast4,
    keyLength: key.length,
    label: input.label?.trim() || null,
  };
}
