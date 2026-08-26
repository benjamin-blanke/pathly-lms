import Link from "next/link";
import { requireProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { MobileNav } from "@/components/MobileNav";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/courses", label: "Courses" },
  { href: "/timetable", label: "Timetable" },
  { href: "/calendar", label: "Calendar" },
  { href: "/messages", label: "Messages" },
  { href: "/announcements", label: "Announcements" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();
  const [{ data: org }, { data: superadminRow }] = await Promise.all([
    supabase.from("organizations").select("name, slug").eq("id", profile.org_id).single(),
    supabase.from("superadmins").select("id").eq("id", userId).maybeSingle(),
  ]);

  const navItems = [
    ...NAV_ITEMS,
    ...(profile.role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
    ...(superadminRow ? [{ href: "/superadmin", label: "Superadmin" }] : []),
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex">
        <Link href="/dashboard" className="px-2 text-lg font-bold text-slate-900 dark:text-white">
          Pathly
        </Link>
        <p className="mt-1 truncate px-2 text-xs text-slate-500 dark:text-slate-400">{org?.name}</p>

        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
          <p className="truncate px-2 text-sm font-medium text-slate-900 dark:text-white">
            {profile.full_name}
          </p>
          <p className="px-2 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {profile.role}
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-md px-2 py-2 text-left text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:hidden">
          <div className="flex items-center gap-2">
            <MobileNav items={navItems} />
            <Link href="/dashboard" className="text-lg font-bold text-slate-900 dark:text-white">
              Pathly
            </Link>
          </div>
          <form action={signOut}>
            <button type="submit" className="text-sm text-slate-500 dark:text-slate-400">
              Sign out
            </button>
          </form>
        </header>
        <main className="flex-1 p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
