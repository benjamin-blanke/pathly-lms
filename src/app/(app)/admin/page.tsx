import { redirect } from "next/navigation";
import Link from "next/link";
import { requireProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { updateOrgSettings } from "@/app/actions/admin";

export default async function AdminPage() {
  const { profile } = await requireProfile();
  if (profile.role !== "admin") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const [{ data: org }, { count: memberCount }, { count: courseCount }, { count: roomCount }] =
    await Promise.all([
      supabase.from("organizations").select("*").eq("id", profile.org_id).single(),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("org_id", profile.org_id),
      supabase.from("courses").select("id", { count: "exact", head: true }).eq("org_id", profile.org_id),
      supabase.from("rooms").select("id", { count: "exact", head: true }).eq("org_id", profile.org_id),
    ]);

  const stats = [
    { label: "Members", value: memberCount ?? 0 },
    { label: "Courses", value: courseCount ?? 0 },
    { label: "Rooms", value: roomCount ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Organization administration for principals and IT staff.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 font-semibold text-slate-900 dark:text-white">Organization settings</h2>
        <form action={updateOrgSettings} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[12rem]">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
            <input
              type="text"
              name="name"
              defaultValue={org?.name}
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900"
          >
            Save
          </button>
        </form>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Organization code (used to join): <code className="font-mono">{org?.slug}</code>
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/people"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <h3 className="font-semibold text-slate-900 dark:text-white">People &amp; roles</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage member roles across the organization.
          </p>
        </Link>
        <Link
          href="/courses"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <h3 className="font-semibold text-slate-900 dark:text-white">Courses</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Oversee every course in the organization.</p>
        </Link>
        <Link
          href="/timetable"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <h3 className="font-semibold text-slate-900 dark:text-white">Timetable</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage rooms, periods, and scheduled slots.</p>
        </Link>
        <Link
          href="/announcements"
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <h3 className="font-semibold text-slate-900 dark:text-white">Announcements</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Post organization-wide updates.</p>
        </Link>
      </section>
    </div>
  );
}
