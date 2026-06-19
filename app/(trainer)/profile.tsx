import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Dimensions, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
const TABS = ['Info', 'Atleti', 'Catalogo'] as const;

type Athlete = { id: string; full_name: string; athlete_id: string };

export default function TrainerProfileScreen() {
  const { profile, loading: profileLoading, refetch } = useProfile();
  const { colors } = useTheme();
  const router = useRouter();
  const { showAlert } = useAlert();
  const s = makeStyles(colors);

  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [notes, setNotes] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayImage, setDisplayImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const localImageUriRef = useRef<string | null>(null);
  const [viewingImage, setViewingImage] = useState(false);

  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [athletesLoading, setAthletesLoading] = useState(false);

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
    setActiveTab(index); animateToTab(index);
  };

  const handleScroll = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SW);
    if (index !== activeTab) { setActiveTab(index); animateToTab(index); }
  };

  const fetchAthletes = useCallback(async () => {
    if (!profile) return;
    setAthletesLoading(true);
    const { data } = await supabase.rpc('get_my_athletes');
    setAthletes(data ?? []);
    setAthletesLoading(false);
  }, [profile]);

  useFocusEffect(useCallback(() => { fetchAthletes(); }, [fetchAthletes]));

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setBio((profile as any).bio ?? '');
      setNotes((profile as any).notes ?? '');
      setInstagramHandle((profile as any).instagram_handle ?? '');
      setAvatarUrl(profile.avatar_url ?? null);
      setDisplayImage(localImageUriRef.current ?? profile.avatar_url ?? null);
    }
  }, [profile]);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { showAlert({ title: 'Permesso negato', message: "Abilita l'accesso alla galleria nelle impostazioni." }); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7, base64: true });
    if (result.canceled) return;
    if (!result.assets[0].base64) { showAlert({ title: 'Errore', message: "Impossibile leggere l'immagine." }); return; }
    setUploadingImage(true);
    const asset = result.assets[0];
    localImageUriRef.current = asset.uri; setDisplayImage(asset.uri);
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
      full_name: fullName.trim(), bio: bio.trim() || null, notes: notes.trim() || null,
      instagram_handle: instagramHandle.trim().replace('@', '') || null, avatar_url: avatarUrl,
    }).eq('id', profile!.id);
    if (error) { showAlert({ title: 'Errore', message: error.message }); }
    else { await refetch(); showAlert({ title: 'Salvato', message: 'Profilo aggiornato!' }); }
    setSaving(false);
  };

  if (profileLoading) {
    return <View style={s.centered}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  const indicatorTranslate = tabIndicator.interpolate({ inputRange: [0, 1, 2], outputRange: [0, TAB_W, TAB_W * 2] });

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={{flexDirection:'row',alignItems:'center',gap:4}} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.accent} />
          <Text style={s.backText}>Dashboard</Text>
        </TouchableOpacity>
        <View style={s.titleWrap} pointerEvents="none">
          <Text style={s.title}>Il mio profilo</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(trainer)/settings')}>
          <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
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
            <Animated.Text style={[s.tabText, activeTab === i && s.tabTextActive, { transform: [{ scale: tabScales[i] }, { translateY: tabTranslates[i] }] }]}>
              {tab}
            </Animated.Text>
          </TouchableOpacity>
        ))}
        <Animated.View style={[s.tabIndicator, { transform: [{ translateX: indicatorTranslate }] }]} />
      </View>

      {/* Pages */}
      <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={handleScroll} scrollEventThrottle={16} style={{ flex: 1 }}>
        {/* PAGE 0 — Info */}
        <ScrollView style={s.page} contentContainerStyle={s.pageContent} showsVerticalScrollIndicator={false}>
          <Text style={s.sectionLabel}>DATI PERSONALI</Text>

          <Text style={s.fieldLabel}>Nome completo</Text>
          <TextInput style={s.input} value={fullName} onChangeText={setFullName} placeholder="Il tuo nome" placeholderTextColor={colors.textMuted} />

          <Text style={s.fieldLabel}>Bio</Text>
          <TextInput style={[s.input, s.inputMultiline]} value={bio} onChangeText={setBio} placeholder="Descrivi la tua esperienza come trainer..." placeholderTextColor={colors.textMuted} multiline numberOfLines={3} />

          <Text style={s.fieldLabel}>Specializzazioni / Certificazioni</Text>
          <TextInput style={[s.input, s.inputMultiline]} value={notes} onChangeText={setNotes} placeholder="Es. ISSA Certified, specializzato in powerlifting..." placeholderTextColor={colors.textMuted} multiline numberOfLines={3} />

          <Text style={s.fieldLabel}>Instagram</Text>
          <TextInput style={s.input} value={instagramHandle} onChangeText={setInstagramHandle} placeholder="@tuonomeutente" placeholderTextColor={colors.textMuted} autoCapitalize="none" autoCorrect={false} />

          <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Salva modifiche</Text>}
          </TouchableOpacity>
        </ScrollView>

        {/* PAGE 1 — Atleti */}
        <ScrollView style={s.page} contentContainerStyle={s.pageContent} showsVerticalScrollIndicator={false}>
          <Text style={s.sectionLabel}>I MIEI ATLETI</Text>
          {athletesLoading ? (
            <ActivityIndicator color={colors.accent} style={{ marginVertical: 20 }} />
          ) : athletes.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="people-outline" size={40} color={colors.textMuted} />
              <Text style={s.emptyTitle}>Nessun atleta ancora</Text>
              <Text style={s.emptySub}>Accetta le richieste dal dashboard</Text>
            </View>
          ) : (
            athletes.map((item) => (
              <TouchableOpacity key={item.athlete_id} style={s.card} onPress={() => router.push({ pathname: '/(trainer)/athlete/[id]', params: { id: item.athlete_id } })} activeOpacity={0.75}>
                <View style={s.cardAvatar}>
                  <Text style={s.cardAvatarText}>{item.full_name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardName}>{item.full_name}</Text>
                  <Text style={s.cardSub}>Tocca per vedere il profilo</Text>
                </View>
                <Text style={s.chevron}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* PAGE 2 — Catalogo */}
        <ScrollView style={s.page} contentContainerStyle={s.pageContent} showsVerticalScrollIndicator={false}>
          <Text style={s.sectionLabel}>STRUMENTI</Text>
          <TouchableOpacity style={s.card} onPress={() => router.push('/(trainer)/exercises')} activeOpacity={0.75}>
            <Ionicons name="barbell-outline" size={22} color={colors.textSecondary} style={{ marginRight: 14 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.cardName}>I miei esercizi</Text>
              <Text style={s.cardSub}>Gestisci il catalogo esercizi custom</Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>
        </ScrollView>
      </ScrollView>

      {displayImage && (
        <PhotoModal visible={viewingImage} uri={displayImage} accentColor={colors.accent} onClose={() => setViewingImage(false)} onChange={() => { setViewingImage(false); handlePickImage(); }} />
      )}
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  centered: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  backText: { color: c.accent, fontSize: 16, fontWeight: '600' },
  titleWrap: { position: 'absolute', left: 0, right: 0 },
  title: { textAlign: 'center', fontSize: 18, fontWeight: '800', color: c.text },
  gearIcon: { fontSize: 22 },
  avatarSection: { alignItems: 'center', paddingVertical: 16 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: c.accent },
  avatarPlaceholder: { width: 96, height: 96, borderRadius: 48, backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: c.accentBorder },
  avatarInitial: { color: c.accent, fontSize: 36, fontWeight: '800' },
  avatarHint: { color: c.textMuted, fontSize: 12, marginTop: 6 },
  tabBar: { flexDirection: 'row', marginHorizontal: 24, backgroundColor: c.surface, borderRadius: 14, borderWidth: 1, borderColor: c.border, overflow: 'hidden', position: 'relative', marginBottom: 4 },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '600', color: c.textMuted },
  tabTextActive: { color: c.accent, fontWeight: '800' },
  tabIndicator: { position: 'absolute', bottom: 0, height: 2, width: `${100 / 3}%` as any, backgroundColor: c.accent, borderRadius: 1 },
  page: { width: SW },
  pageContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 60 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: c.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: c.textMuted, letterSpacing: 0.5, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: c.surfaceElevated, borderRadius: 14, height: 52, paddingHorizontal: 16, color: c.text, fontSize: 15, borderWidth: 1, borderColor: c.border },
  inputMultiline: { height: 90, paddingTop: 14, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: c.accent, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: c.text },
  emptySub: { fontSize: 14, color: c.textSecondary },
  card: {
    backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border,
    padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3,
  },
  cardAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  cardAvatarText: { color: c.accent, fontSize: 18, fontWeight: '800' },
  cardName: { color: c.text, fontSize: 16, fontWeight: '700' },
  cardSub: { color: c.textSecondary, fontSize: 13, marginTop: 2 },
  chevron: { color: c.textMuted, fontSize: 24 },
  navIcon: { fontSize: 22, marginRight: 14 },
});
