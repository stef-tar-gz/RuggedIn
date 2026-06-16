import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { useTheme } from '@/context/ThemeContext';

type Trainer = {
  id: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  athlete_count: number;
};

export default function FindTrainerScreen() {
  const { profile } = useProfile();
  const { colors } = useTheme();
  const router = useRouter();
  const s = makeStyles(colors);

  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null); // trainer id in corso
  const [sentIds, setSentIds] = useState<Set<string>>(new Set()); // richieste già inviate

  // Carica richieste pending esistenti per escluderle visivamente
  const fetchPendingRequests = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('trainer_athlete_requests')
      .select('trainer_id')
      .eq('athlete_id', profile.id)
      .eq('status', 'pending');
    if (data) setSentIds(new Set(data.map((r) => r.trainer_id)));
  }, [profile]);

  const fetchTrainers = useCallback(async (query: string) => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_public_trainers', { p_search: query });
    if (error) {
      Alert.alert('Errore', error.message);
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
    Alert.alert(
      'Invia richiesta',
      `Vuoi inviare una richiesta di allenamento a ${trainer.full_name}?`,
      [
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
                Alert.alert('Errore', error.message);
              }
            } else {
              setSentIds((prev) => new Set(prev).add(trainer.id));
              Alert.alert('Richiesta inviata', `${trainer.full_name} riceverà una notifica.`);
            }
          },
        },
      ]
    );
  };

  const renderTrainer = ({ item }: { item: Trainer }) => {
    const isSent = sentIds.has(item.id);
    const isSending = sending === item.id;

    return (
      <View style={s.card}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={s.avatar} contentFit="cover" />
        ) : (
          <View style={s.avatarPlaceholder}>
            <Text style={s.avatarInitial}>{item.full_name.charAt(0).toUpperCase()}</Text>
          </View>
        )}

        <View style={s.cardBody}>
          <Text style={s.name}>{item.full_name}</Text>
          {item.bio ? (
            <Text style={s.bio} numberOfLines={2}>{item.bio}</Text>
          ) : null}
          <Text style={s.count}>
            {item.athlete_count} {item.athlete_count === 1 ? 'atleta' : 'atleti'}
          </Text>
        </View>

        <TouchableOpacity
          style={[s.requestBtn, isSent && s.requestBtnSent]}
          onPress={() => !isSent && handleSendRequest(item)}
          disabled={isSent || isSending}
        >
          {isSending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={[s.requestBtnText, isSent && s.requestBtnTextSent]}>
              {isSent ? '✓ Inviata' : 'Richiedi'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backText}>‹ Indietro</Text>
        </TouchableOpacity>
        <Text style={s.title}>Trova un Trainer</Text>
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
          ListEmptyComponent={
            <View style={s.centered}>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  backText: { color: c.accent, fontSize: 16 },
  title: { fontSize: 20, fontWeight: '800', color: c.text },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 12, marginHorizontal: 24, marginBottom: 16, paddingHorizontal: 14, borderWidth: 1, borderColor: c.border },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: c.text, fontSize: 15, paddingVertical: 14 },
  clearBtn: { color: c.textMuted, fontSize: 16, paddingLeft: 8 },
  list: { paddingHorizontal: 24, paddingBottom: 32, gap: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { color: c.textMuted, fontSize: 15 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: c.border },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  avatarPlaceholder: { width: 54, height: 54, borderRadius: 27, backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: c.accent, fontSize: 22, fontWeight: '800' },
  cardBody: { flex: 1 },
  name: { color: c.text, fontSize: 15, fontWeight: '700' },
  bio: { color: c.textSecondary, fontSize: 12, marginTop: 2 },
  count: { color: c.textMuted, fontSize: 11, marginTop: 4 },
  requestBtn: { backgroundColor: c.accent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, minWidth: 80, alignItems: 'center' },
  requestBtnSent: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  requestBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  requestBtnTextSent: { color: c.textMuted },
});
