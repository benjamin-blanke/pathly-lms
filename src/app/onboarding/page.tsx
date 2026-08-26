import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/auth";
import { createOrganization, joinOrganization } from "@/app/actions/onboarding";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { profile } = await getCurrentProfile();

  if (profile) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Set up your workspace</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Create a new organization for your institution, or join one with an existing code.
          </p>
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-center text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-semibold text-slate-900 dark:text-white">Create an organization</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              You&apos;ll become the admin of a brand new tenant.
            </p>
            <form action={createOrganization} className="mt-4 space-y-3">
              <input
                type="text"
                name="fullName"
                placeholder="Your full name"
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <input
                type="text"
                name="name"
                placeholder="Organization name"
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <button
                type="submit"
                className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                Create organization
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-semibold text-slate-900 dark:text-white">Join an organization</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Ask your admin for the organization code (its slug).
            </p>
            <form action={joinOrganization} className="mt-4 space-y-3">
              <input
                type="text"
                name="fullName"
                placeholder="Your full name"
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <input
                type="text"
                name="slug"
                placeholder="Organization code"
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <select
                name="role"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
              <button
                type="submit"
                className="w-full rounded-md border border-slate-900 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100 dark:border-white dark:text-white dark:hover:bg-slate-800"
              >
                Join organization
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
