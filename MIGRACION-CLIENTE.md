# Guía de migración al entorno del cliente

Checklist para mover la app de tu entorno de pruebas (proyecto `yopi-demo`,
tu Gmail, tus credenciales) al **proyecto y las cuentas del cliente**.

> Idea general: el **código no cambia**. Lo que cambia es a qué proyecto de
> Firebase apunta y con qué credenciales corre. Hacé los pasos en orden y
> probá al final.

---

## 0. Antes de empezar (cuentas del cliente)

El cliente (o vos en su nombre) necesita tener creadas estas cuentas:

- [ ] **Proyecto de Firebase** propio, con plan **Blaze** activado.
- [ ] **Cuenta de Mercado Pago** (para los cobros reales).
- [ ] **Cuenta de Cloudinary** (para las imágenes) — o seguir usando la tuya.
- [ ] **Proveedor de email** transaccional (Resend / SendGrid / Amazon SES) con
      el **dominio del cliente verificado** (SPF/DKIM).
- [ ] **Google Maps Platform** con API key propia (mapas y geocoding).
- [ ] **Cuenta de Apple Developer** (US$99/año) si se publica en iOS, y/o
      cuenta de **Google Play Console** para Android.
- [ ] **Cuenta de Expo / EAS** del cliente (para los builds).

---

## 1. Firebase (proyecto y conexión de la app)

- [ ] En `src/services/firebase.ts`, reemplazar **todo el objeto
      `firebaseConfig`** por el del proyecto del cliente
      (Firebase Console → Configuración del proyecto → Tus apps → Config).
      Cambian: `apiKey`, `authDomain`, `projectId`, `storageBucket`,
      `messagingSenderId`, `appId`, `measurementId`.
- [ ] En `.firebaserc`, cambiar `"default": "yopi-demo"` por el **project id
      del cliente**.
- [ ] Activar en el proyecto del cliente: **Authentication** (Email/Password y
      Google), **Firestore** y **Storage** (si se usa).

---

## 2. Reglas e índices de Firestore

- [ ] Desplegar las reglas al proyecto del cliente:
      `firebase deploy --only firestore:rules`
- [ ] Verificar que no falten índices (las queries actuales no necesitan
      índices compuestos, pero si la consola pide uno, crealo con el link que
      muestra el error).

---

## 3. Datos base (catálogo y rubros)

El catálogo de servicios, las categorías y los rubros tienen fallback local,
pero conviene sembrarlos en Firestore del cliente:

- [ ] Correr una vez el seed del catálogo (`seedCatalogo`) y el de rubros
      (`rubrosService.seed()`) — p. ej. desde un botón temporal de dev/admin.
- [ ] (Opcional) Productos demo con `productosService.seed()`. En producción
      los cargan los proveedores reales.

---

## 4. Cloud Functions (push + email)

- [ ] Con `.firebaserc` ya apuntando al cliente, desplegar:
      `cd functions && npm install && cd ..`
      `firebase deploy --only functions`
- [ ] Verificar en Firebase Console → Functions que se crearon las tres:
      `notificarPedidoProveedor`, `notificarTurnoProfesional`,
      `recordatoriosTurnosCliente`.
- [ ] (Recomendado) Subir el runtime si Node 22 quedó deprecado para esa fecha
      (ver `functions/package.json` y `firebase.json`).

---

## 5. Extensión de email (Trigger Email)

- [ ] Reinstalar / reconfigurar la extensión **en el proyecto del cliente** con
      datos de producción. Editar `extensions/firestore-send-email.env`:
  - `MAIL_COLLECTION=mail` (no tocar — es donde escriben las funciones).
  - `DEFAULT_FROM` → un remitente del **dominio del cliente**
    (ej. `pedidos@dominio-del-cliente.com`), **no Gmail**.
  - `SMTP_CONNECTION_URI` → la de su proveedor transaccional. Ejemplos:
    - Resend: `smtps://resend@smtp.resend.com:465`
    - SendGrid: `smtps://apikey@smtp.sendgrid.net:465`
    - Amazon SES: `smtps://USUARIO_SMTP@email-smtp.REGION.amazonaws.com:465`
  - `DATABASE_REGION` y la location → la región de la Firestore del cliente.
  - La **contraseña/API key SMTP** se guarda como secreto al desplegar
    (no va en texto plano en el `.env`).
