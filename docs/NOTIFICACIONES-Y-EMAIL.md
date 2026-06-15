# Notificaciones (push) y Email

Cómo está armado el sistema de avisos de la app y cómo configurarlo/probarlo.
Todo vive en el mismo repo y se despliega al mismo proyecto de Firebase.

---

## Resumen

Hay **3 Cloud Functions** (en `functions/index.js`) que mandan **push** vía
Expo Push API y, en dos casos, **email** vía la extensión Trigger Email:

| Función | Cuándo | A quién | Push | Email |
| --- | --- | --- | :-: | :-: |
| `notificarPedidoProveedor` | un pedido pasa a pagado | proveedor | ✅ | ✅ |
| `notificarTurnoProfesional` | se crea un turno | profesional | ✅ | ✅ |
| `recordatoriosTurnosCliente` | antes del turno (cada 15 min) | cliente | ✅ | — |

- El **push** lo entrega el sistema operativo (APNs/FCM), por eso llega con la
  app abierta o cerrada.
- El **email** se manda escribiendo un documento en la colección `mail`, que
  procesa la extensión **Trigger Email from Firestore**.
- Los avisos respetan los toggles del usuario (`notifPush`, `emailPedidos`,
  `preferencias.pushEnabled`).

---

## Push

### Cómo funciona
1. La app registra el **Expo push token** del dispositivo (`useRegistrarPush`)
   y lo guarda en `usuarios/{uid}.pushTokens`.
2. Cuando ocurre el evento, la Cloud Function lee esos tokens y le pega a la
   Expo Push API.

### Probar push (IMPORTANTE)
- **No funciona en Expo Go** (desde SDK 53 Expo Go no soporta push remoto) ni
  en simulador.
- Hay que usar un **build real** (development/preview/production) en un
  **dispositivo físico**.
  - Android es lo más rápido (no requiere cuenta paga): `npm run generate`.
  - iOS requiere **cuenta de Apple Developer** (US$99/año):
    `eas device:create` + `eas build -p ios --profile development`.
- El usuario tiene que **abrir la app al menos una vez** para que se guarde su
  token; si no, no hay a dónde enviar.

### Verificar sin dispositivo
`firebase functions:log` muestra cuándo se dispara cada función y la respuesta
de la Expo Push API.

---

## Email (extensión Trigger Email)

Las funciones **encolan** el email escribiendo en `mail` con este formato:

```
to:  "destinatario@dominio.com"          // string o array
message (map)
   subject: "Asunto"                     // string
   html: "<p>Cuerpo HTML</p>"            // string
```

La extensión lee esa colección y lo envía por SMTP.

### Parámetros usados al instalar (proyecto de pruebas `yopi-demo`)
- **Email documents collection**: `mail`  ← no cambiar, las funciones escriben acá
- **Firestore region / location**: `southamerica-east1` (igual que la base)
- **Authentication Type**: Username & Password
- **SMTP connection URI**: `smtps://lcasmanmaidana%40gmail.com@smtp.gmail.com:465`
  (el `%40` es el `@` del mail; el puerto 465 es SSL)
- **SMTP password**: la **App Password** de Gmail (16 caracteres), guardada como
  secreto en Secret Manager
- **Default FROM**: `lcasmanmaidana@gmail.com`
- **TTL**: Month / 1 (los registros de `mail` se autoborran al mes)

El archivo generado queda en `extensions/firestore-send-email.env` (la
contraseña NO va ahí, va en Secret Manager).

### App Password de Gmail
1. La cuenta necesita **Verificación en 2 pasos** activada.
2. La opción está escondida; se entra directo por:
   **https://myaccount.google.com/apppasswords**
3. Le ponés un nombre, te da 16 caracteres → usalos **sin espacios**.
4. Se puede revocar/regenerar cuando quieras desde esa misma página.

### Probar el email
En Firestore Console, crear un documento en la colección **`mail`** (raíz):

```
to:  "tu-email@gmail.com"
message (map)
   subject: "Prueba"
   html: "<p>Funciona</p>"
```

A los pocos segundos aparece el campo **`delivery`** con `state`:
- `SUCCESS` → enviado (revisá la casilla / spam).
- `ERROR` → el campo `delivery.error` dice el motivo (ver abajo).

> La extensión procesa cada documento **una sola vez al crearse**. Si editás un
> doc con error, NO reenvía: creá uno nuevo para reprobar.

---

## Errores comunes y solución

| `delivery.error` | Causa | Solución |
| --- | --- | --- |
| `Field 'message.subject' must be a string` | `subject` no es string, está vacío, mal escrito o fuera del map `message` | Recrear el doc con `subject`/`html` como **string** dentro de `message` |
| `Missing credentials for "PLAIN"` | la **SMTP password está vacía** (no se cargó la App Password) | Reconfigurar la extensión y setear **SMTP password** con la App Password |
| `Invalid login` / `535` | usuario o contraseña SMTP incorrectos | Revisar el `SMTP_CONNECTION_URI` y regenerar/recargar la App Password |

### Reconfigurar la extensión
Firebase Console → **Extensions** → **Trigger Email from Firestore** →
**⋮ → Reconfigurar extensión** → cambiás el parámetro → **Guardar** (redeploya).
Casi todos los parámetros se pueden cambiar después (la región no).

---

## Producción

Para el entorno del cliente, ver `MIGRACION-CLIENTE.md`. En resumen:
- Reemplazar Gmail por un proveedor transaccional (**Resend / SendGrid / SES**).
- **Verificar el dominio** del cliente (SPF/DKIM) para no caer en spam.
- `DEFAULT_FROM` con el dominio del cliente.
- La colección `mail` queda **bloqueada** en las reglas: solo la Cloud Function
  (admin) escribe ahí.
