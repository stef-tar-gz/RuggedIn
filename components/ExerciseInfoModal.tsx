import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

export type ExerciseInfo = {
  name: string;
  muscle_group?: string;
  equipment?: string;
  difficulty?: string;
  description?: string | null;
  video_url?: string | null;
  image_url?: string | null;
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

          {/* Banner immagine con X sovrapposta */}
          {exercise.image_url ? (
            <View>
              <Image source={{ uri: exercise.image_url }} style={s.bannerImage} contentFit="cover" />
              <TouchableOpacity style={s.closeBtnOverlay} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Header: titolo + chiudi (solo senza immagine) */}
          <View style={s.header}>
            <Text style={s.title} numberOfLines={2}>{exercise.name}</Text>
            {!exercise.image_url && (
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Badge: muscolo, attrezzatura, difficoltà */}
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

          {/* Descrizione */}
          {exercise.description ? (
            <ScrollView style={s.descriptionScroll} showsVerticalScrollIndicator={false} contentContainerStyle={s.descriptionContent}>
              <Text style={s.descriptionLabel}>Esecuzione</Text>
              <Text style={s.description}>{exercise.description}</Text>
            </ScrollView>
          ) : (
            <Text style={s.noDescription}>Nessuna descrizione disponibile.</Text>
          )}

          {/* Bottone video */}
          {exercise.video_url ? (
            <TouchableOpacity style={s.videoBtn} onPress={() => Linking.openURL(exercise.video_url!)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="caret-forward" size={14} color={colors.accent} />
                <Text style={s.videoBtnText}>Guarda il video</Text>
              </View>
            </TouchableOpacity>
          ) : <View style={s.bottomPad} />}

        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000bb',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 20,
    overflow: 'hidden',
    width: '100%',
    maxHeight: '75%',
    borderWidth: 1,
    borderColor: c.border,
  },
  bannerImage: {
    width: '100%',
    height: 180,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 19,
    fontWeight: '800',
    color: c.text,
    marginRight: 16,
    lineHeight: 26,
  },
  closeBtn: {
    color: c.textMuted,
    fontSize: 18,
    marginTop: 2,
  },
  closeBtnOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnOverlayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  badge: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    color: c.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  descriptionScroll: {
    maxHeight: 200,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  descriptionContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  descriptionLabel: {
    color: c.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  description: {
    color: c.text,
    fontSize: 14,
    lineHeight: 22,
  },
  noDescription: {
    color: c.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  videoBtn: {
    margin: 16,
    backgroundColor: c.accentBg,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.accentBorder,
  },
  videoBtnText: {
    color: c.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  bottomPad: {
    height: 8,
  },
});
