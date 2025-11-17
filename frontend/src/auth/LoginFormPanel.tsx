import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface LoginFormPanelProps {
  onClose: () => void
  onLoginSuccess?: (userData: any) => void
}

const LoginFormPanel: React.FC<LoginFormPanelProps> = ({ onClose, onLoginSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Conectar con la API real
      const response = await fetch('http://localhost:2025/api/usuarios/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correo: formData.email,
          contrasena: formData.password
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Guardar token y datos del usuario
        const userData = {
          username: data.data.usuario.nombre,
          email: data.data.usuario.correo,
          rol: data.data.usuario.rol,
          token: data.data.token,
          isAuthenticated: true
        }
        
        localStorage.setItem('user', JSON.stringify(userData))
        localStorage.setItem('token', data.data.token)
        
        // Notificar éxito del login si hay callback
        if (onLoginSuccess) {
          onLoginSuccess(userData)
        }
        
        // Cerrar el formulario y navegar a Classroom
        onClose()
        navigate('/sessions')
      } else {
        setError(data.message || 'Error de autenticación')
      }
    } catch (err) {
      console.error('Error en login:', err)
      setError('Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6 sm:p-8">
          {/* Brand */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">EmotionAI</h1>
            <p className="text-white/80 text-center text-sm sm:text-base">Estimado docente, puede ingresar las credenciales de la plataforma de matemática</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="email" className="block text-white text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white rounded-lg sm:rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
                placeholder="Johndoe@gmail.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-white text-sm font-medium mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white rounded-lg sm:rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm sm:text-base"
                placeholder="••••••••"
              />
            </div>


            {error && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-100 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 sm:py-3 px-4 rounded-lg sm:rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Iniciando sesión...
                </div>
                ) : (
                  'Iniciar Sesión'
                )}
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}

export default LoginFormPanel
