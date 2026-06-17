import { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, TouchableOpacity, Animated
} from 'react-native';
import { ScalePressable } from '@/components/ScalePressable';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useTheme } from '@/context/ThemeContext';
import { useAlert } from '@/context/AlertContext';

const GOAL_LABELS: Record<string, string> = {
  weight_loss: '⚖️ Dimagrimento',
  muscle_gain: '💪 Massa muscolare',
  strength: '🏋️ Forza',
  endurance: '🏃 Resistenza',
  wellness: '🧘 Benessere',
};
const LEVEL_LABELS: Record<string, string> = {
  beginner: '🌱 Principiante',
  intermediate: '📈 Intermedio',
  advanced: '🔥 Avanzato',
};

type AthleteProfile = {
  id: string; full_name: string; avatar_url: string | null;
  bio: string | null; height_cm: number | null; weight_kg: number | null; notes: string | null;
  goal: string | null; experience_level: string | null; days_per_week: number | null; about_me: string | null;
};
type WorkoutPlan = { id: string; name: string; description: string | null; is_active: boolean; created_at: string };
type NutritionPlan = { id: string; plan_date: string; calories: number; carbs_g: number; protein_g: number; fat_g: number; notes: string | null };

export default function AthleteProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { showAlert } = useAlert();

  const [athlete, setAthlete] = useState<AthleteProfile | null>(null);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [nutrition, setNutrition] = useState<NutritionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const s = makeStyles(colors);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const section1Anim = useRef(new Animated.Value(0)).current;
  const section2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => { fetchAll(); }, [id]);

  useEffect(() => {
    if (!loading) {
      Animated.stagger(120, [
        Animated.timing(headerAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(section1Anim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(section2Anim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchAthlete(), fetchWorkoutPlans(), fetchNutrition()]);
    setLoading(false);
  };

  const fetchAthlete = async () => {
    const { data } = await supabase.rpc('get_athlete_profile', { p_athlete_id: id });
    if (data && data.length > 0) setAthlete(data[0]);
  };

  const fetchWorkoutPlans = async () => {
    const { data } = await supabase.from('workout_plans').select('*').eq('athlete_id', id).order('created_at', { ascending: false });
    setWorkoutPlans(data || []);
  };

  const fetchNutrition = async () => {
    const { data } = await supabase.from('nutrition_plans').select('*').eq('athlete_id', id).order('plan_date', { ascending: false }).limit(1).single();
    setNutrition(data);
  };

  const handleRemoveAthlete = () => {
    showAlert({
      title: 'Rimuovi atleta',
      message: `Vuoi rimuovere ${athlete?.full_name} dalla tua lista? Tutte le schede assegnate verranno eliminate.`,
      buttons: [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rimuovi', style: 'destructive',
          onPress: async () => {
            // 1. Elimina schede
            const { error: plansError } = await supabase
              .from('workout_plans')
              .delete()
              .eq('athlete_id', id);
            if (plansError) {
              showAlert({ title: 'Errore', message: `Eliminazione schede: ${plansError.message}` });
              return;
            }

            // 2. Rimuovi la relazione trainer-atleta
            const { error: relError } = await supabase
              .from('trainer_athlete')
              .delete()
              .eq('athlete_id', id);
            if (relError) {
              showAlert({ title: 'Errore', message: `Rimozione relazione: ${relError.message}` });
              return;
            }

            // 3. Pulisci le richieste storiche tra i due (così l'atleta può reinviarne una)
            await supabase
              .from('trainer_athlete_requests')
              .delete()
              .eq('athlete_id', id);

            router.back();
          },
        },
      ],
    });
  };

  const handleDeletePlan = (planId: string, planName: string) => {
    showAlert({
      title: 'Elimina scheda',
      message: `Vuoi eliminare "${planName}"? Questa azione non può essere annullata.`,
      buttons: [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina', style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('workout_plans').delete().eq('id', planId);
            if (error) showAlert({ title: 'Errore', message: error.message });
            else setWorkoutPlans(prev => prev.filter(p => p.id !== planId));
          },
        },
      ],
    });
  };

  if (loading) {
    return <View style={s.centered}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>

      <TouchableOpacity style={s.backButton} onPress={() => router.back()}>
        <Text style={s.backText}>‹ Dashboard</Text>
      </TouchableOpacity>

      <Animated.View style={[s.profileHeader, { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
        {athlete?.avatar_url ? (
          <Image source={{ uri: athlete.avatar_url }} style={s.avatar} contentFit="cover" transition={200} />
        ) : (
          <View style={s.avatarPlaceholder}>
            <Text style={s.avatarText}>{athlete?.full_name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={s.athleteName}>{athlete?.full_name}</Text>
        <Text style={s.athleteRole}>Atleta</Text>
        {athlete?.bio && <Text style={s.bio}>{athlete.bio}</Text>}
        {(athlete?.height_cm || athlete?.weight_kg) && (
          <View style={s.physicalRow}>
            {athlete?.height_cm && (
              <View style={s.physicalBadge}>
                <Text style={s.physicalValue}>{athlete.height_cm} cm</Text>
                <Text style={s.physicalLabel}>Altezza</Text>
              </View>
            )}
            {athlete?.weight_kg && (
              <View style={s.physicalBadge}>
                <Text style={s.physicalValue}>{athlete.weight_kg} kg</Text>
                <Text style={s.physicalLabel}>Peso</Text>
              </View>
            )}
          </View>
        )}
        {athlete?.notes && (
          <View style={s.notesCard}>
            <Text style={s.notesLabel}>📝 Note atleta</Text>
            <Text style={s.notesText}>{athlete.notes}</Text>
          </View>
        )}

        {(athlete?.goal || athlete?.experience_level || athlete?.days_per_week || athlete?.about_me) && (
          <View style={s.goalsCard}>
            <Text style={s.goalsTitle}>🎯 Obiettivi e contesto</Text>
            <View style={s.goalsBadgeRow}>
              {athlete.goal && (
                <View style={s.goalsBadge}>
                  <Text style={s.goalsBadgeText}>{GOAL_LABELS[athlete.goal] ?? athlete.goal}</Text>
                </View>
              )}
              {athlete.experience_level && (
                <View style={s.goalsBadge}>
                  <Text style={s.goalsBadgeText}>{LEVEL_LABELS[athlete.experience_level] ?? athlete.experience_level}</Text>
                </View>
              )}
              {athlete.days_per_week && (
                <View style={s.goalsBadge}>
                  <Text style={s.goalsBadgeText}>📅 {athlete.days_per_week}g/settimana</Text>
                </View>
              )}
            </View>
            {athlete.about_me && (
              <>
                <Text style={s.aboutMeLabel}>Parole dell'atleta</Text>
                <Text style={s.aboutMeText}>{athlete.about_me}</Text>
              </>
            )}
          </View>
        )}
      </Animated.View>

      <Animated.View style={{ opacity: section1Anim, transform: [{ translateY: section1Anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
      <View style={s.section}>
        <Text style={s.sectionTitle}>Piano alimentare</Text>
        {nutrition ? (
          <View style={s.nutritionCard}>
            <Text style={s.nutritionDate}>{new Date(nutrition.plan_date).toLocaleDateString('it-IT')}</Text>
            <View style={s.macroRow}>
              <MacroBox label="Calorie" value={`${nutrition.calories}`} unit="kcal" color="#E8533A" colors={colors} />
              <MacroBox label="Proteine" value={`${nutrition.protein_g}`} unit="g" color="#4CAF50" colors={colors} />
              <MacroBox label="Carbo" value={`${nutrition.carbs_g}`} unit="g" color="#2196F3" colors={colors} />
              <MacroBox label="Grassi" value={`${nutrition.fat_g}`} unit="g" color="#FF9800" colors={colors} />
            </View>
            {nutrition.notes && <Text style={s.nutritionNotes}>📝 {nutrition.notes}</Text>}
          </View>
        ) : (
          <Text style={s.emptyText}>Nessun piano alimentare ancora.</Text>
        )}
      </View>
      </Animated.View>

      <Animated.View style={{ opacity: section2Anim, transform: [{ translateY: section2Anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Schede allenamento</Text>
          <TouchableOpacity style={s.addButton} onPress={() => router.push({ pathname: '/(trainer)/workout/create', params: { athleteId: id } })}>
            <Text style={s.addButtonText}>+ Nuova</Text>
          </TouchableOpacity>
        </View>

        {workoutPlans.length === 0 ? (
          <Text style={s.emptyText}>Nessuna scheda ancora.</Text>
        ) : (
          workoutPlans.map((plan) => (
            <ScalePressable
              key={plan.id}
              style={s.planCard}
              onPress={() => router.push({ pathname: '/(trainer)/workout/[id]', params: { id: plan.id } })}
            >
              <View style={s.planCardTop}>
                <View style={s.planStatus}>
                  <View style={[s.statusDot, { backgroundColor: plan.is_active ? '#4CAF50' : colors.textMuted }]} />
                  <Text style={s.statusText}>{plan.is_active ? 'Attiva' : 'Inattiva'}</Text>
                </View>
                <TouchableOpacity style={s.trashButton} onPress={() => handleDeletePlan(plan.id, plan.name)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={s.trashIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
              <Text style={s.planName}>{plan.name}</Text>
              {plan.description && <Text style={s.planDesc}>{plan.description}</Text>}
              <View style={s.planBottom}>
                <Text style={s.planDate}>📅 {new Date(plan.created_at).toLocaleDateString('it-IT')}</Text>
                <Text style={s.chevron}>›</Text>
              </View>
            </ScalePressable>
          ))
        )}
      </View>

      <ScalePressable style={s.progressButton} onPress={() => router.push({ pathname: '/(trainer)/athlete/progress/[id]', params: { id } })}>
        <Text style={s.progressButtonText}>📈 Vedi progressi atleta</Text>
      </ScalePressable>

      <ScalePressable style={s.removeButton} onPress={handleRemoveAthlete}>
        <Text style={s.removeButtonText}>Rimuovi atleta</Text>
      </ScalePressable>
      </Animated.View>

    </ScrollView>
  );
}

function MacroBox({ label, value, unit, color, colors }: {
  label: string; value: string; unit: string; color: string; colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 10, padding: 12, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ fontSize: 18, fontWeight: '800', color }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>{unit}</Text>
      <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>{label}</Text>
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48 },
  centered: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
  backButton: { marginBottom: 24 },
  backText: { color: c.accent, fontSize: 16 },
  profileHeader: { alignItems: 'center', marginBottom: 36 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: c.accent, marginBottom: 12 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: c.accentBg, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: c.accent, fontSize: 32, fontWeight: '800' },
  athleteName: { color: c.text, fontSize: 22, fontWeight: '800' },
  athleteRole: { color: c.textSecondary, fontSize: 14, marginTop: 4 },
  bio: { color: c.techniqueText, fontSize: 14, textAlign: 'center', marginTop: 12, lineHeight: 20, paddingHorizontal: 16 },
  physicalRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  physicalBadge: { backgroundColor: c.surface, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: c.border },
  physicalValue: { color: c.accent, fontSize: 18, fontWeight: '800' },
  physicalLabel: { color: c.textMuted, fontSize: 11, marginTop: 2 },
  notesCard: { backgroundColor: c.surface, borderRadius: 10, padding: 14, marginTop: 16, width: '100%', borderWidth: 1, borderColor: c.border },
  notesLabel: { color: c.textSecondary, fontSize: 12, marginBottom: 6 },
  notesText: { color: c.techniqueText, fontSize: 14, lineHeight: 20 },
  goalsCard: { backgroundColor: c.surface, borderRadius: 10, padding: 14, marginTop: 12, width: '100%', borderWidth: 1, borderColor: c.accentBorder },
  goalsTitle: { color: c.accent, fontSize: 13, fontWeight: '700', marginBottom: 10 },
  goalsBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  goalsBadge: { backgroundColor: c.accentBg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  goalsBadgeText: { color: c.accent, fontSize: 13, fontWeight: '600' },
  aboutMeLabel: { color: c.textSecondary, fontSize: 12, marginBottom: 6 },
  aboutMeText: { color: c.techniqueText, fontSize: 14, lineHeight: 20 },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: c.text, marginBottom: 12 },
  nutritionCard: { backgroundColor: c.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: c.border },
  nutritionDate: { color: c.textSecondary, fontSize: 12, marginBottom: 12 },
  macroRow: { flexDirection: 'row', marginHorizontal: -4 },
  nutritionNotes: { color: c.textSecondary, fontSize: 13, marginTop: 12, fontStyle: 'italic' },
  emptyText: { color: c.textMuted, fontSize: 14 },
  addButton: { backgroundColor: c.accent, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  addButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  planCard: { backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: c.border },
  planCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  planStatus: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { color: c.textSecondary, fontSize: 12 },
  trashButton: { backgroundColor: c.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  trashIcon: { fontSize: 14 },
  planName: { color: c.text, fontSize: 16, fontWeight: '700' },
  planDesc: { color: c.textSecondary, fontSize: 13, marginTop: 4 },
  planBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  planDate: { color: c.textMuted, fontSize: 12 },
  chevron: { color: c.textSecondary, fontSize: 24 },
  progressButton: { backgroundColor: c.surface, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: c.border, marginTop: 8 },
  progressButtonText: { color: c.text, fontSize: 15, fontWeight: '600' },
  removeButton: { marginTop: 12, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#ff4444' },
  removeButtonText: { color: '#ff4444', fontSize: 15, fontWeight: '700' },
});
