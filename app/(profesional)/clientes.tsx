import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Avatar } from '@/components/Avatar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { fichasService } from '@/services/fichas.service';
import { useSession } from '@/context/SessionContext';
import { useTranslation } from '@/i18n';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import type { ResumenCliente } from '@/types/models';
import { formatARS, formatFechaCorta } from '@/utils/format';

/**
 * Mis clientes: lista automática derivada de los turnos del profesional.
 * Tocar un cliente abre su ficha (contacto, notas, historial).
 */
export default function ClientesScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useSession();
  const profesionalId = user?.id ?? '';

  const [items, setItems] = useState<ResumenCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!profesionalId) return;
      setLoading(true);
      fichasService
        .listarClientes(profesionalId)
        .then(setItems)
        .finally(() => setLoading(false));
    }, [profesionalId]),
  );

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((c) => c.nombre.toLowerCase().includes(term));
  }, [items, q]);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xxl, paddingBottom: spacing.huge }}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.ink} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/(profesional)/nueva-ficha')}
            style={styles.addBtn}
          >
            <Ionicons name="person-add-outline" size={16} color={colors.primary} />
            <Text style={[styles.addLabel, { color: colors.primary }]}>
              {t('profesional.clientes.nuevaFicha')}
            </Text>
          </Pressable>
        </View>

        <ScreenHeader
          eyebrow={t('profesional.clientes.eyebrow')}
          title={t('profesional.clientes.titulo')}
          subtitle={t('profesional.clientes.subtitulo')}
        />

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t('profesional.clientes.buscarPlaceholder')}
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
        ) : filtrados.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={44} color={colors.muted} />
            <Text style={styles.emptyTitle}>
              {q ? t('profesional.clientes.sinResultados') : t('profesional.clientes.vacioTitulo')}
            </Text>
            {!q && (
              <Text style={styles.emptyMsg}>{t('profesional.clientes.vacioMsg')}</Text>
            )}
          </View>
        ) : (
          filtrados.map((c) => (
            <Pressable
              key={c.clienteId}
              onPress={() =>
                router.push({
                  pathname: '/(profesional)/ficha-cliente',
                  params: { clienteId: c.clienteId, nombre: c.nombre },
                })
              }
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
            >
              <Avatar nombre={c.nombre} size={44} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.nombre}>{c.nombre}</Text>
                <Text style={styles.meta}>
                  {c.esManual
                    ? t('profesional.clientes.fichaManual')
                    : t('profesional.clientes.resumen', {
                        turnos: c.cantTurnos,
                        ultimo: formatFechaCorta(c.ultimoTurno),
                      })}
                </Text>
                {c.totalGastado > 0 && (
                  <Text style={[styles.meta, { color: colors.primary, fontWeight: '600' }]}>
                    {t('profesional.clientes.totalGastado', { monto: formatARS(c.totalGastado) })}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    backBtn: { marginBottom: spacing.md, alignSelf: 'flex-start' },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.primaryTint,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.lg,
    },
    addLabel: { fontSize: 12, fontWeight: '600' },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.lg,
      marginTop: spacing.xl,
      marginBottom: spacing.lg,
    },
    searchInput: { flex: 1, paddingVertical: spacing.md, fontSize: 15, color: c.ink },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.xl,
      padding: spacing.lg,
      marginBottom: spacing.sm,
    },
    nombre: { fontSize: 15, fontWeight: '700', color: c.ink },
    meta: { fontSize: 12, color: c.muted },
    empty: { alignItems: 'center', marginTop: spacing.xxxl, gap: spacing.sm },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: c.ink },
    emptyMsg: {
      fontSize: 13,
      color: c.muted,
      textAlign: 'center',
      lineHeight: 19,
      paddingHorizontal: spacing.xl,
    },
  });
