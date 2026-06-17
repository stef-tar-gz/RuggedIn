import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { ScalePressable } from '@/components/ScalePressable';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';

type Athlete = { id: string; full_name: string; athlete_id: string };

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

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  const ringOpacity = useRef(new Animated.Value(1)).current;

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
      pulseAnim.stopAnimation();
      ringOpacity.stopAnimation();
      pulseAnim.setValue(1);
      ringOpacity.setValue(1);
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

      if (athletesRes.error) showAlert({ title: 'Errore', message: athletesRes.error.message });
      else setAthletes(athletesRes.data || []);

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
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Ciao,</Text>
          <Text style={s.name}>{profile?.full_name} 💪</Text>
        </View>
        <View style={s.headerActions}>
          {/* Icona richieste con ring */}
          <TouchableOpacity style={s.iconButtonWrap} onPress={() => router.push('/(trainer)/requests')}>
            <Animated.View style={[
              s.iconRing,
              requestCount > 0
                ? { borderColor: '#c97a00', opacity: ringOpacity }
                : { borderColor: '#4CAF50', opacity: 1 },
            ]} />
            <View style={s.iconButton}>
              <Text style={s.iconButtonText}>✉️</Text>
            </View>
            {requestCount > 0 && (
              <Animated.View style={[s.badge, { transform: [{ scale: pulseAnim }] }]}>
                <Text style={s.badgeText}>{requestCount}</Text>
              </Animated.View>
            )}
          </TouchableOpacity>
          {/* Icona profilo */}
          <TouchableOpacity style={s.profileButtonWrap} onPress={() => router.push('/(trainer)/profile')}>
            <View style={s.iconButton}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={s.iconButtonImage} contentFit="cover" />
              ) : (
                <Text style={s.iconButtonText}>👤</Text>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>I tuoi atleti</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      ) : athletes.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyText}>Nessun atleta ancora.</Text>
          <Text style={s.emptySubtext}>Gli atleti possono cercarti e inviarti una richiesta.</Text>
        </View>
      ) : (
        <FlatList
          data={athletes}
          keyExtractor={(item) => item.athlete_id}
          renderItem={({ item }) => (
            <ScalePressable
              style={s.athleteCard}
              onPress={() => router.push({ pathname: '/(trainer)/athlete/[id]', params: { id: item.athlete_id } })}
            >
              <View style={s.athleteAvatar}>
                <Text style={s.athleteAvatarText}>{item.full_name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.athleteName}>{item.full_name}</Text>
                <Text style={s.athleteSub}>Tocca per vedere il profilo</Text>
              </View>
              <Text style={s.chevron}>›</Text>
            </ScalePressable>
          )}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </Animated.View>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg, paddingTop: 60, paddingHorizontal: 24 },
  centered: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  greeting: { fontSize: 14, color: c.textSecondary },
  name: { fontSize: 24, fontWeight: '800', color: c.text },
  headerActions: { flexDirection: 'row', gap: 10 },
  iconButtonWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  profileButtonWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: c.accent },
  iconRing: { position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 2 },
  iconButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  iconButtonText: { fontSize: 16 },
  iconButtonImage: { width: 36, height: 36, borderRadius: 18 },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: c.accent, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: c.text },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: c.text, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  emptySubtext: { color: c.textSecondary, fontSize: 14, textAlign: 'center' },
  athleteCard: { backgroundColor: c.surface, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: c.border },
  athleteAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  athleteAvatarText: { color: c.accent, fontSize: 18, fontWeight: '800' },
  athleteName: { color: c.text, fontSize: 16, fontWeight: '600' },
  athleteSub: { color: c.textSecondary, fontSize: 12, marginTop: 2 },
  chevron: { color: c.textSecondary, fontSize: 24 },
});
