# Sistema de Análisis Emocional en Entornos Educativos

## Descripción del Proyecto

Sistema integral de análisis emocional desarrollado para la **I.E. N.° 32004 San Pedro** en Huánuco, Perú. El proyecto forma parte de una propuesta de innovación educativa basada en Inteligencia Artificial e IoT para optimizar el aprendizaje de matemáticas y mejorar las condiciones del entorno escolar.

### Objetivo Principal

Detectar automáticamente estados emocionales como frustración, tristeza, enojo, desmotivación o baja atención durante las sesiones de clase, permitiendo a los docentes activar estrategias preventivas o intervenciones tempranas para mejorar la experiencia de aprendizaje.

## Características del Sistema

### 🔍 **Detección Inteligente**
- **YOLO v5/v8** para detección de rostros en tiempo real
- **Haar Cascade** para clasificación de expresiones emocionales
- Procesamiento a 15-20 FPS con alta precisión

### 🛡️ **Privacidad Garantizada**
- **Anonimización completa** de datos personales
- **No almacena imágenes** de rostros de estudiantes
- **No identifica estudiantes** individuales
- Cumplimiento con normativas de protección de datos

### 📊 **Análisis en Tiempo Real**
- Dashboard interactivo con métricas actualizadas cada 5 segundos
- Gráficos de distribución emocional y evolución temporal
- Sistema de alertas automáticas basado en umbrales configurables

### 🎯 **Intervención Pedagógica**
- Recomendaciones contextualizadas según el tipo de emoción detectada
- Sugerencias de estrategias pedagógicas específicas
- Historial de intervenciones y su efectividad

## Arquitectura del Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Base de       │
│   (React/Next)  │◄──►│   (FastAPI)     │◄──►│   Datos         │
│                 │    │                 │    │   (MongoDB)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WebSockets    │    │   Modelos IA    │    │   Servicios     │
│   (Tiempo Real) │    │   (YOLO/Haar)   │    │   (Agregación)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Componentes del Sistema

### 🖥️ **Frontend (frontend)**
- **React 18** con TypeScript y Vite
- **TailwindCSS** para diseño moderno y responsivo
- **React Router DOM** para navegación
- **Axios** para comunicación con la API
- **Interfaz intuitiva** para monitoreo en tiempo real

### ⚙️ **Backend (emotion_api)**
- **FastAPI** con Python 3.8+
- **MongoDB** con Motor para almacenamiento asíncrono
- **OpenCV** para procesamiento de imágenes
- **YOLOv8n-face** para detección de rostros (modelo específico)
- **DeepFace** para análisis emocional avanzado
- **WebSockets** para comunicación en tiempo real

