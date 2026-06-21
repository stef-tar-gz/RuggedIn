import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Platform, KeyboardAvoidingView, Animated, Vibration, Easing,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Tabs, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';
import { useSession } from '@/context/SessionContext';

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
  dropset_sets: number | null;
  has_backoff: boolean;
  backoff_percentage: number | null;
  backoff_sets: number | null;
  has_stripping: boolean;
  stripping_steps: number | null;
  stripping_percentage: number | null;
  stripping_reps_increase: number | null;
};

type SetLog = { set_type: 'normal' | 'dropset' | 'backoff' | 'stripping'; reps_done: string; weight_used_kg: string };
type ExerciseLog = { exercise: Exercise; sets: SetLog[] };

export default function SessionScreen() {
  const { planId, dayIndex } = useLocalSearchParams<{ planId: string; dayIndex: string }>();
  const { profile } = useProfile();
  const { colors } = useTheme();
  const router = useRouter();
  const { showAlert } = useAlert();

  const { activeSession, startSession, updateLogs, updateDate, clearSession } = useSession();

  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [planName, setPlanName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessionDate, setSessionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Timer riposo
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerExIndex, setTimerExIndex] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerReveal = useRef(new Animated.Value(0)).current;
  const timerOpacity = useRef(new Animated.Value(0)).current;
  const timerBorderAnim = useRef(new Animated.Value(0)).current;
  const [borderExIndex, setBorderExIndex] = useState(-1);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const TIMER_HEIGHT = 82;
  const slideAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const s = makeStyles(colors);

  useFocusEffect(useCallback(() => {
    slideAnim.setValue(60);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 180 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []));

  useEffect(() => {
    if (activeSession?.planId === planId) {
      // Ripristina sessione dal context
      setPlanName(activeSession.planName);
      setLogs(activeSession.logs);
      setSessionDate(activeSession.sessionDate);
      setLoading(false);
    } else {
      fetchPlan();
    }
  }, [planId]);

  const fetchPlan = async () => {
    const { data: planData } = await supabase
      .from('workout_plans')
      .select('name')
      .eq('id', planId)
      .single();

    const name = planData?.name ?? '';
    setPlanName(name);

    let query = supabase
      .from('exercises')
      .select('id, name, muscle_group, sets, reps, rest_seconds, notes, order_index, has_dropset, dropset_percentage, dropset_sets, has_backoff, backoff_percentage, backoff_sets, has_stripping, stripping_steps, stripping_percentage, stripping_reps_increase')
      .eq('workout_plan_id', planId)
      .eq('is_deleted', false)
      .order('order_index');

    if (dayIndex) query = query.eq('day_index', parseInt(dayIndex));

    const { data: exData } = await query;
    const initialLogs = exData ? (exData as Exercise[]).map(e => buildInitialLog(e)) : [];
    setLogs(initialLogs);

    startSession({ planId, dayIndex, planName: name, logs: initialLogs, sessionDate: new Date() });
    setLoading(false);
  };

  const buildInitialLog = (e: Exercise): ExerciseLog => {
    const sets: SetLog[] = Array.from({ length: e.sets }, () => ({ set_type: 'normal', reps_done: String(e.reps), weight_used_kg: '' }));
    if (e.has_dropset) {
      const n = e.dropset_sets ?? 1;
      for (let i = 0; i < n; i++) sets.push({ set_type: 'dropset', reps_done: String(e.reps), weight_used_kg: '' });
    }
    if (e.has_backoff) {
      const n = e.backoff_sets ?? 1;
      for (let i = 0; i < n; i++) sets.push({ set_type: 'backoff', reps_done: String(e.reps), weight_used_kg: '' });
    }
    if (e.has_stripping) {
      const steps = e.stripping_steps ?? 2;
      const repsInc = e.stripping_reps_increase ?? 0;
      for (let i = 0; i < steps; i++) {
        sets.push({ set_type: 'stripping', reps_done: String(e.reps + repsInc * (i + 1)), weight_used_kg: '' });
      }
    }
    return { exercise: e, sets };
  };

  const collapseTimer = useCallback((onDone?: () => void) => {
    Animated.parallel([
      Animated.timing(timerOpacity, { toValue: 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(timerReveal, { toValue: 0, duration: 320, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
    ]).start(() => { setTimerActive(false); setTimerExIndex(-1); onDone?.(); });
    Animated.timing(timerBorderAnim, { toValue: 0, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false })
      .start(() => setBorderExIndex(-1));
  }, [timerReveal, timerOpacity, timerBorderAnim]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    progressAnim.stopAnimation();
    Vibration.cancel();
    collapseTimer();
  }, [collapseTimer, progressAnim]);

  const startTimer = useCallback((restSeconds: number, exIndex: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    progressAnim.stopAnimation();
    Vibration.cancel();

    setTimerSeconds(restSeconds);
    setTimerExIndex(exIndex);
    setTimerActive(true);

    timerReveal.setValue(0);
    timerOpacity.setValue(0);
    setBorderExIndex(exIndex);
    timerBorderAnim.setValue(0);
    Animated.timing(timerBorderAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }).start();
    Animated.sequence([
      Animated.timing(timerReveal, { toValue: TIMER_HEIGHT, duration: 420, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      Animated.timing(timerOpacity, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    progressAnim.setValue(1);
    Animated.timing(progressAnim, { toValue: 0, duration: restSeconds * 1000, easing: Easing.linear, useNativeDriver: false }).start();

    timerRef.current = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          Vibration.vibrate([0, 400, 150, 400, 150, 600]);
          collapseTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [timerReveal, timerOpacity, progressAnim, collapseTimer]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const formatTimer = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const updateSet = (exIndex: number, setIndex: number, field: keyof SetLog, value: string) => {
    setLogs(prev => {
      const updated = [...prev];
      const sets = [...updated[exIndex].sets];
      sets[setIndex] = { ...sets[setIndex], [field]: value };
      updated[exIndex] = { ...updated[exIndex], sets };
      updateLogs(updated);
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
    clearSession();
    showAlert({
      title: 'Sessione salvata!',
      message: `Ottimo lavoro!\n${formatDate(sessionDate)}`,
      buttons: [
        { text: 'OK', onPress: () => router.replace('/(athlete)/plans') },
      ],
    });
  };

  if (loading) {
    return <View style={s.centered}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  return (
    <>
      <Tabs.Screen options={{ tabBarStyle: { display: 'none' } }} />
    <Animated.View style={[s.flex, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}>

    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

      <View style={s.header}>
        <View style={s.titleWrap} pointerEvents="none">
          <Text style={s.sessionTitle}>{planName}{dayIndex ? ` — Giorno ${dayIndex}` : ''}</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={s.minimizeBtn}>
          <Ionicons name="chevron-down" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={s.dateSelector} onPress={() => setShowDatePicker(true)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
          <Text style={s.dateSelectorLabel}>Data sessione</Text>
        </View>
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
            if (selectedDate) { setSessionDate(selectedDate); updateDate(selectedDate); }
          }}
        />
      )}

      {logs.map((log, exIndex) => (
        <Animated.View key={log.exercise.id} style={[s.exerciseCard, borderExIndex === exIndex && {
          borderColor: timerBorderAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [colors.border, 'rgba(232,83,58,0.45)'],
          })
        }]}>
          <View style={s.exerciseHeader}>
            <View style={s.exerciseIndexBadge}>
              <Text style={s.exerciseIndexText}>{exIndex + 1}</Text>
            </View>
            <View style={s.exerciseInfo}>
              <Text style={s.exerciseName}>{log.exercise.name}</Text>
              {log.exercise.muscle_group && <Text style={s.muscleGroup}>{log.exercise.muscle_group}</Text>}
            </View>
            <TouchableOpacity
              style={[s.restBtn, timerActive && s.restBtnDisabled]}
              disabled={timerActive}
              onPress={() => startTimer(log.exercise.rest_seconds, exIndex)}
            >
              <Ionicons name="timer-outline" size={18} color={timerActive ? colors.textMuted : colors.accent} />
            </TouchableOpacity>
          </View>
          <View style={s.setHeader}>
            <Text style={[s.setHeaderText, { flex: 1 }]}>Serie</Text>
            <Text style={[s.setHeaderText, { flex: 2 }]}>Reps</Text>
            <Text style={[s.setHeaderText, { flex: 2 }]}>Kg</Text>
          </View>
          {log.sets.map((set, setIndex) => (
            <View key={setIndex} style={s.setRow}>
              <View style={[s.setTypeBadge, {
                backgroundColor: set.set_type === 'dropset' ? colors.accentBg : set.set_type === 'backoff' ? '#2196F322' : set.set_type === 'stripping' ? '#9C27B022' : colors.surfaceElevated
              }]}>
                <Text style={[s.setTypeText, {
                  color: set.set_type === 'normal' ? colors.textSecondary : set.set_type === 'dropset' ? colors.accent : set.set_type === 'backoff' ? '#2196F3' : '#9C27B0'
                }]}>
                  {set.set_type === 'normal' ? `${setIndex + 1}` : set.set_type === 'dropset' ? 'DS' : set.set_type === 'backoff' ? 'BO' : 'ST'}
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
          {log.exercise.has_dropset && <Text style={s.techniqueHint}>Dropset ({log.exercise.dropset_sets ?? 1} serie): -{log.exercise.dropset_percentage}% peso</Text>}
          {log.exercise.has_backoff && <Text style={s.techniqueHint}>Backoff ({log.exercise.backoff_sets ?? 1} serie): -{log.exercise.backoff_percentage}% peso</Text>}
          {log.exercise.has_stripping && <Text style={s.techniqueHint}>Stripping ({log.exercise.stripping_steps} step): -{log.exercise.stripping_percentage}% per step{(log.exercise.stripping_reps_increase ?? 0) > 0 ? `, +${log.exercise.stripping_reps_increase} reps/step` : ''}</Text>}
          {log.exercise.notes && (
            <View style={s.notesBox}>
              <View style={s.notesAccent} />
              <Text style={s.notesText}>{log.exercise.notes}</Text>
            </View>
          )}

          {/* Timer integrato — si espande verso il basso dalla card */}
          {timerExIndex === exIndex && (
            <Animated.View style={[s.timerClip, { height: timerReveal }]}>
              <Animated.View style={[s.timerBody, { opacity: timerOpacity }]}>
                <View style={s.timerBarBg}>
                  <Animated.View style={[s.timerBarFill, {
                    width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                    backgroundColor: progressAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: ['#E8533A', '#FF9800', '#4CAF50'] }),
                  }]} />
                </View>
                <View style={s.timerMain}>
                  <View>
                    <Text style={s.timerLabel}>Tempo di riposo</Text>
                    <Text style={s.timerTime}>{formatTimer(timerSeconds)}</Text>
                  </View>
                  <TouchableOpacity style={s.timerSkip} onPress={stopTimer}>
                    <Ionicons name="play-skip-forward" size={16} color={colors.accent} />
                    <Text style={s.timerSkipText}>Salta</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </Animated.View>
          )}
        </Animated.View>
      ))}

      <TouchableOpacity style={s.saveButton} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveButtonText}>Salva sessione</Text>}
      </TouchableOpacity>

    </ScrollView>

    </KeyboardAvoidingView>
    </Animated.View>
    </>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  flex: { flex: 1, backgroundColor: c.bg },
  container: { flex: 1, backgroundColor: c.bg },
  content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48 },
  centered: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  titleWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  sessionTitle: { color: c.text, fontSize: 18, fontWeight: '800' },
  minimizeBtn: { marginLeft: 'auto', padding: 4 },
  dateSelector: { backgroundColor: c.surface, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: c.border },
  dateSelectorLabel: { color: c.textSecondary, fontSize: 14 },
  dateSelectorValue: { color: c.accent, fontSize: 16, fontWeight: '700' },
  exerciseCard: { backgroundColor: c.surface, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  exerciseIndexBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center' },
  exerciseIndexText: { color: c.accent, fontSize: 14, fontWeight: '800' },
  exerciseInfo: { flex: 1 },
  exerciseName: { color: c.text, fontSize: 16, fontWeight: '700' },
  muscleGroup: { color: c.accent, fontSize: 12, marginTop: 2 },
  notesBox: { flexDirection: 'row', backgroundColor: c.accentBg, borderRadius: 8, marginTop: 10, marginBottom: 4, overflow: 'hidden' },
  notesAccent: { width: 3, backgroundColor: c.accent, borderRadius: 2 },
  notesText: { flex: 1, color: c.text, fontSize: 13, fontWeight: '500', lineHeight: 19, paddingHorizontal: 10, paddingVertical: 8 },
  setHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, paddingHorizontal: 4 },
  setHeaderText: { color: c.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  setTypeBadge: { flex: 1, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border },
  setTypeText: { fontSize: 13, fontWeight: '800' },
  setInput: { backgroundColor: c.surfaceElevated, borderRadius: 8, padding: 10, color: c.text, fontSize: 15, borderWidth: 1, borderColor: c.border, textAlign: 'center', height: 40 },
  techniqueHint: { color: c.textMuted, fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  saveButton: { backgroundColor: c.accent, borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  restBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.accentBorder },
  restBtnDisabled: { backgroundColor: c.surfaceElevated, borderColor: c.border, opacity: 0.5 },
  timerClip: { overflow: 'hidden', marginHorizontal: -16, marginBottom: -16, marginTop: 16 },
  timerBody: {
    backgroundColor: c.accentBg,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(232,83,58,0.2)',
  },
  timerBarBg: { height: 4, backgroundColor: 'rgba(232,83,58,0.15)', borderRadius: 2, overflow: 'hidden', marginBottom: 10 },
  timerBarFill: { height: 4, borderRadius: 2 },
  timerMain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timerLabel: { color: c.accent, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  timerTime: { color: c.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  timerSkip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: 'rgba(232,83,58,0.3)' },
  timerSkipText: { color: c.accent, fontSize: 13, fontWeight: '700' },
});
