import Link from "next/link";
import { requireProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { Message, Profile } from "@/lib/types/database";

export default async function MessagesPage() {
  const { userId } = await requireProfile();
  const supabase = await createClient();

  const { data: myParticipation } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId);

  const conversationIds = (myParticipation ?? []).map((row) => row.conversation_id);
  const lastReadByConversation = new Map((myParticipation ?? []).map((row) => [row.conversation_id, row.last_read_at]));

  if (conversationIds.length === 0) {
    return <EmptyState />;
  }

  const [{ data: conversations }, { data: otherParticipantsRaw }, { data: messagesRaw }] = await Promise.all([
    supabase.from("conversations").select("*").in("id", conversationIds).order("created_at", { ascending: false }),
    supabase
      .from("conversation_participants")
      .select("conversation_id, user_id, profile:profiles(*)")
      .in("conversation_id", conversationIds)
      .neq("user_id", userId),
    supabase
      .from("messages")
      .select("*")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false })
      .returns<Message[]>(),
  ]);

  const othersByConversation = new Map<string, Profile[]>();
  for (const row of otherParticipantsRaw ?? []) {
    const list = othersByConversation.get(row.conversation_id) ?? [];
    if (row.profile) list.push(row.profile as unknown as Profile);
    othersByConversation.set(row.conversation_id, list);
  }

  const lastMessageByConversation = new Map<string, Message>();
  for (const message of messagesRaw ?? []) {
    if (!lastMessageByConversation.has(message.conversation_id)) {
      lastMessageByConversation.set(message.conversation_id, message);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Messages</h1>
        <Link
          href="/messages/new"
          className="btn-primary"
        >
          + New message
        </Link>
      </div>

      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {(conversations ?? []).map((conversation) => {
          const others = othersByConversation.get(conversation.id) ?? [];
          const lastMessage = lastMessageByConversation.get(conversation.id);
          const lastReadAt = lastReadByConversation.get(conversation.id);
          const unread = lastMessage && (!lastReadAt || new Date(lastMessage.created_at) > new Date(lastReadAt));
          const title = conversation.title || others.map((p) => p.full_name).join(", ") || "Conversation";

          return (
            <li key={conversation.id}>
              <Link
                href={`/messages/${conversation.id}`}
                className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <div className="min-w-0">
                  <p className={`truncate font-medium ${unread ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"}`}>
                    {title}
                  </p>
                  {lastMessage && (
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400">{lastMessage.body}</p>
                  )}
                </div>
                {unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" aria-label="Unread" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Messages</h1>
        <Link
          href="/messages/new"
          className="btn-primary"
        >
          + New message
        </Link>
      </div>
      <p className="rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        No conversations yet.
      </p>
    </div>
  );
}
