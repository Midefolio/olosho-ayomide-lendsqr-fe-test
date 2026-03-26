# Lendsqr Admin Console — Frontend Engineering Assessment

A pixel-faithful implementation of the Lendsqr Admin Console built as part of the Lendsqr Frontend Engineering Assessment.

**Live Demo:** `https://olosho-ayomide-lendsqr-fe-test.vercel.app`

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| UI Framework | React 18 | Assessment requirement |
| Language | TypeScript | Assessment requirement |
| Styles | SCSS Modules | Assessment requirement |
| Build Tool | Vite | Faster dev server & smaller bundles than CRA |
| State | Redux Toolkit | Shared users table survives back-navigation; TTL-based cache invalidation |
| Persistence | Dexie.js (IndexedDB) | Admin profile cached locally; serves instantly on reload |
| HTTP | Axios via `makeRequest` wrapper | Centralised error handling, offline guard, auth injection |
| Animation | Framer Motion | Page transitions, skeleton-to-content, sidebar, confirm dialogs |
| Testing | Vitest + React Testing Library | Fast unit tests, jsdom environment |
| Router | React Router v6 | `createBrowserRouter`, `PrivateRoute` / `PublicRoute` guards |

---

## Pages

| Route | Page | Access |
|---|---|---|
| `/` | Login | Public only (redirects to dashboard if already logged in) |
| `/admin/customers/users` | Users Dashboard | Private |
| `/admin/customers/user/:userId` | User Details | Private |
| `*` | 404 Not Found | Public |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Installation

