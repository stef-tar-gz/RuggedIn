import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';
import { InstagramButton } from '@/components/InstagramButton';

type Trainer = {
  id: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  athlete_count: number;
  instagram_handle: string | null;
};

export default function FindTrainerScreen() {
  const { profile } = useProfile();
  const { colors } = useTheme();
  const router = useRouter();
  const { showAlert } = useAlert();
  const s = makeStyles(colors);

  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set()); // richieste pending
  const [linkedTrainerId, setLinkedTrainerId] = useState<string | null>(null); // trainer attuale

  const fetchPendingRequests = useCallback(async () => {
    if (!profile) return;
    const [pendingRes, linkedRes] = await Promise.all([
      supabase.from('trainer_athlete_requests').select('trainer_id').eq('athlete_id', profile.id).eq('status', 'pending'),
      supabase.from('trainer_athlete').select('trainer_id').eq('athlete_id', profile.id).maybeSingle(),
    ]);
    if (pendingRes.data) setSentIds(new Set(pendingRes.data.map((r) => r.trainer_id)));
    if (linkedRes.data?.trainer_id) setLinkedTrainerId(linkedRes.data.trainer_id);
  }, [profile]);

  const fetchTrainers = useCallback(async (query: string) => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_public_trainers', { p_search: query });
    if (error) {
      showAlert({ title: 'Errore', message: error.message });
    } else {
      setTrainers(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  // Debounce ricerca
  useEffect(() => {
    const timer = setTimeout(() => fetchTrainers(search), 350);
    return () => clearTimeout(timer);
  }, [search, fetchTrainers]);

  const handleSendRequest = (trainer: Trainer) => {
    showAlert({
      title: 'Invia richiesta',
      message: `Vuoi inviare una richiesta di allenamento a ${trainer.full_name}?`,
      buttons: [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Invia',
          onPress: async () => {
            if (!profile) return;
            setSending(trainer.id);
            const { error } = await supabase.from('trainer_athlete_requests').insert({
              athlete_id: profile.id,
              trainer_id: trainer.id,
            });
            setSending(null);
            if (error) {
              if (error.code === '23505') {
                // Richiesta già esistente: aggiorna solo la UI
                setSentIds((prev) => new Set(prev).add(trainer.id));
              } else {
                showAlert({ title: 'Errore', message: error.message });
              }
            } else {
              setSentIds((prev) => new Set(prev).add(trainer.id));
              showAlert({ title: 'Richiesta inviata', message: `${trainer.full_name} riceverà una notifica.` });
            }
          },
        },
      ],
    });
  };

  const renderTrainer = ({ item }: { item: Trainer }) => {
    const isLinked = linkedTrainerId === item.id;
    const isSent = sentIds.has(item.id);
    const isSending = sending === item.id;
    const isDisabled = isLinked || isSent || isSending;

    return (
      <TouchableOpacity style={s.card} onPress={() => router.push({ pathname: '/(athlete)/trainer/[id]', params: { id: item.id } })} activeOpacity={0.85}>
        <View style={s.cardTop}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={s.avatar} contentFit="cover" />
          ) : (
            <View style={s.avatarPlaceholder}>
              <Text style={s.avatarInitial}>{item.full_name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={s.athleteBadge}>
            <Text style={s.athleteBadgeText}>{item.athlete_count} {item.athlete_count === 1 ? 'atleta' : 'atleti'}</Text>
          </View>
        </View>

        <View style={s.cardBody}>
          <Text style={s.name}>{item.full_name}</Text>
          {item.bio ? <Text style={s.bio} numberOfLines={2}>{item.bio}</Text> : null}
        </View>

        <TouchableOpacity
          style={[s.requestBtn, isDisabled && s.requestBtnSent, isLinked && s.requestBtnLinked]}
          onPress={() => !isDisabled && handleSendRequest(item)}
          disabled={isDisabled}
        >
          {isSending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[s.requestBtnText, isDisabled && s.requestBtnTextSent, isLinked && s.requestBtnTextLinked]}>
              {isLinked ? '✓ Associato' : isSent ? '✓ Inviata' : 'Richiedi'}
            </Text>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Trova un Trainer</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={s.searchBar}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Cerca per nome..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={s.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : (
        <FlatList
          data={trainers}
          keyExtractor={(item) => item.id}
          renderItem={renderTrainer}
          contentContainerStyle={s.list}
          numColumns={2}
          columnWrapperStyle={s.columnWrapper}
          ListEmptyComponent={
            <View style={s.centered}>
              <Text style={s.emptyIcon}>🔍</Text>
              <Text style={s.emptyText}>Nessun trainer trovato</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  backText: { color: c.accent, fontSize: 30, lineHeight: 34, width: 32 },
  title: { fontSize: 18, fontWeight: '800', color: c.text },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface,
    borderRadius: 14, marginHorizontal: 20, marginBottom: 16,
    paddingHorizontal: 16, borderWidth: 1, borderColor: c.border, height: 50,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: c.text, fontSize: 15 },
  clearBtn: { color: c.textMuted, fontSize: 16, paddingLeft: 8 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  columnWrapper: { gap: 12, marginBottom: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: c.textMuted, fontSize: 15, fontWeight: '600' },
  card: {
    flex: 1, backgroundColor: c.surface, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: c.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  cardTop: { alignItems: 'flex-start', marginBottom: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, marginBottom: 8 },
  avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarInitial: { color: c.accent, fontSize: 22, fontWeight: '800' },
  athleteBadge: { backgroundColor: c.accentBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  athleteBadgeText: { color: c.accent, fontSize: 11, fontWeight: '700' },
  cardBody: { flex: 1, marginBottom: 14 },
  name: { color: c.text, fontSize: 15, fontWeight: '800', marginBottom: 4, letterSpacing: -0.2 },
  bio: { color: c.textSecondary, fontSize: 12, lineHeight: 17 },
  requestBtn: { backgroundColor: c.accent, borderRadius: 12, height: 40, alignItems: 'center', justifyContent: 'center' },
  requestBtnSent: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  requestBtnLinked: { backgroundColor: '#1a3a1a', borderWidth: 1, borderColor: '#4CAF50' },
  requestBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  requestBtnTextSent: { color: c.textMuted },
  requestBtnTextLinked: { color: '#4CAF50', fontWeight: '700' },
});
