import Link from "next/link";
import { requireProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { startConversation } from "@/app/actions/messages";
import type { Profile } from "@/lib/types/database";

export default async function NewMessagePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("profiles")
    .select("*")
    .eq("org_id", profile.org_id)
    .neq("id", userId)
    .order("full_name")
    .returns<Profile[]>();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link href="/messages" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Back to messages
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">New message</h1>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <form action={startConversation} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">To</label>
          <select
            name="recipientId"
            required
            className="input-field mt-1 w-full"
          >
            <option value="">Select a person</option>
            {(members ?? []).map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name} · {member.role}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Message</label>
          <textarea
            name="message"
            rows={4}
            required
            className="input-field mt-1 w-full"
          />
        </div>
        <button
          type="submit"
          className="btn-primary w-full"
        >
          Send
        </button>
      </form>
    </div>
  );
}
