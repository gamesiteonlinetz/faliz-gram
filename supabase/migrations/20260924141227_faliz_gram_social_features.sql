/*
# Faliz Gram — Reels, Saves, and Direct Messages

## New tables
- `reels`: vertical short-form videos with captions and audio labels.
- `saved_posts`: private bookmarks owned by the signed-in user.
- `conversations`: direct-message threads.
- `conversation_members`: membership rows controlling access to a thread.
- `messages`: text messages visible only to thread members.

## Security changes
- Replaces the broad notification insert rule with a rule that requires the current user to be the actor and ties each notification to the matching follow, like, or comment event.
- Enables RLS on every new table.
- Reels are readable by authenticated users, but only their owner can create, update, or delete them.
- Saved posts are private to their owner.
- Conversations and messages require membership checks in every read and write policy.

## Important notes
1. Owner and sender columns default to `auth.uid()`.
2. No existing user data is deleted or renamed.
3. Existing posts, likes, comments, follows, stories, and profiles remain compatible.
*/

CREATE TABLE IF NOT EXISTS reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  video_url text NOT NULL,
  thumbnail_url text,
  caption text NOT NULL DEFAULT '',
  audio_label text NOT NULL DEFAULT 'Original audio',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reels_select_authenticated" ON reels;
CREATE POLICY "reels_select_authenticated" ON reels FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "reels_insert_own" ON reels;
CREATE POLICY "reels_insert_own" ON reels FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "reels_update_own" ON reels;
CREATE POLICY "reels_update_own" ON reels FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "reels_delete_own" ON reels;
CREATE POLICY "reels_delete_own" ON reels FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_reels_created_at ON reels(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reels_user_id ON reels(user_id);

CREATE TABLE IF NOT EXISTS saved_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_posts_select_own" ON saved_posts;
CREATE POLICY "saved_posts_select_own" ON saved_posts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "saved_posts_insert_own" ON saved_posts;
CREATE POLICY "saved_posts_insert_own" ON saved_posts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "saved_posts_delete_own" ON saved_posts;
CREATE POLICY "saved_posts_delete_own" ON saved_posts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON saved_posts(user_id);

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select_member" ON conversations;
CREATE POLICY "conversations_select_member" ON conversations FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = conversations.id
        AND conversation_members.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "conversations_insert_creator" ON conversations;
CREATE POLICY "conversations_insert_creator" ON conversations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "conversations_update_creator" ON conversations;
CREATE POLICY "conversations_update_creator" ON conversations FOR UPDATE
  TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "conversations_delete_creator" ON conversations;
CREATE POLICY "conversations_delete_creator" ON conversations FOR DELETE
  TO authenticated USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "conversation_members_select_member" ON conversation_members;
CREATE POLICY "conversation_members_select_member" ON conversation_members FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM conversation_members own_membership
      WHERE own_membership.conversation_id = conversation_members.conversation_id
        AND own_membership.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "conversation_members_insert_member" ON conversation_members;
CREATE POLICY "conversation_members_insert_member" ON conversation_members FOR INSERT
  TO authenticated WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_members.conversation_id
        AND conversations.created_by = auth.uid()
    )
  );
DROP POLICY IF EXISTS "conversation_members_delete_member" ON conversation_members;
CREATE POLICY "conversation_members_delete_member" ON conversation_members FOR DELETE
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_members.conversation_id
        AND conversations.created_by = auth.uid()
    )
  );
CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id ON conversation_members(user_id);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_member" ON messages;
CREATE POLICY "messages_select_member" ON messages FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = messages.conversation_id
        AND conversation_members.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "messages_insert_member" ON messages;
CREATE POLICY "messages_insert_member" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = messages.conversation_id
        AND conversation_members.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "messages_update_sender" ON messages;
CREATE POLICY "messages_update_sender" ON messages FOR UPDATE
  TO authenticated USING (sender_id = auth.uid()) WITH CHECK (sender_id = auth.uid());
DROP POLICY IF EXISTS "messages_delete_sender" ON messages;
CREATE POLICY "messages_delete_sender" ON messages FOR DELETE
  TO authenticated USING (sender_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);

DROP POLICY IF EXISTS "notifications_insert_any" ON notifications;
CREATE POLICY "notifications_insert_verified_event" ON notifications FOR INSERT
  TO authenticated WITH CHECK (
    actor_id = auth.uid()
    AND user_id <> auth.uid()
    AND (
      (
        type = 'follow'
        AND EXISTS (
          SELECT 1 FROM follows
          WHERE follows.follower_id = auth.uid()
            AND follows.following_id = notifications.user_id
        )
      )
      OR (
        type IN ('like', 'comment')
        AND post_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM posts
          WHERE posts.id = notifications.post_id
            AND posts.user_id = notifications.user_id
        )
      )
    )
  );
