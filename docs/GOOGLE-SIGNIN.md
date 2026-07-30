# Google Sign-In (YOFI)

## El problema que resolvimos

Al tocar "Continuar con Google" en el celular aparecía:

```
Acceso bloqueado: error de autorización
Custom scheme URIs are not allowed for 'WEB' client type.
Error 400: invalid_request
```

**Causa:** `src/services/google-auth.ts` usaba `expo-auth-session` pasando el
**Web Client ID** como `androidClientId`. En una build nativa, `expo-auth-session`
arma el redirect con un custom scheme (`com.beautyapp.mobile:/oauthredirect`), y
Google solo acepta redirects `https://` para clients de tipo **Web**.

(El comentario que decía "expo-auth-session usa flujo web con custom scheme, por
eso se usa el Web Client ID" aplicaba al proxy `auth.expo.io`, eliminado en SDK 50.)

**Solución:** en Android/iOS ahora usamos el SDK nativo
`@react-native-google-signin/google-signin`, que no usa redirect URIs — Google
valida la app por *package name* + huella **SHA-1**. En web se sigue usando
`expo-auth-session` con el Web Client ID (ahí el redirect es https y es válido).

## Dónde funciona (y dónde no)

| Entorno | Google | Cómo correrlo |
| --- | --- | --- |
| **Expo Go** | ❌ imposible | — El binario de Expo Go no trae `RNGoogleSignin`, y el proxy `auth.expo.io` que permitía el flujo web se eliminó en SDK 50. Google rechaza los redirects `exp://`. El botón queda habilitado pero explica el motivo. El login con email sí funciona. |
| **Dev client (Android/iOS)** | ✅ | `npm run dev:android` (necesita Android Studio + JDK) o `npm run build:dev` (EAS, sin Android Studio). Una sola vez. Después `npm run start:dev` da el mismo hot reload que Expo Go. |
| **Build de EAS (preview/production)** | ✅ | `npm run generate` / `npm run generate:prod` |
| **Web** | ✅ | `npm run web` — usa `expo-auth-session` con el Web Client ID. Hay que agregar `http://localhost:8081` en el OAuth client de tipo **Web** (Orígenes autorizados de JavaScript + URI de redirección). |

**"Quiero probar local"** → dev client, no Expo Go. `expo start --dev-client` se conecta
igual por LAN, recarga igual, y además tiene los módulos nativos.

## Arquitectura

| Archivo | Rol |
| --- | --- |
| `src/services/google-native.ts` | Wrapper del SDK nativo: configure, signIn, signOut, traducción de errores. Carga perezosa para no romper web ni Expo Go. |
| `src/services/google-auth.ts` | Hook `useGoogleSignIn()`: elige nativo o web y entrega el `idToken` a Firebase. |
| `src/services/auth.service.ts` | `logout()` también hace `signOutNativo()`. |
| `app.json` → `extra.google` | Única fuente de verdad de los client IDs. |
| `app.config.js` | Lee `extra.google` y, si hay `iosClientId`, agrega el config plugin con el `iosUrlScheme` derivado. |

El hook devuelve `{ ready, disponible, loading, promptAsync }`.

- `ready`: el flujo está inicializado (solo es `false` transitoriamente en web).
- `disponible`: el entorno soporta Google. En Expo Go es `false` y la pantalla
  muestra el aviso `auth.googleRequiereDevBuild` debajo del botón.

### Client IDs

Se editan en un solo lugar, `app.json`:

```json
"extra": {
  "google": {
    "webClientId": "883387668629-qcc0h7....apps.googleusercontent.com",
    "iosClientId": null
  }
}
```

`app.config.js` también acepta `GOOGLE_WEB_CLIENT_ID` / `GOOGLE_IOS_CLIENT_ID` por
env var (útil para EAS secrets) y deriva el `iosUrlScheme` invirtiendo el iOS
Client ID, así no hay que mantener el mismo valor en dos lugares.

La elección nativo/web se hace **a nivel de módulo** (`Platform.OS` no cambia en
runtime). Importante: en nativo no se monta `Google.useAuthRequest`. Si se monta,
`expo-auth-session` tira un render error —
`Client Id property 'iosClientId' must be defined to use Google auth on this platform`—
y se cae toda la pantalla de login, incluido el login con email.

El login con Google es **complementario**: el de email/password no depende de él.
Cuando `ready` es `false` (Expo Go, o build sin el módulo nativo) solo se
deshabilita el botón de Google.

## Setup pendiente en Google Cloud Console

Proyecto: **yopi-demo** (número `883387668629`) — el mismo de Firebase, requisito
para que Firebase acepte el `id_token`.

### 1. Obtener las huellas SHA-1

```bash
eas credentials -p android
# elegir el perfil (preview / production) -> Keystore -> ver SHA-1
```

Si la app ya está publicada, agregar **también** el SHA-1 de *Google Play App
Signing* (Play Console → Configuración → Integridad de la app → Firma de apps).
Son dos huellas distintas: sin la de Play, el login falla solo en la versión
descargada de la tienda.

### 2. Crear el OAuth client de Android

APIs y servicios → Credenciales → Crear credenciales → **ID de cliente de OAuth**

- Tipo: **Android**
- Nombre del paquete: `com.beautyapp.mobile`
- Huella SHA-1: la del paso 1 (crear un client por cada huella)

No hay que registrar ningún redirect URI. Este client **no se referencia en el
código**: solo tiene que existir. Si falta o el SHA-1 no coincide, el SDK devuelve
`DEVELOPER_ERROR` (código 10).

### 3. Pantalla de consentimiento

Verificar que la app tenga la pantalla de consentimiento OAuth configurada y, si
está en modo *Testing*, que las cuentas de prueba estén en la lista de usuarios
autorizados (ej. `amarogon98@gmail.com`, `Jonatan.Grisi@gmail.com`).

### 4. Firebase

Authentication → Sign-in method → **Google** habilitado.
El Web Client ID que usa el código (`883387668629-qcc0h7...`) debe ser el
"Web SDK configuration" que muestra Firebase en ese proveedor.

### 5. iOS

1. Crear un OAuth client tipo **iOS** con bundle `com.beautyapp.mobile`.
2. Pegar el ID en `app.json` → `extra.google.iosClientId`.
3. Recompilar (`npm run dev:ios` o `npm run build:dev:ios`).

El paso 3 no es opcional: el config plugin agrega el URL scheme al `Info.plist`
durante el prebuild. Sin recompilar, el SDK abre Google y no puede volver a la app.

Mientras `iosClientId` sea `null`, en iOS el botón tira
`GoogleIosClientIdFaltanteError` con estas instrucciones, y el plugin no se agrega
(si se agregara con un scheme placeholder, el prebuild de iOS falla).

En Android el plugin no hace falta: el módulo se autolinkea y le pasamos el
`webClientId` por código.

## Probar

El SDK nativo **no funciona en Expo Go**. Hace falta compilar una vez:

```bash
# opción A: local, gratis, rápido de iterar (requiere Android Studio + JDK 17)
npm run dev:android

# opción B: en la nube, sin Android Studio (~15 min)
npm run build:dev        # instalar el APK que devuelve
```

Después, para el día a día:

```bash
npm run start:dev        # expo start --dev-client
```

Si el botón responde con "El módulo nativo no está en esta build", la app instalada
es anterior a la instalación de la dependencia: hay que recompilar, no alcanza con
reiniciar Metro.

## Errores frecuentes

| Síntoma | Causa |
| --- | --- |
| `DEVELOPER_ERROR` / código 10 | SHA-1 o package name no coinciden con el OAuth client de Android. |
| Funciona en el APK de EAS pero no desde Play Store | Falta el SHA-1 de Google Play App Signing. |
| `Custom scheme URIs are not allowed` | Volvió a usarse el flujo de `expo-auth-session` en nativo. |
| Firebase: `auth/invalid-credential` | El Web Client ID no pertenece al proyecto de Firebase. |
| `GoogleNativoNoDisponibleError` | Estás en Expo Go, o la build instalada no incluye el módulo nativo. Recompilar. |
| `GoogleIosClientIdFaltanteError` | Falta `extra.google.iosClientId` en `app.json` (solo iOS). |
| iOS: abre Google y no vuelve a la app | Se cargó el `iosClientId` pero no se recompiló: falta el URL scheme en el `Info.plist`. |
| Web: `redirect_uri_mismatch` en localhost | Falta `http://localhost:8081` en el OAuth client de tipo Web. |
| `TurboModuleRegistry.getEnforcing(...): 'RNGoogleSignin' could not be found` | Se importó el SDK nativo en Expo Go. `getModule()` corta antes vía `Constants.executionEnvironment`; un `try/catch` no alcanza porque Metro reporta el error al LogBox antes de re-lanzarlo. |
