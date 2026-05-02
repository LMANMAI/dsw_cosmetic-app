import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { profesionalesService, turnosService } from '@/services';
import type { PerfilProfesional, Servicio } from '@/types/models';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { useSession } from '@/context/SessionContext';
import { colors, radius, spacing } from '@/theme';
import { formatARS } from '@/utils/format';

const HORARIOS = ['09:00', '10:30', '12:00', '14:30', '16:00', '17:30', '19:00'];

export default function PerfilProfesionalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useSession();
  const [profesional, setProfesional] = useState<PerfilProfesional | null>(null);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [servicioElegido, setServicioElegido] = useState<Servicio | null>(null);
  const [horarioElegido, setHorarioElegido] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reservando, setReservando] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      profesionalesService.obtenerPorId(id),
      profesionalesService.listarServiciosDe(id),
    ])
      .then(([p, s]) => {
        setProfesional(p);
        setServicios(s);
        setServicioElegido(s[0] ?? null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const reservar = async () => {
    if (!profesional || !servicioElegido || !horarioElegido || !user) return;
    setReservando(true);
    try {
      const hoy = new Date();
      hoy.setDate(hoy.getDate() + 1);
      await turnosService.reservar({
        clienteId: user.id,
        clienteNombre: user.nombre,
        profesionalId: profesional.id,
        servicioId: servicioElegido.id,
        servicioNombre: servicioElegido.nombre,
        fecha: hoy.toISOString().slice(0, 10),
        hora: horarioElegido,
        duracionMin: servicioElegido.duracionMin,
        monto: servicioElegido.precio,
      });
      Alert.alert(
        '¡Turno reservado! 🎉',
        `Te confirmamos por notificación. Recordatorio 24h y 2h antes.`,
        [{ text: 'Ver mis turnos', onPress: () => router.replace('/(cliente)/turnos') }],
      );
    } finally {
      setReservando(false);
    }
  };

  if (loading || !profesional) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={colors.rose} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </Pressable>
          <View style={styles.heroBg} />
          <View style={styles.heroContent}>
            <Avatar nombre={profesional.nombre} size={88} />
            <Text style={styles.heroName}>{profesional.nombre}</Text>
            <Text style={styles.heroZona}>📍 {profesional.zona} · {profesional.distanciaKm}km</Text>
            <View style={styles.heroStats}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>⭐ {profesional.rating}</Text>
                <Text style={styles.statLabel}>{profesional.reviews} reseñas</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{servicios.length}</Text>
                <Text style={styles.statLabel}>servicios</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Badge label="Verificada" tone="success" />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sobre {profesional.nombre.split(' ')[0]}</Text>
          <Text style={styles.descripcion}>{profesional.descripcion}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Servicios y precios</Text>
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
                  <Text style={styles.servicioMeta}>{s.duracionMin} min</Text>
                </View>
                <Text style={styles.servicioPrecio}>{formatARS(s.precio)}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Próxima disponibilidad — mañana</Text>
          <View style={styles.horariosGrid}>
            {HORARIOS.map((h) => {
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
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Text style={styles.footerLabel}>Total a pagar</Text>
          <Text style={styles.footerTotal}>
            {servicioElegido ? formatARS(servicioElegido.precio) : '—'}
          </Text>
        </View>
        <Button
          label={horarioElegido ? `Reservar ${horarioElegido}` : 'Elegí un horario'}
          onPress={reservar}
          loading={reservando}
          disabled={!horarioElegido || !servicioElegido}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bone },
  header: {
    backgroundColor: colors.navy,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.xxl,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
    overflow: 'hidden',
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
    color: colors.white,
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
  statValue: { color: colors.white, fontSize: 15, fontWeight: '700' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 22, backgroundColor: 'rgba(255,255,255,0.15)' },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.lg,
  },
  descripcion: {
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
  },
  servicio: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  servicioActivo: {
    borderColor: colors.rose,
    backgroundColor: colors.roseTint,
  },
  servicioNombre: { fontSize: 15, fontWeight: '600', color: colors.ink },
  servicioMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  servicioPrecio: { fontSize: 16, fontWeight: '700', color: colors.rose },
  horariosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hora: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 84,
    alignItems: 'center',
  },
  horaActiva: {
    backgroundColor: colors.rose,
    borderColor: colors.rose,
  },
  horaTxt: { fontSize: 14, fontWeight: '600', color: colors.ink },
  horaTxtActiva: { color: colors.white },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerLabel: { fontSize: 12, color: colors.muted, fontWeight: '500' },
  footerTotal: { fontSize: 22, fontWeight: '700', color: colors.ink },
});
