# Guía de publicación de YOFI — Play Store y App Store

Guía específica para este proyecto: **Expo SDK 54 + EAS Build/Submit** (project ID ya configurado: `285d6d01-...`). Package/Bundle ID: `com.beautyapp.mobile`.

---

## Parte 0 — Antes de empezar (aplica a ambas tiendas)

### 0.1 Crear las cuentas de desarrollador

| | Google Play Console | Apple Developer Program |
|---|---|---|
| URL | https://play.google.com/console/signup | https://developer.apple.com/programs/enroll |
| Costo | USD 25 (pago único) | USD 99/año |
| Tiempo de aprobación | 1–3 días (verificación de identidad) | 1–2 días (hasta 1 semana si piden documentos) |
| Requisitos | Cuenta Google, tarjeta, documento de identidad | Apple ID con 2FA activado, tarjeta, documento |

Consejos:
- En Google, si registrás **cuenta personal** (no empresa) aplica el requisito de testing cerrado (ver Parte 1.5). Con cuenta de **organización** (requiere D-U-N-S) no aplica, pero es más trámite.
- En Apple, para publicar necesitás inscribirte al **Developer Program pago**; la cuenta gratuita no permite subir a App Store. Si tenés empresa registrada podés inscribirte como organización (requiere D-U-N-S), si no, como individuo (la app aparecerá con tu nombre como vendedor).
- **Para compilar iOS no necesitás Mac**: EAS Build compila en la nube.

### 0.2 Preparativos del proyecto (pendientes detectados en tu código)

1. **`apiBaseUrl` es un placeholder**: en `app.json` → `extra.apiBaseUrl` figura `https://api.beautyapp.local`. Cambialo por la URL real de producción antes de compilar.
2. **API key de Google Maps expuesta en `app.json`**: restringila en Google Cloud Console (por package name + SHA-1 para Android, por bundle ID para iOS). El SHA-1 de producción lo obtenés con `eas credentials -p android` una vez creada la keystore.
3. **Versión**: `version: 0.1.0`. Para lanzar, subilo a `1.0.0`. Con `appVersionSource: "remote"` y `autoIncrement: true` en `eas.json`, EAS maneja `versionCode`/`buildNumber` automáticamente — no hace falta tocarlos.
4. **Íconos y splash**: ya tenés `icon.png`, `adaptive-icon.png` y `splash.png`. Verificá que `icon.png` sea 1024×1024 sin transparencia (requisito de Apple).
5. **Política de privacidad (OBLIGATORIA en ambas tiendas)**: tu app usa ubicación, notificaciones, cámara/galería y Firebase → necesitás una URL pública con la política. Podés hostearla gratis en GitHub Pages, Notion o Firebase Hosting.
6. **Cuenta demo para revisores**: la app tiene login (Firebase). Apple exige credenciales de prueba para revisar; creá un usuario demo con datos cargados.
7. **Instalar EAS CLI y loguearte**:

```bash
npm install -g eas-cli
eas login
```

---

## Parte 1 — Google Play Store

### 1.1 Crear la cuenta (día 1)

1. Andá a https://play.google.com/console/signup con la cuenta Google que quieras usar.
2. Elegí tipo de cuenta (personal u organización), pagá los USD 25 y completá la verificación de identidad.
3. Esperá el mail de aprobación (1–3 días).

### 1.2 Crear la app en Play Console

1. Play Console → **Crear app**.
2. Nombre: `YOFI` · Idioma: Español · Tipo: App · Gratis o de pago.
3. Aceptá las declaraciones y creá.

### 1.3 Completar las fichas obligatorias (Panel → "Configura tu app")

