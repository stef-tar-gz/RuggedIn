import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { ScalePressable } from '@/components/ScalePressable';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';

type Athlete = { id: string; full_name: string; athlete_id: string; avatar_url: string | null };

export default function TrainerDashboard() {
  const { profile, loading: profileLoading } = useProfile();
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [requestCount, setRequestCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const s = makeStyles(colors);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (requestCount > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(ringOpacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation(); ringOpacity.stopAnimation();
      pulseAnim.setValue(1); ringOpacity.setValue(1);
    }
  }, [requestCount]);

  const fetchData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [athletesRes, reqRes] = await Promise.all([
        supabase.rpc('get_my_athletes'),
        supabase
          .from('trainer_athlete_requests')
          .select('id', { count: 'exact', head: true })
          .eq('trainer_id', profile.id)
          .eq('status', 'pending'),
      ]);

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
      setRequestCount(reqRes.count ?? 0);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  if (profileLoading) {
    return <View style={s.centered}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  return (
    <Animated.View style={[s.container, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.greeting}>BENVENUTO</Text>
          <Text style={s.name}>{profile?.full_name}</Text>
        </View>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.iconWrap} onPress={() => router.push('/(trainer)/requests')}>
            <Animated.View style={[s.iconRing, requestCount > 0 ? { borderColor: '#c97a00', opacity: ringOpacity } : { borderColor: '#4CAF50', opacity: 1 }]} />
            <View style={s.iconBtn}>
              <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
            </View>
            {requestCount > 0 && (
              <Animated.View style={[s.badge, { transform: [{ scale: pulseAnim }] }]}>
                <Text style={s.badgeText}>{requestCount}</Text>
              </Animated.View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.avatarBtn} onPress={() => router.push('/(trainer)/profile')}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={s.avatarBtnImg} contentFit="cover" />
            ) : (
              <Text style={s.avatarBtnInitial}>{profile?.full_name?.charAt(0).toUpperCase()}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Section label */}
      <Text style={s.sectionLabel}>I TUOI ATLETI</Text>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 20 },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 11, fontWeight: '800', color: c.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  name: { fontSize: 28, fontWeight: '900', color: c.text, letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  iconRing: { position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 2 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  iconEmoji: { fontSize: 16 },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: c.accent, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  avatarBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.accentBg, borderWidth: 2, borderColor: c.accent, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarBtnImg: { width: 44, height: 44, borderRadius: 22 },
  avatarBtnInitial: { color: c.accent, fontSize: 18, fontWeight: '800' },
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
