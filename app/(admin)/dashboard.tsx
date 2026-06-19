import { useCallback, useRef, useState, useContext } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Animated, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import { ScalePressable } from '../../components/ScalePressable';
import { Skeleton } from '../../components/Skeleton';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - 40 - 32; // scroll padding + card padding
const CHART_H = 80;
const DAYS = 14;

type Metrics = {
  total_users: number;
  trainers: number;
  athletes: number;
  active_pairs: number;
  total_plans: number;
  pending_requests: number;
};

type PendingRequest = {
  id: string;
  created_at: string;
  athlete: { id: string; full_name: string; avatar_url: string | null };
  trainer: { id: string; full_name: string; avatar_url: string | null };
};

type DayCount = { date: string; count: number };

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function MiniChart({ data, color }: { data: DayCount[]; color: string }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  const barW = (CHART_W / data.length) - 3;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: CHART_H }}>
      {data.map((d, i) => {
        const h = Math.max(4, (d.count / max) * CHART_H);
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
            <View style={{ width: '100%', height: h, backgroundColor: color, borderRadius: 3, opacity: d.count === 0 ? 0.15 : 1 }} />
          </View>
        );
      })}
    </View>
  );
}

export default function AdminDashboard() {
  const { profile, loading: profileLoading } = useProfile();
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const router = useRouter();
  const s = makeStyles(colors);

  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [signupTrend, setSignupTrend] = useState<DayCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    fadeAnim.setValue(0);

    const since = new Date();
    since.setDate(since.getDate() - DAYS + 1);
    since.setHours(0, 0, 0, 0);

    const [metricsRes, requestsRes, signupsRes] = await Promise.all([
      supabase.rpc('get_admin_metrics'),
      supabase
        .from('trainer_athlete_requests')
        .select('id, created_at, athlete:athlete_id(id, full_name, avatar_url), trainer:trainer_id(id, full_name, avatar_url)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', since.toISOString()),
    ]);

    setMetrics(metricsRes.data as Metrics);
    setPendingRequests((requestsRes.data ?? []) as unknown as PendingRequest[]);

    // Build day-by-day count for last DAYS days
    const counts: Record<string, number> = {};
    for (let i = 0; i < DAYS; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      counts[d.toISOString().slice(0, 10)] = 0;
    }
    for (const row of signupsRes.data ?? []) {
      const day = row.created_at.slice(0, 10);
      if (day in counts) counts[day]++;
    }
    setSignupTrend(Object.entries(counts).map(([date, count]) => ({ date, count })));

    setLoading(false);
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  const handleApprove = async (req: PendingRequest) => {
    setApprovingId(req.id);
    const { error: reqError } = await supabase
      .from('trainer_athlete_requests')
      .update({ status: 'accepted' })
      .eq('id', req.id);
    if (reqError) {
      setApprovingId(null);
      showAlert({ title: 'Errore', message: 'Impossibile approvare la richiesta. Riprova.' });
      return;
    }
    const { error: pairError } = await supabase
      .from('trainer_athlete')
      .upsert({ trainer_id: req.trainer.id, athlete_id: req.athlete.id });
    if (pairError) {
      await supabase.from('trainer_athlete_requests').update({ status: 'pending' }).eq('id', req.id);
      setApprovingId(null);
      showAlert({ title: 'Errore', message: 'Impossibile creare la coppia trainer-atleta. Riprova.' });
      return;
    }
    setPendingRequests(prev => prev.filter(r => r.id !== req.id));
    setMetrics(prev => prev ? { ...prev, pending_requests: Math.max(0, prev.pending_requests - 1), active_pairs: prev.active_pairs + 1 } : prev);
    setApprovingId(null);
  };

  const handleReject = async (req: PendingRequest) => {
    setApprovingId(req.id);
    const { error } = await supabase
      .from('trainer_athlete_requests')
      .update({ status: 'rejected' })
      .eq('id', req.id);
    if (error) {
      setApprovingId(null);
      showAlert({ title: 'Errore', message: 'Impossibile rifiutare la richiesta. Riprova.' });
      return;
    }
    setPendingRequests(prev => prev.filter(r => r.id !== req.id));
    setMetrics(prev => prev ? { ...prev, pending_requests: Math.max(0, prev.pending_requests - 1) } : prev);
    setApprovingId(null);
  };

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  if (profileLoading) {
    return <View style={s.center}><ActivityIndicator color={colors.accent} /></View>;
  }

  if (!profile?.is_admin) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>Accesso non autorizzato</Text>
      </View>
    );
  }

  const metricCards = [
    { label: 'Utenti totali', value: metrics?.total_users, icon: 'people-outline' as const },
    { label: 'Trainer', value: metrics?.trainers, icon: 'barbell-outline' as const },
    { label: 'Atleti', value: metrics?.athletes, icon: 'person-outline' as const },
    { label: 'Coppie attive', value: metrics?.active_pairs, icon: 'link-outline' as const },
    { label: 'Schede create', value: metrics?.total_plans, icon: 'document-text-outline' as const },
    { label: 'Req. pending', value: metrics?.pending_requests, icon: 'time-outline' as const },
  ];

  const totalSignups = signupTrend.reduce((s, d) => s + d.count, 0);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.headerLabel}>Pannello Admin</Text>
          <Text style={s.headerName}>{profile?.full_name}</Text>
        </View>
        <TouchableOpacity style={s.settingsBtn} onPress={() => router.push('/(admin)/settings')}>
          <Ionicons name="settings-outline" size={24} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {loading ? (
          <View style={{ gap: 12, marginTop: 8 }}>
            <Skeleton width="30%" height={11} style={{ marginBottom: 4 }} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {[0,1,2,3,4,5].map(i => <Skeleton key={i} width="30%" height={80} borderRadius={16} style={{ flexGrow: 1 }} />)}
            </View>
            <Skeleton width="50%" height={11} style={{ marginTop: 20, marginBottom: 4 }} />
            <Skeleton height={140} borderRadius={20} />
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim }}>

            {/* ── METRICHE ── */}
            <Text style={s.sectionTitle}>Metriche</Text>
            <View style={s.grid}>
              {metricCards.map((card) => (
                <View key={card.label} style={s.metricCard}>
                  <Ionicons name={card.icon} size={20} color={colors.textMuted} />
                  <Text style={s.metricValue}>{card.value ?? '—'}</Text>
                  <Text style={s.metricLabel}>{card.label}</Text>
                </View>
              ))}
            </View>

            {/* ── TREND ISCRIZIONI ── */}
            <Text style={[s.sectionTitle, { marginTop: 28 }]}>Nuovi utenti — ultimi {DAYS} giorni</Text>
            <View style={s.chartCard}>
              <View style={s.chartTopRow}>
                <Text style={s.chartTotal}>{totalSignups}</Text>
                <Text style={s.chartTotalLabel}>registrazioni</Text>
              </View>
              <MiniChart data={signupTrend} color={colors.accent} />
              <View style={s.chartAxisRow}>
                <Text style={s.chartAxisLabel}>{formatDate(signupTrend[0]?.date ?? '')}</Text>
                <Text style={s.chartAxisLabel}>{formatDate(signupTrend[Math.floor(DAYS / 2)]?.date ?? '')}</Text>
                <Text style={s.chartAxisLabel}>{formatDate(signupTrend[DAYS - 1]?.date ?? '')}</Text>
              </View>
            </View>

            {/* ── RICHIESTE PENDING ── */}
            {pendingRequests.length > 0 && (
              <>
                <View style={s.sectionRow}>
                  <Text style={s.sectionTitle}>Richieste in attesa</Text>
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{pendingRequests.length}</Text>
                  </View>
                </View>
                {pendingRequests.map(req => (
                  <View key={req.id} style={s.requestCard}>
                    <View style={s.requestPeople}>
                      <View style={s.requestPerson}>
                        {req.athlete.avatar_url
                          ? <Image source={{ uri: req.athlete.avatar_url }} style={s.requestAvatar} contentFit="cover" />
                          : <View style={s.requestAvatarPlaceholder}><Text style={s.requestAvatarText}>{req.athlete.full_name.charAt(0)}</Text></View>
                        }
                        <View style={{ flex: 1 }}>
                          <Text style={s.requestRole}>Atleta</Text>
                          <Text style={s.requestName} numberOfLines={1}>{req.athlete.full_name}</Text>
                        </View>
                      </View>

                      <Ionicons name="arrow-forward" size={16} color={colors.textMuted} style={{ marginHorizontal: 4 }} />

                      <View style={s.requestPerson}>
                        {req.trainer.avatar_url
                          ? <Image source={{ uri: req.trainer.avatar_url }} style={s.requestAvatar} contentFit="cover" />
                          : <View style={s.requestAvatarPlaceholder}><Text style={s.requestAvatarText}>{req.trainer.full_name.charAt(0)}</Text></View>
                        }
                        <View style={{ flex: 1 }}>
                          <Text style={s.requestRole}>Trainer</Text>
                          <Text style={s.requestName} numberOfLines={1}>{req.trainer.full_name}</Text>
                        </View>
                      </View>
                    </View>

                    <Text style={s.requestDate}>{formatDate(req.created_at)}</Text>

                    {approvingId === req.id ? (
                      <ActivityIndicator color={colors.accent} style={{ marginTop: 12 }} />
                    ) : (
                      <View style={s.requestActions}>
                        <TouchableOpacity style={s.rejectBtn} onPress={() => handleReject(req)}>
                          <Ionicons name="close" size={16} color="#E8533A" />
                          <Text style={s.rejectBtnText}>Rifiuta</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.approveBtn} onPress={() => handleApprove(req)}>
                          <Ionicons name="checkmark" size={16} color="#fff" />
                          <Text style={s.approveBtnText}>Approva</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </>
            )}

            {/* ── GESTIONE ── */}
            <Text style={[s.sectionTitle, { marginTop: 28 }]}>Gestione</Text>

            <ScalePressable style={s.navButton} onPress={() => router.push('/(admin)/users')}>
              <Ionicons name="person-outline" size={24} color={colors.accent} />
              <View style={s.navButtonText}>
                <Text style={s.navButtonTitle}>Utenti</Text>
                <Text style={s.navButtonSub}>Visualizza, cerca ed elimina account</Text>
              </View>
              <Text style={s.navButtonChevron}>›</Text>
            </ScalePressable>

            <ScalePressable style={s.navButton} onPress={() => router.push('/(admin)/exercises')}>
              <Ionicons name="barbell-outline" size={24} color={colors.accent} />
              <View style={s.navButtonText}>
                <Text style={s.navButtonTitle}>Esercizi globali</Text>
                <Text style={s.navButtonSub}>Aggiungi, modifica o elimina dal catalogo</Text>
              </View>
              <Text style={s.navButtonChevron}>›</Text>
            </ScalePressable>

          </Animated.View>
        )}
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
  settingsBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 48 },

  sectionTitle: { fontSize: 11, fontWeight: '800', color: c.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 28, marginBottom: 12 },
  badge: { backgroundColor: c.accent, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  // Metriche
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: {
    width: '30%', flexGrow: 1,
    backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border,
    padding: 14, alignItems: 'center', gap: 4,
  },
  metricValue: { fontSize: 24, fontWeight: '800', color: c.text },
  metricLabel: { fontSize: 10, color: c.textSecondary, textAlign: 'center', lineHeight: 14 },

  // Chart
  chartCard: {
    backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border,
    padding: 16, marginBottom: 4,
  },
  chartTopRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 16 },
  chartTotal: { fontSize: 28, fontWeight: '900', color: c.text },
  chartTotalLabel: { fontSize: 13, color: c.textMuted },
  chartAxisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  chartAxisLabel: { fontSize: 10, color: c.textMuted },

  // Richieste pending
  requestCard: {
    backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border,
    padding: 16, marginBottom: 10,
  },
  requestPeople: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requestPerson: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  requestAvatar: { width: 36, height: 36, borderRadius: 18 },
  requestAvatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center' },
  requestAvatarText: { color: c.accent, fontSize: 14, fontWeight: '700' },
  requestRole: { fontSize: 10, color: c.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  requestName: { fontSize: 14, fontWeight: '700', color: c.text },
  requestDate: { fontSize: 11, color: c.textMuted, marginTop: 10 },
  requestActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: '#E8533A44', borderRadius: 12, paddingVertical: 10,
  },
  rejectBtnText: { color: '#E8533A', fontSize: 14, fontWeight: '700' },
  approveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#4CAF50', borderRadius: 12, paddingVertical: 10,
  },
  approveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Gestione
  navButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border,
    padding: 16, marginBottom: 12, gap: 14,
  },
  navButtonText: { flex: 1 },
  navButtonTitle: { fontSize: 16, fontWeight: '700', color: c.text },
  navButtonSub: { fontSize: 13, color: c.textSecondary, marginTop: 2 },
  navButtonChevron: { fontSize: 22, color: c.textMuted },
});