- **Ficha de Play Store**: descripción corta (80 caracteres), descripción larga (4000), ícono 512×512, banner 1024×500, mínimo 2 capturas de pantalla por tipo de dispositivo (sacalas de un build en tu teléfono o emulador).
- **Política de privacidad**: la URL del punto 0.2.5.
- **Seguridad de los datos**: declará que recolectás ubicación, info personal (email/nombre por Firebase Auth), fotos. Sé preciso: inconsistencias causan rechazos.
- **Clasificación de contenido**: cuestionario IARC (para YOFI: sin violencia, apto para todos, pero declará que hay interacción entre usuarios si aplica).
- **Público objetivo**: 18+ recomendado si hay contacto entre clientas y profesionales.
- **Anuncios**: declarar si mostrás publicidad (probablemente no).

### 1.4 Compilar y subir el primer build

```bash
# Compilar AAB de producción (EAS genera y guarda la keystore automáticamente — no la pierdas, queda en tu cuenta Expo)
eas build -p android --profile production
```

Primera subida: **manual**. Descargá el `.aab` desde https://expo.dev y subilo en Play Console → Testing → **Prueba cerrada** → Crear versión.

Para automatizar las siguientes subidas con `eas submit`:

1. Creá un **Service Account** en Google Cloud Console (IAM → Service Accounts) y descargá la key JSON.
2. En Play Console → Usuarios y permisos → invitá el email del service account con permiso de administrar versiones.
3. Configurá en `eas.json`:

```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./google-service-account.json",
      "track": "internal"
    }
  }
}
```

4. Agregá `google-service-account.json` a `.gitignore`.
5. Luego: `eas submit -p android --latest`

### 1.5 Requisito de testing cerrado (cuentas personales nuevas) ⚠️

Si creaste cuenta personal después de nov 2023, **antes de poder publicar en producción** Google exige una prueba cerrada con **al menos 12 testers activos durante 14 días continuos**.

1. En la prueba cerrada, creá una lista de emails de testers (amigas, familiares, colegas) — necesitás 12+ que **opten y usen la app** durante 14 días.
2. Compartiles el link de opt-in que genera Play Console.
3. Pasados los 14 días, desde el Panel solicitá **acceso a producción** y respondé el cuestionario sobre tu app y su testing.
4. Aprobado el acceso → Producción → Crear versión → promocioná el build → **Enviar a revisión**.

Revisión de Google: horas a ~7 días la primera vez.

**Planificá esto desde el día 1: los 14 días de testing son el cuello de botella del cronograma.**

---

## Parte 2 — Apple App Store

### 2.1 Inscribirte en el Developer Program (día 1, en paralelo con Google)

1. Activá 2FA en tu Apple ID.
2. Inscribite en https://developer.apple.com/programs/enroll (podés hacerlo desde la web o la app "Apple Developer" en un iPhone, que suele aprobar más rápido).
3. Pagá los USD 99 y esperá la confirmación.

### 2.2 Crear la app en App Store Connect

1. https://appstoreconnect.apple.com → Apps → **+** → Nueva app.
2. Plataforma iOS · Nombre: `YOFI` (debe ser único en el App Store) · Idioma principal: Español.
3. Bundle ID: registrá `com.beautyapp.mobile` (si no aparece, EAS lo registra solo en el primer build, o crealo en developer.apple.com → Identifiers).
4. SKU: cualquier string único, p. ej. `yofi-001`.

### 2.3 Compilar con EAS (sin Mac)

```bash
eas build -p ios --profile production
```

- EAS te pedirá loguearte con tu Apple ID y genera automáticamente certificados y provisioning profiles. Aceptá que EAS los administre.
- El resultado es un `.ipa` en https://expo.dev.

### 2.4 Subir el build

```bash
eas submit -p ios --latest
```

EAS te guía para autenticarte (Apple ID o, mejor, una **App Store Connect API Key** que podés crear en App Store Connect → Usuarios y acceso → Integraciones → claves; luego EAS la guarda para próximas veces). El build aparece en App Store Connect → TestFlight en ~15–30 min (estado "Processing").

### 2.5 TestFlight (recomendado, no obligatorio)

- Testing interno: hasta 100 testers, sin revisión, inmediato.
- Probá el flujo completo (login, mapa, notificaciones, reservas) en un iPhone real antes de enviar a revisión.

