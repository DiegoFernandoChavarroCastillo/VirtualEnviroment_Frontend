# Box.io — Frontend

Sala de juegos multijugador en tiempo real con entorno virtual 2D y minijuegos. Cliente React con comunicación Socket.IO y lógica server-authoritative.

## Stack

- **React 19** + **TypeScript** + **Vite** + **Vitest**
- **Tailwind CSS 3** + CSS Modules
- **Socket.IO** (comunicación en tiempo real)
- **Matter.js** (física en minijuegos)
- **tsparticles** (efectos visuales)
- **Framer Motion** (animaciones de UI)

## Estructura

```
src/
├── main.tsx                        # Entry point con providers
├── App.tsx                         # Router (Lobby + Sala de Juegos)
├── pages/                          # Lobby.tsx, Login.tsx, Register.tsx
│
├── features/
│   ├── virtual-world/              # Sala de juegos (núcleo)
│   │   ├── pages/                  # VirtualWorldScreen (layout)
│   │   ├── components/             # Canvas, minimapa, player card, decoraciones
│   │   ├── hooks/                  # useRealtimeMap, usePlayerCard, useAvatarImages
│   │   ├── types/                  # Eventos Socket.IO
│   │   └── config/                 # Zonas del mapa
│   │
│   ├── arena-shooter/              # Minijuego: Arena Shooter
│   │   ├── components/             # ArenaShooter, ShooterZone
│   │   ├── hooks/                  # useShooterSocket, useShooterPhysics,
│   │   │                           # useShooterSnapshot, useWeaponPickups,
│   │   │                           # useArenaSound
│   │   ├── utils/                  # ParticleSystem, gameConfigStore
│   │   ├── types/                  # Tipos del shooter
│   │   └── styles/                 # CSS module
│   │
│   ├── football-duel/              # Minijuego: Football Duel
│   │   ├── components/             # FootballDuelMatch, DuelPads, Crown, GoalParticles
│   │   ├── hooks/                  # useFootballSocket, useDuelPhysics, useDuelSnapshot
│   │   └── types/                  # Tipos del football
│   │
│   ├── auth/                       # AuthContext, auth.service (JWT)
│   ├── users/services/             # user.service (HTTP contra backend real)
│   ├── connections/                # connections.service (HTTP contra backend real)
│   └── leaderboard/                # Leaderboard
│
├── shared/
│   ├── contexts/                   # SocketContext, CurrentUserContext
│   ├── components/                 # VirtualJoystick, SafeRemoteImage, ui/ (toasts)
│   ├── hooks/                      # use-toast
│   ├── lib/                        # api.ts (ApiClient HTTP + helpers), utils.ts (cn)
│   ├── icons/                      # gameIcons (game-icons-react), canvasIcons
│   └── utils/                      # secureRandom, spawnPosition, etc.
│
└── features/                       # (tests dentro de cada carpeta)
    └── arena-shooter/hooks/        # *.test.ts junto al hook
```

## Game Config (server-authoritative)

Las constantes del juego (velocidades, daños, dimensiones, etc.) se envían desde el backend vía WebSocket en el evento `gameConfig` después de `joinRoom`. El frontend las almacena en un singleton (`gameConfigStore`) y las hooks las leen en tiempo de ejecución. No hay constantes hardcodeadas duplicadas.

Esto asegura que valores como `SHIELD_DURATION_MS`, `RECONCILE_THRESHOLD` y `CORRECTION_FRAMES` son siempre consistentes entre cliente y servidor. El sistema de salud (`maxHealth: 100`), daños de armas y configuración de pickups también se reciben desde el servidor.

## Conexión al backend

Las URLs se configuran en `.env`:

```env
VITE_REALTIME_URL=http://localhost:3004
```

El backend (NestJS + Socket.IO + PostgreSQL) corre por defecto en `http://localhost:3004`.

## Namespaces Socket.IO

| Namespace | Propósito |
|---|---|
| `/map` | Sala de juegos: posición, chat, detección de zonas |
| `/shooter-arena` | Minijuego Arena Shooter |
| `/football-duel` | Minijuego Football Duel |

## Minijuegos

- **Arena Shooter**: Batalla 2D multijugador en tiempo real (hasta 6 jugadores, 100 HP). Pararse en la zona por 2s para entrar. Sistema de salud con barra de vida, pickups server-authoritative (health, escudo, armas).
- **Football Duel**: Partido 1v1 de fútbol. Pararse en una plataforma para activar el duel.

## Scripts

```bash
npm run dev          # Iniciar servidor de desarrollo (Vite)
npm run build        # Compilar para producción (tsc + vite build)
npm run lint         # ESLint
npm run preview      # Vista previa de build
npm test             # Ejecutar tests (vitest run)
npm run test:watch   # Tests en modo watch
```

## Tests

Vitest con 15+ tests cubriendo:

- **Snapshot interpolation**: interpolación lineal y extrapolación de posiciones de jugadores y proyectiles entre snapshots del servidor
- **Client prediction**: `applyInput`, `stepPhysics`, `reconcile` con corrección suave y umbral de reconciliación
- **Colisiones**: resolución círculo-AABB contra estructuras de cobertura

Los tests están junto a los hooks (`*.test.ts`).

## Autenticación

Autenticación JWT contra el backend NestJS. El token se obtiene al registrarse o iniciar sesión, se almacena en `localStorage` y se envía como `auth.token` en las conexiones Socket.IO y como `Authorization: Bearer` en las peticiones HTTP.
