<p align="center">
  <a href="https://react.dev/" target="blank"><img src="https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg" width="120" alt="React Logo" /></a>
</p>

<p align="center">Box.io frontend</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.x-61DAFB.svg" alt="React" />
  <img src="https://img.shields.io/badge/Vite-6.x-646CFF.svg" alt="Vite" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6.svg" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Socket.IO-4.x-black.svg" alt="Socket.IO" />
  <img src="https://img.shields.io/badge/Tailwind-3.x-06B6D4.svg" alt="Tailwind" />
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License" />
</p>

---

## Descripción

Cliente React + TypeScript que renderiza el mapa virtual 2D y los minijuegos en tiempo real. Toda la lógica de juego es **server-authoritative**: el servidor valida y el cliente solo renderiza.

---

## Stack

| Tecnología | Propósito |
|---|---|
| **React 19** + **TypeScript** | UI y lógica de componentes |
| **Vite** + **Vitest** | Build tool y test runner |
| **Socket.IO** | Comunicación en tiempo real con el backend |
| **Tailwind CSS 3** + **CSS Modules** | Estilos utilitarios + estilos específicos por componente |
| **Matter.js** | Física del minijuego Football Duel |
| **Framer Motion** | Animaciones de UI (transiciones, overlays) |
| **tsparticles / canvas-confetti** | Efectos visuales y partículas |

---

## Estructura

```
src/
├── main.tsx                              # Entry point con providers
├── App.tsx                               # Router (Lobby + Sala de Juegos)
├── pages/                                # Lobby, Login, Register
│
├── features/
│   ├── auth/                             # AuthContext, auth.service (JWT)
│   ├── users/services/                   # user.service (HTTP contra backend)
│   ├── connections/                      # connections.service (HTTP contra backend)
│   ├── leaderboard/                      # Leaderboard
│   │
│   ├── virtual-world/                    # Sala de juegos (núcleo)
│   │   ├── pages/                        # VirtualWorldScreen (layout)
│   │   ├── components/                   # Canvas, minimapa, player card, decoraciones
│   │   ├── hooks/                        # useRealtimeMap, usePlayerCard, useAvatarImages
│   │   ├── types/                        # Eventos Socket.IO
│   │   └── config/                       # Zonas del mapa
│   │
│   ├── arena-shooter/                    # Shooter 2D multijugador
│   │   ├── components/                   # ArenaShooter, ShooterZone
│   │   ├── hooks/                        # useShooterSocket, useShooterPhysics,
│   │   │                                 # useShooterSnapshot, useWeaponPickups,
│   │   │                                 # useArenaSound
│   │   ├── utils/                        # ParticleSystem, gameConfigStore
│   │   ├── types/                        # Tipos e interfaces del shooter
│   │   └── styles/                       # CSS Modules
│   │
│   └── football-duel/                    # Duelo fútbol 1v1
│       ├── components/                   # FootballDuelMatch, DuelPads, Crown, GoalParticles
│       ├── hooks/                        # useFootballSocket, useDuelPhysics, useDuelSnapshot
│       └── types/                        # Tipos del football
│
└── shared/
    ├── contexts/                         # SocketContext, CurrentUserContext
    ├── components/                       # VirtualJoystick, SafeRemoteImage, ui/ (toasts)
    ├── hooks/                            # use-toast
    ├── lib/                              # api.ts (ApiClient HTTP + helpers), utils.ts (cn)
    ├── icons/                            # gameIcons (game-icons-react), canvasIcons
    └── utils/                            # secureRandom, spawnPosition, etc.
```

### Principios arquitectónicos

| Principio | Aplicación |
|---|---|
| **Server-authoritative** | El servidor valida toda la lógica de juego. El cliente solo envía inputs y renderiza snapshots. |
| **Game Config sincronizado** | Velocidades, daños, dimensiones y balance se reciben del servidor al conectarse. **Sin constantes duplicadas.** |
| **Snapshot interpolation** | El cliente interpola posiciones entre snapshots del servidor (30 Hz) para movimiento suave. |
| **Client prediction + reconciliation** | El jugador local aplica inputs inmediatamente y corrige suavemente si el servidor discrepa. |
| **Object Pool (partículas)** | El `ParticleSystem` reusa objetos de partículas para evitar GC pauses. |

---

## Game Config (server-authoritative)

Las constantes del juego (velocidades, daños, `maxHealth`, `maxShield`, etc.) se envían desde el backend vía WebSocket en el evento `gameConfig` después de `joinRoom`. El frontend las almacena en un singleton (`gameConfigStore`) y los hooks las leen en tiempo de ejecución.

```ts
// Ejemplo de gameConfig recibido
{
  weapons:       { normal: { damage: 18, ... }, rocket: { damage: 60, ... }, laser: { damage: 55, ... } },
  shield:        { maxShield: 50 },
  arenaConfig:   { player: { maxHealth: 100, ... }, arena: { width: 1600, height: 1200 }, ... },
  spawnRates:    { shotgun: 25, rocket: 20, shield: 20, health: 20, laser: 15 },
}
```

---

## Conexión al backend

Las URLs se configuran en `.env`:

```env
VITE_REALTIME_URL=http://localhost:3004
```

El backend (NestJS + Socket.IO) corre por defecto en `http://localhost:3004`.

| Namespace | Propósito |
|---|---|
| `/map` | Sala de juegos: posición de avatares, chat, detección de zonas |
| `/shooter-arena` | Minijuego Arena Shooter |
| `/football-duel` | Minijuego Football Duel |

---

## Sistema de salud y escudo

El jugador tiene **100 HP** y **50 puntos de escudo** (configurables vía server).

| Indicador | Visual |
|---|---|
| ❤️ Salud | Barra con degradado rojo → amarillo → verde |
| ⚡ Escudo | Barra con degradado azul oscuro → celeste |
| Aura azul | Alrededor del jugador cuando `shield > 0` |

El escudo absorbe daño antes que la salud. Mientras tenga puntos, el aura azul permanece visible (sin límite de tiempo).

---

## Minijuegos

- **Arena Shooter**: Batalla 2D multijugador en tiempo real (hasta 6 jugadores). Pararse en la zona por 2s para entrar. Sistema de salud + escudo, pickups server-authoritative (health, escudo, shotgun, rocket, laser).
- **Football Duel**: Partido 1v1 de fútbol con física Matter.js. Pararse en una plataforma para activar el duelo.

---

## Scripts

```bash
npm run dev          # Servidor de desarrollo (Vite)
npm run build        # Compilar para producción (tsc + vite build)
npm run lint         # ESLint
npm run preview      # Vista previa del build
npm test             # Tests (vitest run)
npm run test:watch   # Tests en modo watch
```

---

## Tests

Vitest cubriendo:

| Test | Descripción |
|---|---|
| **Snapshot interpolation** | Interpolación lineal y extrapolación de posiciones entre snapshots del servidor |
| **Client prediction** | `applyInput`, `stepPhysics`, `reconcile` con corrección suave y umbral de reconciliación |
| **Colisiones** | Resolución círculo-AABB contra estructuras de cobertura |

Los tests están junto a los hooks (`*.test.ts`).

---

## Autenticación

Autenticación JWT contra el backend NestJS. El token se obtiene al registrarse o iniciar sesión, se almacena en `localStorage` y se envía como:

- `auth.token` en las conexiones Socket.IO
- `Authorization: Bearer` en las peticiones HTTP

---

## Licencia

[MIT](./LICENSE)
