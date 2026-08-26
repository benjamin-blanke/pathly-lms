import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteOrganization } from "@/app/actions/superadmin";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import type { Organization, Superadmin } from "@/lib/types/database";

export default async function SuperadminPage() {
  const { userId } = await requireProfile();
  const supabase = await createClient();

  const { data: myAdminRow } = await supabase
    .from("superadmins")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (!myAdminRow) {
    redirect("/dashboard");
  }

  const [{ data: orgs }, { data: profilesRaw }, { data: coursesRaw }, { data: superadmins }] = await Promise.all([
    supabase.from("organizations").select("*").order("created_at", { ascending: false }).returns<Organization[]>(),
    supabase.from("profiles").select("org_id"),
    supabase.from("courses").select("org_id"),
    supabase.from("superadmins").select("*").returns<Superadmin[]>(),
  ]);

  const memberCounts = new Map<string, number>();
  for (const row of profilesRaw ?? []) {
    memberCounts.set(row.org_id, (memberCounts.get(row.org_id) ?? 0) + 1);
  }
  const courseCounts = new Map<string, number>();
  for (const row of coursesRaw ?? []) {
    courseCounts.set(row.org_id, (courseCounts.get(row.org_id) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Superadmin</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Platform-wide view across every organization. Visible only to accounts in{" "}
          <code className="font-mono">superadmins</code>.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{orgs?.length ?? 0}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Organizations</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{profilesRaw?.length ?? 0}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Total users</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{coursesRaw?.length ?? 0}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Total courses</p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Organizations</h2>
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {(orgs ?? []).map((org) => (
            <li key={org.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">{org.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <code className="font-mono">{org.slug}</code> · {memberCounts.get(org.id) ?? 0} members ·{" "}
                  {courseCounts.get(org.id) ?? 0} courses · created {new Date(org.created_at).toLocaleDateString()}
                </p>
              </div>
              <form action={deleteOrganization.bind(null, org.id)}>
                <ConfirmSubmitButton
                  confirmMessage={`Permanently delete "${org.name}" and everything in it? This cannot be undone.`}
                  className="shrink-0 rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                >
                  Delete
                </ConfirmSubmitButton>
              </form>
            </li>
          ))}
          {(!orgs || orgs.length === 0) && (
            <li className="p-6 text-sm text-slate-500 dark:text-slate-400">No organizations yet.</li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">Superadmins</h2>
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {(superadmins ?? []).map((sa) => (
            <li key={sa.id} className="p-3 text-sm text-slate-700 dark:text-slate-300">
              {sa.email}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Managed via direct database access only — not editable through the app.
        </p>
      </section>
    </div>
  );
}
