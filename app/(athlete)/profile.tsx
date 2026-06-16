import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { useTheme } from '@/context/ThemeContext';

type TrainerInfo = {
  id: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
};

export default function AthleteProfileScreen() {
  const { profile, loading: profileLoading, refetch } = useProfile();
  const { colors, isDark, toggleTheme } = useTheme();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [notes, setNotes] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayImage, setDisplayImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const localImageUriRef = useRef<string | null>(null);

  // Trainer section
  const [currentTrainer, setCurrentTrainer] = useState<TrainerInfo | null>(null);
  const [pendingRequest, setPendingRequest] = useState<{ id: string; trainer: TrainerInfo } | null>(null);
  const [trainerLoading, setTrainerLoading] = useState(false);

  const fetchTrainerStatus = useCallback(async () => {
    if (!profile) return;
    setTrainerLoading(true);
    try {
      // Trainer corrente: legge trainer_id poi fetcha il profilo
      const { data: rel } = await supabase
        .from('trainer_athlete')
        .select('trainer_id')
        .eq('athlete_id', profile.id)
        .maybeSingle();

      if (rel?.trainer_id) {
        const { data: trainerProfile } = await supabase
          .from('profiles')
          .select('id, full_name, bio, avatar_url')
          .eq('id', rel.trainer_id)
          .single();
        setCurrentTrainer(trainerProfile as TrainerInfo ?? null);
      } else {
        setCurrentTrainer(null);
      }

      // Richiesta pending: legge trainer_id poi fetcha il profilo
      const { data: req } = await supabase
        .from('trainer_athlete_requests')
        .select('id, trainer_id')
        .eq('athlete_id', profile.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (req?.trainer_id) {
        const { data: trainerProfile } = await supabase
          .from('profiles')
          .select('id, full_name, bio, avatar_url')
          .eq('id', req.trainer_id)
          .single();
        setPendingRequest(trainerProfile ? { id: req.id, trainer: trainerProfile as TrainerInfo } : null);
      } else {
        setPendingRequest(null);
      }
    } finally {
      setTrainerLoading(false);
    }
  }, [profile]);

  useFocusEffect(useCallback(() => {
    fetchTrainerStatus();
  }, [fetchTrainerStatus]));

  const handleRevokeRequest = () => {
    Alert.alert(
      'Revoca richiesta',
      `Vuoi annullare la richiesta inviata a ${pendingRequest?.trainer.full_name}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Revoca',
          style: 'destructive',
          onPress: async () => {
            if (!pendingRequest) return;
            await supabase.from('trainer_athlete_requests').delete().eq('id', pendingRequest.id);
            setPendingRequest(null);
          },
        },
      ]
    );
  };

  const handleChangeTrainer = () => {
    Alert.alert(
      'Cambia trainer',
      'Cambiando trainer perderai tutte le schede di allenamento assegnate. Prima di procedere puoi scaricarle in PDF.\n\nVuoi continuare?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Continua',
          style: 'destructive',
          onPress: () => router.push('/(athlete)/find-trainer'),
        },
      ]
    );
  };

  const s = makeStyles(colors);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setBio((profile as any).bio ?? '');
      setHeightCm((profile as any).height_cm ? String((profile as any).height_cm) : '');
      setWeightKg((profile as any).weight_kg ? String((profile as any).weight_kg) : '');
      setNotes((profile as any).notes ?? '');
      setAvatarUrl(profile.avatar_url ?? null);
      setDisplayImage(localImageUriRef.current ?? profile.avatar_url ?? null);
    }
  }, [profile]);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permesso negato', 'Abilita l\'accesso alla galleria nelle impostazioni.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled) return;
    if (!result.assets[0].base64) {
      Alert.alert('Errore', 'Impossibile leggere l\'immagine.');
      return;
    }

    setUploadingImage(true);

    const asset = result.assets[0];
    localImageUriRef.current = asset.uri;
    setDisplayImage(asset.uri);

    const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const fileName = `${profile!.auth_user_id}/avatar.${ext}`;
    const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, decode(asset.base64!), { contentType, upsert: true });

    if (uploadError) {
      Alert.alert('Errore upload', uploadError.message);
      setUploadingImage(false);
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const publicUrl = data.publicUrl.replace('/object/sign/', '/object/public/').split('?')[0];
    setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
    setUploadingImage(false);
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Errore', 'Il nome non può essere vuoto.');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        bio: bio.trim() || null,
        height_cm: heightCm ? parseFloat(heightCm) : null,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        notes: notes.trim() || null,
        avatar_url: avatarUrl,
      })
      .eq('id', profile!.id);

    if (error) {
      Alert.alert('Errore', error.message);
    } else {
      await refetch();
      Alert.alert('Salvato', 'Profilo aggiornato!');
    }
    setSaving(false);
  };

  if (profileLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backText}>‹ Indietro</Text>
        </TouchableOpacity>
        <Text style={s.title}>Il mio profilo</Text>
      </View>

      <View style={s.avatarSection}>
        <TouchableOpacity onPress={handlePickImage} disabled={uploadingImage}>
          {uploadingImage ? (
            <View style={s.avatarPlaceholder}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : displayImage ? (
            <Image source={{ uri: displayImage }} style={s.avatar} contentFit="cover" transition={200} />
          ) : (
            <View style={s.avatarPlaceholder}>
              <Text style={s.avatarInitial}>{fullName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={s.avatarHint}>Tocca per cambiare foto</Text>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Aspetto</Text>
        <TouchableOpacity style={s.themeRow} onPress={toggleTheme}>
          <Text style={s.themeIcon}>{isDark ? '🌙' : '☀️'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Tema {isDark ? 'scuro' : 'chiaro'}</Text>
            <Text style={s.themeHint}>Tocca per cambiare</Text>
          </View>
          <View style={[s.themeDot, { backgroundColor: isDark ? colors.textMuted : colors.accent }]} />
        </TouchableOpacity>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Dati personali</Text>

        <Text style={s.label}>Nome completo</Text>
        <TextInput
          style={s.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Il tuo nome"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={s.label}>Bio</Text>
        <TextInput
          style={[s.input, s.inputMultiline]}
          value={bio}
          onChangeText={setBio}
          placeholder="Raccontati in breve..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
        />

        <View style={s.row}>
          <View style={s.rowItem}>
            <Text style={s.label}>Altezza (cm)</Text>
            <TextInput
              style={s.input}
              value={heightCm}
              onChangeText={setHeightCm}
              placeholder="175"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={s.rowItem}>
            <Text style={s.label}>Peso (kg)</Text>
            <TextInput
              style={s.input}
              value={weightKg}
              onChangeText={setWeightKg}
              placeholder="80"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <Text style={s.label}>Note personali</Text>
        <TextInput
          style={[s.input, s.inputMultiline]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Infortuni, obiettivi, preferenze..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* ── SEZIONE TRAINER ── */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Il mio Trainer</Text>

        {trainerLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: 12 }} />
        ) : currentTrainer ? (
          /* Trainer attivo */
          <View style={s.trainerCard}>
            {currentTrainer.avatar_url ? (
              <Image source={{ uri: currentTrainer.avatar_url }} style={s.trainerAvatar} contentFit="cover" />
            ) : (
              <View style={s.trainerAvatarPlaceholder}>
                <Text style={s.trainerAvatarInitial}>{currentTrainer.full_name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.trainerName}>{currentTrainer.full_name}</Text>
              {currentTrainer.bio ? (
                <Text style={s.trainerBio} numberOfLines={2}>{currentTrainer.bio}</Text>
              ) : null}
            </View>
            <TouchableOpacity style={s.changeTrainerBtn} onPress={handleChangeTrainer}>
              <Text style={s.changeTrainerText}>Cambia</Text>
            </TouchableOpacity>
          </View>
        ) : pendingRequest ? (
          /* Richiesta pending */
          <View style={s.pendingCard}>
            {pendingRequest.trainer.avatar_url ? (
              <Image source={{ uri: pendingRequest.trainer.avatar_url }} style={s.trainerAvatar} contentFit="cover" />
            ) : (
              <View style={s.trainerAvatarPlaceholder}>
                <Text style={s.trainerAvatarInitial}>{pendingRequest.trainer.full_name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.pendingLabel}>In attesa di accettazione da</Text>
              <Text style={s.trainerName}>{pendingRequest.trainer.full_name}</Text>
              <Text style={s.pendingHint}>Il trainer deve ancora accettarti ⏳</Text>
            </View>
            <TouchableOpacity style={s.revokeBtn} onPress={handleRevokeRequest}>
              <Text style={s.revokeText}>Revoca</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Nessun trainer */
          <TouchableOpacity style={s.findTrainerBtn} onPress={() => router.push('/(athlete)/find-trainer')}>
            <Text style={s.findTrainerText}>🔍  Trova un Trainer</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={s.saveButton} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveButtonText}>Salva profilo</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={s.logoutButton}
        onPress={() => Alert.alert('Disconnetti', 'Sei sicuro di voler uscire?', [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Disconnetti', style: 'destructive', onPress: () => supabase.auth.signOut() },
        ])}
      >
        <Text style={s.logoutButtonText}>Disconnetti</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48 },
  centered: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 32 },
  backText: { color: c.accent, fontSize: 16 },
  title: { fontSize: 20, fontWeight: '800', color: c.text },
  avatarSection: { alignItems: 'center', marginBottom: 36 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: c.accent },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.accentBorder },
  avatarInitial: { color: c.accent, fontSize: 40, fontWeight: '800' },
  avatarHint: { color: c.textMuted, fontSize: 12, marginTop: 8 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: c.textSecondary, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  label: { color: c.textSecondary, fontSize: 12, marginBottom: 6, marginTop: 4 },
  themeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: c.border },
  themeIcon: { fontSize: 22 },
  themeHint: { color: c.textMuted, fontSize: 12, marginTop: 2 },
  themeDot: { width: 12, height: 12, borderRadius: 6 },
  input: { backgroundColor: c.surface, borderRadius: 10, padding: 14, color: c.text, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: c.border },
  inputMultiline: { height: 90, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1 },
  saveButton: { backgroundColor: c.accent, borderRadius: 12, padding: 18, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  logoutButton: { marginTop: 16, borderRadius: 12, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: '#ff4444' },
  logoutButtonText: { color: '#ff4444', fontSize: 16, fontWeight: '700' },
  // Trainer section
  trainerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: c.accentBorder },
  trainerAvatar: { width: 52, height: 52, borderRadius: 26 },
  trainerAvatarPlaceholder: { width: 52, height: 52, borderRadius: 26, backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center' },
  trainerAvatarInitial: { color: c.accent, fontSize: 22, fontWeight: '800' },
  trainerName: { color: c.text, fontSize: 15, fontWeight: '700' },
  trainerBio: { color: c.textSecondary, fontSize: 12, marginTop: 2 },
  changeTrainerBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: c.border },
  changeTrainerText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
  pendingCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: c.border },
  pendingLabel: { color: c.textMuted, fontSize: 11, marginBottom: 2 },
  pendingHint: { color: c.textMuted, fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  revokeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#ff4444' },
  revokeText: { color: '#ff4444', fontSize: 13, fontWeight: '600' },
  findTrainerBtn: { backgroundColor: c.accentBg, borderRadius: 12, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: c.accentBorder },
  findTrainerText: { color: c.accent, fontSize: 15, fontWeight: '700' },
});
