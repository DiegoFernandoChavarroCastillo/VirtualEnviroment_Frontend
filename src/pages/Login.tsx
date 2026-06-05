import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogIn, Eye, EyeOff, Gamepad2, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import Starfield from '@/shared/components/Starfield'
import NeonPanel from '@/shared/components/NeonPanel'
import NeonButton from '@/shared/components/NeonButton'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = username.trim()
    if (!name || !password) {
      setError('Completa todos los campos')
      return
    }
    setError('')
    setLoading(true)
    try {
      await login({ username: name, password })
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen text-foreground flex items-start sm:items-center justify-center p-3 sm:p-4 py-6 sm:py-10">
      <Starfield />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        <NeonPanel accent="cyan" glow className="p-6 sm:p-8 space-y-6 sm:space-y-8">
          <div className="text-center space-y-3">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="relative w-14 h-14 sm:w-16 sm:h-16 mx-auto"
            >
              <div className="w-full h-full rounded-2xl bg-gradient-to-br from-neon-cyan to-neon-violet flex items-center justify-center shadow-glow-cyan">
                <LogIn className="w-6 h-6 sm:w-7 sm:h-7 text-space-900" />
              </div>
              <div className="absolute -inset-2 rounded-2xl bg-neon-cyan/20 blur-xl -z-10" />
            </motion.div>
            <h1 className="text-2xl sm:text-3xl font-display font-black tracking-widest text-glow-cyan text-neon-cyan">
              BOX.IO
            </h1>
            <p className="text-neon-violet text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em] text-glow-violet">
              Iniciar sesión
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <Field
              label="Usuario"
              placeholder="Tu nombre de usuario"
              value={username}
              onChange={setUsername}
              maxLength={30}
              autoFocus
            />

            <Field
              label="Contraseña"
              placeholder="Tu contraseña"
              value={password}
              onChange={setPassword}
              type={showPassword ? 'text' : 'password'}
              maxLength={72}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-neon-cyan transition-colors p-1"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/30 rounded-lg py-2"
              >
                {error}
              </motion.p>
            )}

            <NeonButton
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              icon={<Gamepad2 size={18} />}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </NeonButton>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{' '}
            <Link
              to="/register"
              className="text-neon-cyan hover:text-glow-cyan font-semibold transition-all"
            >
              Regístrate
            </Link>
          </p>

          <Link
            to="/"
            className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.3em] text-muted-foreground hover:text-neon-violet transition-colors"
          >
            <ArrowLeft size={12} /> Volver al lobby
          </Link>
        </NeonPanel>
      </motion.div>
    </div>
  )
}

interface FieldProps {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  type?: string
  maxLength?: number
  autoFocus?: boolean
  trailing?: React.ReactNode
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  maxLength,
  autoFocus,
  trailing,
}: FieldProps) {
  return (
    <div className="space-y-1.5 sm:space-y-2">
      <label className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-neon-cyan/80">
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
          }}
          placeholder={placeholder}
          maxLength={maxLength}
          autoFocus={autoFocus}
          className="w-full px-4 py-3 pr-12 text-base rounded-xl bg-space-900/60 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-neon-cyan focus:shadow-glow-cyan transition-all"
        />
        {trailing}
      </div>
    </div>
  )
}
