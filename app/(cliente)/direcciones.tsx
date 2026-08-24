import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/Button';
import { DireccionAutocomplete, type DireccionSeleccionada } from '@/components/DireccionAutocomplete';
import { useSession } from '@/context/SessionContext';
import { useTranslation } from '@/i18n';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import type { Direccion } from '@/types/models';
import { confirm } from '@/utils/confirm';

const ICONO_POR_ETIQUETA: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  casa: 'home-outline',
  trabajo: 'briefcase-outline',
};

function iconoDe(etiqueta: string): React.ComponentProps<typeof Ionicons>['name'] {
  return ICONO_POR_ETIQUETA[etiqueta.trim().toLowerCase()] ?? 'location-outline';
}

export default function DireccionesScreen() {
  const { user, updateUser } = useSession();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const ETIQUETAS_RAPIDAS = [
    t('cliente.direcciones.etiquetaCasa'),
    t('cliente.direcciones.etiquetaTrabajo'),
    t('cliente.direcciones.etiquetaOtro'),
  ];

  const direcciones = user?.direcciones ?? [];

  // Estado del formulario (alta o edición)
  const [formVisible, setFormVisible] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [etiqueta, setEtiqueta] = useState('');
  const [notas, setNotas] = useState('');
  const [ubicacion, setUbicacion] = useState<DireccionSeleccionada | null>(null);
  const [saving, setSaving] = useState(false);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const abrirAlta = () => {
    setEditandoId(null);
    setEtiqueta('');
    setNotas('');
    setUbicacion(null);
    setFormVisible(true);
  };

  const abrirEdicion = (d: Direccion) => {
    setEditandoId(d.id);
    setEtiqueta(d.etiqueta);
    setNotas(d.notas ?? '');
    setUbicacion({
      direccion: d.direccion,
      ciudad: d.ciudad,
      latitud: d.latitud ?? 0,
      longitud: d.longitud ?? 0,
    });
    setFormVisible(true);
  };

  const cerrarForm = () => {
    setFormVisible(false);
    setEditandoId(null);
  };

  const guardar = async () => {
    if (!ubicacion) {
      Alert.alert(t('cliente.direcciones.faltaDireccionTitulo'), t('cliente.direcciones.faltaDireccionMsg'));
      return;
    }
    if (!etiqueta.trim()) {
      Alert.alert(t('cliente.direcciones.faltaEtiquetaTitulo'), t('cliente.direcciones.faltaEtiquetaMsg'));
      return;
    }
    setSaving(true);
    try {
      const nueva: Direccion = {
        id: editandoId ?? Crypto.randomUUID(),
        etiqueta: etiqueta.trim(),
        direccion: ubicacion.direccion,
        ciudad: ubicacion.ciudad,
        latitud: ubicacion.latitud || undefined,
        longitud: ubicacion.longitud || undefined,
        notas: notas.trim() || undefined,
      };
      const lista = editandoId
        ? direcciones.map((d) => (d.id === editandoId ? nueva : d))
        : [...direcciones, nueva];
      await updateUser({ direcciones: lista });
      cerrarForm();
    } catch (err: any) {
      Alert.alert(t('comun.error'), err.message ?? t('cliente.direcciones.errorGuardarMsg'));
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (d: Direccion) => {
    const ok = await confirm({
      title: t('cliente.direcciones.eliminarTitulo'),
      message: t('cliente.direcciones.eliminarMsg', { etiqueta: d.etiqueta, direccion: d.direccion, ciudad: d.ciudad }),
      confirmLabel: t('comun.eliminar'),
      cancelLabel: t('comun.cancelar'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await updateUser({ direcciones: direcciones.filter((x) => x.id !== d.id) });
    } catch (err: any) {
      Alert.alert(t('comun.error'), err.message ?? t('cliente.direcciones.errorEliminarMsg'));
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color={colors.ink} />
          </Pressable>
          <ScreenHeader
            eyebrow={t('perfil.compartido.tuCuenta')}
            title={t('perfil.cliente.direcciones')}
            subtitle={t('perfil.cliente.direccionesDesc')}
          />

          {/* Lista de direcciones */}
          {direcciones.length === 0 && !formVisible ? (
            <View style={styles.emptyBox}>
              <Ionicons name="location-outline" size={32} color={colors.muted} />
              <Text style={styles.emptyText}>{t('cliente.direcciones.vacio')}</Text>
            </View>
          ) : null}

          {direcciones.map((d) => (
            <View key={d.id} style={styles.card}>
              <View style={styles.cardIcon}>
                <Ionicons name={iconoDe(d.etiqueta)} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{d.etiqueta}</Text>
                <Text style={styles.cardLine}>
                  {d.direccion}, {d.ciudad}
                </Text>
                {d.notas ? <Text style={styles.cardNotas}>{d.notas}</Text> : null}
              </View>
              <View style={styles.cardActions}>
                <Pressable onPress={() => abrirEdicion(d)} hitSlop={8} style={styles.actionBtn}>
                  <Ionicons name="pencil-outline" size={18} color={colors.ink} />
                </Pressable>
                <Pressable onPress={() => eliminar(d)} hitSlop={8} style={styles.actionBtn}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          ))}

          {/* Formulario de alta / edición */}
          {formVisible ? (
            <View style={styles.formBox}>
              <Text style={styles.formTitle}>
                {editandoId ? t('cliente.direcciones.editarTitulo') : t('cliente.direcciones.nuevaTitulo')}
              </Text>

              <Text style={styles.label}>{t('cliente.direcciones.etiqueta')}</Text>
              <View style={styles.chipRow}>
                {ETIQUETAS_RAPIDAS.map((opt) => {
                  const activa = etiqueta.toLowerCase() === opt.toLowerCase();
                  return (
                    <Pressable
                      key={opt}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: activa ? colors.primary : colors.surface,
                          borderColor: activa ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setEtiqueta(opt)}
                    >
                      <Text
                        style={{
                          color: activa ? colors.white : colors.ink,
                          fontWeight: '600',
                          fontSize: 13,
                        }}
                      >
                        {opt}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput
                style={styles.input}
                value={etiqueta}
                onChangeText={setEtiqueta}
                placeholder={t('cliente.direcciones.etiquetaPlaceholder')}
                placeholderTextColor={colors.muted}
              />

              <Text style={styles.label}>{t('cliente.direcciones.direccion')}</Text>
              {ubicacion ? (
                <View style={styles.direccionActual}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.direccionText}>
                      {ubicacion.direccion}, {ubicacion.ciudad}
                    </Text>
                  </View>
                  <Pressable onPress={() => setUbicacion(null)} hitSlop={8}>
                    <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>
                      {t('cliente.direcciones.cambiar')}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <DireccionAutocomplete
                  onSelect={setUbicacion}
                  placeholder={t('cliente.direcciones.buscaPlaceholder')}
                />
              )}

              <Text style={styles.label}>{t('cliente.direcciones.notas')}</Text>
              <TextInput
                style={styles.input}
                value={notas}
                onChangeText={setNotas}
                placeholder={t('cliente.direcciones.notasPlaceholder')}
                placeholderTextColor={colors.muted}
              />

              <View style={styles.formButtons}>
                <Button
                  label={t('comun.cancelar')}
                  variant="secondary"
                  onPress={cerrarForm}
                  style={{ flex: 1 }}
                />
                <Button
                  label={editandoId ? t('comun.guardar') : t('cliente.direcciones.agregar')}
                  onPress={guardar}
                  loading={saving}
                  disabled={saving}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          ) : (
            <Button
              label={t('cliente.direcciones.agregarDireccion')}
              onPress={abrirAlta}
              fullWidth
              style={{ marginTop: spacing.xl }}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    scroll: { padding: spacing.xxl, paddingBottom: spacing.huge },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: spacing.md,
    },
    emptyBox: {
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.xxl,
      marginTop: spacing.lg,
    },
    emptyText: { color: c.muted, fontSize: 14, textAlign: 'center' },
    card: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.lg,
      marginTop: spacing.md,
    },
    cardIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: c.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: { fontSize: 15, fontWeight: '700', color: c.ink },
    cardLine: { fontSize: 13, color: c.muted, marginTop: 2 },
    cardNotas: { fontSize: 12, color: c.muted, marginTop: 2, fontStyle: 'italic' },
    cardActions: { flexDirection: 'row', gap: spacing.sm },
    actionBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    formBox: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.xl,
      marginTop: spacing.xl,
    },
    formTitle: { fontSize: 16, fontWeight: '700', color: c.ink },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: c.ink,
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
    },
    chipRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    chip: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: 1,
    },
    input: {
      backgroundColor: c.background,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: 15,
      color: c.ink,
    },
    direccionActual: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.background,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.lg,
      gap: spacing.md,
    },
    direccionText: { fontSize: 14, lineHeight: 20, color: c.ink },
    formButtons: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.xl,
    },
  });
