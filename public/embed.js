/**
 * Stackwell Booking Widget — embed.js
 * 
 * Drop this on any client site:
 * <script src="https://booking.stackwell.digital/embed.js" data-shop-url="https://CLIENT.stackwell.digital"></script>
 *
 * Optional attributes:
 *   data-label="Book Now"          — button text (default: "Book Now")
 *   data-color="#000000"           — button background color (default: #111111)
 *   data-position="bottom-right"   — bottom-right | bottom-left (default: bottom-right)
 */

;(function () {
  'use strict'

  // ── Config from script tag ──────────────────────────────────────────────
  const script = document.currentScript
  const shopUrl = (script.getAttribute('data-shop-url') || '').replace(/\/$/, '')
  const label = script.getAttribute('data-label') || 'Book Now'
  const color = script.getAttribute('data-color') || '#111111'
  const position = script.getAttribute('data-position') || 'bottom-right'

  if (!shopUrl) {
    console.warn('[Stackwell] Missing data-shop-url attribute on embed script.')
    return
  }

  // ── Styles ────────────────────────────────────────────────────────────
  const css = `
    #sw-booking-btn {
      position: fixed;
      ${position === 'bottom-left' ? 'left: 24px;' : 'right: 24px;'}
      bottom: 24px;
      z-index: 2147483640;
      background: ${color};
      color: #fff;
      border: none;
      border-radius: 999px;
      padding: 14px 24px;
      font-size: 15px;
      font-weight: 600;
      font-family: system-ui, -apple-system, sans-serif;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      line-height: 1;
    }
    #sw-booking-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 28px rgba(0,0,0,0.3);
    }
    #sw-booking-btn:active {
      transform: translateY(0);
    }

    #sw-booking-overlay {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 2147483641;
      background: rgba(0,0,0,0.55);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      align-items: center;
      justify-content: center;
      padding: 16px;
      box-sizing: border-box;
    }
    #sw-booking-overlay.sw-open {
      display: flex;
    }

    #sw-booking-modal {
      position: relative;
      width: 100%;
      max-width: 480px;
      height: 90vh;
      max-height: 760px;
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 24px 80px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
    }

    #sw-booking-close {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 10;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: none;
      background: rgba(0,0,0,0.08);
      color: #333;
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
    }
    #sw-booking-close:hover {
      background: rgba(0,0,0,0.15);
    }

    #sw-booking-iframe {
      width: 100%;
      flex: 1;
      border: none;
      display: block;
    }

    @media (max-width: 520px) {
      #sw-booking-overlay {
        padding: 0;
        align-items: flex-end;
      }
      #sw-booking-modal {
        max-width: 100%;
        width: 100%;
        height: 92vh;
        border-radius: 16px 16px 0 0;
        max-height: none;
      }
    }
  `

  // ── Inject styles ──────────────────────────────────────────────────────
  const styleEl = document.createElement('style')
  styleEl.textContent = css
  document.head.appendChild(styleEl)

  // ── Build DOM ──────────────────────────────────────────────────────────

  // Floating button
  const btn = document.createElement('button')
  btn.id = 'sw-booking-btn'
  btn.textContent = label
  btn.setAttribute('aria-label', label)

  // Overlay
  const overlay = document.createElement('div')
  overlay.id = 'sw-booking-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-modal', 'true')
  overlay.setAttribute('aria-label', 'Booking widget')

  // Modal
  const modal = document.createElement('div')
  modal.id = 'sw-booking-modal'

  // Close button
  const closeBtn = document.createElement('button')
  closeBtn.id = 'sw-booking-close'
  closeBtn.setAttribute('aria-label', 'Close booking')
  closeBtn.innerHTML = '&times;'

  // iframe — only set src when first opened (lazy load)
  const iframe = document.createElement('iframe')
  iframe.id = 'sw-booking-iframe'
  iframe.setAttribute('title', 'Booking')
  iframe.setAttribute('allowtransparency', 'true')
  // Allow payment iframes if Stripe gets added later
  iframe.setAttribute('allow', 'payment')

  modal.appendChild(closeBtn)
  modal.appendChild(iframe)
  overlay.appendChild(modal)

  document.body.appendChild(btn)
  document.body.appendChild(overlay)

  // ── State ─────────────────────────────────────────────────────────────
  let iframeLoaded = false

  function open() {
    // Lazy-load iframe on first open
    if (!iframeLoaded) {
      iframe.src = shopUrl
      iframeLoaded = true
    }
    overlay.classList.add('sw-open')
    document.body.style.overflow = 'hidden'
    closeBtn.focus()
  }

  function close() {
    overlay.classList.remove('sw-open')
    document.body.style.overflow = ''
    btn.focus()
  }

  // ── Events ────────────────────────────────────────────────────────────
  btn.addEventListener('click', open)
  closeBtn.addEventListener('click', close)

  // Click backdrop to close
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) close()
  })

  // ESC to close
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('sw-open')) close()
  })

  // Listen for postMessage from iframe (e.g. booking confirmed → auto-close)
  window.addEventListener('message', function (e) {
    if (e.origin !== shopUrl) return
    if (e.data === 'sw:booking-confirmed') {
      // Give the success screen 2s to show before closing
      setTimeout(close, 2000)
    }
    if (e.data === 'sw:close') {
      close()
    }
  })

})()
