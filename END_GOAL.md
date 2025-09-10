# wiws — Landing Page + Walk-In Workflow Dashboard (Zero-Cost Plan)

## Problem Statement
- build a landing page for wiws
- build a system / dashboard where
    - imagine an office co-working space (a CA office).
    - the customer walks in for consultancy service (end-user we are servicing as a firm)
    - here's the typical manual workflow that happens (this involves manual labour):
        1. the customer walks in and tells the name/phone number of himself/herself.
        2. the receptionist notes it down manually
        3. the receiving end (the Personal Assistant sitting inside the firm office) approves the entry from the reception desk and informs the consultant for the same
        4. the receptionist receives the confirmation and tells the end-customer (the user that walked-in) to go inside the cabin and talk with the actual consultant (CA in our case)
    - our end goal for this specialized dashboard is to:
        - make the job easier for the employer that sits inside the cabin (CA in our case)
        - reduce manual labour as much as possible
        - create an awesome looking website for the client to use

## Solution

Below is a practical, end-to-end plan to design, build, and deploy a new landing site and a specialized check-in/approval dashboard for wiws’ CA office on **Jail Road, New Delhi (Ashok Nagar / Tilak Nagar area)**. Address references confirm location and brand presence. ([wiws.com][1], [India][2])

---

## 1) Goals & Non-Goals

**Goals**

* Beautiful, fast marketing site (modern stack, not WordPress).
* “Reception → PA → Consultant” check-in flow with minimal manual work.
* Zero hosting cost; use free tiers only.
* Works great on a tablet at reception; also accessible from staff desktops/phones.
* Privacy-first and audit-friendly logs.

**Non-Goals**

* Paid SMS/WhatsApp automation (can be added later; this plan keeps it 100% free).
* Complex ERP; we’re solving visitor intake/queue and basic client data capture first.

---

## 2) High-Level Architecture (Free-First)

```
[Reception Tablet/PC]  [PA Desktop]  [Consultant Desktop]
        │                    │                 │
        └────────── Web App (Vite.js on Cloudflare Pages, PWA) ──────────┐
                                                                         │
                                          API (Cloudflare Workers)  ─────┤
                                                                         │
                                      Database (Cloudflare D1 - SQLite)  │
                                                                         │
                                      Realtime-lite (Server-Sent Events) │
                                                                         │
                           Assets/exports (Cloudflare R2 — optional)     │
                                                                         │
                                   Web Analytics (Cloudflare Analytics)  │
```

**Why this stack?**
Cloudflare Pages + Workers + D1 + Analytics all have **generous free tiers** and run in one ecosystem, minimizing DevOps. No servers, no bills.

---

## 3) Tech Stack (All Free)

* **Frontend**: Vite.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Framer Motion (subtle polish), React Hook Form + Zod.
* **Hosting (static + functions)**: **Cloudflare Pages** (free).
* **API Runtime**: **Cloudflare Workers** (free).
* **Database**: **Cloudflare D1 (SQLite)** (free; ideal for modest traffic).
* **Auth**: **Better-Auth** (auth library) with **Email-link** (magic link) via **Resend Free Tier** or **Postmark Sandbox** for dev. (You can also start with passwordless “invite only” to avoid email volume.)
* **Realtime updates**: **Server-Sent Events** (SSE) from Workers (free; simpler than WebSockets).
* **File Storage (optional)**: **Cloudflare R2** (free egress within CF; keep usage small).
* **Analytics**: **Cloudflare Web Analytics** (free, privacy-friendly).
* **Forms & Validation**: Zod + React Hook Form (free).
* **Design System**: shadcn/ui components (free).
* **Issue Tracking/Docs**: GitHub (free).
* **Maps**: Use a static Google Map embed to **Jail Road, Ashok Nagar** address (no API key) or OpenStreetMap iframe. ([wiws.com][1])

> All of the above can be run without paid usage if traffic is reasonable. (If you expect sustained heavy traffic, we can swap D1 → Neon Postgres free tier later.)

---

## 4) User Roles & Minimal Permissions

* **Receptionist**: Create walk-in record, view queue, see approvals, mark “sent to cabin”.
* **PA (Personal Assistant)**: Approve/deny entries, set consultant, add notes, change status.
* **Consultant**: View assigned clients, mark “in session”, “completed”, and add post-meeting notes.
* **Admin**: Manage staff, see full audit logs, download daily CSV, edit services.

