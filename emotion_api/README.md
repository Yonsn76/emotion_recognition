# Sistema de Análisis Emocional - API Backend

## Descripción

API REST desarrollada con FastAPI para el sistema de análisis emocional en entornos educativos de la I.E. N.° 32004 San Pedro. El sistema utiliza inteligencia artificial (YOLO + Haar Cascade) para detectar y clasificar emociones en tiempo real durante las sesiones de clase.

## Características Principales

- **Detección de rostros**: Utiliza YOLO v5/v8 para detección en tiempo real
- **Clasificación emocional**: Haar Cascade + reglas para identificar 5 emociones principales
- **Agregación y anonimización**: Garantiza privacidad de los estudiantes
- **Sistema de alertas**: Notificaciones automáticas basadas en umbrales configurables
- **Base de datos MongoDB**: Almacenamiento de métricas y sesiones
- **WebSockets**: Comunicación en tiempo real con el frontend
- **API REST completa**: Endpoints para todas las funcionalidades

## Tecnologías Utilizadas

- **Python 3.8+**
- **FastAPI** - Framework web moderno y rápido
- **MongoDB** - Base de datos NoSQL
- **OpenCV** - Procesamiento de imágenes
- **YOLO** - Detección de objetos/rostros
- **Haar Cascade** - Clasificación de características faciales
- **Motor** - Driver asíncrono para MongoDB
- **Uvicorn** - Servidor ASGI

## Instalación

### Requisitos Previos

- Python 3.8 o superior
- MongoDB 5.0 o superior
- Git

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd emotion_api
```

2. **Crear entorno virtual**
```bash
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

3. **Instalar dependencias**
```bash
pip install -r requirements.txt
```

4. **Configurar variables de entorno**
```bash
cp env.example .env
# Editar .env con sus configuraciones
```

5. **Descargar modelos de IA**
```bash
# Crear directorio para modelos
mkdir models

# Descargar YOLO (se descarga automáticamente en primera ejecución)
# Descargar Haar Cascade
wget https://github.com/opencv/opencv/raw/master/data/haarcascades/haarcascade_frontalface_default.xml -O models/haarcascade_frontalface_default.xml
```

6. **Iniciar MongoDB**
```bash
# En Ubuntu/Debian
sudo systemctl start mongod

# En macOS con Homebrew
brew services start mongodb-community

# En Windows
net start MongoDB
```

7. **Ejecutar la aplicación**
```bash
python -m app.main
```

La API estará disponible en `http://localhost:8000`

## Configuración

### Variables de Entorno

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `MONGODB_URL` | URL de conexión a MongoDB | `mongodb://localhost:27017` |
| `DATABASE_NAME` | Nombre de la base de datos | `emotion_analysis` |
| `HOST` | Host del servidor | `0.0.0.0` |
| `PORT` | Puerto del servidor | `8000` |
| `DEBUG` | Modo debug | `True` |
| `SECRET_KEY` | Clave secreta para JWT | `your-secret-key-here` |
| `CONFIDENCE_THRESHOLD` | Umbral de confianza para detección | `0.6` |

### Umbrales de Alertas

Los umbrales se pueden configurar en el archivo `.env`:

```env
# Frustración
FRUSTRATION_THRESHOLD_MEDIUM=25
FRUSTRATION_THRESHOLD_HIGH=35
FRUSTRATION_THRESHOLD_CRITICAL=45

# Tristeza
SADNESS_THRESHOLD_MEDIUM=20
SADNESS_THRESHOLD_HIGH=30
SADNESS_THRESHOLD_CRITICAL=40

# Enojo
ANGER_THRESHOLD_MEDIUM=15
ANGER_THRESHOLD_HIGH=25
ANGER_THRESHOLD_CRITICAL=35

# Desmotivación
DEMOTIVATION_THRESHOLD_MEDIUM=30
DEMOTIVATION_THRESHOLD_HIGH=40
DEMOTIVATION_THRESHOLD_CRITICAL=50

# Atención Baja
LOW_ATTENTION_THRESHOLD_MEDIUM=35
LOW_ATTENTION_THRESHOLD_HIGH=45
LOW_ATTENTION_THRESHOLD_CRITICAL=55
```

