import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';

type CustomExercise = {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string;
  difficulty: 'principiante' | 'intermedio' | 'avanzato';
  description: string | null;
  video_url: string | null;
  image_url: string | null;
};

const MUSCLE_GROUPS = ['Petto', 'Dorso', 'Spalle', 'Bicipiti', 'Tricipiti', 'Gambe', 'Addominali', 'Glutei'];
const DIFFICULTIES = ['principiante', 'intermedio', 'avanzato'] as const;

const difficultyColor = (d: string) =>
  d === 'principiante' ? '#4CAF50' : d === 'avanzato' ? '#E8533A' : '#FF9800';

export default function MyExercisesScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const { colors } = useTheme();
  const { showAlert } = useAlert();
  const s = makeStyles(colors);

  const [exercises, setExercises] = useState<CustomExercise[]>([]);
  const [loading, setLoading] = useState(true);

  const topBarAnim = useRef(new Animated.Value(0)).current;
  const listAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading) {
      Animated.stagger(120, [
        Animated.timing(topBarAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(listAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState('');
  const [equipment, setEquipment] = useState('');
  const [difficulty, setDifficulty] = useState<'principiante' | 'intermedio' | 'avanzato'>('intermedio');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => { fetchExercises(); }, [profile?.id]));

  const fetchExercises = async () => {
    if (!profile) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from('exercise_catalog').select('*').eq('trainer_id', profile.id).order('name');
    setExercises(data ?? []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditingId(null); setName(''); setMuscle(''); setEquipment('');
    setDifficulty('intermedio'); setDescription(''); setVideoUrl(''); setImageUrl(null);
    setModalVisible(true);
  };

  const openEdit = (ex: CustomExercise) => {
    setEditingId(ex.id); setName(ex.name); setMuscle(ex.muscle_group); setEquipment(ex.equipment);
    setDifficulty(ex.difficulty); setDescription(ex.description ?? ''); setVideoUrl(ex.video_url ?? '');
    setImageUrl(ex.image_url ?? null);
    setModalVisible(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8, base64: true });
    if (result.canceled || !result.assets[0].base64) return;
    setUploadingImage(true);
    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const fileName = `${profile!.id}/${Date.now()}.${ext}`;
    const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const { error } = await supabase.storage.from('exercises').upload(fileName, decode(asset.base64!), { contentType, upsert: true });
    if (error) { showAlert({ title: 'Errore upload', message: error.message }); setUploadingImage(false); return; }
    const { data } = supabase.storage.from('exercises').getPublicUrl(fileName);
    setImageUrl(`${data.publicUrl}?t=${Date.now()}`);
    setUploadingImage(false);
  };

  const handleSave = async () => {
    if (!name.trim() || !muscle || !equipment.trim()) {
      showAlert({ title: 'Attenzione', message: 'Nome, gruppo muscolare e attrezzatura sono obbligatori.' }); return;
    }
    setSaving(true);
    const payload = { name: name.trim(), muscle_group: muscle, equipment: equipment.trim(), difficulty, description: description.trim() || null, video_url: videoUrl.trim() || null, image_url: imageUrl, trainer_id: profile!.id };
    let error;
    if (editingId) { ({ error } = await supabase.from('exercise_catalog').update(payload).eq('id', editingId)); }
    else { ({ error } = await supabase.from('exercise_catalog').insert(payload)); }
    setSaving(false);
    if (error) { showAlert({ title: 'Errore', message: error.message }); return; }
    setModalVisible(false); fetchExercises();
  };

  const handleDelete = (ex: CustomExercise) => {
    showAlert({
      title: 'Elimina esercizio',
      message: `Eliminare "${ex.name}"? Non sarà più disponibile nelle schede future.`,
      buttons: [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Elimina', style: 'destructive', onPress: async () => { await supabase.from('exercise_catalog').delete().eq('id', ex.id); fetchExercises(); } },
      ],
    });
  };

  const renderExercise = ({ item }: { item: CustomExercise }) => (
    <View style={s.card}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={s.cardThumb} contentFit="cover" />
      ) : (
        <View style={[s.cardThumbPlaceholder, { backgroundColor: difficultyColor(item.difficulty) + '22' }]}>
          <Ionicons name="barbell-outline" size={22} color={colors.textMuted} />
        </View>
      )}
      <View style={s.cardBody}>
        <View style={s.cardTitleRow}>
          <View style={[s.diffDot, { backgroundColor: difficultyColor(item.difficulty) }]} />
          <Text style={s.exerciseName}>{item.name}</Text>
        </View>
        <View style={s.meta}>
          <Text style={s.metaText}>{item.muscle_group}</Text>
          <Text style={s.metaDot}>·</Text>
          <Text style={s.metaText}>{item.equipment}</Text>
        </View>
        {item.description ? <Text style={s.description} numberOfLines={2}>{item.description}</Text> : null}
      </View>
      <View style={s.cardActions}>
        <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)}>
          <Text style={s.editBtnText}>✎</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      <Animated.View style={{ opacity: topBarAnim, transform: [{ translateY: topBarAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="chevron-back" size={22} color={colors.accent} />
              <Text style={s.backText}>Profilo</Text>
            </View>
          </TouchableOpacity>
          <Text style={s.title}>I miei esercizi</Text>
          <TouchableOpacity style={s.addBtn} onPress={openCreate}>
            <Text style={s.addBtnText}>+ Nuovo</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {loading ? (
        <View style={s.centered}><ActivityIndicator color={colors.accent} size="large" /></View>
      ) : exercises.length === 0 ? (
        <Animated.View style={[{ flex: 1 }, { opacity: listAnim }]}>
          <View style={s.centered}>
            <Ionicons name="barbell-outline" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={s.emptyTitle}>Nessun esercizio custom</Text>
            <Text style={s.emptySubtitle}>Crea il tuo primo esercizio personalizzato</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={openCreate}>
              <Text style={s.emptyBtnText}>+ Crea esercizio</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      ) : (
        <Animated.View style={[{ flex: 1 }, { opacity: listAnim }]}>
          <FlatList
            data={exercises}
            keyExtractor={item => item.id}
            renderItem={renderExercise}
            contentContainerStyle={{ padding: 24, paddingBottom: 100, gap: 12 }}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      )}

      {/* FAB */}
      {exercises.length > 0 && (
        <TouchableOpacity style={s.fab} onPress={openCreate} activeOpacity={0.85}>
          <Text style={s.fabText}>+</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalContainer}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={s.modalCancel}>Annulla</Text>
              </TouchableOpacity>
              <Text style={s.modalTitle}>{editingId ? 'Modifica' : 'Nuovo esercizio'}</Text>
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color={colors.accent} /> : <Text style={s.modalSave}>Salva</Text>}
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.modalContent}>
              <Text style={s.label}>NOME *</Text>
              <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Es. Curl con elastico" placeholderTextColor={colors.textMuted} />

              <Text style={s.label}>GRUPPO MUSCOLARE *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                {MUSCLE_GROUPS.map(m => (
                  <TouchableOpacity key={m} style={[s.chip, muscle === m && s.chipActive]} onPress={() => setMuscle(m)}>
                    <Text style={[s.chipText, muscle === m && s.chipTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={s.label}>ATTREZZATURA *</Text>
              <TextInput style={s.input} value={equipment} onChangeText={setEquipment} placeholder="Es. manubri, bilanciere, corpo libero..." placeholderTextColor={colors.textMuted} />

              <Text style={s.label}>DIFFICOLTÀ</Text>
              <View style={s.diffRow}>
                {DIFFICULTIES.map(d => (
                  <TouchableOpacity key={d} style={[s.diffBtn, difficulty === d && { borderColor: difficultyColor(d), backgroundColor: difficultyColor(d) + '22' }]} onPress={() => setDifficulty(d)}>
                    <Text style={[s.diffBtnText, difficulty === d && { color: difficultyColor(d) }]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>DESCRIZIONE</Text>
              <TextInput style={[s.input, { height: 100, textAlignVertical: 'top', paddingTop: 14 }]} value={description} onChangeText={setDescription} placeholder="Spiega come eseguire l'esercizio..." placeholderTextColor={colors.textMuted} multiline numberOfLines={4} />

              <Text style={s.label}>IMMAGINE COPERTINA</Text>
              <TouchableOpacity style={s.imagePicker} onPress={pickImage} disabled={uploadingImage}>
                {uploadingImage ? (
                  <ActivityIndicator color={colors.accent} />
                ) : imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={s.imagePreview} contentFit="cover" />
                ) : (
                  <View style={s.imagePlaceholder}>
                    <Text style={s.imagePlaceholderIcon}>🖼</Text>
                    <Text style={s.imagePlaceholderText}>Tocca per aggiungere</Text>
                  </View>
                )}
              </TouchableOpacity>
              {imageUrl && (
                <TouchableOpacity onPress={() => setImageUrl(null)} style={s.removeImageBtn}>
                  <Text style={s.removeImageText}>Rimuovi immagine</Text>
                </TouchableOpacity>
              )}

              <Text style={s.label}>VIDEO URL (opzionale)</Text>
              <TextInput style={s.input} value={videoUrl} onChangeText={setVideoUrl} placeholder="https://youtube.com/..." placeholderTextColor={colors.textMuted} autoCapitalize="none" keyboardType="url" />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: c.border },
  backText: { color: c.accent, fontSize: 16, fontWeight: '600' },
  title: { fontSize: 17, fontWeight: '800', color: c.text },
  addBtn: { backgroundColor: c.accentBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: c.accentBorder },
  addBtnText: { color: c.accent, fontSize: 13, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: c.text },
  emptySubtitle: { fontSize: 14, color: c.textSecondary, textAlign: 'center' },
  emptyBtn: { backgroundColor: c.accent, borderRadius: 14, height: 52, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  card: {
    backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border,
    overflow: 'hidden', flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  cardThumb: { width: 72, height: 72 },
  cardThumbPlaceholder: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  cardBody: { flex: 1, padding: 14 },
  diffDot: { width: 8, height: 8, borderRadius: 4 },
  exerciseName: { color: c.text, fontSize: 15, fontWeight: '700', flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  metaText: { color: c.textSecondary, fontSize: 13 },
  metaDot: { color: c.textMuted, fontSize: 13 },
  description: { color: c.textMuted, fontSize: 13, lineHeight: 18, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 6, marginRight: 14 },
  editBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: c.surfaceElevated, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  editBtnText: { color: c.textSecondary, fontSize: 15 },
  deleteBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#3a1515', alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '700' },
  fab: {
    position: 'absolute', bottom: 32, right: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center',
    shadowColor: c.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },
  modalContainer: { flex: 1, backgroundColor: c.bg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 24, borderBottomWidth: 1, borderBottomColor: c.border },
  modalTitle: { fontSize: 17, fontWeight: '800', color: c.text },
  modalCancel: { color: c.textSecondary, fontSize: 16 },
  modalSave: { color: c.accent, fontSize: 16, fontWeight: '700' },
  modalContent: { padding: 24, paddingBottom: 48 },
  label: { fontSize: 11, fontWeight: '800', color: c.textMuted, letterSpacing: 1.5, marginBottom: 8, marginTop: 20 },
  input: { backgroundColor: c.surfaceElevated, borderRadius: 14, height: 52, paddingHorizontal: 16, color: c.text, fontSize: 15, borderWidth: 1, borderColor: c.border },
  chip: { backgroundColor: c.surface, borderRadius: 20, paddingHorizontal: 16, height: 36, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: c.border },
  chipActive: { backgroundColor: c.accentBg, borderColor: c.accent },
  chipText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: c.accent },
  diffRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  diffBtn: { flex: 1, borderRadius: 12, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border },
  diffBtnText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
  imagePicker: { height: 160, borderRadius: 14, borderWidth: 1, borderColor: c.border, borderStyle: 'dashed', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceElevated },
  imagePreview: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', gap: 8 },
  imagePlaceholderIcon: { fontSize: 32 },
  imagePlaceholderText: { color: c.textMuted, fontSize: 14 },
  removeImageBtn: { marginTop: 8, alignItems: 'center' },
  removeImageText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
});
