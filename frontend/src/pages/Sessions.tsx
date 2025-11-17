import React, { useState, useEffect } from 'react'

interface Classroom {
  id: string
  name: string
  number: string
  description?: string
}

const Sessions: React.FC = () => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateClassroom, setShowCreateClassroom] = useState(false)
  const [newClassroomName, setNewClassroomName] = useState('')
  const [newClassroomNumber, setNewClassroomNumber] = useState('')
  const [newClassroomDescription, setNewClassroomDescription] = useState('')
  const [showClassInfoModal, setShowClassInfoModal] = useState(false)
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null)
  const [classSubject, setClassSubject] = useState('')
  const [studentCount, setStudentCount] = useState(0)

  useEffect(() => {
    loadClassrooms()
  }, [])

  const loadClassrooms = async () => {
    try {
      setLoading(true)
      console.log('Cargando aulas...')
      const response = await fetch('http://127.0.0.1:8000/api/classroom/list')
      console.log('Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Aulas cargadas:', data)
        setClassrooms(data)
        setError(null) // Limpiar errores previos
      } else {
        console.error('Error en respuesta:', response.status, response.statusText)
        setError('Error cargando aulas')
      }
    } catch (err) {
      console.error('Error cargando aulas:', err)
      setError('Error de conexión cargando aulas')
    } finally {
      setLoading(false)
    }
  }

  const createClassroom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClassroomName.trim() || !newClassroomNumber.trim()) return

    try {
      const response = await fetch('http://127.0.0.1:8000/api/classroom/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newClassroomName,
          number: newClassroomNumber,
          description: newClassroomDescription
        })
      })
      
      if (response.ok) {
        setNewClassroomName('')
        setNewClassroomNumber('')
        setNewClassroomDescription('')
        setShowCreateClassroom(false)
        await loadClassrooms()
      } else {
        setError('Error creando aula')
      }
    } catch (err) {
      setError('Error creando aula')
    }
  }

  const handleClassroomClick = (classroom: Classroom) => {
    setSelectedClassroom(classroom)
    setShowClassInfoModal(true)
  }

  const confirmStartSession = async () => {
    if (!selectedClassroom || !classSubject.trim() || studentCount <= 0) {
      setError('Por favor complete todos los campos requeridos')
      return
    }

    try {
      setLoading(true)
      setError(null) // Limpiar errores previos
      
      console.log('Creando ClassroomSession para aula:', selectedClassroom.id)
      console.log('Materia:', classSubject)
      console.log('Alumnos:', studentCount)
      
      // Crear ClassroomSession en la base de datos
      const response = await fetch('http://127.0.0.1:8000/api/classroom/start-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classroom_id: selectedClassroom.id,
          materia: classSubject,
          student_count: studentCount
        })
      })

      if (!response.ok) {
        throw new Error('Error creando sesión de aula')
      }

      const sessionData = await response.json()
      console.log('ClassroomSession creada:', sessionData)
      
      // Guardar información en localStorage para usar en el dashboard
      localStorage.setItem('classInfo', JSON.stringify({
        materia: classSubject,
        studentCount: studentCount,
        classroomName: selectedClassroom.name
      }))
      
      // Guardar el ID del aula antes de limpiar
      const classroomId = selectedClassroom.id
      
      // Limpiar formulario
      setClassSubject('')
      setStudentCount(0)
      setSelectedClassroom(null)
      setShowClassInfoModal(false)
      
      // Redirigir al dashboard del aula
      console.log('Redirigiendo a:', `/classroom-monitoring?classroom=${classroomId}`)
      window.location.href = `/classroom-monitoring?classroom=${classroomId}`
      
    } catch (err) {
      console.error('Error en confirmStartSession:', err)
      setError('Error creando sesión de aula')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="h-screen bg-gray-900 relative overflow-hidden flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Cargando aulas...</p>
        </div>
      </div>
    )
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
        
        /* Card Styles */
        .classroom-card {
          background-color: transparent;
          width: 320px;
          height: 200px;
          perspective: 1000px;
          color: white;
          margin: 0 auto;
        }

        .heading_8264 {
          position: absolute;
          letter-spacing: .2em;
          font-size: 0.8em;
          top: 1.2em;
          right: 1.2em;
          color: #60a5fa;
          font-weight: 600;
        }

        .logo {
          position: absolute;
          top: 1.8em;
          right: 1.8em;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chip {
          position: absolute;
          top: 1.2em;
          left: 1.2em;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .contactless {
          position: absolute;
          top: 1.2em;
          left: 4em;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .number {
          position: absolute;
          font-weight: bold;
          font-size: 0.6em;
          top: 0.5em;
          left: 50%;
          transform: translateX(-50%);
          color: #3b82f6;
          letter-spacing: 0.1em;
          text-align: center;
        }

        .valid_thru {
          position: absolute;
          font-weight: 500;
          font-size: 0.6em;
          top: 1.8em;
          left: 50%;
          transform: translateX(-50%);
          color: #94a3b8;
          letter-spacing: 0.05em;
          text-align: center;
        }

        .date_8264 {
          position: absolute;
          font-weight: 600;
          font-size: 0.9em;
          top: 8.5em;
          left: 1.2em;
          color: #fbbf24;
          letter-spacing: 0.05em;
          max-width: 90%;
          line-height: 1.4;
          word-wrap: break-word;
        }

        .name {
          position: absolute;
          font-weight: 600;
          font-size: 0.8em;
          top: 10.8em;
          left: 1.2em;
          color: #ea580c;
          letter-spacing: 0.05em;
          max-width: 90%;
          line-height: 1.4;
          word-wrap: break-word;
        }

        .card-front {
          box-shadow: rgba(0, 0, 0, 0.4) 0px 2px 2px, rgba(0, 0, 0, 0.3) 0px 7px 13px -3px, rgba(0, 0, 0, 0.2) 0px -1px 0px inset;
          background-color: #171717;
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 1rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
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
      {/* Header */}
          <div className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700">
            <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center py-4">
            <div>
                  <h1 className="text-3xl font-bold text-white">Gestión de Aulas</h1>
                  <p className="text-gray-300">
                Administre las aulas y acceda al monitoreo emocional
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setError(null)
                  loadClassrooms()
                }}
                disabled={loading}
                className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-300 hover:text-blue-200 font-medium py-2 px-4 rounded-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {loading ? 'Cargando...' : 'Actualizar'}
              </button>
              
              <button
                onClick={() => setShowCreateClassroom(true)}
                className="bg-green-500/20 hover:bg-green-500/30 border border-green-400/30 text-green-300 hover:text-green-200 font-medium py-2 px-4 rounded-xl transition-all duration-200 flex items-center gap-2 backdrop-blur-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Nueva Aula
              </button>
            </div>
          </div>
        </div>
      </div>

          <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6 py-8">
        {error && (
              <div className="mb-6 bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded backdrop-blur-sm">
            {error}
          </div>
        )}


        {/* Lista de Aulas */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-md border border-white/20">
              <div className="px-4 py-4 border-b border-white/20">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-white">Lista de Aulas</h2>
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg shadow-lg border border-purple-400/30 text-sm font-bold flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9,22 9,12 15,12 15,22"/>
                    </svg>
                    <span>Total de Aulas: {classrooms.length}</span>
              </div>
            </div>
          </div>
          
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-4">
            {classrooms.map((classroom) => (
                  <div
                key={classroom.id}
                onClick={() => handleClassroomClick(classroom)}
                    className="group bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:from-white/10 hover:to-white/15 hover:border-white/30 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/10 cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                          <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-lg group-hover:text-green-200 transition-colors duration-200">{classroom.name}</h3>
                          <p className="text-gray-400 text-sm">Aula {classroom.number}</p>
                        </div>
                      </div>
                      <div className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-xs font-medium border border-green-400/30">
                        ACTIVA
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-gray-300 text-sm bg-white/5 rounded-lg p-3">
                        <span className="text-gray-400 text-xs block mb-1">Descripción</span>
                        {classroom.description || 'Aula de educación general'}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <div className="text-gray-400 text-xs">
                        ID: {classroom.id}
                      </div>
                      <button className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-300 hover:text-blue-200 text-xs font-medium px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 group-hover:scale-105">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        ACCEDER
                      </button>
                    </div>
                  </div>
                ))}
          </div>
          
          {classrooms.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏫</div>
                  <p className="text-gray-300 mb-4">No hay aulas registradas</p>
              <button
                onClick={() => setShowCreateClassroom(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 inline-flex items-center gap-2"
              >
                <span>➕</span>
                Crear Primera Aula
              </button>
            </div>
          )}
            </div>
        </div>
      </div>

      {/* Modal de información de clase */}
      {showClassInfoModal && selectedClassroom && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="w-80 h-96 bg-sky-50 rounded shadow flex flex-col justify-between p-6">
              <div className="text-center mb-4">
                <h3 className="text-xl font-semibold text-sky-500 mb-2">
                  Información de la Clase
            </h3>
                <p className="text-sm text-sky-500 opacity-75">
                  {selectedClassroom.name}
                </p>
              </div>
              
              <form className="text-sky-500" onSubmit={(e) => { e.preventDefault(); confirmStartSession(); }}>
                <label className="text-xs font-bold after:content-['*'] block mb-1" htmlFor="subject">
                  Materia/Curso
                </label>
                <input
                  className="w-full p-2 mb-4 mt-1 outline-none ring-none focus:ring-2 focus:ring-sky-500 rounded border border-sky-200" 
                  type="text"
                  value={classSubject}
                  onChange={(e) => setClassSubject(e.target.value)}
                  placeholder="Ej: Matemáticas, Ciencias..."
                  required
                />
                
                <label className="text-xs font-bold after:content-['*'] block mb-1" htmlFor="students">
                  Cantidad de Alumnos
                </label>
                <input
                  className="w-full p-2 mb-4 mt-1 outline-none ring-none focus:ring-2 focus:ring-sky-500 rounded border border-sky-200" 
                  type="number"
                  min="1"
                  max="50"
                  value={studentCount}
                  onChange={(e) => setStudentCount(parseInt(e.target.value) || 0)}
                  placeholder="Ej: 25, 30, 35..."
                  required
                />
                
                <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowClassInfoModal(false)
                    setClassSubject('')
                    setStudentCount(0)
                    setSelectedClassroom(null)
                  }}
                    className="flex-1 rounded border border-sky-500 bg-sky-50 hover:bg-sky-100 text-sky-500 p-2 text-center font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                    className="flex-1 rounded bg-sky-500 text-sky-50 p-2 text-center font-bold hover:bg-sky-400 disabled:opacity-50"
                >
                  {loading ? 'Iniciando...' : 'Acceder al Aula'}
                </button>
                </div>
            </form>
                </div>
                </div>
      )}

      {/* Modal para crear aula */}
      {showCreateClassroom && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="w-80 h-96 bg-sky-50 rounded shadow flex flex-col justify-between p-6">
              <div className="text-center mb-4">
                <h3 className="text-xl font-semibold text-sky-500 mb-2">
                  Crear Nueva Aula
                </h3>
                <p className="text-sm text-sky-500 opacity-75">
                  Complete la información del aula
                </p>
              </div>
              
              <form className="text-sky-500" onSubmit={createClassroom}>
                <label className="text-xs font-bold after:content-['*'] block mb-1" htmlFor="name">
                  Nombre del Aula
                </label>
                <input
                  className="w-full p-2 mb-3 mt-1 outline-none ring-none focus:ring-2 focus:ring-sky-500 rounded border border-sky-200" 
                  type="text"
                  value={newClassroomName}
                  onChange={(e) => setNewClassroomName(e.target.value)}
                  placeholder="Ej: Aula de Matemáticas..."
                  required
                />
                
                <label className="text-xs font-bold after:content-['*'] block mb-1" htmlFor="number">
                  Número del Aula
                </label>
                <input
                  className="w-full p-2 mb-3 mt-1 outline-none ring-none focus:ring-2 focus:ring-sky-500 rounded border border-sky-200" 
                  type="text"
                  value={newClassroomNumber}
                  onChange={(e) => setNewClassroomNumber(e.target.value)}
                  placeholder="Ej: 33, A-101, Lab-2"
                  required
                />
                
                <label className="text-xs font-bold block mb-1" htmlFor="description">
                  Descripción
                </label>
                <textarea
                  className="w-full p-2 mb-4 mt-1 outline-none ring-none focus:ring-2 focus:ring-sky-500 rounded border border-sky-200 resize-none"
                  value={newClassroomDescription}
                  onChange={(e) => setNewClassroomDescription(e.target.value)}
                  placeholder="Descripción opcional..."
                  rows={2}
                />
                
                <div className="flex gap-2 mt-4">
              <button
                  type="button"
                  onClick={() => setShowCreateClassroom(false)}
                    className="flex-1 rounded border border-sky-500 bg-sky-50 hover:bg-sky-100 text-sky-500 p-2 text-center font-bold"
              >
                  Cancelar
              </button>
              <button
                  type="submit"
                    className="flex-1 rounded bg-sky-500 text-sky-50 p-2 text-center font-bold hover:bg-sky-400"
                >
                  Crear Aula
              </button>
            </div>
            </form>
          </div>
         </div>
       )}
      </div>
    </>
  )
}

export default Sessions