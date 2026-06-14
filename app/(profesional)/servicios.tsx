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
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import type { CategoriaSlug, Categoria, ServicioCatalogo, ServicioProfesional } from '@/types/models';
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

/* ─── Pantalla ─── */

export default function ServiciosScreen() {
  const { colors } = useTheme();
  const { user } = useSession();
  const router = useRouter();
  const profesionalId = user?.id ?? '';

  // Estado principal
  const [servicios, setServicios] = useState<ServicioProfesional[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      Alert.alert('Precio inválido', 'Ingresá un precio mayor a 0.');
      return;
    }
    if (!d || d <= 0) {
      Alert.alert('Duración inválida', 'Ingresá una duración en minutos.');
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
      Alert.alert('Datos inválidos', 'Revisá el precio y la duración.');
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
      'Eliminar servicio',
      `¿Eliminar "${svc.nombre}" de tu catálogo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
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
            <ScreenHeader eyebrow="Agregar servicio" title="¿En qué categoría?" />
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
                  <Text style={[styles.catNombre, { color: colors.ink }]}>{cat.nombre}</Text>
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
              eyebrow={`${categoriaElegida?.emoji} ${categoriaElegida?.nombre}`}
              title="Elegí el servicio"
            />
            {catalogoFiltrado.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={[styles.emptyTxt, { color: colors.muted }]}>
                  Ya agregaste todos los servicios de esta categoría.
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
                      {svc.duracionEstimadaMin} min sugeridos
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
                eyebrow={`${draft.categoriaEmoji} ${categoriaElegida?.nombre}`}
                title={draft.nombre}
                subtitle="Configurá el precio y la duración para tu agenda."
              />

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.muted }]}>Precio ($)</Text>
                <TextInput
                  style={[styles.input, { color: colors.ink, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={precio}
                  onChangeText={setPrecio}
                  placeholder="Ej: 5000"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                  autoFocus
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.muted }]}>
                  Duración (minutos)
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
                  Catálogo sugiere {draft.duracionEstimadaMin} min
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.bottomBar}>
            <Button
              label={saving ? 'Guardando...' : 'Agregar servicio'}
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
                eyebrow="Editar servicio"
                title={editando.nombre}
              />

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.muted }]}>Precio ($)</Text>
                <TextInput
                  style={[styles.input, { color: colors.ink, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={editPrecio}
                  onChangeText={setEditPrecio}
                  keyboardType="numeric"
                  autoFocus
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.muted }]}>Duración (minutos)</Text>
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
                  Eliminar este servicio
                </Text>
              </Pressable>
            </View>
          </ScrollView>

          <View style={styles.bottomBar}>
            <Button
              label={saving ? 'Guardando...' : 'Guardar cambios'}
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
            eyebrow="Mi catálogo"
            title="Servicios y precios"
            subtitle="Los clientes verán estos servicios al visitar tu perfil."
          />

          {servicios.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="cut-outline" size={48} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.ink }]}>
                Todavía no cargaste servicios
              </Text>
              <Text style={[styles.emptyTxt, { color: colors.muted }]}>
                Agregá los servicios que ofrecés con su precio y duración.
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
                        {svc.duracionMin} min
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
          label="Agregar servicio"
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
