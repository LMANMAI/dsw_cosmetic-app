import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import { Button } from '@/components/Button';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useSession } from '@/context/SessionContext';
import { productosService, catalogoService } from '@/services';
import { uploadImage } from '@/services/upload.service';
import { useTranslation, type TranslateFn } from '@/i18n';
import { useTheme, radius, spacing } from '@/theme';
import { formatARS } from '@/utils/format';
import type { Categoria, PerfilProveedor, Producto } from '@/types/models';

export default function ProductosProveedorScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { user } = useSession();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const proveedorId = user?.id ?? '';
  const perfilProv = user?.perfil as PerfilProveedor | undefined;
  const proveedorNombre = useMemo(
    () => perfilProv?.razonSocial ?? user?.nombre ?? '',
    [perfilProv, user],
  );

  const [items, setItems] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    catalogoService.listarCategorias().then(setCategorias);
  }, []);

  const refresh = useCallback(async () => {
    if (!proveedorId) return;
    setLoading(true);
    try {
      const list = await productosService.listarDelProveedor(proveedorId);
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, [proveedorId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onSave = async (
    data: Omit<Producto, 'id' | 'proveedorId' | 'proveedorNombre'>,
    id?: string,
  ) => {
    if (id) {
      await productosService.actualizar(id, data);
    } else {
      await productosService.crear({
        ...data,
        proveedorId,
        proveedorNombre,
        entregaEnvio: perfilProv?.envioPropio ?? true,
        entregaRetiro: perfilProv?.retiroLocal ?? false,
      });
    }
    setEditing(null);
    setCreating(false);
    refresh();
  };

  const onDelete = (p: Producto) => {
    Alert.alert(
      t('proveedor.productos.eliminarTitulo'),
      t('proveedor.productos.eliminarMsg', { nombre: p.nombre }),
      [
        { text: t('comun.cancelar'), style: 'cancel' },
        {
          text: t('comun.eliminar'),
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
          eyebrow={t('proveedor.productos.eyebrow')}
          title={t('proveedor.productos.titulo')}
          subtitle={t('proveedor.productos.subtitulo', { count: items.length })}
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
              categorias={categorias}
              onPress={() => setEditing(item)}
              onAdjust={(d) => onAdjustStock(item, d)}
              onDelete={() => onDelete(item)}
              colors={colors}
              styles={styles}
              t={t}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={32} color={colors.muted} />
              <Text style={styles.emptyTitle}>{t('proveedor.productos.vacioTitulo')}</Text>
              <Text style={styles.emptyText}>{t('proveedor.productos.vacioMsg')}</Text>
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
        categorias={categorias}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSave={onSave}
        onDelete={editing ? () => onDelete(editing) : undefined}
        colors={colors}
        styles={styles}
        t={t}
      />
    </SafeAreaView>
  );
}


function ProductRow({
  producto,
  categorias,
  onPress,
  onAdjust,
  onDelete,
  colors,
  styles,
  t,
}: {
  producto: Producto;
  categorias: Categoria[];
  onPress: () => void;
  onAdjust: (delta: number) => void;
  onDelete: () => void;
  colors: ReturnType<typeof import('@/theme').useTheme>['colors'];
  styles: ReturnType<typeof createStyles>;
  t: TranslateFn;
}) {
  const stockTone =
    producto.stock === 0 ? colors.danger : producto.stock < 5 ? colors.warning : colors.success;
  const cat = categorias.find((c) => c.slug === producto.categoria);
  return (
    <Pressable onPress={onPress} onLongPress={onDelete} style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{producto.nombre}</Text>
        <Text style={styles.cardCat}>{cat ? `${cat.emoji} ${t(`categorias.${cat.slug}`)}` : producto.categoria}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardPrice}>{formatARS(producto.precio)}</Text>
          <View style={[styles.stockPill, { backgroundColor: `${stockTone}22` }]}>
            <Text style={[styles.stockText, { color: stockTone }]}>
              {t('proveedor.productos.stock', { count: producto.stock })}
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
  categorias: Categoria[];
  onClose: () => void;
  onSave: (data: Omit<Producto, 'id' | 'proveedorId' | 'proveedorNombre'>, id?: string) => Promise<void> | void;
  onDelete?: () => void;
  colors: ReturnType<typeof import('@/theme').useTheme>['colors'];
  styles: ReturnType<typeof createStyles>;
}

function ProductEditor({ visible, producto, categorias, onClose, onSave, onDelete, colors, styles, t }: EditorProps & { t: TranslateFn }) {
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [imagenUri, setImagenUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [subiendo, setSubiendo] = useState(false);

  useEffect(() => {
    if (visible) {
      setNombre(producto?.nombre ?? '');
      setPrecio(producto?.precio?.toString() ?? '');
      setStock(producto?.stock?.toString() ?? '0');
      setCategoria(producto?.categoria ?? '');
      setDescripcion(producto?.descripcion ?? '');
      setImagenUri(producto?.imagenUrl ?? null);
    }
  }, [visible, producto]);

  // Categoría por defecto cuando cargan las categorías y todavía no hay una elegida.
  useEffect(() => {
    if (visible && !categoria && categorias.length) {
      setCategoria(producto?.categoria ?? categorias[0].slug);
    }
  }, [visible, categoria, categorias, producto]);

  const elegirImagen = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('proveedor.productos.permisoNecesarioTitulo'), t('proveedor.productos.permisoGaleriaMsg'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImagenUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!nombre.trim()) {
      Alert.alert(t('proveedor.productos.faltaNombreTitulo'), t('proveedor.productos.faltaNombreMsg'));
      return;
    }
    const precioNum = Number(precio);
    if (Number.isNaN(precioNum) || precioNum < 0) {
      Alert.alert(t('proveedor.productos.precioInvalidoTitulo'), t('proveedor.productos.precioInvalidoMsg'));
      return;
    }
    const stockNum = Number(stock);
    if (Number.isNaN(stockNum) || stockNum < 0) {
      Alert.alert(t('proveedor.productos.stockInvalidoTitulo'), t('proveedor.productos.stockInvalidoMsg'));
      return;
    }
    if (!categoria) {
      Alert.alert(t('proveedor.productos.faltaCategoriaTitulo'), t('proveedor.productos.faltaCategoriaMsg'));
      return;
    }
    setSaving(true);
    try {
      // Si la imagen es un archivo local recién elegido, lo subimos a Cloudinary.
      let imagenUrl = producto?.imagenUrl;
      if (imagenUri && !/^https?:\/\//.test(imagenUri)) {
        setSubiendo(true);
        try {
          imagenUrl = await uploadImage(imagenUri, 'productos');
        } catch (e) {
          console.warn('[productos] upload error', e);
          Alert.alert(t('proveedor.productos.errorSubirImagenTitulo'), t('proveedor.productos.errorSubirImagenMsg'));
          return;
        } finally {
          setSubiendo(false);
        }
      } else {
        imagenUrl = imagenUri ?? undefined;
      }

      await onSave(
        {
          nombre: nombre.trim(),
          precio: precioNum,
          stock: stockNum,
          categoria,
          descripcion: descripcion.trim() || undefined,
          imagenUrl,
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
              {producto ? t('proveedor.productos.editarProducto') : t('proveedor.productos.nuevoProducto')}
            </Text>

            <Field label={t('proveedor.productos.nombre')} required colors={colors} styles={styles}>
              <TextInput
                style={styles.input}
                value={nombre}
                onChangeText={setNombre}
                placeholder={t('proveedor.productos.nombrePlaceholder')}
                placeholderTextColor={colors.muted}
              />
            </Field>

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Field label={t('proveedor.productos.precioLabel')} required style={{ flex: 1 }} colors={colors} styles={styles}>
                <TextInput
                  style={styles.input}
                  value={precio}
                  onChangeText={setPrecio}
                  keyboardType="numeric"
                  placeholder="2500"
                  placeholderTextColor={colors.muted}
                />
              </Field>
              <Field label={t('proveedor.productos.stockLabel')} required style={{ flex: 1 }} colors={colors} styles={styles}>
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

            <Field label={t('proveedor.productos.categoriaLabel')} required colors={colors} styles={styles}>
              <View style={styles.chipsRow}>
                {categorias.map((c) => {
                  const active = categoria === c.slug;
                  return (
                    <Pressable
                      key={c.slug}
                      onPress={() => setCategoria(c.slug)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                        {c.emoji} {t(`categorias.${c.slug}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Field>

            <Field label={t('proveedor.productos.descripcion')} colors={colors} styles={styles}>
              <TextInput
                style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder={t('proveedor.productos.descripcionPlaceholder')}
                placeholderTextColor={colors.muted}
                multiline
              />
            </Field>

            <Field label={t('proveedor.productos.imagenOpcional')} colors={colors} styles={styles}>
              <Pressable style={styles.imagePicker} onPress={elegirImagen}>
                {imagenUri ? (
                  <Image source={{ uri: imagenUri }} style={styles.imagePreview} resizeMode="cover" />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera-outline" size={28} color={colors.muted} />
                    <Text style={styles.imagePlaceholderText}>{t('proveedor.productos.tocaElegirFoto')}</Text>
                  </View>
                )}
              </Pressable>
              {imagenUri ? (
                <Pressable onPress={() => setImagenUri(null)} hitSlop={8} style={styles.removeImageLink}>
                  <Ionicons name="trash-outline" size={14} color={colors.danger} />
                  <Text style={styles.removeImageText}>{t('proveedor.productos.quitarImagen')}</Text>
                </Pressable>
              ) : null}
            </Field>

            <View style={{ height: spacing.lg }} />
            <Button
              variant="dark"
              label={
                subiendo
                  ? t('proveedor.productos.subiendoImagen')
                  : producto
                    ? t('proveedor.productos.guardarCambios')
                    : t('proveedor.productos.crearProducto')
              }
              onPress={handleSave}
              loading={saving || subiendo}
              fullWidth
            />
            {onDelete ? (
              <Pressable onPress={onDelete} style={styles.deleteLink} hitSlop={8}>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text style={styles.deleteLinkLabel}>{t('proveedor.productos.eliminarProducto')}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={onClose} style={styles.cancelLink} hitSlop={8}>
              <Text style={styles.cancelLinkLabel}>{t('comun.cancelar')}</Text>
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
    imagePicker: {
      borderRadius: radius.md,
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: colors.bone3,
      borderStyle: 'dashed',
      backgroundColor: colors.bone,
    },
    imagePreview: { width: '100%', height: 160, borderRadius: radius.md },
    imagePlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxl,
      gap: spacing.sm,
    },
    imagePlaceholderText: { fontSize: 13, color: colors.muted, fontWeight: '500' },
    removeImageLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      marginTop: spacing.sm,
    },
    removeImageText: { fontSize: 12, color: colors.danger, fontWeight: '600' },
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
