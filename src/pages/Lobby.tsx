import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogIn, UserPlus, LogOut, Gamepad2, Crosshair, Target, Zap, Clock, Trophy } from 'lucide-react'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { leaderboardService, type LeaderboardEntry } from '@/features/leaderboard/services/leaderboard.service'
import Leaderboard from '@/features/leaderboard/components/Leaderboard'

const AVATAR_COLORS = [
  { name: 'Rojo', value: '#c0392b' },
  { name: 'Naranja', value: '#e67e22' },
  { name: 'Amarillo', value: '#f1c40f' },
  { name: 'Verde', value: '#27ae60' },
  { name: 'Turquesa', value: '#1abc9c' },
  { name: 'Azul', value: '#2980b9' },
  { name: 'Púrpura', value: '#8e44ad' },
  { name: 'Rosa', value: '#e84393' },
]

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function Lobby() {
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuth()
  const [nickname, setNickname] = useState('')
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[3].value)
  const [error, setError] = useState('')
  const [myStats, setMyStats] = useState<LeaderboardEntry[]>([])
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated && user) {
      setStatsLoading(true)
      leaderboardService.getUserStats(user.username, 5)
        .then(setMyStats)
        .catch(() => setMyStats([]))
        .finally(() => setStatsLoading(false))
    }
  }, [isAuthenticated, user])

  const handleGuestEnter = () => {
    const name = nickname.trim()
    if (!name) {
      setError('Ingresa un nickname para continuar')
      return
    }
    setError('')
    const userId = name.toLowerCase().replace(/[^a-z0-9]/g, '_')
    localStorage.setItem('user_id', userId)
    localStorage.setItem('auth_token', 'guest-token')
    localStorage.setItem('user_data', JSON.stringify({
      id: userId,
      name,
      email: userId + '@test.com',
      role: 'USER',
      color: selectedColor,
    }))
    navigate('/virtual-world')
  }

  const handleAuthenticatedEnter = () => {
    if (!user) return
    localStorage.setItem('user_id', user.id)
    localStorage.setItem('user_data', JSON.stringify({
      id: user.id,
      name: user.username,
      username: user.username,
      avatarColor: user.avatarColor,
    }))
    navigate('/virtual-world')
  }

  const handleLogout = () => {
    logout()
  }

  const bestScore = myStats.length > 0 ? Math.max(...myStats.map(s => s.score)) : 0
  const totalKills = myStats.reduce((sum, s) => sum + s.kills, 0)
  const totalDeaths = myStats.reduce((sum, s) => sum + s.deaths, 0)
  const avgAccuracy = myStats.length > 0
    ? myStats.reduce((sum, s) => sum + s.accuracy, 0) / myStats.length
    : 0
  const totalMatches = myStats.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fdf2e9] via-white to-[#e8f8f5]">
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#e67e22] to-[#c0392b] rounded-xl flex items-center justify-center shadow-lg">
            <Gamepad2 className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Box.io</h1>
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 border border-gray-200">
                <div
                  className="w-6 h-6 rounded-full border-2 border-white shadow"
                  style={{ backgroundColor: user.avatarColor }}
                />
                <span className="text-sm font-medium text-gray-700">{user.username}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                title="Cerrar sesión"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-[#e67e22] border border-[#e67e22] hover:bg-[#e67e22]/5 transition-all"
              >
                <LogIn size={16} />
                Entrar
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[#e67e22] to-[#c0392b] hover:from-[#d35400] hover:to-[#a93226] shadow-lg transition-all"
              >
                <UserPlus size={16} />
                Registrarse
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="p-6 lg:p-8 flex flex-col lg:flex-row gap-8 items-start justify-center max-w-6xl mx-auto">
        {isAuthenticated && user ? (
          /* ── Logged-in user view ── */
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 space-y-8 shrink-0"
          >
            <div className="text-center space-y-3">
              <div
                className="w-20 h-20 mx-auto rounded-full border-4 border-white shadow-xl"
                style={{ backgroundColor: user.avatarColor }}
              />
              <h2 className="text-2xl font-bold text-gray-800">{user.username}</h2>
              <p className="text-gray-500 text-sm">Bienvenido de vuelta</p>
            </div>

            {statsLoading ? (
              <div className="flex justify-center py-6">
                <div className="w-8 h-8 border-4 border-[#e67e22] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : myStats.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/60 rounded-2xl p-4 text-center border border-gray-100">
                  <Trophy className="w-5 h-5 text-[#e67e22] mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-800">{bestScore}</p>
                  <p className="text-xs text-gray-400">Mejor puntuación</p>
                </div>
                <div className="bg-white/60 rounded-2xl p-4 text-center border border-gray-100">
                  <Crosshair className="w-5 h-5 text-[#e67e22] mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-800">{totalKills}</p>
                  <p className="text-xs text-gray-400">Eliminaciones</p>
                </div>
                <div className="bg-white/60 rounded-2xl p-4 text-center border border-gray-100">
                  <Target className="w-5 h-5 text-[#e67e22] mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-800">{avgAccuracy.toFixed(0)}%</p>
                  <p className="text-xs text-gray-400">Precisión media</p>
                </div>
                <div className="bg-white/60 rounded-2xl p-4 text-center border border-gray-100">
                  <Zap className="w-5 h-5 text-[#e67e22] mx-auto mb-1" />
                  <p className="text-2xl font-bold text-gray-800">{totalMatches}</p>
                  <p className="text-xs text-gray-400">Partidas</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-4">Aún no has jugado ninguna partida</p>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAuthenticatedEnter}
              className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-[#e67e22] to-[#c0392b] hover:from-[#d35400] hover:to-[#a93226] shadow-lg shadow-orange-200 transition-all"
            >
              Entrar al juego
            </motion.button>
          </motion.div>
        ) : (
          /* ── Guest view ── */
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 space-y-8 shrink-0"
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#e67e22] to-[#c0392b] rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-800">Box.io</h1>
              <p className="text-gray-500 text-sm">Sala de juegos multijugador</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Tu nickname</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => { setNickname(e.target.value); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleGuestEnter()}
                placeholder="Ej: Juan Perez"
                maxLength={30}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#e67e22]/40 focus:border-[#e67e22] transition-all text-gray-800 placeholder:text-gray-400"
                autoFocus
              />
              {error && <p className="text-red-500 text-xs">{error}</p>}
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Color de avatar</label>
              <div className="grid grid-cols-4 gap-3">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setSelectedColor(c.value)}
                    className={'w-full aspect-square rounded-xl border-2 transition-all ' + (selectedColor === c.value ? 'border-gray-800 scale-110 shadow-lg' : 'border-transparent hover:scale-105')}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                    aria-label={c.name}
                  />
                ))}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGuestEnter}
              className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-[#e67e22] to-[#c0392b] hover:from-[#d35400] hover:to-[#a93226] shadow-lg shadow-orange-200 transition-all"
            >
              Entrar como invitado
            </motion.button>
          </motion.div>
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
    </div>
  )
}
