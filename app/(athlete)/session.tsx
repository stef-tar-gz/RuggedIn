import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';

type Exercise = {
  id: string;
  name: string;
  muscle_group: string | null;
  sets: number;
  reps: number;
  rest_seconds: number;
  notes: string | null;
  order_index: number;
  has_dropset: boolean;
  dropset_percentage: number | null;
  has_backoff: boolean;
  backoff_percentage: number | null;
};

type SetLog = { set_type: 'normal' | 'dropset' | 'backoff'; reps_done: string; weight_used_kg: string };
type ExerciseLog = { exercise: Exercise; sets: SetLog[] };

export default function SessionScreen() {
  const { planId, dayIndex } = useLocalSearchParams<{ planId: string; dayIndex: string }>();
  const { profile } = useProfile();
  const { colors } = useTheme();
  const router = useRouter();
  const { showAlert } = useAlert();

  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [planName, setPlanName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessionDate, setSessionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const s = makeStyles(colors);

  useEffect(() => { fetchPlan(); }, [planId]);

  const fetchPlan = async () => {
    const { data: planData } = await supabase
      .from('workout_plans')
      .select('name')
      .eq('id', planId)
      .single();

    if (planData) setPlanName(planData.name);

    let query = supabase
      .from('exercises')
      .select('id, name, muscle_group, sets, reps, rest_seconds, notes, order_index, has_dropset, dropset_percentage, has_backoff, backoff_percentage')
      .eq('workout_plan_id', planId)
      .eq('is_deleted', false)
      .order('order_index');

    if (dayIndex) query = query.eq('day_index', parseInt(dayIndex));

    const { data: exData } = await query;
    if (exData) setLogs((exData as Exercise[]).map(e => buildInitialLog(e)));

    setLoading(false);
  };

  const buildInitialLog = (e: Exercise): ExerciseLog => {
    const sets: SetLog[] = Array.from({ length: e.sets }, () => ({ set_type: 'normal', reps_done: String(e.reps), weight_used_kg: '' }));
    if (e.has_dropset) sets.push({ set_type: 'dropset', reps_done: String(e.reps), weight_used_kg: '' });
    if (e.has_backoff) sets.push({ set_type: 'backoff', reps_done: String(e.reps), weight_used_kg: '' });
    return { exercise: e, sets };
  };

  const updateSet = (exIndex: number, setIndex: number, field: keyof SetLog, value: string) => {
    setLogs(prev => {
      const updated = [...prev];
      const sets = [...updated[exIndex].sets];
      sets[setIndex] = { ...sets[setIndex], [field]: value };
      updated[exIndex] = { ...updated[exIndex], sets };
      return updated;
    });
  };

  const formatDate = (date: Date) =>
    `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;

  const toLocalDateString = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const handleSave = async () => {
    const hasAnyWeight = logs.some(l => l.sets.some(s => s.weight_used_kg.trim() !== ''));
    if (!hasAnyWeight) {
      showAlert({ title: 'Errore', message: 'Inserisci almeno un peso per salvare la sessione.' });
      return;
    }
    setSaving(true);
    const logDate = toLocalDateString(sessionDate);
    const rows: any[] = [];
    logs.forEach(log => {
      log.sets.forEach(set => {
        if (set.weight_used_kg.trim() === '') return;
        rows.push({
          athlete_id: profile!.id,
          exercise_id: log.exercise.id,
          workout_plan_id: planId,
          log_date: logDate,
          sets_done: 1,
          reps_done: parseInt(set.reps_done) || log.exercise.reps,
          weight_used_kg: parseFloat(set.weight_used_kg),
          set_type: set.set_type,
          day_index: dayIndex ? parseInt(dayIndex) : 1,
        });
      });
    });
    const { error } = await supabase.from('workout_logs').insert(rows);
    if (error) { showAlert({ title: 'Errore', message: error.message }); setSaving(false); return; }
    setSaving(false);
    showAlert({
      title: 'Sessione salvata!',
      message: `Ottimo lavoro 💪\n${formatDate(sessionDate)}`,
      buttons: [
        { text: 'OK', onPress: () => router.replace('/(athlete)/plans') },
      ],
    });
  };

  if (loading) {
    return <View style={s.centered}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

      <View style={s.header}>
        <TouchableOpacity onPress={() => {
          showAlert({
            title: 'Abbandona sessione',
            message: 'Sei sicuro? I dati non salvati andranno persi.',
            buttons: [
              { text: 'Continua', style: 'cancel' },
              { text: 'Abbandona', style: 'destructive', onPress: () => router.replace('/(athlete)/plans') },
            ],
          });
        }}>
          <Text style={s.backText}>✕ Abbandona</Text>
        </TouchableOpacity>
        <Text style={s.sessionTitle}>{planName}{dayIndex ? ` — Giorno ${dayIndex}` : ''}</Text>
      </View>

      <TouchableOpacity style={s.dateSelector} onPress={() => setShowDatePicker(true)}>
        <Text style={s.dateSelectorLabel}>📅 Data sessione</Text>
        <Text style={s.dateSelectorValue}>{formatDate(sessionDate)}</Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={sessionDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={(_, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setSessionDate(selectedDate);
          }}
        />
      )}

      {logs.map((log, exIndex) => (
        <View key={log.exercise.id} style={s.exerciseCard}>
          <View style={s.exerciseHeader}>
            <View style={s.exerciseIndexBadge}>
              <Text style={s.exerciseIndexText}>{exIndex + 1}</Text>
            </View>
            <View style={s.exerciseInfo}>
              <Text style={s.exerciseName}>{log.exercise.name}</Text>
              {log.exercise.muscle_group && <Text style={s.muscleGroup}>{log.exercise.muscle_group}</Text>}
            </View>
          </View>
          {log.exercise.notes && <Text style={s.exerciseNotes}>📝 {log.exercise.notes}</Text>}
          <View style={s.setHeader}>
            <Text style={[s.setHeaderText, { flex: 1 }]}>Serie</Text>
            <Text style={[s.setHeaderText, { flex: 2 }]}>Reps</Text>
            <Text style={[s.setHeaderText, { flex: 2 }]}>Kg</Text>
          </View>
          {log.sets.map((set, setIndex) => (
            <View key={setIndex} style={s.setRow}>
              <View style={[s.setTypeBadge, {
                backgroundColor: set.set_type === 'dropset' ? colors.accentBg : set.set_type === 'backoff' ? '#2196F322' : colors.surfaceElevated
              }]}>
                <Text style={[s.setTypeText, {
                  color: set.set_type === 'normal' ? colors.textSecondary : set.set_type === 'dropset' ? colors.accent : '#2196F3'
                }]}>
                  {set.set_type === 'normal' ? `${setIndex + 1}` : set.set_type === 'dropset' ? 'DS' : 'BO'}
                </Text>
              </View>
              <TextInput
                style={[s.setInput, { flex: 2 }]}
                value={set.reps_done}
                onChangeText={(v) => updateSet(exIndex, setIndex, 'reps_done', v)}
                keyboardType="numeric"
                placeholder={String(log.exercise.reps)}
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={[s.setInput, { flex: 2 }]}
                value={set.weight_used_kg}
                onChangeText={(v) => updateSet(exIndex, setIndex, 'weight_used_kg', v)}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          ))}
          {log.exercise.has_dropset && <Text style={s.techniqueHint}>🔴 Dropset: riduci il peso del {log.exercise.dropset_percentage}%</Text>}
          {log.exercise.has_backoff && <Text style={s.techniqueHint}>🔵 Backoff: riduci il peso del {log.exercise.backoff_percentage}%</Text>}
        </View>
      ))}

      <TouchableOpacity style={s.saveButton} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveButtonText}>💾 Salva sessione</Text>}
      </TouchableOpacity>

    </ScrollView>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48 },
  centered: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 16 },
  backText: { color: c.textMuted, fontSize: 14, fontWeight: '600' },
  sessionTitle: { color: c.text, fontSize: 18, fontWeight: '800', flex: 1 },
  dateSelector: { backgroundColor: c.surface, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: c.border },
  dateSelectorLabel: { color: c.textSecondary, fontSize: 14 },
  dateSelectorValue: { color: c.accent, fontSize: 16, fontWeight: '700' },
  exerciseCard: { backgroundColor: c.surface, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: c.border },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  exerciseIndexBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center' },
  exerciseIndexText: { color: c.accent, fontSize: 14, fontWeight: '800' },
  exerciseInfo: { flex: 1 },
  exerciseName: { color: c.text, fontSize: 16, fontWeight: '700' },
  muscleGroup: { color: c.accent, fontSize: 12, marginTop: 2 },
  exerciseNotes: { color: c.textMuted, fontSize: 13, fontStyle: 'italic', marginBottom: 12 },
  setHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, paddingHorizontal: 4 },
  setHeaderText: { color: c.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  setTypeBadge: { flex: 1, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border },
  setTypeText: { fontSize: 13, fontWeight: '800' },
  setInput: { backgroundColor: c.surfaceElevated, borderRadius: 8, padding: 10, color: c.text, fontSize: 15, borderWidth: 1, borderColor: c.border, textAlign: 'center', height: 40 },
  techniqueHint: { color: c.textMuted, fontSize: 12, marginTop: 8, fontStyle: 'italic' },
  saveButton: { backgroundColor: c.accent, borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 8 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
