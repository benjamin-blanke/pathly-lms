import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { markConversationRead, sendMessage } from "@/app/actions/messages";
import type { Message, Profile } from "@/lib/types/database";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const { userId } = await requireProfile();
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conversation) {
    notFound();
  }

  await markConversationRead(conversationId);

  const [{ data: participantsRaw }, { data: messagesRaw }] = await Promise.all([
    supabase
      .from("conversation_participants")
      .select("user_id, profile:profiles(*)")
      .eq("conversation_id", conversationId),
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .returns<Message[]>(),
  ]);

  const participants = (participantsRaw ?? []) as unknown as { user_id: string; profile: Profile | null }[];
  const others = participants.filter((p) => p.user_id !== userId);
  const title = conversation.title || others.map((p) => p.profile?.full_name).filter(Boolean).join(", ") || "Conversation";
  const profileById = new Map(participants.map((p) => [p.user_id, p.profile]));

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-2xl flex-col">
      <div>
        <Link href="/messages" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Back to messages
        </Link>
        <h1 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{title}</h1>
      </div>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        {(messagesRaw ?? []).map((message) => {
          const isMine = message.sender_id === userId;
          const sender = profileById.get(message.sender_id);
          return (
            <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${isMine ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"}`}>
                {!isMine && <p className="mb-0.5 text-xs font-medium opacity-70">{sender?.full_name}</p>}
                <p className="whitespace-pre-wrap">{message.body}</p>
              </div>
            </div>
          );
        })}
        {(!messagesRaw || messagesRaw.length === 0) && (
          <p className="text-sm text-slate-500 dark:text-slate-400">No messages yet.</p>
        )}
      </div>

      <form action={sendMessage.bind(null, conversationId)} className="mt-3 flex gap-2">
        <input
          type="text"
          name="body"
          placeholder="Write a message…"
          required
          autoComplete="off"
          className="input-field flex-1"
        />
        <button
          type="submit"
          className="btn-primary px-4 py-2"
        >
          Send
        </button>
      </form>
    </div>
  );
}
