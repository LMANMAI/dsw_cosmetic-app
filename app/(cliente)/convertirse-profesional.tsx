import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { AuthInput } from '@/components/auth/AuthShell';
import { DireccionAutocomplete, type DireccionSeleccionada } from '@/components/DireccionAutocomplete';
import { useSession } from '@/context/SessionContext';
import { catalogoService } from '@/services/catalogo.service';
import { serviciosService } from '@/services/servicios.service';
import { disponibilidadService } from '@/services/disponibilidad.service';
import { uploadImage } from '@/services/upload.service';
import { useTranslation, type TranslateFn } from '@/i18n';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import type {
  Categoria,
  CategoriaSlug,
  Franja,
  PerfilProfesionalSignup,
  ServicioCatalogo,
} from '@/types/models';

/* ─── Constantes ─── */

const TOTAL_PASOS = 3;

const MODALIDADES = [
  { id: 'salon' as const, emoji: '\u{1F3E0}', labelKey: 'auth.signup.modalidadSalon' },
  { id: 'domicilio' as const, emoji: '\u{1F697}', labelKey: 'auth.signup.modalidadDomicilio' },
  { id: 'ambos' as const, emoji: '✨', labelKey: 'auth.signup.modalidadAmbos' },
];

// Orden Lunes→Domingo (0 = domingo, como en comun.dias)
const DIAS_SEMANA = [1, 2, 3, 4, 5, 6, 0] as const;

const HORAS_OPCIONES = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

const GRUPOS_HORARIOS = [
  { labelKey: 'profesional.horarios.grupoMadrugada', desde: 0, hasta: 6 },
  { labelKey: 'profesional.horarios.grupoManana', desde: 6, hasta: 12 },
  { labelKey: 'profesional.horarios.grupoTarde', desde: 12, hasta: 18 },
  { labelKey: 'profesional.horarios.grupoNoche', desde: 18, hasta: 24 },
] as const;

const FRANJA_DEFAULT: Franja = { horaInicio: '09:00', horaFin: '18:00' };

/* ─── Tipos locales ─── */

interface ServicioElegido {
  catalogoId: string;
  nombre: string;
  categoria: CategoriaSlug;
  duracionMin: number;
  precio: string; // string porque viene de un TextInput
}

type AgendaState = Record<number, { activo: boolean; franja: Franja }>;

const agendaInicial = (): AgendaState => {
  const state: AgendaState = {};
  DIAS_SEMANA.forEach((d) => {
    // Lunes a viernes activos por defecto: es el caso más común
    state[d] = { activo: d >= 1 && d <= 5, franja: { ...FRANJA_DEFAULT } };
  });
  return state;
};

/* ─── Selector de hora (mismo patrón que la pantalla de horarios) ─── */

