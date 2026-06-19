import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ScalePressable } from '@/components/ScalePressable';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';
import { Skeleton } from '@/components/Skeleton';

type Athlete = { id: string; full_name: string; athlete_id: string; avatar_url: string | null };

export default function TrainerDashboard() {
  const { profile, loading: profileLoading } = useProfile();
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const s = makeStyles(colors);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const fetchDataRef = useRef<() => Promise<void>>();

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const fetchData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const athletesRes = await supabase.rpc('get_my_athletes');

      if (athletesRes.error) {
        showAlert({ title: 'Errore', message: athletesRes.error.message });
      } else {
        const raw: Athlete[] = athletesRes.data || [];
        if (raw.length > 0) {
          const ids = raw.map((a) => a.athlete_id);
          const { data: profilesData } = await supabase
            .from('profiles').select('id, avatar_url').in('id', ids);
          const avatarMap: Record<string, string | null> = {};
          (profilesData || []).forEach((p: any) => { avatarMap[p.id] = p.avatar_url; });
          setAthletes(raw.map((a) => ({ ...a, avatar_url: avatarMap[a.athlete_id] ?? null })));
        } else {
          setAthletes([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  fetchDataRef.current = fetchData;

  useEffect(() => {
    if (profile) fetchDataRef.current?.();
  }, [profile]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchDataRef.current?.();
  }, []));

  if (profileLoading) {
    return <View style={s.centered}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  return (
    <Animated.View style={[s.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.greeting}>BENVENUTO</Text>
        <Text style={s.name}>{profile?.full_name}</Text>
      </View>

      {/* Section label */}
      <Text style={s.sectionLabel}>I TUOI ATLETI</Text>

      {loading ? (
        <View style={{ paddingHorizontal: 20, gap: 12, marginTop: 8 }}>
          {[0, 1, 2].map(i => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Skeleton width={52} height={52} borderRadius={26} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton width="60%" height={14} />
                <Skeleton width="40%" height={12} />
              </View>
            </View>
          ))}
        </View>
      ) : athletes.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="barbell-outline" size={40} color={colors.textMuted} />
          <Text style={s.emptyTitle}>Nessun atleta ancora</Text>
          <Text style={s.emptySubtitle}>Gli atleti possono cercarti e inviarti una richiesta.</Text>
        </View>
      ) : (
        <FlatList
          data={athletes}
          keyExtractor={(item) => item.athlete_id}
          renderItem={({ item }) => (
            <ScalePressable
              style={s.card}
              onPress={() => router.push({ pathname: '/(trainer)/athlete/[id]', params: { id: item.athlete_id } })}
            >
              {item.avatar_url ? (
                <Image source={{ uri: item.avatar_url }} style={s.cardAvatar} contentFit="cover" />
              ) : (
                <View style={s.cardAvatarFallback}>
                  <Text style={s.cardAvatarInitial}>{item.full_name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.cardName}>{item.full_name}</Text>
                <Text style={s.cardSub}>Tocca per vedere il profilo</Text>
              </View>
              <Text style={s.chevron}>›</Text>
            </ScalePressable>
          )}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Animated.View>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg, paddingTop: 60, paddingHorizontal: 24 },
  centered: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
  header: { paddingBottom: 20 },
  greeting: { fontSize: 11, fontWeight: '800', color: c.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  name: { fontSize: 28, fontWeight: '900', color: c.text, letterSpacing: -0.5 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: c.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16, marginTop: 8 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: c.text },
  emptySubtitle: { fontSize: 14, color: c.textSecondary, textAlign: 'center' },
  card: {
    backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border,
    padding: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  cardAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 14 },
  cardAvatarFallback: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  cardAvatarInitial: { color: c.accent, fontSize: 18, fontWeight: '800' },
  cardName: { color: c.text, fontSize: 16, fontWeight: '700' },
  cardSub: { color: c.textSecondary, fontSize: 13, marginTop: 2 },
  chevron: { color: c.textMuted, fontSize: 24 },
});
