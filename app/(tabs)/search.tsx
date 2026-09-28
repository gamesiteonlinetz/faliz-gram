import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Search as SearchIcon, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/Avatar';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { Colors, Spacing, FontSizes, Radius, Shadows } from '@/lib/theme';
import type { Profile, Post } from '@/types/database';

export default function SearchScreen() {
  const { profile } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [discoverPosts, setDiscoverPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const fetchDiscover = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(24);
    setDiscoverPosts(data as Post[] || []);
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchDiscover();
    }, [])
  );

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${text.trim()}%`)
      .limit(20);
    setResults(data as Profile[] || []);
    setSearching(false);
  };

  const renderPost = ({ item }: { item: Post }) => (
    <Pressable
      style={styles.gridItem}
      onPress={() => router.push(`/post/${item.id}`)}
    >
      <Image source={{ uri: item.image_url }} style={styles.gridImage} resizeMode="cover" />
    </Pressable>
  );

  const renderUser = ({ item }: { item: Profile }) => (
    <Pressable
      style={styles.userRow}
      onPress={() => router.push(`/user/${item.id}`)}
    >
      <Avatar uri={item.avatar_url} size={48} username={item.username} />
      <View style={styles.userInfo}>
        <View style={styles.userUsernameRow}>
          <Text style={styles.userUsername}>{item.username}</Text>
          {item.is_verified && <VerifiedBadge size={14} />}
        </View>
        <Text style={styles.userFullName} numberOfLines={1}>
          {item.full_name}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <SearchIcon color={Colors.textSecondary} size={18} strokeWidth={2} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor={Colors.textSecondary}
          value={query}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <Pressable onPress={() => { setQuery(''); setResults([]); }} hitSlop={8}>
            <X color={Colors.textSecondary} size={18} strokeWidth={2} />
          </Pressable>
        )}
      </View>

      {query.trim() ? (
        searching ? (
          <ActivityIndicator style={styles.loader} color={Colors.primary} />
        ) : results.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={item => item.id}
            renderItem={renderUser}
            keyboardShouldPersistTaps="handled"
          />
        )
      ) : (
        <View style={styles.discoverSection}>
          <Text style={styles.sectionTitle}>Discover</Text>
          {loading ? (
            <ActivityIndicator style={styles.loader} color={Colors.primary} />
          ) : (
            <FlatList
              data={discoverPosts}
              keyExtractor={item => item.id}
              renderItem={renderPost}
              numColumns={3}
              scrollEnabled={false}
              contentContainerStyle={styles.grid}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    margin: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  loader: {
    marginTop: Spacing.xl,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  discoverSection: {
    flex: 1,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: FontSizes.xl,
    color: Colors.text,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  grid: {
    paddingHorizontal: 2,
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
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userUsernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  userUsername: {
    fontFamily: 'Inter-SemiBold',
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  userFullName: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
