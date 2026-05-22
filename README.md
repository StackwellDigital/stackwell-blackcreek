# Stackwell Booking Widget

Native booking system for Stackwell clients. No Acuity, no Calendly.
Built on Next.js 15 + Cloudflare Pages + D1.

---

## Stack

- **Frontend:** Next.js 15 (App Router, edge runtime)
- **Hosting:** Cloudflare Pages
- **API:** Cloudflare Workers via Next.js API routes
- **Database:** Cloudflare D1 (SQLite)
- **Email:** Resend (confirmation + .ics attachment)
- **SMS:** Twilio (optional, ~$0.0075/text CA)

---

## First-time setup

### 1. Install deps & login to Cloudflare
```bash
npm install
wrangler login
```

### 2. Create D1 database
```bash
npm run db:create
```
Copy the `database_id` from output → paste into `wrangler.toml`.

### 3. Run migration (creates tables + seeds data)
```bash
npm run db:migrate:remote
```

### 4. Set secrets
```bash
wrangler secret put ADMIN_PASSWORD
wrangler secret put RESEND_API_KEY
```

Optional SMS:
```bash
wrangler secret put TWILIO_SID
wrangler secret put TWILIO_TOKEN
wrangler secret put TWILIO_FROM
```

### 5. Configure vars
Edit `wrangler.toml` `[vars]` section:
```toml
SHOP_NAME = "Your Shop Name"
RESEND_FROM = "bookings@yourdomain.com"
SLOT_INTERVAL = "30"
BOOKING_WINDOW_DAYS = "14"
MULTI_STAFF = "false"
```

Copy `.env.local.example` → `.env.local` and update values.

### 6. Deploy
```bash
npm run deploy
```

### 7. Add custom domain
Cloudflare Pages dashboard → your project → Custom domains.

---

## Local dev
```bash
npm run dev
```
Note: D1 bindings require `wrangler pages dev` for full local testing:
```bash
npm run preview
```

---

## Config flags

| Flag | Default | Effect |
|---|---|---|
| `MULTI_STAFF` | `false` | Shows staff picker step in booking flow |
| `SLOT_INTERVAL` | `30` | Minutes between available slots |
| `BOOKING_WINDOW_DAYS` | `14` | How far ahead customers can book |

---

## Admin

Access at `/admin` — password protected via middleware + httpOnly cookie.
Session lasts 7 days.

Tabs: Today · Calendar · Customers · Block time · Walk-in

---

## Per-client deployment

Each client = their own Cloudflare Pages project + D1 database.
Update `SHOP_NAME`, `MULTI_STAFF`, and accent color per client.

Embed target (next feature):
```html
<script src="https://booking.stackwell.digital/embed.js"
        data-shop="client-slug">
</script>
```
