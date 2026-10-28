# Barking Otter — Website Performance Analyzer

A production-ready, AI-assisted website speed and performance assessment platform for **Barking Otter** (`barkingotter.com`), built to combine real Google Lighthouse laboratory testing, Chrome UX Report (CrUX) 75th-percentile real-user field data, plain-English diagnostic translation, and commercial lead generation.

---

## 1. Architecture & Key Capabilities

### Application Routes
- `/` — Barking Otter homepage featuring the reusable URL submission widget, service overview, and consultation form.
- `/speed-test` — Dedicated public Website Performance Analyzer landing page.
- `/audit/[id]` — Shareable, personalized results dashboard (and live multi-stage progress view while an analysis is running).
- `/admin` — Internal operational dashboard (total audits, audits over time, unique domains, average mobile/desktop scores, score distribution, lead conversion rate, scan failures, API/AI usage).
- `/admin/audits` — Searchable, filterable historical website audits table with one-click rerun and report inspection.
- `/admin/leads` — Captured optimization leads table with status pipeline (`NEW`, `CONTACTED`, `QUALIFIED`, `PROPOSAL_SENT`, `CONVERTED`, `CLOSED`), associated audit score badges, and private internal notes.
- `/admin/settings` — Runtime configuration for rate limits, cache lifetime, report retention, AI interpretation mode/model, and internal notification recipients (never exposing API secrets).
- `/privacy` & `/terms` — Privacy Policy and Terms of Service.

### API Contract
| Endpoint | Method | Auth | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/audits` | `POST` | Public (Rate-limited) | Validate & normalize URL, check 24h cache, create audit record, and enqueue durable scan pipeline. |
| `/api/audits/[id]` | `GET` | Public | Return the normalized, public-safe performance report (never includes private lead data or internal notes). |
| `/api/audits/[id]/status` | `GET` | Public | Poll real-time scan stage (`QUEUED`, `ANALYZING_MOBILE`, `ANALYZING_DESKTOP`, `REVIEWING_METRICS`, `IDENTIFYING_OPPORTUNITIES`, `PREPARING_REPORT`, `COMPLETED`, `PARTIAL`, `FAILED`, `EXPIRED`). |
| `/api/audits/[id]/rerun` | `POST` | Public (Rate-limited) | Request a fresh uncached scan (with optional `allowHttp: true` retry when a legacy target does not support HTTPS). |
| `/api/audits/[id]/pdf` | `GET` | Public | Generate and download a branded Barking Otter PDF executive report from stored audit data. |
| `/api/leads` | `POST` | Public (Rate-limited) | Capture a prospect lead associated with an audit, trigger prospect confirmation email and internal Barking Otter alert. |
| `/api/reports/email` | `POST` | Public (Rate-limited) | Email a one-time report link to the user without subscribing them to marketing lists. |
| `/api/admin/auth` | `POST` / `DELETE` | Allowlist | Sign in / sign out of the internal admin console using an HMAC-signed HTTP-only session cookie. |
| `/api/admin/stats` | `GET` | Admin | Operational KPIs, score distributions, 7-day trend, and API/AI usage counts. |
| `/api/admin/audits` | `GET` | Admin | Paginated, filterable historical audits list. |
| `/api/admin/leads` | `GET` | Admin | Paginated, filterable leads list with associated audit summaries. |
| `/api/admin/leads/[id]` | `PATCH` | Admin | Update lead pipeline status and private internal notes. |
| `/api/admin/settings` | `GET` / `PATCH` | Admin | Read and update operational settings and inspect read-only credential presence flags. |

---

## 2. Local Installation & Database Setup

### Prerequisites
- Node.js `v20+` (tested on `v22`)
- PostgreSQL `14+` (tested on PostgreSQL `16`)

### Step-by-Step Setup
1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Copy `.env.example` to `.env` and update values for your environment:
   ```bash
   cp .env.example .env
   ```

3. **Run Prisma database migrations & generate client:**
   ```bash
   npx prisma migrate dev
   ```

4. **(Optional) Seed representative audits & leads for local review:**
   ```bash
   npm run db:seed
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` (or `http://localhost:3000/speed-test`).

