import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, Switch
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useProfile } from '../../../hooks/useProfile';
import { useTheme } from '@/context/ThemeContext';
import ExercisePickerModal, { CatalogExercise } from '../../../components/ExercisePickerModal';

type Exercise = {
  catalog_exercise_id: string | null;
  name: string;
  muscle_group: string;
  sets: string; reps: string; rest_seconds: string; notes: string;
  has_dropset: boolean; dropset_percentage: string;
  has_backoff: boolean; backoff_percentage: string;
};

const emptyExercise = (): Exercise => ({
  catalog_exercise_id: null,
  name: '', muscle_group: '',
  sets: '3', reps: '10', rest_seconds: '90', notes: '',
  has_dropset: false, dropset_percentage: '20',
  has_backoff: false, backoff_percentage: '15',
});

export default function CreateWorkoutScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const { profile } = useProfile();
  const { colors } = useTheme();
  const router = useRouter();

  const [planName, setPlanName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([emptyExercise()]);
  const [loading, setLoading] = useState(false);

  // Modal picker
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTargetIndex, setPickerTargetIndex] = useState<number | null>(null);

  const s = makeStyles(colors);

  const updateExercise = (index: number, field: keyof Exercise, value: any) => {
    setExercises(prev => { const u = [...prev]; u[index] = { ...u[index], [field]: value }; return u; });
  };
  const addExercise = () => setExercises(prev => [...prev, emptyExercise()]);
  const removeExercise = (index: number) => {
    if (exercises.length > 1) setExercises(prev => prev.filter((_, i) => i !== index));
  };

  const openPicker = (index: number) => { setPickerTargetIndex(index); setPickerVisible(true); };

  const handleSelectExercise = (ex: CatalogExercise) => {
    if (pickerTargetIndex === null) return;
    setExercises(prev => {
      const u = [...prev];
      u[pickerTargetIndex] = {
        ...u[pickerTargetIndex],
        catalog_exercise_id: ex.id,
        name: ex.name,
        muscle_group: ex.muscle_group,
      };
      return u;
    });
    setPickerVisible(false);
    setPickerTargetIndex(null);
  };

  const handleSave = async () => {
    if (!planName.trim()) { Alert.alert('Errore', 'Inserisci un nome per la scheda.'); return; }
    if (exercises.some(e => !e.name.trim())) { Alert.alert('Errore', 'Ogni esercizio deve essere selezionato dal catalogo.'); return; }

    setLoading(true);
    const { data: plan, error: planError } = await supabase
      .from('workout_plans')
      .insert({ trainer_id: profile!.id, athlete_id: athleteId, name: planName.trim(), description: description.trim() || null, is_active: true })
      .select().single();

    if (planError) { Alert.alert('Errore', planError.message); setLoading(false); return; }

    const { error: exError } = await supabase.from('exercises').insert(
      exercises.map((e, index) => ({
        workout_plan_id: plan.id,
        catalog_exercise_id: e.catalog_exercise_id,
        name: e.name.trim(),
        muscle_group: e.muscle_group.trim() || null,
        sets: parseInt(e.sets) || 3,
        reps: parseInt(e.reps) || 10,
        rest_seconds: parseInt(e.rest_seconds) || 90,
        notes: e.notes.trim() || null,
        order_index: index,
        has_dropset: e.has_dropset,
        dropset_percentage: e.has_dropset ? parseFloat(e.dropset_percentage) || null : null,
        has_backoff: e.has_backoff,
        backoff_percentage: e.has_backoff ? parseFloat(e.backoff_percentage) || null : null,
      }))
    );

    if (exError) { Alert.alert('Errore esercizi', exError.message); setLoading(false); return; }
    setLoading(false);
    Alert.alert('Successo', 'Scheda creata!', [{ text: 'OK', onPress: () => router.back() }]);
  };

  return (
    <>
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <TouchableOpacity style={s.backButton} onPress={() => router.back()}>
          <Text style={s.backText}>‹ Profilo atleta</Text>
        </TouchableOpacity>

        <Text style={s.title}>Nuova scheda</Text>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Info scheda</Text>
          <TextInput style={s.input} placeholder="Nome scheda (es. Massa - Upper A)" placeholderTextColor={colors.textMuted} value={planName} onChangeText={setPlanName} />
          <TextInput style={[s.input, s.inputMultiline]} placeholder="Descrizione (opzionale)" placeholderTextColor={colors.textMuted} value={description} onChangeText={setDescription} multiline numberOfLines={3} />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Esercizi</Text>

          {exercises.map((exercise, index) => (
            <View key={index} style={s.exerciseCard}>
              <View style={s.exerciseHeader}>
                <Text style={s.exerciseNumber}>Esercizio {index + 1}</Text>
                {exercises.length > 1 && (
                  <TouchableOpacity onPress={() => removeExercise(index)}>
                    <Text style={s.removeText}>Rimuovi</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Selezione dal catalogo */}
              <TouchableOpacity style={[s.pickerBtn, exercise.name ? s.pickerBtnFilled : null]} onPress={() => openPicker(index)}>
                {exercise.name ? (
                  <View style={{ flex: 1 }}>
                    <Text style={s.pickerBtnName}>{exercise.name}</Text>
                    <Text style={s.pickerBtnMuscle}>{exercise.muscle_group}</Text>
                  </View>
                ) : (
                  <Text style={s.pickerBtnPlaceholder}>Tocca per scegliere un esercizio...</Text>
                )}
                <Text style={s.pickerBtnIcon}>📋</Text>
              </TouchableOpacity>

              <View style={s.row}>
                <View style={s.rowItem}>
                  <Text style={s.rowLabel}>Serie</Text>
                  <TextInput style={s.inputSmall} value={exercise.sets} onChangeText={(v) => updateExercise(index, 'sets', v)} keyboardType="numeric" />
                </View>
                <View style={s.rowItem}>
                  <Text style={s.rowLabel}>Reps</Text>
                  <TextInput style={s.inputSmall} value={exercise.reps} onChangeText={(v) => updateExercise(index, 'reps', v)} keyboardType="numeric" />
                </View>
                <View style={s.rowItem}>
                  <Text style={s.rowLabel}>Riposo (s)</Text>
                  <TextInput style={s.inputSmall} value={exercise.rest_seconds} onChangeText={(v) => updateExercise(index, 'rest_seconds', v)} keyboardType="numeric" />
                </View>
              </View>

              <View style={s.toggleRow}>
                <View>
                  <Text style={s.toggleLabel}>Dropset</Text>
                  <Text style={s.toggleSub}>Riduzione peso a cedimento</Text>
                </View>
                <Switch value={exercise.has_dropset} onValueChange={(v) => updateExercise(index, 'has_dropset', v)} trackColor={{ false: colors.border, true: '#E8533A55' }} thumbColor={exercise.has_dropset ? colors.accent : colors.textMuted} />
              </View>
              {exercise.has_dropset && (
                <View style={s.percentageRow}>
                  <Text style={s.percentageLabel}>Riduzione peso dropset</Text>
                  <View style={s.percentageInput}>
                    <TextInput style={s.inputSmall} value={exercise.dropset_percentage} onChangeText={(v) => updateExercise(index, 'dropset_percentage', v)} keyboardType="decimal-pad" />
                    <Text style={s.percentageSign}>%</Text>
                  </View>
                </View>
              )}

              <View style={s.toggleRow}>
                <View>
                  <Text style={s.toggleLabel}>Backoff</Text>
                  <Text style={s.toggleSub}>Serie finale a volume ridotto</Text>
                </View>
                <Switch value={exercise.has_backoff} onValueChange={(v) => updateExercise(index, 'has_backoff', v)} trackColor={{ false: colors.border, true: '#E8533A55' }} thumbColor={exercise.has_backoff ? colors.accent : colors.textMuted} />
              </View>
              {exercise.has_backoff && (
                <View style={s.percentageRow}>
                  <Text style={s.percentageLabel}>Riduzione peso backoff</Text>
                  <View style={s.percentageInput}>
                    <TextInput style={s.inputSmall} value={exercise.backoff_percentage} onChangeText={(v) => updateExercise(index, 'backoff_percentage', v)} keyboardType="decimal-pad" />
                    <Text style={s.percentageSign}>%</Text>
                  </View>
                </View>
              )}

              <TextInput style={s.input} placeholder="Note (opzionale)" placeholderTextColor={colors.textMuted} value={exercise.notes} onChangeText={(v) => updateExercise(index, 'notes', v)} />
            </View>
          ))}

          <TouchableOpacity style={s.addExerciseButton} onPress={addExercise}>
            <Text style={s.addExerciseText}>+ Aggiungi esercizio</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.saveButton} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.saveButtonText}>Salva scheda</Text>}
        </TouchableOpacity>
      </ScrollView>

      {profile && (
        <ExercisePickerModal
          visible={pickerVisible}
          trainerId={profile.id}
          onSelect={handleSelectExercise}
          onClose={() => { setPickerVisible(false); setPickerTargetIndex(null); }}
        />
      )}
    </>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48 },
  backButton: { marginBottom: 24 },
  backText: { color: c.accent, fontSize: 16 },
  title: { fontSize: 28, fontWeight: '800', color: c.text, marginBottom: 32 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: c.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: c.surface, borderRadius: 10, padding: 14, color: c.text, fontSize: 15, marginBottom: 10, borderWidth: 1, borderColor: c.border },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  exerciseCard: { backgroundColor: c.surfaceElevated, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: c.border },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  exerciseNumber: { color: c.accent, fontSize: 14, fontWeight: '700' },
  removeText: { color: c.textMuted, fontSize: 13 },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: c.border, borderStyle: 'dashed' },
  pickerBtnFilled: { borderStyle: 'solid', borderColor: c.accentBorder, backgroundColor: c.accentBg },
  pickerBtnPlaceholder: { flex: 1, color: c.textMuted, fontSize: 14 },
  pickerBtnName: { color: c.text, fontSize: 15, fontWeight: '700' },
  pickerBtnMuscle: { color: c.textSecondary, fontSize: 12, marginTop: 2 },
  pickerBtnIcon: { fontSize: 18, marginLeft: 8 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  rowItem: { flex: 1 },
  rowLabel: { color: c.textMuted, fontSize: 11, marginBottom: 4 },
  inputSmall: { backgroundColor: c.surface, borderRadius: 8, padding: 10, color: c.text, fontSize: 15, borderWidth: 1, borderColor: c.border, textAlign: 'center' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: c.surface, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: c.border },
  toggleLabel: { color: c.text, fontSize: 14, fontWeight: '600' },
  toggleSub: { color: c.textMuted, fontSize: 11, marginTop: 2 },
  percentageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.surface, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: c.accentBorder },
  percentageLabel: { color: c.textSecondary, fontSize: 13 },
  percentageInput: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  percentageSign: { color: c.accent, fontSize: 16, fontWeight: '700' },
  addExerciseButton: { borderWidth: 1, borderColor: c.accent, borderRadius: 10, borderStyle: 'dashed', padding: 16, alignItems: 'center' },
  addExerciseText: { color: c.accent, fontSize: 15, fontWeight: '600' },
  saveButton: { backgroundColor: c.accent, borderRadius: 12, padding: 18, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
