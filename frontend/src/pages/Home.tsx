import React from 'react'

interface HomeProps {
  onOpenLogin: () => void;
}

const Home: React.FC<HomeProps> = ({ onOpenLogin }) => {

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
      <div className="fixed inset-0 w-full h-full bg-gray-900 overflow-hidden flex flex-col" style={{
        backgroundImage: 'url(/fondo.png)',
        backgroundSize: 'clamp(600px, 50vw, 1200px)',
        backgroundPosition: 'left bottom',
        backgroundRepeat: 'no-repeat'
      }}>
      
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

      {/* Hero Section */}
      <div className="relative z-10 flex-1 flex flex-col justify-center">
        {/* Unlock banner */}
        <div className="max-w-4xl mx-auto px-4 mb-6">
          <div className="flex items-center justify-center gap-2 bg-gray-800/50 backdrop-blur-sm rounded-full px-4 py-2 w-fit mx-auto">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span className="text-white text-sm font-medium">¡Desbloquea tu Potencial de Aprendizaje!</span>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* Main heading */}
        <div className="text-center text-white max-w-4xl mx-auto px-4 mb-8 ml-auto mr-0" style={{marginLeft: 'auto', marginRight: '0', maxWidth: '60%'}}>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">
            Un Clic para la Inteligencia Emocional
          </h1>
          <p className="text-lg text-gray-300 mb-8 max-w-3xl mx-auto">
            Sumérgete en el arte del análisis emocional, donde la tecnología de IA innovadora se encuentra con la experiencia educativa
          </p>
          
          {/* Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
              onClick={onOpenLogin}
              className="bg-white text-gray-900 font-semibold px-8 py-4 rounded-lg hover:bg-gray-100 transition-all duration-200 flex items-center gap-2"
            >
              Abrir Panel
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
          </button>
        </div>
      </div>

        {/* Data Points */}
        <div className="max-w-4xl mx-auto px-4 ml-auto mr-0" style={{marginLeft: 'auto', marginRight: '0', maxWidth: '60%'}}>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-2 bg-white/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
              <div className="text-white font-semibold text-sm">Análisis</div>
              <div className="text-gray-400 text-xs">20.945</div>
          </div>
          
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-2 bg-white/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
            </div>
              <div className="text-white font-semibold text-sm">Emociones</div>
              <div className="text-gray-400 text-xs">19.346</div>
          </div>
          
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-2 bg-white/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
            </div>
              <div className="text-white font-semibold text-sm">Sesiones</div>
              <div className="text-gray-400 text-xs">2.945</div>
          </div>
          
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-2 bg-white/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-white font-semibold text-sm">Estudiantes</div>
              <div className="text-gray-400 text-xs">440</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with partner logos */}
      <div className="relative z-10 border-t border-gray-800 py-4">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-6 text-gray-400">
            <div className="text-xs font-medium">Vercel</div>
            <div className="text-xs font-medium">TensorFlow</div>
            <div className="text-xs font-medium">OpenCV</div>
            <div className="text-xs font-medium">MongoDB</div>
            <div className="text-xs font-medium">React</div>
            <div className="text-xs font-medium">FastAPI</div>
            <div className="text-xs font-medium">YOLO</div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

export default Home