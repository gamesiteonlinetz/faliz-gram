/*
# Faliz-Gram social features expansion

## Summary
Adds tables needed for a complete Instagram-style social app:
- reel_likes (separate from post likes)
- story_views (track who viewed a story)
- follow_requests (for private account follow requests)
- comment_likes (like comments)
- user_blocks (block users)
- user_mutes (mute users)
- reports (report content/users)
- user_preferences (persisted app settings per user)

Also adds indexes for performance and updates notifications type to support new types.

## New Tables
1. reel_likes - likes on reels (reel_id, user_id)
2. story_views - story view tracking (story_id, viewer_id)
3. follow_requests - follow requests for private accounts (requester_id, target_id, status)
4. comment_likes - likes on comments (comment_id, user_id)
5. user_blocks - block relationships (blocker_id, blocked_id)
6. user_mutes - mute relationships (muter_id, muted_id)
7. reports - content/user reports (reporter_id, target_type, target_id, reason)
8. user_preferences - per-user app settings (dark_mode, notification toggles, privacy settings)

## Security
- RLS enabled on all new tables
- Owner-scoped policies for all user-specific data
- Reports are only visible to the reporter and admins
- User preferences only visible/editable by owner
- Blocks/mutes only visible to the muter/blocker
*/

-- reel_likes
CREATE TABLE IF NOT EXISTS reel_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(reel_id, user_id)
);
ALTER TABLE reel_likes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_reel_likes_reel ON reel_likes(reel_id);

DROP POLICY IF EXISTS "reel_likes_select_all" ON reel_likes;
CREATE POLICY "reel_likes_select_all" ON reel_likes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "reel_likes_insert_own" ON reel_likes;
CREATE POLICY "reel_likes_insert_own" ON reel_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "reel_likes_delete_own" ON reel_likes;
CREATE POLICY "reel_likes_delete_own" ON reel_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- story_views
CREATE TABLE IF NOT EXISTS story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_story_views_story ON story_views(story_id);

DROP POLICY IF EXISTS "story_views_insert_own" ON story_views;
CREATE POLICY "story_views_insert_own" ON story_views FOR INSERT TO authenticated WITH CHECK (auth.uid() = viewer_id);
DROP POLICY IF EXISTS "story_views_select_owner" ON story_views;
CREATE POLICY "story_views_select_owner" ON story_views FOR SELECT TO authenticated USING (
  viewer_id = auth.uid()
  OR EXISTS (SELECT 1 FROM stories WHERE stories.id = story_views.story_id AND stories.user_id = auth.uid())
);
DROP POLICY IF EXISTS "story_views_delete_owner" ON story_views;
CREATE POLICY "story_views_delete_owner" ON story_views FOR DELETE TO authenticated USING (
  viewer_id = auth.uid()
  OR EXISTS (SELECT 1 FROM stories WHERE stories.id = story_views.story_id AND stories.user_id = auth.uid())
);

-- follow_requests
CREATE TABLE IF NOT EXISTS follow_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(requester_id, target_id)
);
ALTER TABLE follow_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_follow_requests_target ON follow_requests(target_id);

DROP POLICY IF EXISTS "follow_requests_select_involved" ON follow_requests;
CREATE POLICY "follow_requests_select_involved" ON follow_requests FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR target_id = auth.uid());
DROP POLICY IF EXISTS "follow_requests_insert_own" ON follow_requests;
CREATE POLICY "follow_requests_insert_own" ON follow_requests FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());
DROP POLICY IF EXISTS "follow_requests_update_target" ON follow_requests;
CREATE POLICY "follow_requests_update_target" ON follow_requests FOR UPDATE TO authenticated
  USING (target_id = auth.uid())
  WITH CHECK (target_id = auth.uid());
DROP POLICY IF EXISTS "follow_requests_delete_involved" ON follow_requests;
CREATE POLICY "follow_requests_delete_involved" ON follow_requests FOR DELETE TO authenticated
  USING (requester_id = auth.uid() OR target_id = auth.uid());

-- comment_likes
CREATE TABLE IF NOT EXISTS comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id);

