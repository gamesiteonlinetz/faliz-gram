import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Image,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Heart, MessageCircle, UserPlus } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/Avatar';
import { Colors, Spacing, FontSizes, Radius } from '@/lib/theme';
import type { NotificationWithActor } from '@/types/database';

export default function NotificationsScreen() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationWithActor[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('notifications')
      .select(`
        *,
        actor:actor_id (
          id, username, full_name, avatar_url, bio, created_at
        )
      `)
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50);

    setNotifications((data as any) || []);
  };

  const markAllRead = async () => {
    if (!profile) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', profile.id)
      .eq('read', false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
      markAllRead();
    }, [profile?.id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
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

  const getIcon = (type: string) => {
    if (type === 'like') return <Heart color={Colors.error} size={24} fill={Colors.error} />;
    if (type === 'comment') return <MessageCircle color={Colors.primary} size={24} strokeWidth={2} />;
    return <UserPlus color={Colors.primary} size={24} strokeWidth={2} />;
  };

  const getMessage = (item: NotificationWithActor) => {
    const username = item.actor?.username ?? 'someone';
    if (item.type === 'like') return `liked your post`;
    if (item.type === 'comment') return `commented: ${item.text ?? ''}`;
    return `started following you`;
  };

  const handlePress = (item: NotificationWithActor) => {
    if (item.type === 'follow' && item.actor) {
      router.push(`/user/${item.actor.id}`);
    } else if (item.post_id) {
      router.push(`/post/${item.post_id}`);
    }
  };

  const renderItem = ({ item }: { item: NotificationWithActor }) => (
    <Pressable style={styles.notificationRow} onPress={() => handlePress(item)}>
      <Avatar
        uri={item.actor?.avatar_url ?? null}
        size={44}
        username={item.actor?.username}
        onPress={() => item.actor && router.push(`/user/${item.actor.id}`)}
      />
      <View style={styles.notificationContent}>
        <Text style={styles.notificationText}>
          <Text style={styles.notificationUsername}>{item.actor?.username ?? 'someone'}</Text>{' '}
          {getMessage(item)}
        </Text>
        <Text style={styles.notificationTime}>{formatTime(item.created_at)}</Text>
      </View>
      {getIcon(item.type)}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Heart color={Colors.textLight} size={48} strokeWidth={1.5} />
            <Text style={styles.emptyText}>Activity On Your Posts</Text>
            <Text style={styles.emptySubtext}>
              When someone likes or comments on your posts, you'll see it here.
            </Text>
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: FontSizes.xxl,
    color: Colors.text,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  notificationUsername: {
    fontFamily: 'Inter-SemiBold',
    color: Colors.text,
  },
  notificationTime: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl * 2,
    paddingHorizontal: Spacing.xl,
  },
  emptyText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: FontSizes.xl,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});
