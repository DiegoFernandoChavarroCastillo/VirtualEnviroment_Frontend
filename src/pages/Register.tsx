import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { UserPlus, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { getPasswordStrength } from '@/shared/lib/utils'

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

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[3].value)
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
      await register({ username: name, email: mail, password, avatarColor: selectedColor })
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fdf2e9] via-white to-[#e8f8f5] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#e67e22] to-[#c0392b] rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Box.io</h1>
          <p className="text-gray-500 text-sm">Crear cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError('') }}
              placeholder="Min. 3 caracteres"
              maxLength={30}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#e67e22]/40 focus:border-[#e67e22] transition-all text-gray-800 placeholder:text-gray-400"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError('') }}
              placeholder="tu@correo.com"
              maxLength={254}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#e67e22]/40 focus:border-[#e67e22] transition-all text-gray-800 placeholder:text-gray-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                placeholder="Min. 8 caracteres"
                className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#e67e22]/40 focus:border-[#e67e22] transition-all text-gray-800 placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password && (
              <div className="mt-1.5">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        i <= pwStrength.level ? pwStrength.colorClass : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">{pwStrength.label}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Confirmar contraseña</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
              placeholder="Repite la contraseña"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#e67e22]/40 focus:border-[#e67e22] transition-all text-gray-800 placeholder:text-gray-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Color de avatar</label>
            <div className="grid grid-cols-4 gap-3">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setSelectedColor(c.value)}
                  className={`w-full aspect-square rounded-xl border-2 transition-all ${
                    selectedColor === c.value ? 'border-gray-800 scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                  aria-label={c.name}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-[#e67e22] to-[#c0392b] hover:from-[#d35400] hover:to-[#a93226] shadow-lg shadow-orange-200 transition-all disabled:opacity-50"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </motion.button>
        </form>

        <p className="text-center text-sm text-gray-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-[#e67e22] hover:text-[#d35400] font-semibold hover:underline">
            Inicia sesión
          </Link>
        </p>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white/80 px-3 text-gray-400">o</span>
          </div>
        </div>

        <Link
          to="/"
          className="block w-full py-3 text-center rounded-xl font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all"
        >
          Seguir como invitado
        </Link>
      </motion.div>
    </div>
  )
}
