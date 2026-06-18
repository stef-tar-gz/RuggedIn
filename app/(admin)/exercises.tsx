import { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, Modal, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import { ScalePressable } from '../../components/ScalePressable';

type Exercise = {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string;
  difficulty: 'principiante' | 'intermedio' | 'avanzato';
  description: string | null;
};

type FormState = {
  name: string;
  muscle_group: string;
  equipment: string;
  difficulty: 'principiante' | 'intermedio' | 'avanzato';
  description: string;
};

const EMPTY_FORM: FormState = {
  name: '', muscle_group: '', equipment: 'corpo libero',
  difficulty: 'intermedio', description: '',
};

const DIFFICULTIES: FormState['difficulty'][] = ['principiante', 'intermedio', 'avanzato'];

export default function AdminExercises() {
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const router = useRouter();
  const s = makeStyles(colors);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const fetchExercises = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('exercise_catalog')
      .select('id, name, muscle_group, equipment, difficulty, description')
      .is('trainer_id', null)
      .order('name');
    setExercises((data as Exercise[]) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchExercises(); }, [fetchExercises]));

  const filtered = exercises.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.muscle_group.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = (ex: Exercise) => {
    setEditingId(ex.id);
    setForm({
      name: ex.name,
      muscle_group: ex.muscle_group,
      equipment: ex.equipment,
      difficulty: ex.difficulty,
      description: ex.description ?? '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.muscle_group.trim()) {
      showAlert({ title: 'Campi obbligatori', message: 'Nome e gruppo muscolare sono richiesti.' });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      muscle_group: form.muscle_group.trim(),
      equipment: form.equipment.trim() || 'corpo libero',
      difficulty: form.difficulty,
      description: form.description.trim() || null,
      trainer_id: null,
    };

    if (editingId) {
      await supabase.from('exercise_catalog').update(payload).eq('id', editingId);
    } else {
      await supabase.from('exercise_catalog').insert(payload);
    }
    setSaving(false);
    setModalVisible(false);
    fetchExercises();
  };

  const handleDelete = (ex: Exercise) => {
    showAlert({
      title: 'Elimina esercizio',
      message: `Vuoi eliminare "${ex.name}"?`,
      buttons: [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina', style: 'destructive', onPress: async () => {
            await supabase.from('exercise_catalog').delete().eq('id', ex.id);
            setExercises(prev => prev.filter(e => e.id !== ex.id));
          },
        },
      ],
    });
  };

  const difficultyColor = (d: string) => {
    if (d === 'principiante') return '#22c55e';
    if (d === 'avanzato') return '#ef4444';
    return colors.accent;
  };

  const renderItem = ({ item }: { item: Exercise }) => (
    <View style={s.row}>
      <View style={s.rowInfo}>
        <Text style={s.rowName}>{item.name}</Text>
        <View style={s.rowMeta}>
          <Text style={s.rowMuscle}>{item.muscle_group}</Text>
          <Text style={[s.rowDiff, { color: difficultyColor(item.difficulty) }]}>{item.difficulty}</Text>
        </View>
        <Text style={s.rowEquip}>{item.equipment}</Text>
      </View>
      <View style={s.rowActions}>
        <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)} activeOpacity={0.7}>
          <Text style={s.editBtnText}>✎</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(item)} activeOpacity={0.7}>
          <Text style={s.deleteBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>Esercizi globali</Text>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}>
          <Text style={s.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={s.searchWrapper}>
        <TextInput
          style={s.search}
          placeholder="Cerca per nome o muscolo..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.accent} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          ListEmptyComponent={<Text style={s.empty}>Nessun esercizio trovato</Text>}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modal}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={s.modalCancel}>Annulla</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>{editingId ? 'Modifica' : 'Nuovo esercizio'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={colors.accent} /> : <Text style={s.modalSave}>Salva</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.modalBody}>
            <Text style={s.fieldLabel}>Nome *</Text>
            <TextInput style={s.field} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} placeholder="es. Squat" placeholderTextColor={colors.textMuted} />

            <Text style={s.fieldLabel}>Gruppo muscolare *</Text>
            <TextInput style={s.field} value={form.muscle_group} onChangeText={v => setForm(f => ({ ...f, muscle_group: v }))} placeholder="es. Quadricipiti" placeholderTextColor={colors.textMuted} />

            <Text style={s.fieldLabel}>Attrezzatura</Text>
            <TextInput style={s.field} value={form.equipment} onChangeText={v => setForm(f => ({ ...f, equipment: v }))} placeholder="es. Bilanciere" placeholderTextColor={colors.textMuted} />

            <Text style={s.fieldLabel}>Difficoltà</Text>
            <View style={s.diffRow}>
              {DIFFICULTIES.map(d => (
                <ScalePressable
                  key={d}
                  style={[s.diffChip, form.difficulty === d && { backgroundColor: colors.accentBg, borderColor: colors.accent }]}
                  onPress={() => setForm(f => ({ ...f, difficulty: d }))}
                >
                  <Text style={[s.diffChipText, form.difficulty === d && { color: colors.accent }]}>{d}</Text>
                </ScalePressable>
              ))}
            </View>

            <Text style={s.fieldLabel}>Descrizione</Text>
            <TextInput
              style={[s.field, s.fieldMulti]}
              value={form.description}
              onChangeText={v => setForm(f => ({ ...f, description: v }))}
              placeholder="Descrizione opzionale..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 30, color: c.text, lineHeight: 34 },
  title: { fontSize: 18, fontWeight: '800', color: c.text },
  addBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: c.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 26 },
  searchWrapper: { padding: 16 },
  search: {
    backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.border,
    paddingHorizontal: 16, paddingVertical: 12, color: c.text, fontSize: 15,
  },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  separator: { height: 1, backgroundColor: c.border },
  empty: { color: c.textSecondary, textAlign: 'center', marginTop: 40, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  rowInfo: { flex: 1, gap: 3 },
  rowName: { fontSize: 15, fontWeight: '700', color: c.text },
  rowMeta: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  rowMuscle: { fontSize: 12, color: c.textSecondary },
  rowDiff: { fontSize: 11, fontWeight: '700' },
  rowEquip: { fontSize: 12, color: c.textMuted },
  rowActions: { flexDirection: 'row', gap: 8 },
  editBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  editBtnText: { color: c.textSecondary, fontSize: 16 },
  deleteBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#3a1515', alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '700' },
  modal: { flex: 1, backgroundColor: c.bg },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: c.text },
  modalCancel: { fontSize: 16, color: c.textSecondary },
  modalSave: { fontSize: 16, fontWeight: '700', color: c.accent },
  modalBody: { padding: 20, gap: 4, paddingBottom: 60 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: c.textMuted, letterSpacing: 0.5, marginTop: 16, marginBottom: 6, textTransform: 'uppercase' },
  field: {
    backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.border,
    paddingHorizontal: 16, paddingVertical: 12, color: c.text, fontSize: 15,
  },
  fieldMulti: { height: 100, paddingTop: 12 },
  diffRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  diffChip: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
    alignItems: 'center',
  },
  diffChipText: { fontSize: 13, fontWeight: '600', color: c.textSecondary },
});
