import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Home from './pages/Home'
import Sessions from './pages/Sessions'
import ClassroomMonitoring from './pages/ClassroomMonitoring'
import Reports from './pages/Reports'
import LoginFormPanel from './auth/LoginFormPanel'

// Componente interno para manejar la navegación
const NavigationContent: React.FC<{
  isAuthenticated: boolean;
  user: any;
  showLogin: boolean;
  setShowLogin: (show: boolean) => void;
  handleLogout: () => void;
  isHeaderVisible: boolean;
  setIsAuthenticated: (value: boolean) => void;
  setUser: (user: any) => void;
}> = ({ isAuthenticated, user, showLogin, setShowLogin, handleLogout, isHeaderVisible, setIsAuthenticated, setUser }) => {
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <>
      <style>{`
        /* Header con comportamiento de scroll suave */
        header {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          z-index: 9999 !important;
          transition: transform 0.3s ease-in-out !important;
        }
        
        /* Comportamiento de scroll suave */
        body {
          scroll-behavior: smooth;
        }
      `}</style>
      <div className="relative">
        {/* Header con comportamiento de scroll */}
        <header 
          className={`fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-sm border-b border-white/10 transition-transform duration-300 ease-in-out ${
            isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <div className="flex items-center">
                <div className="h-8 w-8 bg-green-500/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <span className="ml-2 text-white font-bold text-lg">EmotionAI</span>
              </div>

              {/* Navigation - Solo visible cuando está autenticado */}
              {isAuthenticated && (
                <nav className="hidden md:flex items-center space-x-1">
                  <a 
                    href="/sessions" 
                    className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                      isActive('/sessions') 
                        ? 'bg-white/20 text-white shadow-lg' 
                        : 'text-white/80 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Classroom
                  </a>
                  <a 
                    href="/reports" 
                    className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                      isActive('/reports') 
                        ? 'bg-white/20 text-white shadow-lg' 
                        : 'text-white/80 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Reports
                  </a>
                </nav>
              )}

              {/* User Menu */}
              <div className="flex items-center space-x-4">
                
                {isAuthenticated ? (
                  <div className="flex items-center space-x-3">
                    <div className="text-white/80 text-sm">
                      Hola, {user?.username}
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="border border-white/20 text-white font-medium px-4 py-2 rounded-lg hover:bg-white/5 transition-all duration-200 backdrop-blur-sm"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                ) : (
                    <button 
                      onClick={() => setShowLogin(true)}
                      className="border border-white/20 text-white font-medium px-4 py-2 rounded-lg hover:bg-white/5 transition-all duration-200 backdrop-blur-sm"
                    >
                      Login
                    </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Contenido */}
        <main>
          <Routes>
            <Route path="/" element={<Home onOpenLogin={() => setShowLogin(true)} />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/classroom-monitoring" element={<ClassroomMonitoring />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </main>

        {/* Login Form Modal */}
        {showLogin && (
          <LoginFormPanel 
            onClose={() => setShowLogin(false)} 
            onLoginSuccess={(userData) => {
              setIsAuthenticated(true)
              setUser(userData)
              setShowLogin(false)
            }}
          />
        )}
      </div>
    </>
  )
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [showLogin, setShowLogin] = useState(false)
  const [isHeaderVisible, setIsHeaderVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    // Verificar si hay usuario autenticado en localStorage
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      const userData = JSON.parse(savedUser)
      if (userData.isAuthenticated) {
        setIsAuthenticated(true)
        setUser(userData)
      }
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
    
      if (currentScrollY < lastScrollY || currentScrollY < 10) {
        // Scrolling up or at top - show header
        setIsHeaderVisible(true)
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down and past 100px - hide header
        setIsHeaderVisible(false)
      }
    
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    setIsAuthenticated(false)
    setUser(null)
    // Redirigir a la página Home después del logout
    window.location.href = '/'
  }


  return (
    <Router>
      <NavigationContent
        isAuthenticated={isAuthenticated}
        user={user}
        showLogin={showLogin}
        setShowLogin={setShowLogin}
        handleLogout={handleLogout}
        isHeaderVisible={isHeaderVisible}
        setIsAuthenticated={setIsAuthenticated}
        setUser={setUser}
      />
    </Router>
  )
}

export default App

