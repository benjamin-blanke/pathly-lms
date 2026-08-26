-- Fix "start conversation" failing on the very first 1:1 message.
--
-- startConversation() does `.from("conversations").insert({...}).select("id")`
-- before the conversation_participants rows exist (those are inserted right
-- after, once the new conversation's id is known). Postgres re-checks a
-- table's SELECT policies against RETURNING rows for INSERT/UPDATE, and
-- conversations_select_participant only allowed rows where
-- is_conversation_participant(id) is true — which is false at that instant,
-- since no participant rows exist yet. Result: the INSERT's own RETURNING
-- clause raises a row-level security violation, even though the insert
-- itself (WITH CHECK) was allowed. Letting the creator see their own row
-- fixes it and is also just correct: whoever created a conversation should
-- always be able to see it.

alter policy "conversations_select_participant" on public.conversations
  using (created_by = auth.uid() or public.is_conversation_participant(id));
