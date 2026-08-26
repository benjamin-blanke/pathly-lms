import Link from "next/link";

const FEATURES = [
  {
    title: "Multi-Tenant Architecture",
    body: "Isolated instances for multiple schools and organizations from a single deployment.",
  },
  {
    title: "Role-Based Access Control",
    body: "Fine-grained permissions across students, teachers, admins, and institutional roles.",
  },
  {
    title: "Courses & Modules",
    body: "Structured learning paths with flexible content organization.",
  },
  {
    title: "Assignments & Grading",
    body: "Creation, distribution, submission, and grading workflows in one place.",
  },
  {
    title: "Communication",
    body: "Announcements scoped to your organization or a single course.",
  },
  {
    title: "Security & Compliance",
    body: "Built with data protection and auditability in mind, enforced at the database layer.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-xl font-bold text-slate-900 dark:text-white">Pathly</span>
        <nav className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Get started
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            An open-source LMS for institutions that need scale
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            Pathly is a modern, enterprise-grade alternative to platforms like itslearning — built for
            schools, universities, and organizations that need multi-tenancy, granular access control,
            and a codebase that scales beyond a single deployment.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-md bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Create your organization
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:text-white dark:hover:bg-slate-900"
            >
              Sign in
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
              >
                <h3 className="font-semibold text-slate-900 dark:text-white">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        Open source under the MIT License — built by the Pathly team.
      </footer>
    </div>
  );
}
