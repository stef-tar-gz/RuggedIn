import { useState, useEffect, useCallback } from 'react';
import {
  Modal, View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useTheme } from '@/context/ThemeContext';

export type CatalogExercise = {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string;
  difficulty: string;
  description: string | null;
  video_url: string | null;
  is_custom: boolean;
};

const MUSCLE_GROUPS = [
  'Tutti', 'Petto', 'Dorso', 'Spalle', 'Bicipiti',
  'Tricipiti', 'Gambe', 'Addominali', 'Glutei',
];

type Props = {
  visible: boolean;
  trainerId: string;
  onSelect: (exercise: CatalogExercise) => void;
  onClose: () => void;
};

export default function ExercisePickerModal({ visible, trainerId, onSelect, onClose }: Props) {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const [exercises, setExercises] = useState<CatalogExercise[]>([]);
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('Tutti');
  const [onlyCustom, setOnlyCustom] = useState(false);
  const [loading, setLoading] = useState(false);

  // Stato per creazione esercizio custom
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMuscle, setNewMuscle] = useState('');
  const [newEquipment, setNewEquipment] = useState('');
  const [newDifficulty, setNewDifficulty] = useState<'principiante' | 'intermedio' | 'avanzato'>('intermedio');
  const [newDescription, setNewDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchExercises = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_exercise_catalog', {
      p_trainer_id: trainerId,
      p_search: search,
      p_muscle: selectedMuscle === 'Tutti' ? '' : selectedMuscle,
    });
    if (error) Alert.alert('Errore', error.message);
    else setExercises(data ?? []);
    setLoading(false);
  }, [trainerId, search, selectedMuscle]);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(fetchExercises, 300);
      return () => clearTimeout(timer);
    }
  }, [visible, fetchExercises]);

  const handleCreateCustom = async () => {
    if (!newName.trim() || !newMuscle.trim() || !newEquipment.trim()) {
      Alert.alert('Attenzione', 'Nome, gruppo muscolare e attrezzatura sono obbligatori.');
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from('exercise_catalog')
      .insert({
        name: newName.trim(),
        muscle_group: newMuscle.trim(),
        equipment: newEquipment.trim(),
        difficulty: newDifficulty,
        description: newDescription.trim() || null,
        trainer_id: trainerId,
      })
      .select()
      .single();

    setSaving(false);
    if (error) {
      Alert.alert('Errore', error.message);
      return;
    }
    // Reset form
    setNewName(''); setNewMuscle(''); setNewEquipment('');
    setNewDescription(''); setNewDifficulty('intermedio');
    setShowCreate(false);
    // Seleziona subito l'esercizio appena creato
    onSelect({ ...data, is_custom: true });
  };

  const difficultyColor = (d: string) =>
    d === 'principiante' ? '#4CAF50' : d === 'avanzato' ? colors.accent : '#FF9800';

  const renderExercise = ({ item }: { item: CatalogExercise }) => (
    <TouchableOpacity style={s.exerciseRow} onPress={() => onSelect(item)}>
      <View style={s.exerciseInfo}>
        <View style={s.exerciseNameRow}>
          <Text style={s.exerciseName}>{item.name}</Text>
          {item.is_custom && <View style={s.customBadge}><Text style={s.customBadgeText}>Custom</Text></View>}
        </View>
        <View style={s.exerciseMeta}>
          <Text style={s.exerciseMetaText}>{item.muscle_group}</Text>
          <Text style={s.exerciseMetaDot}>·</Text>
          <Text style={s.exerciseMetaText}>{item.equipment}</Text>
          <Text style={s.exerciseMetaDot}>·</Text>
          <Text style={[s.exerciseDifficulty, { color: difficultyColor(item.difficulty) }]}>
            {item.difficulty}
          </Text>
        </View>
      </View>
      <Text style={s.chevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.container}>

          {/* Header */}
          <View style={s.header}>
            <Text style={s.title}>{showCreate ? 'Esercizio Custom' : 'Scegli Esercizio'}</Text>
            <TouchableOpacity onPress={showCreate ? () => setShowCreate(false) : onClose}>
              <Text style={s.closeBtn}>{showCreate ? '‹ Indietro' : '✕'}</Text>
            </TouchableOpacity>
          </View>

          {showCreate ? (
            /* ── Form creazione custom ── */
            <ScrollView contentContainerStyle={s.createForm}>
              <Text style={s.label}>Nome *</Text>
              <TextInput style={s.input} value={newName} onChangeText={setNewName}
                placeholder="Es. Curl con elastico" placeholderTextColor={colors.textMuted} />

              <Text style={s.label}>Gruppo muscolare *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                  {MUSCLE_GROUPS.filter(m => m !== 'Tutti').map(m => (
                    <TouchableOpacity
                      key={m}
                      style={[s.muscleChip, newMuscle === m && s.muscleChipActive]}
                      onPress={() => setNewMuscle(m)}
                    >
                      <Text style={[s.muscleChipText, newMuscle === m && s.muscleChipTextActive]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>

              <Text style={s.label}>Attrezzatura *</Text>
              <TextInput style={s.input} value={newEquipment} onChangeText={setNewEquipment}
                placeholder="Es. elastico, TRX..." placeholderTextColor={colors.textMuted} />

              <Text style={s.label}>Difficoltà</Text>
              <View style={s.diffRow}>
                {(['principiante', 'intermedio', 'avanzato'] as const).map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[s.diffBtn, newDifficulty === d && { borderColor: difficultyColor(d), backgroundColor: difficultyColor(d) + '22' }]}
                    onPress={() => setNewDifficulty(d)}
                  >
                    <Text style={[s.diffBtnText, newDifficulty === d && { color: difficultyColor(d) }]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>Descrizione esecuzione</Text>
              <TextInput
                style={[s.input, { height: 100, textAlignVertical: 'top' }]}
                value={newDescription} onChangeText={setNewDescription}
                placeholder="Spiega come eseguire l'esercizio..." placeholderTextColor={colors.textMuted}
                multiline numberOfLines={4}
              />

              <TouchableOpacity style={s.saveBtn} onPress={handleCreateCustom} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Crea e seleziona</Text>}
              </TouchableOpacity>
            </ScrollView>
          ) : (
            /* ── Lista esercizi ── */
            <>
              {/* Sezione fissa: search + filtri */}
              <View>
                <View style={s.searchBar}>
                  <Text style={s.searchIcon}>🔍</Text>
                  <TextInput
                    style={s.searchInput} value={search} onChangeText={setSearch}
                    placeholder="Cerca esercizio..." placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                  />
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                      <Text style={s.clearBtn}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.muscleFilter} contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, alignItems: 'center', paddingVertical: 6 }}>
                  {MUSCLE_GROUPS.map(m => (
                    <TouchableOpacity
                      key={m}
                      style={[s.muscleChip, selectedMuscle === m && !onlyCustom && s.muscleChipActive]}
                      onPress={() => { setSelectedMuscle(m); setOnlyCustom(false); }}
                    >
                      <Text style={[s.muscleChipText, selectedMuscle === m && !onlyCustom && s.muscleChipTextActive]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[s.muscleChip, s.customChip, onlyCustom && s.customChipActive]}
                    onPress={() => { setOnlyCustom(prev => !prev); setSelectedMuscle('Tutti'); }}
                  >
                    <Text style={[s.muscleChipText, onlyCustom && s.customChipTextActive]}>⭐ Custom</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              {/* Lista scrollabile */}
              {loading ? (
                <View style={s.centered}><ActivityIndicator color={colors.accent} size="large" /></View>
              ) : (
                <FlatList
                  data={onlyCustom ? exercises.filter(e => e.is_custom) : exercises}
                  keyExtractor={item => item.id}
                  renderItem={renderExercise}
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingBottom: 80 }}
                  ListEmptyComponent={
                    <View style={s.emptyContainer}>
                      <Text style={s.emptyText}>Nessun esercizio trovato</Text>
                    </View>
                  }
                />
              )}

              {/* Bottone crea custom */}
              <TouchableOpacity style={s.createBtn} onPress={() => setShowCreate(true)}>
                <Text style={s.createBtnText}>+ Crea esercizio custom</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.border },
  title: { fontSize: 18, fontWeight: '800', color: c.text },
  closeBtn: { color: c.accent, fontSize: 16, fontWeight: '600' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, marginHorizontal: 16, marginVertical: 12, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: c.border },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: c.text, fontSize: 15, paddingVertical: 12 },
  clearBtn: { color: c.textMuted, fontSize: 16, paddingLeft: 8 },
  muscleFilter: { marginBottom: 4 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  muscleChip: { backgroundColor: c.surface, borderRadius: 22, paddingHorizontal: 18, height: 44, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: c.border, flexShrink: 0 },
  muscleChipActive: { backgroundColor: c.accentBg, borderColor: c.accent, height: 44 },
  customChip: { borderColor: '#FF9800' },
  customChipActive: { backgroundColor: '#FF980022', borderColor: '#FF9800', height: 44 },
  customChipTextActive: { color: '#FF9800' },
  muscleChipText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
  muscleChipTextActive: { color: c.accent },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { color: c.textMuted, fontSize: 15 },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.border },
  exerciseInfo: { flex: 1 },
  exerciseNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  exerciseName: { color: c.text, fontSize: 15, fontWeight: '700' },
  customBadge: { backgroundColor: c.accentBg, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  customBadgeText: { color: c.accent, fontSize: 10, fontWeight: '700' },
  exerciseMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  exerciseMetaText: { color: c.textSecondary, fontSize: 12 },
  exerciseMetaDot: { color: c.textMuted, fontSize: 12 },
  exerciseDifficulty: { fontSize: 12, fontWeight: '600' },
  chevron: { color: c.textSecondary, fontSize: 22, marginLeft: 8 },
  createBtn: { position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: c.surface, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: c.accentBorder },
  createBtnText: { color: c.accent, fontSize: 15, fontWeight: '700' },
  // Create form
  createForm: { padding: 20, paddingBottom: 40 },
  label: { color: c.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  input: { backgroundColor: c.surface, borderRadius: 10, padding: 14, color: c.text, fontSize: 15, borderWidth: 1, borderColor: c.border, marginBottom: 4 },
  diffRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  diffBtn: { flex: 1, borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: c.border },
  diffBtnText: { color: c.textSecondary, fontSize: 12, fontWeight: '600' },
  saveBtn: { backgroundColor: c.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
