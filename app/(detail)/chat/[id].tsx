import { useCallback, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/Avatar';
import { Colors, Spacing, FontSizes, Radius } from '@/lib/theme';
import type { Message, Profile } from '@/types/database';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [other, setOther] = useState<Profile | null>(null);
  const [body, setBody] = useState('');

  const loadChat = async () => {
    if (!id || !profile) return;
    const { data: members } = await supabase.from('conversation_members').select('user_id, profiles:user_id (id, username, full_name, avatar_url, bio, created_at)').eq('conversation_id', id);
    const otherMember = (members as any[] || []).find(member => member.user_id !== profile.id);
    setOther(otherMember?.profiles || null);
    const { data } = await supabase.from('messages').select('*').eq('conversation_id', id).order('created_at', { ascending: true });
    setMessages((data as Message[]) || []);
  };

  useFocusEffect(useCallback(() => { loadChat(); }, [id, profile?.id]));

  const sendMessage = async () => {
    const trimmed = body.trim();
    if (!trimmed || !id) return;
    const { data } = await supabase.from('messages').insert({ conversation_id: id, body: trimmed }).select('*').maybeSingle();
    if (data) setMessages(current => [...current, data as Message]);
    setBody('');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><ArrowLeft color={Colors.text} size={24} /></Pressable>
        <View style={styles.headerPerson}>{other && <Avatar uri={other.avatar_url} size={32} username={other.username} />}<Text style={styles.title}>{other?.username || 'Chat'}</Text></View>
        <View style={styles.spacer} />
      </View>
      <FlatList data={messages} keyExtractor={item => item.id} renderItem={({ item }) => <View style={[styles.message, item.sender_id === profile?.id ? styles.myMessage : styles.theirMessage]}><Text style={[styles.messageText, item.sender_id === profile?.id && styles.myMessageText]}>{item.body}</Text></View>} contentContainerStyle={styles.messages} ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>Start the conversation</Text><Text style={styles.emptyText}>Send a message to {other?.username || 'this person'}.</Text></View>} />
      <View style={styles.composer}><TextInput value={body} onChangeText={setBody} placeholder="Message..." placeholderTextColor={Colors.textSecondary} style={styles.composerInput} multiline /><Pressable onPress={sendMessage} disabled={!body.trim()}><Send color={body.trim() ? Colors.primary : Colors.textLight} size={24} /></Pressable></View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerPerson: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  title: { fontFamily: 'Inter-SemiBold', fontSize: FontSizes.lg, color: Colors.text },
  spacer: { width: 24 },
  messages: { padding: Spacing.lg, gap: Spacing.sm, flexGrow: 1, justifyContent: 'flex-end' },
  message: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  myMessage: { alignSelf: 'flex-end', backgroundColor: Colors.primary },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: Colors.surface },
  messageText: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, color: Colors.text, lineHeight: 20 },
  myMessageText: { color: Colors.white },
  empty: { alignItems: 'center', padding: Spacing.xxl },
  emptyTitle: { fontFamily: 'Inter-Bold', fontSize: FontSizes.xl, color: Colors.text },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, color: Colors.textSecondary, marginTop: Spacing.sm },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  composerInput: { flex: 1, maxHeight: 100, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.round, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: Colors.text, fontFamily: 'Inter-Regular', fontSize: FontSizes.md },
});
