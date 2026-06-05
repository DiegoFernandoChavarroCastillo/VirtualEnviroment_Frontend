import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Target, Crosshair, Zap, Clock, Medal } from 'lucide-react'
import { leaderboardService, type LeaderboardEntry } from '../services/leaderboard.service'
import NeonPanel from '@/shared/components/NeonPanel'

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
  if (rank === 1) return <Medal className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.7)]" />
  if (rank === 2) return <Medal className="w-5 h-5 text-slate-300 drop-shadow-[0_0_6px_rgba(203,213,225,0.5)]" />
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600 drop-shadow-[0_0_6px_rgba(217,119,6,0.6)]" />
  return (
    <span className="w-5 h-5 flex items-center justify-center text-xs font-mono text-muted-foreground">
      #{rank}
    </span>
  )
}

export default function Leaderboard() {
  const [period, setPeriod] = useState<Period>('global')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    const fetch =
      period === 'global'
        ? leaderboardService.getGlobal
        : period === 'weekly'
          ? leaderboardService.getWeekly
          : leaderboardService.getDaily
    fetch(20)
      .then(setEntries)
      .catch((err) => setError(err.message || 'Error al cargar'))
      .finally(() => setLoading(false))
  }, [period])

  return (
    <NeonPanel accent="violet" className="w-full max-w-lg mx-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-neon-violet to-neon-magenta flex items-center justify-center shadow-glow-violet shrink-0">
          <Trophy className="w-4 h-4 text-space-900" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-display font-bold tracking-wider text-glow-violet text-neon-violet">
            LEADERBOARD
          </h2>
          <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.25em] sm:tracking-[0.3em] text-muted-foreground">
            Top pilots
          </p>
        </div>
      </div>

      <div className="flex gap-1 sm:gap-1.5 p-1 rounded-xl bg-space-900/60 border border-border">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold uppercase tracking-wider sm:tracking-widest transition-all ${
              period === p
                ? 'bg-gradient-to-r from-neon-violet to-neon-magenta text-space-900 shadow-glow-violet'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-7 h-7 border-2 border-neon-violet border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/30 rounded-lg py-2">
          {error}
        </p>
      )}

      {!loading && !error && entries.length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-8 uppercase tracking-widest text-xs">
          Aún no hay partidas registradas
        </p>
      )}

      {!loading && entries.length > 0 && (
        <div className="space-y-1.5 sm:space-y-2 max-h-[55vh] sm:max-h-[420px] overflow-y-auto pr-1 -mr-1">
          {entries.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-xl border transition-all ${
                index === 0
                  ? 'bg-yellow-500/5 border-yellow-500/30'
                  : index < 3
                    ? 'bg-neon-violet/5 border-neon-violet/20'
                    : 'bg-space-900/40 border-border hover:border-neon-cyan/30'
              }`}
            >
              <div className="w-7 sm:w-8 flex justify-center shrink-0">
                <RankBadge rank={index + 1} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate text-sm">
                  {entry.username}
                </p>
                <div className="flex items-center gap-2 sm:gap-2.5 text-[10px] text-muted-foreground mt-0.5 font-mono flex-wrap">
                  <span className="flex items-center gap-1 shrink-0">
                    <Crosshair className="w-3 h-3" /> {entry.kills}
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    <Target className="w-3 h-3" /> {entry.accuracy.toFixed(0)}%
                  </span>
                  <span className="hidden sm:flex items-center gap-1 shrink-0">
                    <Zap className="w-3 h-3" /> {entry.highestStreak}
                  </span>
                  <span className="hidden sm:flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" /> {formatTime(entry.survivalTimeSeconds)}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-base sm:text-lg font-display font-bold text-neon-cyan text-glow-cyan leading-none">
                  {entry.score}
                </p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">
                  pts
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </NeonPanel>
  )
}
