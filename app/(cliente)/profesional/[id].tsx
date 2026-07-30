import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { profesionalesService, turnosService, pagosService } from '@/services';
import { disponibilidadService } from '@/services/disponibilidad.service';
import { valoracionesService } from '@/services/valoraciones.service';
import type { Disponibilidad, PerfilProfesional, Servicio, Valoracion } from '@/types/models';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { useSession } from '@/context/SessionContext';
import { useTranslation } from '@/i18n';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import { formatARS } from '@/utils/format';

/** Genera las próximas N fechas que coinciden con los días de disponibilidad. */
function generarProximasFechas(disponibilidad: Disponibilidad[], cantidad = 7): { fecha: Date; diaSemana: number }[] {
  if (disponibilidad.length === 0) return [];

  const fechas: { fecha: Date; diaSemana: number }[] = [];
  const diasDisponibles = new Set(disponibilidad.map((d) => d.diaSemana));
  const hoy = new Date();
  let cursor = new Date(hoy); // incluimos hoy si todavía hay horarios disponibles

  const MAX_ITER = 90; // seguridad: nunca más de 90 días hacia adelante
  let iter = 0;
  while (fechas.length < cantidad && iter < MAX_ITER) {
    const dia = cursor.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
    if (diasDisponibles.has(dia)) {
      fechas.push({ fecha: new Date(cursor), diaSemana: dia });
    }
    cursor.setDate(cursor.getDate() + 1);
    iter++;
  }
  return fechas;
}

