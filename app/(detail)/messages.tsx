import { useCallback, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ArrowLeft, Search, Send, Edit2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/Avatar';
import { Colors, Spacing, FontSizes, Radius } from '@/lib/theme';
import type { Conversation, ConversationMember, Profile } from '@/types/database';

interface InboxRow {
  conversation: Conversation;
  other: Profile;
  lastMessage: string;
  lastMessageAt: string;
  unread: boolean;
}

export default function MessagesScreen() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const loadInbox = async () => {
    if (!profile) return;
    const { data: memberships } = await supabase.from('conversation_members').select('conversation_id').eq('user_id', profile.id);
    const ids = (memberships || []).map(item => item.conversation_id);
    if (!ids.length) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data: conversations } = await supabase.from('conversations').select('*').in('id', ids).order('created_at', { ascending: false });
    const nextRows: InboxRow[] = [];
    for (const conversation of (conversations || []) as Conversation[]) {
      const { data: members } = await supabase.from('conversation_members').select('user_id, profiles:user_id (id, username, full_name, avatar_url, bio, created_at)').eq('conversation_id', conversation.id);
      const otherMember = (members as any[] || []).find(member => member.user_id !== profile.id) as ConversationMember | undefined;
      if (!otherMember?.profiles) continue;
      const { data: lastMessage } = await supabase.from('messages').select('body, created_at, sender_id').eq('conversation_id', conversation.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      nextRows.push({
        conversation,
        other: otherMember.profiles as Profile,
        lastMessage: lastMessage?.body || 'Start a conversation',
        lastMessageAt: lastMessage?.created_at || conversation.created_at,
        unread: lastMessage && lastMessage.sender_id !== profile.id && (Date.now() - new Date(lastMessage.created_at).getTime()) < 60000 || false,
      });
    }
    nextRows.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    setRows(nextRows);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadInbox(); }, [profile?.id]));

  const searchPeople = async (text: string) => {
    setQuery(text);
    if (!text.trim() || !profile) { setPeople([]); return; }
    const { data } = await supabase.from('profiles').select('*').ilike('username', `%${text.trim()}%`).neq('id', profile.id).limit(8);
    setPeople((data as Profile[]) || []);
  };

  const openConversation = async (person: Profile) => {
    if (!profile) return;
    const existing = rows.find(row => row.other.id === person.id);
    if (existing) { router.push(`/chat/${existing.conversation.id}`); return; }
    const { data: conversation, error } = await supabase.from('conversations').insert({ created_by: profile.id }).select('*').maybeSingle();
    if (error || !conversation) return;
    await supabase.from('conversation_members').insert([
      { conversation_id: conversation.id, user_id: profile.id },
      { conversation_id: conversation.id, user_id: person.id },
    ]);
    setQuery('');
    setPeople([]);
    router.push(`/chat/${conversation.id}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft color={Colors.text} size={24} strokeWidth={2} />
        </Pressable>
        <Text style={styles.title}>Messages</Text>
        <Send color={Colors.text} size={22} strokeWidth={2} />
      </View>
      <View style={styles.searchBox}>
        <Search color={Colors.textSecondary} size={18} strokeWidth={2} />
        <TextInput
          value={query}
          onChangeText={searchPeople}
          placeholder="Search people"
          placeholderTextColor={Colors.textSecondary}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      {people.length > 0 && (
        <View style={styles.peopleBox}>
          <FlatList
            data={people}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <Pressable style={styles.personRow} onPress={() => openConversation(item)}>
                <Avatar uri={item.avatar_url} size={44} username={item.username} />
                <View style={styles.personInfo}>
                  <Text style={styles.username}>{item.username}</Text>
                  <Text style={styles.personFullName}>{item.full_name}</Text>
                </View>
              </Pressable>
            )}
          />
        </View>
      )}
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => item.conversation.id}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => router.push(`/chat/${item.conversation.id}`)}
            >
              <View style={styles.avatarWrap}>
                <Avatar uri={item.other.avatar_url} size={56} username={item.other.username} />
                {item.unread && <View style={styles.unreadDot} />}
              </View>
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={[styles.username, item.unread && styles.usernameUnread]}>{item.other.username}</Text>
                  <Text style={styles.timestamp}>{formatTime(item.lastMessageAt)}</Text>
                </View>
                <Text
                  style={[styles.preview, item.unread && styles.previewUnread]}
                  numberOfLines={1}
                >
                  {item.lastMessage}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Edit2 color={Colors.textLight} size={32} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>Your messages</Text>
              <Text style={styles.emptyText}>Search for someone above to start a private conversation.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontFamily: 'Inter-Bold', fontSize: FontSizes.xxl, color: Colors.text },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, margin: Spacing.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  input: { flex: 1, color: Colors.text, fontFamily: 'Inter-Regular', fontSize: FontSizes.md },
  peopleBox: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2 },
  personInfo: { gap: 2 },
  personFullName: { fontFamily: 'Inter-Regular', fontSize: FontSizes.sm, color: Colors.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  rowPressed: { backgroundColor: Colors.surface },
  avatarWrap: { position: 'relative' },
  unreadDot: { position: 'absolute', top: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.background },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  username: { fontFamily: 'Inter-SemiBold', fontSize: FontSizes.md, color: Colors.text },
  usernameUnread: { fontFamily: 'Inter-Bold', color: Colors.text },
  timestamp: { fontFamily: 'Inter-Regular', fontSize: FontSizes.xs, color: Colors.textSecondary },
  preview: { fontFamily: 'Inter-Regular', fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: 3 },
  previewUnread: { color: Colors.text, fontFamily: 'Inter-Medium' },
  loader: { marginTop: Spacing.xl },
  empty: { alignItems: 'center', padding: Spacing.xxl },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  emptyTitle: { fontFamily: 'Inter-Bold', fontSize: FontSizes.xl, color: Colors.text },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 21 },
});
