# Black Creek Barber — Deploy Checklist

## 1. Create D1 database
```bash
wrangler d1 create stackwell-blackcreek
```
Copy the `database_id` from the output → paste into `wrangler.toml`

---

## 2. Run migrations
```bash
wrangler d1 execute stackwell-blackcreek --remote --file=migrations/001_init.sql
wrangler d1 execute stackwell-blackcreek --remote --file=migrations/002_gcal.sql
wrangler d1 execute stackwell-blackcreek --remote --file=migrations/003_seed_blackcreek.sql
```

---

## 3. Set secrets
```bash
wrangler secret put ADMIN_PASSWORD
# → enter a password for the admin dashboard

wrangler secret put RESEND_API_KEY
# → paste your Resend API key

# Optional — only if using GCal:
wrangler secret put GCAL_CREDENTIALS
# → paste the entire service account JSON as one line
```

---

## 4. Update config files
- `wrangler.toml` — confirm database_id is filled in, add SHOP_PHONE if you have it
- `.env.local` — update NEXT_PUBLIC_BASE_URL if domain is different

---

## 5. Build & deploy
```bash
npm install
npm run deploy
```

---

## 6. Custom domain (optional for demo)
- CF Pages dashboard → Custom domains → Add `blackcreek.stackwell.digital`
- Add CNAME in your DNS: `blackcreek` → `stackwell-blackcreek.pages.dev`

---

## 7. Verify
- [ ] Visit `https://stackwell-blackcreek.pages.dev` — booking flow loads
- [ ] Pick a service, date, time, fill contact info, confirm
- [ ] Check confirmation email arrives
- [ ] Visit `/admin` → login with ADMIN_PASSWORD
- [ ] Services tab shows all 13 services
- [ ] Availability tab shows Tue–Sat 9–5
- [ ] Today tab shows the test booking

---

## 8. Send her the demo
Once deployed, send her:
- **Booking URL:** https://stackwell-blackcreek.pages.dev (or custom domain)
- **Admin URL:** https://stackwell-blackcreek.pages.dev/admin
- **Admin password:** (whatever you set)
- Note: prices are placeholders — she can update them in the Services tab

---

## Troubleshooting common issues

**Blank page / 500 error**
→ Check `wrangler tail` for Worker errors
→ Most common cause: database_id wrong or migrations not run

**No time slots showing**
→ Availability not seeded — re-run 003_seed.sql
→ Check SLOT_INTERVAL and BOOKING_WINDOW_DAYS vars are set

**Email not sending**
→ Verify RESEND_API_KEY secret is set
→ Check Resend dashboard for delivery errors
→ Make sure RESEND_FROM domain is verified in Resend

**Admin login not working**
→ Re-run: `wrangler secret put ADMIN_PASSWORD`
→ Clear cookies and try again

**D1 binding error**
→ `wrangler.toml` binding name must be "DB" — matches `getDB(env)` in db.ts