```bash
# Clone the repo
git clone https://github.com/[your-username]/lendsqr-fe-test.git
cd lendsqr-fe-test

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build

```bash
npm run build       # Production build
npm run preview     # Preview the production build locally
```

### Tests

```bash
npm run test        # Run all tests
npm run test:ui     # Open the Vitest UI
npm run coverage    # Generate coverage report
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=https://olosho-ayomide-lendsqr-mock-api.onrender.com
```

The app reads `auth_token` directly from `localStorage` at runtime — no token env variable is needed on the frontend.

---

## Project Structure

```
src/
├── apis.ts                         # API endpoint constants
├── component/
│   └── admin/
│       ├── adminLayout.tsx        # Shared navbar + collapsible sidebar
│       └── LendsqrIcons.tsx       # All SVG icon components
├── context/
│   ├── userContext.tsx            # Boot-time admin profile loader (IndexedDB → Redux)
│   └── usersPageContext.tsx       # All data/fetch/filter/action logic for Users page
├── pages/
│   ├── authPages/
│   │   └── loginPage.tsx
│   └── dashboardPages/customerPages/users/
│       ├── usersPage.tsx
│       └── userDetailsPage.tsx
├── states/
│   ├── adminUserSlice.ts          # Redux slice — logged-in admin profile
│   ├── tableDataSlice.ts          # Redux slice — users table + cache TTL
│   └── index.ts                   # Store configuration
├── styles/                        # SCSS Modules (one file per page/component)
├── utils/
│   ├── fetcher.ts                 # makeRequest — Axios wrapper with error normalisation
│   └── dexieDB.ts                 # IndexedDB schema via Dexie
├── __tests__/                     # Vitest test suites
│   ├── adminLayout.test.tsx
│   ├── LoginPage.test.tsx
│   ├── UserDetailsPage.test.tsx
│   ├── UsersPage.test.tsx
│   └── fetcher.test.ts
├── App.tsx                        # Router setup + PrivateRoute / PublicRoute guards
└── main.tsx
```

---

## Mock Backend

Rather than using a third-party mock service, I built and deployed a custom Express backend:

**Base URL:** `https://olosho-ayomide-lendsqr-mock-api.onrender.com`

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/v1/admin/auth/login` | POST | No | Authenticate; returns JWT token + user object |
| `/api/v1/admin/auth/user` | GET | Bearer | Fetch the authenticated admin's profile |
| `/api/v1/admin/data/users` | GET | Bearer | Paginated list of 500 users with stats |
| `/api/v1/admin/data/user` | POST | Bearer | Fetch a single user by ID |

> **Note:** The backend runs on Render's free tier and may cold-start on first request (expect ~30 s delay after a period of inactivity).

---

## Key Implementation Notes

### Authentication & Data Flow

1. On login, the API returns `{ token, user }`. The token is stored in `localStorage` and the user object is written to both Redux and IndexedDB.
2. On every subsequent app load, `UserContextProvider` reads the cached profile from IndexedDB and dispatches it to Redux immediately (zero loading flash), then silently re-fetches in the background and refreshes the cache.
3. `PrivateRoute` checks `localStorage` for `auth_token` — no token means redirect to `/`.
4. `PublicRoute` does the inverse — a valid token redirects straight to the dashboard.

### Caching Strategy

The users table uses Redux with a 5-minute TTL (`CACHE_TTL_MS`). If valid cached data exists and the TTL has not expired, `fetchTable` returns early without making an API call. This means navigating back from User Details to the Users list is instant.

### makeRequest

All HTTP calls go through a single `makeRequest` utility that handles:
- Offline guard (`navigator.onLine` check before any Axios call)
- Auth header injection
- Content-type serialisation (`json` / `urlencoded` / `multipart`)
- `GET` → `params`, everything else → `data`
- Error normalisation (network errors, 401, JWT expiry, 429, 403, generic server errors)
- A `finally` callback (`cb`) that always fires — used to reset loading state

### Mobile Sidebar

The Figma design shows a persistent sidebar on all screen sizes. On mobile, a persistent sidebar pushes all page content off-screen. I replaced it with a slide-in drawer with a backdrop overlay — this is standard mobile UX and matches how the real Lendsqr admin console behaves.

---

## Testing

Five test suites with positive and negative scenarios:

| Suite | What's covered |
|---|---|
| `AdminLayout.test.tsx` | Rendering, sidebar toggle, collapse groups, active-link highlighting, logout modal (open / stay / confirm / IndexedDB delete / stopPropagation / null-user fallback) |
| `LoginPage.test.tsx` | Rendering, input interaction, password visibility toggle, validation errors, successful login (token, IndexedDB, Redux, success message), failed login, loading state |
| `UserDetailsPage.test.tsx` | Loading skeleton, full profile render, General Details tab, tier/stars, tab navigation, Blacklist/Activate PATCH, disabled-during-action, error states (offline + server), retry, back navigation, em-dash fallback |
| `UsersPage.test.tsx` | Loading state, table rows, stats cards, server error state, pagination limit select, action menu (open, per-status options, single-open enforcement) |
| `fetcher.test.ts` | Offline guard, GET/POST success, auth header, body serialisation (JSON/urlencoded/multipart/FormData), network error, 401 + localStorage clear, 429, 403, generic errors (error field / message field / fallback), non-Axios error, `cb` always fires |

Framer Motion is mocked to strip animation props before they reach the DOM. SCSS Modules are proxied so class lookups return a string. Dexie and `makeRequest` are mocked at the module level.

---

## Design Decisions

### Why Redux over Context for users table data?
The users list is fetched once but accessed from two separate route trees (Users page and User Details page). Context re-provides on every mount; Redux survives unmount/remount with zero refetch as long as the TTL is valid.

### Why Dexie.js over raw IndexedDB?
The raw IndexedDB API is callback-heavy and error-prone. Dexie wraps it in a clean promise-based API and handles schema versioning — a one-line `db.cached_data.get(key)` call instead of 15 lines of boilerplate.

### Why a noop instead of null for the makeRequest callback?
Passing `null` as `cb` and calling `cb?.()` works at runtime, but tests using `expect.any(Function)` would fail because `null` is not a function. A no-op `() => {}` satisfies both the runtime optional-call pattern and the test assertion without adding any complexity.

---

## What Would Be Added With More Time

- Full implementation of the five remaining User Details tabs (Documents, Bank Details, Loans, Savings, App and System)
- Debounced search in the navbar
- Toast notifications for action success/failure (currently only error toasts via `notifyError`)
- Expand the commented-out UsersPage filter and confirm-dialog test suites
- Database persistence in the mock backend so status changes survive Render cold starts

---

## Submission

- **Live App:** `https://olosho-ayomide-lendsqr-fe-test.vercel.app`
- **Repository:** `https://github.com/midefolio/lendsqr-fe-test`
- **Documentation:** [Google Doc / Notion link]
- **Video Walkthrough:** [Loom link — max 3 minutes]# olosho-ayomide-lendsqr-fe-test
