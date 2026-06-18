import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';

type PendingRequest = {
  id: string;
  athlete_id: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
};

export default function RequestsScreen() {
  const { profile } = useProfile();
  const { colors } = useTheme();
  const router = useRouter();
  const { showAlert } = useAlert();
  const s = makeStyles(colors);

  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading) {
      Animated.stagger(120, [
        Animated.timing(headerAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(listAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  const fetchRequests = useCallback(async (isRefresh = false) => {
    if (!profile) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const { data: reqData, error } = await supabase
      .from('trainer_athlete_requests')
      .select('id, athlete_id, created_at')
      .eq('trainer_id', profile.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      showAlert({ title: 'Errore', message: error.message });
      setLoading(false); setRefreshing(false); return;
    }

    if (!reqData || reqData.length === 0) {
      setRequests([]); setLoading(false); setRefreshing(false); return;
    }

    const athleteIds = reqData.map((r) => r.athlete_id);
    const { data: profilesData } = await supabase
      .from('profiles').select('id, full_name, bio, avatar_url').in('id', athleteIds);

    const profilesMap = Object.fromEntries((profilesData ?? []).map((p) => [p.id, p]));
    setRequests(reqData.map((r) => ({
      id: r.id, athlete_id: r.athlete_id, created_at: r.created_at,
      full_name: profilesMap[r.athlete_id]?.full_name ?? '—',
      bio: profilesMap[r.athlete_id]?.bio ?? null,
      avatar_url: profilesMap[r.athlete_id]?.avatar_url ?? null,
    })));
    setLoading(false); setRefreshing(false);
  }, [profile]);

  useFocusEffect(useCallback(() => { fetchRequests(); }, [fetchRequests]));

  const handleAccept = (req: PendingRequest) => {
    showAlert({
      title: 'Accetta richiesta',
      message: `Vuoi accettare ${req.full_name} come tuo atleta?`,
      buttons: [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Accetta', onPress: async () => {
            setProcessingId(req.id);
            const { error } = await supabase.rpc('accept_trainer_request', { p_request_id: req.id });
            setProcessingId(null);
            if (error) { showAlert({ title: 'Errore', message: error.message }); }
            else { showAlert({ title: 'Confermato', message: `${req.full_name} è ora uno dei tuoi atleti!` }); setRequests((prev) => prev.filter((r) => r.id !== req.id)); }
          },
        },
      ],
    });
  };

  const handleReject = (req: PendingRequest) => {
    showAlert({
      title: 'Rifiuta richiesta',
      message: `Vuoi rifiutare la richiesta di ${req.full_name}?`,
      buttons: [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rifiuta', style: 'destructive', onPress: async () => {
            setProcessingId(req.id);
            const { error } = await supabase.from('trainer_athlete_requests').update({ status: 'rejected' }).eq('id', req.id);
            setProcessingId(null);
            if (error) { showAlert({ title: 'Errore', message: error.message }); }
            else { setRequests((prev) => prev.filter((r) => r.id !== req.id)); }
          },
        },
      ],
    });
  };

  const renderItem = ({ item }: { item: PendingRequest }) => {
    const isProcessing = processingId === item.id;
    const date = new Date(item.created_at).toLocaleDateString('it-IT');
    return (
      <View style={s.card}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={s.avatar} contentFit="cover" />
        ) : (
          <View style={s.avatarFallback}>
            <Text style={s.avatarInitial}>{item.full_name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={s.cardBody}>
          <Text style={s.name}>{item.full_name}</Text>
          {item.bio ? <Text style={s.bio} numberOfLines={2}>{item.bio}</Text> : null}
          <Text style={s.date}>Inviata il {date}</Text>
        </View>
        {isProcessing ? (
          <ActivityIndicator color={colors.accent} style={{ marginLeft: 8 }} />
        ) : (
          <View style={s.actions}>
            <TouchableOpacity style={s.acceptBtn} onPress={() => handleAccept(item)}>
              <Text style={s.acceptText}>✓</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.rejectBtn} onPress={() => handleReject(item)}>
              <Text style={s.rejectText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={s.container}>
      <Animated.View style={{ opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.backText}>‹ Indietro</Text>
          </TouchableOpacity>
          <View style={s.titleWrap} pointerEvents="none">
            <Text style={s.title}>Richieste</Text>
          </View>
        </View>
      </Animated.View>

      {loading ? (
        <View style={s.centered}><ActivityIndicator color={colors.accent} size="large" /></View>
      ) : (
        <Animated.View style={[{ flex: 1 }, { opacity: listAnim, transform: [{ translateY: listAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }]}>
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={s.list}
            refreshing={refreshing}
            onRefresh={() => fetchRequests(true)}
            ListEmptyComponent={
              <View style={s.centered}>
                <Text style={s.emptyIcon}>📭</Text>
                <Text style={s.emptyTitle}>Nessuna richiesta in attesa</Text>
                <Text style={s.emptySubtitle}>Le nuove richieste appariranno qui</Text>
              </View>
            }
          />
        </Animated.View>
      )}
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20 },
  backText: { color: c.accent, fontSize: 16, fontWeight: '600' },
  titleWrap: { position: 'absolute', left: 0, right: 0 },
  title: { textAlign: 'center', fontSize: 28, fontWeight: '900', color: c.text, letterSpacing: -0.5 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: c.text },
  emptySubtitle: { fontSize: 14, color: c.textSecondary },
  list: { paddingHorizontal: 24, paddingBottom: 40, gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: c.surface, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: c.accentBorder,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: c.accent, fontSize: 18, fontWeight: '800' },
  cardBody: { flex: 1 },
  name: { color: c.text, fontSize: 16, fontWeight: '700' },
  bio: { color: c.textSecondary, fontSize: 13, marginTop: 3, lineHeight: 18 },
  date: { color: c.textMuted, fontSize: 11, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 10 },
  acceptBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a3a1a', borderWidth: 1, borderColor: '#22c55e44', alignItems: 'center', justifyContent: 'center' },
  acceptText: { color: '#22c55e', fontSize: 16, fontWeight: '800' },
  rejectBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3a1515', borderWidth: 1, borderColor: '#ef444444', alignItems: 'center', justifyContent: 'center' },
  rejectText: { color: '#ef4444', fontSize: 14, fontWeight: '800' },
});
