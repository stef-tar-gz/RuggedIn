import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, TouchableOpacity, Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import ExerciseInfoModal, { ExerciseInfo } from '../../../components/ExerciseInfoModal';

type WorkoutPlan = { id: string; name: string; description: string | null; is_active: boolean; created_at: string };
type Exercise = {
  id: string; name: string; muscle_group: string | null; sets: number; reps: number;
  rest_seconds: number; notes: string | null; order_index: number;
  has_dropset: boolean; dropset_percentage: number | null;
  has_backoff: boolean; backoff_percentage: number | null;
  catalog_exercise_id: string | null;
};

export default function WorkoutPlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [infoExercise, setInfoExercise] = useState<ExerciseInfo | null>(null);

  const s = makeStyles(colors);

  useEffect(() => { fetchPlan(); }, [id]);

  const fetchPlan = async () => {
    const [{ data: planData }, { data: exData }] = await Promise.all([
      supabase.from('workout_plans').select('*').eq('id', id).single(),
      supabase.from('exercises')
        .select('*, exercise_catalog(name, muscle_group, equipment, difficulty, description, video_url)')
        .eq('workout_plan_id', id).eq('is_deleted', false).order('order_index'),
    ]);
    setPlan(planData);
    setExercises(exData || []);
    setLoading(false);
  };

  const openInfo = (exercise: Exercise) => {
    if (!exercise.catalog_exercise_id) return;
    const cat = (exercise as any).exercise_catalog;
    if (!cat) return;
    setInfoExercise({
      name: exercise.name,
      muscle_group: cat.muscle_group,
      equipment: cat.equipment,
      difficulty: cat.difficulty,
      description: cat.description,
      video_url: cat.video_url,
    });
  };

  const toggleActive = async () => {
    if (!plan) return;
    const { error } = await supabase.from('workout_plans').update({ is_active: !plan.is_active }).eq('id', id);
    if (error) Alert.alert('Errore', error.message);
    else setPlan(prev => prev ? { ...prev, is_active: !prev.is_active } : null);
  };

  if (loading) {
    return <View style={s.centered}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  return (
    <>
    <ScrollView style={s.container} contentContainerStyle={s.content}>

      <View style={s.topRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backText}>‹ Profilo atleta</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.editButton} onPress={() => router.push({ pathname: '/(trainer)/workout/edit/[id]', params: { id } })}>
          <Text style={s.editButtonText}>Modifica</Text>
        </TouchableOpacity>
      </View>

      <View style={s.planHeader}>
        <View style={s.planTitleRow}>
          <Text style={s.planName}>{plan?.name}</Text>
          <TouchableOpacity
            style={[s.statusBadge, { backgroundColor: plan?.is_active ? colors.successBg : colors.border }]}
            onPress={toggleActive}
          >
            <View style={[s.statusDot, { backgroundColor: plan?.is_active ? '#4CAF50' : colors.textMuted }]} />
            <Text style={[s.statusText, { color: plan?.is_active ? '#4CAF50' : colors.textSecondary }]}>
              {plan?.is_active ? 'Attiva' : 'Inattiva'}
            </Text>
          </TouchableOpacity>
        </View>
        {plan?.description && <Text style={s.planDescription}>{plan.description}</Text>}
        <Text style={s.planDate}>📅 Creata il {new Date(plan?.created_at ?? '').toLocaleDateString('it-IT')}</Text>
      </View>

      <View style={s.statsRow}>
        <View style={s.statBox}>
          <Text style={s.statValue}>{exercises.length}</Text>
          <Text style={s.statLabel}>Esercizi</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statValue}>{exercises.reduce((sum, e) => sum + e.sets, 0)}</Text>
          <Text style={s.statLabel}>Serie totali</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statValue}>{Math.round(exercises.reduce((sum, e) => sum + e.rest_seconds * e.sets, 0) / 60)}m</Text>
          <Text style={s.statLabel}>Riposo est.</Text>
        </View>
      </View>

      <Text style={s.sectionTitle}>Esercizi</Text>
      {exercises.map((exercise, index) => (
        <View key={exercise.id} style={s.exerciseCard}>
          <View style={s.exerciseLeft}>
            <Text style={s.exerciseIndex}>{index + 1}</Text>
          </View>
          <View style={s.exerciseBody}>
            <View style={s.exerciseNameRow}>
              <Text style={s.exerciseName}>{exercise.name}</Text>
              {exercise.catalog_exercise_id && (
                <TouchableOpacity onPress={() => openInfo(exercise)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={s.infoBtn}>ℹ️</Text>
                </TouchableOpacity>
              )}
            </View>
            {exercise.muscle_group && <Text style={s.muscleGroup}>{exercise.muscle_group}</Text>}
            <View style={s.exerciseStats}>
              <StatPill label="Serie" value={`${exercise.sets}`} colors={colors} />
              <StatPill label="Reps" value={`${exercise.reps}`} colors={colors} />
              <StatPill label="Riposo" value={`${exercise.rest_seconds}s`} colors={colors} />
            </View>
            {exercise.has_dropset && (
              <View style={s.techniqueBadge}>
                <View style={[s.techniqueIndicator, { backgroundColor: colors.accent }]} />
                <Text style={s.techniqueText}>Dropset -{exercise.dropset_percentage}%</Text>
              </View>
            )}
            {exercise.has_backoff && (
              <View style={s.techniqueBadge}>
                <View style={[s.techniqueIndicator, { backgroundColor: '#2196F3' }]} />
                <Text style={s.techniqueText}>Backoff -{exercise.backoff_percentage}%</Text>
              </View>
            )}
            {exercise.notes && <Text style={s.exerciseNotes}>📝 {exercise.notes}</Text>}
          </View>
        </View>
      ))}
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
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  backText: { color: c.accent, fontSize: 16 },
  editButton: { backgroundColor: c.surface, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: c.border },
  editButtonText: { color: c.accent, fontSize: 14, fontWeight: '600' },
  planHeader: { marginBottom: 24 },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  planName: { fontSize: 24, fontWeight: '800', color: c.text, flex: 1, marginRight: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '600' },
  planDescription: { color: c.textSecondary, fontSize: 14, marginBottom: 8, lineHeight: 20 },
  planDate: { color: c.textMuted, fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  statBox: { flex: 1, backgroundColor: c.surface, borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: c.border },
  statValue: { color: c.accent, fontSize: 22, fontWeight: '800' },
  statLabel: { color: c.textMuted, fontSize: 11, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: c.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  exerciseCard: { backgroundColor: c.surface, borderRadius: 12, padding: 16, flexDirection: 'row', marginBottom: 10, borderWidth: 1, borderColor: c.border },
  exerciseLeft: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center', marginRight: 14, marginTop: 2 },
  exerciseIndex: { color: c.accent, fontSize: 14, fontWeight: '800' },
  exerciseBody: { flex: 1 },
  exerciseNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 },
  exerciseName: { color: c.text, fontSize: 16, fontWeight: '700', flex: 1 },
  infoBtn: { fontSize: 16, marginLeft: 8 },
  muscleGroup: { color: c.accent, fontSize: 12, marginTop: 2 },
  exerciseStats: { flexDirection: 'row', flexWrap: 'wrap' },
  techniqueBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  techniqueIndicator: { width: 8, height: 8, borderRadius: 4 },
  techniqueText: { color: c.techniqueText, fontSize: 12, fontWeight: '600' },
  exerciseNotes: { color: c.textMuted, fontSize: 13, marginTop: 8, fontStyle: 'italic' },
});
