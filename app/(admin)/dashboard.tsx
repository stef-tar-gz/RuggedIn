import { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { useTheme } from '../../context/ThemeContext';
import { ScalePressable } from '../../components/ScalePressable';

type Metrics = {
  total_users: number;
  trainers: number;
  athletes: number;
  active_pairs: number;
  total_plans: number;
  pending_requests: number;
};

export default function AdminDashboard() {
  const { profile, loading: profileLoading } = useProfile();
  const { colors } = useTheme();
  const router = useRouter();
  const s = makeStyles(colors);

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('get_admin_metrics');
    setMetrics(data as Metrics);
    setLoading(false);
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  useFocusEffect(fetchMetrics);

  if (profileLoading) {
    return <View style={s.center}><ActivityIndicator color={colors.accent} /></View>;
  }

  if (!(profile as any)?.is_admin) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>Accesso non autorizzato</Text>
      </View>
    );
  }

  const metricCards = [
    { label: 'Utenti totali', value: metrics?.total_users, icon: '👥' },
    { label: 'Trainer', value: metrics?.trainers, icon: '🏋️' },
    { label: 'Atleti', value: metrics?.athletes, icon: '🏃' },
    { label: 'Coppie attive', value: metrics?.active_pairs, icon: '🤝' },
    { label: 'Schede create', value: metrics?.total_plans, icon: '📋' },
    { label: 'Richieste pending', value: metrics?.pending_requests, icon: '⏳' },
  ];

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.headerLabel}>Pannello Admin</Text>
          <Text style={s.headerName}>{profile?.full_name}</Text>
        </View>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={s.avatar} />
        ) : (
          <View style={[s.avatar, s.avatarFallback]}>
            <Text style={s.avatarInitial}>{profile?.full_name?.[0]?.toUpperCase()}</Text>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <Text style={s.sectionTitle}>Metriche</Text>

        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
        ) : (
          <Animated.View style={[s.grid, { opacity: fadeAnim }]}>
            {metricCards.map((card) => (
              <View key={card.label} style={s.metricCard}>
                <Text style={s.metricIcon}>{card.icon}</Text>
                <Text style={s.metricValue}>{card.value ?? '—'}</Text>
                <Text style={s.metricLabel}>{card.label}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        <Text style={[s.sectionTitle, { marginTop: 32 }]}>Gestione</Text>

        <ScalePressable style={s.navButton} onPress={() => router.push('/(admin)/users')}>
          <Text style={s.navButtonIcon}>👤</Text>
          <View style={s.navButtonText}>
            <Text style={s.navButtonTitle}>Utenti</Text>
            <Text style={s.navButtonSub}>Visualizza, cerca ed elimina account</Text>
          </View>
          <Text style={s.navButtonChevron}>›</Text>
        </ScalePressable>

        <ScalePressable style={s.navButton} onPress={() => router.push('/(admin)/exercises')}>
          <Text style={s.navButtonIcon}>💪</Text>
          <View style={s.navButtonText}>
            <Text style={s.navButtonTitle}>Esercizi globali</Text>
            <Text style={s.navButtonSub}>Aggiungi, modifica o elimina dal catalogo</Text>
          </View>
          <Text style={s.navButtonChevron}>›</Text>
        </ScalePressable>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg },
  errorText: { color: c.textSecondary, fontSize: 16 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  headerLabel: { fontSize: 13, color: c.accent, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  headerName: { fontSize: 22, fontWeight: '800', color: c.text, marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: c.accent, fontWeight: '800', fontSize: 18 },
  scroll: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: c.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: {
    width: '30%', flexGrow: 1,
    backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border,
    padding: 16, alignItems: 'center', gap: 4,
  },
  metricIcon: { fontSize: 22 },
  metricValue: { fontSize: 26, fontWeight: '800', color: c.text },
  metricLabel: { fontSize: 11, color: c.textSecondary, textAlign: 'center' },
  navButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border,
    padding: 16, marginBottom: 12, gap: 14,
  },
  navButtonIcon: { fontSize: 24 },
  navButtonText: { flex: 1 },
  navButtonTitle: { fontSize: 16, fontWeight: '700', color: c.text },
  navButtonSub: { fontSize: 13, color: c.textSecondary, marginTop: 2 },
  navButtonChevron: { fontSize: 22, color: c.textMuted },
});
