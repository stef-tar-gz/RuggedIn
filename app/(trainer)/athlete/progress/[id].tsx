import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, TouchableOpacity, Platform, Dimensions
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  VictoryLine, VictoryChart, VictoryAxis,
  VictoryScatter, VictoryTheme
} from 'victory-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../../lib/supabase';
import { useTheme } from '@/context/ThemeContext';

type ExerciseLog = {
  log_date: string; set_type: string; reps_done: number; weight_used_kg: number; exercise_name: string;
};
type GroupedLog = { date: string; sets: ExerciseLog[]; maxWeight: number };

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function TrainerAthleteProgressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();

  const [athleteName, setAthleteName] = useState('');
  const [exercises, setExercises] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [logs, setLogs] = useState<GroupedLog[]>([]);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [showPickerFrom, setShowPickerFrom] = useState(false);
  const [showPickerTo, setShowPickerTo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const s = makeStyles(colors);

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    const [{ data: profile }, { data: exData }] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', id).single(),
      supabase.rpc('get_athlete_exercises', { p_athlete_id: id }),
    ]);
    setAthleteName(profile?.full_name ?? '');
    setExercises((exData || []).map((d: any) => d.exercise_name));
    setLoading(false);
  };

  const fetchHistory = async (exerciseName: string) => {
    setSearching(true);
    const { data } = await supabase.rpc('get_exercise_history', {
      p_athlete_id: id,
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

  const handleSelectExercise = (name: string) => { setSelectedExercise(name); fetchHistory(name); };
  const handleFilter = () => { if (selectedExercise) fetchHistory(selectedExercise); };

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

      <TouchableOpacity style={s.backButton} onPress={() => router.back()}>
        <Text style={s.backText}>‹ Profilo atleta</Text>
      </TouchableOpacity>

      <Text style={s.title}>Progressi</Text>
      <Text style={s.subtitle}>{athleteName}</Text>

      {/* Periodo */}
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
              value={dateFrom ?? new Date()} mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(_, date) => { if (Platform.OS === 'android') setShowPickerFrom(false); if (date) setDateFrom(date); }}
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
              value={dateTo ?? new Date()} mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={dateFrom ?? undefined} maximumDate={new Date()}
              onChange={(_, date) => { if (Platform.OS === 'android') setShowPickerTo(false); if (date) setDateTo(date); }}
            />
          </View>
        )}
      </View>

      {/* Esercizi */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Esercizio</Text>
        {exercises.length === 0 ? (
          <View style={s.emptyCard}><Text style={s.emptyText}>Nessuna sessione registrata ancora.</Text></View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={s.exerciseChips}>
              {exercises.map((name) => (
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
        )}
      </View>

      {/* Risultati */}
      {selectedExercise && (
        <>
          {searching ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} />
          ) : logs.length === 0 ? (
            <View style={s.emptyCard}><Text style={s.emptyText}>Nessun log nel periodo selezionato.</Text></View>
          ) : (
            <>
              {/* Grafico + stats */}
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
                          : `${logs[0].maxWeight} kg`}
                      </Text>
                      <Text style={s.statLabel}>{logs.length > 1 ? 'Progressione' : 'Prima sessione'}</Text>
                    </View>
                  </View>

                  {logs.length === 1 ? (
                    <View style={s.singleSessionCard}>
                      <Text style={s.singleSessionDate}>📅 {formatDate(logs[0].date)}</Text>
                      <Text style={s.singleSessionWeight}>{logs[0].maxWeight} kg</Text>
                      <Text style={s.singleSessionLabel}>Prima sessione registrata</Text>
                    </View>
                  ) : (
                    <VictoryChart
                      width={SCREEN_WIDTH - 80}
                      height={200}
                      padding={{ top: 16, bottom: 40, left: 48, right: 24 }}
                      theme={VictoryTheme.material}
                    >
                      <VictoryAxis
                        tickValues={chartData.map(d => d.x)}
                        tickFormat={(t) => { const log = logs[t - 1]; return log ? formatShortDate(log.date) : ''; }}
                        style={{ axis: { stroke: colors.border }, tickLabels: { fill: colors.textMuted, fontSize: 10, fontFamily: 'System' }, grid: { stroke: 'transparent' } }}
                      />
                      <VictoryAxis
                        dependentAxis
                        style={{ axis: { stroke: colors.border }, tickLabels: { fill: colors.textMuted, fontSize: 10, fontFamily: 'System' }, grid: { stroke: colors.border, strokeDasharray: '4' } }}
                      />
                      <VictoryLine data={chartData} style={{ data: { stroke: colors.accent, strokeWidth: 2.5 } }} interpolation="monotoneX" />
                      <VictoryScatter data={chartData} size={5} style={{ data: { fill: colors.accent, stroke: colors.bg, strokeWidth: 2 } }} />
                    </VictoryChart>
                  )}
                </View>
              </View>

              {/* Storico dettagliato — read-only per il trainer */}
              <View style={s.section}>
                <Text style={s.sectionTitle}>Storico dettagliato</Text>
                {logs.slice().reverse().map((group) => (
                  <View key={group.date} style={s.logGroup}>
                    <Text style={s.logDate}>📅 {formatDate(group.date)}</Text>
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

    </ScrollView>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48 },
  centered: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
  backButton: { marginBottom: 24 },
  backText: { color: c.accent, fontSize: 16 },
  title: { fontSize: 28, fontWeight: '800', color: c.text, marginBottom: 4, textAlign: 'center' },
  subtitle: { color: c.textSecondary, fontSize: 16, marginBottom: 32, textAlign: 'center' },
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
  exerciseChips: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  chip: { backgroundColor: c.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: c.border },
  chipActive: { backgroundColor: c.accentBg, borderColor: c.accent },
  chipText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: c.accent },
  emptyCard: { backgroundColor: c.surface, borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: c.border },
  emptyText: { color: c.textMuted, fontSize: 14 },
  chartCard: { backgroundColor: c.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: c.border },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: c.surfaceElevated, borderRadius: 10, padding: 12, alignItems: 'center' },
  statValue: { color: c.accent, fontSize: 18, fontWeight: '800' },
  statLabel: { color: c.textMuted, fontSize: 11, marginTop: 4 },
  singleSessionCard: { alignItems: 'center', padding: 16 },
  singleSessionDate: { color: c.textSecondary, fontSize: 13, marginBottom: 8 },
  singleSessionWeight: { color: c.accent, fontSize: 32, fontWeight: '800' },
  singleSessionLabel: { color: c.textMuted, fontSize: 12, marginTop: 4 },
  logGroup: { marginBottom: 16 },
  logDate: { color: c.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 },
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