### 2.6 Completar la ficha y enviar a revisión

En App Store Connect → tu app → versión 1.0:

- **Capturas de pantalla**: obligatorias para iPhone 6.9" (1320×2868) y 6.5" (1284×2778 o 1242×2688). Mínimo 3, máximo 10. Sacalas desde TestFlight en un iPhone o desde el simulador (necesitarías Mac para simulador; con iPhone real alcanza).
- Descripción, keywords, URL de soporte, **URL de política de privacidad**.
- **Privacidad de la app**: declará ubicación, identificadores, info de contacto (equivalente al Data Safety de Google).
- **Información de revisión**: 🔑 usuario y contraseña demo (punto 0.2.6) + notas explicando qué hace la app y por qué pedís ubicación.
- Clasificación de edad (cuestionario).
- Seleccioná el build subido → **Enviar a revisión**.

Revisión de Apple: 24–48 h normalmente. Si te rechazan, respondé en el Resolution Center — los rechazos más comunes son: falta cuenta demo, metadata inconsistente, permisos sin justificación clara (tu `NSLocationWhenInUseUsageDescription` ya está bien redactada).

---

## Parte 3 — Cronograma sugerido

| Día | Acción |
|---|---|
| 1 | Crear ambas cuentas de desarrollador. Corregir `apiBaseUrl`, subir versión a 1.0.0, publicar política de privacidad |
| 2–3 | Cuentas aprobadas. Crear apps en ambas consolas. `eas build` para ambas plataformas |
| 3–4 | Android: subir a prueba cerrada, invitar 12+ testers. iOS: subir a TestFlight, completar ficha |
| 4–5 | iOS: **enviar a revisión** (Apple no exige período de testing) |
| 5–7 | iOS aprobada y publicada 🎉. Android: testers usando la app |
| 17–18 | Android: cumplidos los 14 días → solicitar acceso a producción |
| 19–21 | Android: acceso aprobado → enviar a revisión → publicada 🎉 |

**iOS puede estar publicada en ~1 semana; Android tardará ~3 semanas por el requisito de testers (cuenta personal).**

---

## Parte 4 — Checklist final

- [ ] Cuenta Google Play Console creada y verificada (USD 25)
- [ ] Cuenta Apple Developer activa (USD 99/año)
- [ ] `apiBaseUrl` apunta a producción
- [ ] `version` en `app.json` = 1.0.0
- [ ] API key de Google Maps restringida
- [ ] Política de privacidad publicada en URL pública
- [ ] Cuenta demo para revisores de Apple
- [ ] Capturas de pantalla (Android + iPhone 6.9"/6.5")
- [ ] Ícono 512×512 (Play) y verificar icon.png 1024×1024 sin alpha (Apple)
- [ ] Formularios de Data Safety (Google) y App Privacy (Apple) completados
- [ ] 12+ testers reclutados para la prueba cerrada de Android
- [ ] `google-service-account.json` en `.gitignore`

## Comandos de referencia

```bash
eas build -p android --profile production   # AAB para Play Store
eas build -p ios --profile production       # IPA para App Store
eas submit -p android --latest              # Subir a Play Console
eas submit -p ios --latest                  # Subir a App Store Connect
eas build:list                              # Ver builds
eas credentials                             # Administrar keystore/certificados
```

## Fuentes

- [Requisitos de testing para cuentas personales nuevas — Google](https://support.google.com/googleplay/android-developer/answer/14151465?hl=es-419)
- [Configurar pruebas cerradas — Play Console](https://support.google.com/googleplay/android-developer/answer/9845334?hl=es-419)
- [EAS Submit — Expo Docs](https://docs.expo.dev/submit/introduction/)
- [Submit a Google Play — Expo Docs](https://docs.expo.dev/submit/android/)
- [Submit al App Store — Expo Docs](https://docs.expo.dev/submit/ios/)
