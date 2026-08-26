<p align="center">
  <img src="pathly.png" alt="Pathly logo" width="200" />
</p>

# Pathly

An open-source, enterprise-grade learning management system (LMS) — a modern alternative to platforms like itslearning, built for institutions that need scale, security, and flexibility.

## Overview

Pathly is designed for schools, universities, and larger organizations that need a robust learning platform with enterprise-level requirements: multi-tenancy, granular access control, integrations [...]

The project is fully open source — institutions and contributors can inspect, extend, and self-host the platform, or deploy it as a managed service.

**Project website:** [`website/`](./website) is a small static marketing page for the project, deployed to GitHub Pages at https://benjamin-blanke.github.io/pathly-lms/ via [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml) on every push to `main`.

## Features

- **Multi-Tenant Architecture** — isolated instances for multiple schools/organizations from a single deployment
- **Role-Based Access Control (RBAC)** — fine-grained permissions across students, teachers, admins, and institutional roles
- **Courses & Modules** — structured learning paths with lessons and Moodle-style link/file resources
- **Assignments & Submissions** — creation, distribution, and grading workflows
- **Timetable** — rooms, daily periods, and a weekly recurring schedule of course slots
- **Calendar** — org-wide, per-course, and personal events, with a read-only iCal subscription feed for Apple/Google/Outlook Calendar
- **Messages** — internal 1:1 and group conversations, scoped to an organization
- **Communication** — announcements per organization or course
- **Admin Panel** — organization settings, people/roles, and oversight for principals and IT staff
- **Superadmin Panel** — a small, fixed, database-managed allowlist with cross-organization visibility for platform operators
- **Integrations** — SSO (SAML/OIDC), SIS/institutional system connectors
- **Security & Compliance** — built with data protection and auditability in mind (e.g. GDPR-relevant data handling)

### Current implementation status

