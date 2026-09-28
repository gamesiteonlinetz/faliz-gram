import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  Pressable,
  Image,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/Avatar';
import { UsernameWithBadge } from '@/components/VerifiedBadge';
import { Colors, Spacing, FontSizes, Radius, Shadows } from '@/lib/theme';
import type { PostWithProfile, Story, Profile } from '@/types/database';

export default function HomeScreen() {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [stories, setStories] = useState<{ profile: Profile; story: Story }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (
          id, username, full_name, avatar_url, bio, created_at, is_verified, verification_type
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) {
      setPosts([]);
      return;
    }

    const savedSet = new Set<string>();
    if (profile) {
      const { data: saved } = await supabase.from('saved_posts').select('post_id').eq('user_id', profile.id);
      (saved || []).forEach((s: any) => savedSet.add(s.post_id));
    }
    setSavedIds(savedSet);

    const postsWithExtras = await Promise.all(
      data.map(async (post: any) => {
        const [likeCount, commentCount, userLike] = await Promise.all([
          supabase.from('likes').select('id', { count: 'exact' }).eq('post_id', post.id),
          supabase.from('comments').select('id', { count: 'exact' }).eq('post_id', post.id),
          profile
            ? supabase.from('likes').select('id').eq('post_id', post.id).eq('user_id', profile.id).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        return {
          ...post,
          profiles: post.profiles,
          like_count: likeCount.count || 0,
          comment_count: commentCount.count || 0,
          has_liked: !!userLike.data,
          has_saved: savedSet.has(post.id),
        } as PostWithProfile;
      })
    );

    setPosts(postsWithExtras);
  };

  const fetchStories = async () => {
    const { data } = await supabase
      .from('stories')
      .select(`
        *,
        profiles:user_id (
          id, username, full_name, avatar_url, bio, created_at, is_verified, verification_type
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!data) return;

    const storyMap = new Map<string, { profile: Profile; story: Story }>();
    data.forEach((s: any) => {
      if (s.profiles && !storyMap.has(s.user_id)) {
        storyMap.set(s.user_id, { profile: s.profiles, story: s });
      }
    });
    setStories(Array.from(storyMap.values()));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchPosts(), fetchStories()]);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
      fetchStories();
    }, [profile?.id])
  );

  const handleSave = async (post: PostWithProfile) => {
    if (!profile) return;
    if (savedIds.has(post.id)) {
      setSavedIds(prev => { const next = new Set(prev); next.delete(post.id); return next; });
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, has_saved: false } : p));
      await supabase.from('saved_posts').delete().eq('post_id', post.id).eq('user_id', profile.id);
    } else {
      setSavedIds(prev => new Set(prev).add(post.id));
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, has_saved: true } : p));
      await supabase.from('saved_posts').insert({ post_id: post.id, user_id: profile.id });
    }
  };

  const handleLike = async (post: PostWithProfile) => {
    if (!profile) return;

    if (post.has_liked) {
      setPosts(prev =>
        prev.map(p =>
          p.id === post.id
            ? { ...p, has_liked: false, like_count: p.like_count - 1 }
            : p
        )
      );
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', profile.id);
    } else {
      setPosts(prev =>
        prev.map(p =>
          p.id === post.id
            ? { ...p, has_liked: true, like_count: p.like_count + 1 }
            : p
        )
      );
      await supabase.from('likes').insert({ post_id: post.id, user_id: profile.id });
      if (post.user_id !== profile.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          actor_id: profile.id,
          type: 'like',
          post_id: post.id,
        });
      }
    }
  };

  const handleSubmitComment = async (postId: string, postUserId: string) => {
    if (!profile || !commentText.trim()) return;

    const { data } = await supabase
      .from('comments')
      .insert({ post_id: postId, text: commentText.trim() })
      .select('*')
      .single();

    if (data && postUserId !== profile.id) {
      await supabase.from('notifications').insert({
        user_id: postUserId,
        actor_id: profile.id,
        type: 'comment',
        post_id: postId,
        text: commentText.trim(),
      });
    }

    setCommentText('');
    setCommentingPostId(null);
    fetchPosts();
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return `${Math.floor(days / 7)}w`;
  };

  const renderStory = ({ item }: { item: { profile: Profile; story: Story } }) => (
    <Pressable
      style={styles.storyItem}
      onPress={() => router.push(`/story/${item.profile.id}`)}
    >
      <Avatar uri={item.profile.avatar_url} size={64} hasStory username={item.profile.username} />
      <Text style={styles.storyUsername} numberOfLines={1}>
        {item.profile.username}
      </Text>
    </Pressable>
  );

  const renderPost = ({ item }: { item: PostWithProfile }) => (
    <View style={styles.postContainer}>
      <View style={styles.postHeader}>
        <View style={styles.postHeaderLeft}>
          <Avatar
            uri={item.profiles?.avatar_url ?? null}
            size={34}
            username={item.profiles?.username}
            onPress={() => item.profiles && router.push(`/user/${item.profiles.id}`)}
          />
          <Pressable onPress={() => item.profiles && router.push(`/user/${item.profiles.id}`)} style={styles.postUsernameRow}>
            <UsernameWithBadge username={item.profiles?.username ?? 'unknown'} isVerified={item.profiles?.is_verified} fontSize={FontSizes.md} />
          </Pressable>
        </View>
        <MoreHorizontal color={Colors.textSecondary} size={20} />
      </View>

      <Image
        source={{ uri: item.image_url }}
        style={styles.postImage}
        resizeMode="cover"
      />

      <View style={styles.postActions}>
        <View style={styles.actionRow}>
          <Pressable onPress={() => handleLike(item)} hitSlop={8}>
            <Heart
              color={item.has_liked ? Colors.error : Colors.text}
              size={26}
              fill={item.has_liked ? Colors.error : 'none'}
              strokeWidth={item.has_liked ? 0 : 2}
            />
          </Pressable>
          <Pressable onPress={() => setCommentingPostId(commentingPostId === item.id ? null : item.id)} hitSlop={8}>
            <MessageCircle color={Colors.text} size={26} strokeWidth={2} />
          </Pressable>
          <Send color={Colors.text} size={26} strokeWidth={2} />
        </View>
        <Pressable onPress={() => handleSave(item)} hitSlop={8}>
          <Bookmark color={item.has_saved ? Colors.text : Colors.text} size={26} fill={item.has_saved ? Colors.text : 'none'} strokeWidth={2} />
        </Pressable>
      </View>

      <View style={styles.postInfo}>
        {item.like_count > 0 && (
          <Text style={styles.likesText}>
            {item.like_count} {item.like_count === 1 ? 'like' : 'likes'}
          </Text>
        )}
        {item.caption ? (
          <Text style={styles.captionText}>
            <Text style={styles.captionUsername}>{item.profiles?.username}{item.profiles?.is_verified ? ' ✓' : ''}</Text>{' '}
            {item.caption}
          </Text>
        ) : null}
        {item.comment_count > 0 && (
          <Pressable onPress={() => setCommentingPostId(commentingPostId === item.id ? null : item.id)}>
            <Text style={styles.commentsLink}>
              View all {item.comment_count} comments
            </Text>
          </Pressable>
        )}
        <Text style={styles.timestamp}>{formatTime(item.created_at)}</Text>
      </View>

      {commentingPostId === item.id && (
        <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'}>
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor={Colors.textSecondary}
              value={commentText}
              onChangeText={setCommentText}
              autoFocus
            />
            <Pressable
              onPress={() => handleSubmitComment(item.id, item.user_id)}
              disabled={!commentText.trim()}
              hitSlop={8}
            >
              <Text style={[styles.commentSubmit, !commentText.trim() && styles.commentSubmitDisabled]}>
                Post
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <LinearGradient
          colors={[Colors.gradientStart, Colors.gradientEnd]}
          style={styles.headerLogoGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.headerLogo}>Faliz Gram</Text>
        </LinearGradient>
        <Pressable onPress={() => router.push('/messages')} hitSlop={8}>
          <Send color={Colors.text} size={26} strokeWidth={2} />
        </Pressable>
      </View>
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={renderPost}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListHeaderComponent={
          stories.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.storiesBar}
              contentContainerStyle={styles.storiesContent}
            >
              {stories.map(item => renderStory({ item }))}
            </ScrollView>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>Follow people to see their posts here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLogoGradient: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
  },
  headerLogo: {
    fontFamily: 'Inter-Bold',
    fontSize: FontSizes.xxl,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  storiesBar: {
    borderBottomWidth: StyleSheet.hairlineWidth || 0.5,
    borderBottomColor: Colors.border,
  },
  storiesContent: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  storyItem: {
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
    width: 72,
  },
  storyUsername: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.xs,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  postContainer: {
    marginBottom: Spacing.sm,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  postUsernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  postUsername: {
    fontFamily: 'Inter-SemiBold',
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  postImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.surfaceElevated,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  postInfo: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  likesText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: FontSizes.md,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  captionText: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.md,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  captionUsername: {
    fontFamily: 'Inter-SemiBold',
    color: Colors.text,
  },
  commentsLink: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  timestamp: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.xs,
    color: Colors.textLight,
    textTransform: 'uppercase',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  commentInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.md,
    color: Colors.text,
    paddingVertical: Spacing.sm,
  },
  commentSubmit: {
    fontFamily: 'Inter-SemiBold',
    fontSize: FontSizes.md,
    color: Colors.primary,
  },
  commentSubmitDisabled: {
    opacity: 0.4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: FontSizes.xl,
    color: Colors.text,
  },
  emptySubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
});
