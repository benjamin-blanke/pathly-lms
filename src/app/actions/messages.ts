"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/supabase/auth";

export async function startConversation(formData: FormData) {
  const recipientId = String(formData.get("recipientId") ?? "").trim();
  const firstMessage = String(formData.get("message") ?? "").trim();

  if (!recipientId || !firstMessage) {
    redirect(`/messages/new?error=${encodeURIComponent("Pick a recipient and write a message")}`);
  }

  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  // Reuse an existing 1:1 conversation between these two people, if any.
  const { data: mine } = await supabase
    .from("conversation_participants")
    .select("conversation_id, conversation:conversations(is_group)")
    .eq("user_id", userId);

  const candidateIds = (mine ?? [])
    .filter((row) => !(row.conversation as unknown as { is_group: boolean } | null)?.is_group)
    .map((row) => row.conversation_id);

  let existingId: string | null = null;
  if (candidateIds.length > 0) {
    const { data: theirs } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", recipientId)
      .in("conversation_id", candidateIds);
    existingId = theirs?.[0]?.conversation_id ?? null;
  }

  let conversationId = existingId;

  if (!conversationId) {
    const { data: conversation, error } = await supabase
      .from("conversations")
      .insert({ org_id: profile.org_id, is_group: false, created_by: userId })
      .select("id")
      .single();

    if (error || !conversation) {
      redirect(`/messages/new?error=${encodeURIComponent(error?.message ?? "Could not start conversation")}`);
    }

    conversationId = conversation!.id;

    await supabase.from("conversation_participants").insert([
      { conversation_id: conversationId, user_id: userId },
      { conversation_id: conversationId, user_id: recipientId },
    ]);
  }

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: userId,
    body: firstMessage,
  });

  redirect(`/messages/${conversationId}`);
}

export async function sendMessage(conversationId: string, formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const { userId } = await requireProfile();
  const supabase = await createClient();

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: userId,
    body,
  });

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
}

export async function markConversationRead(conversationId: string) {
  const { userId } = await requireProfile();
  const supabase = await createClient();

  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);

  revalidatePath("/messages");
}
