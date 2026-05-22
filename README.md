# Stackwell Shop

A generic e-commerce platform for Stackwell Digital clients. Replaces Shopify. Supports physical products, print-on-demand (Printful), and digital downloads — all in one storefront.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS + Shadcn/ui |
| Database | Cloudflare D1 (SQLite at the edge) |
| File Storage | Cloudflare R2 |
| Hosting | Cloudflare Pages |
| Payments | Stripe |
| POD Fulfillment | Printful API |
| Email | Resend |

## Product Types

- **Physical** — client ships themselves, admin manages fulfillment manually
- **Printful** — print-on-demand, auto-submitted to Printful after payment
- **Digital** — files stored in R2, secure download tokens emailed after payment

## Project Structure

```
stackwell-shop/
├── app/
│   ├── api/                    # API routes (edge runtime)
│   │   ├── products/           # Product catalog endpoints
│   │   ├── cart/               # Shipping rate calculation
│   │   ├── checkout/           # Payment intent + order confirm
│   │   ├── orders/             # Order status tracking
│   │   ├── downloads/          # Secure digital download handler
│   │   ├── admin/              # Admin endpoints (auth required)
│   │   └── webhooks/           # Stripe + Printful webhooks
│   ├── products/               # Storefront product pages
│   ├── cart/                   # Cart page
│   ├── checkout/               # Checkout flow
│   ├── track/                  # Order tracking
│   └── admin/                  # Admin dashboard
├── components/
│   ├── ui/                     # Shadcn base components
│   ├── store/                  # Customer-facing components
│   └── admin/                  # Admin-specific components
├── lib/
│   ├── db/                     # D1 query helpers
│   ├── fulfillment/            # Fulfillment provider abstraction
│   │   └── providers/          # printful.ts, physical.ts, digital.ts
│   ├── payments/               # Stripe helpers
│   └── email/                  # Resend email templates
├── types/
│   └── index.ts                # All TypeScript types
├── schema.sql                  # D1 database schema
└── wrangler.toml               # Cloudflare config
```

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Create Cloudflare resources
```bash
# Create D1 database
wrangler d1 create stackwell-shop-db
# Copy the database_id into wrangler.toml

# Create R2 bucket
wrangler r2 bucket create stackwell-shop-assets
```

### 3. Run database migrations
```bash
# Local dev
npm run db:migrate:local

# Production
npm run db:migrate
```

### 4. Set up environment variables
```bash
cp .env.example .env.local
# Fill in your keys
```

### 5. Run dev server
```bash
npm run dev
# or for Cloudflare-specific dev:
npm run pages:dev
```

### 6. Deploy
```bash
npm run pages:deploy
```

## Environment Variables

See `.env.example`. Cloudflare bindings (DB, ASSETS) are configured in `wrangler.toml` — don't put those in `.env`.

## Business Model

- Clients pay Stackwell $50–75/mo add-on on top of base hosting
- Client keeps 100% of product profit
- Stackwell doesn't take transaction fees
- Saves clients $54 CAD/mo vs Shopify

## Roadmap

### Phase 1 — Core Storefront
- [ ] Product catalog page
- [ ] Product detail page
- [ ] Shopping cart (localStorage)
- [ ] Printful product sync

### Phase 2 — Checkout
- [ ] Checkout form + address validation
- [ ] Shipping rate calculation
- [ ] Tax calculation (Canadian provinces)
- [ ] Stripe payment flow
- [ ] Order confirmation page + email

### Phase 3 — Fulfillment
- [ ] Printful order submission
- [ ] Digital download token generation
- [ ] Manual fulfillment queue (physical)
- [ ] Printful webhooks (shipped/failed)
- [ ] Stripe webhooks

### Phase 4 — Admin Dashboard
- [ ] Auth
- [ ] Product management (all three types)
- [ ] Order management
- [ ] Analytics

### Phase 5 — Polish
- [ ] Mobile responsive
- [ ] Error handling + loading states
- [ ] SEO
- [ ] Multi-client theming
