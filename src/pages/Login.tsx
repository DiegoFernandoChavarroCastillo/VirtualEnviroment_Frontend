import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogIn, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/features/auth/contexts/AuthContext'

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
    <div className="min-h-screen bg-gradient-to-br from-[#fdf2e9] via-white to-[#e8f8f5] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#e67e22] to-[#c0392b] rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Box.io</h1>
          <p className="text-gray-500 text-sm">Iniciar sesión</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError('') }}
              placeholder="Tu nombre de usuario"
              maxLength={30}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white/50 focus:outline-none focus:ring-2 focus:ring-[#e67e22]/40 focus:border-[#e67e22] transition-all text-gray-800 placeholder:text-gray-400"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                placeholder="Tu contraseña"
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
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-[#e67e22] to-[#c0392b] hover:from-[#d35400] hover:to-[#a93226] shadow-lg shadow-orange-200 transition-all disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </motion.button>
        </form>

        <p className="text-center text-sm text-gray-500">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-[#e67e22] hover:text-[#d35400] font-semibold hover:underline">
            Regístrate
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
