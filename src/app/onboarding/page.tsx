import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";
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

  const supabase = await createClient();
  const { count: orgCount } = await supabase
    .from("organizations")
    .select("id", { count: "exact", head: true });
  const canCreateOrg = !orgCount;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Set up your workspace</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {canCreateOrg
              ? "Create your institution's organization, or join one with an existing code."
              : "Join your institution's organization with its code."}
          </p>
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-center text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <div className={`grid gap-6 ${canCreateOrg ? "sm:grid-cols-2" : "sm:mx-auto sm:max-w-sm"}`}>
          {canCreateOrg && (
            <div className="card p-6">
              <h2 className="font-semibold text-slate-900 dark:text-white">Create an organization</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                You&apos;ll become the admin of this deployment&apos;s organization.
              </p>
              <form action={createOrganization} className="mt-4 space-y-3">
                <input
                  type="text"
                  name="fullName"
                  placeholder="Your full name"
                  required
                  className="input-field w-full"
                />
                <input
                  type="text"
                  name="name"
                  placeholder="Organization name"
                  required
                  className="input-field w-full"
                />
                <button
                  type="submit"
                  className="btn-primary w-full"
                >
                  Create organization
                </button>
              </form>
            </div>
          )}

          <div className="card p-6">
            <h2 className="font-semibold text-slate-900 dark:text-white">Join an organization</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Ask your admin for the organization code (its slug). You&apos;ll join as a student —
              an admin can promote you to teacher afterward.
            </p>
            <form action={joinOrganization} className="mt-4 space-y-3">
              <input
                type="text"
                name="fullName"
                placeholder="Your full name"
                required
                className="input-field w-full"
              />
              <input
                type="text"
                name="slug"
                placeholder="Organization code"
                required
                className="input-field w-full"
              />
              <button
                type="submit"
                className="btn-secondary w-full"
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
