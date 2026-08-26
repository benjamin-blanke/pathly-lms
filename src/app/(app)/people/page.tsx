import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { updateMemberRole } from "@/app/actions/people";
import type { Profile } from "@/lib/types/database";

export default async function PeoplePage() {
  const { profile } = await requireProfile();
  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: members } = await supabase
    .from("profiles")
    .select("*")
    .eq("org_id", profile.org_id)
    .order("full_name")
    .returns<Profile[]>();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">People</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage roles for members of your organization.
        </p>
      </div>

      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {(members ?? []).map((member) => (
          <li key={member.id} className="flex items-center justify-between p-4">
            <span className="text-sm font-medium text-slate-900 dark:text-white">{member.full_name}</span>
            <form action={updateMemberRole.bind(null, member.id)} className="flex items-center gap-2">
              <select
                name="role"
                defaultValue={member.role}
                disabled={member.id === profile.id}
                className="input-field px-2 py-1 disabled:opacity-50"
              >
                <option value="admin">Admin</option>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>
              {member.id !== profile.id && (
                <button
                  type="submit"
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Save
                </button>
              )}
            </form>
          </li>
        ))}
        {(!members || members.length === 0) && (
          <li className="p-6 text-sm text-slate-500 dark:text-slate-400">No members found.</li>
        )}
      </ul>
    </div>
  );
}
