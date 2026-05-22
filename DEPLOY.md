# embed.js — Deployment & Usage

## Where to host it

`embed.js` lives in the `public/` folder of a dedicated Cloudflare Pages project.
Deploy it to: `booking.stackwell.digital`

So the script URL becomes:
  https://booking.stackwell.digital/embed.js

You can also host it in the same project as the widget under `public/embed.js`
and serve it from the same domain — either works.

---

## Client site snippet

Paste this before </body> on any client site:

```html
<script
  src="https://booking.stackwell.digital/embed.js"
  data-shop-url="https://their-shop.stackwell.digital"
></script>
```

That's it. A floating "Book Now" button appears bottom-right.

---

## Optional attributes

| Attribute | Default | Description |
|---|---|---|
| data-shop-url | required | The client's booking widget URL |
| data-label | "Book Now" | Button text |
| data-color | "#111111" | Button background color (any CSS color) |
| data-position | "bottom-right" | bottom-right or bottom-left |

Examples:

```html
<!-- Custom color + label -->
<script
  src="https://booking.stackwell.digital/embed.js"
  data-shop-url="https://fade-kings.stackwell.digital"
  data-label="Book a Cut"
  data-color="#b45309"
  data-position="bottom-left"
></script>
```

---

## Deploy steps

1. Put embed.js in public/ of your Stackwell Pages project (or its own project)
2. Deploy: `npm run deploy` or push to CF Pages via git
3. Set custom domain `booking.stackwell.digital` in CF Pages dashboard
4. Done — give clients the snippet above with their data-shop-url filled in

---

## postMessage events (iframe → parent)

The booking widget can signal the embed modal to close:

- `sw:booking-confirmed` — sent after successful booking (modal closes after 2s)
- `sw:close` — sent for manual close (e.g. "Done" button on success screen)

See src/app/embed-notify.ts for the code to add to page.tsx.

---

## How it works

1. Script injects a floating button + hidden modal overlay into client's DOM
2. Button click → modal opens, iframe lazy-loads the booking widget URL
3. iframe is fully isolated — no CSS conflicts with client site
4. ESC key, backdrop click, or close button dismisses the modal
5. postMessage from iframe auto-closes on booking confirmation
6. Mobile: modal slides up from bottom (sheet style)
