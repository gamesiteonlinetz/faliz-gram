import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Heart, MessageCircle, Send, ArrowLeft, Bookmark } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/Avatar';
import { UsernameWithBadge } from '@/components/VerifiedBadge';
import { Colors, Spacing, FontSizes, Radius } from '@/lib/theme';
import type { PostWithProfile, Comment, Profile } from '@/types/database';

interface CommentWithProfile extends Comment {
  profiles: Profile | null;
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const [post, setPost] = useState<PostWithProfile | null>(null);
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPost = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (
          id, username, full_name, avatar_url, bio, created_at, is_verified, verification_type
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (!data) return;

    const [likeCount, userLike] = await Promise.all([
      supabase.from('likes').select('id', { count: 'exact' }).eq('post_id', id),
      profile
        ? supabase.from('likes').select('id').eq('post_id', id).eq('user_id', profile.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    setPost({
      ...data,
      profiles: (data as any).profiles,
      like_count: likeCount.count || 0,
      comment_count: 0,
      has_liked: !!(userLike as any).data,
    } as PostWithProfile);
    setLoading(false);
  };

  const fetchComments = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('comments')
      .select(`
        *,
        profiles:user_id (
          id, username, full_name, avatar_url, bio, created_at, is_verified, verification_type
        )
      `)
      .eq('post_id', id)
      .order('created_at', { ascending: true });

    setComments((data as any) || []);
  };

  useFocusEffect(
    useCallback(() => {
      fetchPost();
      fetchComments();
    }, [id, profile?.id])
  );

  const handleLike = async () => {
    if (!post || !profile) return;
    if (post.has_liked) {
      setPost({ ...post, has_liked: false, like_count: post.like_count - 1 });
      await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', profile.id);
    } else {
      setPost({ ...post, has_liked: true, like_count: post.like_count + 1 });
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

  const handleSubmitComment = async () => {
    if (!profile || !post || !commentText.trim()) return;
    await supabase.from('comments').insert({ post_id: post.id, text: commentText.trim() });
    if (post.user_id !== profile.id) {
      await supabase.from('notifications').insert({
        user_id: post.user_id,
        actor_id: profile.id,
        type: 'comment',
        post_id: post.id,
        text: commentText.trim(),
      });
    }
    setCommentText('');
    fetchComments();
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

  const renderComment = ({ item }: { item: CommentWithProfile }) => (
    <View style={styles.commentRow}>
      <Avatar
        uri={item.profiles?.avatar_url ?? null}
        size={32}
        username={item.profiles?.username}
        onPress={() => item.profiles && router.push(`/user/${item.profiles.id}`)}
      />
      <View style={styles.commentContent}>
        <Text style={styles.commentText}>
          <Text style={styles.commentUsername}>{item.profiles?.username}</Text>{' '}
          {item.text}
        </Text>
        <Text style={styles.commentTime}>{formatTime(item.created_at)}</Text>
      </View>
      <Pressable hitSlop={8}>
        <Heart color={Colors.textLight} size={14} strokeWidth={2} />
      </Pressable>
    </View>
  );

  if (loading || !post) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft color={Colors.text} size={24} strokeWidth={2} />
        </Pressable>
        <Pressable
          style={styles.headerUser}
          onPress={() => post.profiles && router.push(`/user/${post.profiles.id}`)}
        >
          <Avatar
            uri={post.profiles?.avatar_url ?? null}
            size={32}
            username={post.profiles?.username}
          />
          <UsernameWithBadge
            username={post.profiles?.username ?? 'Post'}
            isVerified={post.profiles?.is_verified}
            fontSize={FontSizes.md}
          />
        </Pressable>
      </View>

      <FlatList
        data={comments}
        keyExtractor={item => item.id}
        renderItem={renderComment}
        ListHeaderComponent={
          <View style={styles.postSection}>
            <Image source={{ uri: post.image_url }} style={styles.postImage} resizeMode="cover" />
            <View style={styles.postActions}>
              <Pressable onPress={handleLike} hitSlop={8}>
                <Heart
                  color={post.has_liked ? Colors.error : Colors.text}
                  size={26}
                  fill={post.has_liked ? Colors.error : 'none'}
                  strokeWidth={post.has_liked ? 0 : 2}
                />
              </Pressable>
              <Pressable hitSlop={8}>
                <MessageCircle color={Colors.text} size={26} strokeWidth={2} />
              </Pressable>
              <Pressable hitSlop={8}>
                <Send color={Colors.text} size={26} strokeWidth={2} />
              </Pressable>
              <View style={styles.actionSpacer} />
              <Pressable hitSlop={8}>
                <Bookmark color={Colors.text} size={26} strokeWidth={2} />
              </Pressable>
            </View>
            {post.like_count > 0 && (
              <Text style={styles.likesText}>
                {post.like_count} {post.like_count === 1 ? 'like' : 'likes'}
              </Text>
            )}
            {post.caption && (
              <Text style={styles.captionText}>
                <Text style={styles.captionUsername}>{post.profiles?.username}</Text>{' '}
                {post.caption}
              </Text>
            )}
            <Text style={styles.timestamp}>{formatTime(post.created_at)}</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.noComments}>
            <Text style={styles.noCommentsText}>No comments yet</Text>
            <Text style={styles.noCommentsSubtext}>Be the first to comment</Text>
          </View>
        }
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'}>
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            placeholderTextColor={Colors.textSecondary}
            value={commentText}
            onChangeText={setCommentText}
          />
          <Pressable onPress={handleSubmitComment} disabled={!commentText.trim()} hitSlop={8}>
            <Text style={[styles.commentSubmit, !commentText.trim() && styles.commentSubmitDisabled]}>
              Post
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  flex: 1,
  },
  postSection: {
    paddingBottom: Spacing.md,
  },
  postImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.surfaceElevated,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  actionSpacer: {
    flex: 1,
  },
  likesText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: FontSizes.md,
    color: Colors.text,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  captionText: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.md,
    color: Colors.text,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
  captionUsername: {
    fontFamily: 'Inter-SemiBold',
    color: Colors.text,
  },
  timestamp: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.xs,
    color: Colors.textLight,
    paddingHorizontal: Spacing.sm,
    textTransform: 'uppercase',
  },
  commentRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  commentContent: {
    flex: 1,
  },
  commentText: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.md,
    color: Colors.text,
    lineHeight: 19,
  },
  commentUsername: {
    fontFamily: 'Inter-SemiBold',
    color: Colors.text,
  },
  commentTime: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  noComments: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  noCommentsText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  noCommentsSubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  commentInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.round,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.surface,
  },
  commentSubmit: {
    fontFamily: 'Inter-SemiBold',
    fontSize: FontSizes.md,
    color: Colors.primary,
  },
  commentSubmitDisabled: {
    opacity: 0.4,
  },
});
