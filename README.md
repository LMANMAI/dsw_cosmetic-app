# BeautyApp · App móvil

> El ecosistema digital de la estética argentina — clientes, profesionales y tienda de insumos en una sola plataforma.

Este repo contiene el **scaffold del MVP** de la app móvil: un proyecto Expo + React Native + TypeScript con las 5 pantallas definidas en el informe de validación.

---

## Stack

- **Expo SDK 51** con **Expo Router** (file-based routing).
- **React Native 0.74** + **TypeScript** estricto.
- **Path aliases** `@/*` apuntando a `src/`.
- **AsyncStorage** para persistir la sesión.
- Estilos con **StyleSheet** nativo + tokens de tema en `src/theme`.

## Estructura

```
beautyapp/
├─ app/                          # Rutas Expo Router
│  ├─ _layout.tsx                # Layout raíz + auth gate
│  ├─ index.tsx                  # Redirección según rol
│  ├─ login.tsx                  # Login (demo: cliente / profesional)
│  ├─ (cliente)/
│  │  ├─ _layout.tsx             # Tabs del cliente
│  │  ├─ buscar.tsx              # 🗺  Búsqueda geolocalizada (P1)
│  │  ├─ profesional/[id].tsx    # 💅  Perfil + reserva (P2)
│  │  ├─ tienda.tsx              # 🛍  Tienda integrada (P3)
│  │  ├─ turnos.tsx              # Mis turnos
│  │  └─ perfil.tsx              # Cuenta del cliente
│  └─ (profesional)/
│     ├─ _layout.tsx             # Tabs del profesional
│     ├─ agenda.tsx              # 📋  Agenda diaria (P4)
│     ├─ caja.tsx                # 📊  Cierre de caja (P5)
│     ├─ insumos.tsx             # Compra de insumos
│     └─ perfil.tsx              # Cuenta del profesional
└─ src/
   ├─ components/                # UI compartida (Button, Card, Chip, Badge, Avatar, ScreenHeader)
   ├─ context/                   # SessionProvider, CartProvider
   ├─ data/                      # Mocks (categorías, profesionales, turnos, productos)
   ├─ services/                  # Capa async lista para conectar al backend
   ├─ theme/                     # colors, typography, spacing, radius, shadow
   ├─ types/                     # models.ts (entidades del informe)
   └─ utils/                     # format.ts (ARS, fechas, métodos de pago)
```

## Las 5 pantallas del MVP

| # | Modo | Pantalla | Archivo |
|---|------|----------|---------|
| 1 | Cliente | Búsqueda geolocalizada con mapa y filtros por categoría | `app/(cliente)/buscar.tsx` |
| 2 | Cliente | Perfil profesional con servicios, horarios y reserva | `app/(cliente)/profesional/[id].tsx` |
| 3 | Cliente | Tienda de insumos con catálogo y carrito | `app/(cliente)/tienda.tsx` |
| 4 | Profesional | Agenda diaria con turnos, estados y métricas | `app/(profesional)/agenda.tsx` |
| 5 | Profesional | Cierre de caja mensual con desglose por método | `app/(profesional)/caja.tsx` |

## Cómo arrancar

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar Expo
npm start

# 3. Escanear el QR con Expo Go (Android/iOS)
#    o presionar 'a' / 'i' para emulador
```

### Login de demo

Cualquier email/contraseña sirve. Elegí el **modo** en la pantalla de login para entrar como cliente o profesional. Una vez dentro, podés alternar desde la pantalla de perfil.

## Capa de servicios

Todos los servicios en `src/services/*.service.ts` son **async** y devuelven promesas con datos mock + `fakeDelay()` para que la UI muestre loaders reales. Cuando el backend esté disponible, sólo hay que reemplazar el cuerpo por una llamada a `request<T>()` desde `api-client.ts`.

```ts
// hoy
async listar() {
  await fakeDelay();
  return PROFESIONALES_MOCK;
}

// mañana, conectado al backend
async listar() {
  return request<PerfilProfesional[]>('/profesionales');
}
```

La URL base se lee desde `expoConfig.extra.apiBaseUrl` (configurable en `app.json` o vía `app.config.ts`).

## Decisiones tomadas en el scaffold

- **Mapa real** queda fuera del scaffold inicial. Está dibujada una representación visual con pines en `buscar.tsx`. Para integrar Google Maps real, instalar `react-native-maps` y reemplazar la sección `mapBox`.
- **Pasarela de pagos**: el flujo registra el método de pago (efectivo / transferencia / Mercado Pago) pero no integra el SDK aún — está fuera del MVP según el informe.
- **Push notifications**: pendientes (Firebase Cloud Messaging según informe).
- **Base de datos / backend**: este repo es 100% frontend. El backend Node + Express + PostgreSQL se desarrolla en paralelo (mes 2-5 según cronograma).

## Próximos pasos sugeridos

1. `npx expo install react-native-maps` y reemplazar el mapa simulado.
2. `npx expo install expo-notifications` para push (requirements: 24h y 2h antes).
3. Crear `app/(cliente)/turnos/[id].tsx` para detalle de turno con cancelación.
4. Implementar registro/onboarding (3 pantallas, según informe).
5. Conectar `services/*.service.ts` al backend real.

---

**Versión:** 0.1.0 · **MVP target:** Octubre 2026
