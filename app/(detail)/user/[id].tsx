import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ArrowLeft, Grid, Heart, Bookmark } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/Avatar';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { Colors, Spacing, FontSizes, Radius } from '@/lib/theme';
import type { Profile, Post } from '@/types/database';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile: myProfile } = useAuth();
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const fetchProfile = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    setUserProfile(data as Profile | null);
  };

  const fetchPosts = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false });
    setPosts(data as Post[] || []);
  };

  const fetchFollowData = async () => {
    if (!id || !myProfile) return;
    const [followers, following, myFollow] = await Promise.all([
      supabase.from('follows').select('id', { count: 'exact' }).eq('following_id', id),
      supabase.from('follows').select('id', { count: 'exact' }).eq('follower_id', id),
      supabase.from('follows').select('id').eq('follower_id', myProfile.id).eq('following_id', id).maybeSingle(),
    ]);
    setFollowerCount(followers.count || 0);
    setFollowingCount(following.count || 0);
    setIsFollowing(!!(myFollow as any).data);
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      fetchPosts();
      fetchFollowData();
    }, [id, myProfile?.id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchProfile(), fetchPosts(), fetchFollowData()]);
    setRefreshing(false);
  };

  const handleFollow = async () => {
    if (!myProfile || !userProfile) return;
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', myProfile.id).eq('following_id', userProfile.id);
      setIsFollowing(false);
      setFollowerCount(c => c - 1);
    } else {
      await supabase.from('follows').insert({ follower_id: myProfile.id, following_id: userProfile.id });
      setIsFollowing(true);
      setFollowerCount(c => c + 1);
      await supabase.from('notifications').insert({
        user_id: userProfile.id,
        actor_id: myProfile.id,
        type: 'follow',
      });
    }
  };

  if (!userProfile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const isOwnProfile = myProfile?.id === userProfile.id;

  const renderPost = ({ item }: { item: Post }) => (
    <Pressable style={styles.gridItem} onPress={() => router.push(`/post/${item.id}`)}>
      <Image source={{ uri: item.image_url }} style={styles.gridImage} resizeMode="cover" />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft color={Colors.text} size={24} strokeWidth={2} />
        </Pressable>
        <View style={styles.headerUsernameRow}>
          <Text style={styles.headerUsername}>{userProfile.username}</Text>
          {userProfile.is_verified && <VerifiedBadge size={16} />}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.profileInfo}>
        <Avatar uri={userProfile.avatar_url} size={86} username={userProfile.username} />
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{posts.length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{followerCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{followingCount}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>
      </View>

      <View style={styles.bioSection}>
        <Text style={styles.fullName}>{userProfile.full_name}</Text>
        <Text style={styles.bio}>{userProfile.bio || 'No bio yet'}</Text>
      </View>

      {!isOwnProfile && (
        <Pressable
          style={[styles.followButton, isFollowing && styles.followingButton]}
          onPress={handleFollow}
        >
          <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </Pressable>
      )}

      {isOwnProfile && (
        <Pressable style={styles.followButton} onPress={() => router.push('/(tabs)/profile')}>
          <Text style={styles.followButtonText}>My Profile</Text>
        </Pressable>
      )}

      <View style={styles.tabsRow}>
        <View style={styles.tabActive}>
          <Grid color={Colors.text} size={22} strokeWidth={2} />
        </View>
        <View style={styles.tabInactive}>
          <Bookmark color={Colors.textSecondary} size={22} strokeWidth={2} />
        </View>
      </View>

      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={renderPost}
        numColumns={3}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No posts yet</Text>
          </View>
        }
        contentContainerStyle={posts.length === 0 ? styles.gridEmpty : styles.grid}
      />
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerUsernameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerUsername: {
    fontFamily: 'Inter-SemiBold',
    fontSize: FontSizes.xl,
    color: Colors.text,
  },
  headerSpacer: {
    width: 24,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.xl,
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: 'Inter-Bold',
    fontSize: FontSizes.xl,
    color: Colors.text,
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  bioSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  fullName: {
    fontFamily: 'Inter-SemiBold',
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  bio: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.md,
    color: Colors.text,
    marginTop: 2,
    lineHeight: 20,
  },
  followButton: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  followButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  followingButtonText: {
    color: Colors.text,
  },
  tabsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tabActive: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 2,
    borderBottomColor: Colors.text,
  },
  tabInactive: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
  },
  grid: {
    paddingHorizontal: 2,
  },
  gridEmpty: {
    flex: 1,
  },
  gridItem: {
    margin: 2,
    flex: 1 / 3,
    aspectRatio: 1,
    borderRadius: Radius.sm,
    overflow: 'hidden' as any,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surfaceElevated,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: FontSizes.lg,
    color: Colors.textSecondary,
  },
});
