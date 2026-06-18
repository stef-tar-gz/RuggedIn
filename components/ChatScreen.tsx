import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { useTheme } from '@/context/ThemeContext';
import { usePresence } from '@/hooks/usePresence';

type Message = {
  id: string;
  sender_id: string;
  receiver_id?: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

type Props = {
  otherUserId: string;
  otherUserName: string;
  backPath: string;
};

export default function ChatScreen({ otherUserId, otherUserName, backPath }: Props) {
  const { profile } = useProfile();
  const { colors } = useTheme();
  const router = useRouter();
  const s = makeStyles(colors);

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const myId = profile?.id;
  const { isOnline } = usePresence(myId);
  const [otherLastSeen, setOtherLastSeen] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('last_seen')
      .eq('id', otherUserId)
      .single()
      .then(({ data }) => setOtherLastSeen(data?.last_seen ?? null));
  }, [otherUserId]);

  const fetchMessages = useCallback(async () => {
    if (!myId) return;
    const { data } = await supabase
      .from('messages')
      .select('id, sender_id, content, created_at, read_at')
      .or(`and(sender_id.eq.${myId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${myId})`)
      .order('created_at', { ascending: true });

    setMessages(data ?? []);
    setLoading(false);

    // Mark incoming unread as read
    const unread = (data ?? []).filter(m => m.sender_id === otherUserId && !m.read_at).map(m => m.id);
    if (unread.length > 0) {
      await supabase.from('messages').update({ read_at: new Date().toISOString() }).in('id', unread);
    }
  }, [myId, otherUserId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Polling ogni 3 secondi per i nuovi messaggi
  useEffect(() => {
    if (!myId) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('messages')
        .select('id, sender_id, content, created_at, read_at')
        .or(`and(sender_id.eq.${myId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${myId})`)
        .order('created_at', { ascending: true });

      if (!data) return;
      setMessages(prev => {
        if (data.length === prev.length) return prev;
        const unread = data.filter(m => m.sender_id === otherUserId && !m.read_at).map(m => m.id);
        if (unread.length > 0) {
          supabase.from('messages').update({ read_at: new Date().toISOString() }).in('id', unread);
        }
        return data;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [myId, otherUserId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !myId) return;
    const content = text.trim();
    setText('');

    const optimistic: Message = {
      id: `tmp_${Date.now()}`,
      sender_id: myId,
      receiver_id: otherUserId,
      content,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    setMessages(prev => [...prev, optimistic]);

    const { data } = await supabase
      .from('messages')
      .insert({ sender_id: myId, receiver_id: otherUserId, content })
      .select('id, sender_id, receiver_id, content, created_at, read_at')
      .single();

    if (data) {
      setMessages(prev => prev.map(m => m.id === optimistic.id ? data : m));
    }
  };

  const formatLastSeen = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'poco fa';
    if (diff < 3600) return `${Math.floor(diff / 60)} min fa`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h fa`;
    return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Oggi';
    if (d.toDateString() === yesterday.toDateString()) return 'Ieri';
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
  };

  type ListItem = Message | { type: 'date'; label: string; key: string };

  const itemsWithDividers = (): ListItem[] => {
    const result: ListItem[] = [];
    let lastDate = '';
    for (const msg of messages) {
      const dateLabel = formatDate(msg.created_at);
      if (dateLabel !== lastDate) {
        result.push({ type: 'date', label: dateLabel, key: `date_${msg.id}` });
        lastDate = dateLabel;
      }
      result.push(msg);
    }
    return result;
  };

  if (loading) {
    return <View style={s.centered}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <View style={s.headerAvatarWrap}>
            <View style={s.headerAvatar}>
              <Text style={s.headerAvatarText}>{otherUserName.charAt(0).toUpperCase()}</Text>
            </View>
            {isOnline(otherUserId) && <View style={s.onlineDot} />}
          </View>
          <View>
            <Text style={s.headerName}>{otherUserName}</Text>
            <Text style={s.headerStatus}>
              {isOnline(otherUserId) ? 'Online' : otherLastSeen ? `Visto ${formatLastSeen(otherLastSeen)}` : 'Offline'}
            </Text>
          </View>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={itemsWithDividers()}
        keyExtractor={(item) => ('id' in item ? item.id : item.key)}
        contentContainerStyle={s.messageList}
        onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          if ('type' in item) {
            return (
              <View style={s.dateDivider}>
                <View style={s.dateLine} />
                <Text style={s.dateLabel}>{item.label}</Text>
                <View style={s.dateLine} />
              </View>
            );
          }
          const isMine = item.sender_id === myId;
          return (
            <View style={[s.bubble, isMine ? s.bubbleMine : s.bubbleTheirs]}>
              <Text style={[s.bubbleText, isMine ? s.bubbleTextMine : s.bubbleTextTheirs]}>
                {item.content}
              </Text>
              <Text style={[s.bubbleTime, isMine ? s.bubbleTimeMine : s.bubbleTimeTheirs]}>
                {formatTime(item.created_at)}{isMine ? (item.read_at ? '  ✓✓' : '  ✓') : ''}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>💬</Text>
            <Text style={s.emptyText}>Nessun messaggio ancora.</Text>
            <Text style={s.emptySub}>Inizia la conversazione!</Text>
          </View>
        }
      />

      {/* Input */}
      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          placeholder="Scrivi un messaggio..."
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!text.trim() || sending) && s.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          <Text style={s.sendBtnText}>▶</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  centered: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingBottom: 14, paddingHorizontal: 20, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border },
  backBtn: { width: 36, alignItems: 'flex-start' },
  backText: { color: c.accent, fontSize: 28, lineHeight: 32 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatarWrap: { position: 'relative' },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { color: c.accent, fontSize: 16, fontWeight: '800' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: 6, backgroundColor: '#22c55e', borderWidth: 2, borderColor: c.surface },
  headerName: { color: c.text, fontSize: 15, fontWeight: '700' },
  headerStatus: { color: '#22c55e', fontSize: 11, fontWeight: '600', marginTop: 1 },

  messageList: { paddingHorizontal: 16, paddingVertical: 16, flexGrow: 1 },

  dateDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
  dateLine: { flex: 1, height: 1, backgroundColor: c.border },
  dateLabel: { color: c.textMuted, fontSize: 12, fontWeight: '600' },

  bubble: { maxWidth: '78%', marginBottom: 6, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: c.accent, borderBottomRightRadius: 4 },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: c.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: c.border },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMine: { color: '#fff' },
  bubbleTextTheirs: { color: c.text },
  bubbleTime: { fontSize: 10, marginTop: 4 },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  bubbleTimeTheirs: { color: c.textMuted },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: c.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  emptySub: { color: c.textMuted, fontSize: 13 },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border },
  input: { flex: 1, backgroundColor: c.bg, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: c.text, fontSize: 15, maxHeight: 120, borderWidth: 1, borderColor: c.border },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontSize: 16, marginLeft: 2 },
});
