/**
 * Upload de imágenes a Cloudinary (unsigned upload).
 *
 * Configuración:
 *  1. Creá una cuenta en https://cloudinary.com (free tier: 25 GB storage + 25 GB bandwidth/mes)
 *  2. En Settings → Upload → Upload Presets, creá un preset "unsigned"
 *  3. Reemplazá CLOUD_NAME y UPLOAD_PRESET con tus valores
 */

// ──── CONFIGURAR ESTOS VALORES ────
const CLOUD_NAME = 'dpgrqqshe';
const UPLOAD_PRESET = 'yopi-app';
// ───────────────────────────────────

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

/**
 * Sube una imagen a Cloudinary y retorna la URL pública.
 * @param uri    URI local de la imagen (desde ImagePicker)
 * @param folder Carpeta en Cloudinary, p. ej. "salones" o "avatars"
 */
export async function uploadImage(uri: string, folder?: string): Promise<string> {
  const formData = new FormData();

  // React Native acepta este formato para FormData con archivos locales
  formData.append('file', {
    uri,
    type: 'image/jpeg',
    name: 'upload.jpg',
  } as any);

  formData.append('upload_preset', UPLOAD_PRESET);

  if (folder) {
    formData.append('folder', folder);
  }

  const response = await fetch(CLOUDINARY_URL, {
    method: 'POST',
    body: formData,
    // No poner Content-Type header — fetch lo setea automáticamente con el boundary correcto
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Cloudinary upload failed: ${response.status} — ${errorBody}`);
  }

  const data = await response.json();
  return data.secure_url as string;
}