---

## 3. Required API Credentials & Google Cloud Enablement

All credentials are configured via server-side environment variables (see `.env.example`):

| Variable | Description |
| :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string (`postgresql://user:pass@host:5432/dbname?schema=public`). |
| `GOOGLE_PAGESPEED_API_KEY` | Google Cloud API key with **PageSpeed Insights API** enabled. |
| `GOOGLE_CRUX_API_KEY` | Google Cloud API key with **Chrome UX Report API** enabled (can be the same key if restricted to both APIs). |
| `AI_API_KEY` | API key for OpenAI-compatible chat completions endpoint. When omitted, the deterministic interpretation engine runs automatically. |
| `AI_MODEL` | Model identifier (e.g., `gpt-4o-mini`). |
| `RESEND_API_KEY` | Resend transactional email API key for lead confirmations, internal alerts, and emailed report links. |
| `EMAIL_FROM` | Verified sender address in Resend (e.g., `Barking Otter <reports@barkingotter.com>`). |
| `NOTIFICATION_RECIPIENTS` | Comma-separated internal recipient emails for new lead alerts. |
| `ADMIN_EMAIL_ALLOWLIST` | Comma-separated allowlist of administrator emails permitted to sign in at `/admin`. |
| `ADMIN_ACCESS_TOKEN` | Optional shared administrator token for `/admin` login or `Authorization: Bearer` API requests. |
| `AUTH_SECRET` | 32+ character secret used to sign admin session cookies and salt rate-limit IP hashes. |
| `NEXT_PUBLIC_APP_URL` | Canonical public URL (e.g., `https://barkingotter.com`). |
| `NEXT_PUBLIC_GA4_ID` | Google Analytics 4 Measurement ID (`G-XXXXXXXXXX`). |
| `ALLOW_DEMO_FALLBACK` | Set to `false` in production. When `true` in local dev/preview without Google API keys, synthetic `.example` domains use deterministic Lighthouse/CrUX fixtures. |

### Enabling Google Cloud APIs
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **PageSpeed Insights API** (`pagespeedonline.googleapis.com`) and **Chrome UX Report API** (`chromeuxreport.googleapis.com`).
3. Create an API key under **APIs & Services → Credentials**, restrict it to those two APIs, and assign it to `GOOGLE_PAGESPEED_API_KEY` and `GOOGLE_CRUX_API_KEY`.

---

## 4. Running Automated Tests

- **TypeScript Typecheck:**
  ```bash
  npm run typecheck
  ```
- **Unit & Integration Tests (Vitest):**
  ```bash
  npm test
  ```
- **End-to-End Browser Tests (Playwright):**
  ```bash
  npm run test:e2e
  ```
- **Production Build Verification:**
  ```bash
  npm run build
  ```

---

## 5. Production Deployment (Vercel)

1. Push the repository to GitHub and import the project into Vercel.
2. Attach a managed PostgreSQL database (such as Vercel Postgres / Neon / Prisma Postgres) and set `DATABASE_URL`.
3. Add the environment variables from `.env.example` in the Vercel project settings (`ALLOW_DEMO_FALLBACK="false"` in production).
4. Set the build command to `npx prisma migrate deploy && npm run build`.

---

## 6. Operational Troubleshooting

- **Google API Rate Limits (HTTP 429):** Ensure `GOOGLE_PAGESPEED_API_KEY` is set; unauthenticated requests to PageSpeed Insights v5 are strictly throttled by Google. Increase `cacheLifetimeHours` in `/admin/settings` to reduce redundant scans.
- **Target Website Blocks Testing (HTTP 403 / WAF):** Some websites use Cloudflare Under-Attack mode or bot rules that block headless Lighthouse requests. The analyzer surfaces a clear `BLOCKED_BY_SITE` state without fabricating scores.
- **Missing CrUX Field Data:** The Chrome UX Report only includes pages/origins with sufficient real-user Chrome traffic. When page-level data is 404, the analyzer automatically attempts origin-level fallback (labeled explicitly as `Origin-Level Fallback Data`) or displays the transparent laboratory-only notice.
