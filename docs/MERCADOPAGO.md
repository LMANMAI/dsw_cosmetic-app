# Integración Mercado Pago (marketplace) — estado y plan

Documento de referencia para retomar la integración de pagos cuando se decida
avanzar. **Hoy está pausada**: la app funciona con los pagos en modo prueba
(`PAGOS_HABILITADOS = false` en `src/services/pagos.service.ts`).

---

## Flujos de pago de la app

| Flujo | Quién paga → quién cobra | Dónde está |
| --- | --- | --- |
| Compra de insumos | profesional → proveedor | `pagos.service.ts` + pantalla del carrito |
| Seña de turno | cliente → profesional | `turnos.service.ts` (`confirmarPagoSena`, hoy stub) |
| Comisión mensual | profesional → plataforma | `comisiones.service.ts` |

En insumos y seña la plata va al **vendedor** (proveedor/profesional) y la
plataforma se queda una **comisión**. En comisiones, todo va a la plataforma.

---

## Decisiones tomadas

- **Modelo: marketplace de Mercado Pago (split de pagos).** Cada proveedor/
  profesional conecta su cuenta de MP por OAuth; al cobrar, MP reparte solo:
  el vendedor recibe su parte y la plataforma su comisión (`marketplace_fee`)
  en la misma transacción. Sin liquidación manual.
  - Ej.: cliente paga $1000, `marketplace_fee` = 2% → profesional $980*, dueño $20.
    (*MP además cobra su propia comisión de procesamiento, aparte.)
- **Producto: Checkout Pro** (redirect a MP y vuelta a la app vía WebBrowser).
- **Backend: Cloud Functions** (mismo proyecto Firebase) para crear la
  preferencia con split y confirmar el pago por webhook.

## Cómo conecta su cuenta el vendedor (OAuth)

1. En su perfil: botón **"Conectar mi cuenta"** (proveedor y profesional).
2. Se abre la autorización de MP → el vendedor entra con SU cuenta y autoriza.
3. MP vuelve con un `code` (dura 10 min) a la **Redirect URL** (una Cloud
   Function HTTPS).
4. La función cambia el `code` por el **access token del vendedor** (dura 180
   días, se refresca) usando `client_id` + `client_secret`, y lo guarda atado
   al `uid`.
5. Al cobrar, la función crea la preferencia con el token de ese vendedor +
   `marketplace_fee`.

## Aplicación de Mercado Pago (ya creada)

- Nombre: **yopi** · Integración con Checkout Pro · País: Argentina.
- **Client ID (N.° de aplicación): `5580735378580403`** (igual en test y prod).
- **Client Secret: pendiente** — solo aparece en *Credenciales de producción*
  (hay que "activar" las credenciales de producción para verlo; activar **NO**
  implica salir a producción ni mover plata real, solo destraba el secret).
  Es el **mismo** para test y producción.
- **Redirect URL: pendiente** — se completa con la URL de la Cloud Function de
  OAuth cuando se cree (campo en *Configuración de la aplicación → Configuración
  avanzada*). PKCE: **No**. Permisos: read, write, **offline access** (refresh).
- **Usuarios de prueba** creados (un vendedor y un comprador) para testear el
  split sin plata real.

> Nota de seguridad: el `client_secret` y los access tokens van a **Secret
> Manager** (como la contraseña SMTP del email), nunca hardcodeados. Cambiar de
> test a prod = no se cambian estas credenciales (son las mismas); solo cambian
> los usuarios que conectan (prueba → reales).

---

## Pendiente para retomar

1. Activar credenciales de producción y obtener el **Client Secret** → cargarlo
   en Secret Manager.
2. **Cloud Function de OAuth** (recibe `code`, lo cambia por token, lo guarda) →
   de ahí sale la **Redirect URL** para configurar en MP.
3. Botón **"Conectar mi cuenta"** + estado conectada/no conectada en los perfiles
   de proveedor y profesional.
4. **Cloud Function de preferencia con split** (`marketplace_fee`) + **webhook**
   de confirmación de pago → actualizar pedido/turno.
5. Poner `PAGOS_HABILITADOS = true` cuando esté todo probado.
6. Manejo de "vendedor sin cuenta conectada" (no puede cobrar): bloquear o avisar.

## Links útiles (doc oficial)

- OAuth / Seguridad: https://www.mercadopago.com.ar/developers/es/docs/security/oauth
- Split de pagos: https://www.mercadopago.com.ar/developers/es/docs/split-payments/landing
- Crear/refrescar token: https://www.mercadopago.com.ar/developers/es/reference/authentication/oauth/_oauth_token/post
