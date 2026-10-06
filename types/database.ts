export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string;
  created_at: string;
  is_verified?: boolean;
  verification_type?: 'none' | 'lifetime' | 'admin' | 'subscription';
  dm_permission?: 'everyone' | 'followers' | 'nobody';
}

export interface Post {
  id: string;
  user_id: string;
  image_url: string;
  caption: string;
  created_at: string;
}

export interface Like {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  text: string;
  created_at: string;
}

export interface CommentLike {
  id: string;
  comment_id: string;
  user_id: string;
  created_at: string;
}

export interface Story {
  id: string;
  user_id: string;
  image_url: string;
  created_at: string;
}

export interface StoryView {
  id: string;
  story_id: string;
  viewer_id: string;
  viewed_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface FollowRequest {
  id: string;
  requester_id: string;
  target_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: 'like' | 'comment' | 'follow' | 'follow_request' | 'follow_accept' | 'reel_like' | 'mention';
  post_id: string | null;
  text: string | null;
  read: boolean;
  created_at: string;
}

export interface Reel {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string;
  audio_label: string;
  created_at: string;
}

export interface ReelLike {
  id: string;
  reel_id: string;
  user_id: string;
  created_at: string;
}

export interface SavedPost {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
  posts?: Post;
}

export interface Conversation {
  id: string;
  created_by: string;
  created_at: string;
}

export interface ConversationMember {
  conversation_id: string;
  user_id: string;
  joined_at: string;
  profiles?: Profile;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

export interface UserMute {
  id: string;
  muter_id: string;
  muted_id: string;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: 'post' | 'comment' | 'user' | 'reel' | 'story' | 'message';
  target_id: string;
  reason: string;
  created_at: string;
}

export interface UserPreference {
  user_id: string;
  dark_mode: boolean;
  push_notifications: boolean;
  email_notifications: boolean;
  like_notifications: boolean;
  comment_notifications: boolean;
  follow_notifications: boolean;
  dm_notifications: boolean;
  private_account: boolean;
  activity_status: boolean;
  story_sharing: boolean;
  data_saver: boolean;
}

export interface PostWithProfile extends Post {
  profiles: Profile | null;
  like_count: number;
  comment_count: number;
  has_liked: boolean;
  has_saved?: boolean;
}

export interface ReelWithProfile extends Reel {
  profiles: Profile | null;
  like_count: number;
  has_liked: boolean;
  is_following: boolean;
}

export interface NotificationWithActor extends Notification {
  actor: Profile | null;
}
