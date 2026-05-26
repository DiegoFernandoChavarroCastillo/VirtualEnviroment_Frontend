import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Target, Crosshair, Zap, Clock, Medal } from 'lucide-react'
import { leaderboardService, type LeaderboardEntry } from '../services/leaderboard.service'

type Period = 'global' | 'weekly' | 'daily'

const PERIOD_LABELS: Record<Period, string> = {
  global: 'Global',
  weekly: 'Semanal',
  daily: 'Diario',
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Medal className="w-5 h-5 text-yellow-400" />
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />
  return <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-gray-400">{rank}</span>
}

export default function Leaderboard() {
  const [period, setPeriod] = useState<Period>('global')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    const fetch = period === 'global' ? leaderboardService.getGlobal
      : period === 'weekly' ? leaderboardService.getWeekly
      : leaderboardService.getDaily
    fetch(20)
      .then(setEntries)
      .catch((err) => setError(err.message || 'Error al cargar'))
      .finally(() => setLoading(false))
  }, [period])

  return (
    <div className="w-full max-w-lg mx-auto bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Trophy className="w-6 h-6 text-[#e67e22]" />
        <h2 className="text-xl font-bold text-gray-800">Leaderboard</h2>
      </div>

      <div className="flex gap-2">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              period === p
                ? 'bg-gradient-to-r from-[#e67e22] to-[#c0392b] text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#e67e22] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      {!loading && !error && entries.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-8">Aún no hay partidas registradas</p>
      )}

      {!loading && entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="w-8 flex justify-center">
                <RankBadge rank={index + 1} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{entry.username}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Crosshair className="w-3 h-3" /> {entry.kills}
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="w-3 h-3" /> {entry.accuracy.toFixed(0)}%
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" /> {entry.highestStreak}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatTime(entry.survivalTimeSeconds)}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-lg font-bold text-[#e67e22]">{entry.score}</p>
                <p className="text-[10px] text-gray-400">puntos</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
