# Pathly

An open-source, enterprise-grade learning management system (LMS) — a modern alternative to platforms like itslearning, built for institutions that need scale, security, and flexibility.

## Overview

Pathly is designed for schools, universities, and larger organizations that need a robust learning platform with enterprise-level requirements: multi-tenancy, granular access control, integrations with existing institutional systems, and a codebase built to scale beyond a single deployment.

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

## Architecture

*High-level overview — to be expanded as the project takes shape.*

- **Frontend:** Next.js
- **Backend / Database:** Supabase (or dedicated backend, TBD for multi-tenant scale)
- **Auth:** SSO-capable (SAML/OIDC), role-based
- **Deployment:** Designed for containerized, multi-tenant hosting rather than single-instance self-deploy

## Getting Started

> Setup instructions will be expanded as the architecture solidifies. Below is a placeholder for local development.

### Prerequisites

- Node.js (v18+)
- Access to the configured backend/database instance

### Installation

```bash
git clone https://github.com/your-username/pathly.git
cd pathly
npm install
```

### Development

```bash
npm run dev
```

## Contributing

Pathly is currently a private repository. Contribution guidelines will be added once the project opens up further.

## License

This project is licensed under the MIT License — see the `LICENSE` file for details.

---

Built by the Pathly team
