import { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, TouchableOpacity, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import ExerciseInfoModal, { ExerciseInfo } from '../../../components/ExerciseInfoModal';

type Exercise = {
  id: string;
  name: string;
  muscle_group: string | null;
  sets: number;
  reps: number;
  rest_seconds: number;
  notes: string | null;
  order_index: number;
  day_index: number;
  has_dropset: boolean;
  dropset_percentage: number | null;
  dropset_sets: number | null;
  has_backoff: boolean;
  backoff_percentage: number | null;
  backoff_sets: number | null;
  has_stripping: boolean;
  stripping_steps: number | null;
  stripping_percentage: number | null;
  stripping_reps_increase: number | null;
  catalog_exercise_id: string | null;
};

type WorkoutPlan = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  exercises: Exercise[];
};

export default function AthletePlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [infoExercise, setInfoExercise] = useState<ExerciseInfo | null>(null);
  const s = makeStyles(colors);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const exercisesAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchPlan();
  }, [id]);

  useEffect(() => {
    if (!loading) {
      Animated.stagger(120, [
        Animated.timing(headerAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(statsAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(exercisesAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  const fetchPlan = async () => {
    const { data: planData } = await supabase
      .from('workout_plans')
      .select('id, name, description, is_active, created_at')
      .eq('id', id)
      .single();

    const { data: exData } = await supabase
      .from('exercises')
      .select('id, name, muscle_group, sets, reps, rest_seconds, notes, order_index, day_index, has_dropset, dropset_percentage, dropset_sets, has_backoff, backoff_percentage, backoff_sets, has_stripping, stripping_steps, stripping_percentage, stripping_reps_increase, catalog_exercise_id, exercise_catalog(name, muscle_group, equipment, difficulty, description, video_url, image_url)')
      .eq('workout_plan_id', id)
      .eq('is_deleted', false)
      .order('order_index');

    if (planData) setPlan({ ...planData, exercises: (exData || []) as Exercise[] });
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <>
    <ScrollView style={s.container} contentContainerStyle={s.content}>

      <Animated.View style={{ opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
        <TouchableOpacity style={s.backButton} onPress={() => router.back()}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="chevron-back" size={22} color={colors.accent} />
            <Text style={s.backText}>Le mie schede</Text>
          </View>
        </TouchableOpacity>

        <View style={s.planHeader}>
          <View style={s.planTitleRow}>
            <Text style={s.planName}>{plan?.name}</Text>
            <View style={[s.statusBadge, { backgroundColor: plan?.is_active ? colors.successBg : colors.surface }]}>
              <View style={[s.statusDot, { backgroundColor: plan?.is_active ? '#4CAF50' : colors.textMuted }]} />
              <Text style={[s.statusText, { color: plan?.is_active ? '#4CAF50' : colors.textMuted }]}>
                {plan?.is_active ? 'Attiva' : 'Inattiva'}
              </Text>
            </View>
          </View>
          {plan?.description && <Text style={s.planDesc}>{plan.description}</Text>}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
            <Text style={s.planDate}>Creata il {new Date(plan?.created_at ?? '').toLocaleDateString('it-IT')}</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={{ opacity: statsAnim, transform: [{ translateY: statsAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statValue}>{plan?.exercises.length}</Text>
            <Text style={s.statLabel}>Esercizi</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>{plan?.exercises.reduce((sum, e) => sum + e.sets, 0)}</Text>
            <Text style={s.statLabel}>Serie totali</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>{Math.round((plan?.exercises.reduce((sum, e) => sum + e.rest_seconds * e.sets, 0) ?? 0) / 60)}m</Text>
            <Text style={s.statLabel}>Riposo est.</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={{ opacity: exercisesAnim, transform: [{ translateY: exercisesAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
      {(() => {
        const days = Array.from(new Set((plan?.exercises ?? []).map(e => e.day_index))).sort((a, b) => a - b);
        const multiDay = days.length > 1;
        return days.map(day => {
          const dayExercises = (plan?.exercises ?? []).filter(e => e.day_index === day);
          return (
            <View key={day}>
              {multiDay && <Text style={s.sectionTitle}>Giorno {day}</Text>}
              {!multiDay && <Text style={s.sectionTitle}>Esercizi</Text>}
              {dayExercises.map((exercise, index) => {
                const cat = (exercise as any).exercise_catalog;
                return (
                <View key={exercise.id} style={s.exerciseCard}>
                  <View style={s.exerciseBody}>
                    <View style={s.exerciseNameRow}>
                      <Text style={s.exerciseName}>{exercise.name}</Text>
                      {exercise.catalog_exercise_id && (
                        <TouchableOpacity
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          onPress={() => {
                            if (cat) setInfoExercise({ name: exercise.name, muscle_group: cat.muscle_group, equipment: cat.equipment, difficulty: cat.difficulty, description: cat.description, video_url: cat.video_url, image_url: cat.image_url });
                          }}
                        >
                          <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                      )}
                    </View>
                    {exercise.muscle_group && <Text style={s.muscleGroup}>{exercise.muscle_group}</Text>}
                    <View style={s.pillRow}>
                      <StatPill label="Serie" value={`${exercise.sets}`} colors={colors} />
                      <StatPill label="Reps" value={`${exercise.reps}`} colors={colors} />
                      <StatPill label="Riposo" value={`${exercise.rest_seconds}s`} colors={colors} />
                    </View>
                    {(exercise.has_dropset || exercise.has_backoff || exercise.has_stripping) && (
                      <View style={s.techniqueRow}>
                        {exercise.has_dropset && (
                          <View style={[s.techniquePill, { backgroundColor: colors.accentBg, borderColor: colors.accentBorder }]}>
                            <Text style={[s.techniquePillText, { color: colors.accent }]}>
                              DS ×{exercise.dropset_sets ?? 1}  -{exercise.dropset_percentage}%
                            </Text>
                          </View>
                        )}
                        {exercise.has_backoff && (
                          <View style={[s.techniquePill, { backgroundColor: '#2196F318', borderColor: '#2196F344' }]}>
                            <Text style={[s.techniquePillText, { color: '#2196F3' }]}>
                              BO ×{exercise.backoff_sets ?? 1}  -{exercise.backoff_percentage}%
                            </Text>
                          </View>
                        )}
                        {exercise.has_stripping && (
                          <View style={[s.techniquePill, { backgroundColor: '#9C27B018', borderColor: '#9C27B044' }]}>
                            <Text style={[s.techniquePillText, { color: '#9C27B0' }]}>
                              Strip {exercise.stripping_steps}× -{exercise.stripping_percentage}%{(exercise.stripping_reps_increase ?? 0) > 0 ? `  +${exercise.stripping_reps_increase}r` : ''}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                    {exercise.notes && (
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 8 }}>
                        <Ionicons name="document-text-outline" size={14} color={colors.textMuted} style={{ marginTop: 1 }} />
                        <Text style={s.exerciseNotes}>{exercise.notes}</Text>
                      </View>
                    )}
                    <View style={s.exerciseFooter}>
                      <View style={s.exerciseIndexBadge}>
                        <Text style={s.exerciseIndex}>{index + 1}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                );
              })}
              <TouchableOpacity
                style={s.startButton}
                onPress={() => router.push({ pathname: '/(athlete)/session', params: { planId: plan?.id, dayIndex: String(day) } })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="caret-forward" size={14} color="#fff" />
                  <Text style={s.startButtonText}>{multiDay ? `Inizia Giorno ${day}` : 'Inizia sessione'}</Text>
                </View>
              </TouchableOpacity>
              {multiDay && <View style={{ height: 24 }} />}
            </View>
          );
        });
      })()}
      </Animated.View>

    </ScrollView>

    <ExerciseInfoModal
      visible={!!infoExercise}
      exercise={infoExercise}
      onClose={() => setInfoExercise(null)}
    />
    </>
  );
}

function StatPill({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', marginRight: 6, marginTop: 8, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 1 }}>{label}</Text>
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48 },
  centered: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
  backButton: { marginBottom: 24 },
  backText: { color: c.accent, fontSize: 16 },
  planHeader: { marginBottom: 24 },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  planName: { fontSize: 24, fontWeight: '800', color: c.text, flex: 1, marginRight: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '600' },
  planDesc: { color: c.textSecondary, fontSize: 14, marginBottom: 8, lineHeight: 20 },
  planDate: { color: c.textMuted, fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  statBox: { flex: 1, backgroundColor: c.surface, borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: c.border },
  statValue: { color: c.accent, fontSize: 22, fontWeight: '800' },
  statLabel: { color: c.textMuted, fontSize: 11, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: c.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  exerciseCard: { backgroundColor: c.surface, borderRadius: 12, padding: 16, flexDirection: 'row', marginBottom: 10, borderWidth: 1, borderColor: c.border },
  exerciseBody: { flex: 1 },
  exerciseNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  exerciseFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  exerciseIndexBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  exerciseIndex: { color: '#fff', fontSize: 11, fontWeight: '800' },
  exerciseName: { color: c.text, fontSize: 16, fontWeight: '700', flex: 1 },
  infoBtn: { fontSize: 16, marginLeft: 8 },
  muscleGroup: { color: c.accent, fontSize: 12, marginTop: 2 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap' },
  techniqueRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  techniquePill: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  techniquePillText: { fontSize: 12, fontWeight: '700' },
  exerciseNotes: { color: c.textMuted, fontSize: 13, marginTop: 8, fontStyle: 'italic' },
  startButton: { backgroundColor: c.accent, borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 16 },
  startButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
