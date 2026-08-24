import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useTranslation } from '@/i18n';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';

const ULTIMA_ACTUALIZACION = 'Junio 2026';

// BORRADOR: este texto es genérico y debe ser revisado por un profesional legal
// antes del lanzamiento. Editá las secciones según corresponda.
const SECCIONES: { titulo: string; texto: string }[] = [
  {
    titulo: '1. Sobre YOFI',
    texto:
      'YOFI es una plataforma que conecta a personas que buscan servicios de belleza y bienestar con profesionales independientes que los ofrecen, y a proveedores de insumos con esos profesionales. YOFI actúa como intermediaria: no presta los servicios ni vende los insumos.',
  },
  {
    titulo: '2. Cuentas y registro',
    texto:
      'Para usar la app necesitás crear una cuenta con datos verídicos y mantenerlos actualizados. Sos responsable de la confidencialidad de tu contraseña y de toda actividad realizada desde tu cuenta. Podés solicitar la eliminación de tu cuenta en cualquier momento.',
  },
  {
    titulo: '3. Reservas, compras y pagos',
    texto:
      'Al reservar un turno te comprometés a asistir o cancelarlo con anticipación razonable. Al comprar insumos, el pedido se confirma una vez acreditado el pago. Los pagos dentro de la plataforma se procesan a través de MercadoPago; YOFI no almacena datos de tarjetas. Las políticas de devolución dependen de cada profesional o proveedor.',
  },
  {
    titulo: '4. Cancelaciones',
    texto:
      'Podés cancelar un turno o un pedido desde la app según corresponda. Las cancelaciones reiteradas sin aviso o la inasistencia pueden derivar en la limitación del uso de la plataforma.',
  },
  {
    titulo: '5. Responsabilidad por los servicios y productos',
    texto:
      'Los servicios son prestados por profesionales independientes y los insumos vendidos por proveedores independientes, quienes son responsables de su calidad, seguridad e higiene. YOFI no garantiza resultados ni se responsabiliza por daños derivados de la prestación del servicio o del uso de los productos, sin perjuicio de los derechos que te correspondan como consumidor.',
  },
  {
    titulo: '6. Valoraciones',
    texto:
      'Las reseñas deben ser honestas y respetuosas, basadas en experiencias reales. Nos reservamos el derecho de eliminar contenido ofensivo, falso o que infrinja derechos de terceros.',
  },
  {
    titulo: '7. Datos personales',
    texto:
      'Recopilamos los datos que cargás en tu perfil y los datos de uso necesarios para operar la plataforma. Los usamos para gestionar reservas, pedidos y notificaciones, y para mejorar el servicio. No vendemos tus datos a terceros. Compartimos únicamente la información necesaria para concretar el servicio o la entrega del pedido.',
  },
  {
    titulo: '8. Tus derechos sobre tus datos',
    texto:
      'Podés acceder, corregir o eliminar tus datos personales desde la app o contactándonos. Si solicitás la eliminación de tu cuenta, tus datos se eliminarán o anonimizarán salvo aquellos que debamos conservar por obligaciones legales.',
  },
  {
    titulo: '9. Notificaciones',
    texto:
      'Si activás las notificaciones, te enviaremos recordatorios y avisos según la configuración que elijas. Podés desactivarlas en cualquier momento desde tu perfil o desde la configuración del teléfono.',
  },
  {
    titulo: '10. Cambios en estos términos',
    texto:
      'Podemos actualizar estos términos para reflejar cambios en la plataforma o en la normativa. Si el cambio es significativo te lo informaremos dentro de la app. El uso continuado de YOFI implica la aceptación de los términos vigentes.',
  },
];

/** Pantalla de Términos y privacidad reutilizable por todos los roles. */
export function TerminosScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <ScreenHeader
          eyebrow={t('legal.eyebrow')}
          title={t('legal.titulo')}
          subtitle={t('legal.ultimaActualizacion', { fecha: ULTIMA_ACTUALIZACION })}
        />

        {SECCIONES.map((s) => (
          <View key={s.titulo} style={styles.seccion}>
            <Text style={styles.seccionTitulo}>{s.titulo}</Text>
            <Text style={styles.seccionTexto}>{s.texto}</Text>
          </View>
        ))}

        <Text style={styles.nota}>{t('legal.nota')}</Text>
      </ScrollView>
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
    seccion: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.xl,
      marginBottom: spacing.md,
    },
    seccionTitulo: { fontSize: 15, fontWeight: '700', color: c.ink, marginBottom: spacing.sm },
    seccionTexto: { fontSize: 14, lineHeight: 21, color: c.muted },
    nota: {
      fontSize: 13,
      color: c.muted,
      textAlign: 'center',
      marginTop: spacing.lg,
      paddingHorizontal: spacing.lg,
    },
  });