| Feature | Status |
| --- | --- |
| Multi-tenant orgs (create / join by code) | ✅ Implemented |
| RBAC (org roles: admin/teacher/student, course roles: teacher/student) | ✅ Implemented via Postgres RLS |
| Courses, modules, lessons, link/file resources | ✅ Implemented |
| Enrollment (self-enroll + roster management) | ✅ Implemented |
| Assignments, submissions, grading | ✅ Implemented |
| Announcements (org-wide and per-course) | ✅ Implemented |
| Timetable (rooms, periods, weekly schedule) | ✅ Implemented |
| Calendar (org/course/personal events) | ✅ Implemented |
| Calendar subscription (read-only iCal feed) | ✅ Implemented — see [Calendar & CalDAV](#calendar--caldav) below |
| Messaging (1:1 and group, org-scoped) | ✅ Implemented |
| Admin panel (org settings, people, oversight) | ✅ Implemented |
| Superadmin panel (cross-org, fixed allowlist) | ✅ Implemented |
| Full read/write CalDAV (WebDAV PROPFIND/REPORT/MKCALENDAR) | 🚧 Not implemented — see below |
| Discussion threads, notifications | 🚧 Not yet implemented |
| Native file uploads (Supabase Storage) | 🚧 Resources/submissions currently take a URL; direct upload not wired up |
| SSO (SAML/OIDC), SIS connectors | 🚧 Not yet implemented — Supabase Auth (email/password) ships today |
| Analytics dashboards | 🚧 Not yet implemented |

### Calendar & CalDAV

"Calendar with CalDAV" in practice means two different things: full read/write CalDAV is the WebDAV extension (`PROPFIND`/`REPORT`/`MKCALENDAR`) that lets a calendar app edit events on the server — a substantial protocol to implement correctly, and not what's here yet. What *is* implemented is **calendar subscription**: each user has a secret, rotatable token (`profiles.calendar_token`) behind `/calendar/feed/[token].ics`, which serves a standard iCalendar feed of everything they can see (org-wide, their enrolled courses, and their personal events). Apple Calendar, Google Calendar, and Outlook all support subscribing to a feed like this by URL — you'll see events update on a refresh interval, but edits still happen in Pathly. Full bidirectional CalDAV is tracked as future work.

## Architecture

- **Frontend:** Next.js 16 (App Router, Server Actions, Tailwind CSS v4)
- **Backend / Database:** Supabase (Postgres + Auth). Multi-tenancy and RBAC are enforced at the database layer with Row Level Security (RLS) policies, not just in application code.
- **Auth:** Supabase Auth (email/password today; SSO can be added via Supabase's SAML/OIDC providers)
- **Deployment:** Stateless Next.js app + a Supabase project per environment; suitable for containerized hosting. A single Next.js deployment can serve many tenants (organizations), each isolated by RLS.

### Data model

`organizations` (tenants) → `profiles` (org members with a role) → `courses` → `course_modules` → `lessons` / `course_resources`, plus `enrollments` (course-level role), `assignments` → `submissions` (grading fields live on the submission), `announcements` (org-wide or course-scoped), `rooms` / `periods` / `timetable_entries` (weekly schedule), `calendar_events` (org/course/personal), `conversations` / `conversation_participants` / `messages`, and `superadmins` (a fixed, database-managed allowlist — never editable through the app itself).

See [`supabase/migrations/`](./supabase/migrations) for the full schema and RLS policies, applied in filename order.

#### The superadmin allowlist

`superadmins` has no `INSERT` policy for the `authenticated` role by design — the only way onto it is direct database access (a migration, or the Supabase SQL editor). This repo's own migration seeds it for two specific accounts; if you fork or self-host Pathly, clear or replace that seed for your own deployment:

```sql
insert into public.superadmins (id, email)
select id, email from auth.users
where email in ('you@example.com')
on conflict (id) do nothing;
```

## Getting Started

### Deploying to a VPS

For a Debian/Ubuntu VPS, [`install.sh`](./install.sh) automates the whole setup — installs Node.js/PM2, clones the repo, prompts for your Supabase credentials, builds, and runs the app under PM2:

```bash
curl -fsSL https://raw.githubusercontent.com/benjamin-blanke/pathly-lms/main/install.sh -o install.sh
chmod +x install.sh
./install.sh
```

It doesn't touch nginx/certbot — point whatever reverse proxy you already run (Nginx Proxy Manager, Caddy, etc.) at the port it prints. It's also safe to re-run later: it pulls the latest `main`, reinstalls dependencies, rebuilds, and restarts the PM2 process — a one-line update.

### Local development

#### Prerequisites

- Node.js (v20+)
- A [Supabase](https://supabase.com) project (free tier works for local development)

#### Installation

```bash
git clone https://github.com/benjamin-blanke/pathly-lms.git
cd pathly-lms
npm install
```

#### Configure Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.local.example` to `.env.local` and fill in your project's URL, anon key, and service role key (Project Settings → API — the service role key is server-only, used solely by the calendar ICS feed, and must never be exposed to the client):

   ```bash
   cp .env.local.example .env.local
   ```

3. Apply the database schema. Using the [Supabase CLI](https://supabase.com/docs/guides/cli):

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

   Or paste the contents of each file in `supabase/migrations/` into the Supabase SQL editor, in filename order, and run them.

#### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up, then create a new organization (you'll become its admin) or join an existing one with its organization code.

#### Build

```bash
npm run build
npm run start
```

## Project structure

```
src/
  app/
    (app)/            # Authenticated app shell: dashboard, courses, timetable,
                       # calendar (+ ICS feed route), messages, announcements,
                       # people, admin, superadmin
    login/ signup/ onboarding/  # Auth & org onboarding flows
    actions/           # Server actions, one file per feature area
  components/          # Small shared client components (mobile nav, confirm button)
  lib/
    supabase/          # Supabase browser/server/middleware/service-role clients
    types/database.ts  # Shared TypeScript types for the schema
    ics.ts              # Minimal RFC5545 iCalendar serializer
supabase/
  migrations/           # Schema + RLS policies, applied in filename order
website/                # Static marketing site (see below), deployed separately
```

## Contributing

Pathly is currently a private repository. Contribution guidelines will be added once the project opens up further.

## License

This project is licensed under the MIT License — see the `LICENSE` file for details.

---

Built by the Pathly team
