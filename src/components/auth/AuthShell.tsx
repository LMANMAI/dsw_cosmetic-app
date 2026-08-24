import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, radius, spacing, shadow } from '@/theme';


interface AuthHeroProps {
  onBack?: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  height?: number;
}

export function AuthHero({ onBack, icon = 'sparkles', height = 220 }: AuthHeroProps) {
  const { colors } = useTheme();
  return (
    <LinearGradient
      colors={[colors.primaryTint, colors.bone]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, { height }]}
    >
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} style={[styles.backBtn, { backgroundColor: colors.surface }]}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
      ) : null}

      <View style={[styles.bubble, { top: 30, right: -20, width: 90, height: 90, backgroundColor: colors.surface }]} />
      <View style={[styles.bubble, { bottom: -10, left: 30, width: 60, height: 60, opacity: 0.5, backgroundColor: colors.surface }]} />

      <View style={[styles.heroIconWrap, { backgroundColor: colors.surface }]}>
        <Ionicons name={icon} size={44} color={colors.primary} />
      </View>
    </LinearGradient>
  );
}

export function AuthCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { colors } = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.surface }, style]}>{children}</View>;
}

interface AuthInputProps extends TextInputProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  showToggle?: boolean;
  onToggleSecure?: () => void;
  secureVisible?: boolean;
}

