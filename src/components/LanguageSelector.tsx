import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n, LANGUAGES, type Language } from '@/i18n';
import { useTheme, radius, spacing, shadow } from '@/theme';

/* ─── Modal de selección (compartido) ─── */
interface LanguageModalProps {
  visible: boolean;
  onClose: () => void;
}

export function LanguageModal({ visible, onClose }: LanguageModalProps) {
  const { colors } = useTheme();
  const { language, setLanguage, t } = useI18n();

  const select = (lang: Language) => {
    setLanguage(lang);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.bone3 }]} />
          <Text style={[styles.title, { color: colors.ink }]}>{t('idioma.titulo')}</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{t('idioma.descripcion')}</Text>
          {LANGUAGES.map((lang) => {
            const active = lang.code === language;
            return (
              <Pressable
                key={lang.code}
                onPress={() => select(lang.code)}
                style={({ pressed }) => [
                  styles.optionRow,
                  { borderColor: colors.bone3 },
                  (active || pressed) && { backgroundColor: colors.primaryTint },
                ]}
              >
                <Text style={styles.optionFlag}>{lang.flag}</Text>
                <Text style={[styles.optionLabel, { color: active ? colors.primary : colors.ink }]}>
                  {lang.label}
                </Text>
                {active ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ─── Botón compacto (para login) ─── */
export function LanguageButton() {
  const { colors } = useTheme();
  const { language } = useI18n();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === language)!;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        style={({ pressed }) => [
          styles.chip,
          { backgroundColor: colors.surface, borderColor: colors.bone3 },
          pressed && { opacity: 0.8 },
          shadow.card,
        ]}
      >
        <Ionicons name="globe-outline" size={15} color={colors.primary} />
        <Text style={[styles.chipLabel, { color: colors.ink }]}>{current.code.toUpperCase()}</Text>
        <Ionicons name="chevron-down" size={13} color={colors.muted} />
      </Pressable>
      <LanguageModal visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

/* ─── Hook para usar con SettingsRow en los perfiles ─── */
export function useLanguageLabel(): string {
  const { language } = useI18n();
  return LANGUAGES.find((l) => l.code === language)?.label ?? '';
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.huge,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginBottom: spacing.lg,
    marginTop: 2,
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
  optionFlag: { fontSize: 20 },
  optionLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  chipLabel: { fontSize: 12, fontWeight: '700' },
});
