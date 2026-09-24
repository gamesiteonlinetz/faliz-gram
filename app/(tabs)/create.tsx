import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Music2, Sparkles, Wand2, Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing, FontSizes, Radius } from '@/lib/theme';

const SAMPLE_IMAGES = [
  'https://images.pexels.com/photos/459225/pexels-photo-459225.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/36717/amazing-animal-beautiful-beautifull.jpg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/414612/pexels-photo-414612.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/34950/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/248797/pexels-photo-248797.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/206359/pexels-photo-206359.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/459793/pexels-photo-459793.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/531880/pexels-photo-531880.jpeg?auto=compress&cs=tinysrgb&w=800',
];

const SAMPLE_REELS = [
  { video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', thumbnail_url: 'https://images.pexels.com/photos/2387873/pexels-photo-2387873.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', thumbnail_url: 'https://images.pexels.com/photos/325185/pexels-photo-325185.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', thumbnail_url: 'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=800' },
  { video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', thumbnail_url: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800' },
];

const MUSIC_TRACKS = [
  { name: 'Original Audio', artist: 'You' },
  { name: 'Summer Vibes', artist: 'DJ Wave' },
  { name: 'Midnight Drive', artist: 'Neon Lights' },
  { name: 'Ocean Breeze', artist: 'Calm Collective' },
  { name: 'Electric Pulse', artist: 'Synth Master' },
  { name: 'Acoustic Dreams', artist: 'Guitar Soul' },
  { name: 'Urban Beats', artist: 'Hip Hop Nation' },
  { name: 'Lo-Fi Study', artist: 'Chillhop Cafe' },
];

const FILTERS = [
  { name: 'Normal', cssFilter: 'none' },
  { name: 'Vivid', cssFilter: 'saturate(1.6) contrast(1.1)' },
  { name: 'Warm', cssFilter: 'sepia(0.3) saturate(1.4) hue-rotate(-10deg)' },
  { name: 'Cool', cssFilter: 'hue-rotate(180deg) saturate(1.2) brightness(0.95)' },
  { name: 'Vintage', cssFilter: 'sepia(0.5) contrast(1.1) brightness(0.95) saturate(0.8)' },
  { name: 'B&W', cssFilter: 'grayscale(1) contrast(1.1)' },
  { name: 'Fade', cssFilter: 'contrast(0.85) brightness(1.1) saturate(0.7)' },
  { name: 'Drama', cssFilter: 'contrast(1.4) saturate(1.3) brightness(0.9)' },
];

type Mode = 'post' | 'reel' | 'story';

export default function CreateScreen() {
  const { profile } = useAuth();
  const [mode, setMode] = useState<Mode>('post');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedReel, setSelectedReel] = useState<typeof SAMPLE_REELS[0] | null>(null);
  const [caption, setCaption] = useState('');
  const [audioLabel, setAudioLabel] = useState('Original Audio');
  const [selectedMusic, setSelectedMusic] = useState(MUSIC_TRACKS[0]);
  const [selectedFilter, setSelectedFilter] = useState(0);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [posting, setPosting] = useState(false);

  const currentFilter = FILTERS[selectedFilter];

  const handlePost = async () => {
    if (!profile) return;
    if (mode === 'post' && !selectedImage) return;
    if (mode === 'reel' && !selectedReel) return;
    if (mode === 'story' && !selectedImage) return;
    setPosting(true);

    try {
      if (mode === 'post') {
        const { error } = await supabase.from('posts').insert({
          image_url: selectedImage,
          caption: caption.trim(),
        });
        if (error) throw error;
      } else if (mode === 'reel') {
        const { error } = await supabase.from('reels').insert({
          video_url: selectedReel!.video_url,
          thumbnail_url: selectedReel!.thumbnail_url,
          caption: caption.trim(),
          audio_label: selectedMusic.name === 'Original Audio' ? 'Original audio' : `${selectedMusic.name} - ${selectedMusic.artist}`,
        });
        if (error) throw error;
      } else if (mode === 'story') {
        const { error } = await supabase.from('stories').insert({
          image_url: selectedImage,
        });
        if (error) throw error;
      }
    } catch {
      Alert.alert('Could not share', 'Please try again.');
      setPosting(false);
      return;
    }

    setPosting(false);
    setCaption('');
    setSelectedImage(null);
    setSelectedReel(null);
    setSelectedFilter(0);
    setSelectedMusic(MUSIC_TRACKS[0]);
    router.push('/(tabs)');
  };

  if (!profile) return null;

  const hasMedia = (mode === 'post' && selectedImage) || (mode === 'reel' && selectedReel) || (mode === 'story' && selectedImage);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          New {mode === 'post' ? 'Post' : mode === 'reel' ? 'Reel' : 'Story'}
        </Text>
        <Pressable onPress={handlePost} disabled={posting || !hasMedia}>
          <Text style={[styles.postText, (posting || !hasMedia) && styles.postTextDisabled]}>
            {posting ? 'Sharing...' : 'Share'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.modeTabs}>
        {(['post', 'reel', 'story'] as Mode[]).map(tab => (
          <Pressable
            key={tab}
            onPress={() => { setMode(tab); setSelectedImage(null); setSelectedReel(null); setShowFilters(false); setShowMusicPicker(false); }}
            style={[styles.modeTab, mode === tab && styles.modeTabActive]}
          >
            <Text style={[styles.modeTabText, mode === tab && styles.modeTabTextActive]}>
              {tab === 'post' ? 'Post' : tab === 'reel' ? 'Reel' : 'Story'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {mode === 'post' || mode === 'story' ? (
          selectedImage ? (
            <View style={styles.previewWrapper}>
              <Image
                source={{ uri: selectedImage }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <View style={styles.filterBadgeRow}>
                <Text style={styles.filterBadgeText}>{currentFilter.name}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>
                {mode === 'story' ? 'Select a photo for your story' : 'Select a photo below'}
              </Text>
            </View>
          )
        ) : (
          selectedReel ? (
            <View style={styles.previewWrapper}>
              <Image source={{ uri: selectedReel.thumbnail_url }} style={styles.previewImage} resizeMode="cover" />
              <View style={styles.reelBadge}>
                <Text style={styles.reelBadgeText}>Reel</Text>
              </View>
              {selectedMusic.name !== 'Original Audio' && (
                <View style={styles.musicBadge}>
                  <Music2 color={Colors.white} size={12} />
                  <Text style={styles.musicBadgeText} numberOfLines={1}>{selectedMusic.name}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>Select a video below</Text>
            </View>
          )
        )}

        {hasMedia && mode !== 'story' && (
          <TextInput
            style={styles.captionInput}
            placeholder="Write a caption..."
            placeholderTextColor={Colors.textSecondary}
            value={caption}
            onChangeText={setCaption}
            multiline
            textAlignVertical="top"
          />
        )}

        {hasMedia && (mode === 'post' || mode === 'story') && (
          <Pressable style={styles.toolButton} onPress={() => setShowFilters(!showFilters)}>
            <Wand2 color={Colors.primary} size={18} />
            <Text style={styles.toolButtonText}>Filters</Text>
            <Text style={styles.toolBadge}>{currentFilter.name}</Text>
          </Pressable>
        )}

        {hasMedia && showFilters && (mode === 'post' || mode === 'story') && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {FILTERS.map((filter, idx) => (
              <Pressable
                key={idx}
                style={styles.filterItem}
                onPress={() => setSelectedFilter(idx)}
              >
                <View style={[styles.filterThumb, selectedFilter === idx && styles.filterThumbSelected]}>
                  {selectedImage && (
                    <Image
                      source={{ uri: selectedImage }}
                      style={styles.filterThumbImage}
                      resizeMode="cover"
                    />
                  )}
                  {selectedFilter === idx && (
                    <View style={styles.filterCheck}>
                      <Check color={Colors.white} size={14} strokeWidth={3} />
                    </View>
                  )}
                </View>
                <Text style={[styles.filterName, selectedFilter === idx && styles.filterNameSelected]}>
                  {filter.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {hasMedia && mode === 'reel' && (
          <>
            <Pressable style={styles.toolButton} onPress={() => setShowMusicPicker(!showMusicPicker)}>
              <Music2 color={Colors.primary} size={18} />
              <Text style={styles.toolButtonText}>Music</Text>
              <Text style={styles.toolBadge} numberOfLines={1}>
                {selectedMusic.name === 'Original Audio' ? 'Original' : selectedMusic.name}
              </Text>
            </Pressable>

            {showMusicPicker && (
              <View style={styles.musicList}>
                {MUSIC_TRACKS.map((track, idx) => (
                  <Pressable
                    key={idx}
                    style={[styles.musicItem, selectedMusic.name === track.name && styles.musicItemSelected]}
                    onPress={() => { setSelectedMusic(track); setShowMusicPicker(false); }}
                  >
                    <View style={styles.musicIcon}>
                      <Sparkles color={Colors.primary} size={16} />
                    </View>
                    <View style={styles.musicInfo}>
                      <Text style={styles.musicName}>{track.name}</Text>
                      <Text style={styles.musicArtist}>{track.artist}</Text>
                    </View>
                    {selectedMusic.name === track.name && <Check color={Colors.primary} size={18} />}
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}

        <Text style={styles.sectionLabel}>
          {mode === 'story' ? 'Choose a photo' : mode === 'post' ? 'Choose a photo' : 'Choose a video'}
        </Text>

        {mode === 'reel' ? (
          <View style={styles.imageGrid}>
            {SAMPLE_REELS.map((reel, idx) => (
              <Pressable
                key={idx}
                onPress={() => setSelectedReel(reel)}
                style={[styles.gridItem, selectedReel?.video_url === reel.video_url && styles.gridItemSelected]}
              >
                <Image source={{ uri: reel.thumbnail_url }} style={styles.gridImage} resizeMode="cover" />
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.imageGrid}>
            {SAMPLE_IMAGES.map((uri, idx) => (
              <Pressable
                key={idx}
                onPress={() => setSelectedImage(uri)}
                style={[styles.gridItem, selectedImage === uri && styles.gridItemSelected]}
              >
                <Image source={{ uri }} style={styles.gridImage} resizeMode="cover" />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {posting && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontFamily: 'Inter-SemiBold', fontSize: FontSizes.lg, color: Colors.text },
  cancelText: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, color: Colors.text },
  postText: { fontFamily: 'Inter-SemiBold', fontSize: FontSizes.md, color: Colors.primary },
  postTextDisabled: { opacity: 0.4 },
  modeTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border },
  modeTab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center' },
  modeTabActive: { borderBottomWidth: 2, borderBottomColor: Colors.text },
  modeTabText: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, color: Colors.textSecondary },
  modeTabTextActive: { fontFamily: 'Inter-SemiBold', color: Colors.text },
  content: { padding: Spacing.lg },
  previewWrapper: { position: 'relative', marginBottom: Spacing.md },
  previewImage: { width: '100%', aspectRatio: 1, borderRadius: Radius.md, backgroundColor: Colors.surface, overflow: 'hidden' as any },
  placeholderImage: { width: '100%', aspectRatio: 1, borderRadius: Radius.md, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  placeholderText: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, color: Colors.textSecondary },
  captionInput: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, minHeight: 80, marginBottom: Spacing.md, color: Colors.text },
  toolButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.sm },
  toolButtonText: { fontFamily: 'Inter-SemiBold', fontSize: FontSizes.md, color: Colors.text },
  toolBadge: { fontFamily: 'Inter-Regular', fontSize: FontSizes.sm, color: Colors.primary, marginLeft: 'auto' },
  filterScroll: { marginBottom: Spacing.md },
  filterItem: { alignItems: 'center', marginRight: Spacing.md },
  filterThumb: { width: 72, height: 72, borderRadius: Radius.md, overflow: 'hidden' as any, borderWidth: 2, borderColor: 'transparent', position: 'relative' },
  filterThumbSelected: { borderColor: Colors.primary },
  filterThumbImage: { width: '100%', height: '100%' },
  filterCheck: { position: 'absolute', bottom: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  filterName: { fontFamily: 'Inter-Regular', fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 4 },
  filterNameSelected: { fontFamily: 'Inter-SemiBold', color: Colors.text },
  musicList: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, marginBottom: Spacing.md, overflow: 'hidden' as any },
  musicItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth || 0.5, borderBottomColor: Colors.border },
  musicItemSelected: { backgroundColor: '#EAF5FF' },
  musicIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  musicInfo: { flex: 1 },
  musicName: { fontFamily: 'Inter-SemiBold', fontSize: FontSizes.md, color: Colors.text },
  musicArtist: { fontFamily: 'Inter-Regular', fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: 2 },
  filterBadgeRow: { position: 'absolute', bottom: Spacing.sm, right: Spacing.sm, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  filterBadgeText: { color: Colors.white, fontFamily: 'Inter-SemiBold', fontSize: FontSizes.xs },
  reelBadge: { position: 'absolute', top: Spacing.sm, left: Spacing.sm, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  reelBadgeText: { color: Colors.white, fontFamily: 'Inter-SemiBold', fontSize: FontSizes.xs },
  musicBadge: { position: 'absolute', bottom: Spacing.sm, left: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  musicBadgeText: { color: Colors.white, fontFamily: 'Inter-SemiBold', fontSize: FontSizes.xs },
  sectionLabel: { fontFamily: 'Inter-SemiBold', fontSize: FontSizes.md, color: Colors.text, marginBottom: Spacing.sm },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  gridItem: { width: '31%', aspectRatio: 1, borderRadius: Radius.sm, overflow: 'hidden' as any },
  gridItemSelected: { borderWidth: 3, borderColor: Colors.primary },
  gridImage: { width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject as any, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center' },
});
