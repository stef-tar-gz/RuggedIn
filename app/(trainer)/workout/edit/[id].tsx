import { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Animated, KeyboardAvoidingView, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../../lib/supabase';
import { useProfile } from '../../../../hooks/useProfile';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';
import ExercisePickerModal, { CatalogExercise } from '../../../../components/ExercisePickerModal';
import ExerciseCardModal, { Exercise as BaseExercise } from '../../../../components/ExerciseCardModal';

type Exercise = BaseExercise & { id?: string; order_index: number };

export default function EditWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { profile } = useProfile();
  const { showAlert } = useAlert();

  const [planName, setPlanName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTargetIndex, setPickerTargetIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const s = makeStyles(colors);

  const backTitleAnim = useRef(new Animated.Value(0)).current;
  const infoAnim = useRef(new Animated.Value(0)).current;
  const exercisesAnim = useRef(new Animated.Value(0)).current;
  const saveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { fetchPlan(); }, [id]);

  useEffect(() => {
    if (!loading) {
      Animated.stagger(120, [
        Animated.timing(backTitleAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(infoAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(exercisesAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(saveAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  const fetchPlan = async () => {
    const [{ data: plan }, { data: exData }] = await Promise.all([
      supabase.from('workout_plans').select('*').eq('id', id).single(),
      supabase.from('exercises').select('*').eq('workout_plan_id', id).eq('is_deleted', false).order('order_index'),
    ]);
    if (plan) { setPlanName(plan.name); setDescription(plan.description ?? ''); setIsActive(plan.is_active); }
    if (exData) {
      setExercises(exData.map((e: any) => ({
        id: e.id,
        catalog_exercise_id: e.catalog_exercise_id ?? null,
        name: e.name, muscle_group: e.muscle_group ?? '',
        sets: String(e.sets), reps: String(e.reps),
        rest_seconds: String(e.rest_seconds), notes: e.notes ?? '', order_index: e.order_index,
        has_dropset: e.has_dropset ?? false,
        dropset_percentage: e.dropset_percentage != null ? String(e.dropset_percentage) : '20',
        dropset_sets: e.dropset_sets != null ? String(e.dropset_sets) : '1',
        has_backoff: e.has_backoff ?? false,
        backoff_percentage: e.backoff_percentage != null ? String(e.backoff_percentage) : '15',
        backoff_sets: e.backoff_sets != null ? String(e.backoff_sets) : '1',
        has_stripping: e.has_stripping ?? false,
        stripping_steps: e.stripping_steps != null ? String(e.stripping_steps) : '2',
        stripping_percentage: e.stripping_percentage != null ? String(e.stripping_percentage) : '20',
        stripping_reps_increase: e.stripping_reps_increase != null ? String(e.stripping_reps_increase) : '0',
        day_index: e.day_index ?? 1,
      })));
    }
    setLoading(false);
  };

  const updateExercise = (index: number, field: keyof Exercise, value: any) => {
    setExercises(prev => { const u = [...prev]; u[index] = { ...u[index], [field]: value }; return u; });
  };

  const emptyExercise = (dayIndex: number, orderIndex: number): Exercise => ({
    catalog_exercise_id: null, name: '', muscle_group: '',
    sets: '3', reps: '10', rest_seconds: '90', notes: '', order_index: orderIndex,
    has_dropset: false, dropset_percentage: '20', dropset_sets: '1',
    has_backoff: false, backoff_percentage: '15', backoff_sets: '1',
    has_stripping: false, stripping_steps: '2', stripping_percentage: '20', stripping_reps_increase: '0',
    day_index: dayIndex,
  });

  const addExercise = (dayIndex: number) => {
    setExercises(prev => [...prev, emptyExercise(dayIndex, prev.length)]);
  };

  const addDay = () => {
    setExercises(prev => {
      const maxDay = prev.reduce((max, e) => Math.max(max, e.day_index), 0);
      return [...prev, emptyExercise(maxDay + 1, prev.length)];
    });
  };

  const removeDay = (dayIndex: number) => {
    const dayExercises = exercises.filter(e => e.day_index === dayIndex && e.name.trim());
    const doRemove = () => setExercises(prev => prev.filter(e => e.day_index !== dayIndex));
    if (dayExercises.length > 0) {
      showAlert({
        title: 'Elimina giorno',
        message: `Sei sicuro di voler eliminare il Giorno ${dayIndex} e tutti i suoi esercizi?`,
        buttons: [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Elimina', style: 'destructive', onPress: doRemove },
        ],
      });
    } else {
      doRemove();
    }
  };

  const removeExercise = (index: number) => {
    setExercises(prev => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const openPicker = (index: number) => { setPickerTargetIndex(index); setPickerVisible(true); };

  const handleSelectExercise = (ex: CatalogExercise) => {
    if (pickerTargetIndex === null) return;
    setExercises(prev => {
      const u = [...prev];
      u[pickerTargetIndex] = { ...u[pickerTargetIndex], catalog_exercise_id: ex.id, name: ex.name, muscle_group: ex.muscle_group };
      return u;
    });
    setPickerVisible(false);
    setPickerTargetIndex(null);
    setEditingIndex(pickerTargetIndex);
  };

  const handleSave = async () => {
    if (!planName.trim()) { showAlert({ title: 'Errore', message: 'Inserisci un nome per la scheda.' }); return; }
    if (exercises.some(e => !e.name.trim())) { showAlert({ title: 'Errore', message: 'Ogni esercizio deve essere selezionato dal catalogo.' }); return; }

    setSaving(true);
    const { error: planError } = await supabase.from('workout_plans')
      .update({ name: planName.trim(), description: description.trim() || null, is_active: isActive })
      .eq('id', id);
    if (planError) { showAlert({ title: 'Errore', message: planError.message }); setSaving(false); return; }

    const { data: originalExercises } = await supabase.from('exercises').select('id').eq('workout_plan_id', id).eq('is_deleted', false);
    const originalIds = (originalExercises || []).map(e => e.id);
    const currentIds = exercises.filter(e => e.id).map(e => e.id as string);
    const deletedIds = originalIds.filter(oid => !currentIds.includes(oid));
    if (deletedIds.length > 0) await supabase.from('exercises').update({ is_deleted: true }).in('id', deletedIds);

    for (const [index, e] of exercises.entries()) {
      const payload = {
        catalog_exercise_id: e.catalog_exercise_id,
        name: e.name.trim(), muscle_group: e.muscle_group.trim() || null,
        sets: parseInt(e.sets) || 3, reps: parseInt(e.reps) || 10, rest_seconds: parseInt(e.rest_seconds) || 90,
        notes: e.notes.trim() || null, order_index: index,
        has_dropset: e.has_dropset,
        dropset_percentage: e.has_dropset ? parseFloat(e.dropset_percentage) || null : null,
        dropset_sets: e.has_dropset ? parseInt(e.dropset_sets) || 1 : null,
        has_backoff: e.has_backoff,
        backoff_percentage: e.has_backoff ? parseFloat(e.backoff_percentage) || null : null,
        backoff_sets: e.has_backoff ? parseInt(e.backoff_sets) || 1 : null,
        has_stripping: e.has_stripping,
        stripping_steps: e.has_stripping ? parseInt(e.stripping_steps) || 2 : null,
        stripping_percentage: e.has_stripping ? parseInt(e.stripping_percentage) || 20 : null,
        stripping_reps_increase: e.has_stripping ? parseInt(e.stripping_reps_increase) || 0 : null,
        day_index: e.day_index,
      };
      if (e.id) await supabase.from('exercises').update(payload).eq('id', e.id);
      else await supabase.from('exercises').insert({ workout_plan_id: id, ...payload });
    }

    setSaving(false);
    showAlert({ title: 'Salvato', message: 'Scheda aggiornata!', buttons: [{ text: 'OK', onPress: () => router.back() }] });
  };

  const days = [...new Set(exercises.map(e => e.day_index))].sort((a, b) => a - b);

  if (loading) {
    return <View style={s.centered}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}>
    <>
      <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Animated.View style={{ opacity: backTitleAnim, transform: [{ translateY: backTitleAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
          <TouchableOpacity style={s.backButton} onPress={() => router.back()}>
            <Text style={s.backText}>‹ Scheda</Text>
          </TouchableOpacity>
          <Text style={s.title}>Modifica scheda</Text>
        </Animated.View>

        <Animated.View style={{ opacity: infoAnim, transform: [{ translateY: infoAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
          <View style={s.section}>
            <Text style={s.sectionTitle}>Info scheda</Text>
            <TextInput style={s.input} placeholder="Nome scheda" placeholderTextColor={colors.textMuted} value={planName} onChangeText={setPlanName} />
            <TextInput style={[s.input, s.inputMultiline]} placeholder="Descrizione (opzionale)" placeholderTextColor={colors.textMuted} value={description} onChangeText={setDescription} multiline numberOfLines={3} />
            <TouchableOpacity
              style={[s.toggleRow, { borderColor: isActive ? '#4CAF50' : colors.border }]}
              onPress={() => setIsActive(prev => !prev)}
            >
              <View>
                <Text style={s.toggleLabel}>Scheda attiva</Text>
                <Text style={s.toggleSub}>{isActive ? "Visibile all'atleta" : "Nascosta all'atleta"}</Text>
              </View>
              <View style={[s.toggleDot, { backgroundColor: isActive ? '#4CAF50' : colors.textMuted }]} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: exercisesAnim, transform: [{ translateY: exercisesAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
          <View style={s.section}>
            <Text style={s.sectionTitle}>Esercizi</Text>

            {days.map(day => {
              const dayExercises = exercises
                .map((e, i) => ({ exercise: e, globalIndex: i }))
                .filter(({ exercise }) => exercise.day_index === day);

              return (
                <View key={day}>
                  <View style={s.dayHeader}>
                    <Text style={s.dayHeaderText}>Giorno {day}</Text>
                    {days.length > 1 && (
                      <TouchableOpacity onPress={() => removeDay(day)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={s.dayDeleteBtn}>🗑️</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {dayExercises.map(({ exercise, globalIndex }, localIdx) => {
                    const hasTechnique = exercise.has_dropset || exercise.has_backoff;
                    return (
                      <TouchableOpacity key={globalIndex} style={s.exerciseCard} activeOpacity={0.75} onPress={() => setEditingIndex(globalIndex)}>
                        <View style={s.exerciseHeader}>
                          <View style={s.exerciseNumberBadge}>
                            <Text style={s.exerciseNumberText}>{localIdx + 1}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            {exercise.name ? (
                              <>
                                <Text style={s.exerciseName}>{exercise.name}</Text>
                                {exercise.muscle_group ? <Text style={s.exerciseMuscle}>{exercise.muscle_group}</Text> : null}
                              </>
                            ) : (
                              <Text style={s.exercisePlaceholder}>Tocca per configurare...</Text>
                            )}
                          </View>
                          <View style={s.exerciseRight}>
                            {exercise.sets && exercise.reps ? (
                              <Text style={s.exercisePills}>{exercise.sets}×{exercise.reps}</Text>
                            ) : null}
                            {exercises.length > 1 && (
                              <TouchableOpacity onPress={() => removeExercise(globalIndex)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Text style={s.removeText}>✕</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                        {hasTechnique && (
                          <View style={s.techniqueRow}>
                            {exercise.has_dropset && <View style={s.techniquePill}><Text style={s.techniquePillText}>DS -{exercise.dropset_percentage}%</Text></View>}
                            {exercise.has_backoff && <View style={[s.techniquePill, s.techniquePillBlue]}><Text style={[s.techniquePillText, { color: '#2196F3' }]}>BO -{exercise.backoff_percentage}%</Text></View>}
                          </View>
                        )}
                        {exercise.notes ? <Text style={s.exerciseNotePreview} numberOfLines={1}>📝 {exercise.notes}</Text> : null}
                      </TouchableOpacity>
                    );
                  })}

                  <TouchableOpacity style={[s.addExerciseButton, s.addExerciseDayButton]} onPress={() => addExercise(day)}>
                    <Text style={s.addExerciseText}>+ Aggiungi esercizio</Text>
                  </TouchableOpacity>
                </View>
              );
            })}

            <TouchableOpacity style={[s.addExerciseButton, s.addDayButton]} onPress={addDay}>
              <Text style={s.addDayText}>+ Aggiungi giorno</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: saveAnim, transform: [{ translateY: saveAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
          <TouchableOpacity style={s.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveButtonText}>Salva modifiche</Text>}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {profile && (
        <ExercisePickerModal
          visible={pickerVisible}
          trainerId={profile.id}
          onSelect={handleSelectExercise}
          onClose={() => { setPickerVisible(false); setPickerTargetIndex(null); }}
        />
      )}

      <ExerciseCardModal
        visible={editingIndex !== null}
        exercise={editingIndex !== null ? exercises[editingIndex] : null}
        index={editingIndex}
        onUpdate={updateExercise}
        onClose={() => setEditingIndex(null)}
        onOpenPicker={(idx) => { setEditingIndex(null); openPicker(idx); }}
      />
    </>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.bg },
  container: { flex: 1, backgroundColor: c.bg },
  content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48 },
  centered: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
  backButton: { marginBottom: 24 },
  backText: { color: c.accent, fontSize: 16 },
  title: { fontSize: 28, fontWeight: '800', color: c.text, marginBottom: 32, textAlign: 'center' },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: c.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: c.surface, borderRadius: 10, padding: 14, color: c.text, fontSize: 15, marginBottom: 10, borderWidth: 1, borderColor: c.border },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: c.surface, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: c.border },
  toggleLabel: { color: c.text, fontSize: 14, fontWeight: '600' },
  toggleSub: { color: c.textMuted, fontSize: 11, marginTop: 2 },
  toggleDot: { width: 20, height: 20, borderRadius: 10 },
  exerciseCard: { backgroundColor: c.surfaceElevated, borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: c.border },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exerciseNumberBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center' },
  exerciseNumberText: { color: c.accent, fontSize: 13, fontWeight: '800' },
  exerciseName: { color: c.text, fontSize: 15, fontWeight: '700' },
  exerciseMuscle: { color: c.accent, fontSize: 12, marginTop: 1 },
  exercisePlaceholder: { color: c.textMuted, fontSize: 14, fontStyle: 'italic' },
  exerciseRight: { alignItems: 'flex-end', gap: 4 },
  exercisePills: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
  removeText: { color: c.textMuted, fontSize: 15 },
  techniqueRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  techniquePill: { backgroundColor: c.accentBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  techniquePillBlue: { backgroundColor: '#2196F322' },
  techniquePillText: { color: c.accent, fontSize: 11, fontWeight: '700' },
  exerciseNotePreview: { color: c.textMuted, fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  addExerciseButton: { borderWidth: 1, borderColor: c.accent, borderRadius: 10, borderStyle: 'dashed', padding: 16, alignItems: 'center' },
  addExerciseText: { color: c.accent, fontSize: 15, fontWeight: '600' },
  addExerciseDayButton: { marginBottom: 24 },
  addDayButton: { borderColor: c.textSecondary, marginTop: 4 },
  addDayText: { color: c.textSecondary, fontSize: 15, fontWeight: '600' },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  dayHeaderText: { color: c.accent, fontSize: 15, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  dayDeleteBtn: { fontSize: 18 },
  saveButton: { backgroundColor: c.accent, borderRadius: 12, padding: 18, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
