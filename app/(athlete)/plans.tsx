import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScalePressable } from '@/components/ScalePressable';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { useTheme } from '@/context/ThemeContext';
import { Skeleton } from '@/components/Skeleton';

type WorkoutPlan = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  exercise_count: number;
};

type NextDay = {
  day_index: number;
  exercises: { name: string; muscle_group: string | null }[];
};

export default function PlansScreen() {
  const { profile, refetch } = useProfile();
  const { colors } = useTheme();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [nextDay, setNextDay] = useState<NextDay | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const s = makeStyles(colors);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const fetchDataRef = useRef<() => Promise<void>>();

  const fetchData = async () => {
    if (!profile) return;

    const [plansRes] = await Promise.all([
      supabase
        .from('workout_plans')
        .select('id, name, description, is_active, created_at, exercises(id)')
        .eq('athlete_id', profile.id)
        .order('created_at', { ascending: false }),
    ]);

    const rawPlans = plansRes.data || [];
    setPlans(rawPlans.map((p: any) => ({
      id: p.id, name: p.name, description: p.description,
      is_active: p.is_active, created_at: p.created_at,
      exercise_count: p.exercises?.length ?? 0,
    })));

    // Prossimo giorno della scheda attiva
    const activePlanData = rawPlans.find((p: any) => p.is_active);
    if (activePlanData) {
      const { data: exData } = await supabase
        .from('exercises')
        .select('name, day_index, muscle_group')
        .eq('workout_plan_id', activePlanData.id)
        .eq('is_deleted', false)
        .order('day_index')
        .order('order_index');

      if (exData && exData.length > 0) {
        const days = [...new Set(exData.map((e: any) => e.day_index as number))].sort((a, b) => a - b);

        if (days.length > 1) {
          const { data: lastLog } = await supabase
            .from('workout_logs')
            .select('day_index')
            .eq('athlete_id', profile.id)
            .eq('workout_plan_id', activePlanData.id)
            .order('log_date', { ascending: false })
            .limit(1)
            .maybeSingle();

          const lastDayPos = days.indexOf(lastLog?.day_index ?? -1);
          const nextDayIndex = lastDayPos === -1 || lastDayPos === days.length - 1
            ? days[0]
            : days[lastDayPos + 1];

          setNextDay({
            day_index: nextDayIndex,
            exercises: exData
              .filter((e: any) => e.day_index === nextDayIndex)
              .map((e: any) => ({ name: e.name, muscle_group: e.muscle_group })),
          });
        } else {
          // Scheda a giorno singolo — mostra sempre quel giorno
          setNextDay({
            day_index: days[0],
            exercises: exData.map((e: any) => ({ name: e.name, muscle_group: e.muscle_group })),
          });
        }
      } else {
        setNextDay(null);
      }
    } else {
      setNextDay(null);
    }

    setLoading(false);
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
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

  if (loading) {
    return (
      <View style={[s.container, { padding: 20, paddingTop: 60 }]}>
        <Skeleton width="40%" height={12} style={{ marginBottom: 10 }} />
        <Skeleton height={200} borderRadius={20} style={{ marginBottom: 16 }} />
        <Skeleton width="30%" height={11} style={{ marginBottom: 10 }} />
        <Skeleton height={72} borderRadius={16} style={{ marginBottom: 10 }} />
        <Skeleton height={72} borderRadius={16} />
      </View>
    );
  }

  const activePlan = plans.find(p => p.is_active) ?? null;
  const otherPlans = plans.filter(p => !p.is_active);

  // Raggruppa esercizi del prossimo giorno per gruppo muscolare
  const muscleGroups = nextDay
    ? [...new Set(nextDay.exercises.map(e => e.muscle_group).filter(Boolean))] as string[]
    : [];

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      <Animated.View style={{ opacity: fadeAnim }}>

        {/* ── HEADER ── */}
        <View style={s.header}>
          <Text style={s.headerLabel}>Le mie schede</Text>
        </View>

        {/* ── SESSIONE OGGI ── */}
        {activePlan && nextDay ? (
          <View style={s.sessionCard}>
            <View style={s.sessionTop}>
              <View>
                <Text style={s.sessionEyebrow}>Prossimo allenamento</Text>
                <Text style={s.sessionTitle}>{activePlan.name}</Text>
                <Text style={s.sessionDay}>Giorno {nextDay.day_index}</Text>
              </View>
              <View style={s.activePill}>
                <View style={s.activeDot} />
                <Text style={s.activePillText}>Attiva</Text>
              </View>
            </View>

            {/* Gruppi muscolari */}
            {muscleGroups.length > 0 && (
              <View style={s.muscleRow}>
                {muscleGroups.map(m => (
                  <View key={m} style={s.musclePill}>
                    <Text style={s.musclePillText}>{m}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Lista esercizi */}
            <View style={s.exerciseList}>
              {nextDay.exercises.slice(0, 5).map((ex, i) => (
                <View key={i} style={s.exerciseRow}>
                  <View style={s.exerciseDot} />
                  <Text style={s.exerciseName} numberOfLines={1}>{ex.name}</Text>
                </View>
              ))}
              {nextDay.exercises.length > 5 && (
                <Text style={s.exerciseMore}>+{nextDay.exercises.length - 5} altri esercizi</Text>
              )}
            </View>

            {/* Bottone sessione */}
            <ScalePressable
              onPress={() => router.push({
                pathname: '/(athlete)/session',
                params: { planId: activePlan.id, dayIndex: String(nextDay.day_index) },
              })}
            >
              <View style={s.startBtn}>
                <Ionicons name="caret-forward-circle" size={20} color="#fff" />
                <Text style={s.startBtnText}>Inizia sessione</Text>
              </View>
            </ScalePressable>

            {/* Link dettaglio scheda */}
            <ScalePressable
              onPress={() => router.push({ pathname: '/(athlete)/plan/[id]', params: { id: activePlan.id } })}
              style={{ marginTop: 10 }}
            >
              <Text style={s.viewPlanLink}>Vedi scheda completa →</Text>
            </ScalePressable>
          </View>
        ) : activePlan ? (
          // Scheda attiva ma senza giorni configurati
          <ScalePressable
            onPress={() => router.push({ pathname: '/(athlete)/plan/[id]', params: { id: activePlan.id } })}
          >
            <View style={s.sessionCard}>
              <View style={s.activePill}>
                <View style={s.activeDot} />
                <Text style={s.activePillText}>Attiva</Text>
              </View>
              <Text style={[s.sessionTitle, { marginTop: 10 }]}>{activePlan.name}</Text>
              <Text style={s.sessionDay}>{activePlan.exercise_count} esercizi · Apri →</Text>
            </View>
          </ScalePressable>
        ) : (
          <View style={s.emptyCard}>
            <Ionicons name="document-outline" size={36} color={colors.textMuted} style={{ marginBottom: 10 }} />
            <Text style={s.emptyText}>Nessuna scheda attiva</Text>
            <Text style={s.emptySubtext}>Il tuo trainer la creerà presto.</Text>
          </View>
        )}

        {/* ── ALTRE SCHEDE ── */}
        {otherPlans.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Altre schede</Text>
            {otherPlans.map((plan) => (
              <ScalePressable
                key={plan.id}
                style={s.planCard}
                onPress={() => router.push({ pathname: '/(athlete)/plan/[id]', params: { id: plan.id } })}
              >
                <View style={s.planLeft}>
                  <Text style={s.planName}>{plan.name}</Text>
                  {plan.description && <Text style={s.planDesc} numberOfLines={1}>{plan.description}</Text>}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Ionicons name="barbell-outline" size={12} color={colors.textMuted} />
                    <Text style={s.planMeta}>{plan.exercise_count} esercizi · {new Date(plan.created_at).toLocaleDateString('it-IT')}</Text>
                  </View>
                </View>
                <Text style={s.planChevron}>›</Text>
              </ScalePressable>
            ))}
          </>
        )}

        {plans.length === 0 && !activePlan && (
          <View style={{ marginTop: 12 }}>
            <Text style={s.sectionTitle}>Altre schede</Text>
            <View style={s.emptyCard}>
              <Text style={s.emptySubtext}>Nessuna scheda disponibile.</Text>
            </View>
          </View>
        )}

      </Animated.View>
    </ScrollView>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 48 },

  header: { marginBottom: 20 },
  headerLabel: { fontSize: 24, fontWeight: '900', color: c.text, letterSpacing: -0.5 },

  // Card sessione principale
  sessionCard: {
    backgroundColor: c.surface, borderRadius: 24, padding: 20, marginBottom: 24,
    borderWidth: 1, borderColor: c.accentBorder,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 4,
  },
  sessionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  sessionEyebrow: { fontSize: 11, fontWeight: '800', color: c.accent, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 },
  sessionTitle: { fontSize: 20, fontWeight: '900', color: c.text, letterSpacing: -0.3 },
  sessionDay: { fontSize: 13, color: c.textMuted, marginTop: 3 },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.accentBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4CAF50' },
  activePillText: { color: c.accent, fontSize: 11, fontWeight: '800' },

  muscleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  musclePill: { backgroundColor: c.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: c.border },
  musclePillText: { color: c.textSecondary, fontSize: 12, fontWeight: '600' },

  exerciseList: { gap: 8, marginBottom: 20 },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exerciseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent },
  exerciseName: { fontSize: 14, color: c.text, fontWeight: '500', flex: 1 },
  exerciseMore: { fontSize: 12, color: c.textMuted, marginLeft: 16, marginTop: 2 },

  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: c.accent, borderRadius: 14, height: 52,
  },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  viewPlanLink: { color: c.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center' },

  // Sezione
  sectionTitle: { fontSize: 11, fontWeight: '800', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 },

  // Altre schede
  planCard: {
    backgroundColor: c.surface, borderRadius: 18, padding: 18, marginBottom: 10,
    borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  planLeft: { flex: 1, marginRight: 8 },
  planName: { color: c.text, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  planDesc: { color: c.textSecondary, fontSize: 13, marginBottom: 4 },
  planMeta: { color: c.textMuted, fontSize: 12 },
  planChevron: { color: c.textMuted, fontSize: 24 },

  // Empty
  emptyCard: {
    backgroundColor: c.surface, borderRadius: 20, padding: 36, alignItems: 'center',
    borderWidth: 1, borderColor: c.border, marginBottom: 24,
  },
  emptyText: { color: c.text, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptySubtext: { color: c.textMuted, fontSize: 14, textAlign: 'center' },
});
