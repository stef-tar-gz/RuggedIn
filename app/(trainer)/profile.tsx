import { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { useTheme } from '@/context/ThemeContext';

export default function TrainerProfileScreen() {
  const { profile, loading: profileLoading, refetch } = useProfile();
  const { colors, isDark, toggleTheme } = useTheme();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [notes, setNotes] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayImage, setDisplayImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const localImageUriRef = useRef<string | null>(null);

  const s = makeStyles(colors);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setBio((profile as any).bio ?? '');
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
          <Text style={s.backText}>‹ Dashboard</Text>
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
          placeholder="Descrivi la tua esperienza come trainer..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
        />

        <Text style={s.label}>Note</Text>
        <TextInput
          style={[s.input, s.inputMultiline]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Specializzazioni, certificazioni..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Catalogo</Text>
        <TouchableOpacity style={s.navRow} onPress={() => router.push('/(trainer)/exercises')}>
          <Text style={s.navIcon}>💪</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.navLabel}>I miei esercizi</Text>
            <Text style={s.navSub}>Gestisci i tuoi esercizi custom</Text>
          </View>
          <Text style={s.navChevron}>›</Text>
        </TouchableOpacity>
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
  saveButton: { backgroundColor: c.accent, borderRadius: 12, padding: 18, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  logoutButton: { marginTop: 16, borderRadius: 12, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: '#ff4444' },
  logoutButtonText: { color: '#ff4444', fontSize: 16, fontWeight: '700' },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: c.border },
  navIcon: { fontSize: 22 },
  navLabel: { color: c.text, fontSize: 15, fontWeight: '600' },
  navSub: { color: c.textMuted, fontSize: 12, marginTop: 2 },
  navChevron: { color: c.textSecondary, fontSize: 22 },
});
