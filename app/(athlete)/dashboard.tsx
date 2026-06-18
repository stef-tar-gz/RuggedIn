import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { useTheme } from '@/context/ThemeContext';
import { ScalePressable } from '@/components/ScalePressable';

type ActivePlan = {
  id: string;
  name: string;
  description: string | null;
  exercise_count: number;
};

type TrainerInfo = {
  full_name: string;
  avatar_url: string | null;
};

const DAYS_IT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

const GOAL_LABELS: Record<string, string> = {
  weight_loss: '⚖️ Dimagrimento',
  muscle_gain: '💪 Massa muscolare',
  strength: '🏋️ Forza',
  endurance: '🏃 Resistenza',
  wellness: '🧘 Benessere',
};

export default function AthleteDashboard() {
  const { profile, loading: profileLoading, refetch } = useProfile();
  const { colors } = useTheme();
  const router = useRouter();
  const s = makeStyles(colors);

  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);
  const [planCount, setPlanCount] = useState(0);
  const [trainer, setTrainer] = useState<TrainerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const now = new Date();
  const dateLabel = `${DAYS_IT[now.getDay()]} ${now.getDate()} ${MONTHS_IT[now.getMonth()]}`;

  const fetchData = useCallback(async () => {
    if (!profile) return;

    const [plansRes, trainerRelRes] = await Promise.all([
      supabase
        .from('workout_plans')
        .select('id, name, description, is_active, exercises(id)')
        .eq('athlete_id', profile.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('trainer_athlete')
        .select('trainer_id')
        .eq('athlete_id', profile.id)
        .maybeSingle(),
    ]);

    const plans = plansRes.data ?? [];
    setPlanCount(plans.length);
    const active = plans.find((p: any) => p.is_active);
    if (active) {
      setActivePlan({
        id: active.id,
        name: active.name,
        description: active.description,
        exercise_count: active.exercises?.length ?? 0,
      });
    } else {
      setActivePlan(null);
    }

    if (trainerRelRes.data?.trainer_id) {
      const { data: tp } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', trainerRelRes.data.trainer_id)
        .single();
      setTrainer(tp ?? null);
    } else {
      setTrainer(null);
    }

    setLoading(false);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [profile]);

  useFocusEffect(useCallback(() => {
    refetch();
    setLoading(true);
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
  }, []));

  useEffect(() => {
    if (profile) fetchData();
  }, [profile]);

  const goal = (profile as any)?.goal;
  const avatarUrl = profile?.avatar_url ?? null;

  if (profileLoading) {
    return <View style={s.centered}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.dateLabel}>{dateLabel}</Text>
          <Text style={s.greeting}>Ciao, {profile?.full_name?.split(' ')[0]} 👋</Text>
        </View>
        <ScalePressable onPress={() => router.push('/(athlete)/profile')}>
          <View style={s.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={s.avatar} contentFit="cover" />
            ) : (
              <View style={s.avatarPlaceholder}>
                <Text style={s.avatarInitial}>{profile?.full_name?.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>
        </ScalePressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 48 }} />
      ) : (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* Hero — scheda attiva */}
          <View style={s.heroCard}>
            <Text style={s.heroLabel}>SCHEDA ATTIVA</Text>
            {activePlan ? (
              <ScalePressable onPress={() => router.push({ pathname: '/(athlete)/plan/[id]', params: { id: activePlan.id } })}>
                <View style={s.heroContent}>
                  <Text style={s.heroPlanName}>{activePlan.name}</Text>
                  {activePlan.description ? (
                    <Text style={s.heroPlanDesc} numberOfLines={2}>{activePlan.description}</Text>
                  ) : null}
                  <View style={s.heroBadgeRow}>
                    <View style={s.heroBadge}>
                      <Text style={s.heroBadgeText}>💪 {activePlan.exercise_count} esercizi</Text>
                    </View>
                    <View style={s.heroBadge}>
                      <Text style={s.heroBadgeText}>📋 {planCount} schede totali</Text>
                    </View>
                  </View>
                  <View style={s.heroAction}>
                    <Text style={s.heroActionText}>Apri scheda →</Text>
                  </View>
                </View>
              </ScalePressable>
            ) : (
              <View style={s.heroEmpty}>
                <Text style={s.heroEmptyIcon}>📭</Text>
                <Text style={s.heroEmptyText}>Nessuna scheda attiva</Text>
                <Text style={s.heroEmptySub}>Il tuo trainer non ha ancora assegnato una scheda</Text>
              </View>
            )}
          </View>

          {/* Obiettivo */}
          {goal && (
            <View style={s.goalCard}>
              <Text style={s.goalLabel}>IL TUO OBIETTIVO</Text>
              <Text style={s.goalValue}>{GOAL_LABELS[goal] ?? goal}</Text>
            </View>
          )}

          {/* Accessi rapidi */}
          <Text style={s.sectionTitle}>Accesso rapido</Text>
          <View style={s.quickRow}>
            <ScalePressable style={s.quickCard} onPress={() => router.push('/(athlete)/plans')}>
              <Text style={s.quickIcon}>📋</Text>
              <Text style={s.quickLabel}>Le mie schede</Text>
              <Text style={s.quickSub}>{planCount} totali</Text>
            </ScalePressable>
            <ScalePressable style={s.quickCard} onPress={() => router.push('/(athlete)/progress')}>
              <Text style={s.quickIcon}>📈</Text>
              <Text style={s.quickLabel}>Progressi</Text>
              <Text style={s.quickSub}>Grafici & log</Text>
            </ScalePressable>
          </View>

          {/* Trainer */}
          <Text style={s.sectionTitle}>Il mio Trainer</Text>
          {trainer ? (
            <ScalePressable onPress={() => router.push('/(athlete)/find-trainer')}>
              <View style={s.trainerCard}>
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
                <Text style={s.trainerChevron}>›</Text>
              </View>
            </ScalePressable>
          ) : (
            <ScalePressable onPress={() => router.push('/(athlete)/find-trainer')}>
              <View style={s.findTrainerCard}>
                <Text style={s.findTrainerIcon}>🔍</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.findTrainerText}>Trova un trainer</Text>
                  <Text style={s.findTrainerSub}>Connettiti con un personal trainer</Text>
                </View>
                <Text style={s.trainerChevron}>›</Text>
              </View>
            </ScalePressable>
          )}

        </Animated.View>
      )}
    </ScrollView>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { paddingHorizontal: 24, paddingTop: 64, paddingBottom: 48 },
  centered: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  headerLeft: {},
  dateLabel: { fontSize: 11, color: c.textMuted, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5 },
  greeting: { fontSize: 28, fontWeight: '900', color: c.text, marginTop: 2, letterSpacing: -0.5 },
  avatarWrap: { borderRadius: 26, borderWidth: 2, borderColor: c.accent },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: c.accent, fontSize: 18, fontWeight: '800' },

  // Hero card
  heroCard: {
    backgroundColor: c.surface, borderRadius: 20, padding: 20, marginBottom: 14,
    borderWidth: 1, borderColor: c.accentBorder,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  heroLabel: { fontSize: 11, fontWeight: '800', color: c.accent, letterSpacing: 1.5, marginBottom: 12, textTransform: 'uppercase' },
  heroContent: {},
  heroPlanName: { fontSize: 20, fontWeight: '900', color: c.text, marginBottom: 6, letterSpacing: -0.3 },
  heroPlanDesc: { fontSize: 13, color: c.textSecondary, marginBottom: 14, lineHeight: 19 },
  heroBadgeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  heroBadge: { backgroundColor: c.accentBg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  heroBadgeText: { color: c.accent, fontSize: 12, fontWeight: '700' },
  heroAction: { alignSelf: 'flex-start', borderBottomWidth: 1.5, borderBottomColor: c.accent },
  heroActionText: { color: c.accent, fontSize: 14, fontWeight: '800', paddingBottom: 1 },
  heroEmpty: { alignItems: 'center', paddingVertical: 24 },
  heroEmptyIcon: { fontSize: 40, marginBottom: 10 },
  heroEmptyText: { color: c.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  heroEmptySub: { color: c.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 18 },

  // Goal
  goalCard: {
    backgroundColor: c.accentBg, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 14,
    marginBottom: 28, borderWidth: 1, borderColor: c.accentBorder,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  goalLabel: { fontSize: 11, fontWeight: '800', color: c.accent, letterSpacing: 1.5, textTransform: 'uppercase' },
  goalValue: { fontSize: 15, fontWeight: '800', color: c.accent },

  // Quick access
  sectionTitle: { fontSize: 11, fontWeight: '800', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 },
  quickRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  quickCard: {
    flex: 1, backgroundColor: c.surface, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: c.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  quickIcon: { fontSize: 26, marginBottom: 12 },
  quickLabel: { fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 3 },
  quickSub: { fontSize: 12, color: c.textMuted },

  // Trainer
  trainerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: c.surface,
    borderRadius: 20, padding: 18, borderWidth: 1, borderColor: c.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  trainerAvatar: { width: 48, height: 48, borderRadius: 24 },
  trainerAvatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center' },
  trainerInitial: { color: c.accent, fontSize: 18, fontWeight: '800' },
  trainerName: { fontSize: 15, fontWeight: '700', color: c.text },
  trainerSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  trainerChevron: { color: c.textMuted, fontSize: 24 },
  findTrainerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: c.accentBg,
    borderRadius: 20, padding: 18, borderWidth: 1, borderColor: c.accentBorder,
  },
  findTrainerIcon: { fontSize: 24 },
  findTrainerText: { fontSize: 15, fontWeight: '800', color: c.accent },
  findTrainerSub: { fontSize: 12, color: c.accent, opacity: 0.7, marginTop: 2 },
});
