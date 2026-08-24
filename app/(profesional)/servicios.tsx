import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/Button';
import { useSession } from '@/context/SessionContext';
import { catalogoService } from '@/services/catalogo.service';
import { serviciosService } from '@/services/servicios.service';
import { configService } from '@/services/config.service';
import { useTranslation } from '@/i18n';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import type { CategoriaSlug, Categoria, ServicioCatalogo, ServicioProfesional } from '@/types/models';
import { COMISION_PLATAFORMA } from '@/types/models';
import { formatARS } from '@/utils/format';

/* ─── Tipos locales ─── */

type Paso = 'lista' | 'elegir_categoria' | 'elegir_servicio' | 'configurar';

interface DraftServicio {
  catalogoId: string;
  nombre: string;
  duracionEstimadaMin: number;
  categoria: CategoriaSlug;
  categoriaEmoji: string;
}

/* ─── Desglose de comisión ─── */

/**
 * Muestra, a partir del precio ingresado, cuánto se lleva la plataforma en
 * comisión y cuánto recibe el profesional. La tasa (fracción 0-1) es la
 * comisión efectiva del profesional, leída de Firestore vía configService.
 * No se renderiza si el precio aún no es válido.
 */
function DesgloseComision({ precioStr, tasaComision }: { precioStr: string; tasaComision: number }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const precio = Number(precioStr.replace(/\D/g, ''));
  if (!precio || precio <= 0) return null;

  const comision = Math.round(precio * tasaComision);
  const neto = precio - comision;
  const pct = Math.round(tasaComision * 100);

  return (
    <View style={[desgloseStyles.box, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <View style={desgloseStyles.row}>
        <Text style={[desgloseStyles.label, { color: colors.muted }]}>
          {t('profesional.servicios.comisionLabel', { pct })}
        </Text>
        <Text style={[desgloseStyles.comision, { color: colors.danger }]}>−{formatARS(comision)}</Text>
      </View>
      <View style={[desgloseStyles.row, desgloseStyles.rowNeto, { borderTopColor: colors.border }]}>
        <Text style={[desgloseStyles.recibisLabel, { color: colors.ink }]}>
          {t('profesional.servicios.recibisLabel')}
        </Text>
        <Text style={[desgloseStyles.neto, { color: colors.success }]}>{formatARS(neto)}</Text>
      </View>
      <Text style={[desgloseStyles.hint, { color: colors.muted }]}>
        {t('profesional.servicios.comisionHint')}
      </Text>
    </View>
  );
}

const desgloseStyles = StyleSheet.create({
  box: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginTop: -spacing.sm,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowNeto: { borderTopWidth: 1, paddingTop: spacing.sm },
  label: { fontSize: 13 },
  comision: { fontSize: 14, fontWeight: '600' },
  recibisLabel: { fontSize: 15, fontWeight: '700' },
  neto: { fontSize: 17, fontWeight: '800' },
  hint: { fontSize: 11, lineHeight: 15, marginTop: spacing.xs },
});

/* ─── Pantalla ─── */

export default function ServiciosScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { user } = useSession();
  const router = useRouter();
  const profesionalId = user?.id ?? '';

  // Estado principal
  const [servicios, setServicios] = useState<ServicioProfesional[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Comisión efectiva del profesional (fracción 0-1) leída de Firestore.
  // Arranca en el fallback global y se actualiza al montar.
  const [tasaComision, setTasaComision] = useState(COMISION_PLATAFORMA);

  // Catálogo
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [catalogoFiltrado, setCatalogoFiltrado] = useState<ServicioCatalogo[]>([]);

  // Wizard de agregar
  const [paso, setPaso] = useState<Paso>('lista');
  const [categoriaElegida, setCategoriaElegida] = useState<Categoria | null>(null);
  const [draft, setDraft] = useState<DraftServicio | null>(null);
  const [precio, setPrecio] = useState('');
  const [duracion, setDuracion] = useState('');

  // Edición
  const [editando, setEditando] = useState<ServicioProfesional | null>(null);
  const [editPrecio, setEditPrecio] = useState('');
  const [editDuracion, setEditDuracion] = useState('');

  const cargar = useCallback(async () => {
    if (!profesionalId) return;
    setLoading(true);
    try {
      const [svcs, cats] = await Promise.all([
        serviciosService.listar(profesionalId),
        catalogoService.listarCategorias(),
      ]);
      setServicios(svcs);
      setCategorias(cats);
    } finally {
      setLoading(false);
    }
  }, [profesionalId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  // Carga la comisión efectiva del profesional una vez.
  useEffect(() => {
    if (!profesionalId) return;
    let vigente = true;
    configService.comisionPara(profesionalId).then((tasa) => {
      if (vigente) setTasaComision(tasa);
    });
    return () => { vigente = false; };
  }, [profesionalId]);

  /* ── Helpers de navegación del wizard ── */

  const iniciarAgregado = () => setPaso('elegir_categoria');

  const elegirCategoria = async (cat: Categoria) => {
    setCategoriaElegida(cat);
    setPaso('elegir_servicio');
    const items = await catalogoService.listarServicios(cat.slug);
    // Filtrar los que el profesional ya tiene
    const yaAgregados = new Set(servicios.map((s) => s.catalogoId));
    setCatalogoFiltrado(items.filter((i) => !yaAgregados.has(i.id)));
  };

  const elegirServicio = (svc: ServicioCatalogo) => {
    setDraft({
      catalogoId: svc.id,
      nombre: svc.nombre,
      duracionEstimadaMin: svc.duracionEstimadaMin,
      categoria: svc.categoria,
      categoriaEmoji: categorias.find((c) => c.slug === svc.categoria)?.emoji ?? '✂️',
    });
    setPrecio('');
    setDuracion(String(svc.duracionEstimadaMin));
    setPaso('configurar');
  };

  const cancelar = () => {
    setPaso('lista');
    setCategoriaElegida(null);
    setDraft(null);
    setPrecio('');
    setDuracion('');
  };

  /* ── Guardar nuevo servicio ── */

  const guardar = async () => {
    if (!draft) return;
    const p = Number(precio.replace(/\D/g, ''));
    const d = Number(duracion);
    if (!p || p <= 0) {
      Alert.alert(t('profesional.servicios.precioInvalidoTitulo'), t('profesional.servicios.precioInvalidoMsg'));
      return;
    }
    if (!d || d <= 0) {
      Alert.alert(t('profesional.servicios.duracionInvalidaTitulo'), t('profesional.servicios.duracionInvalidaMsg'));
      return;
    }
    setSaving(true);
    try {
      await serviciosService.agregar(profesionalId, {
        catalogoId: draft.catalogoId,
        nombre: draft.nombre,
        precio: p,
        duracionMin: d,
        categoria: draft.categoria,
      });
      await cargar();
      cancelar();
    } finally {
      setSaving(false);
    }
  };

  /* ── Editar servicio ── */

  const abrirEdicion = (svc: ServicioProfesional) => {
    setEditando(svc);
    setEditPrecio(String(svc.precio));
    setEditDuracion(String(svc.duracionMin));
  };

  const guardarEdicion = async () => {
    if (!editando) return;
    const p = Number(editPrecio.replace(/\D/g, ''));
    const d = Number(editDuracion);
    if (!p || p <= 0 || !d || d <= 0) {
      Alert.alert(t('profesional.servicios.datosInvalidosTitulo'), t('profesional.servicios.datosInvalidosMsg'));
      return;
    }
    setSaving(true);
    try {
      await serviciosService.editar(editando.id, { precio: p, duracionMin: d });
      await cargar();
      setEditando(null);
    } finally {
      setSaving(false);
    }
  };

  /* ── Eliminar servicio ── */

  const confirmarEliminacion = (svc: ServicioProfesional) => {
    Alert.alert(
      t('profesional.servicios.eliminarTitulo'),
      t('profesional.servicios.eliminarMsg', { nombre: svc.nombre }),
      [
        { text: t('comun.cancelar'), style: 'cancel' },
        {
          text: t('comun.eliminar'),
          style: 'destructive',
          onPress: async () => {
            await serviciosService.eliminar(svc.id);
            await cargar();
          },
        },
      ],
    );
  };

  const styles = useMemo(() => makeStyles(colors), [colors]);

  /* ─── Render por paso ─── */

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  // ── Paso: elegir categoría ──
  if (paso === 'elegir_categoria') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.huge }}>
          <View style={styles.headerRow}>
            <Pressable onPress={cancelar} hitSlop={12}>
              <Ionicons name="arrow-back" size={24} color={colors.ink} />
            </Pressable>
          </View>
          <View style={styles.content}>
            <ScreenHeader eyebrow={t('profesional.servicios.agregarEyebrow')} title={t('profesional.servicios.queCategoria')} />
            <View style={styles.grid}>
              {categorias.map((cat) => (
                <Pressable
                  key={cat.slug}
                  onPress={() => elegirCategoria(cat)}
                  style={({ pressed }) => [
                    styles.catCard,
                    { borderColor: colors.border, backgroundColor: pressed ? colors.primaryTint : colors.surface },
                  ]}
                >
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.catNombre, { color: colors.ink }]}>{t(`categorias.${cat.slug}`)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Paso: elegir servicio del catálogo ──
  if (paso === 'elegir_servicio') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.huge }}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => setPaso('elegir_categoria')} hitSlop={12}>
              <Ionicons name="arrow-back" size={24} color={colors.ink} />
            </Pressable>
          </View>
          <View style={styles.content}>
            <ScreenHeader
              eyebrow={`${categoriaElegida?.emoji} ${categoriaElegida ? t(`categorias.${categoriaElegida.slug}`) : ''}`}
              title={t('profesional.servicios.elegiServicio')}
            />
            {catalogoFiltrado.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={[styles.emptyTxt, { color: colors.muted }]}>
                  {t('profesional.servicios.yaAgregasteTodos')}
                </Text>
              </View>
            ) : (
              catalogoFiltrado.map((svc) => (
                <Pressable
                  key={svc.id}
                  onPress={() => elegirServicio(svc)}
                  style={({ pressed }) => [
                    styles.catalogoRow,
                    {
                      borderColor: colors.border,
                      backgroundColor: pressed ? colors.primaryTint : colors.surface,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.catalogoNombre, { color: colors.ink }]}>{svc.nombre}</Text>
                    <Text style={[styles.catalogoMeta, { color: colors.muted }]}>
                      {t('profesional.servicios.minSugeridos', { min: svc.duracionEstimadaMin })}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </Pressable>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Paso: configurar precio y duración ──
  if (paso === 'configurar' && draft) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
            <View style={styles.headerRow}>
              <Pressable onPress={() => setPaso('elegir_servicio')} hitSlop={12}>
                <Ionicons name="arrow-back" size={24} color={colors.ink} />
              </Pressable>
            </View>
            <View style={styles.content}>
              <ScreenHeader
                eyebrow={`${draft.categoriaEmoji} ${categoriaElegida ? t(`categorias.${categoriaElegida.slug}`) : ''}`}
                title={draft.nombre}
                subtitle={t('profesional.servicios.configuraSubtitulo')}
              />

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.muted }]}>{t('profesional.servicios.precioLabel')}</Text>
                <TextInput
                  style={[styles.input, { color: colors.ink, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={precio}
                  onChangeText={setPrecio}
                  placeholder={t('profesional.servicios.precioPlaceholder')}
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                  autoFocus
                />
              </View>

              <DesgloseComision precioStr={precio} tasaComision={tasaComision} />

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.muted }]}>
                  {t('profesional.servicios.duracionLabel')}
                </Text>
                <TextInput
                  style={[styles.input, { color: colors.ink, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={duracion}
                  onChangeText={setDuracion}
                  placeholder={String(draft.duracionEstimadaMin)}
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                />
                <Text style={[styles.inputHint, { color: colors.muted }]}>
                  {t('profesional.servicios.catalogoSugiere', { min: draft.duracionEstimadaMin })}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.bottomBar}>
            <Button
              label={saving ? t('profesional.servicios.guardando') : t('profesional.servicios.agregarServicio')}
              onPress={guardar}
              loading={saving}
              fullWidth
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Modal de edición ──
  if (editando) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
            <View style={styles.headerRow}>
              <Pressable onPress={() => setEditando(null)} hitSlop={12}>
                <Ionicons name="arrow-back" size={24} color={colors.ink} />
              </Pressable>
            </View>
            <View style={styles.content}>
              <ScreenHeader
                eyebrow={t('profesional.servicios.editarEyebrow')}
                title={editando.nombre}
              />

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.muted }]}>{t('profesional.servicios.precioLabel')}</Text>
                <TextInput
                  style={[styles.input, { color: colors.ink, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={editPrecio}
                  onChangeText={setEditPrecio}
                  keyboardType="numeric"
                  autoFocus
                />
              </View>

              <DesgloseComision precioStr={editPrecio} tasaComision={tasaComision} />

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.muted }]}>{t('profesional.servicios.duracionLabel')}</Text>
                <TextInput
                  style={[styles.input, { color: colors.ink, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={editDuracion}
                  onChangeText={setEditDuracion}
                  keyboardType="numeric"
                />
              </View>

              <Pressable
                onPress={() => {
                  setEditando(null);
                  confirmarEliminacion(editando);
                }}
                style={styles.deleteLink}
              >
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text style={[styles.deleteLinkTxt, { color: colors.danger }]}>
                  {t('profesional.servicios.eliminarEste')}
                </Text>
              </Pressable>
            </View>
          </ScrollView>

          <View style={styles.bottomBar}>
            <Button
              label={saving ? t('profesional.servicios.guardando') : t('profesional.servicios.guardarCambios')}
              onPress={guardarEdicion}
              loading={saving}
              fullWidth
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Vista principal: lista de servicios ──
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.navigate('/(profesional)/perfil')} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.ink} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <ScreenHeader
            eyebrow={t('profesional.servicios.eyebrow')}
            title={t('profesional.servicios.titulo')}
            subtitle={t('profesional.servicios.subtitulo')}
          />

          {servicios.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="cut-outline" size={48} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.ink }]}>
                {t('profesional.servicios.vacioTitulo')}
              </Text>
              <Text style={[styles.emptyTxt, { color: colors.muted }]}>
                {t('profesional.servicios.vacioMsg')}
              </Text>
            </View>
          ) : (
            <View style={styles.listaServicios}>
              {servicios.map((svc) => {
                const emoji = categorias.find((c) => c.slug === svc.categoria)?.emoji ?? '✂️';
                return (
                  <Pressable
                    key={svc.id}
                    onPress={() => abrirEdicion(svc)}
                    style={({ pressed }) => [
                      styles.svcCard,
                      {
                        borderColor: colors.border,
                        backgroundColor: pressed ? colors.primaryTint : colors.surface,
                      },
                    ]}
                  >
                    <View style={[styles.svcEmoji, { backgroundColor: colors.primaryTint }]}>
                      <Text style={{ fontSize: 20 }}>{emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.svcNombre, { color: colors.ink }]}>{svc.nombre}</Text>
                      <Text style={[styles.svcMeta, { color: colors.muted }]}>
                        {t('profesional.servicios.min', { min: svc.duracionMin })}
                      </Text>
                    </View>
                    <Text style={[styles.svcPrecio, { color: colors.primary }]}>
                      {formatARS(svc.precio)}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          label={t('profesional.servicios.agregarServicio')}
          onPress={iniciarAgregado}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

/* ─── Estilos ─── */

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xxl,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    content: { paddingHorizontal: spacing.xxl },

    // Categorías
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    catCard: {
      width: '47%',
      borderRadius: radius.xl,
      borderWidth: 1,
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.sm,
    },
    catEmoji: { fontSize: 32 },
    catNombre: { fontSize: 13, fontWeight: '600', textAlign: 'center' },

    // Catálogo
    catalogoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1,
      marginBottom: spacing.sm,
    },
    catalogoNombre: { fontSize: 15, fontWeight: '600' },
    catalogoMeta: { fontSize: 12, marginTop: 2 },

    // Configurar
    inputGroup: { marginBottom: spacing.xl },
    inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: spacing.sm },
    input: {
      borderWidth: 1,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: 18,
      fontWeight: '600',
    },
    inputHint: { fontSize: 12, marginTop: spacing.xs },

    // Lista
    listaServicios: { gap: spacing.sm },
    svcCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: radius.xl,
      borderWidth: 1,
      padding: spacing.lg,
    },
    svcEmoji: {
      width: 44,
      height: 44,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    svcNombre: { fontSize: 15, fontWeight: '600' },
    svcMeta: { fontSize: 12, marginTop: 2 },
    svcPrecio: { fontSize: 16, fontWeight: '700' },

    // Empty
    emptyBox: {
      alignItems: 'center',
      paddingVertical: spacing.xxxl,
      gap: spacing.md,
    },
    emptyTitle: { fontSize: 17, fontWeight: '700' },
    emptyTxt: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

    // Editar
    deleteLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xxl,
      alignSelf: 'center',
    },
    deleteLinkTxt: { fontSize: 14, fontWeight: '600' },

    bottomBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.background,
    },
  });
