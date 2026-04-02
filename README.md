# EcomViper

EcomViper is a standalone Next.js application for operating product-selection workflows, signal-source configuration, and Shopify-connected snapshot views.

## Who It Is For
- Developers contributing to EcomViper features and maintenance
- Operators configuring integrations and reviewing product-selection snapshots

## High-Level Capabilities
- EcomViper dashboard and product-selection pages
- API routes for snapshot refresh and BYO credentials
- Shopify OAuth start/callback scaffolding and ingest trigger routes
- Basic entitlement gating and UI flows for settings/help pages

## Local Development
### Prerequisites
- Node.js 20+
- npm 10+

### Install
```bash
npm install
```

### Run
```bash
npm run dev
```

### Build
```bash
npm run build
```

## Validation Commands
```bash
npm run lint
npm run typecheck
npm run build
```

## Environment Variables
Create a local `.env.local` file and provide placeholder-based values:

```bash
DATABASE_URL="postgres://<user>:<password>@<host>:<port>/<db>"
INTEGRATIONS_ENCRYPTION_KEY="<32-byte-base64-or-hex-key>"
SHOPIFY_CLIENT_ID="<shopify-client-id>"
SHOPIFY_CLIENT_SECRET="<shopify-client-secret>"
APP_BASE_URL="http://localhost:3000"
ECOMVIPER_ENTITLED_BRAINS_DEFAULT="<comma-separated-brain-ids>"
```

Some integrations and API flows require external service accounts and provider-side configuration.

## Repository Structure
- `app/` Next.js app routes and API handlers
- `components/` UI components used by EcomViper pages
- `lib/` shared domain logic, copy, and helper utilities

## Security
- Never commit `.env*` files, credentials, tokens, or private keys.
- Use placeholder/example values in docs and sample configs only.
