import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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
import { useFocusEffect } from '@react-navigation/native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Button } from '@/components/Button';
import { useSession } from '@/context/SessionContext';
import { pedidosService } from '@/services';
import { useTheme, radius, spacing } from '@/theme';
import type { ThemeColors } from '@/theme';
import { formatARS } from '@/utils/format';
import { ESTADO_PEDIDO, accionSiguiente, siguienteEstado, CORREOS } from '@/utils/pedidos';
import type { InfoEnvio, MetodoEnvio, Pedido } from '@/types/models';

type Filtro = 'todos' | 'abiertos' | 'entregado' | 'cancelado';

const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'abiertos', label: 'En curso' },
  { id: 'entregado', label: 'Entregados' },
  { id: 'cancelado', label: 'Cancelados' },
];

export default function PedidosProveedorScreen() {
  const { colors } = useTheme();
  const { user } = useSession();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const proveedorId = user?.id ?? '';

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [enviando, setEnviando] = useState<Pedido | null>(null);

  const cargar = useCallback(async () => {
    if (!proveedorId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setPedidos(await pedidosService.pedidosDelProveedor(proveedorId));
    } finally {
      setLoading(false);
    }
  }, [proveedorId]);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const visibles = useMemo(() => {
    switch (filtro) {
      case 'abiertos':
        return pedidos.filter(
          (p) => p.estado === 'pendiente' || p.estado === 'confirmado' || p.estado === 'enviado',
        );
      case 'entregado':
        return pedidos.filter((p) => p.estado === 'entregado');
      case 'cancelado':
        return pedidos.filter((p) => p.estado === 'cancelado');
      default:
        return pedidos;
    }
  }, [pedidos, filtro]);

  const avanzar = async (p: Pedido) => {
    // Al pasar de 'confirmado' a 'enviado' pedimos los datos del envío.
    if (p.estado === 'confirmado') {
      setEnviando(p);
      return;
    }
    const sig = siguienteEstado(p.estado);
    if (!sig) return;
    await pedidosService.actualizarEstado(p.id, sig);
    cargar();
  };

  const confirmarEnvio = async (envio: InfoEnvio) => {
    if (!enviando) return;
    await pedidosService.marcarEnviado(enviando.id, envio);
    setEnviando(null);
    cargar();
  };

  const cancelar = (p: Pedido) => {
    Alert.alert('Cancelar pedido', `¿Cancelar el pedido de ${p.compradorNombre ?? 'este cliente'}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancelar pedido',
        style: 'destructive',
        onPress: async () => {
          await pedidosService.actualizarEstado(p.id, 'cancelado');
          cargar();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          eyebrow="Tus ventas"
          title="Pedidos"
          subtitle={`${pedidos.length} ${pedidos.length === 1 ? 'pedido' : 'pedidos'} en total`}
        />
        <View style={styles.filtros}>
          {FILTROS.map((f) => {
            const active = filtro === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setFiltro(f.id)}
                style={[styles.filtroChip, active && styles.filtroChipActive]}
              >
                <Text style={[styles.filtroLabel, active && styles.filtroLabelActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      ) : (
        <FlatList
          data={visibles}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: spacing.xxl, paddingBottom: 120, gap: spacing.md }}
          renderItem={({ item }) => (
            <PedidoCard
              pedido={item}
              colors={colors}
              styles={styles}
              onAvanzar={() => avanzar(item)}
              onCancelar={() => cancelar(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={36} color={colors.muted} />
              <Text style={styles.emptyTitle}>
                {filtro === 'todos' ? 'Todavía no recibiste pedidos' : 'Sin pedidos en este filtro'}
              </Text>
              <Text style={styles.emptyText}>
                Cuando un profesional compre tus insumos, los vas a ver acá para confirmarlos y
                gestionar el envío.
              </Text>
            </View>
          }
        />
      )}

      <EnvioModal
        pedido={enviando}
        colors={colors}
        styles={styles}
        onClose={() => setEnviando(null)}
        onConfirm={confirmarEnvio}
      />
    </SafeAreaView>
  );
}

function EnvioModal({
  pedido,
  colors,
  styles,
  onClose,
  onConfirm,
}: {
  pedido: Pedido | null;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  onClose: () => void;
  onConfirm: (envio: InfoEnvio) => Promise<void> | void;
}) {
  const [metodo, setMetodo] = useState<MetodoEnvio>('correo');
  const [correo, setCorreo] = useState<string>(CORREOS[0]);
  const [nroSeguimiento, setNroSeguimiento] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [saving, setSaving] = useState(false);

  // Reiniciar el formulario cada vez que se abre con un pedido nuevo.
  React.useEffect(() => {
    if (pedido) {
      setMetodo('correo');
      setCorreo(CORREOS[0]);
      setNroSeguimiento('');
      setMensaje('');
    }
  }, [pedido]);

  const guardar = async () => {
    setSaving(true);
    try {
      await onConfirm({
        metodo,
        correo: metodo === 'correo' ? correo : undefined,
        nroSeguimiento: nroSeguimiento.trim() || undefined,
        mensaje: mensaje.trim() || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={!!pedido} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.xxl }}>
            <Text style={styles.sheetTitle}>Datos del envío</Text>
            <Text style={styles.sheetSubtitle}>
              Contale al comprador cómo viaja su pedido.
            </Text>

            <Text style={styles.fieldLabel}>¿Cómo lo enviás?</Text>
            <View style={styles.segmentRow}>
              {([
                { id: 'correo' as const, label: 'Por correo', icon: 'cube-outline' as const },
                { id: 'propio' as const, label: 'Envío propio', icon: 'bicycle-outline' as const },
              ]).map((opt) => {
                const active = metodo === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setMetodo(opt.id)}
                    style={[styles.segment, active && styles.segmentActive]}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={18}
                      color={active ? colors.white : colors.muted}
                    />
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {metodo === 'correo' ? (
              <>
                <Text style={styles.fieldLabel}>Correo</Text>
                <View style={styles.chipsWrap}>
                  {CORREOS.map((c) => {
                    const active = correo === c;
                    return (
                      <Pressable
                        key={c}
                        onPress={() => setCorreo(c)}
                        style={[styles.correoChip, active && styles.correoChipActive]}
                      >
                        <Text style={[styles.correoChipText, active && styles.correoChipTextActive]}>
                          {c}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.fieldLabel}>Número de seguimiento</Text>
                <TextInput
                  style={styles.input}
                  value={nroSeguimiento}
                  onChangeText={setNroSeguimiento}
                  placeholder="Ej: AR123456789"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="characters"
                />
              </>
            ) : null}

            <Text style={styles.fieldLabel}>Mensaje para el comprador</Text>
            <TextInput
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
              value={mensaje}
              onChangeText={setMensaje}
              placeholder={
                metodo === 'correo'
                  ? 'Ej: Lo despaché hoy por Andreani, llega en 3-5 días hábiles.'
                  : 'Ej: Te lo llevo yo mañana a la tarde, coordinamos horario.'
              }
              placeholderTextColor={colors.muted}
              multiline
            />

            <View style={{ height: spacing.lg }} />
            <Button
              variant="dark"
              label={saving ? 'Guardando…' : 'Marcar como enviado'}
              onPress={guardar}
              loading={saving}
              fullWidth
            />
            <Pressable onPress={onClose} style={styles.cancelLink} hitSlop={8}>
              <Text style={styles.cancelLinkText}>Cancelar</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PedidoCard({
  pedido,
  colors,
  styles,
  onAvanzar,
  onCancelar,
}: {
  pedido: Pedido;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  onAvanzar: () => void;
  onCancelar: () => void;
}) {
  const meta = ESTADO_PEDIDO[pedido.estado];
  const tone = colors[meta.tone];
  const fecha = new Date(pedido.fecha).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
  });
  const accion = accionSiguiente(pedido.estado);
  const abierto = pedido.estado !== 'entregado' && pedido.estado !== 'cancelado';

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardNombre} numberOfLines={1}>
            {pedido.compradorNombre ?? 'Cliente'}
          </Text>
          <Text style={styles.cardFecha}>{fecha}</Text>
        </View>
        <View style={[styles.estadoChip, { backgroundColor: `${tone}1A` }]}>
          <Text style={[styles.estadoChipText, { color: tone }]}>{meta.label}</Text>
        </View>
      </View>

      <View style={styles.itemsBox}>
        {pedido.items.map((it) => (
          <View key={it.productoId} style={styles.itemRow}>
            <Text style={styles.itemNombre} numberOfLines={1}>
              {it.cantidad}× {it.productoNombre}
            </Text>
            <Text style={styles.itemPrecio}>{formatARS(it.precioUnitario * it.cantidad)}</Text>
          </View>
        ))}
      </View>

      {pedido.direccionEnvio ? (
        <View style={styles.envioRow}>
          <Ionicons name="location-outline" size={14} color={colors.muted} />
          <Text style={styles.envioText} numberOfLines={1}>{pedido.direccionEnvio}</Text>
        </View>
      ) : null}

      {pedido.envio ? (
        <View style={styles.envioBox}>
          <View style={styles.envioBoxRow}>
            <Ionicons
              name={pedido.envio.metodo === 'correo' ? 'cube-outline' : 'bicycle-outline'}
              size={14}
              color={colors.primary}
            />
            <Text style={styles.envioBoxTitle}>
              {pedido.envio.metodo === 'correo'
                ? pedido.envio.correo ?? 'Por correo'
                : 'Envío propio'}
            </Text>
          </View>
          {pedido.envio.nroSeguimiento ? (
            <Text style={styles.envioBoxText}>Seguimiento: {pedido.envio.nroSeguimiento}</Text>
          ) : null}
          {pedido.envio.mensaje ? (
            <Text style={styles.envioBoxText}>“{pedido.envio.mensaje}”</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.cardBottom}>
        <Text style={styles.total}>{formatARS(pedido.total)}</Text>
        {abierto ? (
          <View style={styles.acciones}>
            <Pressable onPress={onCancelar} hitSlop={6} style={styles.cancelarBtn}>
              <Text style={styles.cancelarText}>Cancelar</Text>
            </Pressable>
            {accion ? (
              <Pressable onPress={onAvanzar} style={styles.avanzarBtn}>
                <Text style={styles.avanzarText}>{accion}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bone },
    headerWrap: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg },
    filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md },
    filtroChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.bone3,
      backgroundColor: colors.white,
    },
    filtroChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filtroLabel: { fontSize: 12, fontWeight: '600', color: colors.muted },
    filtroLabelActive: { color: colors.white },

    card: {
      backgroundColor: colors.white,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    cardNombre: { fontSize: 15, fontWeight: '700', color: colors.ink },
    cardFecha: { fontSize: 12, color: colors.muted, marginTop: 2 },
    estadoChip: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
    estadoChipText: { fontSize: 11, fontWeight: '700' },

    itemsBox: {
      marginTop: spacing.md,
      gap: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.bone2,
      paddingTop: spacing.md,
    },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
    itemNombre: { flex: 1, fontSize: 13, color: colors.ink },
    itemPrecio: { fontSize: 13, color: colors.muted, fontWeight: '600' },

    envioRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
    envioText: { flex: 1, fontSize: 12, color: colors.muted },

    envioBox: {
      marginTop: spacing.md,
      backgroundColor: colors.primaryTint,
      borderRadius: radius.md,
      padding: spacing.md,
      gap: 4,
    },
    envioBoxRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    envioBoxTitle: { fontSize: 13, fontWeight: '700', color: colors.ink },
    envioBoxText: { fontSize: 12, color: colors.muted, lineHeight: 17 },

    // Modal de envío
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(15, 23, 36, 0.4)',
    },
    sheet: {
      backgroundColor: colors.white,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      maxHeight: '90%',
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: colors.bone3,
      borderRadius: 2,
      alignSelf: 'center',
      marginTop: spacing.sm,
    },
    sheetTitle: { fontSize: 20, fontWeight: '700', color: colors.ink },
    sheetSubtitle: { fontSize: 13, color: colors.muted, marginTop: 2, marginBottom: spacing.lg },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.muted,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    segmentRow: { flexDirection: 'row', gap: spacing.sm },
    segment: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: colors.bone3,
      backgroundColor: colors.white,
    },
    segmentActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    segmentText: { fontSize: 13, fontWeight: '600', color: colors.muted },
    segmentTextActive: { color: colors.white },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    correoChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.bone3,
      backgroundColor: colors.white,
    },
    correoChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    correoChipText: { fontSize: 12, fontWeight: '600', color: colors.muted },
    correoChipTextActive: { color: colors.white },
    input: {
      backgroundColor: colors.bone,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: 15,
      color: colors.ink,
    },
    cancelLink: { paddingVertical: spacing.md, alignItems: 'center' },
    cancelLinkText: { fontSize: 14, color: colors.muted },

    cardBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.md,
      gap: spacing.md,
    },
    total: { fontSize: 16, fontWeight: '800', color: colors.ink },
    acciones: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    cancelarBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    cancelarText: { fontSize: 13, color: colors.danger, fontWeight: '600' },
    avanzarBtn: {
      backgroundColor: colors.primary,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    avanzarText: { fontSize: 13, color: colors.white, fontWeight: '700' },

    empty: { alignItems: 'center', paddingVertical: spacing.huge, gap: spacing.sm },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, textAlign: 'center' },
    emptyText: {
      fontSize: 13,
      color: colors.muted,
      textAlign: 'center',
      lineHeight: 19,
      paddingHorizontal: spacing.xl,
    },
  });