export function AuthInput({
  icon,
  showToggle,
  onToggleSecure,
  secureVisible,
  style,
  ...rest
}: AuthInputProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.inputWrap, { backgroundColor: colors.bone }]}>
      <Ionicons name={icon} size={18} color={colors.muted} style={{ marginRight: spacing.sm }} />
      <TextInput
        style={[styles.input, { color: colors.ink }, style]}
        placeholderTextColor={colors.muted}
        {...rest}
      />
      {showToggle ? (
        <Pressable onPress={onToggleSecure} hitSlop={10}>
          <Ionicons
            name={secureVisible ? 'eye-outline' : 'eye-off-outline'}
            size={18}
            color={colors.muted}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

export interface AuthSelectOption {
  label: string;
  value: string;
  emoji?: string;
}

interface AuthSelectProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  placeholder: string;
  value: string | null;
  options: AuthSelectOption[];
  onChange: (value: string) => void;
  title?: string;
  loading?: boolean;
}

export function AuthSelect({
  icon,
  placeholder,
  value,
  options,
  onChange,
  title,
  loading,
}: AuthSelectProps) {
  const { colors } = useTheme();
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value) ?? null;

  return (
    <>
      <Pressable
        onPress={() => !loading && setOpen(true)}
        style={[styles.inputWrap, { backgroundColor: colors.bone }]}
      >
        <Ionicons name={icon} size={18} color={colors.muted} style={{ marginRight: spacing.sm }} />
        <Text
          style={[
            styles.input,
            { color: selected ? colors.ink : colors.muted },
          ]}
          numberOfLines={1}
        >
          {selected ? `${selected.emoji ? `${selected.emoji} ` : ''}${selected.label}` : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.bone3 }]} />
            <Text style={[styles.modalTitle, { color: colors.ink }]}>{title ?? placeholder}</Text>
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {options.map((opt) => {
                const active = opt.value === value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.optionRow,
                      { borderColor: colors.bone3 },
                      (active || pressed) && { backgroundColor: colors.primaryTint },
                    ]}
                  >
                    {opt.emoji ? <Text style={styles.optionEmoji}>{opt.emoji}</Text> : null}
                    <Text
                      style={[
                        styles.optionLabel,
                        { color: active ? colors.primary : colors.ink },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {active ? (
                      <Ionicons name="checkmark" size={18} color={colors.primary} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

interface AuthMultiSelectProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  placeholder: string;
  values: string[];
  options: AuthSelectOption[];
  onChange: (values: string[]) => void;
  title?: string;
  loading?: boolean;
  doneLabel?: string;
}

/**
 * Igual que AuthSelect pero permite elegir varias opciones. Muestra las
 * seleccionadas como chips debajo del campo.
 */
export function AuthMultiSelect({
  icon,
  placeholder,
  values,
  options,
  onChange,
  title,
  loading,
  doneLabel = 'Listo',
}: AuthMultiSelectProps) {
  const { colors } = useTheme();
  const [open, setOpen] = React.useState(false);
  const seleccionadas = options.filter((o) => values.includes(o.value));

  const toggle = (value: string) => {
    onChange(
      values.includes(value) ? values.filter((v) => v !== value) : [...values, value],
    );
  };

  return (
    <>
      <Pressable
        onPress={() => !loading && setOpen(true)}
        style={[styles.inputWrap, { backgroundColor: colors.bone }, seleccionadas.length > 0 && { marginBottom: spacing.sm }]}
      >
        <Ionicons name={icon} size={18} color={colors.muted} style={{ marginRight: spacing.sm }} />
        <Text
          style={[styles.input, { color: seleccionadas.length ? colors.ink : colors.muted }]}
          numberOfLines={1}
        >
          {seleccionadas.length ? seleccionadas.map((o) => o.label).join(', ') : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>

      {seleccionadas.length > 0 ? (
        <View style={styles.chipsRow}>
          {seleccionadas.map((o) => (
            <Pressable
              key={o.value}
              onPress={() => toggle(o.value)}
              style={[styles.chip, { backgroundColor: colors.primaryTint }]}
            >
              <Text style={[styles.chipLabel, { color: colors.primary }]}>
                {o.emoji ? `${o.emoji} ` : ''}
                {o.label}
              </Text>
              <Ionicons name="close" size={14} color={colors.primary} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.bone3 }]} />
            <Text style={[styles.modalTitle, { color: colors.ink }]}>{title ?? placeholder}</Text>
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {options.map((opt) => {
                const active = values.includes(opt.value);
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => toggle(opt.value)}
                    style={({ pressed }) => [
                      styles.optionRow,
                      { borderColor: colors.bone3 },
                      (active || pressed) && { backgroundColor: colors.primaryTint },
                    ]}
                  >
                    {opt.emoji ? <Text style={styles.optionEmoji}>{opt.emoji}</Text> : null}
                    <Text
                      style={[styles.optionLabel, { color: active ? colors.primary : colors.ink }]}
                    >
                      {opt.label}
                    </Text>
                    <Ionicons
                      name={active ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={active ? colors.primary : colors.muted}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              onPress={() => setOpen(false)}
              style={[styles.doneBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.doneLabel, { color: colors.surface }]}>{doneLabel}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export function AuthDivider({ label = 'o continuá con' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.dividerRow}>
      <View style={[styles.dividerLine, { backgroundColor: colors.bone3 }]} />
      <Text style={[styles.dividerLabel, { color: colors.muted }]}>{label}</Text>
      <View style={[styles.dividerLine, { backgroundColor: colors.bone3 }]} />
    </View>
  );
}


interface SocialButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  iconRender: React.ReactNode;
}

export function SocialButton({ label, onPress, disabled, iconRender }: SocialButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.socialBtn,
        { backgroundColor: colors.surface, borderColor: colors.bone3 },
        disabled && { opacity: 0.5 },
        pressed && { opacity: 0.85 },
      ]}
    >
      {iconRender}
      <Text style={[styles.socialLabel, { color: colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

export function GoogleGlyph() {
  const { colors } = useTheme();
  return (
    <View style={[styles.googleGlyph, { backgroundColor: colors.surface }]}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#4285F4' }}>G</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  hero: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  backBtn: {
    position: 'absolute',
    top: 14,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.7,
  },
  heroIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  card: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.huge,
    marginTop: -28,
    flex: 1,
    ...shadow.raised,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: 4,
    marginBottom: spacing.md,
    minHeight: 52,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: spacing.md,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.huge,
    ...shadow.raised,
  },
  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.xs,
  },
  optionEmoji: { fontSize: 20 },
  optionLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  chipLabel: { fontSize: 13, fontWeight: '600' },
  doneBtn: {
    marginTop: spacing.md,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  doneLabel: { fontSize: 15, fontWeight: '700' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerLabel: {
    fontSize: 12,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    minHeight: 52,
  },
  socialLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  googleGlyph: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