### 🧠 **Modelos de IA**
- **YOLOv8n-face**: Detección de rostros optimizada (6.2MB)
  - Descargar: [https://drive.google.com/file/d/1ZD_CEsbo3p3_dd8eAtRfRxHDV44M0djK/view]
- **DeepFace**: Análisis emocional avanzado con múltiples modelos pre-entrenados
- **Pipeline personalizado**: 5 emociones principales + métricas de confianza

## Emociones Detectadas

| Emoción | Descripción | Umbral Medio | Umbral Alto | Umbral Crítico |
|---------|-------------|--------------|-------------|----------------|
| **Frustración** | Ceño fruncido, mirada fija, tensión facial | 25% | 35% | 45% |
| **Tristeza** | Comisuras hacia abajo, mirada baja | 20% | 30% | 40% |
| **Enojo** | Ceño muy fruncido, mandíbula tensa | 15% | 25% | 35% |
| **Desmotivación** | Expresión neutra, baja energía | 30% | 40% | 50% |
| **Atención Baja** | Mirada desviada, expresión distraída | 35% | 45% | 55% |

## Instalación y Configuración

### Requisitos del Sistema

#### Hardware Mínimo
- **CPU**: Intel Core i5 8va gen o AMD Ryzen 5
- **RAM**: 8GB DDR4 (recomendado 16GB)
- **Almacenamiento**: 256GB SSD
- **GPU**: NVIDIA GTX 1050 Ti (opcional, para aceleración)
- **Cámara**: 720p mínimo, 1080p recomendado, 15-30 FPS

#### Software
- **Python 3.8+**
- **Node.js 18+**
- **MongoDB 5.0+**
- **Ubuntu 20.04 LTS** (recomendado) o Windows 10/11

### Instalación Rápida


2. **Configurar Backend**
```bash
cd emotion_api
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp env.example .env
# Editar .env con sus configuraciones

# Descargar modelo YOLOv8n-face para detección de rostros
mkdir -p model_files
wget https://github.com/derronqi/yolov8-face/releases/download/v0.0.0/yolov8n-face.pt -O model_files/yolov8n-face.pt
```

3. **Configurar Frontend**
```bash
cd frontend
npm install
```

4. **Iniciar MongoDB**
```bash
# Ubuntu/Debian
sudo systemctl start mongod

# macOS
brew services start mongodb-community

# Windows
net start MongoDB
```

5. **Ejecutar el sistema**
```bash
# Terminal 1 - Backend
cd emotion_api
python -m app.main

# Terminal 2 - Frontend
cd frontend
npm run dev
```

6. **Acceder a la aplicación**
- Frontend: http://localhost:5173 (Vite default)
- API Docs: http://localhost:8000/docs

## Uso del Sistema

### Para Docentes

1. **Iniciar Sesión**
   - Acceder al dashboard
   - Hacer clic en "Iniciar Sesión"
   - Completar formulario (clase, asignatura, notas)

2. **Monitoreo en Tiempo Real**
   - Visualizar distribución emocional en gráfico circular
   - Observar evolución temporal en gráfico de líneas
   - Recibir alertas automáticas cuando se superan umbrales

3. **Intervención Pedagógica**
   - Leer recomendaciones contextualizadas
   - Aplicar estrategias sugeridas
   - Reconocer alertas después de intervenir

4. **Finalizar Sesión**
   - Hacer clic en "Finalizar Sesión"
   - Revisar resumen de la sesión
   - Acceder a reporte detallado

### Para Administradores

1. **Configuración de Umbrales**
   - Ajustar umbrales según nivel educativo
   - Configurar perfiles predefinidos
   - Personalizar recomendaciones

2. **Gestión de Usuarios**
   - Crear/editar cuentas de docentes
   - Asignar roles y permisos
   - Gestionar consentimientos informados

3. **Reportes y Análisis**
   - Generar reportes de sesiones
   - Analizar tendencias temporales
   - Comparar múltiples sesiones

## Beneficios Esperados

### Para Estudiantes
- ✅ Intervenciones pedagógicas más oportunas
- ✅ Mejor adaptación del contenido a su estado emocional
- ✅ Reducción de frustración y abandono escolar
- ✅ Mejora en el rendimiento académico

### Para Docentes
- ✅ Información objetiva para decisiones pedagógicas
- ✅ Alertas tempranas de situaciones problemáticas
- ✅ Herramientas para personalizar la enseñanza
- ✅ Datos para mejorar sus estrategias didácticas

### Para la Institución
- ✅ Mejora en la calidad educativa
- ✅ Reducción de problemas de convivencia
- ✅ Posicionamiento como referente en innovación
- ✅ Datos para políticas educativas basadas en evidencia

## Consideraciones Éticas

### Principios Fundamentales
- **Transparencia**: Los estudiantes y padres conocen el sistema
- **Consentimiento**: Autorización explícita para el monitoreo
- **Privacidad**: Datos completamente anonimizados
- **No discriminación**: Sistema no identifica estudiantes individuales
- **Beneficio educativo**: Uso exclusivo para mejorar el aprendizaje

### Protección de Datos
- Cumplimiento con Ley de Protección de Datos Personales (Perú)
- Política de retención de 90 días máximo
- Auditorías regulares de privacidad
- Acceso restringido solo a personal autorizado

## Roadmap y Mejoras Futuras

### Fase 1 (Actual) ✅
- [x] Sistema básico de detección emocional
- [x] Dashboard en tiempo real
- [x] Sistema de alertas
- [x] Reportes básicos

### Fase 2 (Próximos 3 meses)
- [ ] Integración con sistema de calificaciones
- [ ] Análisis predictivo de rendimiento
- [ ] App móvil para docentes
- [ ] Integración con plataformas LMS

### Fase 3 (6 meses)
- [ ] IA conversacional para recomendaciones
- [ ] Análisis de correlación con factores externos
- [ ] Sistema de gamificación
- [ ] Integración con sensores IoT ambientales

## Soporte y Contacto

### Documentación Técnica
- [API Documentation](emotion_api/README.md)
- [Requisitos del Sistema](emotion_api/requirements.txt)
- [Dependencias del Frontend](frontend/package.json)

### Equipo de Desarrollo
- **Institución**: SENATI - Servicio Nacional de Adiestramiento en Trabajo Industrial
- **Carrera**: Ingeniería de Software con Inteligencia Artificial
- **Nivel**: Profesional Técnico
- **Fecha**: Octubre 2025

### Soporte Técnico
- Crear issue en el repositorio
- Contactar al equipo de desarrollo
- Revisar documentación técnica
- Consultar guías de instalación

## Licencia

Este proyecto está desarrollado para fines educativos y de investigación. Todos los derechos reservados a la I.E. N.° 32004 San Pedro y SENATI.

---

**🏫 I.E. N.° 32004 San Pedro**  
**🎓 SENATI - Ingeniería de Software con IA**  
**🤖 Sistema de Análisis Emocional en Entornos Educativos**  
**📅 Octubre 2025**






