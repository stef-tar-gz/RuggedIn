import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export type ExerciseInfo = {
  name: string;
  muscle_group?: string;
  equipment?: string;
  difficulty?: string;
  description?: string | null;
  video_url?: string | null;
};

type Props = {
  visible: boolean;
  exercise: ExerciseInfo | null;
  onClose: () => void;
};

const difficultyColor = (d?: string) =>
  d === 'principiante' ? '#4CAF50' : d === 'avanzato' ? '#E8533A' : '#FF9800';

export default function ExerciseInfoModal({ visible, exercise, onClose }: Props) {
  const { colors } = useTheme();
  const s = makeStyles(colors);
  if (!exercise) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={s.card} activeOpacity={1}>
          <View style={s.header}>
            <Text style={s.title} numberOfLines={2}>{exercise.name}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={s.badges}>
            {exercise.muscle_group && (
              <View style={s.badge}><Text style={s.badgeText}>{exercise.muscle_group}</Text></View>
            )}
            {exercise.equipment && (
              <View style={s.badge}><Text style={s.badgeText}>{exercise.equipment}</Text></View>
            )}
            {exercise.difficulty && (
              <View style={[s.badge, { borderColor: difficultyColor(exercise.difficulty) }]}>
                <Text style={[s.badgeText, { color: difficultyColor(exercise.difficulty) }]}>{exercise.difficulty}</Text>
              </View>
            )}
          </View>

          {exercise.description ? (
            <ScrollView style={s.descriptionScroll} showsVerticalScrollIndicator={false}>
              <Text style={s.descriptionLabel}>Esecuzione</Text>
              <Text style={s.description}>{exercise.description}</Text>
            </ScrollView>
          ) : (
            <Text style={s.noDescription}>Nessuna descrizione disponibile.</Text>
          )}

          {exercise.video_url ? (
            <TouchableOpacity style={s.videoBtn} onPress={() => Linking.openURL(exercise.video_url!)}>
              <Text style={s.videoBtnText}>▶  Guarda il video</Text>
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { backgroundColor: c.surface, borderRadius: 16, padding: 20, width: '100%', maxHeight: '70%', borderWidth: 1, borderColor: c.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: c.text, marginRight: 12 },
  closeBtn: { color: c.textMuted, fontSize: 18 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  badge: { borderRadius: 6, borderWidth: 1, borderColor: c.border, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: c.textSecondary, fontSize: 12, fontWeight: '600' },
  descriptionLabel: { color: c.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  descriptionScroll: { maxHeight: 200 },
  description: { color: c.text, fontSize: 14, lineHeight: 22 },
  noDescription: { color: c.textMuted, fontSize: 14, fontStyle: 'italic' },
  videoBtn: { marginTop: 16, backgroundColor: c.accentBg, borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: c.accentBorder },
  videoBtnText: { color: c.accent, fontSize: 14, fontWeight: '700' },
});
