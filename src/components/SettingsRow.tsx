import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, radius, spacing } from '@/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface SettingsRowProps {
  icon: IoniconName;
  label: string;
  description?: string;
  value?: string;
  toggle?: boolean;
  onToggle?: (next: boolean) => void;
  onPress?: () => void;
  destructive?: boolean;
  isLast?: boolean;
}

export function SettingsRow({
  icon,
  label,
  description,
  value,
  toggle,
  onToggle,
  onPress,
  destructive,
  isLast,
}: SettingsRowProps) {
  const { colors } = useTheme();
  const labelColor = destructive ? colors.danger : colors.ink;
  const iconColor = destructive ? colors.danger : colors.primary;
  const isSwitch = typeof toggle === 'boolean';

  return (
    <Pressable
      onPress={isSwitch ? () => onToggle?.(!toggle) : onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.surfaceAlt },
        pressed && { backgroundColor: colors.surfaceAlt },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.primaryTint }, destructive && { backgroundColor: 'rgba(201,75,75,0.1)' }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
        {description ? <Text style={[styles.desc, { color: colors.muted }]}>{description}</Text> : null}
      </View>
      {isSwitch ? (
        <Switch
          value={toggle}
          onValueChange={onToggle}
          trackColor={{ false: colors.bone3, true: colors.primary }}
          thumbColor={colors.white}
        />
      ) : (
        <View style={styles.tail}>
          {value ? <Text style={[styles.valueText, { color: colors.muted }]}>{value}</Text> : null}
          {!destructive ? (
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

interface SettingsGroupProps {
  title?: string;
  children: React.ReactNode;
}

export function SettingsGroup({ title, children }: SettingsGroupProps) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: spacing.xl }}>
      {title ? <Text style={[styles.groupTitle, { color: colors.muted }]}>{title}</Text> : null}
      <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  groupCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 60,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 15, fontWeight: '600' },
  desc: { fontSize: 12, marginTop: 2 },
  tail: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  valueText: { fontSize: 13 },
});
