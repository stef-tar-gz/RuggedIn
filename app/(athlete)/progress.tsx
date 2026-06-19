import { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, TouchableOpacity, Platform, Dimensions, Animated, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';
import {
  VictoryLine, VictoryChart, VictoryAxis,
  VictoryScatter,
} from 'victory-native';

type ExerciseLog = {
  log_date: string;
  set_type: string;
  reps_done: number;
  weight_used_kg: number;
  exercise_name: string;
};

type GroupedLog = {
  date: string;
  sets: ExerciseLog[];
  maxWeight: number;
};

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ProgressScreen() {
  const { profile } = useProfile();
  const { colors } = useTheme();
  const router = useRouter();
  const { showAlert } = useAlert();

  const [exercises, setExercises] = useState<string[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [logs, setLogs] = useState<GroupedLog[]>([]);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [showPickerFrom, setShowPickerFrom] = useState(false);
  const [showPickerTo, setShowPickerTo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const s = makeStyles(colors);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const periodAnim = useRef(new Animated.Value(0)).current;
  const chipsAnim = useRef(new Animated.Value(0)).current;
  const resultsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (profile) fetchExercises();
  }, [profile]);

  useEffect(() => {
    if (!loading) {
      Animated.stagger(120, [
        Animated.timing(headerAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(periodAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(chipsAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(resultsAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  const fetchExercises = async () => {
    const { data } = await supabase.rpc('get_athlete_exercises', { p_athlete_id: profile!.id });
    setExercises((data || []).map((d: any) => d.exercise_name));
    setLoading(false);
  };

  const fetchHistory = async (exerciseName: string) => {
    setSearching(true);
    const { data } = await supabase.rpc('get_exercise_history', {
      p_athlete_id: profile!.id,
      p_exercise_name: exerciseName,
      p_date_from: dateFrom ? dateFrom.toISOString().split('T')[0] : null,
      p_date_to: dateTo ? dateTo.toISOString().split('T')[0] : null,
    });

    const grouped: Record<string, ExerciseLog[]> = {};
    (data || []).forEach((log: ExerciseLog) => {
      if (!grouped[log.log_date]) grouped[log.log_date] = [];
      grouped[log.log_date].push(log);
    });

    setLogs(
      Object.entries(grouped)
        .map(([date, sets]) => ({ date, sets, maxWeight: Math.max(...sets.map(s => s.weight_used_kg)) }))
        .sort((a, b) => a.date.localeCompare(b.date))
    );
    setSearching(false);
  };

  const handleSelectExercise = (name: string) => {
    setSelectedExercise(name);
    fetchHistory(name);
  };

  const handleFilter = () => {
    if (selectedExercise) fetchHistory(selectedExercise);
  };

  const handleDeleteSession = (date: string) => {
    showAlert({
      title: 'Elimina sessione',
      message: `Vuoi eliminare la sessione del ${formatDate(date)}?`,
      buttons: [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina', style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('workout_logs')
              .delete()
              .eq('athlete_id', profile!.id)
              .eq('log_date', date);
            if (error) showAlert({ title: 'Errore', message: error.message });
            else setLogs(prev => prev.filter(l => l.date !== date));
          },
        },
      ],
    });
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('it-IT');
  const formatShortDate = (dateStr: string) => { const d = new Date(dateStr); return `${d.getDate()}/${d.getMonth() + 1}`; };

  const setTypeLabel = (type: string) => type === 'dropset' ? 'DS' : type === 'backoff' ? 'BO' : 'N';
  const setTypeColor = (type: string) => type === 'dropset' ? colors.accent : type === 'backoff' ? '#2196F3' : colors.textSecondary;

  const chartData = logs.map((log, index) => ({ x: index + 1, y: log.maxWeight }));

  if (loading) {
    return <View style={s.centered}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>

      <Animated.View style={{ opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Ionicons name="chevron-back" size={22} color={colors.accent} />
            <Text style={s.backText}>Schede</Text>
          </TouchableOpacity>
          <View style={s.titleWrap} pointerEvents="none"><Text style={s.title}>I miei progressi</Text></View>
        </View>
      </Animated.View>

      <Animated.View style={{ opacity: periodAnim, transform: [{ translateY: periodAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
      <View style={s.section}>
        <Text style={s.sectionTitle}>Periodo</Text>
        <View style={s.dateRow}>
          <View style={s.dateField}>
            <Text style={s.dateLabel}>Dal</Text>
            <TouchableOpacity style={s.dateButton} onPress={() => { setShowPickerTo(false); setShowPickerFrom(true); }}>
              <Text style={[s.dateButtonText, !dateFrom && s.datePlaceholder]}>
                {dateFrom ? dateFrom.toLocaleDateString('it-IT') : 'Seleziona'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={s.dateField}>
            <Text style={s.dateLabel}>Al</Text>
            <TouchableOpacity style={s.dateButton} onPress={() => { setShowPickerFrom(false); setShowPickerTo(true); }}>
              <Text style={[s.dateButtonText, !dateTo && s.datePlaceholder]}>
                {dateTo ? dateTo.toLocaleDateString('it-IT') : 'Seleziona'}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.filterButton} onPress={handleFilter} disabled={!selectedExercise}>
            <Text style={s.filterButtonText}>Filtra</Text>
          </TouchableOpacity>
        </View>

        {showPickerFrom && (
          <View style={s.pickerContainer}>
            {Platform.OS === 'ios' && (
              <TouchableOpacity style={s.pickerDoneButton} onPress={() => setShowPickerFrom(false)}>
                <Text style={s.pickerDoneText}>Fatto</Text>
              </TouchableOpacity>
            )}
            <DateTimePicker
              value={dateFrom ?? new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(_, date) => {
                if (Platform.OS === 'android') setShowPickerFrom(false);
                if (date) setDateFrom(date);
              }}
            />
          </View>
        )}

        {showPickerTo && (
          <View style={s.pickerContainer}>
            {Platform.OS === 'ios' && (
              <TouchableOpacity style={s.pickerDoneButton} onPress={() => setShowPickerTo(false)}>
                <Text style={s.pickerDoneText}>Fatto</Text>
              </TouchableOpacity>
            )}
            <DateTimePicker
              value={dateTo ?? new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={dateFrom ?? undefined}
              maximumDate={new Date()}
              onChange={(_, date) => {
                if (Platform.OS === 'android') setShowPickerTo(false);
                if (date) setDateTo(date);
              }}
            />
          </View>
        )}
      </View>
      </Animated.View>

      <Animated.View style={{ opacity: chipsAnim, transform: [{ translateY: chipsAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
      <View style={s.section}>
        <Text style={s.sectionTitle}>Esercizio</Text>
        {exercises.length === 0 ? (
          <View style={s.emptyCard}><Text style={s.emptyText}>Nessuna sessione registrata ancora.</Text></View>
        ) : (
          <>
            <View style={s.searchBox}>
              <Ionicons name="search-outline" size={16} color={colors.textMuted} />
              <TextInput
                style={s.searchInput}
                value={exerciseSearch}
                onChangeText={setExerciseSearch}
                placeholder="Cerca esercizio…"
                placeholderTextColor={colors.textMuted}
              />
              {exerciseSearch.length > 0 && (
                <TouchableOpacity onPress={() => setExerciseSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.exerciseChips}>
                {exercises
                  .filter(name => name.toLowerCase().includes(exerciseSearch.toLowerCase()))
                  .map((name) => (
                    <TouchableOpacity
                      key={name}
                      style={[s.chip, selectedExercise === name && s.chipActive]}
                      onPress={() => handleSelectExercise(name)}
                    >
                      <Text style={[s.chipText, selectedExercise === name && s.chipTextActive]}>{name}</Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </ScrollView>
          </>
        )}
      </View>
      </Animated.View>

      <Animated.View style={{ opacity: resultsAnim, transform: [{ translateY: resultsAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
      {!selectedExercise ? (
        <View style={[s.emptyCard, { alignItems: 'center', gap: 8, paddingVertical: 32 }]}>
          <Ionicons name="stats-chart-outline" size={32} color={colors.textMuted} />
          <Text style={[s.emptyText, { textAlign: 'center' }]}>Seleziona un esercizio{'\n'}per vedere i tuoi progressi</Text>
        </View>
      ) : (
        <>
          {searching ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} />
          ) : logs.length === 0 ? (
            <View style={[s.emptyCard, { alignItems: 'center', gap: 8, paddingVertical: 28 }]}>
              <Ionicons name="calendar-outline" size={28} color={colors.textMuted} />
              <Text style={[s.emptyText, { textAlign: 'center' }]}>Nessun log per "{selectedExercise}"{'\n'}nel periodo selezionato.</Text>
            </View>
          ) : (
            <>
              <View style={s.section}>
                <Text style={s.sectionTitle}>Progressione — {selectedExercise}</Text>
                <View style={s.chartCard}>
                  <View style={s.statsRow}>
                    <View style={s.statBox}>
                      <Text style={s.statValue}>{Math.max(...logs.map(l => l.maxWeight))} kg</Text>
                      <Text style={s.statLabel}>Record</Text>
                    </View>
                    <View style={s.statBox}>
                      <Text style={s.statValue}>{Math.round(logs.reduce((sum, l) => sum + l.maxWeight, 0) / logs.length)} kg</Text>
                      <Text style={s.statLabel}>Media</Text>
                    </View>
                    <View style={s.statBox}>
                      <Text style={[s.statValue, {
                        color: logs.length > 1
                          ? logs[logs.length - 1].maxWeight >= logs[0].maxWeight ? '#4CAF50' : '#ff4444'
                          : colors.accent
                      }]}>
                        {logs.length > 1
                          ? `${logs[logs.length - 1].maxWeight >= logs[0].maxWeight ? '+' : ''}${(logs[logs.length - 1].maxWeight - logs[0].maxWeight).toFixed(1)} kg`
                          : `${logs[0].maxWeight} kg`
                        }
                      </Text>
                      <Text style={s.statLabel}>{logs.length > 1 ? 'Progressione' : 'Prima sessione'}</Text>
                    </View>
                  </View>

                  {logs.length === 1 ? (
                    <View style={s.singleSessionCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
                        <Text style={s.singleSessionDate}>{formatDate(logs[0].date)}</Text>
                      </View>
                      <Text style={s.singleSessionWeight}>{logs[0].maxWeight} kg</Text>
                      <Text style={s.singleSessionLabel}>Prima sessione registrata</Text>
                    </View>
                  ) : (
                    <VictoryChart
                      width={SCREEN_WIDTH - 80}
                      height={200}
                      padding={{ top: 16, bottom: 40, left: 48, right: 24 }}
                    >
                      <VictoryAxis
                        tickValues={chartData.map(d => d.x)}
                        tickFormat={(t) => { const log = logs[t - 1]; return log ? formatShortDate(log.date) : ''; }}
                        style={{
                          axis: { stroke: colors.border },
                          tickLabels: { fill: colors.textMuted, fontSize: 10, fontFamily: 'System' },
                          grid: { stroke: 'transparent' },
                        }}
                      />
                      <VictoryAxis
                        dependentAxis
                        style={{
                          axis: { stroke: colors.border },
                          tickLabels: { fill: colors.textMuted, fontSize: 10, fontFamily: 'System' },
                          grid: { stroke: colors.border, strokeDasharray: '4', strokeOpacity: 0.5 },
                        }}
                      />
                      <VictoryLine
                        data={chartData}
                        style={{ data: { stroke: colors.accent, strokeWidth: 2.5 } }}
                        interpolation="monotoneX"
                      />
                      <VictoryScatter
                        data={chartData}
                        size={5}
                        style={{ data: { fill: colors.accent, stroke: colors.surface, strokeWidth: 2 } }}
                      />
                    </VictoryChart>
                  )}
                </View>
              </View>

              <View style={s.section}>
                <Text style={s.sectionTitle}>Storico dettagliato</Text>
                {logs.slice().reverse().map((group) => (
                  <View key={group.date} style={s.logGroup}>
                    <View style={s.logDateRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
                        <Text style={s.logDate}>{formatDate(group.date)}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDeleteSession(group.date)}>
                        <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                    <View style={s.logCard}>
                      <View style={s.logRowHeader}>
                        <Text style={[s.logHeaderText, { flex: 1 }]}>Tipo</Text>
                        <Text style={[s.logHeaderText, { flex: 2 }]}>Reps</Text>
                        <Text style={[s.logHeaderText, { flex: 2 }]}>Kg</Text>
                      </View>
                      {group.sets.map((set, i) => (
                        <View key={i} style={s.logRow}>
                          <View style={[s.setTypeBadge, { backgroundColor: setTypeColor(set.set_type) + '22' }]}>
                            <Text style={[s.setTypeText, { color: setTypeColor(set.set_type) }]}>
                              {setTypeLabel(set.set_type)}
                            </Text>
                          </View>
                          <Text style={[s.logCell, { flex: 2 }]}>{set.reps_done}</Text>
                          <Text style={[s.logCell, { flex: 2, color: colors.accent, fontWeight: '700' }]}>{set.weight_used_kg} kg</Text>
                        </View>
                      ))}
                      <View style={s.maxRow}>
                        <Text style={s.maxLabel}>Max: {group.maxWeight} kg</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </>
      )}
      </Animated.View>
    </ScrollView>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48 },
  centered: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  backText: { color: c.accent, fontSize: 16 },
  titleWrap: { position: 'absolute', left: 0, right: 0 },
  title: { textAlign: 'center', fontSize: 22, fontWeight: '800', color: c.text },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: c.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  dateRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  dateField: { flex: 1 },
  dateLabel: { color: c.textMuted, fontSize: 11, marginBottom: 4 },
  dateButton: { backgroundColor: c.surface, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: c.border },
  dateButtonText: { color: c.text, fontSize: 13 },
  datePlaceholder: { color: c.textMuted },
  pickerContainer: { marginTop: 8, backgroundColor: c.surface, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: c.border },
  pickerDoneButton: { alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border },
  pickerDoneText: { color: c.accent, fontSize: 15, fontWeight: '700' },
  filterButton: { backgroundColor: c.accent, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12 },
  filterButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: c.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: c.border, marginBottom: 10,
  },
  searchInput: { flex: 1, color: c.text, fontSize: 14 },
  exerciseChips: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  chip: { backgroundColor: c.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: c.border },
  chipActive: { backgroundColor: c.accentBg, borderColor: c.accent },
  chipText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: c.accent },
  emptyCard: { backgroundColor: c.surface, borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: c.border },
  emptyText: { color: c.textMuted, fontSize: 14 },
  chartCard: { backgroundColor: c.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: c.border },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statBox: { flex: 1, backgroundColor: c.surfaceElevated, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: c.border },
  statValue: { color: c.accent, fontSize: 15, fontWeight: '800' },
  statLabel: { color: c.textMuted, fontSize: 11, marginTop: 4 },
  singleSessionCard: { alignItems: 'center', paddingVertical: 24, borderTopWidth: 1, borderTopColor: c.border },
  singleSessionDate: { color: c.textMuted, fontSize: 13, marginBottom: 8 },
  singleSessionWeight: { color: c.accent, fontSize: 48, fontWeight: '800' },
  singleSessionLabel: { color: c.textMuted, fontSize: 13, marginTop: 8 },
  logGroup: { marginBottom: 16 },
  logDateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  logDate: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
  trashIcon: { fontSize: 16 },
  logCard: { backgroundColor: c.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: c.border },
  logRowHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: c.border },
  logHeaderText: { color: c.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  logRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  setTypeBadge: { flex: 1, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  setTypeText: { fontSize: 11, fontWeight: '800' },
  logCell: { color: c.text, fontSize: 14, textAlign: 'center' },
  maxRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.border, alignItems: 'flex-end' },
  maxLabel: { color: '#4CAF50', fontSize: 13, fontWeight: '700' },
});
