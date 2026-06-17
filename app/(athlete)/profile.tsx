import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Animated, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { PhotoModal } from '@/components/PhotoModal';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../hooks/useProfile';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';

const { width: SW } = Dimensions.get('window');
const TAB_W = (SW - 48) / 3;
const TABS = ['Info', 'Obiettivi', 'Trainer'] as const;

type TrainerInfo = {
  id: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
};

export default function AthleteProfileScreen() {
  const { profile, loading: profileLoading, refetch } = useProfile();
  const { colors } = useTheme();
  const router = useRouter();
  const { showAlert } = useAlert();
  const s = makeStyles(colors);

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [notes, setNotes] = useState('');
  const [goal, setGoal] = useState<string | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<string | null>(null);
  const [daysPerWeek, setDaysPerWeek] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayImage, setDisplayImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const localImageUriRef = useRef<string | null>(null);
  const [viewingImage, setViewingImage] = useState(false);

  const [currentTrainer, setCurrentTrainer] = useState<TrainerInfo | null>(null);
  const [pendingRequest, setPendingRequest] = useState<{ id: string; trainer: TrainerInfo } | null>(null);
  const [trainerLoading, setTrainerLoading] = useState(false);

  // Swipeable tabs
  const [activeTab, setActiveTab] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const tabIndicator = useRef(new Animated.Value(0)).current;
  const tabScales = useRef(TABS.map((_, i) => new Animated.Value(i === 0 ? 1 : 0.88))).current;
  const tabTranslates = useRef(TABS.map((_, i) => new Animated.Value(i === 0 ? 0 : 4))).current;

  const animateToTab = (index: number) => {
    Animated.spring(tabIndicator, { toValue: index, useNativeDriver: true, tension: 120, friction: 10 }).start();
    TABS.forEach((_, i) => {
      const isActive = i === index;
      Animated.spring(tabScales[i], { toValue: isActive ? 1.12 : 0.88, useNativeDriver: true, tension: 140, friction: 10 }).start();
      Animated.spring(tabTranslates[i], { toValue: isActive ? -2 : 4, useNativeDriver: true, tension: 140, friction: 10 }).start();
    });
  };

  const goToTab = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * SW, animated: true });
    setActiveTab(index);
    animateToTab(index);
  };

  const handleScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / SW);
    if (index !== activeTab) {
      setActiveTab(index);
      animateToTab(index);
    }
  };

  const fetchTrainerStatus = useCallback(async () => {
    if (!profile) return;
    setTrainerLoading(true);
    try {
      const { data: rel } = await supabase
        .from('trainer_athlete').select('trainer_id').eq('athlete_id', profile.id).maybeSingle();
      if (rel?.trainer_id) {
        const { data: tp } = await supabase.from('profiles').select('id, full_name, bio, avatar_url').eq('id', rel.trainer_id).single();
        setCurrentTrainer(tp as TrainerInfo ?? null);
      } else {
        setCurrentTrainer(null);
      }
      const { data: req } = await supabase
        .from('trainer_athlete_requests').select('id, trainer_id').eq('athlete_id', profile.id).eq('status', 'pending').maybeSingle();
      if (req?.trainer_id) {
        const { data: tp } = await supabase.from('profiles').select('id, full_name, bio, avatar_url').eq('id', req.trainer_id).single();
        setPendingRequest(tp ? { id: req.id, trainer: tp as TrainerInfo } : null);
      } else {
        setPendingRequest(null);
      }
    } finally {
      setTrainerLoading(false);
    }
  }, [profile]);

  useFocusEffect(useCallback(() => { fetchTrainerStatus(); }, [fetchTrainerStatus]));

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setBio((profile as any).bio ?? '');
      setHeightCm((profile as any).height_cm ? String((profile as any).height_cm) : '');
      setWeightKg((profile as any).weight_kg ? String((profile as any).weight_kg) : '');
      setNotes((profile as any).notes ?? '');
      setGoal((profile as any).goal ?? null);
      setExperienceLevel((profile as any).experience_level ?? null);
      setDaysPerWeek((profile as any).days_per_week ? String((profile as any).days_per_week) : '');
      setAboutMe((profile as any).about_me ?? '');
      setAvatarUrl(profile.avatar_url ?? null);
      setDisplayImage(localImageUriRef.current ?? profile.avatar_url ?? null);
    }
  }, [profile]);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showAlert({ title: 'Permesso negato', message: "Abilita l'accesso alla galleria nelle impostazioni." });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true,
    });
    if (result.canceled) return;
    if (!result.assets[0].base64) { showAlert({ title: 'Errore', message: "Impossibile leggere l'immagine." }); return; }
    setUploadingImage(true);
    const asset = result.assets[0];
    localImageUriRef.current = asset.uri;
    setDisplayImage(asset.uri);
    const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const fileName = `${profile!.auth_user_id}/avatar.${ext}`;
    const contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, decode(asset.base64!), { contentType, upsert: true });
    if (uploadError) { showAlert({ title: 'Errore upload', message: uploadError.message }); setUploadingImage(false); return; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const publicUrl = data.publicUrl.replace('/object/sign/', '/object/public/').split('?')[0];
    setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
    setUploadingImage(false);
  };

  const handleSave = async () => {
    if (!fullName.trim()) { showAlert({ title: 'Errore', message: 'Il nome non può essere vuoto.' }); return; }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: fullName.trim(), bio: bio.trim() || null,
      height_cm: heightCm ? parseFloat(heightCm) : null,
      weight_kg: weightKg ? parseFloat(weightKg) : null,
      notes: notes.trim() || null, goal: goal || null,
      experience_level: experienceLevel || null,
      days_per_week: daysPerWeek ? parseInt(daysPerWeek) : null,
      about_me: aboutMe.trim() || null, avatar_url: avatarUrl,
    }).eq('id', profile!.id);
    if (error) { showAlert({ title: 'Errore', message: error.message }); }
    else { await refetch(); showAlert({ title: 'Salvato', message: 'Profilo aggiornato!' }); }
    setSaving(false);
  };

  const handleRevokeRequest = () => {
    showAlert({
      title: 'Revoca richiesta',
      message: `Vuoi annullare la richiesta inviata a ${pendingRequest?.trainer.full_name}?`,
      buttons: [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Revoca', style: 'destructive', onPress: async () => {
          if (!pendingRequest) return;
          await supabase.from('trainer_athlete_requests').delete().eq('id', pendingRequest.id);
          setPendingRequest(null);
        }},
      ],
    });
  };

  const handleChangeTrainer = () => {
    showAlert({
      title: 'Cambia trainer',
      message: 'Cambiando trainer perderai tutte le schede di allenamento assegnate.\n\nVuoi continuare?',
      buttons: [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Continua', style: 'destructive', onPress: () => router.push('/(athlete)/find-trainer') },
      ],
    });
  };

  if (profileLoading) {
    return <View style={s.centered}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  const indicatorTranslate = tabIndicator.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, TAB_W, TAB_W * 2],
  });

  return (
    <View style={s.container}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backText}>‹ Indietro</Text>
        </TouchableOpacity>
        <View style={s.titleWrap} pointerEvents="none">
          <Text style={s.title}>Il mio profilo</Text>
        </View>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => router.push('/(athlete)/settings')}>
          <Text style={s.gearIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Avatar */}
      <View style={s.avatarSection}>
        <TouchableOpacity disabled={uploadingImage} onPress={() => { if (!displayImage) { handlePickImage(); return; } setViewingImage(true); }}>
          {uploadingImage ? (
            <View style={s.avatarPlaceholder}><ActivityIndicator color={colors.accent} /></View>
          ) : displayImage ? (
            <Image source={{ uri: displayImage }} style={s.avatar} contentFit="cover" transition={200} />
          ) : (
            <View style={s.avatarPlaceholder}>
              <Text style={s.avatarInitial}>{fullName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={s.avatarHint}>{displayImage ? 'Tocca per le opzioni' : 'Tocca per aggiungere foto'}</Text>
      </View>

      {/* Tab bar */}
      <View style={s.tabBar}>
        {TABS.map((tab, i) => (
          <TouchableOpacity key={tab} style={s.tabItem} onPress={() => goToTab(i)} activeOpacity={0.7}>
            <Animated.Text style={[
              s.tabText,
              activeTab === i && s.tabTextActive,
              { transform: [{ scale: tabScales[i] }, { translateY: tabTranslates[i] }] },
            ]}>
              {tab}
            </Animated.Text>
          </TouchableOpacity>
        ))}
        <Animated.View style={[s.tabIndicator, { transform: [{ translateX: indicatorTranslate }] }]} />
      </View>

      {/* Pages */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {/* PAGE 0 — Info */}
        <ScrollView style={s.page} contentContainerStyle={s.pageContent}>
          <View style={s.section}>
            <Text style={s.sectionTitle}>Dati personali</Text>
            <Text style={s.label}>Nome completo</Text>
            <TextInput style={s.input} value={fullName} onChangeText={setFullName} placeholder="Il tuo nome" placeholderTextColor={colors.textMuted} />
            <Text style={s.label}>Bio</Text>
            <TextInput style={[s.input, s.inputMultiline]} value={bio} onChangeText={setBio} placeholder="Raccontati in breve..." placeholderTextColor={colors.textMuted} multiline numberOfLines={3} />
            <View style={s.row}>
              <View style={s.rowItem}>
                <Text style={s.label}>Altezza (cm)</Text>
                <TextInput style={s.input} value={heightCm} onChangeText={setHeightCm} placeholder="175" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />
              </View>
              <View style={s.rowItem}>
                <Text style={s.label}>Peso (kg)</Text>
                <TextInput style={s.input} value={weightKg} onChangeText={setWeightKg} placeholder="80" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />
              </View>
            </View>
            <Text style={s.label}>Note personali</Text>
            <TextInput style={[s.input, s.inputMultiline]} value={notes} onChangeText={setNotes} placeholder="Infortuni, preferenze..." placeholderTextColor={colors.textMuted} multiline numberOfLines={3} />
          </View>

          <TouchableOpacity style={s.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveButtonText}>Salva</Text>}
          </TouchableOpacity>
        </ScrollView>

        {/* PAGE 1 — Obiettivi */}
        <ScrollView style={s.page} contentContainerStyle={s.pageContent}>
          <View style={s.section}>
            <Text style={s.sectionTitle}>Obiettivi per il Trainer</Text>

            <Text style={s.label}>Obiettivo principale</Text>
            <View style={s.optionRow}>
              {([
                { value: 'weight_loss', label: '⚖️ Dimagrimento' },
                { value: 'muscle_gain', label: '💪 Massa' },
                { value: 'strength', label: '🏋️ Forza' },
                { value: 'endurance', label: '🏃 Resistenza' },
                { value: 'wellness', label: '🧘 Benessere' },
              ] as const).map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[s.optionChip, goal === opt.value && s.optionChipActive]}
                  onPress={() => setGoal(goal === opt.value ? null : opt.value)}
                >
                  <Text style={[s.optionChipText, goal === opt.value && s.optionChipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Livello di esperienza</Text>
            <View style={s.optionRow}>
              {([
                { value: 'beginner', label: '🌱 Principiante' },
                { value: 'intermediate', label: '📈 Intermedio' },
                { value: 'advanced', label: '🔥 Avanzato' },
              ] as const).map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[s.optionChip, experienceLevel === opt.value && s.optionChipActive]}
                  onPress={() => setExperienceLevel(experienceLevel === opt.value ? null : opt.value)}
                >
                  <Text style={[s.optionChipText, experienceLevel === opt.value && s.optionChipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Giorni disponibili a settimana</Text>
            <View style={s.optionRow}>
              {['1','2','3','4','5','6','7'].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[s.dayChip, daysPerWeek === d && s.optionChipActive]}
                  onPress={() => setDaysPerWeek(daysPerWeek === d ? '' : d)}
                >
                  <Text style={[s.dayChipText, daysPerWeek === d && s.optionChipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Parlami un po' di te</Text>
            <TextInput
              style={[s.input, s.inputAboutMe]}
              value={aboutMe}
              onChangeText={setAboutMe}
              placeholder="Raccontami le tue esperienze, infortuni, aspettative..."
              placeholderTextColor={colors.textMuted}
              multiline numberOfLines={6}
            />
          </View>

          <TouchableOpacity style={s.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveButtonText}>Salva</Text>}
          </TouchableOpacity>
        </ScrollView>

        {/* PAGE 2 — Trainer */}
        <ScrollView style={s.page} contentContainerStyle={s.pageContent}>
          <View style={s.section}>
            <Text style={s.sectionTitle}>Il mio Trainer</Text>
            {trainerLoading ? (
              <ActivityIndicator color={colors.accent} style={{ marginVertical: 12 }} />
            ) : currentTrainer ? (
              <TouchableOpacity style={s.trainerCard} onPress={() => router.push({ pathname: '/(athlete)/trainer/[id]', params: { id: currentTrainer.id } })}>
                {currentTrainer.avatar_url ? (
                  <Image source={{ uri: currentTrainer.avatar_url }} style={s.trainerAvatar} contentFit="cover" />
                ) : (
                  <View style={s.trainerAvatarPlaceholder}>
                    <Text style={s.trainerAvatarInitial}>{currentTrainer.full_name.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={s.trainerName}>{currentTrainer.full_name}</Text>
                  {currentTrainer.bio ? <Text style={s.trainerBio} numberOfLines={2}>{currentTrainer.bio}</Text> : null}
                </View>
                <TouchableOpacity style={s.changeTrainerBtn} onPress={(e) => { e.stopPropagation?.(); handleChangeTrainer(); }}>
                  <Text style={s.changeTrainerText}>Cambia</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ) : pendingRequest ? (
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
              <TouchableOpacity style={s.findTrainerBtn} onPress={() => router.push('/(athlete)/find-trainer')}>
                <Text style={s.findTrainerText}>🔍  Trova un Trainer</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={s.logoutButton}
            onPress={() => showAlert({
              title: 'Disconnetti',
              message: 'Sei sicuro di voler uscire?',
              buttons: [
                { text: 'Annulla', style: 'cancel' },
                { text: 'Disconnetti', style: 'destructive', onPress: () => supabase.auth.signOut() },
              ],
            })}
          >
            <Text style={s.logoutButtonText}>Disconnetti</Text>
          </TouchableOpacity>
        </ScrollView>
      </ScrollView>

      {displayImage && (
        <PhotoModal
          visible={viewingImage}
          uri={displayImage}
          accentColor={colors.accent}
          onClose={() => setViewingImage(false)}
          onChange={() => { setViewingImage(false); handlePickImage(); }}
        />
      )}
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  centered: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 12 },
  backText: { color: c.accent, fontSize: 16 },
  titleWrap: { position: 'absolute', left: 0, right: 0 },
  title: { textAlign: 'center', fontSize: 20, fontWeight: '800', color: c.text },
  gearIcon: { fontSize: 22 },
  avatarSection: { alignItems: 'center', paddingVertical: 20 },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: c.accent },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.accentBorder },
  avatarInitial: { color: c.accent, fontSize: 36, fontWeight: '800' },
  avatarHint: { color: c.textMuted, fontSize: 12, marginTop: 6 },
  // Tab bar
  tabBar: { flexDirection: 'row', marginHorizontal: 24, backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.border, overflow: 'hidden', position: 'relative', marginBottom: 4 },
  tabItem: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '600', color: c.textMuted },
  tabTextActive: { color: c.accent, fontWeight: '800' },
  tabIndicator: { position: 'absolute', bottom: 0, height: 2, width: `${100 / 3}%` as any, backgroundColor: c.accent, borderRadius: 1 },
  // Pages
  page: { width: SW },
  pageContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 48 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: c.textSecondary, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 },
  label: { color: c.textSecondary, fontSize: 12, marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: c.surface, borderRadius: 10, padding: 14, color: c.text, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: c.border },
  inputMultiline: { height: 90, textAlignVertical: 'top' },
  inputAboutMe: { height: 130, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  optionChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  optionChipActive: { backgroundColor: c.accentBg, borderColor: c.accent },
  optionChipText: { color: c.textSecondary, fontSize: 13, fontWeight: '600' },
  optionChipTextActive: { color: c.accent },
  dayChip: { width: 38, height: 38, borderRadius: 19, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  dayChipText: { color: c.textSecondary, fontSize: 14, fontWeight: '700' },
  saveButton: { backgroundColor: c.accent, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  logoutButton: { marginTop: 16, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#ff4444' },
  logoutButtonText: { color: '#ff4444', fontSize: 15, fontWeight: '700' },
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
