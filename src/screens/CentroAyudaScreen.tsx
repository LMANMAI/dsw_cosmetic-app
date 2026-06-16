import React, { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/Button';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';

// TODO: reemplazar por el número real de soporte (código de país + número, sin "+" ni espacios)
const SOPORTE_WHATSAPP = '5493510000000';
const MENSAJE_INICIAL = 'Hola! Necesito ayuda con YOFI.';

export interface Faq {
  pregunta: string;
  respuesta: string;
}

interface CentroAyudaScreenProps {
  faqs: Faq[];
  subtitle?: string;
}

/**
 * Pantalla de Centro de ayuda reutilizable: lista de FAQs + contacto por
 * WhatsApp. El contenido de las FAQs lo define cada rol (cliente, proveedor).
 */
export function CentroAyudaScreen({
  faqs,
  subtitle = 'Respuestas a las dudas más comunes',
}: CentroAyudaScreenProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const [abierta, setAbierta] = useState<number | null>(null);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const abrirWhatsApp = async () => {
    const url = `https://wa.me/${SOPORTE_WHATSAPP}?text=${encodeURIComponent(MENSAJE_INICIAL)}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', 'No se pudo abrir WhatsApp. ¿Lo tenés instalado?');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <ScreenHeader eyebrow="Ayuda" title="Centro de ayuda" subtitle={subtitle} />

        {faqs.map((faq, i) => {
          const expandida = abierta === i;
          return (
            <Pressable
              key={i}
              style={[styles.faqCard, expandida && { borderColor: colors.primary }]}
              onPress={() => setAbierta(expandida ? null : i)}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqPregunta}>{faq.pregunta}</Text>
                <Ionicons
                  name={expandida ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.muted}
                />
              </View>
              {expandida ? <Text style={styles.faqRespuesta}>{faq.respuesta}</Text> : null}
            </Pressable>
          );
        })}

        <View style={styles.contactoBox}>
          <Ionicons name="logo-whatsapp" size={28} color={colors.success} />
          <Text style={styles.contactoTitulo}>¿No encontraste lo que buscabas?</Text>
          <Text style={styles.contactoTexto}>
            Escribinos por WhatsApp y te ayudamos personalmente.
          </Text>
          <Button label="Chatear por WhatsApp" onPress={abrirWhatsApp} fullWidth />
        </View>
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
    faqCard: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    faqHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    faqPregunta: { flex: 1, fontSize: 15, fontWeight: '600', color: c.ink },
    faqRespuesta: { fontSize: 14, lineHeight: 21, color: c.muted, marginTop: spacing.md },
    contactoBox: {
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.xl,
      marginTop: spacing.xl,
    },
    contactoTitulo: { fontSize: 16, fontWeight: '700', color: c.ink, textAlign: 'center' },
    contactoTexto: { fontSize: 13, color: c.muted, textAlign: 'center', marginBottom: spacing.md },
  });
