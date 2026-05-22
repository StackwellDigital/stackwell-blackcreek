// ─── ADD TO src/app/page.tsx ──────────────────────────────────────────────
//
// On the booking SUCCESS screen, fire this to auto-close the embed modal.
// Call it right after you set the success state / show the confirmation screen.
//
// Detects if running inside an iframe (embedded mode) and sends the signal.
// No-ops if the widget is loaded standalone (direct URL visit).

export function notifyBookingConfirmed() {
  try {
    if (window.self !== window.top) {
      window.parent.postMessage('sw:booking-confirmed', '*')
    }
  } catch (_) {
    // Cross-origin check can throw — safe to ignore
  }
}

// Usage — in your success screen useEffect or confirm handler:
//
// import { notifyBookingConfirmed } from '@/lib/embed'   // or inline it
//
// // After booking POST succeeds and you show the success screen:
// notifyBookingConfirmed()
//
// The modal will stay open for 2 seconds so the customer sees the
// confirmation, then auto-closes. They're back on the client's site.


// ─── OPTIONAL: Add a close button to your success screen ─────────────────
//
// If you want a manual "Done" button that also closes the modal:
//
// function closeEmbed() {
//   try {
//     if (window.self !== window.top) {
//       window.parent.postMessage('sw:close', '*')
//     }
//   } catch (_) {}
// }
//
// <button onClick={closeEmbed}>Done</button>
