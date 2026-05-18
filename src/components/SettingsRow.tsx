import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';

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
  const labelColor = destructive ? colors.danger : colors.ink;
  const iconColor = destructive ? colors.danger : colors.rose;
  const isSwitch = typeof toggle === 'boolean';

  return (
    <Pressable
      onPress={isSwitch ? () => onToggle?.(!toggle) : onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowBorder,
        pressed && { backgroundColor: colors.bone2 },
      ]}
    >
      <View style={[styles.iconWrap, destructive && { backgroundColor: 'rgba(201,75,75,0.1)' }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
        {description ? <Text style={styles.desc}>{description}</Text> : null}
      </View>
      {isSwitch ? (
        <Switch
          value={toggle}
          onValueChange={onToggle}
          trackColor={{ false: colors.bone3, true: colors.rose }}
          thumbColor={colors.white}
        />
      ) : (
        <View style={styles.tail}>
          {value ? <Text style={styles.valueText}>{value}</Text> : null}
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
  return (
    <View style={{ marginTop: spacing.xl }}>
      {title ? <Text style={styles.groupTitle}>{title}</Text> : null}
      <View style={styles.groupCard}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.muted,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  groupCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
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
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.bone2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.roseTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 15, fontWeight: '600' },
  desc: { fontSize: 12, color: colors.muted, marginTop: 2 },
  tail: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  valueText: { fontSize: 13, color: colors.muted },
});
