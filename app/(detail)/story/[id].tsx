import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ArrowLeft, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/Avatar';
import { Colors, Spacing, FontSizes, Radius } from '@/lib/theme';
import type { Story, Profile } from '@/types/database';

export default function StoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [stories, setStories] = useState<Story[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const fetchStories = async () => {
    if (!id) return;
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    setProfile(profileData as Profile | null);

    const { data: storyData } = await supabase
      .from('stories')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: true });
    setStories(storyData as Story[] || []);
  };

  useFocusEffect(
    useCallback(() => {
      fetchStories();
      setCurrentIndex(0);
    }, [id])
  );

  useEffect(() => {
    if (stories.length === 0) return;
    const timer = setTimeout(() => {
      if (currentIndex < stories.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        router.back();
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [currentIndex, stories.length]);

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'now';
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  if (stories.length === 0) {
    return (
      <View style={styles.container}>
        <Pressable style={styles.closeButton} onPress={() => router.back()} hitSlop={8}>
          <X color={Colors.white} size={28} strokeWidth={2} />
        </Pressable>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No stories available</Text>
        </View>
      </View>
    );
  }

  const currentStory = stories[currentIndex];

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: currentStory.image_url }}
        style={StyleSheet.absoluteFillObject as any}
        resizeMode="cover"
      />
      <View style={styles.overlay} />

      <View style={styles.progressContainer}>
        {stories.map((_, idx) => (
          <View key={idx} style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: idx <= currentIndex ? '100%' : '0%' }]} />
          </View>
        ))}
      </View>

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ArrowLeft color={Colors.white} size={24} strokeWidth={2} />
          </Pressable>
          <Avatar uri={profile?.avatar_url ?? null} size={32} username={profile?.username} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerUsername}>{profile?.username ?? 'Story'}</Text>
            <Text style={styles.headerTime}>
              {formatTime(currentStory.created_at)}
            </Text>
          </View>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <X color={Colors.white} size={24} strokeWidth={2} />
        </Pressable>
      </View>

      <View style={styles.tapZone}>
        <Pressable
          style={styles.tapLeft}
          onPress={() => currentIndex > 0 && setCurrentIndex(currentIndex - 1)}
        />
        <Pressable
          style={styles.tapRight}
          onPress={() =>
            currentIndex < stories.length - 1
              ? setCurrentIndex(currentIndex + 1)
              : router.back()
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject as any,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.xl + 4,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'hidden' as any,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.white,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerInfo: {
    gap: 1,
  },
  headerUsername: {
    fontFamily: 'Inter-SemiBold',
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  headerTime: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.7)',
  },
  tapZone: {
    flex: 1,
    flexDirection: 'row',
  },
  tapLeft: {
    flex: 1,
  },
  tapRight: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
});
