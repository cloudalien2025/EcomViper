export type SignalSourceCategory = "Core" | "Recommended" | "Optional";
export type SignalSourceStatus = "connected" | "disconnected" | "locked";

export type SignalSource = {
  id: string;
  name: string;
  category: SignalSourceCategory;
  status: SignalSourceStatus;
  description: string;
  actionLabel: string;
  actionHref?: string;
  disabledReason?: string;
};

export const ecomviperSignalSources: SignalSource[] = [
  {
    id: "shopify",
    name: "Shopify OAuth",
    category: "Core",
    status: "locked",
    description: "Primary commerce catalog source for agent-facing product entities.",
    actionLabel: "Connect Shopify (OAuth)",
    actionHref: "/ecomviper/settings/integrations",
  },
  {
    id: "openai",
    name: "OpenAI API (BYO)",
    category: "Core",
    status: "disconnected",
    description: "Model credentials for selection reasoning and blueprint generation.",
    actionLabel: "Configure",
    actionHref: "/ecomviper/settings/apis?connector=openai",
  },
  {
    id: "ga4",
    name: "GA4",
    category: "Recommended",
    status: "disconnected",
    description: "Behavior analytics for feedback-driven product selection.",
    actionLabel: "Configure",
    actionHref: "/ecomviper/settings/apis?connector=ga4",
  },
  {
    id: "serpapi",
    name: "SerpAPI",
    category: "Recommended",
    status: "disconnected",
    description: "Visibility and competitor context for selection confidence.",
    actionLabel: "Configure",
    actionHref: "/ecomviper/settings/apis?connector=serpapi",
  },
];
