import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image, Pressable, RefreshControl } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, MessageCircle, Send, MoreVertical, Music2, Plus } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/Avatar';
import { Colors, Spacing, FontSizes, Radius } from '@/lib/theme';
import type { Profile, Reel } from '@/types/database';

interface ReelWithProfile extends Reel {
  profiles: Profile | null;
  like_count: number;
  has_liked: boolean;
}

const fallbackThumbnails = [
  'https://images.pexels.com/photos/2387873/pexels-photo-2387873.jpeg?auto=compress&cs=tinysrgb&w=900',
  'https://images.pexels.com/photos/325185/pexels-photo-325185.jpeg?auto=compress&cs=tinysrgb&w=900',
  'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=900',
];

export default function ReelsScreen() {
  const { profile } = useAuth();
  const [reels, setReels] = useState<ReelWithProfile[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReels = async () => {
    const { data } = await supabase
      .from('reels')
      .select('*, profiles:user_id (id, username, full_name, avatar_url, bio, created_at)')
      .order('created_at', { ascending: false })
      .limit(30);

    if (!data) {
      setReels([]);
      return;
    }

    const enriched = await Promise.all(data.map(async (reel: any, index: number) => {
      const [likes, liked] = await Promise.all([
        supabase.from('likes').select('id', { count: 'exact' }).eq('post_id', reel.id),
        profile
          ? supabase.from('likes').select('id').eq('post_id', reel.id).eq('user_id', profile.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      return {
        ...reel,
        thumbnail_url: reel.thumbnail_url || fallbackThumbnails[index % fallbackThumbnails.length],
        like_count: likes.count || 0,
        has_liked: !!liked.data,
      } as ReelWithProfile;
    }));
    setReels(enriched);
  };

  useFocusEffect(useCallback(() => {
    fetchReels();
  }, [profile?.id]));

  const toggleLike = async (reel: ReelWithProfile) => {
    if (!profile) return;
    if (reel.has_liked) {
      setReels(current => current.map(item => item.id === reel.id
        ? { ...item, has_liked: false, like_count: Math.max(0, item.like_count - 1) }
        : item));
      await supabase.from('likes').delete().eq('post_id', reel.id).eq('user_id', profile.id);
      return;
    }
    setReels(current => current.map(item => item.id === reel.id
      ? { ...item, has_liked: true, like_count: item.like_count + 1 }
      : item));
    await supabase.from('likes').insert({ post_id: reel.id, user_id: profile.id });
  };

  const renderReel = ({ item }: { item: ReelWithProfile }) => (
    <View style={styles.reel}>
      <Image source={{ uri: item.thumbnail_url || fallbackThumbnails[0] }} style={styles.media} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(0,0,0,0.15)', 'transparent', 'rgba(0,0,0,0.5)']}
        style={styles.scrim}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <View style={styles.topBar}>
        <Text style={styles.title}>Reels</Text>
        <Pressable onPress={() => router.push('/(tabs)/create')} hitSlop={8}>
          <Plus color={Colors.white} size={26} />
        </Pressable>
      </View>
      <View style={styles.creatorRow}>
        <Avatar uri={item.profiles?.avatar_url ?? null} size={36} username={item.profiles?.username} />
        <Pressable onPress={() => item.profiles && router.push(`/user/${item.profiles.id}`)}>
          <Text style={styles.username}>{item.profiles?.username || 'creator'}</Text>
        </Pressable>
        <Pressable style={styles.followButton}>
          <Text style={styles.followText}>Follow</Text>
        </Pressable>
      </View>
      <View style={styles.captionBlock}>
        <Text style={styles.caption} numberOfLines={2}>{item.caption || 'A new moment on Faliz Gram'}</Text>
        <View style={styles.audioRow}>
          <Music2 color={Colors.white} size={13} />
          <Text style={styles.audioText}>{item.audio_label}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={() => toggleLike(item)} hitSlop={8}>
          <Heart color={Colors.white} size={28} fill={item.has_liked ? Colors.error : 'none'} strokeWidth={item.has_liked ? 0 : 2} />
          <Text style={styles.actionText}>{item.like_count}</Text>
        </Pressable>
        <Pressable style={styles.action} hitSlop={8}>
          <MessageCircle color={Colors.white} size={28} strokeWidth={2} />
          <Text style={styles.actionText}>Comment</Text>
        </Pressable>
        <Pressable style={styles.action} hitSlop={8}>
          <Send color={Colors.white} size={28} strokeWidth={2} />
          <Text style={styles.actionText}>Share</Text>
        </Pressable>
        <MoreVertical color={Colors.white} size={26} />
      </View>
    </View>
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReels();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={reels}
        keyExtractor={item => item.id}
        renderItem={renderReel}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.white} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Music2 color={Colors.primary} size={32} /></View>
            <Text style={styles.emptyTitle}>Your Reels feed</Text>
            <Text style={styles.emptyText}>Create your first short video and it will appear here.</Text>
            <Pressable style={styles.emptyButton} onPress={() => router.push('/(tabs)/create')}>
              <Text style={styles.emptyButtonText}>Create a Reel</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  reel: { height: 650, backgroundColor: Colors.black, position: 'relative', justifyContent: 'flex-end' },
  media: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  scrim: { ...StyleSheet.absoluteFillObject },
  topBar: { position: 'absolute', top: Spacing.lg, left: Spacing.lg, right: Spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: Colors.white, fontFamily: 'Inter-Bold', fontSize: FontSizes.xxl },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  username: { color: Colors.white, fontFamily: 'Inter-SemiBold', fontSize: FontSizes.md },
  followButton: { borderWidth: 1, borderColor: Colors.white, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 4 },
  followText: { color: Colors.white, fontFamily: 'Inter-SemiBold', fontSize: FontSizes.sm },
  captionBlock: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, paddingRight: 92 },
  caption: { color: Colors.white, fontFamily: 'Inter-Regular', fontSize: FontSizes.md, lineHeight: 21 },
  audioRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm },
  audioText: { color: 'rgba(255,255,255,0.85)', fontFamily: 'Inter-Regular', fontSize: FontSizes.sm },
  actions: { position: 'absolute', right: Spacing.lg, bottom: 70, alignItems: 'center', gap: Spacing.lg },
  action: { alignItems: 'center', gap: 4 },
  actionText: { color: Colors.white, fontFamily: 'Inter-Regular', fontSize: FontSizes.xs },
  empty: { flex: 1, minHeight: 600, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: Spacing.xxl },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  emptyTitle: { fontFamily: 'Inter-Bold', fontSize: FontSizes.xxl, color: Colors.text },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 21 },
  emptyButton: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.lg, marginTop: Spacing.xl },
  emptyButtonText: { color: Colors.white, fontFamily: 'Inter-SemiBold', fontSize: FontSizes.md },
});
