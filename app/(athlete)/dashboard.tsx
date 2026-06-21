import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { useTheme } from '@/context/ThemeContext';
import { ScalePressable } from '@/components/ScalePressable';
import { Skeleton } from '@/components/Skeleton';

type TrainerInfo = {
  id: string;
  full_name: string;
  avatar_url: string | null;
};

type Stats = {
  lastSessionDaysAgo: number | null;
  streakDays: number;
  totalSessions: number;
  activePlanName: string | null;
};

const DAYS_IT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

const GOAL_LABELS: Record<string, string> = {
  weight_loss: 'Dimagrimento',
  muscle_gain: 'Massa muscolare',
  strength: 'Forza',
  endurance: 'Resistenza',
  wellness: 'Benessere',
};

const GOAL_ICONS: Record<string, string> = {
  weight_loss: 'flame-outline',
  muscle_gain: 'barbell-outline',
  strength: 'trending-up-outline',
  endurance: 'bicycle-outline',
  wellness: 'leaf-outline',
};

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export default function AthleteDashboard() {
  const { profile, loading: profileLoading, refetch } = useProfile();
  const { colors } = useTheme();
  const router = useRouter();
  const s = makeStyles(colors);

  const [trainer, setTrainer] = useState<TrainerInfo | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const fetchDataRef = useRef<() => Promise<void>>();

  const now = new Date();
  const dateLabel = `${DAYS_IT[now.getDay()]} ${now.getDate()} ${MONTHS_IT[now.getMonth()]}`;

  const fetchData = async () => {
    if (!profile) return;

    const [trainerRelRes, logsRes, plansRes] = await Promise.all([
      supabase
        .from('trainer_athlete')
        .select('trainer_id')
        .eq('athlete_id', profile.id)
        .maybeSingle(),
      supabase
        .from('exercise_logs')
        .select('log_date')
        .eq('athlete_id', profile.id)
        .order('log_date', { ascending: false }),
      supabase
        .from('workout_plans')
        .select('name, is_active')
        .eq('athlete_id', profile.id),
    ]);

    // Trainer
    if (trainerRelRes.data?.trainer_id) {
      const { data: tp } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', trainerRelRes.data.trainer_id)
        .single();
      setTrainer(tp ?? null);
    } else {
      setTrainer(null);
    }

    // Stats sessioni
    const logs = logsRes.data ?? [];
    const uniqueDates = [...new Set(logs.map(l => l.log_date as string))].sort((a, b) => b.localeCompare(a));

    const lastSessionDaysAgo = uniqueDates.length > 0 ? daysAgo(uniqueDates[0]) : null;

    // Streak: giorni consecutivi con almeno un log
    let streak = 0;
    if (uniqueDates.length > 0) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      let cursor = new Date(today);
      // accetta anche se l'ultimo log è di oggi o ieri
      if (daysAgo(uniqueDates[0]) <= 1) {
        for (const dateStr of uniqueDates) {
          const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
          const diff = Math.round((cursor.getTime() - d.getTime()) / 86400000);
          if (diff <= 1) { streak++; cursor = d; } else break;
        }
      }
    }

    const activePlan = (plansRes.data ?? []).find((p: any) => p.is_active);

    setStats({
      lastSessionDaysAgo,
      streakDays: streak,
      totalSessions: uniqueDates.length,
      activePlanName: activePlan?.name ?? null,
    });

    setLoading(false);
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  };

  fetchDataRef.current = fetchData;

  useEffect(() => {
    if (profile) fetchDataRef.current?.();
  }, [profile]);

  useFocusEffect(useCallback(() => {
    refetch();
    setLoading(true);
    fadeAnim.setValue(0);
    fetchDataRef.current?.();
  }, []));

  const goal = profile?.goal;

  if (profileLoading || loading) {
    return (
      <View style={[s.container, { padding: 20, paddingTop: 60 }]}>
        <Skeleton width="55%" height={14} style={{ marginBottom: 6 }} />
        <Skeleton width="70%" height={30} style={{ marginBottom: 32 }} />
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <Skeleton height={100} borderRadius={20} style={{ flex: 1 }} />
          <Skeleton height={100} borderRadius={20} style={{ flex: 1 }} />
        </View>
        <Skeleton height={80} borderRadius={20} style={{ marginBottom: 12 }} />
        <Skeleton height={90} borderRadius={20} style={{ marginBottom: 12 }} />
        <Skeleton height={70} borderRadius={20} />
      </View>
    );
  }

  const lastSessionLabel = stats?.lastSessionDaysAgo === null
    ? 'Nessuna sessione ancora'
    : stats.lastSessionDaysAgo === 0
    ? 'Oggi'
    : stats.lastSessionDaysAgo === 1
    ? 'Ieri'
    : `${stats.lastSessionDaysAgo} giorni fa`;

  const streakLabel = stats?.streakDays
    ? `${stats.streakDays} ${stats.streakDays === 1 ? 'giorno' : 'giorni'} di fila`
    : null;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <Animated.View style={{ opacity: fadeAnim }}>

        {/* ── HEADER ── */}
        <View style={s.header}>
          <Text style={s.dateLabel}>{dateLabel}</Text>
          <Text style={s.greeting}>Ciao, {profile?.full_name?.split(' ')[0]}</Text>
        </View>

        {/* ── STATISTICHE ── */}
        <View style={s.statsRow}>
          {/* Ultima sessione */}
          <View style={[s.statCard, { flex: 1.2 }]}>
            <Ionicons name="time-outline" size={18} color={colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={s.statValue} numberOfLines={1}>{lastSessionLabel}</Text>
            <Text style={s.statLabel}>ultima sessione</Text>
          </View>

          {/* Sessioni totali */}
          <View style={s.statCard}>
            <Ionicons name="calendar-outline" size={18} color={colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={s.statValue}>{stats?.totalSessions ?? 0}</Text>
            <Text style={s.statLabel}>sessioni totali</Text>
          </View>
        </View>

        {/* Streak */}
        {streakLabel && (
          <View style={s.streakCard}>
            <Ionicons name="flame" size={28} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={s.streakValue}>{streakLabel}</Text>
              <Text style={s.streakSub}>Continua così!</Text>
            </View>
          </View>
        )}

        {/* ── OBIETTIVO ── */}
        {goal && (
          <>
            <Text style={s.sectionTitle}>Il tuo obiettivo</Text>
            <View style={s.goalCard}>
              <Ionicons
                name={(GOAL_ICONS[goal] ?? 'flag-outline') as any}
                size={22}
                color={colors.accent}
              />
              <Text style={s.goalValue}>{GOAL_LABELS[goal] ?? goal}</Text>
            </View>
          </>
        )}

        {/* ── SCHEDA ATTIVA (solo nome + link) ── */}
        {stats?.activePlanName && (
          <>
            <Text style={s.sectionTitle}>Scheda attiva</Text>
            <ScalePressable onPress={() => router.push('/(athlete)/plans')}>
              <View style={s.activePlanCard}>
                <Ionicons name="barbell-outline" size={20} color={colors.accent} />
                <Text style={s.activePlanName} numberOfLines={1}>{stats.activePlanName}</Text>
                <Text style={s.activePlanChevron}>›</Text>
              </View>
            </ScalePressable>
          </>
        )}

        {/* ── TRAINER ── */}
        <Text style={s.sectionTitle}>Il mio trainer</Text>
        {trainer ? (
          <View style={s.trainerCard}>
            <ScalePressable
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14 }}
              onPress={() => router.push({ pathname: '/(athlete)/trainer/[id]', params: { id: trainer.id } })}
            >
              {trainer.avatar_url ? (
                <Image source={{ uri: trainer.avatar_url }} style={s.trainerAvatar} contentFit="cover" />
              ) : (
                <View style={s.trainerAvatarPlaceholder}>
                  <Text style={s.trainerInitial}>{trainer.full_name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.trainerName}>{trainer.full_name}</Text>
                <Text style={s.trainerSub}>Personal Trainer</Text>
              </View>
            </ScalePressable>
            <ScalePressable
              onPress={() => router.push({ pathname: '/(athlete)/chat/[id]', params: { id: trainer.id, name: trainer.full_name } })}
              style={s.chatIconBtn}
            >
              <Ionicons name="chatbubble-outline" size={18} color={colors.accent} />
            </ScalePressable>
          </View>
        ) : (
          <ScalePressable onPress={() => router.push('/(athlete)/find-trainer')}>
            <View style={s.findTrainerCard}>
              <Ionicons name="search-outline" size={22} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={s.findTrainerText}>Trova un trainer</Text>
                <Text style={s.findTrainerSub}>Connettiti con un personal trainer</Text>
              </View>
              <Text style={s.trainerChevron}>›</Text>
            </View>
          </ScalePressable>
        )}

      </Animated.View>
    </ScrollView>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { paddingHorizontal: 20, paddingTop: 64, paddingBottom: 48 },

  // Header
  header: { marginBottom: 24 },
  dateLabel: { fontSize: 11, color: c.textMuted, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5 },
  greeting: { fontSize: 26, fontWeight: '900', color: c.text, marginTop: 2, letterSpacing: -0.5 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: c.surface, borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: c.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  statValue: { fontSize: 16, fontWeight: '800', color: c.text, marginBottom: 2 },
  statLabel: { fontSize: 11, color: c.textMuted, fontWeight: '600' },

  // Streak
  streakCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: c.accentBg, borderRadius: 20, padding: 18, marginBottom: 28,
    borderWidth: 1, borderColor: c.accentBorder,
  },
  streakFire: { fontSize: 28 },
  streakValue: { fontSize: 16, fontWeight: '800', color: c.accent },
  streakSub: { fontSize: 12, color: c.accent, opacity: 0.7, marginTop: 2 },

  // Sezione
  sectionTitle: { fontSize: 11, fontWeight: '800', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10, marginTop: 20 },

  // Obiettivo
  goalCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: c.surface, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: c.border,
  },
  goalValue: { fontSize: 16, fontWeight: '800', color: c.text },

  // Scheda attiva
  activePlanCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: c.surface, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: c.border,
  },
  activePlanName: { flex: 1, fontSize: 15, fontWeight: '700', color: c.text },
  activePlanChevron: { color: c.textMuted, fontSize: 22 },

  // Trainer
  trainerCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface,
    borderRadius: 20, padding: 18, borderWidth: 1, borderColor: c.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  chatIconBtn: { padding: 8, marginLeft: 4 },
  trainerAvatar: { width: 48, height: 48, borderRadius: 24 },
  trainerAvatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center' },
  trainerInitial: { color: c.accent, fontSize: 18, fontWeight: '800' },
  trainerName: { fontSize: 15, fontWeight: '700', color: c.text },
  trainerSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  trainerChevron: { color: c.textMuted, fontSize: 22 },
  findTrainerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: c.accentBg,
    borderRadius: 20, padding: 18, borderWidth: 1, borderColor: c.accentBorder,
  },
  findTrainerText: { fontSize: 15, fontWeight: '800', color: c.accent },
  findTrainerSub: { fontSize: 12, color: c.accent, opacity: 0.7, marginTop: 2 },
});