export default function PerfilProfesionalScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { user } = useSession();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const NOMBRE_DIA_CORTO = t('comun.diasCortos').split(',');
  const NOMBRE_DIA_LARGO = t('comun.dias').split(',');
  const [profesional, setProfesional] = useState<PerfilProfesional | null>(null);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad[]>([]);
  const [valoraciones, setValoraciones] = useState<Valoracion[]>([]);
  const [servicioElegido, setServicioElegido] = useState<Servicio | null>(null);
  const [fechaElegida, setFechaElegida] = useState<{ fecha: Date; diaSemana: number } | null>(null);
  const [horarioElegido, setHorarioElegido] = useState<string | null>(null);
  const [slotsDisponibles, setSlotsDisponibles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reservando, setReservando] = useState(false);
  const [pagoModal, setPagoModal] = useState<{ turnoId: string; monto: number; servicio: string } | null>(null);
  const [pagandoSena, setPagandoSena] = useState(false);

  // Cargar profesional, servicios y disponibilidad
  useEffect(() => {
    if (!id) {
      setError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      profesionalesService.obtenerPorId(id),
      profesionalesService.listarServiciosDe(id),
      disponibilidadService.listar(id),
      valoracionesService.listarDelProfesional(id).catch(() => [] as Valoracion[]),
    ])
      .then(([p, s, d, vals]) => {
        setProfesional(p);
        setServicios(s);
        setDisponibilidad(d);
        setValoraciones(vals);
        setServicioElegido(s[0] ?? null);
        if (d.length > 0) {
          const proximas = generarProximasFechas(d, 7);
          if (proximas.length > 0) setFechaElegida(proximas[0]);
        }
      })
      .catch((err) => {
        console.log('Error cargando profesional:', err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Calcular slots cuando cambia el servicio o el día elegido
  useEffect(() => {
    if (!id || !servicioElegido || !fechaElegida) {
      setSlotsDisponibles([]);
      return;
    }
    // Usar fecha local (no UTC) para evitar desfasaje de zona horaria
    const f = fechaElegida.fecha;
    const fechaISO = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
    disponibilidadService
      .horariosDisponibles(id, fechaElegida.diaSemana, servicioElegido.duracionMin, fechaISO)
      .then((slots) => {
        // Si es hoy, filtrar horarios que ya pasaron
        const ahora = new Date();
        if (
          f.getFullYear() === ahora.getFullYear() &&
          f.getMonth() === ahora.getMonth() &&
          f.getDate() === ahora.getDate()
        ) {
          const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
          return setSlotsDisponibles(
            slots.filter((s) => {
              const [h, m] = s.split(':').map(Number);
              return h * 60 + m > horaActual;
            }),
          );
        }
        setSlotsDisponibles(slots);
      })
      .catch((err) => {
        console.warn('[horariosDisponibles] error:', err);
        setSlotsDisponibles([]);
      });
    setHorarioElegido(null);
  }, [id, servicioElegido?.id, fechaElegida]);

  // Resumen real de valoraciones (rating promedio + cantidad) a partir de la base de datos
  const resumenValoraciones = useMemo(() => {
    if (valoraciones.length === 0) return null;
    const suma = valoraciones.reduce((acc, v) => acc + v.puntuacion, 0);
    return {
      rating: Math.round((suma / valoraciones.length) * 10) / 10,
      cantidad: valoraciones.length,
    };
  }, [valoraciones]);

  // Próximas fechas disponibles
  const proximasFechas = useMemo(
    () => disponibilidad.length === 0 ? [] : generarProximasFechas(disponibilidad, 7),
    [disponibilidad],
  );

  // Cálculo de seña según config del profesional
  const porcentajeAnticipo = (profesional?.anticipoPorcentaje ?? 20) / 100;
  const montoSena = servicioElegido ? Math.round(servicioElegido.precio * porcentajeAnticipo) : 0;

  const reservar = async () => {
    if (!profesional || !servicioElegido || !horarioElegido || !fechaElegida || !user) return;
    setReservando(true);
    try {
      const fd = fechaElegida.fecha;
      const fechaISO = `${fd.getFullYear()}-${String(fd.getMonth() + 1).padStart(2, '0')}-${String(fd.getDate()).padStart(2, '0')}`;
      const turno = await turnosService.reservar(
        {
          clienteId: user.id,
          clienteNombre: user.nombre,
          profesionalId: profesional.id,
          servicioId: servicioElegido.id,
          servicioNombre: servicioElegido.nombre,
          fecha: fechaISO,
          hora: horarioElegido,
          duracionMin: servicioElegido.duracionMin,
          monto: servicioElegido.precio,
          montoSena: montoSena,
        },
        profesional.autoConfirmarTurnos,
      );

      // Si hay seña, mostrar modal de pago
      if (montoSena > 0) {
        setPagoModal({ turnoId: turno.id, monto: montoSena, servicio: servicioElegido.nombre });
      } else {
        const estadoMsg = profesional.autoConfirmarTurnos
          ? t('cliente.proDetalle.estadoConfirmado')
          : t('cliente.proDetalle.estadoPendiente');
        Alert.alert(
          t('cliente.proDetalle.turnoReservadoTitulo'),
          t('cliente.proDetalle.turnoReservadoMsg', {
            servicio: servicioElegido.nombre,
            dia: NOMBRE_DIA_LARGO[fechaElegida.diaSemana],
            fecha: `${fd.getDate()}/${fd.getMonth() + 1}`,
            hora: horarioElegido,
            estado: estadoMsg,
          }),
          [{ text: t('cliente.proDetalle.verMisTurnos'), onPress: () => router.replace('/(cliente)/turnos') }],
        );
      }
    } finally {
      setReservando(false);
    }
  };

  const pagarSenaMP = async () => {
    if (!pagoModal || !profesional) return;
    setPagandoSena(true);
    try {
      // 1) El backend crea la preferencia con la cuenta de MP del profesional.
      const { initPoint } = await pagosService.crearPreferenciaSena(pagoModal.turnoId);
      // 2) Abrimos el checkout de Mercado Pago y esperamos el retorno.
      const estado = await pagosService.abrirCheckoutSena(initPoint);

      if (estado === 'approved') {
        // Confirmación rápida en el cliente; el webhook también lo confirma.
        await turnosService.confirmarPagoSena(pagoModal.turnoId, profesional.autoConfirmarTurnos);
        setPagoModal(null);
        Alert.alert(
          t('cliente.proDetalle.pagoConfirmadoTitulo'),
          t('cliente.proDetalle.pagoConfirmadoMsg'),
          [{ text: t('cliente.proDetalle.verMisTurnos'), onPress: () => router.replace('/(cliente)/turnos') }],
        );
      } else if (estado === 'pending') {
        setPagoModal(null);
        Alert.alert(
          t('cliente.turnos.pagoPendienteTitulo'),
          t('cliente.proDetalle.pagoPendienteMsg'),
          [{ text: t('cliente.proDetalle.verMisTurnos'), onPress: () => router.replace('/(cliente)/turnos') }],
        );
      } else if (estado === 'cancelado') {
        Alert.alert(t('cliente.turnos.pagoNoCompletadoTitulo'), t('cliente.proDetalle.pagoNoCompletadoMsg'));
      } else {
        Alert.alert(t('cliente.turnos.pagoErrorTitulo'), t('cliente.turnos.pagoErrorMsg'));
      }
    } catch (e: any) {
      Alert.alert(t('cliente.turnos.pagoIniciarErrorTitulo'), e?.message ?? t('cliente.turnos.pagoIniciarErrorMsg'));
    } finally {
      setPagandoSena(false);
    }
  };

  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (error || !profesional) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <View style={styles.empty}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.ink }]}>{t('cliente.proDetalle.noEncontrado')}</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            {t('cliente.proDetalle.noEncontradoMsg')}
          </Text>
          <Button label={t('comun.volver')} onPress={() => router.back()} style={{ marginTop: spacing.lg }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={styles.header}>
          {profesional.fotoSalon ? (
            <>
              {/* Foto del negocio como fondo del encabezado */}
              <Image
                source={{ uri: profesional.fotoSalon }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
              {/* Velo oscuro para que el texto siga siendo legible */}
              <View style={styles.heroOverlay} />
            </>
          ) : (
            <View style={styles.heroBg} />
          )}
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={'#FFFFFF'} />
          </Pressable>
          <View style={styles.heroContent}>
            <Avatar nombre={profesional.nombre} size={88} />
            <Text style={styles.heroName}>{profesional.nombre}</Text>
            <Text style={styles.heroZona}>📍 {profesional.zona}{profesional.distanciaKm != null ? ` · ${profesional.distanciaKm}km` : ''}</Text>
            <View style={styles.heroStats}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>⭐ {resumenValoraciones?.rating ?? profesional.rating}</Text>
                <Text style={styles.statLabel}>{resumenValoraciones?.cantidad ?? profesional.reviews} {t('cliente.proDetalle.resenas')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{servicios.length}</Text>
                <Text style={styles.statLabel}>{t('cliente.proDetalle.servicios')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Badge label={t('cliente.proDetalle.verificada')} tone="success" />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('cliente.proDetalle.sobre', { nombre: profesional.nombre.split(' ')[0] })}</Text>
          <Text style={styles.descripcion}>{profesional.descripcion}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('cliente.proDetalle.serviciosPrecios')}</Text>
          {servicios.length === 0 && (
            <View style={styles.sinDisponibilidad}>
              <Ionicons name="pricetags-outline" size={28} color={colors.muted} />
              <Text style={styles.sinDisponibilidadTxt}>
                {t('cliente.proDetalle.sinServicios')}
              </Text>
            </View>
          )}
          {servicios.map((s) => {
            const elegido = servicioElegido?.id === s.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => setServicioElegido(s)}
                style={[styles.servicio, elegido && styles.servicioActivo]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.servicioNombre}>{s.nombre}</Text>
                  <Text style={styles.servicioMeta}>{t('cliente.proDetalle.minutos', { min: s.duracionMin })}</Text>
                </View>
                <Text style={styles.servicioPrecio}>{formatARS(s.precio)}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Selección de día */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('cliente.proDetalle.elegiDia')}</Text>
          {disponibilidad.length === 0 ? (
            <View style={styles.sinDisponibilidad}>
              <Ionicons name="calendar-outline" size={28} color={colors.muted} />
              <Text style={styles.sinDisponibilidadTxt}>
                {t('cliente.proDetalle.sinHorariosConfig')}
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.xxl, paddingHorizontal: spacing.xxl }}>
              <View style={styles.diasRow}>
                {proximasFechas.map((item, idx) => {
                  const elegido = fechaElegida?.fecha.toISOString().slice(0, 10) === item.fecha.toISOString().slice(0, 10);
                  return (
                    <Pressable
                      key={idx}
                      onPress={() => setFechaElegida(item)}
                      style={[styles.diaChip, elegido && styles.diaChipActivo]}
                    >
                      <Text style={[styles.diaChipDia, elegido && styles.diaChipTxtActivo]}>
                        {NOMBRE_DIA_CORTO[item.diaSemana]}
                      </Text>
                      <Text style={[styles.diaChipFecha, elegido && styles.diaChipTxtActivo]}>
                        {item.fecha.getDate()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Selección de horario */}
        {fechaElegida && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('cliente.proDetalle.horariosDisponibles', {
                dia: NOMBRE_DIA_LARGO[fechaElegida.diaSemana],
                fecha: `${fechaElegida.fecha.getDate()}/${fechaElegida.fecha.getMonth() + 1}`,
              })}
            </Text>
            {slotsDisponibles.length === 0 ? (
              <Text style={styles.sinSlots}>{t('cliente.proDetalle.sinSlots')}</Text>
            ) : (
              <View style={styles.horariosGrid}>
                {slotsDisponibles.map((h) => {
                  const elegido = horarioElegido === h;
                  return (
                    <Pressable
                      key={h}
                      onPress={() => setHorarioElegido(h)}
                      style={[styles.hora, elegido && styles.horaActiva]}
                    >
                      <Text style={[styles.horaTxt, elegido && styles.horaTxtActiva]}>{h}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Reseñas de otros clientes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('cliente.proDetalle.resenasTitulo')}</Text>
          {valoraciones.length === 0 ? (
            <View style={styles.sinDisponibilidad}>
              <Ionicons name="chatbubble-ellipses-outline" size={28} color={colors.muted} />
              <Text style={styles.sinDisponibilidadTxt}>{t('cliente.proDetalle.sinResenas')}</Text>
            </View>
          ) : (
            valoraciones.map((v) => (
              <View key={v.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewName}>{v.clienteNombre || t('cliente.proDetalle.clienteAnonimo')}</Text>
                  <Text style={styles.reviewDate}>{v.fecha}</Text>
                </View>
                <View style={styles.reviewStars}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Ionicons
                      key={i}
                      name={i <= v.puntuacion ? 'star' : 'star-outline'}
                      size={14}
                      color={i <= v.puntuacion ? colors.warning : colors.muted}
                    />
                  ))}
                </View>
                {v.comentario ? (
                  <Text style={styles.reviewComment}>{v.comentario}</Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Text style={styles.footerLabel}>{t('cliente.proDetalle.servicioLabel', { monto: servicioElegido ? formatARS(servicioElegido.precio) : '—' })}</Text>
          <View style={styles.footerRow}>
            <Text style={styles.footerTotal}>
              {t('cliente.proDetalle.senaLabel', { monto: montoSena > 0 ? formatARS(montoSena) : '—' })}
            </Text>
            {montoSena > 0 && (
              <Text style={styles.footerPct}>({profesional?.anticipoPorcentaje ?? 20}%)</Text>
            )}
          </View>
        </View>
        <Button
          label={horarioElegido ? t('cliente.proDetalle.reservarHora', { hora: horarioElegido }) : t('cliente.proDetalle.elegiHorario')}
          onPress={reservar}
          loading={reservando}
          disabled={!horarioElegido || !servicioElegido || !fechaElegida}
        />
      </View>

      {/* Modal de pago MercadoPago */}
      <Modal visible={!!pagoModal} animationType="slide" transparent onRequestClose={() => setPagoModal(null)}>
        <Pressable style={styles.pagoBackdrop} onPress={() => setPagoModal(null)} />
        <View style={styles.pagoWrap} pointerEvents="box-none">
          <View style={styles.pagoCard}>
            <View style={styles.pagoIconWrap}>
              <Ionicons name="card-outline" size={40} color={colors.primary} />
            </View>
            <Text style={styles.pagoTitle}>{t('cliente.proDetalle.pagarSena')}</Text>
            <Text style={styles.pagoSub}>{pagoModal?.servicio}</Text>

            <View style={styles.pagoMontoBox}>
              <Text style={styles.pagoMontoLabel}>{t('cliente.proDetalle.montoAPagar')}</Text>
              <Text style={styles.pagoMonto}>{formatARS(pagoModal?.monto ?? 0)}</Text>
            </View>

            <Pressable
              style={[styles.mpButton, pagandoSena && { opacity: 0.6 }]}
              onPress={pagarSenaMP}
              disabled={pagandoSena}
            >
              {pagandoSena ? (
                <Text style={styles.mpButtonText}>{t('cliente.proDetalle.abriendoMP')}</Text>
              ) : (
                <>
                  <Text style={styles.mpButtonText}>{t('cliente.proDetalle.pagarCon')}</Text>
                  <Text style={[styles.mpButtonText, { fontWeight: '800' }]}>Mercado Pago</Text>
                </>
              )}
            </Pressable>

            <Pressable disabled={pagandoSena} onPress={() => {
              setPagoModal(null);
              Alert.alert(
                t('cliente.proDetalle.reservadoSinPagoTitulo'),
                t('cliente.proDetalle.reservadoSinPagoMsg'),
                [{ text: t('cliente.proDetalle.verMisTurnos'), onPress: () => router.replace('/(cliente)/turnos') }],
              );
            }} style={styles.pagoLater}>
              <Text style={styles.pagoLaterTxt}>{t('cliente.proDetalle.pagarMasTarde')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  header: {
    backgroundColor: c.navy,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.xxl,
    overflow: 'hidden',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 14, 30, 0.55)',
  },
  heroBg: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: 'rgba(184, 73, 104, 0.18)',
    right: -200,
    top: -150,
  },
  heroContent: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  heroName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: spacing.md,
  },
  heroZona: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    marginTop: spacing.lg,
  },
  statBox: { alignItems: 'center' },
  statValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.15)' },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    margin: spacing.lg,
  },
  section: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: c.ink,
    marginBottom: spacing.lg,
  },
  descripcion: {
    fontSize: 15,
    color: c.muted,
    lineHeight: 22,
  },
  servicio: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: spacing.sm,
  },
  servicioActivo: {
    borderColor: c.primary,
    backgroundColor: c.primaryTint,
  },
  servicioNombre: { fontSize: 15, fontWeight: '600', color: c.ink },
  servicioMeta: { fontSize: 12, color: c.muted, marginTop: 2 },
  servicioPrecio: { fontSize: 16, fontWeight: '700', color: c.primary },
  sinDisponibilidad: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
  },
  sinDisponibilidadTxt: {
    fontSize: 14,
    color: c.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  reviewCard: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: spacing.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewName: { fontSize: 14, fontWeight: '600', color: c.ink },
  reviewDate: { fontSize: 12, color: c.muted },
  reviewStars: { flexDirection: 'row', gap: 4, marginTop: spacing.sm },
  reviewComment: { fontSize: 13, color: c.ink, marginTop: spacing.sm, lineHeight: 19 },
  diasRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  diaChip: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    minWidth: 60,
  },
  diaChipActivo: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  diaChipDia: {
    fontSize: 12,
    fontWeight: '600',
    color: c.muted,
  },
  diaChipFecha: {
    fontSize: 18,
    fontWeight: '700',
    color: c.ink,
    marginTop: 2,
  },
  diaChipTxtActivo: {
    color: '#FFFFFF',
  },
  sinSlots: {
    fontSize: 14,
    color: c.muted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  horariosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hora: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    minWidth: 84,
    alignItems: 'center',
  },
  horaActiva: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  horaTxt: { fontSize: 14, fontWeight: '600', color: c.ink },
  horaTxtActiva: { color: '#FFFFFF' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: c.surface,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  footerLabel: { fontSize: 12, color: c.muted, fontWeight: '500' },
  footerRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  footerTotal: { fontSize: 22, fontWeight: '700', color: c.ink },
  footerPct: { fontSize: 12, color: c.muted, fontWeight: '500' },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  // ── Modal de pago ──
  pagoBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 36, 0.55)',
  },
  pagoWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pagoCard: {
    backgroundColor: c.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    paddingBottom: spacing.huge,
  },
  pagoIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: c.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  pagoTitle: { fontSize: 20, fontWeight: '700', color: c.ink },
  pagoSub: { fontSize: 14, color: c.muted, marginTop: 4 },
  pagoMontoBox: {
    backgroundColor: c.background,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  pagoMontoLabel: { fontSize: 13, color: c.muted, marginBottom: 4 },
  pagoMonto: { fontSize: 28, fontWeight: '800', color: c.ink },
  mpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#009EE3',
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    width: '100%',
  },
  mpButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  pagoLater: {
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
  },
  pagoLaterTxt: { fontSize: 14, color: c.muted },
});