DROP POLICY IF EXISTS "comment_likes_select_all" ON comment_likes;
CREATE POLICY "comment_likes_select_all" ON comment_likes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "comment_likes_insert_own" ON comment_likes;
CREATE POLICY "comment_likes_insert_own" ON comment_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "comment_likes_delete_own" ON comment_likes;
CREATE POLICY "comment_likes_delete_own" ON comment_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- user_blocks
CREATE TABLE IF NOT EXISTS user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_blocks_select_own" ON user_blocks;
CREATE POLICY "user_blocks_select_own" ON user_blocks FOR SELECT TO authenticated
  USING (blocker_id = auth.uid());
DROP POLICY IF EXISTS "user_blocks_insert_own" ON user_blocks;
CREATE POLICY "user_blocks_insert_own" ON user_blocks FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid());
DROP POLICY IF EXISTS "user_blocks_delete_own" ON user_blocks;
CREATE POLICY "user_blocks_delete_own" ON user_blocks FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());

-- user_mutes
CREATE TABLE IF NOT EXISTS user_mutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  muter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  muted_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(muter_id, muted_id)
);
ALTER TABLE user_mutes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_mutes_select_own" ON user_mutes;
CREATE POLICY "user_mutes_select_own" ON user_mutes FOR SELECT TO authenticated
  USING (muter_id = auth.uid());
DROP POLICY IF EXISTS "user_mutes_insert_own" ON user_mutes;
CREATE POLICY "user_mutes_insert_own" ON user_mutes FOR INSERT TO authenticated
  WITH CHECK (muter_id = auth.uid());
DROP POLICY IF EXISTS "user_mutes_delete_own" ON user_mutes;
CREATE POLICY "user_mutes_delete_own" ON user_mutes FOR DELETE TO authenticated
  USING (muter_id = auth.uid());

-- reports
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_insert_own" ON reports;
CREATE POLICY "reports_insert_own" ON reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());
DROP POLICY IF EXISTS "reports_select_own" ON reports;
CREATE POLICY "reports_select_own" ON reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());
DROP POLICY IF EXISTS "reports_delete_own" ON reports;
CREATE POLICY "reports_delete_own" ON reports FOR DELETE TO authenticated
  USING (reporter_id = auth.uid());

-- user_preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  dark_mode boolean NOT NULL DEFAULT false,
  push_notifications boolean NOT NULL DEFAULT true,
  email_notifications boolean NOT NULL DEFAULT true,
  like_notifications boolean NOT NULL DEFAULT true,
  comment_notifications boolean NOT NULL DEFAULT true,
  follow_notifications boolean NOT NULL DEFAULT true,
  dm_notifications boolean NOT NULL DEFAULT true,
  private_account boolean NOT NULL DEFAULT false,
  activity_status boolean NOT NULL DEFAULT true,
  story_sharing boolean NOT NULL DEFAULT true,
  data_saver boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_preferences_select_own" ON user_preferences;
CREATE POLICY "user_preferences_select_own" ON user_preferences FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "user_preferences_insert_own" ON user_preferences;
CREATE POLICY "user_preferences_insert_own" ON user_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "user_preferences_update_own" ON user_preferences;
CREATE POLICY "user_preferences_update_own" ON user_preferences FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "user_preferences_delete_own" ON user_preferences;
CREATE POLICY "user_preferences_delete_own" ON user_preferences FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Update notifications type constraint to allow new types
DROP POLICY IF EXISTS "notifications_insert_verified_event" ON notifications;
CREATE POLICY "notifications_insert_verified_event" ON notifications FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND user_id <> auth.uid()
    AND (
      (type = 'follow' AND EXISTS (SELECT 1 FROM follows WHERE follows.follower_id = auth.uid() AND follows.following_id = notifications.user_id))
      OR (type IN ('like', 'comment') AND post_id IS NOT NULL AND EXISTS (SELECT 1 FROM posts WHERE posts.id = notifications.post_id AND posts.user_id = notifications.user_id))
      OR (type = 'reel_like' AND EXISTS (SELECT 1 FROM reel_likes WHERE reel_likes.user_id = auth.uid()))
      OR (type = 'follow_request' AND EXISTS (SELECT 1 FROM follow_requests WHERE follow_requests.requester_id = auth.uid() AND follow_requests.target_id = notifications.user_id))
      OR (type = 'follow_accept' AND EXISTS (SELECT 1 FROM follows WHERE follows.follower_id = auth.uid() AND follows.following_id = notifications.user_id))
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_likes_post ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_stories_created ON stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_posts_user ON saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_reels_created ON reels(created_at DESC);
