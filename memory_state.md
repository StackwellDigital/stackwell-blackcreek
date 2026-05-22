# memory_state.md
> Current project state. Update frequently as decisions are made and work progresses.

Last updated: 2026-05-21

---

## Active Project: Stackwell Booking Widget

### What it is
A native booking system built for Stackwell clients — no Acuity, no Calendly, no third-party dependency.
Designed to be embedded into client sites as a productized upsell.

### Current Client
Barbershop — single barber, solo operator.
First real deployment. Used to validate the product before marketing it wider.

---

## Architecture Decisions (locked in)

| Decision | Choice | Reason |
|---|---|---|
| Hosting | Cloudflare Pages | Better economics for multi-client SaaS vs Vercel |
| API | Cloudflare Workers (via Next.js edge runtime) | Faster cold starts, same CF ecosystem |
| Database | Cloudflare D1 (SQLite) | Free tier, same dashboard, no Supabase dependency |
| Email | Resend | Already set up, clean API |
| SMS | Twilio (optional) | ~$0.0075/text CA, off by default |
| Auth (admin) | Simple password via middleware + httpOnly cookie | Fastest path to shipped |
| Framework | Next.js 15 + `@cloudflare/next-on-pages` adapter | |
| Multi-staff | Data model supports it, UI defaults to solo mode | Config flag `MULTI_STAFF=true` to enable per client |

---

## Database Schema (D1)

Four tables: `services`, `staff`, `availability`, `blocked_times`, `bookings`

Key design choices:
- Prices stored in **cents** (integers)
- `booking_date` as `TEXT` "YYYY-MM-DD", `booking_time` as `TEXT` "HH:MM"
- `service_name` / `service_price` / `service_duration` denormalized onto bookings for historical accuracy
- `blocked_times` supports both one-off dates and recurring weekly blocks
- Bookings status enum: `confirmed | completed | cancelled | no-show`

---

## File Structure (generated)

```
stackwell-booking/
├── migrations/001_init.sql        # full schema + seed data
├── wrangler.toml                  # CF config, vars, D1 binding
├── next.config.ts                 # edge runtime config
├── package.json                   # includes pages:build + deploy scripts
├── src/
│   ├── middleware.ts              # admin route protection
│   ├── lib/
│   │   ├── db.ts                  # D1 client, types, slot gen utils
│   │   └── email.ts              # Resend + ICS generation + Twilio SMS
│   └── app/
│       ├── page.tsx               # customer booking flow (5 steps)
│       ├── admin/
│       │   ├── page.tsx           # admin dashboard
│       │   └── login/page.tsx     # password login page
│       └── api/
│           ├── services/route.ts
│           ├── availability/route.ts   # slot generation with conflict detection
│           ├── bookings/route.ts       # POST create booking
│           ├── bookings/[id]/route.ts  # PATCH status, GET single
│           └── admin/
│               ├── route.ts            # GET bookings/stats/customers/blocks, POST block/walkin
│               └── login/route.ts      # POST set cookie, DELETE logout
```

---

## Customer Flow (5 steps)

1. Service selection (cards with price + duration)
2. *(Staff picker — hidden for solo, enabled via MULTI_STAFF flag)*
3. Date picker → time slot grid (real availability from DB)
4. Contact info form (name, phone, email, returning checkbox)
5. Review summary → Confirm
6. Success screen + email/SMS confirmation sent

Race condition guard: slot conflict check on POST before insert → returns 409 if taken.

---

## Admin Dashboard Features

- **Today tab** — stat cards (total, confirmed, completed, revenue) + booking list with mark complete / no-show buttons
- **Calendar tab** — week grid view
- **Customers tab** — grouped by email, visit count, total spent, last visit
- **Block time tab** — one-off or recurring weekly blocks, stored in `blocked_times`
- **Walk-in tab** — manual booking entry (no email required)

Access: `/admin` — redirects to `/admin/login` if not authenticated.
Session: httpOnly cookie `admin_session`, 7-day TTL.

---

## Emails (Resend)

- Customer confirmation: HTML email with appointment summary, "Add to calendar" button, .ics attachment, cancel/reschedule link
- ICS file: generated server-side, attached to email
- Cancel URL format: `/cancel?id={booking_id}&email={encoded_email}`
- Admin notification email on each new booking (optional, same Resend key)

---

## Config / Env Vars

**Secrets (via `wrangler secret put`):**
- `ADMIN_PASSWORD`
- `RESEND_API_KEY`
- Optional: `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM`

**Vars in wrangler.toml:**
- `SHOP_NAME`
- `RESEND_FROM`
- `SLOT_INTERVAL` (default 30 min)
- `BOOKING_WINDOW_DAYS` (default 14)
- `MULTI_STAFF` (default "false")

**Client-side (.env.local):**
- `NEXT_PUBLIC_SHOP_NAME`
- `NEXT_PUBLIC_MULTI_STAFF`
- `NEXT_PUBLIC_BOOKING_WINDOW_DAYS`

---

## Deploy Steps (documented)

1. `wrangler login`
2. `npm run db:create` → paste `database_id` into `wrangler.toml`
3. `npm run db:migrate:remote`
4. `wrangler secret put` for each secret
5. Update `[vars]` in wrangler.toml + `.env.local`
6. `npm install && npm run deploy`
7. Add custom domain in CF Pages dashboard

---

## Next Up (not built yet)

- [ ] **Embed script** — `embed.js` that mounts the widget into any existing site via `<script>` tag + `data-shop` attribute. This is the productization layer — turns it into something Adam can sell/list on Stackwell.Digital.
- [ ] Cancel / reschedule page (`/cancel`)
- [ ] Services management UI in admin (add/edit/toggle services without touching DB directly)
- [ ] Availability management UI (edit hours without SQL)
- [ ] Multi-staff UI (enable via config, staff picker step in booking flow)
- [ ] Stripe integration for deposits or prepayment (future)
- [ ] Monthly stats / revenue reporting tab in admin

---

## Productization Notes

- Each client gets their own Cloudflare Pages project + D1 database
- Config per client: `SHOP_NAME`, `MULTI_STAFF`, `SLOT_INTERVAL`, accent color
- Embed story: `<script src="booking.stackwell.digital/embed.js" data-shop="client-slug">`
- Pricing model TBD — monthly SaaS fee per client is the obvious play