---

## 5) Core Workflow (As-Is → To-Be)

**Today (manual):**

1. Client states name/phone → Reception writes it down.
2. PA approves and informs consultant.
3. Reception sends client to cabin.

**Proposed (digital):**

1. **Reception** types client name/phone + selects **Service** (dropdown) → **Create token**.
2. **PA dashboard** shows new token at the top via **SSE** → clicks **Approve** and assigns a **Consultant** (optional ETA).
3. **Reception view** auto-updates; when approved, it shows **“Proceed to Cabin #X”**.
4. **Consultant view** lists their queue; they mark **In-Session** / **Completed**; optional **post-meeting summary** for records.
5. **Admin** can see **daily summary** and **export CSV**.

No SMS costs: we rely on **instant dashboards**. We should also probably setup communication via sockets or server sent events for real-time communication. Optional **email/push** later (FCM web push is free) if staff want notifications.

---

## 6) Data Model (D1 SQLite)

```sql
-- Users & Auth
table users (
  id text primary key,                 -- uuid
  email text unique not null,
  name text,
  role text check(role in ('reception','pa','consultant','admin')) not null,
  created_at text default current_timestamp
);

-- Services catalog (configurable)
table services (
  id integer primary key autoincrement,
  name text not null,                  -- e.g., "ITR Filing", "GST Registration"
  est_minutes integer default 15,
  is_active integer default 1
);

-- Walk-in record (token)
table visits (
  id integer primary key autoincrement,
  token text not null,                 -- short human token: e.g., B-105
  name text not null,
  phone text not null,
  service_id integer references services(id),
  status text check(status in ('new','approved','denied','in_session','completed','cancelled')) default 'new',
  assigned_consultant_id text references users(id),
  pa_id text references users(id),     -- who approved
  reception_id text references users(id),
  notes text,
  created_at text default current_timestamp,
  updated_at text
);

-- Audit log
table audit (
  id integer primary key autoincrement,
  entity text,                         -- 'visit'
  entity_id integer,
  action text,                         -- 'create','approve','assign','start','complete','deny','cancel'
  user_id text references users(id),
  payload text,                        -- JSON
  created_at text default current_timestamp
);
```

**Token format**: Prefix “B-” + daily counter (e.g., `B-001`) reset at midnight. Simple to generate in Workers with a `COUNTER` row or using D1 transaction.

---

## 7) API Endpoints (Cloudflare Workers)

* `POST /api/auth/login` — email link (if enabled) or invite code.
* `GET /api/services` — list active services.
* `POST /api/visits` — create visit (reception).
* `GET /api/visits?status=new|approved|...&assigned_to=consultantId` — filter queues.
* `POST /api/visits/:id/approve` — (PA) approve + assign consultant.
* `POST /api/visits/:id/deny` — (PA).
* `POST /api/visits/:id/start` — (Consultant) in session.
* `POST /api/visits/:id/complete` — (Consultant) wrap up.
* `GET /api/visits/export?date=YYYY-MM-DD` — (Admin) CSV.
* `GET /api/stream` — **SSE** stream of visit events (room filtered by role).

**Realtime**: Reception/PA/Consultant dashboards connect to `/api/stream` and receive events like `{type:'visit_created', visit}`, `{type:'visit_updated', ...}` to update UI instantly.

---

## 8) Frontend Apps (Same Repo)

### 8.1 Landing Page (wiws.com replacement)

* **Sections**: Hero (CTA “Book a Consultation” / “Walk-In Welcome”), Services grid, Why wiws (trust + experience), Team snippet, Location (embedded map to Ashok Nagar, Jail Road), Contact form.
* **Performance**: Static generation, image optimization, `<link rel="preconnect">` where useful.
* **Map**: Google Maps iframe to **28/2, Ashok Nagar, Jail Road, New Delhi 110018**, or OSM. ([wiws.com][1])
* **SEO**: Title, meta description, OpenGraph, sitemap, robots, JSON-LD (LocalBusiness + PostalAddress).
* **Branding**: Use provided logo asset and set favicon. (SVG optimize the provided PNG if needed.)

### 8.2 Backoffice (same domain under `/app`)

* **Login screen** (protected routes).
* **Reception View** (big buttons; touch-friendly):

  * Form: Name, Phone, Service (dropdown), Optional Notes → **Create Token**.
  * Live “Your Queue” list with statuses & ETA.
  * **Kiosk Mode**: Full-screen PWA; disable zoom; on-screen numpad for phone input.
