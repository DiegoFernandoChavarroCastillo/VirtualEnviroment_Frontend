import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { UserPlus, Eye, EyeOff, Gamepad2, ArrowLeft, Check } from 'lucide-react'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { getPasswordStrength } from '@/shared/lib/utils'
import Starfield from '@/shared/components/Starfield'
import NeonPanel from '@/shared/components/NeonPanel'
import NeonButton from '@/shared/components/NeonButton'

const AVATAR_COLORS = [
  { name: 'Cyan', value: '#22d3ee' },
  { name: 'Violet', value: '#a855f7' },
  { name: 'Magenta', value: '#ec4899' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Slate', value: '#94a3b8' },
]

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0].value)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const pwStrength = getPasswordStrength(password)

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = username.trim()
    const mail = email.trim()
    if (!name || !mail || !password || !confirmPassword) {
      setError('Completa todos los campos')
      return
    }
    if (name.length < 3) {
      setError('El usuario debe tener al menos 3 caracteres')
      return
    }
    if (!EMAIL_RE.test(mail)) {
      setError('El correo no tiene un formato válido')
      return
    }
    if (mail.length > 254) {
      setError('El correo es demasiado largo')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    setError('')
    setLoading(true)
    try {
      await register({
        username: name,
        email: mail,
        password,
        avatarColor: selectedColor,
      })
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Error al registrarse')
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
        <NeonPanel accent="violet" glow className="p-5 sm:p-8 space-y-4 sm:space-y-6">
          <div className="text-center space-y-2.5 sm:space-y-3">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="relative w-12 h-12 sm:w-16 sm:h-16 mx-auto"
            >
              <div className="w-full h-full rounded-2xl bg-gradient-to-br from-neon-violet to-neon-magenta flex items-center justify-center shadow-glow-violet">
                <UserPlus className="w-5 h-5 sm:w-7 sm:h-7 text-space-900" />
              </div>
              <div className="absolute -inset-2 rounded-2xl bg-neon-violet/20 blur-xl -z-10" />
            </motion.div>
            <h1 className="text-xl sm:text-3xl font-display font-black tracking-widest text-glow-violet text-neon-violet">
              BOX.IO
            </h1>
            <p className="text-neon-cyan text-[9px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.4em] text-glow-cyan">
              Crear cuenta
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <Field
              label="Usuario"
              placeholder="Min. 3 caracteres"
              value={username}
              onChange={setUsername}
              maxLength={30}
              autoFocus
            />

            <Field
              label="Correo electrónico"
              placeholder="tu@correo.com"
              value={email}
              onChange={setEmail}
              type="email"
              maxLength={254}
            />

            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-neon-violet/80">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 caracteres"
                  maxLength={72}
                  className="w-full px-4 py-3 pr-12 text-base rounded-xl bg-space-900/60 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-neon-violet focus:shadow-glow-violet transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-neon-violet transition-colors p-1"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {password && (
                <div className="mt-1.5 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          i <= pwStrength.level
                            ? pwStrength.level <= 1
                              ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]'
                              : pwStrength.level === 2
                                ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]'
                                : 'bg-neon-cyan shadow-glow-cyan'
                            : 'bg-space-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {pwStrength.label}
                  </p>
                </div>
              )}
            </div>

            <Field
              label="Confirmar contraseña"
              placeholder="Repite la contraseña"
              value={confirmPassword}
              onChange={setConfirmPassword}
              type={showPassword ? 'text' : 'password'}
              maxLength={72}
            />

            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-neon-magenta/80">
                Color de avatar
              </label>
              <div className="grid grid-cols-4 xs:grid-cols-8 gap-2">
                {AVATAR_COLORS.map((c) => (
                  <motion.button
                    key={c.value}
                    type="button"
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedColor(c.value)}
                    className={`relative aspect-square rounded-lg border-2 transition-all ${
                      selectedColor === c.value
                        ? 'border-white shadow-glow-cyan'
                        : 'border-transparent hover:border-white/40'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                    aria-label={c.name}
                  >
                    {selectedColor === c.value && (
                      <Check
                        className="absolute inset-0 m-auto w-3 h-3 text-space-900"
                        strokeWidth={4}
                      />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

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
              className="mt-1 sm:mt-2"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </NeonButton>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link
              to="/login"
              className="text-neon-violet hover:text-glow-violet font-semibold transition-all"
            >
              Inicia sesión
            </Link>
          </p>

          <Link
            to="/"
            className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.3em] text-muted-foreground hover:text-neon-cyan transition-colors"
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
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  maxLength,
  autoFocus,
}: FieldProps) {
  return (
    <div className="space-y-1.5 sm:space-y-2">
      <label className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-neon-cyan/80">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        autoFocus={autoFocus}
        className="w-full px-4 py-3 text-base rounded-xl bg-space-900/60 border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-neon-cyan focus:shadow-glow-cyan transition-all"
      />
    </div>
  )
}
