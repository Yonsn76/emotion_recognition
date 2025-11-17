import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'

interface Classroom {
  id: string
  name: string
  number: string
  total_students: number
  description?: string
}

interface ClassroomSession {
  id: string
  classroom_id: string
  classroom_name: string
  materia: string
  start_time: string
  end_time?: string
  status: string
  student_count?: number
  session_duration_formatted?: string
}


const ClassroomMonitoring: React.FC = () => {
  const [searchParams] = useSearchParams()
  const [classroomSessions, setClassroomSessions] = useState<ClassroomSession[]>([])
  const [currentClassroom, setCurrentClassroom] = useState<Classroom | null>(null)
  const [currentSession, setCurrentSession] = useState<ClassroomSession | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [classInfo, setClassInfo] = useState<{materia: string, studentCount: number, classroomName: string} | null>(null)
  const [showClassInfoModal, setShowClassInfoModal] = useState(false)
  const [classSubject, setClassSubject] = useState('')
  const [studentCount, setStudentCount] = useState(0)
  const [videoSize, setVideoSize] = useState<'normal' | 'large' | 'fullscreen'>('normal')
  const [videoLoading, setVideoLoading] = useState(false)
  const [streamKey, setStreamKey] = useState(Date.now())
  const [videoFitMode, setVideoFitMode] = useState<'contain' | 'cover' | 'fill' | 'scale-down' | 'none'>('contain')
  const [videoSizeMode, setVideoSizeMode] = useState<'auto' | '25%' | '50%' | '75%' | '100%'>('auto')
  const [showVideoSettings, setShowVideoSettings] = useState(false)
  const [emotionData, setEmotionData] = useState({
    felicidad: { percentage: 0, count: 0 },
    tristeza: { percentage: 0, count: 0 },
    enojo: { percentage: 0, count: 0 },
    neutral: { percentage: 0, count: 0 },
    total_detections: 0,
    camera_active: false
  })
  const [sessionDuration, setSessionDuration] = useState<string>('00:00:00')
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)

  useEffect(() => {
    loadClassrooms()
    loadActiveSessions()
    checkCameraStatus()
    fetchEmotionData()
    
    // Cargar información de la clase desde localStorage
    const savedClassInfo = localStorage.getItem('classInfo')
    if (savedClassInfo) {
      try {
        const parsedInfo = JSON.parse(savedClassInfo)
        setClassInfo(parsedInfo)
        console.log('Información de clase cargada:', parsedInfo)
      } catch (err) {
        console.error('Error parseando classInfo:', err)
      }
    }
    
    // Actualizar duración de sesión cada segundo
    const durationInterval = setInterval(() => {
      if (sessionStartTime && currentSession) {
        const now = new Date()
        const elapsed = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000)
        const hours = Math.floor(elapsed / 3600)
        const minutes = Math.floor((elapsed % 3600) / 60)
        const seconds = elapsed % 60
        setSessionDuration(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      }
    }, 1000)
    
    return () => clearInterval(durationInterval)
    
    // Actualización automática cada 30 segundos
    const interval = setInterval(() => {
      console.log('🔄 Actualizando datos automáticamente...')
      loadActiveSessions()
      if (currentSession) {
        checkCameraStatus()
        fetchEmotionData()
      }
    }, 30000) // 30 segundos
    
    // WebSocket para actualizaciones en tiempo real
    const ws = new WebSocket('ws://127.0.0.1:8000/ws')
    
    ws.onopen = () => {
      console.log('🔌 Conectado al WebSocket')
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('📡 Datos recibidos del WebSocket:', data)
        
        // Actualizar sesiones si hay cambios
        if (data.type === 'session_update') {
          loadActiveSessions()
        }
        
        // Actualizar datos emocionales si hay cambios
        if (data.type === 'emotion_update' && currentSession) {
          fetchEmotionData()
        }
        
        // Actualizar estado de cámara si hay cambios
        if (data.type === 'camera_update' && currentSession) {
          checkCameraStatus()
        }
      } catch (err) {
        console.error('Error procesando mensaje WebSocket:', err)
      }
    }
    
    ws.onerror = (error) => {
      console.error('❌ Error en WebSocket:', error)
    }
    
    ws.onclose = () => {
      console.log('🔌 WebSocket desconectado')
    }
    
    // Limpiar el intervalo y WebSocket cuando el componente se desmonte
    return () => {
      clearInterval(interval)
      ws.close()
    }
    
    // Obtener aula desde URL
    searchParams.get('classroom')
    
    // Verificar estado de cámara cada 2 segundos
    const cameraInterval = setInterval(checkCameraStatus, 2000)
    
    // Obtener datos emocionales cada 1 segundo para tiempo real
    const emotionInterval = setInterval(fetchEmotionData, 1000)
    
    // Listener para detectar salida de pantalla completa
     const handleFullscreenChange = () => {
       if (!document.fullscreenElement && videoSize === 'fullscreen') {
         setVideoSize('normal')
       }
     }
     
     // Listener para tecla ESC
     const handleKeyDown = (event: KeyboardEvent) => {
       if (event.key === 'Escape' && videoSize === 'fullscreen') {
         document.exitFullscreen()
         setVideoSize('normal')
       }
     }
     
     document.addEventListener('fullscreenchange', handleFullscreenChange)
     document.addEventListener('keydown', handleKeyDown)
     
    return () => {
      clearInterval(cameraInterval)
      clearInterval(emotionInterval)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('keydown', handleKeyDown)
    }
   }, [searchParams, videoSize])

   // Efecto para actualizar el stream cuando la cámara se active
   useEffect(() => {
     if (cameraActive) {
       setStreamKey(Date.now())
       setVideoLoading(true)
       
       // Refrescar el stream cada 5 segundos para mantener la conexión
       const streamInterval = setInterval(() => {
         setStreamKey(Date.now())
       }, 5000)
       
       return () => clearInterval(streamInterval)
     }
   }, [cameraActive])

  const loadClassrooms = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/classroom/list')
      if (response.ok) {
        const data = await response.json()
        
        // Si hay un aula seleccionada desde URL, encontrarla
        const classroomId = searchParams.get('classroom')
        if (classroomId) {
          const classroom = data.find((c: Classroom) => c.id === classroomId)
          if (classroom) {
            setCurrentClassroom(classroom)
          }
        }
      }
    } catch (err) {
      setError('Error cargando clases')
    }
  }

  const loadActiveSessions = async () => {
    try {
      // Obtener sesiones activas
      const sessionsResponse = await fetch('http://127.0.0.1:8000/api/classroom/active-sessions')
      if (!sessionsResponse.ok) {
        throw new Error('Error cargando sesiones activas')
      }
      const sessionsData = await sessionsResponse.json()
      const activeSessions = sessionsData.active_sessions || []
      
      // Usar directamente las sesiones activas
      setClassroomSessions(activeSessions)
      console.log('Sesiones activas cargadas:', activeSessions)
    } catch (err) {
      console.error('Error cargando sesiones activas:', err)
      setClassroomSessions([])
    }
  }

  const startSession = async () => {
    if (!currentClassroom) {
      setError('No hay aula seleccionada')
      return
    }

    // Si no hay información de clase, mostrar el modal
    if (!classInfo) {
      setShowClassInfoModal(true)
      return
    }

    setLoading(true)
    try {
      const response = await fetch('http://127.0.0.1:8000/api/classroom/start-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classroom_id: currentClassroom.id,
          materia: classInfo.materia,
          student_count: classInfo.studentCount
        })
      })

      if (response.ok) {
        const session = await response.json()
        setCurrentSession(session)
        setSessionStartTime(new Date()) // Establecer tiempo de inicio
        setSessionDuration('00:00:00') // Reiniciar duración
        await loadActiveSessions()
      } else {
        setError('Error iniciando sesión')
      }
    } catch (err) {
      setError('Error iniciando sesión')
    } finally {
      setLoading(false)
    }
  }

  const confirmStartSession = async () => {
    if (!classSubject.trim() || studentCount <= 0) {
      setError('Por favor complete todos los campos requeridos')
      return
    }

    try {
      setLoading(true)
      setShowClassInfoModal(false)
      
      // Guardar información de la clase
      const newClassInfo = {
        materia: classSubject,
        studentCount: studentCount,
        classroomName: currentClassroom?.name || ''
      }
      
      setClassInfo(newClassInfo)
      localStorage.setItem('classInfo', JSON.stringify(newClassInfo))
      
      // Limpiar formulario
      setClassSubject('')
      setStudentCount(0)
      
      // Iniciar sesión con la información
      const response = await fetch('http://127.0.0.1:8000/api/classroom/start-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classroom_id: currentClassroom?.id || '',
          materia: classSubject,
          student_count: studentCount
        })
      })

      if (response.ok) {
        const session = await response.json()
        setCurrentSession(session)
        await loadActiveSessions()
      } else {
        setError('Error iniciando sesión')
      }
    } catch (err) {
      setError('Error iniciando sesión')
    } finally {
      setLoading(false)
    }
  }

  const endSession = async () => {
    if (!currentSession) return

    setLoading(true)
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/classroom/${currentSession.id}/end-session`, {
        method: 'POST'
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Sesión finalizada:', result)
        
        // Mostrar duración de la sesión
        alert(`Sesión finalizada exitosamente.\nDuración: ${result.session_duration_formatted}`)
        
        setCurrentSession(null)
        setIsMonitoring(false)
        setCameraActive(false)
        setSessionStartTime(null) // Limpiar tiempo de inicio
        setSessionDuration('00:00:00') // Reiniciar duración
        await loadActiveSessions()
      } else {
        setError('Error terminando sesión')
      }
    } catch (err) {
      setError('Error terminando sesión')
    } finally {
      setLoading(false)
    }
  }

  const startCamera = async () => {
    try {
      setLoading(true)
      console.log('Iniciando cámara...')
      const response = await fetch('http://127.0.0.1:8000/api/emotion/start-camera', {
        method: 'POST'
      })
      
      console.log('Respuesta de start-camera:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Cámara iniciada:', data)
        setCameraActive(true)
        setError(null) // Limpiar errores previos
      } else {
        const errorData = await response.json()
        console.error('Error iniciando cámara:', errorData)
        setError(`Error iniciando cámara: ${errorData.detail || 'Error desconocido'}`)
      }
    } catch (err) {
      console.error('Error conectando con la cámara:', err)
      setError('Error conectando con la cámara. Verifica que el servidor esté ejecutándose.')
    } finally {
      setLoading(false)
    }
  }

  const stopCamera = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://127.0.0.1:8000/api/emotion/stop-camera', {
        method: 'POST'
      })
      
      if (response.ok) {
        setCameraActive(false)
      } else {
        setError('No se pudo detener la cámara')
      }
    } catch (err) {
      setError('Error conectando con la cámara')
    } finally {
      setLoading(false)
    }
  }

  const checkCameraStatus = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/emotion/camera-status')
      if (response.ok) {
        const data = await response.json()
        console.log('Estado de cámara:', data)
        setCameraActive(data.active)
      } else {
        console.error('Error verificando estado de cámara:', response.status)
      }
    } catch (err) {
      console.error('Error verificando estado de cámara:', err)
    }
  }

  const fetchEmotionData = async () => {
    try {
      // Intentar primero el endpoint de tiempo real
      const response = await fetch('http://127.0.0.1:8000/api/emotion/realtime-emotions')
      if (response.ok) {
        const data = await response.json()
        console.log('Datos emocionales en tiempo real:', data)
        setEmotionData(data)
      } else {
        // Si falla, usar el endpoint de distribución
        const fallbackResponse = await fetch('http://127.0.0.1:8000/api/emotion/emotion-distribution')
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json()
          console.log('Datos emocionales (fallback):', data)
          setEmotionData(data)
        }
      }
    } catch (err) {
      console.error('Error obteniendo datos emocionales:', err)
    }
  }

  const startMonitoring = async () => {
    if (!currentSession) return

    setLoading(true)
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/classroom/${currentSession.id}/start-monitoring`, {
        method: 'POST'
      })

      if (response.ok) {
        setIsMonitoring(true)
        await startCamera()
        // Recargar sesiones para mostrar el nuevo estado
        await loadActiveSessions()
      } else {
        setError('Error iniciando monitoreo')
      }
    } catch (err) {
      setError('Error iniciando monitoreo')
    } finally {
      setLoading(false)
    }
  }

  const stopMonitoring = async () => {
    if (!currentSession) return

    setLoading(true)
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/classroom/${currentSession.id}/end-session`, {
        method: 'POST'
      })

      if (response.ok) {
        setIsMonitoring(false)
        stopCamera()
        // Recargar sesiones para mostrar el nuevo estado
        await loadActiveSessions()
      } else {
        setError('Error deteniendo monitoreo')
      }
    } catch (err) {
      setError('Error deteniendo monitoreo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-20px) rotate(90deg); }
          50% { transform: translateY(-10px) rotate(180deg); }
          75% { transform: translateY(-15px) rotate(270deg); }
        }
        
        @keyframes drift {
          0%, 100% { transform: translateX(0px) translateY(0px); }
          25% { transform: translateX(10px) translateY(-5px); }
          50% { transform: translateX(-5px) translateY(-10px); }
          75% { transform: translateX(-10px) translateY(5px); }
        }
        
        @keyframes orbit {
          0% { transform: rotate(0deg) translateX(30px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(30px) rotate(-360deg); }
        }
        
        @keyframes glow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }
        
        @keyframes connect {
          0%, 100% { opacity: 0.2; transform: scaleX(0.5); }
          50% { opacity: 0.6; transform: scaleX(1); }
        }
        
        .float-animation { animation: float 6s ease-in-out infinite; }
        .drift-animation { animation: drift 8s ease-in-out infinite; }
        .orbit-animation { animation: orbit 10s linear infinite; }
        .glow-animation { animation: glow 4s ease-in-out infinite; }
        .connect-animation { animation: connect 3s ease-in-out infinite; }
      `}</style>
      <div className="min-h-screen bg-gray-900 relative overflow-hidden pt-16">
      
        {/* Background Graphics */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Main floating orbs with custom animations */}
          <div className="absolute top-16 left-16 w-4 h-4 bg-white rounded-full opacity-80 float-animation"></div>
          <div className="absolute top-24 left-24 w-1 h-12 bg-gradient-to-b from-white/60 to-transparent connect-animation"></div>
          <div className="absolute top-32 left-32 w-2 h-2 bg-white rounded-full opacity-60 glow-animation"></div>
          
          <div className="absolute top-16 right-16 w-4 h-4 bg-white rounded-full opacity-80 float-animation" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-24 right-24 w-1 h-16 bg-gradient-to-b from-white/60 to-transparent connect-animation" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-32 right-32 w-2 h-2 bg-white rounded-full opacity-60 glow-animation" style={{animationDelay: '1.5s'}}></div>
          
          <div className="absolute bottom-32 left-16 w-4 h-4 bg-white rounded-full opacity-80 float-animation" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-24 left-24 w-1 h-12 bg-gradient-to-t from-white/60 to-transparent connect-animation" style={{animationDelay: '0.5s'}}></div>
          <div className="absolute bottom-32 left-32 w-2 h-2 bg-white rounded-full opacity-60 glow-animation" style={{animationDelay: '2.5s'}}></div>
          
          <div className="absolute bottom-32 right-16 w-4 h-4 bg-white rounded-full opacity-80 float-animation" style={{animationDelay: '3s'}}></div>
          <div className="absolute bottom-24 right-24 w-1 h-16 bg-gradient-to-t from-white/60 to-transparent connect-animation" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-32 right-32 w-2 h-2 bg-white rounded-full opacity-60 glow-animation" style={{animationDelay: '0.8s'}}></div>
          
          {/* Colorful floating orbs with drift animation */}
          <div className="absolute top-1/4 left-1/3 w-3 h-3 bg-blue-400 rounded-full opacity-70 drift-animation"></div>
          <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-purple-400 rounded-full opacity-70 drift-animation" style={{animationDelay: '1.5s'}}></div>
          <div className="absolute bottom-1/3 left-1/4 w-3 h-3 bg-cyan-400 rounded-full opacity-70 drift-animation" style={{animationDelay: '3s'}}></div>
          <div className="absolute bottom-1/4 right-1/3 w-3 h-3 bg-pink-400 rounded-full opacity-70 drift-animation" style={{animationDelay: '0.5s'}}></div>
          
          {/* Orbiting elements */}
          <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-yellow-400 rounded-full opacity-60 orbit-animation"></div>
          <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-green-400 rounded-full opacity-50 orbit-animation" style={{animationDelay: '2s', animationDuration: '8s'}}></div>
          
          {/* Central pulsing glow effect */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl glow-animation"></div>
          
          {/* Dynamic connection lines */}
          <div className="absolute top-1/4 left-1/2 w-0.5 h-20 bg-gradient-to-b from-white/40 to-transparent connect-animation" style={{transform: 'rotate(15deg)', animationDelay: '0.5s'}}></div>
          <div className="absolute top-1/2 right-1/4 w-0.5 h-16 bg-gradient-to-b from-white/40 to-transparent connect-animation" style={{transform: 'rotate(-20deg)', animationDelay: '1.5s'}}></div>
          <div className="absolute bottom-1/3 left-1/3 w-0.5 h-24 bg-gradient-to-t from-white/40 to-transparent connect-animation" style={{transform: 'rotate(10deg)', animationDelay: '2.5s'}}></div>
          <div className="absolute bottom-1/4 right-1/2 w-0.5 h-18 bg-gradient-to-t from-white/40 to-transparent connect-animation" style={{transform: 'rotate(-15deg)', animationDelay: '1s'}}></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          {currentClassroom ? (
            <>
              <h1 className="text-3xl font-bold text-white">Dashboard - {currentClassroom.name}</h1>
              <p className="text-gray-300 mt-2">
                Monitoreo emocional en tiempo real • {currentClassroom.total_students} estudiantes
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-white">Monitoreo de Clase</h1>
              <p className="text-gray-300 mt-2">Seleccione una clase para comenzar el monitoreo</p>
            </>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {currentClassroom ? (
          <div className={`grid gap-8 transition-all duration-300 ${
            videoSize === 'large' 
              ? 'grid-cols-1' 
              : 'grid-cols-1 lg:grid-cols-2'
          }`}>
            {/* Panel de Control */}
            <div className={`bg-white rounded-lg shadow-md p-6 transition-all duration-300 ${
              videoSize === 'large' ? 'hidden' : ''
            }`}>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Información del Aula</h2>
              
              {/* Información del Aula */}
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-6">
                <h3 className="font-medium text-gray-800 mb-3">Datos del Aula</h3>
                <div className="space-y-2">
                  <p className="text-gray-700 text-sm">
                    <span className="font-medium">Nombre:</span> {currentClassroom.name}
                  </p>
                  <p className="text-gray-700 text-sm">
                    <span className="font-medium">Número:</span> {currentClassroom.number}
                  </p>
                  {currentClassroom.description && (
                    <p className="text-gray-700 text-sm">
                      <span className="font-medium">Descripción:</span> {currentClassroom.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Información de la Clase (del formulario) */}
              {classInfo ? (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                  <h3 className="font-medium text-blue-800 mb-3">Información de la Clase</h3>
                  <div className="space-y-2">
                    <p className="text-blue-700 text-sm">
                      <span className="font-medium">Materia:</span> {classInfo.materia}
                    </p>
                    <p className="text-blue-700 text-sm">
                      <span className="font-medium">Cantidad de Alumnos:</span> {classInfo.studentCount}
                    </p>
                    <p className="text-blue-700 text-sm">
                      <span className="font-medium">Aula:</span> {classInfo.classroomName}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
                  <h3 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                    </svg>
                    Información de Clase No Disponible
                  </h3>
                  <p className="text-yellow-700 text-sm">
                    No se encontró información de la clase. Vuelve a la página de Sesiones para completar el formulario.
                  </p>
                </div>
              )}
              
              {!currentSession ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h3 className="font-medium text-blue-800">Estado del Monitoreo</h3>
                    <p className="text-blue-700 text-sm">
                      El monitoreo está apagado. Haz clic en "Iniciar Sesión" para comenzar.
                    </p>
                  </div>
                  
                  <button
                    onClick={startSession}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Iniciando...' : 'Iniciar Sesión de Monitoreo'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <h3 className="font-medium text-green-800">Sesión Activa</h3>
                    <p className="text-green-700 text-sm">
                      Clase: {currentSession.classroom_name}
                    </p>
                    <p className="text-green-700 text-sm">
                      Iniciada: {new Date(currentSession.start_time).toLocaleString()}
                    </p>
                    <div className="mt-2 p-2 bg-green-100 rounded-md">
                      <p className="text-green-800 text-sm font-medium">
                        Duración: {sessionDuration}
                    </p>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={startMonitoring}
                      disabled={isMonitoring || loading}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isMonitoring ? 'Monitoreando...' : 'Iniciar Monitoreo'}
                    </button>
                    
                    <button
                      onClick={stopMonitoring}
                      disabled={!isMonitoring || loading}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Detener Monitoreo
                    </button>
                  </div>

                  <button
                    onClick={endSession}
                    disabled={loading}
                    className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 disabled:opacity-50"
                  >
                    Terminar Sesión
                  </button>
                </div>
              )}
            </div>

           {/* Vista de Cámara Mejorada */}
           <div className={`bg-white rounded-lg shadow-md transition-all duration-300 ${
             videoSize === 'large' ? 'col-span-2 p-2' : 'p-6'
           }`}>
             <div className={`flex items-center justify-between transition-all duration-300 ${
               videoSize === 'large' ? 'mb-2' : 'mb-6'
             }`}>
               <h2 className={`font-semibold text-gray-900 transition-all duration-300 ${
                 videoSize === 'large' ? 'text-lg' : 'text-xl'
               }`}>
                 Cámara de Monitoreo - {currentClassroom.name}
               </h2>
               <div className="flex items-center gap-2">
                 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                   cameraActive 
                     ? 'bg-green-100 text-green-800' 
                     : 'bg-gray-100 text-gray-800'
                 }`}>
                   <div className={`w-2 h-2 rounded-full mr-1.5 ${
                     cameraActive ? 'bg-green-400' : 'bg-gray-400'
                   }`}></div>
                   {cameraActive ? 'En Vivo' : 'Desconectado'}
                 </span>
               </div>
             </div>
             
             {/* Contenedor de Video con Controles */}
             <div className={`video-container relative bg-black rounded-lg overflow-hidden shadow-lg ${
               videoSize === 'fullscreen' 
                 ? 'fixed inset-0 z-50 rounded-none' 
                 : videoSize === 'large'
                 ? 'min-h-[70vh]'
                 : ''
             }`}>
               {cameraActive ? (
                 <div className="relative group w-full h-full">
                   <img
                     src={`http://127.0.0.1:8000/api/emotion/video-stream?t=${streamKey}`}
                     className={`cursor-pointer ${
                       videoSize === 'fullscreen' 
                         ? `h-screen object-${videoFitMode} ${videoSizeMode === 'auto' ? 'w-full' : ''}` 
                         : videoSize === 'large'
                         ? 'h-auto max-h-[70vh] object-contain w-full'
                         : 'h-auto max-h-96 object-cover w-full'
                     }`}
                     style={videoSize === 'fullscreen' && videoSizeMode !== 'auto' ? { width: videoSizeMode } : {}}
                     onLoadStart={() => {
                       console.log('Stream cargando...')
                       setVideoLoading(true)
                     }}
                     onLoad={() => {
                       console.log('Stream cargado correctamente')
                       setVideoLoading(false)
                     }}
                     onError={(e) => {
                       console.error('Error en stream:', e)
                       setVideoLoading(false)
                       setError('Error cargando video stream. Verifica que la cámara esté iniciada.')
                     }}
                     onDoubleClick={async () => {
                       try {
                         if (videoSize === 'fullscreen') {
                           if (document.fullscreenElement) {
                             await document.exitFullscreen()
                           }
                           setVideoSize('normal')
                         } else {
                           const videoContainer = document.querySelector('.video-container')
                           if (videoContainer) {
                             await videoContainer.requestFullscreen()
                             setVideoSize('fullscreen')
                           }
                         }
                       } catch (err) {
                         console.error('Error con pantalla completa:', err)
                       }
                     }}
                     key={cameraActive ? 'active' : 'inactive'}
                   />
                   
                   {/* Overlay de Controles (aparece al hacer hover) */}
                   <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                     <div className="flex items-center gap-4">
                       <button
                         onClick={async () => {
                           try {
                             if (videoSize === 'fullscreen') {
                               if (document.fullscreenElement) {
                                 await document.exitFullscreen()
                               }
                               setVideoSize('normal')
                             } else {
                               const videoContainer = document.querySelector('.video-container')
                               if (videoContainer) {
                                 await videoContainer.requestFullscreen()
                                 setVideoSize('fullscreen')
                               }
                             }
                           } catch (err) {
                             console.error('Error con pantalla completa:', err)
                           }
                         }}
                         className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 p-3 rounded-full transition-all duration-200"
                         title="Pantalla Completa"
                       >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                         </svg>
                       </button>
                       
                       <button
                         onClick={async () => {
                           try {
                             setLoading(true)
                             const response = await fetch('http://127.0.0.1:8000/api/emotion/stop-camera', {
                               method: 'POST'
                             })
                             
                             if (response.ok) {
                               setCameraActive(false)
                               setVideoLoading(false)
                               setError(null)
                             } else {
                               setError('No se pudo detener la cámara')
                             }
                           } catch (err) {
                             console.error('Error deteniendo cámara:', err)
                             setError('Error deteniendo cámara')
                           } finally {
                             setLoading(false)
                           }
                         }}
                         className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-full transition-all duration-200"
                         title="Detener Cámara"
                       >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                         </svg>
                       </button>
                     </div>
                   </div>
                   
                   {/* Indicador de En Vivo */}
                   <div className="absolute top-4 right-4 flex items-center gap-2">
                     <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                     <span className="text-white text-sm font-medium bg-black bg-opacity-50 px-2 py-1 rounded">
                       EN VIVO
                     </span>
                   </div>
                   
                   {/* Información de Resolución */}
                   <div className="absolute bottom-4 right-4 text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
                     720p • 30fps
                   </div>
                   
                   {/* Icono de engranaje para ajustes - Solo en pantalla completa */}
                   {videoSize === 'fullscreen' && (
                     <div className="absolute bottom-4 left-4 z-[50]">
                     <button
                       onClick={() => setShowVideoSettings(!showVideoSettings)}
                       className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg transition-all duration-200 backdrop-blur-sm"
                       title="Ajustes de Video"
                     >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                       </svg>
                     </button>
                   </div>
                   )}
                   
                   {/* Panel de Ajustes de Video */}
                   {showVideoSettings && videoSize !== 'fullscreen' && (
                     <div className="absolute bottom-16 left-4 bg-black/90 text-white p-4 rounded-lg shadow-2xl min-w-80 backdrop-blur-sm z-50">
                       <div className="flex items-center justify-between mb-4">
                         <h3 className="text-sm font-semibold flex items-center gap-2">
                           <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                           </svg>
                           Ajustes de Video
                         </h3>
                         <button
                           onClick={() => setShowVideoSettings(false)}
                           className="text-gray-400 hover:text-gray-200 transition-colors duration-200"
                           title="Cerrar Ajustes"
                         >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                           </svg>
                         </button>
                       </div>
                       
                       <div className="space-y-4">
                         {/* Modo de Ajuste */}
                         <div>
                           <label className="block text-xs font-medium text-gray-300 mb-2">Modo de Ajuste:</label>
                           <div className="grid grid-cols-2 gap-2">
                             {[
                               { value: 'contain', label: 'Ajustar', desc: 'Ver todo' },
                               { value: 'cover', label: 'Llenar', desc: 'Sin bordes' },
                               { value: 'fill', label: 'Estirar', desc: 'Sin altura' },
                               { value: 'scale-down', label: 'Reducir', desc: 'Más pequeño' },
                               { value: 'none', label: 'Original', desc: 'Tamaño real' }
                             ].map(mode => (
                               <button
                                 key={mode.value}
                                 onClick={() => setVideoFitMode(mode.value as any)}
                                 className={`p-2 rounded text-xs transition-all ${
                                   videoFitMode === mode.value 
                                     ? 'bg-blue-600 text-white' 
                                     : 'bg-gray-800 border border-gray-600 hover:bg-gray-700 text-gray-300'
                                 }`}
                               >
                                 <div className="font-medium">{mode.label}</div>
                                 <div className="text-xs opacity-75">{mode.desc}</div>
                               </button>
                             ))}
                           </div>
                         </div>
                         
                         {/* Tamaño del Video */}
                         <div>
                           <label className="block text-xs font-medium text-gray-300 mb-2">Tamaño:</label>
                           <div className="grid grid-cols-3 gap-1">
                             {[
                               { value: 'auto', label: 'Auto' },
                               { value: '25%', label: '25%' },
                               { value: '50%', label: '50%' },
                               { value: '75%', label: '75%' },
                               { value: '100%', label: '100%' }
                             ].map(size => (
                               <button
                                 key={size.value}
                                 onClick={() => setVideoSizeMode(size.value as any)}
                                 className={`p-2 rounded text-xs transition-all ${
                                   videoSizeMode === size.value 
                                     ? 'bg-green-600 text-white' 
                                     : 'bg-gray-800 border border-gray-600 hover:bg-gray-700 text-gray-300'
                                 }`}
                               >
                                 {size.label}
                               </button>
                             ))}
                           </div>
                         </div>
                       </div>
                       
                       {/* Indicador del estado actual */}
                       <div className="mt-4 pt-3 border-t border-gray-700">
                         <div className="text-xs text-gray-400 text-center">
                           <div>Modo: <span className="text-blue-400 font-medium">{videoFitMode}</span></div>
                           <div>Tamaño: <span className="text-green-400 font-medium">{videoSizeMode}</span></div>
                         </div>
                       </div>
                     </div>
                   )}
                   
                   {/* Indicador de Pantalla Completa */}
                   {videoSize === 'fullscreen' && (
                     <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white text-sm px-4 py-2 rounded-lg">
                       <div className="flex items-center gap-2">
                         <span>Pantalla Completa</span>
                         <span className="text-xs opacity-75">Doble clic o ESC para salir</span>
                       </div>
                     </div>
                   )}
                   
                   {/* Panel de Ajustes en Pantalla Completa */}
                   {videoSize === 'fullscreen' && showVideoSettings && (
                     <div className="absolute bottom-20 left-4 z-[60]">
                       <div className="bg-black bg-opacity-95 text-white p-4 rounded-lg shadow-2xl min-w-80 border border-gray-600">
                         <h3 className="text-sm font-semibold mb-3 text-center">Ajustes de Video</h3>
                         
                         {/* Modo de Ajuste */}
                         <div className="mb-4">
                           <label className="block text-xs font-medium mb-2">Modo de Ajuste:</label>
                           <div className="grid grid-cols-2 gap-2">
                             {[
                               { value: 'contain', label: 'Ajustar', desc: 'Ver todo' },
                               { value: 'cover', label: 'Llenar', desc: 'Sin bordes' },
                               { value: 'fill', label: 'Estirar', desc: 'Sin altura' },
                               { value: 'scale-down', label: 'Reducir', desc: 'Más pequeño' },
                               { value: 'none', label: 'Original', desc: 'Tamaño real' }
                             ].map(mode => (
                               <button
                                 key={mode.value}
                                 onClick={() => setVideoFitMode(mode.value as any)}
                                 className={`p-2 rounded text-xs transition-all ${
                                   videoFitMode === mode.value 
                                     ? 'bg-blue-600 text-white' 
                                     : 'bg-gray-700 hover:bg-gray-600'
                                 }`}
                               >
                                 <div className="font-medium">{mode.label}</div>
                                 <div className="text-xs opacity-75">{mode.desc}</div>
                               </button>
                             ))}
                           </div>
                         </div>
                         
                         {/* Tamaño del Video */}
                         <div className="mb-4">
                           <label className="block text-xs font-medium mb-2">Tamaño:</label>
                           <div className="grid grid-cols-3 gap-1">
                             {[
                               { value: 'auto', label: 'Auto' },
                               { value: '25%', label: '25%' },
                               { value: '50%', label: '50%' },
                               { value: '75%', label: '75%' },
                               { value: '100%', label: '100%' }
                             ].map(size => (
                               <button
                                 key={size.value}
                                 onClick={() => setVideoSizeMode(size.value as any)}
                                 className={`p-2 rounded text-xs transition-all ${
                                   videoSizeMode === size.value 
                                     ? 'bg-green-600 text-white' 
                                     : 'bg-gray-700 hover:bg-gray-600'
                                 }`}
                               >
                                 {size.label}
                               </button>
                             ))}
                           </div>
                         </div>
                         
                         {/* Indicador del estado actual */}
                         <div className="text-xs text-gray-300 text-center pt-2 border-t border-gray-600">
                           <div>Modo: <span className="text-blue-400">{videoFitMode}</span></div>
                           <div>Tamaño: <span className="text-green-400">{videoSizeMode}</span></div>
                         </div>
                       </div>
                     </div>
                   )}
                   
                   {/* Indicador de Carga del Video */}
                   {videoLoading && (
                     <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                       <div className="text-center text-white">
                         <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                         <p className="text-lg font-medium">Cargando Video...</p>
                         <p className="text-sm opacity-75">Iniciando stream de cámara</p>
                       </div>
                     </div>
                   )}
                 </div>
                 ) : (
                   <div className={`bg-gray-800 flex items-center justify-center ${
                     videoSize === 'fullscreen' ? 'h-screen' : 'aspect-video'
                   }`}>
                     <div className="text-center text-white">
                       <div className="w-20 h-20 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
                         <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                         </svg>
                       </div>
                       <p className="text-lg font-medium mb-2">Cámara Desconectada</p>
                       <p className="text-sm text-gray-400">Haz clic en "Iniciar Cámara" para comenzar el monitoreo</p>
                     </div>
                   </div>
                 )}
             </div>
             
             {/* Controles de Cámara */}
             <div className={`flex items-center justify-between transition-all duration-300 ${
               videoSize === 'large' ? 'mt-2' : 'mt-4'
             }`}>
               <div className="flex items-center gap-3">
                  <button
                    onClick={startMonitoring}
                    disabled={cameraActive || loading || !currentSession}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                    {loading ? 'Iniciando...' : 'Iniciar Monitoreo'}
                  </button>
                 
                  <button
                    onClick={stopMonitoring}
                    disabled={!cameraActive || !currentSession}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Detener Monitoreo
                  </button>
               </div>
               
               {/* Controles de Tamaño */}
               <div className="flex items-center gap-2">
                 <button
                   onClick={() => {
                     setVideoSize(videoSize === 'normal' ? 'large' : 'normal')
                   }}
                   className={`p-2 rounded-lg transition-colors duration-200 ${
                     videoSize === 'large' 
                       ? 'bg-purple-600 text-white' 
                       : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                   }`}
                   title={videoSize === 'normal' ? 'Modo Cine' : 'Salir del Modo Cine'}
                 >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                   </svg>
                 </button>
                 
                 <button
                   onClick={async () => {
                     try {
                       if (videoSize === 'fullscreen') {
                         if (document.fullscreenElement) {
                           await document.exitFullscreen()
                         }
                         setVideoSize('normal')
                       } else {
                         const videoContainer = document.querySelector('.video-container')
                         if (videoContainer) {
                           await videoContainer.requestFullscreen()
                           setVideoSize('fullscreen')
                         }
                       }
                     } catch (err) {
                       console.error('Error con pantalla completa:', err)
                       setError('Error activando pantalla completa')
                     }
                   }}
                   className={`p-2 rounded-lg transition-colors duration-200 ${
                     videoSize === 'fullscreen' 
                       ? 'bg-green-600 text-white' 
                       : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                   }`}
                   title={videoSize === 'fullscreen' ? 'Salir de Pantalla Completa' : 'Pantalla Completa'}
                 >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                   </svg>
                 </button>
               </div>
             </div>
             
             {/* Sección de Distribución Emocional */}
             <div className={`bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg transition-all duration-300 ${
               videoSize === 'large' ? 'mt-2 p-3' : 'mt-6 p-6'
             }`}>
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                   <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                   </svg>
                   Distribución Emocional
                 </h3>
                 
                 {/* Contador de rostros detectados */}
                 <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg shadow-lg border border-blue-400/30 text-sm font-bold flex items-center gap-2">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                   </svg>
                   <span>Rostros: {emotionData.total_detections}</span>
                 </div>
               </div>
               
               <div className={`grid gap-4 transition-all duration-300 ${
                 videoSize === 'large' ? 'grid-cols-4' : 'grid-cols-2 md:grid-cols-4'
               }`}>
                 {/* Felicidad */}
                 <div className={`bg-gradient-to-br from-yellow-100 to-yellow-200 border border-yellow-300 rounded-lg text-center transition-all duration-300 ${
                   videoSize === 'large' ? 'p-2' : 'p-4'
                 }`}>
                   <div className="w-12 h-12 mx-auto mb-2 bg-yellow-500 rounded-full flex items-center justify-center">
                     <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                       <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                     </svg>
                   </div>
                   <h4 className="font-semibold text-yellow-800 text-sm">Felicidad</h4>
                   <p className="text-2xl font-bold text-yellow-700">{emotionData.felicidad.percentage}%</p>
                   <p className="text-xs text-yellow-600">{emotionData.felicidad.count} estudiantes</p>
                 </div>
                 
                 {/* Tristeza */}
                 <div className={`bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300 rounded-lg text-center transition-all duration-300 ${
                   videoSize === 'large' ? 'p-2' : 'p-4'
                 }`}>
                   <div className="w-12 h-12 mx-auto mb-2 bg-blue-500 rounded-full flex items-center justify-center">
                     <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                       <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z"/>
                     </svg>
                   </div>
                   <h4 className="font-semibold text-blue-800 text-sm">Tristeza</h4>
                   <p className="text-2xl font-bold text-blue-700">{emotionData.tristeza.percentage}%</p>
                   <p className="text-xs text-blue-600">{emotionData.tristeza.count} estudiantes</p>
                 </div>
                 
                 {/* Enojo */}
                 <div className={`bg-gradient-to-br from-red-100 to-red-200 border border-red-300 rounded-lg text-center transition-all duration-300 ${
                   videoSize === 'large' ? 'p-2' : 'p-4'
                 }`}>
                   <div className="w-12 h-12 mx-auto mb-2 bg-red-500 rounded-full flex items-center justify-center">
                     <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                       <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v2h-2v-2zm0-8h2v6h-2V9z"/>
                     </svg>
                   </div>
                   <h4 className="font-semibold text-red-800 text-sm">Enojo</h4>
                   <p className="text-2xl font-bold text-red-700">{emotionData.enojo.percentage}%</p>
                   <p className="text-xs text-red-600">{emotionData.enojo.count} estudiantes</p>
                 </div>
                 
                 {/* Neutral */}
                 <div className={`bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 rounded-lg text-center transition-all duration-300 ${
                   videoSize === 'large' ? 'p-2' : 'p-4'
                 }`}>
                   <div className="w-12 h-12 mx-auto mb-2 bg-gray-500 rounded-full flex items-center justify-center">
                     <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                       <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v2h-2v-2zm0-8h2v6h-2V9z"/>
                     </svg>
                   </div>
                   <h4 className="font-semibold text-gray-800 text-sm">Neutral</h4>
                   <p className="text-2xl font-bold text-gray-700">{emotionData.neutral.percentage}%</p>
                   <p className="text-xs text-gray-600">{emotionData.neutral.count} estudiantes</p>
                 </div>
               </div>
               
               {/* Barra de progreso general */}
               <div className="mt-4">
                 <div className="flex items-center justify-between mb-2">
                   <span className="text-sm font-medium text-gray-700">Estado General del Aula</span>
                   <span className="text-sm text-gray-500">
                     {emotionData.total_detections > 0 ? `${emotionData.total_detections} detecciones` : 'Sin datos'}
                   </span>
                 </div>
                 <div className="w-full bg-gray-200 rounded-full h-3">
                   <div 
                     className={`h-3 rounded-full transition-all duration-500 ${
                       emotionData.total_detections > 0 
                         ? 'bg-gradient-to-r from-green-400 to-green-500' 
                         : 'bg-gradient-to-r from-gray-400 to-gray-500'
                     }`} 
                     style={{width: `${Math.min(emotionData.total_detections * 10, 100)}%`}}
                   ></div>
                 </div>
                 <p className="text-xs text-gray-500 mt-2 text-center">
                   {emotionData.camera_active 
                     ? 'Análisis emocional en tiempo real' 
                     : 'Inicia la cámara para comenzar el análisis emocional'
                   }
                 </p>
               </div>
             </div>
           </div>
        </div>
        ) : null}

        {/* Lista de Aulas */}
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Lista de Aulas</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  console.log('🔄 Actualizando manualmente...')
                  loadActiveSessions()
                }}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualizar
              </button>
              <div className="bg-purple-100 text-purple-800 px-4 py-2 rounded-lg font-semibold">
                Total de Sesiones Activas: {classroomSessions.length}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classroomSessions.map((session) => (
              <div key={session.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-all duration-200">
                {/* Header con icono y estado */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{session.classroom_name}</h3>
                      <p className="text-sm text-gray-400">Aula {session.classroom_id}</p>
                    </div>
                  </div>
                  
                  {/* Estado dinámico */}
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    session.status === 'monitoring' 
                      ? 'bg-green-500 text-white' 
                      : session.status === 'created'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-500 text-white'
                  }`}>
                    {session.status === 'monitoring' ? 'MONITOREANDO' : 
                     session.status === 'created' ? 'ESPERANDO' : 
                     'INACTIVA'}
                  </div>
                </div>
                
                {/* Información de la sesión */}
                <div className="mb-4">
                  <p className="text-sm text-gray-300">Materia: {session.materia}</p>
                  <div className="mt-2">
                    <p className={`text-xs ${
                      session.status === 'monitoring' ? 'text-green-400' : 
                      session.status === 'created' ? 'text-yellow-400' : 
                      'text-gray-400'
                    }`}>
                      {session.status === 'monitoring' ? 'Monitoreando' : 
                       session.status === 'created' ? 'Esperando iniciar' : 
                       'Inactiva'}: {session.materia}
                    </p>
                    <p className="text-xs text-gray-500">
                      {session.student_count} estudiantes
                    </p>
                    <p className="text-xs text-gray-500">
                      Iniciada: {new Date(session.start_time).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">ID: {session.id}</p>
                </div>
                
                {/* Botón ACCEDER */}
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      // Establecer la sesión actual y navegar al monitoreo
                      setCurrentSession(session);
                      setCurrentClassroom({
                        id: session.classroom_id,
                        name: session.classroom_name,
                        number: session.classroom_id,
                        total_students: session.student_count || 0,
                        description: ''
                      });
                      
                      // Establecer la información de clase desde la sesión activa
                      setClassInfo({
                        materia: session.materia,
                        studentCount: session.student_count || 0,
                        classroomName: session.classroom_name
                      });
                      
                      // Establecer tiempo de inicio para el cronómetro
                      setSessionStartTime(new Date(session.start_time));
                      
                      console.log('Accediendo a la sesión:', session.classroom_name);
                    }}
                    className="px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    ACCEDER
                  </button>
                </div>
                </div>
            ))}
            </div>
          </div>

        {/* Sección cuando no hay aula seleccionada */}
        {!currentClassroom && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/>
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">Seleccione un Aula</h3>
            <p className="text-gray-600 mb-8">
              Para comenzar el monitoreo emocional, primero debe seleccionar un aula desde la página principal.
            </p>
            <Link
              to="/"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <span className="mr-2">←</span>
              Volver a Seleccionar Aula
            </Link>
          </div>
        )}

        {/* Modal de información de clase */}
        {showClassInfoModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Información de la Clase - {currentClassroom?.name}
              </h3>
              <p className="text-gray-600 mb-6">
                Para iniciar el monitoreo, por favor proporcione información sobre la clase:
              </p>
              
              <form onSubmit={(e) => { e.preventDefault(); confirmStartSession(); }}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Materia/Curso *
                  </label>
                  <input
                    type="text"
                    value={classSubject}
                    onChange={(e) => setClassSubject(e.target.value)}
                    placeholder="Ej: Matemáticas, Ciencias, Historia..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad de Alumnos *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={studentCount}
                    onChange={(e) => setStudentCount(parseInt(e.target.value) || 0)}
                    placeholder="Ej: 25, 30, 35..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowClassInfoModal(false)
                      setClassSubject('')
                      setStudentCount(0)
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Iniciando...' : 'Iniciar Sesión'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
      </div>
    </>
  )
}

export default ClassroomMonitoring