* **PA View**:

  * **Review queue** (status = `new`), quick approve/deny, assign consultant (autocomplete).
  * Batch actions (approve & assign).
  * Notes field & canned reasons.
* **Consultant View**:

  * Shows only assigned visits.
  * Actions: **Start**, **Complete**, **Add short summary**.
* **Admin View**:

  * Services CRUD, Staff management (invite link), Daily/Weekly stats, CSV export, Audit timeline.

---

## 9) UI/UX Standards

* **Components**: shadcn/ui (Cards, Tables with sticky header, Badges for status, Dialogs).
* **Accessibility**: proper labels, focus states, keyboard navigation.
* **Animations**: micro-transitions (Framer Motion) under 150ms for feedback.
* **Themes**: light/dark (system default), wiws accent color from logo.
* **Error States**: clear toasts + retry; offline notice for PWA.

---

## 10) Security & Privacy

* **Auth**: role-based gates server-side; signed cookies; HTTP-only; CSRF not needed for same-site POST with cookies; otherwise use CSRF token.
* **Validation**: Zod on client & server.
* **Audit**: Every state change writes to `audit` with actor + payload.
* **PII**: Only name/phone; encrypt at rest optionally (D1 + crypto subtle API) or store phone masked (last 4); at minimum, use hashing for search indices if needed.
* **Backups**: Nightly D1 export (Workers cron trigger) to R2 (free).

---

## 11) DevOps & Deployment (All Free)

* **Repo**: GitHub → connect to **Cloudflare Pages** project.
* **Monorepo**: `/web` (Vite.js), `/worker` (Hono for Workers), `/infra` (wrangler.toml, migrations).
* **Migrations**: `wrangler d1 migrations apply`.
* **Environments**: preview deployments per PR, production on `main`.
* **Cron Triggers** (Workers): midnight counter reset, daily CSV email (optional via Resend free).

---

## 12) PWA Kiosk Mode (Reception Tablet)

* Add PWA manifest + service worker for offline shell.
* Auto-launch full screen, hide browser UI (tablet kiosk settings).
* Large tap targets, on-screen keypad for mobile ergonomics.
* Network fallback screen (store last successful submission; queue retries).

---

## 13) No-Cost Notifications (Optional, Later)

* **Web Push**: Firebase Cloud Messaging (FCM) free for **browser push** to PA/Consultant machines (Chrome/Edge); send push via Workers using VAPID/FCM.
* **Email**: staff summaries via **Resend** free monthly allotment (keep volume tiny).
* **In-app toasts**: instant via SSE; sufficient for same-office workflow.

---

## 14) Sample Status Machine

`new → approved → in_session → completed`
`new → denied`
`approved → cancelled` (edge case)

Each transition writes to `audit`. UI enforces legal transitions.

---

## 15) Acceptance Criteria

* Reception can create a visit in ≤10s; token appears on PA screen ≤1s later (SSE).
* PA can approve and assign consultant in ≤2 clicks.
* Consultant sees only their queue; can set **In-Session** and finish with a short note.
* Admin can export CSV for any day and see full audit trail.
* Landing page loads **Largest Contentful Paint < 2.5s** on 3G (Lighthouse 90+).
* Entire system deploys and runs on **Cloudflare free tier**.

---

## 16) Implementation Phases & Deliverables

### Phase 0 — Project Setup (Day 0)

* Cloudflare account + Pages & Workers + D1 database.
* Repo scaffolding, CI/CD, env secrets.
* DB migrations for `users`, `services`, `visits`, `audit`.

### Phase 1 — Landing Page (Marketing) - Completed

* Vite.js static site with sections, optimized images, contact form (stores to D1).
* Map embed to **Ashok Nagar, Jail Road** address; contact info and CTAs. ([wiws.com][1])

### Phase 2 — Auth & Roles

