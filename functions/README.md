# Cloud Functions — BeautyApp

Notificaciones push para el proveedor cuando entra un pedido pagado.
Vive en el mismo repo y se despliega al mismo proyecto de Firebase (`yopi-demo`).

## Qué hace

Tres funciones, todas envían push vía Expo Push API (llegan con la app abierta
o cerrada, lo entrega el sistema operativo):

- **notificarPedidoProveedor** — al proveedor cuando un pedido pasa a pagado.
- **notificarTurnoProfesional** — al profesional cuando recibe un turno nuevo.
- **recordatoriosTurnosCliente** — programada (cada 15 min): le manda al cliente
  el recordatorio antes de su turno, según `recordatorioCliente` (1h/2h/24h).

Todas respetan los toggles de notificaciones del usuario y solo envían si el
usuario tiene tokens de push guardados.

> La función programada usa Cloud Scheduler, que se habilita solo al desplegar
> (requiere Blaze, ya activo). Como el recordatorio ahora lo manda el servidor,
> la app dejó de agendar el recordatorio local del cliente para no duplicar.

## Deploy (una vez configurado Blaze, que ya lo está)

```bash
# 1. Instalar la CLI de Firebase (si no la tenés)
npm install -g firebase-tools

# 2. Iniciar sesión
firebase login

# 3. Instalar dependencias de la función
cd functions
npm install
cd ..

# 4. Desplegar solo las functions
firebase deploy --only functions
```

Para actualizar las reglas de Firestore: `firebase deploy --only firestore:rules`.

## Probar

1. Abrí la app con un usuario proveedor en un dispositivo real (en simulador o
   Expo Go el token de push puede no generarse). Eso guarda el token en
   `usuarios/{uid}.pushTokens`.
2. Desde otra cuenta (profesional), comprá un insumo de ese proveedor.
3. Al confirmarse el pago, el proveedor recibe el push aunque tenga la app cerrada.

Los logs de la función se ven con `firebase functions:log` o en la consola.

## Email (vía extensión Trigger Email)

Las funciones ya **encolan** los emails escribiendo en la colección `mail`:
- al **proveedor** cuando entra un pedido pagado (respeta "Email por cada pedido"),
- al **profesional** cuando recibe un turno.

Para que esos correos se **envíen** de verdad, instalá la extensión oficial una vez:

1. Firebase Console → **Extensions** → buscá **"Trigger Email from Firestore"** → Install.
2. Configurá:
   - **Collection**: `mail` (es la que usan las funciones).
   - **SMTP connection URI**: la de tu proveedor de email. Para producción usá
     **Resend / SendGrid / Amazon SES** (no Gmail). Ej. Resend:
     `smtps://resend:RE_xxx@smtp.resend.com:465`.
   - **Default FROM**: un remitente de tu dominio (ej. `pedidos@tudominio.com`).
3. Verificá tu dominio en el proveedor (SPF/DKIM) para que no caiga en spam.

La colección `mail` está **bloqueada** en las reglas: solo la Cloud Function
(con permisos admin) puede escribir ahí, así nadie puede mandar correos arbitrarios.

Mientras la extensión no esté instalada, los documentos quedan guardados en `mail`
sin enviarse (no rompe nada).
