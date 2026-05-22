// ─── ADMIN DASHBOARD INTEGRATION ─────────────────────────────────────────
// src/app/admin/page.tsx — add Services and Availability tabs
//
// 1. Import the two new components at the top of your admin page:

import AdminServicesTab from '@/components/AdminServicesTab'
import AdminAvailabilityTab from '@/components/AdminAvailabilityTab'

// 2. Add 'services' and 'availability' to your tab list.
//    Your existing tab state probably looks something like:
//
//    const [tab, setTab] = useState<'today' | 'calendar' | 'customers' | 'blocks' | 'walkin'>('today')
//
//    Update it to:

type Tab = 'today' | 'calendar' | 'customers' | 'blocks' | 'walkin' | 'services' | 'availability'
// const [tab, setTab] = useState<Tab>('today')

// 3. Add the tab buttons to your nav — wherever your existing tabs are rendered:
//
//    <button onClick={() => setTab('services')}   className={tab === 'services'   ? 'active' : ''}>Services</button>
//    <button onClick={() => setTab('availability')} className={tab === 'availability' ? 'active' : ''}>Hours</button>

// 4. Add the tab panels — wherever your existing tab content switch/if blocks are:
//
//    {tab === 'services'     && <AdminServicesTab />}
//    {tab === 'availability' && <AdminAvailabilityTab />}

// ─── That's it. No other changes needed. ──────────────────────────────────
//
// The components handle their own data fetching and state internally.
// They talk to:
//   GET/POST/PATCH/DELETE /api/admin/services
//   GET/POST              /api/admin/availability
//
// Both routes are protected by your existing middleware (admin_session cookie).
// Make sure your middleware.ts matcher includes these new paths:
//
//   export const config = {
//     matcher: ['/admin/:path*', '/api/admin/:path*'],
//   }
