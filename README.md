<p align="center">
  <img src="pathly.png" alt="Pathly logo" width="200" />
</p>

# Pathly

An open-source, enterprise-grade learning management system (LMS) — a modern alternative to platforms like itslearning, built for institutions that need scale, security, and flexibility.

## Overview

Pathly is designed for schools, universities, and larger organizations that need a robust learning platform with enterprise-level requirements: multi-tenancy, granular access control, integrations [...]

The project is fully open source — institutions and contributors can inspect, extend, and self-host the platform, or deploy it as a managed service.

## Features

- **Multi-Tenant Architecture** — isolated instances for multiple schools/organizations from a single deployment
- **Role-Based Access Control (RBAC)** — fine-grained permissions across students, teachers, admins, and institutional roles
- **Courses & Modules** — structured learning paths with flexible content organization
- **Assignments & Submissions** — creation, distribution, and grading workflows
- **Grading & Analytics** — progress tracking, performance reporting, institutional dashboards
- **Communication** — announcements, discussion threads, and notifications per course/organization
- **File & Content Management** — structured storage for learning materials
- **Integrations** — SSO (SAML/OIDC), SIS/institutional system connectors
- **Security & Compliance** — built with data protection and auditability in mind (e.g. GDPR-relevant data handling)

### Current implementation status

| Feature | Status |
| --- | --- |
| Multi-tenant orgs (create / join by code) | ✅ Implemented |
| RBAC (org roles: admin/teacher/student, course roles: teacher/student) | ✅ Implemented via Postgres RLS |
| Courses, modules, lessons | ✅ Implemented |
| Enrollment (self-enroll + roster management) | ✅ Implemented |
| Assignments, submissions, grading | ✅ Implemented |
| Announcements (org-wide and per-course) | ✅ Implemented |
| Discussion threads, notifications | 🚧 Not yet implemented |
| File uploads (Supabase Storage) | 🚧 Submissions currently accept a link; native file upload not yet wired up |
| SSO (SAML/OIDC), SIS connectors | 🚧 Not yet implemented — Supabase Auth (email/password) ships today |
| Analytics dashboards | 🚧 Not yet implemented |

## Architecture

- **Frontend:** Next.js 16 (App Router, Server Actions, Tailwind CSS v4)
- **Backend / Database:** Supabase (Postgres + Auth). Multi-tenancy and RBAC are enforced at the database layer with Row Level Security (RLS) policies, not just in application code.
- **Auth:** Supabase Auth (email/password today; SSO can be added via Supabase's SAML/OIDC providers)
- **Deployment:** Stateless Next.js app + a Supabase project per environment; suitable for containerized hosting. A single Next.js deployment can serve many tenants (organizations), each isolated by RLS.

### Data model

`organizations` (tenants) → `profiles` (org members with a role) → `courses` → `course_modules` → `lessons`, plus `enrollments` (course-level role), `assignments` → `submissions` (grading fields live on the submission), and `announcements` (org-wide or course-scoped).

See [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) for the full schema and RLS policies.

## Getting Started

### Prerequisites

- Node.js (v20+)
- A [Supabase](https://supabase.com) project (free tier works for local development)

### Installation

```bash
git clone https://github.com/benjamin-blanke/pathly-lms.git
cd pathly-lms
npm install
```

### Configure Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Copy `.env.local.example` to `.env.local` and fill in your project's URL and anon key (Project Settings → API):

   ```bash
   cp .env.local.example .env.local
   ```

3. Apply the database schema. Using the [Supabase CLI](https://supabase.com/docs/guides/cli):

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

   Or paste the contents of `supabase/migrations/0001_init.sql` into the Supabase SQL editor and run it.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up, then create a new organization (you'll become its admin) or join an existing one with its organization code.

### Build

```bash
npm run build
npm run start
```

## Project structure

```
src/
  app/
    (app)/            # Authenticated app shell: dashboard, courses, announcements, people
    login/ signup/ onboarding/  # Auth & org onboarding flows
    actions/           # Server actions (courses, assignments, announcements, people)
  lib/
    supabase/          # Supabase client/server/middleware helpers
    types/database.ts  # Shared TypeScript types for the schema
supabase/
  migrations/0001_init.sql  # Schema + RLS policies
```

## Contributing

Pathly is currently a private repository. Contribution guidelines will be added once the project opens up further.

## License

This project is licensed under the MIT License — see the `LICENSE` file for details.

---

Built by the Pathly team
