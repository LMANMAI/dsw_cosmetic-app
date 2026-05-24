import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useSession } from '@/context/SessionContext';
import { productosService } from '@/services';
import { useTheme, radius, spacing } from '@/theme';
import { formatARS } from '@/utils/format';
import type { PerfilProveedor, Producto } from '@/types/models';

const CATEGORIAS = ['Uñas', 'Cabello', 'Maquillaje', 'Skincare', 'Equipamiento', 'Otros'];

export default function ProductosProveedorScreen() {
  const { colors } = useTheme();
  const { user } = useSession();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const proveedorNombre = useMemo(
    () => (user?.perfil as PerfilProveedor | undefined)?.razonSocial ?? user?.nombre ?? '',
    [user],
  );

  const [items, setItems] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    if (!proveedorNombre) return;
    setLoading(true);
    try {
      const list = await productosService.listarDelProveedor(proveedorNombre);
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, [proveedorNombre]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onSave = async (data: Omit<Producto, 'id'>, id?: string) => {
    if (id) {
      await productosService.actualizar(id, data);
    } else {
      await productosService.crear({ ...data, proveedor: proveedorNombre });
    }
    setEditing(null);
    setCreating(false);
    refresh();
  };

  const onDelete = (p: Producto) => {
    Alert.alert(
      'Eliminar producto',
      `¿Borrar "${p.nombre}"? No se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await productosService.eliminar(p.id);
            setEditing(null);
            refresh();
          },
        },
      ],
    );
  };

  const onAdjustStock = async (p: Producto, delta: number) => {
    await productosService.ajustarStock(p.id, delta);
    refresh();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerWrap}>
        <ScreenHeader
          eyebrow="Tu catálogo"
          title="Productos"
          subtitle={`${items.length} productos cargados`}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: spacing.xxl, paddingBottom: 120, gap: spacing.md }}
          renderItem={({ item }) => (
            <ProductRow
              producto={item}
              onPress={() => setEditing(item)}
              onAdjust={(d) => onAdjustStock(item, d)}
              onDelete={() => onDelete(item)}
              colors={colors}
              styles={styles}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={32} color={colors.muted} />
              <Text style={styles.emptyTitle}>Todavía no cargaste productos</Text>
              <Text style={styles.emptyText}>
                Tocá el botón rosado para sumar el primero a tu catálogo.
              </Text>
            </View>
          }
        />
      )}

      <Pressable style={styles.fab} onPress={() => setCreating(true)}>
        <Ionicons name="add" size={28} color={colors.white} />
      </Pressable>

      <ProductEditor
        visible={creating || !!editing}
        producto={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSave={onSave}
        onDelete={editing ? () => onDelete(editing) : undefined}
        colors={colors}
        styles={styles}
      />
    </SafeAreaView>
  );
}


function ProductRow({
  producto,
  onPress,
  onAdjust,
  onDelete,
  colors,
  styles,
}: {
  producto: Producto;
  onPress: () => void;
  onAdjust: (delta: number) => void;
  onDelete: () => void;
  colors: ReturnType<typeof import('@/theme').useTheme>['colors'];
  styles: ReturnType<typeof createStyles>;
}) {
  const stockTone =
    producto.stock === 0 ? colors.danger : producto.stock < 5 ? colors.warning : colors.success;
  return (
    <Pressable onPress={onPress} onLongPress={onDelete} style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{producto.nombre}</Text>
        <Text style={styles.cardCat}>{producto.categoria}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardPrice}>{formatARS(producto.precio)}</Text>
          <View style={[styles.stockPill, { backgroundColor: `${stockTone}22` }]}>
            <Text style={[styles.stockText, { color: stockTone }]}>
              Stock: {producto.stock}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.stockBtns}>
        <Pressable
          onPress={() => onAdjust(-1)}
          hitSlop={6}
          style={styles.stepperBtn}
        >
          <Ionicons name="remove" size={18} color={colors.ink} />
        </Pressable>
        <Pressable
          onPress={() => onAdjust(1)}
          hitSlop={6}
          style={[styles.stepperBtn, styles.stepperBtnPrimary]}
        >
          <Ionicons name="add" size={18} color={colors.white} />
        </Pressable>
      </View>
    </Pressable>
  );
}


interface EditorProps {
  visible: boolean;
  producto: Producto | null;
  onClose: () => void;
  onSave: (data: Omit<Producto, 'id'>, id?: string) => Promise<void> | void;
  onDelete?: () => void;
  colors: ReturnType<typeof import('@/theme').useTheme>['colors'];
  styles: ReturnType<typeof createStyles>;
}

function ProductEditor({ visible, producto, onClose, onSave, onDelete, colors, styles }: EditorProps) {
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [descripcion, setDescripcion] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setNombre(producto?.nombre ?? '');
      setPrecio(producto?.precio?.toString() ?? '');
      setStock(producto?.stock?.toString() ?? '0');
      setCategoria(producto?.categoria ?? CATEGORIAS[0]);
      setDescripcion(producto?.descripcion ?? '');
      setImagenUrl(producto?.imagenUrl ?? '');
    }
  }, [visible, producto]);

  const handleSave = async () => {
    if (!nombre.trim()) {
      Alert.alert('Falta el nombre', 'Poné un nombre al producto.');
      return;
    }
    const precioNum = Number(precio);
    if (Number.isNaN(precioNum) || precioNum < 0) {
      Alert.alert('Precio inválido', 'Ingresá un número mayor o igual a 0.');
      return;
    }
    const stockNum = Number(stock);
    if (Number.isNaN(stockNum) || stockNum < 0) {
      Alert.alert('Stock inválido', 'Ingresá un número mayor o igual a 0.');
      return;
    }
    setSaving(true);
    try {
      await onSave(
        {
          nombre: nombre.trim(),
          precio: precioNum,
          stock: stockNum,
          categoria,
          descripcion: descripcion.trim() || undefined,
          imagenUrl: imagenUrl.trim() || undefined,
        },
        producto?.id,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.xxl }}>
            <Text style={styles.sheetTitle}>
              {producto ? 'Editar producto' : 'Nuevo producto'}
            </Text>

            <Field label="Nombre" required colors={colors} styles={styles}>
              <TextInput
                style={styles.input}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Esmalte permanente rojo"
                placeholderTextColor={colors.muted}
              />
            </Field>

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Field label="Precio (ARS)" required style={{ flex: 1 }} colors={colors} styles={styles}>
                <TextInput
                  style={styles.input}
                  value={precio}
                  onChangeText={setPrecio}
                  keyboardType="numeric"
                  placeholder="2500"
                  placeholderTextColor={colors.muted}
                />
              </Field>
              <Field label="Stock" required style={{ flex: 1 }} colors={colors} styles={styles}>
                <TextInput
                  style={styles.input}
                  value={stock}
                  onChangeText={setStock}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor={colors.muted}
                />
              </Field>
            </View>

            <Field label="Categoría" colors={colors} styles={styles}>
              <View style={styles.chipsRow}>
                {CATEGORIAS.map((c) => {
                  const active = categoria === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setCategoria(c)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{c}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Field>

            <Field label="Descripción" colors={colors} styles={styles}>
              <TextInput
                style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder="Detalles, aplicaciones, presentación..."
                placeholderTextColor={colors.muted}
                multiline
              />
            </Field>

            <Field label="URL de imagen (opcional)" colors={colors} styles={styles}>
              <TextInput
                style={styles.input}
                value={imagenUrl}
                onChangeText={setImagenUrl}
                placeholder="https://..."
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
              />
            </Field>

            <View style={{ height: spacing.lg }} />
            <Button
              variant="dark"
              label={producto ? 'Guardar cambios' : 'Crear producto'}
              onPress={handleSave}
              loading={saving}
              fullWidth
            />
            {onDelete ? (
              <Pressable onPress={onDelete} style={styles.deleteLink} hitSlop={8}>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text style={styles.deleteLinkLabel}>Eliminar producto</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={onClose} style={styles.cancelLink} hitSlop={8}>
              <Text style={styles.cancelLinkLabel}>Cancelar</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  required,
  children,
  style,
  colors,
  styles,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  style?: any;
  colors: ReturnType<typeof import('@/theme').useTheme>['colors'];
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={[{ marginBottom: spacing.md }, style]}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={{ color: colors.primary }}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof import('@/theme').useTheme>['colors']) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bone },
    headerWrap: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.white,
      borderRadius: radius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.md,
    },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.ink },
    cardCat: { fontSize: 12, color: colors.muted, marginTop: 2 },
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    cardPrice: { fontSize: 14, fontWeight: '700', color: colors.primary },
    stockPill: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    stockText: { fontSize: 11, fontWeight: '700' },
    stockBtns: { flexDirection: 'column', gap: 6 },
    stepperBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.bone,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.bone3,
    },
    stepperBtnPrimary: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    empty: { alignItems: 'center', paddingVertical: spacing.huge, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
    emptyText: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 2, paddingHorizontal: spacing.xxl },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.ink,
      shadowOpacity: 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    // modal
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
    sheetTitle: { fontSize: 20, fontWeight: '700', color: colors.ink, marginBottom: spacing.lg },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.muted,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    input: {
      backgroundColor: colors.bone,
      borderRadius: radius.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      fontSize: 15,
      color: colors.ink,
    },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.bone3,
      backgroundColor: colors.white,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipLabel: { fontSize: 12, fontWeight: '600', color: colors.muted },
    chipLabelActive: { color: colors.white },
    deleteLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: spacing.lg,
      paddingVertical: spacing.md,
    },
    deleteLinkLabel: { fontSize: 14, color: colors.danger, fontWeight: '600' },
    cancelLink: { paddingVertical: spacing.md, alignItems: 'center' },
    cancelLinkLabel: { fontSize: 14, color: colors.muted },
  });
