import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Image,
  RefreshControl,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings, Grid, Heart, LogOut, Bookmark, Menu } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/Avatar';
import { Colors, Spacing, FontSizes, Radius, Shadows } from '@/lib/theme';
import type { Post, SavedPost } from '@/types/database';

export default function ProfileScreen() {
  const { profile, signOut, refreshProfile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPosts = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    setPosts(data as Post[] || []);
  };

  const fetchStats = async () => {
    if (!profile) return;
    const [followers, following] = await Promise.all([
      supabase.from('follows').select('id', { count: 'exact' }).eq('following_id', profile.id),
      supabase.from('follows').select('id', { count: 'exact' }).eq('follower_id', profile.id),
    ]);
    setFollowerCount(followers.count || 0);
    setFollowingCount(following.count || 0);
  };

  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [profileTab, setProfileTab] = useState<'posts' | 'saved'>('posts');
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);

  const fetchSaved = async () => {
    if (!profile) return;
    const { data } = await supabase.from('saved_posts').select('post_id, posts:post_id (*)').eq('user_id', profile.id).order('created_at', { ascending: false });
    setSavedPosts((data as any || []).map((item: any) => item.posts).filter(Boolean) as Post[]);
  };

  useFocusEffect(
    useCallback(() => {
      if (profile) {
        fetchPosts();
        fetchStats();
        fetchSaved();
      }
    }, [profile?.id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchPosts(), fetchStats(), fetchSaved()]);
    setRefreshing(false);
  };

  const openEdit = () => {
    setEditFullName(profile?.full_name ?? '');
    setEditBio(profile?.bio ?? '');
    setEditAvatar(profile?.avatar_url ?? '');
    setEditModal(true);
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editFullName,
        bio: editBio,
        avatar_url: editAvatar || null,
      })
      .eq('id', profile.id);

    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    await refreshProfile();
    setEditModal(false);
  };

  const handleSignOut = () => {
    router.push('/settings');
  };

  if (!profile) return null;

  const renderPost = ({ item }: { item: Post }) => (
    <Pressable
      style={styles.gridItem}
      onPress={() => router.push(`/post/${item.id}`)}
    >
      <Image source={{ uri: item.image_url }} style={styles.gridImage} resizeMode="cover" />
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerUsername}>{profile.username}</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
            <Menu color={Colors.text} size={26} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      <View style={styles.profileInfo}>
        <Avatar uri={profile.avatar_url} size={86} username={profile.username} />
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
        <Text style={styles.fullName}>{profile.full_name}</Text>
        <Text style={styles.bio}>{profile.bio || 'No bio yet'}</Text>
      </View>

      <Pressable style={styles.editButton} onPress={openEdit}>
        <Text style={styles.editButtonText}>Edit Profile</Text>
      </Pressable>

      <View style={styles.tabsRow}>
        <Pressable style={[styles.tabItem, profileTab === 'posts' && styles.tabActive]} onPress={() => setProfileTab('posts')}>
          <Grid color={profileTab === 'posts' ? Colors.text : Colors.textSecondary} size={22} strokeWidth={2} />
        </Pressable>
        <Pressable style={[styles.tabItem, profileTab === 'saved' && styles.tabActive]} onPress={() => setProfileTab('saved')}>
          <Bookmark color={profileTab === 'saved' ? Colors.text : Colors.textSecondary} size={22} strokeWidth={2} />
        </Pressable>
      </View>

      <FlatList
        data={profileTab === 'posts' ? posts : savedPosts}
        keyExtractor={item => item.id}
        renderItem={renderPost}
        numColumns={3}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{profileTab === 'posts' ? 'No posts yet' : 'No saved posts'}</Text>
            {profileTab === 'posts' ? (
              <Pressable onPress={() => router.push('/(tabs)/create')}>
                <Text style={styles.emptyLink}>Share your first post</Text>
              </Pressable>
            ) : (
              <Text style={styles.emptySubtext}>Tap the bookmark icon on any post to save it here</Text>
            )}
          </View>
        }
        contentContainerStyle={posts.length === 0 ? styles.gridEmpty : styles.grid}
      />

      <Modal visible={editModal} animationType="slide" transparent={false}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setEditModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <Pressable onPress={handleSave} disabled={saving}>
              <Text style={[styles.modalSave, saving && styles.modalSaveDisabled]}>
                {saving ? 'Saving...' : 'Done'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.modalLabel}>Avatar URL</Text>
            <TextInput
              style={styles.modalInput}
              value={editAvatar}
              onChangeText={setEditAvatar}
              placeholder="Paste image URL"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {editAvatar ? (
              <Image source={{ uri: editAvatar }} style={styles.modalAvatarPreview} resizeMode="cover" />
            ) : null}

            <Text style={styles.modalLabel}>Full Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editFullName}
              onChangeText={setEditFullName}
              placeholder="Your name"
              placeholderTextColor={Colors.textSecondary}
            />

            <Text style={styles.modalLabel}>Bio</Text>
            <TextInput
              style={[styles.modalInput, styles.modalBioInput]}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Write something about yourself"
              placeholderTextColor={Colors.textSecondary}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>
      </Modal>
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
  headerUsername: {
    fontFamily: 'Inter-SemiBold',
    fontSize: FontSizes.xl,
    color: Colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.lg,
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
  editButton: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
  },
  editButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  tabsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
  },
  tabActive: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 2,
    borderBottomColor: Colors.text,
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
  emptyLink: {
    fontFamily: 'Inter-SemiBold',
    fontSize: FontSizes.md,
    color: Colors.primary,
    marginTop: Spacing.sm,
  },
  emptySubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalCancel: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  modalTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: FontSizes.lg,
    color: Colors.text,
  },
  modalSave: {
    fontFamily: 'Inter-SemiBold',
    fontSize: FontSizes.md,
    color: Colors.primary,
  },
  modalSaveDisabled: {
    opacity: 0.4,
  },
  modalBody: {
    padding: Spacing.lg,
  },
  modalLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
  },
  modalInput: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  modalBioInput: {
    minHeight: 80,
  },
  modalAvatarPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginTop: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
  },
});
