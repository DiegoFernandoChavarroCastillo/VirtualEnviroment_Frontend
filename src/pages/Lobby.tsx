import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LogIn,
  UserPlus,
  LogOut,
  Gamepad2,
  Crosshair,
  Target,
  Zap,
  Trophy,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { leaderboardService, type LeaderboardEntry } from '@/features/leaderboard/services/leaderboard.service'
import Leaderboard from '@/features/leaderboard/components/Leaderboard'
import Starfield from '@/shared/components/Starfield'
import NeonPanel from '@/shared/components/NeonPanel'
import NeonButton from '@/shared/components/NeonButton'

export default function Lobby() {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuth()
  const [myStats, setMyStats] = useState<LeaderboardEntry[]>([])
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated && user) {
      setStatsLoading(true)
      leaderboardService
        .getUserStats(user.username, 5)
        .then(setMyStats)
        .catch(() => setMyStats([]))
        .finally(() => setStatsLoading(false))
    }
  }, [isAuthenticated, user])

  const handleAuthenticatedEnter = () => {
    if (!isAuthenticated || !user) return
    navigate('/virtual-world')
  }

  const handleLogout = async () => {
    await logout()
  }

  const bestScore = myStats.length > 0 ? Math.max(...myStats.map((s) => s.score)) : 0
  const totalKills = myStats.reduce((sum, s) => sum + s.kills, 0)
  const avgAccuracy =
    myStats.length > 0
      ? myStats.reduce((sum, s) => sum + s.accuracy, 0) / myStats.length
      : 0
  const totalMatches = myStats.length

  return (
    <div className="relative min-h-screen text-foreground overflow-hidden">
      <Starfield />

      <header className="relative z-10 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 border-b border-neon-cyan/20 backdrop-blur-md bg-space-900/40">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 sm:gap-3 min-w-0"
        >
          <div className="relative shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-neon-cyan to-neon-violet flex items-center justify-center shadow-glow-cyan">
              <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5 text-space-900" />
            </div>
            <div className="absolute -inset-1 rounded-xl bg-neon-cyan/30 blur-md -z-10 animate-pulse-glow" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-display font-black tracking-widest text-glow-cyan text-neon-cyan leading-none">
              BOX.IO
            </h1>
            <p className="hidden sm:block text-[10px] uppercase tracking-[0.3em] text-neon-violet/80 text-glow-violet mt-1">
              Multiplayer Arena
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 sm:gap-3 shrink-0"
        >
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <NeonPanel
                accent="violet"
                className="flex items-center gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full"
              >
                <div
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white/30 shadow-glow-cyan shrink-0"
                  style={{ backgroundColor: user.avatarColor }}
                />
                <span className="text-xs sm:text-sm font-medium text-foreground truncate max-w-[120px] sm:max-w-none">
                  {user.username}
                </span>
              </NeonPanel>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="p-2 rounded-xl text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
                title="Cerrar sesión"
              >
                <LogOut size={18} />
              </motion.button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <NeonButton
                  variant="secondary"
                  size="sm"
                  icon={<LogIn size={16} />}
                  className="hidden xs:inline-flex"
                >
                  Entrar
                </NeonButton>
                <NeonButton
                  variant="secondary"
                  size="sm"
                  icon={<LogIn size={16} />}
                  className="xs:hidden"
                  aria-label="Entrar"
                />
              </Link>
              <Link to="/register">
                <NeonButton
                  variant="primary"
                  size="sm"
                  icon={<UserPlus size={16} />}
                >
                  <span className="hidden xs:inline">Registrarse</span>
                  <span className="xs:hidden">Crear</span>
                </NeonButton>
              </Link>
            </div>
          )}
        </motion.div>
      </header>

      <main className="relative z-10 p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 lg:gap-8 items-stretch lg:items-start justify-center max-w-6xl mx-auto w-full">
        {isAuthenticated && user ? (
          <NeonPanel
            accent="cyan"
            glow
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full max-w-md p-6 sm:p-8 space-y-6 sm:space-y-8 shrink-0"
          >
            <div className="text-center space-y-3">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 180, delay: 0.2 }}
                className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto"
              >
                <div
                  className="w-full h-full rounded-full border-4 border-white/20 shadow-glow-cyan"
                  style={{ backgroundColor: user.avatarColor }}
                />
                <div className="absolute inset-0 rounded-full border border-neon-cyan animate-pulse-glow" />
              </motion.div>
              <h2 className="text-xl sm:text-2xl font-display font-bold tracking-wider text-glow-cyan truncate">
                {user.username}
              </h2>
              <p className="text-neon-violet/80 text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.25em] flex items-center justify-center gap-1.5">
                <Sparkles size={12} className="text-neon-magenta" />
                Welcome back, pilot
              </p>
            </div>

            {statsLoading ? (
              <div className="flex justify-center py-6">
                <div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
              </div>
            ) : myStats.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                <StatTile
                  icon={<Trophy className="w-4 h-4" />}
                  value={bestScore}
                  label="Best score"
                  accent="cyan"
                />
                <StatTile
                  icon={<Crosshair className="w-4 h-4" />}
                  value={totalKills}
                  label="Kills"
                  accent="violet"
                />
                <StatTile
                  icon={<Target className="w-4 h-4" />}
                  value={`${avgAccuracy.toFixed(0)}%`}
                  label="Accuracy"
                  accent="magenta"
                />
                <StatTile
                  icon={<Zap className="w-4 h-4" />}
                  value={totalMatches}
                  label="Matches"
                  accent="cyan"
                />
              </div>
            ) : (
              <div className="text-center py-4 space-y-1">
                <p className="text-muted-foreground text-sm">Aún no has jugado</p>
                <p className="text-neon-cyan/70 text-xs uppercase tracking-widest">
                  Start your first mission
                </p>
              </div>
            )}

            <NeonButton
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleAuthenticatedEnter}
              icon={<Gamepad2 size={18} />}
            >
              Entrar al juego
            </NeonButton>
          </NeonPanel>
        ) : (
          <NeonPanel
            accent="cyan"
            glow
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full max-w-md p-6 sm:p-8 space-y-6 sm:space-y-8 shrink-0"
          >
            <div className="text-center space-y-2">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="relative w-14 h-14 sm:w-16 sm:h-16 mx-auto"
              >
                <div className="w-full h-full rounded-2xl bg-gradient-to-br from-neon-cyan to-neon-violet flex items-center justify-center shadow-glow-cyan">
                  <svg
                    className="w-7 h-7 sm:w-8 sm:h-8 text-space-900"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                    />
                  </svg>
                </div>
                <div className="absolute -inset-2 rounded-2xl bg-neon-cyan/20 blur-xl -z-10" />
              </motion.div>
              <h1 className="text-3xl sm:text-4xl font-display font-black tracking-widest text-glow-cyan text-neon-cyan">
                BOX.IO
              </h1>
              <p className="text-neon-violet text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em] text-glow-violet">
                Multiplayer Arena
              </p>
            </div>

            <p className="text-center text-sm text-muted-foreground leading-relaxed">
              Inicia sesión o regístrate para acceder al mundo virtual y competir con
              pilotos de todo el mundo.
            </p>

            <div className="flex flex-col gap-3 pt-1 sm:pt-2">
              <Link to="/login" className="w-full">
                <NeonButton variant="secondary" size="lg" fullWidth icon={<LogIn size={18} />}>
                  Entrar
                </NeonButton>
              </Link>
              <Link to="/register" className="w-full">
                <NeonButton
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon={<UserPlus size={18} />}
                >
                  Registrarse
                </NeonButton>
              </Link>
            </div>

            <div className="pt-1 sm:pt-2 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.25em] sm:tracking-[0.3em] text-muted-foreground/60">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-neon-cyan/30" />
              <span>or</span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-neon-violet/30" />
            </div>

            <Link
              to="/"
              className="block text-center text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-neon-cyan transition-colors"
            >
              Seguir como invitado →
            </Link>
          </NeonPanel>
        )}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-lg"
        >
          <Leaderboard />
        </motion.div>
      </main>

      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04] [background-image:repeating-linear-gradient(0deg,rgba(34,211,238,0.4)_0_1px,transparent_1px_3px)]" />
    </div>
  )
}

interface StatTileProps {
  icon: React.ReactNode
  value: number | string
  label: string
  accent: 'cyan' | 'violet' | 'magenta'
}

function StatTile({ icon, value, label, accent }: StatTileProps) {
  const colorClass =
    accent === 'cyan'
      ? 'text-neon-cyan'
      : accent === 'violet'
        ? 'text-neon-violet'
        : 'text-neon-magenta'
  return (
    <motion.div
      whileHover={{ scale: 1.04, y: -2 }}
      className="relative bg-space-900/40 border border-border rounded-xl p-3 sm:p-4 text-center overflow-hidden group"
    >
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
          accent === 'cyan'
            ? 'bg-neon-cyan/5'
            : accent === 'violet'
              ? 'bg-neon-violet/5'
              : 'bg-neon-magenta/5'
        }`}
      />
      <div className={`relative ${colorClass} mx-auto mb-1 flex justify-center`}>{icon}</div>
      <p className="relative text-xl sm:text-2xl font-display font-bold text-foreground">{value}</p>
      <p className="relative text-[9px] sm:text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
        {label}
      </p>
    </motion.div>
  )
}
