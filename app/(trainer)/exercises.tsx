import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { useTheme } from '@/context/ThemeContext';

type CustomExercise = {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string;
  difficulty: 'principiante' | 'intermedio' | 'avanzato';
  description: string | null;
  video_url: string | null;
};

const MUSCLE_GROUPS = ['Petto', 'Dorso', 'Spalle', 'Bicipiti', 'Tricipiti', 'Gambe', 'Addominali', 'Glutei'];
const DIFFICULTIES = ['principiante', 'intermedio', 'avanzato'] as const;

const difficultyColor = (d: string) =>
  d === 'principiante' ? '#4CAF50' : d === 'avanzato' ? '#E8533A' : '#FF9800';

export default function MyExercisesScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const [exercises, setExercises] = useState<CustomExercise[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state (create/edit)
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState('');
  const [equipment, setEquipment] = useState('');
  const [difficulty, setDifficulty] = useState<'principiante' | 'intermedio' | 'avanzato'>('intermedio');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => { fetchExercises(); }, [profile?.id]));

  const fetchExercises = async () => {
    if (!profile) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('exercise_catalog')
      .select('*')
      .eq('trainer_id', profile.id)
      .order('name');
    setExercises(data ?? []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setName(''); setMuscle(''); setEquipment('');
    setDifficulty('intermedio'); setDescription(''); setVideoUrl('');
    setModalVisible(true);
  };

  const openEdit = (ex: CustomExercise) => {
    setEditingId(ex.id);
    setName(ex.name); setMuscle(ex.muscle_group); setEquipment(ex.equipment);
    setDifficulty(ex.difficulty); setDescription(ex.description ?? ''); setVideoUrl(ex.video_url ?? '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !muscle || !equipment.trim()) {
      Alert.alert('Attenzione', 'Nome, gruppo muscolare e attrezzatura sono obbligatori.');
      return;
    }
    setSaving(true);
    const payload = {
      name: name.trim(),
      muscle_group: muscle,
      equipment: equipment.trim(),
      difficulty,
      description: description.trim() || null,
      video_url: videoUrl.trim() || null,
      trainer_id: profile!.id,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from('exercise_catalog').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('exercise_catalog').insert(payload));
    }

    setSaving(false);
    if (error) { Alert.alert('Errore', error.message); return; }
    setModalVisible(false);
    fetchExercises();
  };

  const handleDelete = (ex: CustomExercise) => {
    Alert.alert(
      'Elimina esercizio',
      `Eliminare "${ex.name}"? Non sarà più disponibile nelle schede future.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina', style: 'destructive',
          onPress: async () => {
            await supabase.from('exercise_catalog').delete().eq('id', ex.id);
            fetchExercises();
          },
        },
      ]
    );
  };

  const renderExercise = ({ item }: { item: CustomExercise }) => (
    <View style={s.card}>
      <View style={s.cardBody}>
        <Text style={s.exerciseName}>{item.name}</Text>
        <View style={s.meta}>
          <Text style={s.metaText}>{item.muscle_group}</Text>
          <Text style={s.metaDot}>·</Text>
          <Text style={s.metaText}>{item.equipment}</Text>
          <Text style={s.metaDot}>·</Text>
          <Text style={[s.difficulty, { color: difficultyColor(item.difficulty) }]}>{item.difficulty}</Text>
        </View>
        {item.description && (
          <Text style={s.description} numberOfLines={2}>{item.description}</Text>
        )}
      </View>
      <View style={s.cardActions}>
        <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)}>
          <Text style={s.editBtnText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(item)}>
          <Text style={s.deleteBtnText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backText}>‹ Profilo</Text>
        </TouchableOpacity>
        <Text style={s.title}>I miei esercizi</Text>
        <TouchableOpacity style={s.addBtn} onPress={openCreate}>
          <Text style={s.addBtnText}>+ Nuovo</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.centered}><ActivityIndicator color={colors.accent} size="large" /></View>
      ) : exercises.length === 0 ? (
        <View style={s.centered}>
          <Text style={s.emptyIcon}>💪</Text>
          <Text style={s.emptyTitle}>Nessun esercizio custom</Text>
          <Text style={s.emptySubtitle}>Crea il tuo primo esercizio personalizzato</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={openCreate}>
            <Text style={s.emptyBtnText}>+ Crea esercizio</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={item => item.id}
          renderItem={renderExercise}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {/* Modal crea/modifica */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalContainer}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editingId ? 'Modifica esercizio' : 'Nuovo esercizio'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.modalContent}>
              <Text style={s.label}>Nome *</Text>
              <TextInput style={s.input} value={name} onChangeText={setName}
                placeholder="Es. Curl con elastico" placeholderTextColor={colors.textMuted} />

              <Text style={s.label}>Gruppo muscolare *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                {MUSCLE_GROUPS.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[s.chip, muscle === m && s.chipActive]}
                    onPress={() => setMuscle(m)}
                  >
                    <Text style={[s.chipText, muscle === m && s.chipTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={s.label}>Attrezzatura *</Text>
              <TextInput style={s.input} value={equipment} onChangeText={setEquipment}
                placeholder="Es. manubri, bilanciere, corpo libero..." placeholderTextColor={colors.textMuted} />

              <Text style={s.label}>Difficoltà</Text>
              <View style={s.diffRow}>
                {DIFFICULTIES.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[s.diffBtn, difficulty === d && { borderColor: difficultyColor(d), backgroundColor: difficultyColor(d) + '22' }]}
                    onPress={() => setDifficulty(d)}
                  >
                    <Text style={[s.diffBtnText, difficulty === d && { color: difficultyColor(d) }]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>Descrizione esecuzione</Text>
              <TextInput
                style={[s.input, { height: 100, textAlignVertical: 'top' }]}
                value={description} onChangeText={setDescription}
                placeholder="Spiega come eseguire l'esercizio..." placeholderTextColor={colors.textMuted}
                multiline numberOfLines={4}
              />

              <Text style={s.label}>Video URL (opzionale)</Text>
              <TextInput style={s.input} value={videoUrl} onChangeText={setVideoUrl}
                placeholder="https://youtube.com/..." placeholderTextColor={colors.textMuted}
                autoCapitalize="none" keyboardType="url" />

              <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>{editingId ? 'Salva modifiche' : 'Crea esercizio'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: c.border },
  backText: { color: c.accent, fontSize: 16 },
  title: { fontSize: 17, fontWeight: '800', color: c.text },
  addBtn: { backgroundColor: c.accentBg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: c.accentBorder },
  addBtnText: { color: c.accent, fontSize: 13, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { color: c.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { color: c.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 24 },
  emptyBtn: { backgroundColor: c.accent, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  card: { backgroundColor: c.surface, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: c.border },
  cardBody: { flex: 1 },
  exerciseName: { color: c.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  metaText: { color: c.textSecondary, fontSize: 12 },
  metaDot: { color: c.textMuted, fontSize: 12 },
  difficulty: { fontSize: 12, fontWeight: '600' },
  description: { color: c.textMuted, fontSize: 13, lineHeight: 18 },
  cardActions: { flexDirection: 'row', gap: 4, marginLeft: 8 },
  editBtn: { padding: 8 },
  editBtnText: { fontSize: 16 },
  deleteBtn: { padding: 8 },
  deleteBtnText: { fontSize: 16 },
  // Modal
  modalContainer: { flex: 1, backgroundColor: c.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 24, borderBottomWidth: 1, borderBottomColor: c.border },
  modalTitle: { fontSize: 18, fontWeight: '800', color: c.text },
  modalClose: { color: c.textMuted, fontSize: 18 },
  modalContent: { padding: 20, paddingBottom: 40 },
  label: { color: c.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: c.surface, borderRadius: 10, padding: 14, color: c.text, fontSize: 15, borderWidth: 1, borderColor: c.border },
  chip: { backgroundColor: c.surface, borderRadius: 20, paddingHorizontal: 14, height: 36, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: c.border },
  chipActive: { backgroundColor: c.accentBg, borderColor: c.accent },
  chipText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: c.accent },
  diffRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  diffBtn: { flex: 1, borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: c.border },
  diffBtnText: { color: c.textSecondary, fontSize: 12, fontWeight: '600' },
  saveBtn: { backgroundColor: c.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
