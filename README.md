# Box.io

Sala de juegos multijugador en tiempo real con entorno virtual 2D y minijuegos.

## Stack

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS 3** con tema shadcn/ui
- **Socket.IO** (comunicación en tiempo real)
- **Matter.js** (física en minijuegos)
- **tsparticles** (efectos visuales)

## Estructura

```
src/
├── main.tsx                        # Entry point con providers
├── App.tsx                         # Router (Lobby + Sala de Juegos)
├── pages/Lobby.tsx                 # Pantalla de bienvenida (nickname + color)
│
├── features/
│   ├── virtual-world/              # Sala de juegos (núcleo)
│   │   ├── pages/                  # VirtualWorldScreen (layout)
│   │   ├── components/             # Canvas, minimapa, player card, decoraciones
│   │   ├── hooks/                  # useRealtimeMap, usePlayerCard, useAvatarImages
│   │   ├── config/                 # Zonas del mapa
│   │   └── types/                  # Eventos Socket.IO
│   │
│   ├── arena-shooter/              # Minijuego: Arena Shooter
│   │   ├── components/             # ArenaShooter, ShooterZone
│   │   ├── hooks/                  # useShooterSocket, useShooterPhysics, useShooterSnapshot
│   │   ├── utils/                  # ParticleSystem
│   │   ├── types/                  # Tipos del shooter
│   │   └── styles/                 # CSS module
│   │
│   ├── football-duel/              # Minijuego: Football Duel
│   │   ├── components/             # FootballDuelMatch, DuelPads, Crown, GoalParticles
│   │   ├── hooks/                  # useFootballSocket, useDuelPhysics, useDuelSnapshot
│   │   └── types/                  # Tipos del football
│   │
│   ├── auth/services/              # Sesión (localStorage, sin servidor de auth)
│   ├── users/services/             # Perfiles de usuario (mock)
│   └── connections/                # Conexiones entre usuarios (mock)
│
└── shared/
    ├── contexts/                   # SocketContext, CurrentUserContext
    ├── components/                 # SafeRemoteImage, ui/ (toasts)
    ├── hooks/                      # use-toast
    ├── lib/                        # api.ts (HTTP client), utils.ts (cn)
    └── utils/                      # spawnPosition, resolveProfilePicUrl, etc.
```

## Conexión al backend

Todas las URLs se configuran en `.env`:

```env
VITE_REALTIME_URL=http://localhost:3004
```

El backend (NestJS + Socket.IO) corre por defecto en `http://localhost:3004`.

## Namespaces Socket.IO

| Namespace | Propósito |
|---|---|
| `/map` | Sala de juegos: posición, chat, detección de zonas |
| `/shooter-arena` | Minijuego Arena Shooter |
| `/football-duel` | Minijuego Football Duel |

## Minijuegos

- **Arena Shooter**: Batalla 2D multijugador en tiempo real. Pararse en la zona por 2s para entrar.
- **Football Duel**: Partido 1v1 de fútbol. Pararse en una plataforma para activar el duel.

## Scripts

```bash
npm run dev       # Iniciar servidor de desarrollo
npm run build     # Compilar para producción
npm run preview   # Vista previa de build
```

## Autenticación

No requiere servidor de auth. El usuario ingresa un nickname en el Lobby, se guarda en `localStorage` y se envía como identificador a los sockets. El backend crea sesiones de invitado automáticamente.
