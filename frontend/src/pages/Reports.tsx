import React, { useState, useEffect } from 'react'

interface ReportData {
  session_id: string
  classroom_id: string
  classroom_name: string
  materia: string
  total_duration_minutes: number
  average_emotions: {
    enojo: number
    tristeza: number
    asco: number
    miedo: number
    felicidad: number
    sorpresa: number
    neutral: number
  }
  peak_emotions: { [key: string]: number }
  engagement_score: number
  attention_score: number
  total_faces_detected: number
  recommendations: string[]
  start_time: string
  end_time: string
}

const Reports: React.FC = () => {
  const [reports, setReports] = useState<ReportData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null)

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://127.0.0.1:8000/api/classroom/reports')
      
      if (!response.ok) {
        throw new Error('Error cargando reportes')
      }
      
      const data = await response.json()
      setReports(data.reports || [])
      setError(null)
    } catch (err) {
      console.error('Error cargando reportes:', err)
      setError('Error cargando reportes de la base de datos')
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  const getEmotionColor = (emotion: string) => {
    switch (emotion) {
      case 'felicidad':
        return 'text-green-400 bg-green-500/20'
      case 'tristeza':
        return 'text-blue-400 bg-blue-500/20'
      case 'enojo':
        return 'text-red-400 bg-red-500/20'
      case 'miedo':
        return 'text-purple-400 bg-purple-500/20'
      case 'sorpresa':
        return 'text-yellow-400 bg-yellow-500/20'
      case 'asco':
        return 'text-orange-400 bg-orange-500/20'
      default:
        return 'text-gray-400 bg-gray-500/20'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400 bg-green-500/20'
    if (score >= 60) return 'text-yellow-400 bg-yellow-500/20'
    return 'text-red-400 bg-red-500/20'
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
            <div className="mb-8 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white">Reportes y Análisis</h1>
                <p className="text-gray-300 mt-2">Análisis detallado de las sesiones de monitoreo emocional</p>
              </div>
              <button
                onClick={loadReports}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                {loading ? 'Cargando...' : 'Actualizar'}
              </button>
        </div>

        {error && (
              <div className="mb-6 bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded backdrop-blur-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-md p-12 text-center border border-white/20">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-medium text-white mb-2">No hay reportes disponibles</h3>
            <p className="text-gray-300">Complete algunas sesiones de monitoreo para ver los reportes aquí</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Lista de Reportes */}
            <div className="lg:col-span-1">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-md p-6 border border-white/20">
                    <h2 className="text-xl font-semibold text-white mb-4">Reportes</h2>
                <div className="space-y-3">
                  {reports.map((report, index) => (
                    <div
                      key={report.session_id}
                      onClick={() => setSelectedReport(report)}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors duration-200 ${
                        selectedReport?.session_id === report.session_id
                              ? 'border-blue-400 bg-blue-500/20'
                              : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                      }`}
                    >
                          <h3 className="font-medium text-white">{report.classroom_name}</h3>
                          <p className="text-sm text-gray-300">
                        {report.materia} • {report.total_duration_minutes.toFixed(1)} min
                      </p>
                          <p className="text-sm text-gray-300">
                        Rostros detectados: {report.total_faces_detected}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Detalle del Reporte */}
            <div className="lg:col-span-2">
              {selectedReport ? (
                <div className="space-y-6">
                  {/* Información de la Sesión */}
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-md p-6 border border-white/20">
                        <h2 className="text-xl font-semibold text-white mb-4">Información de la Sesión</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-300">Aula</p>
                        <p className="text-white font-medium">{selectedReport.classroom_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-300">Materia</p>
                        <p className="text-white font-medium">{selectedReport.materia}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="text-center">
                            <div className="text-2xl font-bold text-blue-400">
                          {selectedReport.total_duration_minutes.toFixed(1)}
                        </div>
                            <div className="text-sm text-gray-300">Minutos</div>
                      </div>
                      <div className="text-center">
                            <div className="text-2xl font-bold text-green-400">
                          {selectedReport.total_faces_detected}
                        </div>
                            <div className="text-sm text-gray-300">Rostros Detectados</div>
                      </div>
                    </div>
                  </div>

                      {/* Distribución de Emociones */}
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-md p-6 border border-white/20">
                        <h2 className="text-xl font-semibold text-white mb-4">Distribución de Emociones</h2>
                        <div className="space-y-3">
                          {Object.entries(selectedReport.average_emotions).map(([emotion, percentage]) => (
                            <div key={emotion} className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEmotionColor(emotion)}`}>
                                  {emotion}
                                </span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="w-32 bg-gray-700/50 rounded-full h-2">
                                  <div
                                    className="bg-blue-400 h-2 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium text-white w-12 text-right">
                                  {percentage.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Emociones Pico */}
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-md p-6 border border-white/20">
                        <h2 className="text-xl font-semibold text-white mb-4">Emociones Pico</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(selectedReport.peak_emotions).map(([emotion, percentage]) => (
                            <div key={emotion} className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
                              <div className={`text-2xl font-bold ${getEmotionColor(emotion).split(' ')[0]}`}>
                                {percentage.toFixed(1)}%
                              </div>
                              <div className="text-sm text-gray-300 capitalize">{emotion}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recomendaciones */}
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-md p-6 border border-white/20">
                        <h2 className="text-xl font-semibold text-white mb-4">Recomendaciones</h2>
                        <div className="space-y-3">
                          {selectedReport.recommendations.map((recommendation, index) => (
                            <div key={index} className="flex items-start space-x-3">
                              <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-blue-400 text-sm font-bold">{index + 1}</span>
                              </div>
                              <p className="text-gray-300">{recommendation}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-md p-12 text-center border border-white/20">
                      <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <h3 className="text-lg font-medium text-white mb-2">Seleccione un reporte</h3>
                      <p className="text-gray-300">Elija una sesión de la lista para ver su análisis detallado</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default Reports