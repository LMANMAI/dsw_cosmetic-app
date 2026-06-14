import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useSession } from '@/context/SessionContext';
import { valoracionesService } from '@/services/valoraciones.service';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import type { Valoracion } from '@/types/models';

export default function ReputacionScreen() {
  const { user } = useSession();
  const { colors } = useTheme();
  const router = useRouter();
  const [valoraciones, setValoraciones] = useState<Valoracion[]>([]);
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      setLoading(true);
      Promise.all([
        valoracionesService.listarDelProfesional(user.id),
        valoracionesService.obtenerResumen(user.id),
      ]).then(([vals, resumen]) => {
        setValoraciones(vals);
        setRating(resumen.rating);
        setLoading(false);
      });
    }, [user?.id]),
  );

  const styles = useMemo(() => makeStyles(colors), [colors]);

  const distribucion = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]; // index 0 = 1 estrella
    valoraciones.forEach((v) => { counts[v.puntuacion - 1]++; });
    return counts;
  }, [valoraciones]);

  const maxCount = Math.max(...distribucion, 1);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: spacing.xxl }}>
          <Pressable
            onPress={() => router.navigate('/(profesional)/perfil')}
            style={styles.backBtn}
            hitSlop={12}
          >
            <Ionicons name="arrow-back" size={24} color={colors.ink} />
          </Pressable>
          <ScreenHeader eyebrow="Mi negocio" title="Mi reputación" />
          <ActivityIndicator style={{ marginTop: spacing.huge }} color={colors.primary} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xxl, paddingBottom: spacing.huge }}>
        <Pressable
          onPress={() => router.navigate('/(profesional)/perfil')}
          style={styles.backBtn}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </Pressable>
        <ScreenHeader eyebrow="Mi negocio" title="Mi reputación" />

        {/* Rating general */}
        <View style={styles.ratingCard}>
          <Text style={styles.ratingBig}>{rating > 0 ? rating.toFixed(1) : '—'}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Ionicons
                key={i}
                name={i <= Math.round(rating) ? 'star' : 'star-outline'}
                size={22}
                color={i <= Math.round(rating) ? colors.warning : colors.muted}
              />
            ))}
          </View>
          <Text style={styles.totalReviews}>
            {valoraciones.length} {valoraciones.length === 1 ? 'reseña' : 'reseñas'}
          </Text>
        </View>

        {/* Distribución por estrellas */}
        <View style={styles.distCard}>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribucion[star - 1];
            const pct = count / maxCount;
            return (
              <View key={star} style={styles.distRow}>
                <Text style={styles.distLabel}>{star}</Text>
                <Ionicons name="star" size={12} color={colors.warning} />
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { flex: pct }]} />
                  <View style={{ flex: 1 - pct }} />
                </View>
                <Text style={styles.distCount}>{count}</Text>
              </View>
            );
          })}
        </View>

        {/* Listado de valoraciones */}
        {valoraciones.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyText}>Aún no tenés valoraciones</Text>
            <Text style={styles.emptyHint}>
              Cuando tus clientes completen un turno podrán dejarte una reseña.
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: spacing.xl }}>
            <Text style={styles.sectionTitle}>Reseñas de clientes</Text>
            {valoraciones.map((v) => (
              <View key={v.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewName}>{v.clienteNombre}</Text>
                  <Text style={styles.reviewDate}>{v.fecha}</Text>
                </View>
                <View style={styles.starsRow}>
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
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    backBtn: { marginBottom: spacing.lg, alignSelf: 'flex-start' },
    ratingCard: {
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      padding: spacing.xxl,
      borderWidth: 1,
      borderColor: c.border,
      marginTop: spacing.xl,
    },
    ratingBig: { fontSize: 48, fontWeight: '800', color: c.ink },
    starsRow: { flexDirection: 'row', gap: 4, marginTop: spacing.sm },
    totalReviews: { fontSize: 13, color: c.muted, marginTop: spacing.sm },
    distCard: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: c.border,
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    distRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    distLabel: { fontSize: 13, fontWeight: '600', color: c.ink, width: 14, textAlign: 'right' },
    barBg: {
      flex: 1,
      height: 8,
      backgroundColor: c.border,
      borderRadius: 4,
      flexDirection: 'row',
      overflow: 'hidden',
    },
    barFill: { backgroundColor: c.warning, borderRadius: 4 },
    distCount: { fontSize: 12, color: c.muted, width: 24, textAlign: 'right' },
    emptyBox: {
      alignItems: 'center',
      marginTop: spacing.huge,
      gap: spacing.md,
    },
    emptyText: { fontSize: 16, fontWeight: '600', color: c.ink },
    emptyHint: { fontSize: 13, color: c.muted, textAlign: 'center', paddingHorizontal: spacing.xl },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: c.muted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: spacing.md,
    },
    reviewCard: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: spacing.md,
    },
    reviewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    reviewName: { fontSize: 14, fontWeight: '600', color: c.ink },
    reviewDate: { fontSize: 12, color: c.muted },
    reviewComment: { fontSize: 13, color: c.ink, marginTop: spacing.sm, lineHeight: 19 },
  });
