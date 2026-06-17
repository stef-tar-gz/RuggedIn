import { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, ScrollView, TextInput,
  TouchableOpacity, Switch, Animated, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';

export type Exercise = {
  catalog_exercise_id: string | null;
  name: string;
  muscle_group: string;
  sets: string; reps: string; rest_seconds: string; notes: string;
  has_dropset: boolean; dropset_percentage: string; dropset_sets: string;
  has_backoff: boolean; backoff_percentage: string; backoff_sets: string;
  has_stripping: boolean; stripping_steps: string; stripping_percentage: string; stripping_reps_increase: string;
  day_index: number;
};

type Props = {
  visible: boolean;
  exercise: Exercise | null;
  index: number | null;
  onUpdate: (index: number, field: keyof Exercise, value: any) => void;
  onClose: () => void;
  onOpenPicker: (index: number) => void;
};

const { height: SH } = Dimensions.get('window');
const VIGNETTE = 180;

export default function ExerciseCardModal({ visible, exercise, index, onUpdate, onClose, onOpenPicker }: Props) {
  const { colors } = useTheme();
  const s = makeStyles(colors);

  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 120, friction: 10, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.88);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!exercise || index === null) return null;

  const update = (field: keyof Exercise, value: any) => onUpdate(index, field, value);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacityAnim }]}>
        <BlurView style={StyleSheet.absoluteFill} intensity={60} tint="dark" />
        <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent']} style={[s.vignette, { top: 0, height: VIGNETTE }]} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={[s.vignette, { bottom: 0, height: VIGNETTE }]} />
        <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent']} style={[s.vignetteH, { left: 0 }]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={[s.vignetteH, { right: 0 }]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} />

        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <KeyboardAvoidingView style={s.centerWrap} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} pointerEvents="box-none">
          <Animated.View style={[s.card, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>{exercise.name || 'Esercizio'}</Text>
              <TouchableOpacity onPress={onClose} style={s.doneBtn}>
                <Text style={s.doneBtnText}>Fatto ✓</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Catalogo */}
              <TouchableOpacity style={[s.pickerBtn, exercise.name ? s.pickerBtnFilled : null]} onPress={() => onOpenPicker(index)}>
                {exercise.name ? (
                  <View style={{ flex: 1 }}>
                    <Text style={s.pickerBtnName}>{exercise.name}</Text>
                    <Text style={s.pickerBtnMuscle}>{exercise.muscle_group}</Text>
                  </View>
                ) : (
                  <Text style={s.pickerBtnPlaceholder}>Scegli dal catalogo...</Text>
                )}
                <Text style={s.pickerBtnIcon}>📋</Text>
              </TouchableOpacity>

              {/* Serie / Reps / Riposo */}
              <View style={s.row}>
                <View style={s.rowItem}>
                  <Text style={s.rowLabel}>Serie</Text>
                  <TextInput style={s.inputSmall} value={exercise.sets} onChangeText={v => update('sets', v)} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                </View>
                <View style={s.rowItem}>
                  <Text style={s.rowLabel}>Reps</Text>
                  <TextInput style={s.inputSmall} value={exercise.reps} onChangeText={v => update('reps', v)} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                </View>
                <View style={s.rowItem}>
                  <Text style={s.rowLabel}>Riposo (s)</Text>
                  <TextInput style={s.inputSmall} value={exercise.rest_seconds} onChangeText={v => update('rest_seconds', v)} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                </View>
              </View>

              {/* ── DROPSET ── */}
              <View style={s.toggleRow}>
                <View>
                  <Text style={s.toggleLabel}>Dropset</Text>
                  <Text style={s.toggleSub}>Riduzione peso a cedimento</Text>
                </View>
                <Switch value={exercise.has_dropset} onValueChange={v => update('has_dropset', v)} trackColor={{ false: colors.border, true: '#E8533A55' }} thumbColor={exercise.has_dropset ? colors.accent : colors.textMuted} />
              </View>
              {exercise.has_dropset && (
                <View style={s.subSection}>
                  <View style={s.row}>
                    <View style={s.rowItem}>
                      <Text style={s.rowLabel}>Serie dropset</Text>
                      <TextInput style={s.inputSmall} value={exercise.dropset_sets} onChangeText={v => update('dropset_sets', v)} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                    </View>
                    <View style={s.rowItem}>
                      <Text style={s.rowLabel}>Riduzione %</Text>
                      <View style={s.inputWithUnit}>
                        <TextInput style={[s.inputSmall, { flex: 1 }]} value={exercise.dropset_percentage} onChangeText={v => update('dropset_percentage', v)} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />
                        <Text style={s.unit}>%</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* ── BACKOFF ── */}
              <View style={s.toggleRow}>
                <View>
                  <Text style={s.toggleLabel}>Backoff</Text>
                  <Text style={s.toggleSub}>Serie finale a volume ridotto</Text>
                </View>
                <Switch value={exercise.has_backoff} onValueChange={v => update('has_backoff', v)} trackColor={{ false: colors.border, true: '#E8533A55' }} thumbColor={exercise.has_backoff ? colors.accent : colors.textMuted} />
              </View>
              {exercise.has_backoff && (
                <View style={s.subSection}>
                  <View style={s.row}>
                    <View style={s.rowItem}>
                      <Text style={s.rowLabel}>Serie backoff</Text>
                      <TextInput style={s.inputSmall} value={exercise.backoff_sets} onChangeText={v => update('backoff_sets', v)} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                    </View>
                    <View style={s.rowItem}>
                      <Text style={s.rowLabel}>Riduzione %</Text>
                      <View style={s.inputWithUnit}>
                        <TextInput style={[s.inputSmall, { flex: 1 }]} value={exercise.backoff_percentage} onChangeText={v => update('backoff_percentage', v)} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />
                        <Text style={s.unit}>%</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* ── STRIPPING ── */}
              <View style={s.toggleRow}>
                <View>
                  <Text style={s.toggleLabel}>Stripping</Text>
                  <Text style={s.toggleSub}>Scalini progressivi di carico</Text>
                </View>
                <Switch value={exercise.has_stripping} onValueChange={v => update('has_stripping', v)} trackColor={{ false: colors.border, true: '#9C27B055' }} thumbColor={exercise.has_stripping ? '#9C27B0' : colors.textMuted} />
              </View>
              {exercise.has_stripping && (
                <View style={s.subSection}>
                  <View style={s.row}>
                    <View style={s.rowItem}>
                      <Text style={s.rowLabel}>N° scalini</Text>
                      <TextInput style={s.inputSmall} value={exercise.stripping_steps} onChangeText={v => update('stripping_steps', v)} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
                    </View>
                    <View style={s.rowItem}>
                      <Text style={s.rowLabel}>Riduzione %</Text>
                      <View style={s.inputWithUnit}>
                        <TextInput style={[s.inputSmall, { flex: 1 }]} value={exercise.stripping_percentage} onChangeText={v => update('stripping_percentage', v)} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />
                        <Text style={s.unit}>%</Text>
                      </View>
                    </View>
                    <View style={s.rowItem}>
                      <Text style={s.rowLabel}>+Reps/step</Text>
                      <TextInput style={s.inputSmall} value={exercise.stripping_reps_increase} onChangeText={v => update('stripping_reps_increase', v)} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.textMuted} />
                    </View>
                  </View>
                  <Text style={s.strippingPreview}>
                    {(() => {
                      const steps = parseInt(exercise.stripping_steps) || 2;
                      const pct = parseInt(exercise.stripping_percentage) || 20;
                      const repsInc = parseInt(exercise.stripping_reps_increase) || 0;
                      const baseReps = parseInt(exercise.reps) || 10;
                      return Array.from({ length: steps }, (_, i) => {
                        const r = baseReps + repsInc * (i + 1);
                        return `Step ${i + 1}: -${pct * (i + 1)}%${repsInc > 0 ? ` · ${r} reps` : ''}`;
                      }).join('  →  ');
                    })()}
                  </Text>
                </View>
              )}

              {/* Note */}
              <TextInput
                style={s.input}
                placeholder="Note (opzionale)"
                placeholderTextColor={colors.textMuted}
                value={exercise.notes}
                onChangeText={v => update('notes', v)}
                multiline
              />
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const makeStyles = (c: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  vignette: { position: 'absolute', left: 0, right: 0 },
  vignetteH: { position: 'absolute', top: 0, bottom: 0, width: VIGNETTE },
  centerWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  card: {
    backgroundColor: c.surfaceElevated, borderRadius: 20, padding: 20,
    maxHeight: SH * 0.78, borderWidth: 1, borderColor: c.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 24, elevation: 24,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  cardTitle: { color: c.text, fontSize: 16, fontWeight: '800', flex: 1, marginRight: 12 },
  doneBtn: { backgroundColor: c.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  doneBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: c.border, borderStyle: 'dashed' },
  pickerBtnFilled: { borderStyle: 'solid', borderColor: c.accentBorder, backgroundColor: c.accentBg },
  pickerBtnPlaceholder: { flex: 1, color: c.textMuted, fontSize: 14 },
  pickerBtnName: { color: c.text, fontSize: 15, fontWeight: '700' },
  pickerBtnMuscle: { color: c.textSecondary, fontSize: 12, marginTop: 2 },
  pickerBtnIcon: { fontSize: 18, marginLeft: 8 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  rowItem: { flex: 1 },
  rowLabel: { color: c.textMuted, fontSize: 11, marginBottom: 4 },
  inputSmall: { backgroundColor: c.surface, borderRadius: 8, padding: 10, color: c.text, fontSize: 15, borderWidth: 1, borderColor: c.border, textAlign: 'center' },
  inputWithUnit: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  unit: { color: c.accent, fontSize: 15, fontWeight: '700' },
  input: { backgroundColor: c.surface, borderRadius: 10, padding: 14, color: c.text, fontSize: 15, marginBottom: 10, borderWidth: 1, borderColor: c.border, minHeight: 60, textAlignVertical: 'top' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: c.surface, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: c.border },
  toggleLabel: { color: c.text, fontSize: 14, fontWeight: '600' },
  toggleSub: { color: c.textMuted, fontSize: 11, marginTop: 2 },
  subSection: { backgroundColor: c.surface, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: c.border },
  strippingPreview: { color: c.textMuted, fontSize: 11, fontStyle: 'italic', marginTop: 4, lineHeight: 16 },
});
