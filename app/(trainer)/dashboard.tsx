import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Animated, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ScalePressable } from '@/components/ScalePressable';
import { Skeleton } from '@/components/Skeleton';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';

type Athlete = { id: string; full_name: string; athlete_id: string; avatar_url: string | null };
type Stats = { totalAthletes: number; totalPlans: number; sessionsThisWeek: number };

export default function TrainerDashboard() {
  const { profile, loading: profileLoading } = useProfile();
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const s = makeStyles(colors);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const fetchDataRef = useRef<() => Promise<void>>();

  const fetchData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const athletesRes = await supabase.rpc('get_my_athletes');
      if (athletesRes.error) {
        showAlert({ title: 'Errore', message: athletesRes.error.message });
        return;
      }

      const raw: Athlete[] = athletesRes.data || [];
      let hydratedAthletes: Athlete[] = [];

      if (raw.length > 0) {
        const ids = raw.map((a) => a.athlete_id);
        const { data: profilesData } = await supabase
          .from('profiles').select('id, avatar_url').in('id', ids);
        const avatarMap: Record<string, string | null> = {};
        (profilesData || []).forEach((p: any) => { avatarMap[p.id] = p.avatar_url; });
        hydratedAthletes = raw.map((a) => ({ ...a, avatar_url: avatarMap[a.athlete_id] ?? null }));
      }

      setAthletes(hydratedAthletes);

      // Stats
      const athleteIds = raw.map((a) => a.athlete_id);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const [plansRes, sessionsRes] = await Promise.all([
        athleteIds.length > 0
          ? supabase.from('workout_plans').select('id', { count: 'exact', head: true }).in('athlete_id', athleteIds)
          : Promise.resolve({ count: 0 }),
        athleteIds.length > 0
          ? supabase.from('exercise_logs').select('log_date', { count: 'exact', head: true })
              .in('athlete_id', athleteIds)
              .gte('log_date', weekStart.toISOString().split('T')[0])
          : Promise.resolve({ count: 0 }),
      ]);

      setStats({
        totalAthletes: raw.length,
        totalPlans: (plansRes as any).count ?? 0,
        sessionsThisWeek: (sessionsRes as any).count ?? 0,
      });
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  };

  fetchDataRef.current = fetchData;

  useEffect(() => {
    if (profile) fetchDataRef.current?.();
  }, [profile]);

  useFocusEffect(useCallback(() => {
    fadeAnim.setValue(0);
    setLoading(true);
    fetchDataRef.current?.();
  }, []));

  if (profileLoading) return <View style={s.centered} />;

  return (
    <Animated.View style={[s.container, { opacity: fadeAnim }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.greeting}>BENVENUTO</Text>
          <Text style={s.name}>{profile?.full_name}</Text>
        </View>

        {/* Statistiche */}
        <Text style={s.sectionLabel}>PANORAMICA</Text>
        {loading ? (
          <View style={s.statsRow}>
            {[0, 1, 2].map(i => <Skeleton key={i} height={88} borderRadius={20} style={{ flex: 1 }} />)}
          </View>
        ) : (
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Ionicons name="people-outline" size={20} color={colors.accent} style={{ marginBottom: 8 }} />
              <Text style={s.statValue}>{stats?.totalAthletes ?? 0}</Text>
              <Text style={s.statLabel}>atleti</Text>
            </View>
            <View style={s.statCard}>
              <Ionicons name="barbell-outline" size={20} color={colors.accent} style={{ marginBottom: 8 }} />
              <Text style={s.statValue}>{stats?.totalPlans ?? 0}</Text>
              <Text style={s.statLabel}>schede create</Text>
            </View>
            <View style={s.statCard}>
              <Ionicons name="flash-outline" size={20} color={colors.accent} style={{ marginBottom: 8 }} />
              <Text style={s.statValue}>{stats?.sessionsThisWeek ?? 0}</Text>
              <Text style={s.statLabel}>sessioni week</Text>
            </View>
          </View>
        )}

        {/* Lista atleti */}
        <Text style={[s.sectionLabel, { marginTop: 8 }]}>I TUOI ATLETI</Text>

        {loading ? (
          <View style={{ gap: 12, marginTop: 8 }}>
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
          <View style={{ gap: 12 }}>
            {athletes.map((item) => (
              <ScalePressable
                key={item.athlete_id}
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
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </ScalePressable>
            ))}
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg, paddingTop: 60, paddingHorizontal: 24 },
  centered: { flex: 1, backgroundColor: c.bg },
  header: { paddingBottom: 20 },
  greeting: { fontSize: 11, fontWeight: '800', color: c.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  name: { fontSize: 28, fontWeight: '900', color: c.text, letterSpacing: -0.5 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: c.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: c.surface, borderRadius: 20, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: c.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  statValue: { fontSize: 22, fontWeight: '900', color: c.text, letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2, textAlign: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 48 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: c.text },
  emptySubtitle: { fontSize: 14, color: c.textSecondary, textAlign: 'center' },
  card: {
    backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border,
    padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  cardAvatar: { width: 48, height: 48, borderRadius: 24 },
  cardAvatarFallback: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center' },
  cardAvatarInitial: { color: c.accent, fontSize: 18, fontWeight: '800' },
  cardName: { color: c.text, fontSize: 16, fontWeight: '700' },
  cardSub: { color: c.textSecondary, fontSize: 13, marginTop: 2 },
});
