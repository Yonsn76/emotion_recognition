from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import MongoClient
from typing import Optional
import logging
from app.config.settings import settings

logger = logging.getLogger(__name__)

# Cliente síncrono para operaciones que no requieren async
client: Optional[MongoClient] = None
database: Optional[AsyncIOMotorDatabase] = None

def get_database() -> AsyncIOMotorDatabase:
    """Obtiene la instancia de la base de datos"""
    return database

def get_sync_database():
    """Obtiene la instancia síncrona de la base de datos"""
    return client[settings.database_name]

async def connect_to_mongo():
    """Conecta a MongoDB"""
    global database, client
    
    try:
        # Cliente asíncrono
        client = AsyncIOMotorClient(settings.mongodb_url)
        database = client[settings.database_name]
        
        # Verificar conexión
        await database.command("ping")
        logger.info(f"Conectado a MongoDB: {settings.database_name}")
        
        # Crear índices
        await create_indexes()
        
    except Exception as e:
        logger.error(f"Error conectando a MongoDB: {e}")
        raise

async def close_mongo_connection():
    """Cierra la conexión a MongoDB"""
    global client
    
    if client:
        client.close()
        logger.info("Conexión a MongoDB cerrada")

async def create_indexes():
    """Crea índices para optimizar consultas"""
    try:
        # Índices para sesiones de aula
        await database.classroomSessions.create_index("teacher_id")
        await database.classroomSessions.create_index("start_time")
        await database.classroomSessions.create_index("status")
        await database.classroomSessions.create_index([("teacher_id", 1), ("start_time", -1)])
        
        # Índices para métricas emocionales
        await database.emotion_metrics.create_index("classroomSessions_id")
        await database.emotion_metrics.create_index([("classroomSessions_id", 1)])
        
        # Nota: La tabla 'alerts' no se utiliza en este proyecto
        
        # Nota: Las tablas 'users' y 'config' no se utilizan en este proyecto
        
        # Índices para aulas
        await database.classrooms.create_index("number")
        await database.classrooms.create_index("name")
        await database.classrooms.create_index("created_at")
        
        logger.info("Índices de MongoDB creados exitosamente")
        
    except Exception as e:
        logger.error(f"Error creando índices: {e}")

def get_collection_stats():
    """Obtiene estadísticas de las colecciones"""
    try:
        db = get_sync_database()
        
        collections = ["classroomSessions", "emotion_metrics", "classrooms"]
        stats = {}
        
        for collection_name in collections:
            collection = db[collection_name]
            count = collection.count_documents({})
            stats[collection_name] = count
        
        return stats
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas: {e}")
        return {}

def health_check() -> dict:
    """Verifica el estado de la base de datos"""
    try:
        db = get_sync_database()
        
        # Ping a la base de datos
        db.command("ping")
        
        # Obtener estadísticas básicas
        stats = get_collection_stats()
        
        return {
            "status": "healthy",
            "database": settings.database_name,
            "collections": stats,
            "connected": True
        }
        
    except Exception as e:
        logger.error(f"Health check falló: {e}")
        return {
            "status": "unhealthy",
            "database": settings.database_name,
            "error": str(e),
            "connected": False
        }
