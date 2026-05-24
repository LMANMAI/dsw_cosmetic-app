import React from 'react';
import {
  Pressable,
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