- [ ] Verificar el **dominio** en el proveedor de email (SPF/DKIM) para que no
      caiga en spam.
- [ ] Desplegar: `firebase deploy --only extensions`.
- [ ] La colección `mail` queda **bloqueada** en las reglas (solo la función la
      escribe). No cambiar eso.

---

## 6. Notificaciones push (Expo / EAS)

- [ ] En `app.json`, bajo `extra.eas.projectId`, poner el **projectId de EAS
      del cliente** (lo crea `eas init` en la cuenta del cliente).
- [ ] Definir el `bundleIdentifier` (iOS) y `package` (Android) **del cliente**
      (hoy `com.beautyapp.mobile`).
- [ ] **iOS**: con la cuenta de Apple Developer del cliente, EAS genera las
      credenciales de APNs en el primer build de producción.
- [ ] **Android**: EAS gestiona FCM; verificar que el proyecto de Firebase del
      cliente tenga la app Android registrada (para FCM).
- [ ] Probar el push en un **build real** (no Expo Go) en un dispositivo físico.

---

## 7. Mercado Pago (cobros reales)

- [ ] En `src/services/pagos.service.ts`:
  - Poner el **access token** de la cuenta de MP del cliente en
    `MP_ACCESS_TOKEN`.
  - Cambiar `PAGOS_HABILITADOS` a **`true`** cuando quieran cobrar de verdad.
- [ ] En `src/services/comisiones.service.ts`, actualizar
      `MP_CONFIG.accessToken` con el mismo token.
- [ ] Revisar las `back_urls` / deep links (`beautyapp://...`): si cambia el
      `scheme` de la app, actualizarlos.
- [ ] **Recomendado para producción**: mover la creación de la preferencia de
      MP a una Cloud Function (para no exponer el access token en la app), y
      confirmar el pago por **webhook** en vez del retorno del navegador.

---

## 8. Imágenes (Cloudinary)

- [ ] En `src/services/upload.service.ts`, reemplazar `CLOUD_NAME` y
      `UPLOAD_PRESET` por los de la cuenta de Cloudinary del cliente
      (o dejar la tuya si se acordó así).

---

## 9. Google Maps

- [ ] En `app.json`, reemplazar las **API keys de Google Maps** (aparece en
      `ios.config.googleMapsApiKey` y `android.config.googleMaps.apiKey`) por
      la del cliente, con las APIs habilitadas: Maps SDK (iOS/Android),
      Geocoding y Places si se usan.

---

## 10. Identidad de la app

- [ ] `app.json`: revisar `name`, `slug`, `scheme`, íconos y splash si la marca
      cambia para el cliente.

---

## 11. Facturación y monitoreo

- [ ] En el proyecto del cliente: **Budget alert** en Google Cloud
      (Billing → Budgets & alerts).
- [ ] Revisar la política de limpieza de imágenes de Artifact Registry (la que
      configuraste en 3 días) por si quieren otro valor.

---

## 12. Prueba final (de punta a punta)

- [ ] Registro de los 3 roles (cliente, profesional, proveedor).
- [ ] Proveedor carga un producto → aparece en la tienda.
- [ ] Profesional compra → paga con MP → el proveedor recibe **push + email**.
- [ ] Proveedor confirma y marca enviado (con correo y seguimiento) → el
      profesional lo ve en Mis pedidos.
- [ ] Cliente reserva un turno → el profesional recibe **push + email**.
- [ ] Llega el **recordatorio push** al cliente antes del turno.
- [ ] Verificar en Firestore que la colección `mail` muestra `delivery: SUCCESS`.

---

### Resumen de archivos a tocar

| Qué | Archivo |
| --- | --- |
| Conexión Firebase | `src/services/firebase.ts` |
| Proyecto por defecto (CLI) | `.firebaserc` |
| Extensión de email | `extensions/firestore-send-email.env` |
| Mercado Pago (pedidos) | `src/services/pagos.service.ts` |
| Mercado Pago (comisiones) | `src/services/comisiones.service.ts` |
| Cloudinary | `src/services/upload.service.ts` |
| Maps, EAS projectId, bundle/scheme | `app.json` |
| Runtime de functions | `functions/package.json`, `firebase.json` |
