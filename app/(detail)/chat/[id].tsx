import { useCallback, useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, useWindowDimensions } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, Phone, Video, Info, CheckCheck, AlertCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Avatar } from '@/components/Avatar';
import { Colors, Spacing, FontSizes, Radius } from '@/lib/theme';
import type { Message, Profile } from '@/types/database';

interface ChatMessage extends Message {
  showAvatar?: boolean;
  showTime?: boolean;
  isLastInGroup?: boolean;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { width } = useWindowDimensions();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [other, setOther] = useState<Profile | null>(null);
  const [body, setBody] = useState('');
  const [otherTyping, setOtherTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isTablet = width >= 768;
  const maxBubbleWidth = isTablet ? 480 : '72%';

  const loadChat = async () => {
    if (!id || !profile) return;
    setError(null);
    setLoading(true);
    try {
      const { data: members, error: membersError } = await supabase
        .from('conversation_members')
        .select('user_id, profiles:user_id (id, username, full_name, avatar_url, bio, created_at)')
        .eq('conversation_id', id);
      if (membersError) throw membersError;
      const otherMember = (members as any[] || []).find(member => member.user_id !== profile.id);
      setOther(otherMember?.profiles || null);
      const { data, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });
      if (msgError) throw msgError;
      setMessages((data as Message[]) || []);
    } catch (e: any) {
      setError(e?.message || 'Could not load messages');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadChat(); }, [id, profile?.id]));

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`chat:${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(current => {
          if (current.some(m => m.id === newMsg.id)) return current;
          return [...current, newMsg];
        });
        if (newMsg.sender_id !== profile?.id) {
          setOtherTyping(false);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, profile?.id]);

  const sendMessage = async () => {
    const trimmed = body.trim();
    if (!trimmed || !id || sending) return;
    setBody('');
    setSending(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from('messages')
        .insert({ conversation_id: id, body: trimmed })
        .select('*')
        .maybeSingle();
      if (insertError) throw insertError;
      if (data) {
        setMessages(current => {
          if (current.some(m => m.id === data.id)) return current;
          return [...current, data as Message];
        });
      }
    } catch (e: any) {
      setBody(trimmed);
      setError(e?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const hours = date.getHours();
    const mins = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`;
  };

  const formatDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
  };

  const getProcessedMessages = (): ChatMessage[] => {
    return messages.map((msg, idx) => {
      const prev = messages[idx - 1];
      const next = messages[idx + 1];
      const sameSenderAsNext = next && next.sender_id === msg.sender_id;
      const sameSenderAsPrev = prev && prev.sender_id === msg.sender_id;
      const timeGap = prev ? new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() : Infinity;
      const isLastInGroup = !sameSenderAsNext || (next && new Date(next.created_at).getTime() - new Date(msg.created_at).getTime() > 120000);
      return {
        ...msg,
        showAvatar: !sameSenderAsNext && msg.sender_id !== profile?.id,
        showTime: isLastInGroup || !sameSenderAsPrev || timeGap > 120000,
        isLastInGroup,
      };
    });
  };

  const processedMessages = getProcessedMessages();

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMine = item.sender_id === profile?.id;
    const prev = processedMessages[index - 1];
    const showDateSep = !prev || new Date(prev.created_at).toDateString() !== new Date(item.created_at).toDateString();

    return (
      <View>
        {showDateSep && (
          <View style={styles.dateSeparator}>
            <View style={styles.dateLine} />
            <Text style={styles.dateText}>{formatDateSeparator(item.created_at)}</Text>
            <View style={styles.dateLine} />
          </View>
        )}
        <View style={[styles.messageRow, isMine ? styles.myMessageRow : styles.theirMessageRow]}>
          {!isMine && (
            <View style={styles.avatarSlot}>
              {item.showAvatar ? (
                <Avatar uri={other?.avatar_url ?? null} size={28} username={other?.username} />
              ) : null}
            </View>
          )}
          <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.theirMessage, !item.isLastInGroup && (isMine ? styles.myMessageGrouped : styles.theirMessageGrouped)]}>
            <Text style={[styles.messageText, isMine && styles.myMessageText]}>
              {item.body}
            </Text>
            {item.showTime && (
              <Text style={[styles.messageTime, isMine && styles.myMessageTime]}>
                {formatTime(item.created_at)}
                {isMine && <Text style={styles.readTick}> {'\u2713}\u2713'}</Text>}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft color={Colors.text} size={24} strokeWidth={2} />
        </Pressable>
        <Pressable style={styles.headerPerson} onPress={() => other && router.push(`/user/${other.id}`)}>
          {other && <Avatar uri={other.avatar_url} size={36} username={other.username} />}
          <View style={styles.headerInfo}>
            <Text style={styles.title}>{other?.username || 'Chat'}</Text>
            <Text style={styles.statusText}>
              {otherTyping ? 'typing...' : 'Active now'}
            </Text>
          </View>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable hitSlop={8}>
            <Phone color={Colors.textSecondary} size={20} strokeWidth={2} />
          </Pressable>
          <Pressable hitSlop={8}>
            <Video color={Colors.textSecondary} size={20} strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      {error && (
        <View style={styles.errorBar}>
          <View style={styles.errorContent}>
            <AlertCircle color={Colors.error} size={16} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
          <Pressable onPress={() => { setError(null); loadChat(); }}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={processedMessages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[styles.messages, isTablet && styles.messagesTablet]}
          onContentSizeChange={() => { flatListRef.current?.scrollToEnd({ animated: true }); }}
          onLayout={() => { flatListRef.current?.scrollToEnd({ animated: false }); }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Send color={Colors.textLight} size={28} strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTitle}>Start the conversation</Text>
              <Text style={styles.emptyText}>Send a message to {other?.username || 'this person'}.</Text>
            </View>
          }
        />
      )}

      {otherTyping && (
        <View style={styles.typingBar}>
          <View style={styles.typingDots}>
            <View style={styles.typingDot} />
            <View style={[styles.typingDot, styles.typingDot2]} />
            <View style={[styles.typingDot, styles.typingDot3]} />
          </View>
          <Text style={styles.typingText}>{other?.username} is typing...</Text>
        </View>
      )}

      <View style={[styles.composer, isTablet && styles.composerTablet]}>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Message..."
          placeholderTextColor={Colors.textSecondary}
          style={styles.composerInput}
          multiline
          maxLength={2000}
        />
        <Pressable
          style={[styles.sendButton, (!body.trim() || sending) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!body.trim() || sending}
          hitSlop={8}
        >
          {sending ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Send color={body.trim() ? Colors.white : Colors.textLight} size={18} strokeWidth={2} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerPerson: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerInfo: { gap: 1 },
  title: { fontFamily: 'Inter-SemiBold', fontSize: FontSizes.md, color: Colors.text },
  statusText: { fontFamily: 'Inter-Regular', fontSize: FontSizes.xs, color: Colors.success },
  headerActions: { flexDirection: 'row', gap: Spacing.md },
  errorBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, backgroundColor: '#FEF2F2', borderBottomWidth: 1, borderBottomColor: Colors.border },
  errorContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flex: 1 },
  errorText: { fontFamily: 'Inter-Regular', fontSize: FontSizes.sm, color: Colors.error, flex: 1 },
  retryText: { fontFamily: 'Inter-SemiBold', fontSize: FontSizes.sm, color: Colors.primary },
  loader: { flex: 1, justifyContent: 'center' },
  messages: { padding: Spacing.lg, gap: 2, flexGrow: 1, justifyContent: 'flex-end' },
  messagesTablet: { maxWidth: 720, alignSelf: 'center', width: '100%' },
  dateSeparator: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  dateLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dateText: { fontFamily: 'Inter-Regular', fontSize: FontSizes.xs, color: Colors.textSecondary, textTransform: 'uppercase' },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.xs, marginVertical: 1 },
  myMessageRow: { justifyContent: 'flex-end' },
  theirMessageRow: { justifyContent: 'flex-start' },
  avatarSlot: { width: 28, height: 28, marginBottom: 2 },
  messageBubble: { maxWidth: '72%', borderRadius: Radius.xl, paddingHorizontal: Spacing.md + 2, paddingVertical: Spacing.sm + 2 },
  myMessage: { alignSelf: 'flex-end', backgroundColor: Colors.primary, borderBottomRightRadius: 6 },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: Colors.surface, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: Colors.border },
  myMessageGrouped: { borderBottomRightRadius: Radius.xl },
  theirMessageGrouped: { borderBottomLeftRadius: Radius.xl },
  messageText: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, color: Colors.text, lineHeight: 20 },
  myMessageText: { color: Colors.white },
  messageTime: { fontFamily: 'Inter-Regular', fontSize: 10, color: Colors.textSecondary, marginTop: 2, alignSelf: 'flex-end' },
  myMessageTime: { color: 'rgba(255,255,255,0.7)' },
  readTick: { color: 'rgba(255,255,255,0.85)' },
  empty: { alignItems: 'center', padding: Spacing.xxl, flex: 1, justifyContent: 'center' },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  emptyTitle: { fontFamily: 'Inter-Bold', fontSize: FontSizes.xl, color: Colors.text },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: FontSizes.md, color: Colors.textSecondary, marginTop: Spacing.sm, textAlign: 'center' },
  typingBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs },
  typingDots: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.textSecondary },
  typingDot2: { opacity: 0.6 },
  typingDot3: { opacity: 0.3 },
  typingText: { fontFamily: 'Inter-Regular', fontSize: FontSizes.xs, color: Colors.textSecondary },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  composerTablet: { maxWidth: 720, alignSelf: 'center', width: '100%' },
  composerInput: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.xl, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2, color: Colors.text, fontFamily: 'Inter-Regular', fontSize: FontSizes.md, backgroundColor: Colors.surface, maxHeight: 120 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { backgroundColor: Colors.border },
});