* [Better-Auth](https://www.better-auth.com/docs/installation) https://www.better-auth.com/docs/basic-usage + invite-only login for staff (email link or temporary codes).
* Role-based routing.

### Phase 3 — Core Workflow MVP

* Reception: create visit + token generation.
* PA: approve/deny + assign consultant.
* SSE stream for instant updates.
* Consultant: view assigned, in-session, complete.

### Phase 4 — Admin, Export, Audit

* Services CRUD, staff management.
* CSV export (per day); audit viewer.

### Phase 5 — PWA & Kiosk Polish

* Installable app, offline notice, big-button UI.
* Dark mode; branding.

### Phase 6 — Optional Enhancements

* Web Push to PA/Consultant.
* Simple appointment scheduling (pre-booked slots).
* Visitor receipt PDF (served from Workers; stored to R2).

---

## 17) Free Service Configuration Notes

* **Cloudflare Pages**: connect GitHub; framework preset = vite.js; set `NODE_VERSION`; build = `pnpm build`.
* **Workers (wrangler)**: set routes `/api/*`; bind D1 database to `env.DB`.
* **D1**: create DB, apply migrations; use prepared statements to avoid injection.
* **Resend (optional)**: domain verification (or use dev/test mode).
* **Web Analytics**: add CF beacon script to pages.

---

## 18) Content & Copy (Quick Drafts)

* **Hero**: “Tax, Compliance & Advisory—Done Right. Walk-In Welcome at Ashok Nagar (Jail Road), New Delhi.”
* **CTA**: “Book a Consultation” (simple form) + “View Services”.
* **Services**: ITR Filing, GST Registration, Compliance & Litigation, Trademark Advisory, Business MIS/Automation. (Reflects wiws sites’ positioning.) ([wiws.net.in][3], [wiws.in][4], [wiws.com][5])
* **Trust**: Years of practice, audit logs, transparent process.
* **Location**: Address and timings.

---

## 19) Rough UI Wireframe (Text)

* **Reception**
  `[ New Visit ]`
  Name | Phone | Service ▼ | \[Create Token]
  Queue (New/Approved → bold status chips)

* **PA**
  Tabs: **New (N)** | Approved | All
  Row: Token • Name • Phone • Service • \[Assign ▼] \[Approve] \[Deny]

* **Consultant**
  “Your Queue”
  Row: Token • Name • Service • \[Start] → moves to **In-Session** → \[Complete] + notes modal

* **Admin**
  Cards: Today’s Visits, Avg Wait, In-Session, Completed
  Tables: Services | Staff
  Actions: \[Export CSV] \[View Audit]

---

## 20) Risks & Mitigations

* **Traffic spikes**: D1 limits → shard by day, index wisely, add caching on list endpoints.
* **Tablet quirks**: Test on iPad/Android; provide on-screen keypad; prevent zoom.
* **Email deliverability**: keep invite-only staff; limit transactional email; mostly in-app notices.

---

## 21) Handover Package

* Source code (Closed Source).
* `README` with one-click deploy guides (Pages/Workers/D1).
* DB migration SQL + seed data (services, initial users).
* Brand tokens (colors/typography), favicon, and logo assets wired in.

---

## 22) References (for context)

* wiws current site & **address** (Ashok Nagar, Jail Road, New Delhi 110018). ([wiws.com][1])
* wiws Consulting pages and **services** positioning. ([wiws.com][5], [wiws.net.in][3], [wiws.in][4])
* External mentions of organization and **location** on Jail Road / Tilak Nagar area. ([India][2])

---

## 23) Next Steps (Actionable)

1. **Confirm roles & staff list** (names/emails; who is PA vs consultant).
2. **Approve initial services list** (ITR, GST, Trademarks, etc.).
3. **Create Cloudflare account** (share access) and we’ll provision Pages/Workers/D1.
4. **Ship Phase 1–3** in small PRs; demo from preview URLs; iterate.
5. **Go live** by updating DNS of **wiws.com** to Cloudflare Pages.

If you want, I can also draft the **exact database migrations, initial API handler stubs (Workers/Hono), and the Reception form component** so you can paste and deploy immediately.

[1]: https://wiws.com/?utm_source=chatgpt.com "wiws Tax Advisors – Providing accounting and compliance ..."
[2]: https://bni-india.in/en-IN/memberdetails?encryptedMemberId=YoWCMf0izCR4cKXKDcpDDQ%3D%3D&name=Deepjot+Kaur&utm_source=chatgpt.com "Deepjot Kaur | Member Detail | English (IN)"
[3]: https://www.wiws.net.in/?utm_source=chatgpt.com "wiws Business Solutions"
[4]: https://wiws.in/our-services/?utm_source=chatgpt.com "Our Services"
[5]: https://wiws.com/about-our-company/?utm_source=chatgpt.com "About Our Company"
