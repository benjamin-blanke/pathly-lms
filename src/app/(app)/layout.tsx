import Link from "next/link";
import { requireProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { MobileNav } from "@/components/MobileNav";
import { NavLinks } from "@/components/NavLinks";

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

  const initial = (profile.full_name || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex">
        <Link href="/dashboard" className="flex items-center gap-2 px-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent to-accent-2 text-sm font-bold text-white">
            P
          </span>
          <span className="text-lg font-bold text-slate-900 dark:text-white">Pathly</span>
        </Link>
        <p className="mt-2 truncate px-2 text-xs text-slate-500 dark:text-slate-400">{org?.name}</p>

        <nav className="mt-6 flex flex-1 flex-col gap-1">
          <NavLinks items={navItems} />
        </nav>

        <div className="mt-auto space-y-3 border-t border-slate-200 pt-3 dark:border-slate-800">
          <div className="flex items-center gap-2 px-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-2 text-sm font-semibold text-white">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                {profile.full_name}
              </p>
              <p className="text-xs capitalize text-accent">{profile.role}</p>
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-md px-2 py-2 text-left text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
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
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-accent to-accent-2 text-xs font-bold text-white">
                P
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">Pathly</span>
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