## Uso de la API

### Documentación Interactiva

Una vez ejecutada la aplicación, puede acceder a:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Endpoints Principales

#### Health Check
```bash
GET /health
```

#### Análisis de Emociones
```bash
POST /api/emotion/analyze
Content-Type: application/json

{
  "session_id": "session_id_here",
  "frame_data": "base64_encoded_image"
}
```

#### Gestión de Sesiones
```bash
# Iniciar sesión
POST /api/session/start

# Finalizar sesión
PUT /api/session/{session_id}/stop

# Obtener sesión activa
GET /api/session/active/{teacher_id}
```

#### Alertas
```bash
# Obtener alertas activas
GET /api/alerts/active/{session_id}

# Reconocer alerta
PUT /api/alerts/{alert_id}/acknowledge
```

## Estructura del Proyecto

```
emotion_api/
├── app/
│   ├── __init__.py
│   ├── main.py                 # Punto de entrada
│   ├── config/
│   │   ├── __init__.py
│   │   └── settings.py         # Configuración
│   ├── models/
│   │   ├── __init__.py
│   │   ├── schemas.py          # Modelos Pydantic
│   │   ├── yolo_detector.py    # Detector YOLO
│   │   └── emotion_classifier.py # Clasificador de emociones
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── emotion_routes.py   # Endpoints de emociones
│   │   ├── session_routes.py   # Endpoints de sesiones
│   │   └── alert_routes.py     # Endpoints de alertas
│   ├── services/
│   │   ├── __init__.py
│   │   ├── aggregator.py       # Agregación de datos
│   │   ├── privacy.py          # Servicios de privacidad
│   │   └── alert_service.py    # Sistema de alertas
│   ├── database/
│   │   ├── __init__.py
│   │   └── mongodb.py          # Conexión a MongoDB
│   └── utils/
│       ├── __init__.py
│       └── image_processing.py # Utilidades de imagen
├── models/                     # Modelos pre-entrenados
├── logs/                       # Archivos de log
├── tests/                      # Tests unitarios
├── requirements.txt            # Dependencias
├── .env                        # Variables de entorno
└── README.md
```

## Desarrollo

### Ejecutar en Modo Desarrollo

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Ejecutar Tests

```bash
pytest tests/
```

### Linting

```bash
flake8 app/
black app/
```

## Despliegue en Producción

### Docker

```bash
# Construir imagen
docker build -t emotion-api .

# Ejecutar contenedor
docker run -p 8000:8000 --env-file .env emotion-api
```

### Variables de Entorno para Producción

```env
DEBUG=False
SECRET_KEY=your-production-secret-key
MONGODB_URL=mongodb://your-production-mongodb:27017
```

## Monitoreo y Logs

Los logs se almacenan en el directorio `logs/` con rotación automática. Para monitoreo en producción, se recomienda usar:

- **Prometheus** para métricas
- **Grafana** para visualización
- **ELK Stack** para logs centralizados

## Seguridad

- Autenticación JWT
- Validación de entrada con Pydantic
- Sanitización de datos
- Anonimización automática
- CORS configurado
- Rate limiting (implementar según necesidades)

## Contribución

1. Fork el proyecto
2. Crear una rama para la feature (`git checkout -b feature/nueva-feature`)
3. Commit los cambios (`git commit -am 'Agregar nueva feature'`)
4. Push a la rama (`git push origin feature/nueva-feature`)
5. Crear un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## Soporte

Para soporte técnico o preguntas, contactar al equipo de desarrollo o crear un issue en el repositorio.

---

**Desarrollado para la I.E. N.° 32004 San Pedro**  
*Sistema de Análisis Emocional en Entornos Educativos*