function HoraPicker({
  label,
  value,
  onSelect,
  colors,
  t,
}: {
  label: string;
  value: string;
  onSelect: (h: string) => void;
  colors: ThemeColors;
  t: TranslateFn;
}) {
  const mostrarHorasDelGrupo = (desde: number, hasta: number) => {
    const horas = HORAS_OPCIONES.filter((h) => {
      const [hh] = h.split(':').map(Number);
      return hh >= desde && hh < hasta;
    });
    Alert.alert(label, t('profesional.horarios.seleccionaHorario'), [
      ...horas.map((h) => ({ text: h, onPress: () => onSelect(h) })),
      { text: t('comun.cancelar'), style: 'cancel' as const },
    ]);
  };

  return (
    <Pressable
      onPress={() =>
        Alert.alert(label, t('profesional.horarios.elegiFranjaDia'), [
          ...GRUPOS_HORARIOS.map((g) => ({
            text: t(g.labelKey),
            onPress: () => mostrarHorasDelGrupo(g.desde, g.hasta),
          })),
          { text: t('comun.cancelar'), style: 'cancel' as const },
        ])
      }
      style={[
        horaStyles.picker,
        { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
      ]}
    >
      <Text style={[horaStyles.label, { color: colors.muted }]}>{label}</Text>
      <Text style={[horaStyles.value, { color: colors.ink }]}>{value}</Text>
      <Ionicons name="chevron-down" size={14} color={colors.muted} />
    </Pressable>
  );
}

const horaStyles = StyleSheet.create({
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  label: { fontSize: 12, fontWeight: '600' },
  value: { fontSize: 15, fontWeight: '700' },
});

/* ─── Pantalla ─── */

export default function ConvertirseProfesionalScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { user, esProfesional, habilitarProfesional, switchRole } = useSession();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const nombresDias = t('comun.dias').split(',');

  const [paso, setPaso] = useState(1);
  const [guardando, setGuardando] = useState(false);

  /* Paso 1 — el negocio */
  const [especialidad, setEspecialidad] = useState('');
  const [nombreNegocio, setNombreNegocio] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [aniosExp, setAniosExp] = useState('');
  const [matricula, setMatricula] = useState('');
  const [instagram, setInstagram] = useState('');

  /* Paso 2 — ubicación y modalidad */
  const [ubicacion, setUbicacion] = useState<DireccionSeleccionada | null>(null);
  const [modalidad, setModalidad] = useState<'salon' | 'domicilio' | 'ambos'>('domicilio');
  const [fotoSalonUri, setFotoSalonUri] = useState<string | null>(null);
  const necesitaFotoSalon = modalidad === 'salon' || modalidad === 'ambos';

  /* Paso 3 — servicios y horarios */
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaAbierta, setCategoriaAbierta] = useState<CategoriaSlug | null>(null);
  const [catalogo, setCatalogo] = useState<ServicioCatalogo[]>([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false);
  const [elegidos, setElegidos] = useState<ServicioElegido[]>([]);
  const [agenda, setAgenda] = useState<AgendaState>(agendaInicial);

  // Si la cuenta ya está habilitada, el alta no corresponde: se pasa a la
  // vista profesional en vez de volver a pedir los datos.
  useEffect(() => {
    if (!esProfesional) return;
    switchRole('profesional')
      .catch(() => {})
      .finally(() => router.replace('/(profesional)/agenda'));
  }, [esProfesional, switchRole, router]);

  useEffect(() => {
    if (paso !== 3 || categorias.length > 0) return;
    catalogoService.listarCategorias().then(setCategorias).catch(() => setCategorias([]));
  }, [paso, categorias.length]);

  const abrirCategoria = useCallback(async (slug: CategoriaSlug) => {
    if (categoriaAbierta === slug) {
      setCategoriaAbierta(null);
      return;
    }
    setCategoriaAbierta(slug);
    setCargandoCatalogo(true);
    try {
      setCatalogo(await catalogoService.listarServicios(slug));
    } finally {
      setCargandoCatalogo(false);
    }
  }, [categoriaAbierta]);

  const toggleServicio = useCallback((s: ServicioCatalogo) => {
    setElegidos((prev) => {
      const yaEsta = prev.some((e) => e.catalogoId === s.id);
      if (yaEsta) return prev.filter((e) => e.catalogoId !== s.id);
      return [
        ...prev,
        {
          catalogoId: s.id,
          nombre: s.nombre,
          categoria: s.categoria,
          duracionMin: s.duracionEstimadaMin,
          precio: '',
        },
      ];
    });
  }, []);

  const setPrecio = useCallback((catalogoId: string, precio: string) => {
    const limpio = precio.replace(/\D/g, '');
    setElegidos((prev) =>
      prev.map((e) => (e.catalogoId === catalogoId ? { ...e, precio: limpio } : e)),
    );
  }, []);

  const toggleDia = useCallback((dia: number) => {
    setAgenda((prev) => ({ ...prev, [dia]: { ...prev[dia], activo: !prev[dia].activo } }));
  }, []);

  const setHora = useCallback((dia: number, campo: keyof Franja, valor: string) => {
    setAgenda((prev) => ({
      ...prev,
      [dia]: { ...prev[dia], franja: { ...prev[dia].franja, [campo]: valor } },
    }));
  }, []);

  const elegirFotoSalon = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('auth.signup.permisoNecesarioTitulo'), t('auth.signup.permisoGaleriaMsg'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setFotoSalonUri(result.assets[0].uri);
  };

  /* ── Validación por paso ── */

  const errorDelPaso = (p: number): string | null => {
    if (p === 1) {
      if (!especialidad.trim()) return t('auth.signup.validaciones.especialidad');
      return null;
    }
    if (p === 2) {
      if (!ubicacion) return t('auth.signup.validaciones.direccion');
      if (necesitaFotoSalon && !fotoSalonUri) return t('auth.signup.validaciones.fotoSalon');
      return null;
    }
    if (p === 3) {
      const sinPrecio = elegidos.find((e) => !Number(e.precio));
      if (sinPrecio) {
        return t('cliente.convertirse.validaciones.precio', { servicio: sinPrecio.nombre });
      }
      if (elegidos.length > 0 && !Object.values(agenda).some((d) => d.activo)) {
        return t('cliente.convertirse.validaciones.sinDias');
      }
      for (const dia of DIAS_SEMANA) {
        const cfg = agenda[dia];
        if (cfg.activo && cfg.franja.horaInicio >= cfg.franja.horaFin) {
          return t('cliente.convertirse.validaciones.franja', { dia: nombresDias[dia] });
        }
      }
      return null;
    }
    return null;
  };

  const siguiente = () => {
    const err = errorDelPaso(paso);
    if (err) {
      Alert.alert(t('auth.signup.revisaDatosTitulo'), err);
      return;
    }
    setPaso((p) => Math.min(p + 1, TOTAL_PASOS));
  };

  const atras = () => {
    if (paso === 1) {
      router.back();
      return;
    }
    setPaso((p) => p - 1);
  };

  /* ── Alta final ── */

  const finalizar = async (omitirPaso3: boolean) => {
    if (!user) return;
    const err = errorDelPaso(1) ?? errorDelPaso(2) ?? (omitirPaso3 ? null : errorDelPaso(3));
    if (err) {
      Alert.alert(t('auth.signup.revisaDatosTitulo'), err);
      return;
    }
    setGuardando(true);
    try {
      let fotoSalonUrl: string | undefined;
      if (fotoSalonUri && necesitaFotoSalon) {
        fotoSalonUrl = await uploadImage(fotoSalonUri, 'salones');
      }

      const perfil: PerfilProfesionalSignup = {
        especialidad: especialidad.trim(),
        ciudad: ubicacion?.ciudad ?? '',
        direccion: ubicacion?.direccion ?? '',
        aniosExperiencia: Number(aniosExp) || 0,
        matricula: matricula.trim() || undefined,
        instagram: instagram.trim() || undefined,
        modalidad,
        fotoSalonUrl,
        latitud: ubicacion?.latitud,
        longitud: ubicacion?.longitud,
        nombreNegocio: nombreNegocio.trim() || undefined,
        descripcion: descripcion.trim() || undefined,
        perfilVisible: true,
        autoConfirmarTurnos: false,
        anticipoPorcentaje: 20,
      };

      // Servicios y agenda primero: si algo falla, la cuenta todavía no
      // quedó habilitada y el alta se puede reintentar completa.
      if (!omitirPaso3 && elegidos.length > 0) {
        for (const s of elegidos) {
          await serviciosService.agregar(user.id, {
            catalogoId: s.catalogoId,
            nombre: s.nombre,
            precio: Number(s.precio),
            duracionMin: s.duracionMin,
            categoria: s.categoria,
          });
        }
        const slots = DIAS_SEMANA.filter((d) => agenda[d].activo).map((d) => ({
          diaSemana: d as 0 | 1 | 2 | 3 | 4 | 5 | 6,
          franjas: [agenda[d].franja],
        }));
        if (slots.length > 0) await disponibilidadService.guardar(user.id, slots);
      }

      await habilitarProfesional(perfil);

      Alert.alert(
        t('cliente.convertirse.listoTitulo'),
        omitirPaso3 || elegidos.length === 0
          ? t('cliente.convertirse.listoMsgSinServicios')
          : t('cliente.convertirse.listoMsg'),
        [{ text: t('comun.aceptar'), onPress: () => router.replace('/(profesional)/agenda') }],
      );
    } catch (e: any) {
      console.warn('[convertirse-profesional] error', e);
      Alert.alert(
        t('perfil.compartido.errorGuardarTitulo'),
        e?.message ?? t('perfil.compartido.errorGuardarMsg'),
      );
    } finally {
      setGuardando(false);
    }
  };

  /* ── Render ── */

  const tituloPaso = t(`cliente.convertirse.paso${paso}Titulo`);
  const subtituloPaso = t(`cliente.convertirse.paso${paso}Subtitulo`);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={atras} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.ink} />
          </Pressable>
          <View style={styles.progresoWrap}>
            {Array.from({ length: TOTAL_PASOS }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.progresoBar,
                  { backgroundColor: i < paso ? colors.primary : colors.bone3 },
                ]}
              />
            ))}
          </View>
          <Text style={styles.progresoTxt}>
            {t('cliente.convertirse.pasoDe', { actual: paso, total: TOTAL_PASOS })}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            eyebrow={t('cliente.convertirse.eyebrow')}
            title={tituloPaso}
            subtitle={subtituloPaso}
          />

          {/* ── Paso 1: el negocio ── */}
          {paso === 1 && (
            <>
              <Text style={styles.sectionLabel}>{t('cliente.convertirse.queOfreces')}</Text>
              <AuthInput
                icon="brush-outline"
                placeholder={t('auth.signup.especialidadPlaceholder')}
                value={especialidad}
                onChangeText={setEspecialidad}
              />
              <AuthInput
                icon="storefront-outline"
                placeholder={t('cliente.convertirse.nombreNegocioPlaceholder')}
                value={nombreNegocio}
                onChangeText={setNombreNegocio}
              />
              <AuthInput
                icon="document-text-outline"
                placeholder={t('cliente.convertirse.descripcionPlaceholder')}
                value={descripcion}
                onChangeText={setDescripcion}
                multiline
              />

              <Text style={styles.sectionLabel}>{t('cliente.convertirse.tuExperiencia')}</Text>
              <AuthInput
                icon="time-outline"
                placeholder={t('auth.signup.aniosExpPlaceholder')}
                keyboardType="number-pad"
                value={aniosExp}
                onChangeText={setAniosExp}
              />
              <AuthInput
                icon="ribbon-outline"
                placeholder={t('auth.signup.matriculaPlaceholder')}
                value={matricula}
                onChangeText={setMatricula}
              />
              <AuthInput
                icon="logo-instagram"
                placeholder={t('auth.signup.instagramPlaceholder')}
                autoCapitalize="none"
                value={instagram}
                onChangeText={setInstagram}
              />
            </>
          )}

          {/* ── Paso 2: ubicación y modalidad ── */}
          {paso === 2 && (
            <>
              <Text style={styles.sectionLabel}>{t('auth.signup.direccionTrabajo')}</Text>
              <DireccionAutocomplete
                onSelect={setUbicacion}
                placeholder={t('auth.signup.buscaDireccionPlaceholder')}
              />

              <Text style={styles.sectionLabel}>{t('auth.signup.modalidadTrabajo')}</Text>
              <View style={styles.opcionesRow}>
                {MODALIDADES.map((m) => {
                  const activo = modalidad === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      style={[styles.opcionCard, activo && styles.opcionCardActiva]}
                      onPress={() => setModalidad(m.id)}
                    >
                      <Text style={styles.opcionEmoji}>{m.emoji}</Text>
                      <Text style={[styles.opcionLabel, activo && { color: colors.primary }]}>
                        {t(m.labelKey)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {necesitaFotoSalon && (
                <>
                  <Text style={styles.sectionLabel}>{t('auth.signup.fotoSalon')}</Text>
                  <Pressable style={styles.fotoPicker} onPress={elegirFotoSalon}>
                    {fotoSalonUri ? (
                      <Image
                        source={{ uri: fotoSalonUri }}
                        style={styles.fotoPreview}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.fotoPlaceholder}>
                        <Ionicons name="camera-outline" size={32} color={colors.muted} />
                        <Text style={styles.fotoPlaceholderTxt}>
                          {t('auth.signup.tocaElegirFoto')}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                </>
              )}
            </>
          )}

          {/* ── Paso 3: servicios y horarios ── */}
          {paso === 3 && (
            <>
              <Text style={styles.sectionLabel}>{t('cliente.convertirse.tusServicios')}</Text>
              <Text style={styles.hint}>{t('cliente.convertirse.serviciosHint')}</Text>

              <View style={styles.catsWrap}>
                {categorias.map((c) => {
                  const abierta = categoriaAbierta === c.slug;
                  return (
                    <View key={c.slug} style={styles.catCard}>
                      <Pressable
                        style={[styles.catHeader, abierta && { backgroundColor: colors.primaryTint }]}
                        onPress={() => abrirCategoria(c.slug)}
                      >
                        <Text style={styles.catEmoji}>{c.emoji}</Text>
                        <Text style={styles.catNombre}>{c.nombre}</Text>
                        <Ionicons
                          name={abierta ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={colors.muted}
                        />
                      </Pressable>

                      {abierta && (
                        <View style={styles.catBody}>
                          {cargandoCatalogo ? (
                            <ActivityIndicator color={colors.primary} />
                          ) : (
                            catalogo.map((s) => {
                              const activo = elegidos.some((e) => e.catalogoId === s.id);
                              return (
                                <Pressable
                                  key={s.id}
                                  style={styles.svcRow}
                                  onPress={() => toggleServicio(s)}
                                >
                                  <Ionicons
                                    name={activo ? 'checkbox' : 'square-outline'}
                                    size={20}
                                    color={activo ? colors.primary : colors.muted}
                                  />
                                  <Text style={styles.svcNombre}>{s.nombre}</Text>
                                  <Text style={styles.svcDuracion}>
                                    {s.duracionEstimadaMin} min
                                  </Text>
                                </Pressable>
                              );
                            })
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              {elegidos.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>{t('cliente.convertirse.precios')}</Text>
                  <View style={styles.preciosWrap}>
                    {elegidos.map((e) => (
                      <View key={e.catalogoId} style={styles.precioRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.precioNombre}>{e.nombre}</Text>
                          <Text style={styles.precioDuracion}>{e.duracionMin} min</Text>
                        </View>
                        <View style={styles.precioInputWrap}>
                          <Text style={styles.precioSigno}>$</Text>
                          <TextInput
                            style={styles.precioInput}
                            value={e.precio}
                            onChangeText={(v) => setPrecio(e.catalogoId, v)}
                            keyboardType="number-pad"
                            placeholder="0"
                            placeholderTextColor={colors.muted}
                          />
                        </View>
                      </View>
                    ))}
                  </View>

                  <Text style={styles.sectionLabel}>{t('cliente.convertirse.tuAgenda')}</Text>
                  <Text style={styles.hint}>{t('cliente.convertirse.agendaHint')}</Text>
                  <View style={styles.diasWrap}>
                    {DIAS_SEMANA.map((dia) => {
                      const cfg = agenda[dia];
                      return (
                        <View key={dia} style={styles.diaCard}>
                          <Pressable
                            style={[
                              styles.diaHeader,
                              cfg.activo && { backgroundColor: colors.primaryTint },
                            ]}
                            onPress={() => toggleDia(dia)}
                          >
                            <View
                              style={[
                                styles.diaCheck,
                                {
                                  backgroundColor: cfg.activo ? colors.primary : colors.surfaceAlt,
                                  borderColor: cfg.activo ? colors.primary : colors.border,
                                },
                              ]}
                            >
                              {cfg.activo && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                            </View>
                            <Text
                              style={[
                                styles.diaNombre,
                                { color: cfg.activo ? colors.ink : colors.muted },
                              ]}
                            >
                              {nombresDias[dia]}
                            </Text>
                          </Pressable>
                          {cfg.activo && (
                            <View style={styles.franjaRow}>
                              <View style={{ flex: 1 }}>
                                <HoraPicker
                                  label={t('profesional.horarios.desde')}
                                  value={cfg.franja.horaInicio}
                                  onSelect={(h) => setHora(dia, 'horaInicio', h)}
                                  colors={colors}
                                  t={t}
                                />
                              </View>
                              <Ionicons name="arrow-forward" size={14} color={colors.muted} />
                              <View style={{ flex: 1 }}>
                                <HoraPicker
                                  label={t('profesional.horarios.hasta')}
                                  value={cfg.franja.horaFin}
                                  onSelect={(h) => setHora(dia, 'horaFin', h)}
                                  colors={colors}
                                  t={t}
                                />
                              </View>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </>
              )}

              <View style={styles.tip}>
                <Ionicons name="bulb-outline" size={18} color={colors.primary} />
                <Text style={styles.tipTxt}>{t('cliente.convertirse.tip')}</Text>
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.bottomBar}>
          {paso < TOTAL_PASOS ? (
            <Button label={t('cliente.convertirse.continuar')} fullWidth onPress={siguiente} />
          ) : (
            <>
              <Button
                label={t('cliente.convertirse.activar')}
                fullWidth
                loading={guardando}
                onPress={() => finalizar(false)}
              />
              {elegidos.length === 0 && (
                <Button
                  label={t('cliente.convertirse.configurarDespues')}
                  variant="ghost"
                  fullWidth
                  disabled={guardando}
                  onPress={() => finalizar(true)}
                />
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
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
      gap: spacing.lg,
      paddingHorizontal: spacing.xxl,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    progresoWrap: { flexDirection: 'row', gap: 4, flex: 1 },
    progresoBar: { flex: 1, height: 4, borderRadius: 2 },
    progresoTxt: { fontSize: 12, fontWeight: '600', color: c.muted },

    content: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.huge },

    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: c.muted,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    hint: { fontSize: 13, color: c.muted, lineHeight: 19, marginBottom: spacing.md },

    opcionesRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
    opcionCard: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xs,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: c.bone3,
      backgroundColor: c.surface,
      gap: 4,
    },
    opcionCardActiva: { borderColor: c.primary, backgroundColor: c.primaryTint },
    opcionEmoji: { fontSize: 22 },
    opcionLabel: { fontSize: 12, fontWeight: '600', color: c.muted },

    fotoPicker: {
      borderRadius: radius.lg,
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: c.bone3,
      borderStyle: 'dashed',
      marginBottom: spacing.md,
    },
    fotoPreview: { width: '100%', height: 180, borderRadius: radius.lg },
    fotoPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxl,
      backgroundColor: c.surface,
      gap: spacing.sm,
    },
    fotoPlaceholderTxt: { fontSize: 13, color: c.muted, fontWeight: '500' },

    catsWrap: { gap: spacing.sm },
    catCard: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    catHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
    catEmoji: { fontSize: 18 },
    catNombre: { flex: 1, fontSize: 15, fontWeight: '600', color: c.ink },
    catBody: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      borderTopWidth: 1,
      borderTopColor: c.border,
      gap: spacing.xs,
      paddingTop: spacing.sm,
    },
    svcRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
    },
    svcNombre: { flex: 1, fontSize: 14, color: c.ink },
    svcDuracion: { fontSize: 12, color: c.muted },

    preciosWrap: { gap: spacing.sm },
    precioRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.lg,
    },
    precioNombre: { fontSize: 14, fontWeight: '600', color: c.ink },
    precioDuracion: { fontSize: 12, color: c.muted, marginTop: 2 },
    precioInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.surfaceAlt,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: spacing.md,
      minWidth: 96,
    },
    precioSigno: { fontSize: 14, color: c.muted, fontWeight: '600' },
    precioInput: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: c.ink,
      paddingVertical: spacing.sm,
    },

    diasWrap: { gap: spacing.sm },
    diaCard: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    diaHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    diaCheck: {
      width: 24,
      height: 24,
      borderRadius: 7,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    diaNombre: { flex: 1, fontSize: 15, fontWeight: '600' },
    franjaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },

    tip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: c.primaryTint,
      padding: spacing.lg,
      borderRadius: radius.lg,
      marginTop: spacing.xxl,
    },
    tipTxt: { flex: 1, fontSize: 13, color: c.primary, fontWeight: '500' },

    bottomBar: {
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: c.border,
      backgroundColor: c.background,
      gap: spacing.sm,
    },
  });
