from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from contextlib import asynccontextmanager

from app.config.settings import settings
from app.database.mongodb import connect_to_mongo, close_mongo_connection
from app.routes import emotion_routes, session_routes, classroom_routes

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(fastapi_app: FastAPI):
    """Gestiona el ciclo de vida de la aplicación"""
    # Startup
    logger.info("Iniciando Emotion Analysis API...")
    try:
        await connect_to_mongo()
        logger.info("API iniciada exitosamente")
    except Exception as e:
        logger.error("Error iniciando API: %s", e)
        raise
    
    yield
    
    # Shutdown
    logger.info("Cerrando Emotion Analysis API...")
    await close_mongo_connection()
    logger.info("API cerrada exitosamente")

# Crear aplicación FastAPI
app = FastAPI(
    title="Emotion Analysis API",
    description="Sistema de Análisis Emocional para Entornos Educativos - I.E. N.° 32004 San Pedro",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080"
    ],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir rutas
app.include_router(emotion_routes.router)
app.include_router(session_routes.router)
app.include_router(classroom_routes.router)

# WebSocket para comunicación en tiempo real
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                # Remover conexiones cerradas
                self.active_connections.remove(connection)

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Procesar mensaje del cliente si es necesario
            await manager.send_personal_message(f"Echo: {data}", websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.get("/")
async def root():
    """Endpoint raíz de la API"""
    return {
        "message": "Emotion Analysis API",
        "version": "1.0.0",
        "description": "Sistema de Análisis Emocional para Entornos Educativos",
        "institution": "I.E. N.° 32004 San Pedro",
        "status": "active",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    """Health check básico"""
    return {
        "status": "healthy",
        "service": "emotion-analysis-api",
        "version": "1.0.0"
    }

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Manejador personalizado de excepciones HTTP"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "path": str(request.url)
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Manejador general de excepciones"""
    logger.error("Error no manejado: %s", exc)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Error interno del servidor",
            "status_code": 500,
            "path": str(request.url)
        }
    )

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info"
    )
