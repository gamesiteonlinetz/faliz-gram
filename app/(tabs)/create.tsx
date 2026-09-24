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

type Mode = 'post' | 'reel';

export default function CreateScreen() {
  const { profile } = useAuth();
  const [mode, setMode] = useState<Mode>('post');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedReel, setSelectedReel] = useState<typeof SAMPLE_REELS[0] | null>(null);
  const [caption, setCaption] = useState('');
  const [audioLabel, setAudioLabel] = useState('Original audio');
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!profile) return;
    if (mode === 'post' && !selectedImage) return;
    if (mode === 'reel' && !selectedReel) return;
    setPosting(true);

    if (mode === 'post') {
      const { error } = await supabase.from('posts').insert({
        image_url: selectedImage,
        caption: caption.trim(),
      });
      setPosting(false);
      if (error) {
        Alert.alert('Could not create post', 'Please try again.');
        return;
      }
    } else {
      const { error } = await supabase.from('reels').insert({
        video_url: selectedReel!.video_url,
        thumbnail_url: selectedReel!.thumbnail_url,
        caption: caption.trim(),
        audio_label: audioLabel.trim() || 'Original audio',
      });
      setPosting(false);
      if (error) {
        Alert.alert('Could not create reel', 'Please try again.');
        return;
      }
    }

    setCaption('');
    setSelectedImage(null);
    setSelectedReel(null);
    router.push('/(tabs)');
  };

  if (!profile) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>New {mode === 'post' ? 'Post' : 'Reel'}</Text>
        <Pressable onPress={handlePost} disabled={posting || (mode === 'post' ? !selectedImage : !selectedReel)}>
          <Text style={[styles.postText, (posting || (mode === 'post' ? !selectedImage : !selectedReel)) && styles.postTextDisabled]}>
            {posting ? 'Sharing...' : 'Share'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.modeTabs}>
        <Pressable onPress={() => setMode('post')} style={[styles.modeTab, mode === 'post' && styles.modeTabActive]}>
          <Text style={[styles.modeTabText, mode === 'post' && styles.modeTabTextActive]}>Post</Text>
        </Pressable>
        <Pressable onPress={() => setMode('reel')} style={[styles.modeTab, mode === 'reel' && styles.modeTabActive]}>
          <Text style={[styles.modeTabText, mode === 'reel' && styles.modeTabTextActive]}>Reel</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {mode === 'post' ? (
          selectedImage ? (
            <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>Select a photo below</Text>
            </View>
          )
        ) : (
          selectedReel ? (
            <View style={styles.previewImage}>
              <Image source={{ uri: selectedReel.thumbnail_url }} style={styles.previewImage} resizeMode="cover" />
              <View style={styles.reelBadge}>
                <Text style={styles.reelBadgeText}>Reel</Text>
              </View>
            </View>
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>Select a video below</Text>
            </View>
          )
        )}

        {((mode === 'post' && selectedImage) || (mode === 'reel' && selectedReel)) && (
          <>
            <TextInput
              style={styles.captionInput}
              placeholder="Write a caption..."
              placeholderTextColor={Colors.textSecondary}
              value={caption}
              onChangeText={setCaption}
              multiline
              textAlignVertical="top"
            />
            {mode === 'reel' && (
              <TextInput
                style={styles.audioInput}
                placeholder="Audio name (optional)"
                placeholderTextColor={Colors.textSecondary}
                value={audioLabel}
                onChangeText={setAudioLabel}
              />
            )}
          </>
        )}

        <Text style={styles.sectionLabel}>
          {mode === 'post' ? 'Choose a photo' : 'Choose a video'}
        </Text>

        {mode === 'post' ? (
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
        ) : (
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
  previewImage: { width: '100%', aspectRatio: 1, borderRadius: Radius.md, marginBottom: Spacing.md, backgroundColor: Colors.surface, overflow: 'hidden' as any },
  placeholderImage: { width: '100%', aspectRatio: 1, borderRadius: Radius.md, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  placeholderText: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, color: Colors.textSecondary },
  captionInput: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, minHeight: 80, marginBottom: Spacing.md, color: Colors.text },
  audioInput: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginBottom: Spacing.lg, color: Colors.text },
  sectionLabel: { fontFamily: 'Inter-SemiBold', fontSize: FontSizes.md, color: Colors.text, marginBottom: Spacing.sm },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  gridItem: { width: '31%', aspectRatio: 1, borderRadius: Radius.sm, overflow: 'hidden' as any },
  gridItemSelected: { borderWidth: 3, borderColor: Colors.primary },
  gridImage: { width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject as any, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center' },
  reelBadge: { position: 'absolute', top: Spacing.sm, left: Spacing.sm, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  reelBadgeText: { color: Colors.white, fontFamily: 'Inter-SemiBold', fontSize: FontSizes.xs },
});
