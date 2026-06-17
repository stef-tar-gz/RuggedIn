import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, Animated,
} from 'react-native';
import { ScalePressable } from '@/components/ScalePressable';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { useTheme } from '@/context/ThemeContext';

type WorkoutPlan = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  exercise_count: number;
};

type TrainerInfo = {
  id: string;
  full_name: string;
  avatar_url: string | null;
};

type NextDay = {
  day_index: number;
  exercises: string[];
};

const DAYS_IT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MONTHS_IT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

const GOAL_LABELS: Record<string, string> = {
  weight_loss: '⚖️ Dimagrimento',
  muscle_gain: '💪 Massa muscolare',
  strength: '🏋️ Forza',
  endurance: '🏃 Resistenza',
  wellness: '🧘 Benessere',
};

export default function PlansScreen() {
  const { profile, refetch } = useProfile();
  const { colors } = useTheme();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [trainer, setTrainer] = useState<TrainerInfo | null>(null);
  const [nextDay, setNextDay] = useState<NextDay | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const s = makeStyles(colors);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const mainRowAnim = useRef(new Animated.Value(0)).current;
  const progressBtnAnim = useRef(new Animated.Value(0)).current;
  const otherPlansAnim = useRef(new Animated.Value(0)).current;

  const now = new Date();
  const dateLabel = `${DAYS_IT[now.getDay()]} ${now.getDate()} ${MONTHS_IT[now.getMonth()]}`;

  useFocusEffect(useCallback(() => {
    refetch();
    headerAnim.setValue(0);
    mainRowAnim.setValue(0);
    progressBtnAnim.setValue(0);
    otherPlansAnim.setValue(0);
  }, []));

  useEffect(() => {
    if (profile) fetchData();
  }, [profile]);

  useEffect(() => {
    if (!loading) {
      Animated.stagger(120, [
        Animated.timing(headerAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(mainRowAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(progressBtnAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(otherPlansAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  const fetchData = async () => {
    const [plansRes, trainerRelRes] = await Promise.all([
      supabase
        .from('workout_plans')
        .select('id, name, description, is_active, created_at, exercises(id)')
        .eq('athlete_id', profile!.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('trainer_athlete')
        .select('trainer_id')
        .eq('athlete_id', profile!.id)
        .maybeSingle(),
    ]);

    setPlans((plansRes.data || []).map((p: any) => ({
      id: p.id, name: p.name, description: p.description,
      is_active: p.is_active, created_at: p.created_at,
      exercise_count: p.exercises?.length ?? 0,
    })));

    if (trainerRelRes.data?.trainer_id) {
      const { data: tp } = await supabase
        .from('profiles').select('id, full_name, avatar_url')
        .eq('id', trainerRelRes.data.trainer_id).single();
      setTrainer(tp ?? null);
    } else {
      setTrainer(null);
    }

    // Prossimo giorno: cerca esercizi della scheda attiva per day_index
    const activePlanData = (plansRes.data || []).find((p: any) => p.is_active);
    if (activePlanData) {
      const { data: exData } = await supabase
        .from('exercises')
        .select('name, day_index')
        .eq('workout_plan_id', activePlanData.id)
        .eq('is_deleted', false)
        .order('day_index')
        .order('order_index');

      if (exData && exData.length > 0) {
        const days = [...new Set(exData.map((e: any) => e.day_index))].sort((a: number, b: number) => a - b);
        const totalDays = days.length;

        if (totalDays > 1) {
          const { data: lastLog } = await supabase
            .from('workout_logs')
            .select('day_index, log_date')
            .eq('athlete_id', profile!.id)
            .eq('workout_plan_id', activePlanData.id)
            .order('log_date', { ascending: false })
            .limit(1)
            .maybeSingle();

          const lastDayIndex = lastLog?.day_index ?? 0;

          const lastDayPos = days.indexOf(lastDayIndex);
          const nextDayIndex = lastDayPos === -1 || lastDayPos === totalDays - 1
            ? days[0] as number
            : days[lastDayPos + 1] as number;

          setNextDay({
            day_index: nextDayIndex,
            exercises: exData.filter((e: any) => e.day_index === nextDayIndex).map((e: any) => e.name),
          });
        } else {
          setNextDay(null);
        }
      }
    }

    setLoading(false);
  };

  const activePlan = plans.find(p => p.is_active) ?? null;
  const otherPlans = plans.filter(p => !p.is_active);
  const goal = (profile as any)?.goal;

  if (loading) {
    return <View style={s.centered}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  const trainerDestination = trainer
    ? { pathname: '/(athlete)/trainer/[id]' as const, params: { id: trainer.id } }
    : '/(athlete)/find-trainer' as const;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* ── HEADER ── */}
      <Animated.View style={{ opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
        <View style={s.header}>
          <View>
            <Text style={s.dateLabel}>{dateLabel}</Text>
            <Text style={s.greeting}>Ciao, {profile?.full_name?.split(' ')[0]} 👋</Text>
          </View>
          <ScalePressable onPress={() => router.push('/(athlete)/profile')}>
            <View style={s.avatarWrap}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={s.avatar} contentFit="cover" />
              ) : (
                <View style={s.avatarPlaceholder}>
                  <Text style={s.avatarInitial}>{profile?.full_name?.charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </View>
          </ScalePressable>
        </View>
      </Animated.View>

      {/* ── RIGA PRINCIPALE: scheda 3/4 + trainer 1/4 ── */}
      <Animated.View style={{ opacity: mainRowAnim, transform: [{ translateY: mainRowAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
        <View style={s.mainRow}>

          {/* Scheda attiva — 3/4 */}
          <View style={s.heroWrap}>
            {activePlan ? (
              <ScalePressable style={{ flex: 1 }} onPress={() => router.push({ pathname: '/(athlete)/plan/[id]', params: { id: activePlan.id } })}>
                <View style={s.heroCard}>
                  <View style={s.activePill}>
                    <View style={s.activeDot} />
                    <Text style={s.activePillText}>Attiva</Text>
                  </View>
                  <Text style={s.heroPlanName} numberOfLines={2}>{activePlan.name}</Text>
                  {activePlan.description ? (
                    <Text style={s.heroPlanDesc} numberOfLines={2}>{activePlan.description}</Text>
                  ) : null}
                  <View style={s.heroFooter}>
                    <Text style={s.heroMeta}>💪 {activePlan.exercise_count}</Text>
                    {goal ? <Text style={s.heroMeta}>{GOAL_LABELS[goal]?.split(' ')[0]}</Text> : null}
                  </View>
                  <Text style={s.heroLink}>Apri →</Text>
                </View>
              </ScalePressable>
            ) : (
              <View style={[s.heroCard, s.heroCardEmpty]}>
                <Text style={s.heroEmptyIcon}>📭</Text>
                <Text style={s.heroEmptyText}>Nessuna{'\n'}scheda attiva</Text>
              </View>
            )}
          </View>

          {/* Trainer — 1/4 */}
          <ScalePressable style={s.trainerWrap} onPress={() => router.push(trainerDestination)}>
            <View style={s.trainerCard}>
              {trainer ? (
                <>
                  {trainer.avatar_url ? (
                    <Image source={{ uri: trainer.avatar_url }} style={s.trainerAvatar} contentFit="cover" />
                  ) : (
                    <View style={s.trainerAvatarPlaceholder}>
                      <Text style={s.trainerInitial}>{trainer.full_name.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <Text style={s.trainerName} numberOfLines={1}>{trainer.full_name.split(' ')[0]}</Text>
                  <Text style={s.trainerLabel}>Trainer</Text>
                </>
              ) : (
                <>
                  <Text style={s.trainerEmpty}>🔍</Text>
                  <Text style={s.trainerLabel}>Trova{'\n'}Trainer</Text>
                </>
              )}
            </View>
          </ScalePressable>

        </View>
      </Animated.View>

      {/* ── PROSSIMO ALLENAMENTO ── */}
      {nextDay && (
        <Animated.View style={{ opacity: progressBtnAnim, transform: [{ translateY: progressBtnAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
          <View style={s.nextDayCard}>
            <View style={s.nextDayHeader}>
              <Text style={s.nextDayLabel}>PROSSIMO ALLENAMENTO</Text>
              <Text style={s.nextDayBadge}>Giorno {nextDay.day_index}</Text>
            </View>
            <View style={s.nextDayExercises}>
              {nextDay.exercises.slice(0, 4).map((name, i) => (
                <View key={i} style={s.nextDayRow}>
                  <View style={s.nextDayDot} />
                  <Text style={s.nextDayExName} numberOfLines={1}>{name}</Text>
                </View>
              ))}
              {nextDay.exercises.length > 4 && (
                <Text style={s.nextDayMore}>+{nextDay.exercises.length - 4} altri</Text>
              )}
            </View>
            <ScalePressable
              onPress={() => router.push({ pathname: '/(athlete)/session', params: { planId: activePlan!.id, dayIndex: String(nextDay.day_index) } })}
            >
              <View style={s.nextDayStartBtn}>
                <Text style={s.nextDayStartText}>▶ Avvia</Text>
              </View>
            </ScalePressable>
          </View>
        </Animated.View>
      )}

      {/* ── PROGRESSI ── */}
      <Animated.View style={{ opacity: progressBtnAnim, transform: [{ translateY: progressBtnAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
        <ScalePressable onPress={() => router.push('/(athlete)/progress')}>
          <View style={s.progressBtn}>
            <View style={s.progressBtnLeft}>
              <Text style={s.progressBtnIcon}>📈</Text>
              <View>
                <Text style={s.progressBtnTitle}>I miei progressi</Text>
                <Text style={s.progressBtnSub}>Grafici, record e storico</Text>
              </View>
            </View>
            <Text style={s.progressBtnChevron}>›</Text>
          </View>
        </ScalePressable>
      </Animated.View>

      {/* ── ALTRE SCHEDE ── */}
      <Animated.View style={{ opacity: otherPlansAnim, transform: [{ translateY: otherPlansAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
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
                  <Text style={s.planMeta}>💪 {plan.exercise_count} esercizi · {new Date(plan.created_at).toLocaleDateString('it-IT')}</Text>
                </View>
                <Text style={s.planChevron}>›</Text>
              </ScalePressable>
            ))}
          </>
        )}

        {plans.length === 0 && (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>Nessuna scheda ancora.</Text>
            <Text style={s.emptySubtext}>Il tuo trainer la creerà presto.</Text>
          </View>
        )}
      </Animated.View>

    </ScrollView>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { paddingHorizontal: 20, paddingTop: 64, paddingBottom: 48 },
  centered: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  dateLabel: { fontSize: 11, color: c.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  greeting: { fontSize: 22, fontWeight: '800', color: c.text, marginTop: 2 },
  avatarWrap: { borderRadius: 24, borderWidth: 2, borderColor: c.accent },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarPlaceholder: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: c.accent, fontSize: 20, fontWeight: '800' },

  // Riga principale
  mainRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  heroWrap: { flex: 3 },
  heroCard: { flex: 1, backgroundColor: c.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: c.accentBorder, minHeight: 180 },
  heroCardEmpty: { alignItems: 'center', justifyContent: 'center', borderColor: c.border },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.accentBg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 10 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4CAF50' },
  activePillText: { color: c.accent, fontSize: 11, fontWeight: '700' },
  heroPlanName: { fontSize: 17, fontWeight: '800', color: c.text, marginBottom: 6, lineHeight: 22 },
  heroPlanDesc: { fontSize: 12, color: c.textSecondary, marginBottom: 10, lineHeight: 17 },
  heroFooter: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 10 },
  heroMeta: { fontSize: 12, color: c.textMuted },
  heroLink: { fontSize: 13, color: c.accent, fontWeight: '700' },
  heroEmptyIcon: { fontSize: 28, marginBottom: 8 },
  heroEmptyText: { color: c.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 18 },

  // Trainer
  trainerWrap: { flex: 1 },
  trainerCard: { flex: 1, backgroundColor: c.surface, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center', minHeight: 180, gap: 8 },
  trainerAvatar: { width: 44, height: 44, borderRadius: 22 },
  trainerAvatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center' },
  trainerInitial: { color: c.accent, fontSize: 18, fontWeight: '800' },
  trainerName: { fontSize: 12, fontWeight: '700', color: c.text, textAlign: 'center' },
  trainerLabel: { fontSize: 10, color: c.textMuted, textAlign: 'center', lineHeight: 14 },
  trainerEmpty: { fontSize: 24 },

  // Prossimo allenamento
  nextDayCard: { backgroundColor: c.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border },
  nextDayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  nextDayLabel: { fontSize: 10, fontWeight: '800', color: c.textMuted, letterSpacing: 1.5 },
  nextDayBadge: { backgroundColor: c.accentBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, fontSize: 12, fontWeight: '700', color: c.accent },
  nextDayExercises: { gap: 8 },
  nextDayRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nextDayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent },
  nextDayExName: { fontSize: 14, color: c.text, fontWeight: '500', flex: 1 },
  nextDayMore: { fontSize: 12, color: c.textMuted, marginTop: 4, marginLeft: 16 },
  nextDayStartBtn: { marginTop: 14, backgroundColor: c.accent, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  nextDayStartText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Progressi
  progressBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.surface, borderRadius: 16, padding: 16, marginBottom: 28, borderWidth: 1, borderColor: c.border },
  progressBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  progressBtnIcon: { fontSize: 26 },
  progressBtnTitle: { fontSize: 15, fontWeight: '700', color: c.text },
  progressBtnSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  progressBtnChevron: { color: c.textMuted, fontSize: 22 },

  // Altre schede
  sectionTitle: { fontSize: 12, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  planCard: { backgroundColor: c.surface, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center' },
  planLeft: { flex: 1, marginRight: 8 },
  planName: { color: c.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  planDesc: { color: c.textSecondary, fontSize: 13, marginBottom: 6 },
  planMeta: { color: c.textMuted, fontSize: 12 },
  planChevron: { color: c.textMuted, fontSize: 20 },

  // Empty
  emptyCard: { backgroundColor: c.surface, borderRadius: 14, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: c.border },
  emptyText: { color: c.text, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  emptySubtext: { color: c.textMuted, fontSize: 13 },
});
