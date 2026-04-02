import { aiSelectionCopy } from "@/lib/copy/aiSelectionCopy";

export const brainIds = ["ecomviper"] as const;

export type BrainId = (typeof brainIds)[number];

export type BrainCatalogEntry = {
  id: BrainId;
  name: string;
  shortDescription: string;
  tags: string[];
  primaryCtaText: string;
  upsellTitle: string;
  upsellMessage: string;
  iconKey: "zap";
};

export const brainCatalog: BrainCatalogEntry[] = [
  {
    id: "ecomviper",
    name: "EcomViper",
    shortDescription:
      "AI Product Selection Engine for agent readiness, evidence density, and mention optimization.",
    tags: ["Product Entities", "Agent Readiness", "Selection Lab"],
    primaryCtaText: "Open",
    upsellTitle: "Unlock EcomViper",
    upsellMessage:
      "Get Shopify ingestion controls and reasoning hubs to improve product-topic authority.",
    iconKey: "zap",
  },
];

export const brainsDockCopy = aiSelectionCopy.brainsDock;

export const brainCatalogById: Record<BrainId, BrainCatalogEntry> = {
  ecomviper: brainCatalog[0],
};

export function isBrainId(value: string): value is BrainId {
  return (brainIds as readonly string[]).includes(value);
}

export function brainRoute(id: BrainId): `/${BrainId}` {
  return `/${id}`;
}
