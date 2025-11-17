"""
Servicio para almacenar datos de emociones en tiempo real
"""

from datetime import datetime
from typing import Dict, List, Optional
import logging
from app.database.mongodb import get_database

logger = logging.getLogger(__name__)

class EmotionStorageService:
    def __init__(self):
        self.db = None
        self.emotion_buffer = []  # Buffer para acumular emociones
        self.buffer_size = 10  # Guardar cada 10 detecciones
        self.buffer_timeout = 30  # O guardar cada 30 segundos
        
        # Sistema de agregación cada 30 segundos (modo prueba)
        self.emotion_counts = {
            "felicidad": 0, "tristeza": 0, "enojo": 0,
            "asco": 0, "miedo": 0, "sorpresa": 0, "neutral": 0
        }
        self.total_detections = 0
        self.window_start = None
        self.window_minutes = 0.5  # 30 segundos para pruebas
        
    def initialize(self):
        """Inicializa la conexión a la base de datos"""
        try:
            from pymongo import MongoClient
            from app.config.settings import settings
            
            client = MongoClient(settings.mongodb_url)
            self.db = client[settings.database_name]
            
            # Probar conexión
            client.admin.command('ping')
            logger.info("Conexión a base de datos inicializada correctamente")
        except Exception as e:
            logger.error(f"Error inicializando base de datos: {e}")
            self.db = None
    
    def start_aggregation_window(self):
        """Inicia una nueva ventana de agregación de 30 segundos (modo prueba)"""
        old_detections = self.total_detections
        self.window_start = datetime.utcnow()
        self.emotion_counts = {
            "felicidad": 0, "tristeza": 0, "enojo": 0,
            "asco": 0, "miedo": 0, "sorpresa": 0, "neutral": 0
        }
        self.total_detections = 0
        logger.info(f"🔄 Nueva ventana iniciada - Anterior: {old_detections} detecciones - Nueva: {self.total_detections}")
    
    def add_emotion_to_aggregation(self, emotion: str, confidence: float):
        """
        Agrega una emoción a la ventana de agregación actual
        
        Args:
            emotion: Emoción detectada
            confidence: Nivel de confianza (0-1)
        """
        # Las emociones ya vienen en español del emotion_classifier
        # Inicializar contador si no existe
        if emotion not in self.emotion_counts:
            self.emotion_counts[emotion] = 0
        
        self.emotion_counts[emotion] += confidence
        self.total_detections += 1
        
        logger.debug(f"Emoción agregada: {emotion} ({confidence:.2f}) - Total: {self.total_detections}")
    
    def should_save_aggregation(self) -> bool:
        """Verifica si debe guardar la agregación (cada 30 segundos para pruebas)"""
        if not self.window_start:
            logger.debug("No hay ventana iniciada")
            return False
        
        time_elapsed = (datetime.utcnow() - self.window_start).total_seconds()
        should_save = time_elapsed >= (self.window_minutes * 60)
        
        # Log cada 10 segundos para monitoreo
        if int(time_elapsed) % 10 == 0 and time_elapsed > 0:
            logger.info(f"Tiempo transcurrido: {time_elapsed:.1f}s - Detecciones: {self.total_detections} - Debe guardar: {should_save}")
        
        if should_save:
            logger.info(f"⏰ Tiempo para guardar: {time_elapsed:.1f}s - Detecciones: {self.total_detections}")
        
        return should_save
    
    def save_emotion_aggregation(self, session_id: str):
        """
        Guarda la agregación de emociones de 30 segundos en la base de datos (modo prueba)
        
        Args:
            session_id: ID de la sesión
        """
        logger.info(f"Iniciando guardado de agregación - Detecciones: {self.total_detections}, DB: {self.db is not None}")
        
        if self.db is None:
            logger.info("Inicializando conexión a base de datos...")
            self.initialize()
        
        if self.total_detections == 0:
            logger.info("No hay detecciones para guardar en esta ventana")
            return
        
        try:
            # Calcular promedios y convertir a float de Python
            emotion_averages = {}
            for emotion, total_confidence in self.emotion_counts.items():
                # Convertir numpy.float32 a float de Python para MongoDB
                average = (total_confidence / self.total_detections) * 100
                emotion_averages[emotion] = float(average)
            
            # Crear documento de agregación simplificado
            from bson import ObjectId
            aggregation_doc = {
                "classroomSessions_id": ObjectId(session_id),
                "emotion_distribution": emotion_averages,
                "total_faces_detected": int(self.total_detections)
            }
            
            # Guardar en base de datos
            if self.db is not None:
                logger.info(f"Guardando en MongoDB: {aggregation_doc}")
                result = self.db.emotion_metrics.insert_one(aggregation_doc)
                logger.info(f"✅ Guardada agregación de 30 segundos: {self.total_detections} detecciones - ID: {result.inserted_id}")
                
                # Reiniciar ventana
                self.start_aggregation_window()
            else:
                logger.error("❌ Base de datos no inicializada - no se puede guardar")
            
        except Exception as e:
            logger.error(f"❌ Error guardando agregación de emociones: {e}")
            import traceback
            traceback.print_exc()
        finally:
            # SIEMPRE reiniciar ventana, incluso si hay error
            logger.info("🔄 Reiniciando ventana de agregación...")
            self.start_aggregation_window()
        
    async def save_emotion_detection(
        self, 
        session_id: str, 
        emotion: str, 
        confidence: float,
        face_count: int = 1,
        metadata: Optional[Dict] = None
    ):
        """
        Guarda una detección de emoción individual
        
        Args:
            session_id: ID de la sesión
            emotion: Emoción detectada
            confidence: Nivel de confianza (0-1)
            face_count: Número de rostros detectados
            metadata: Metadatos adicionales
        """
        try:
            if not self.db:
                await self.initialize()
                
            # Crear distribución de emociones (solo la detectada tiene valor)
            emotion_dist = {
                "enojo": 0.0,
                "tristeza": 0.0,
                "asco": 0.0,
                "miedo": 0.0,
                "felicidad": 0.0,
                "sorpresa": 0.0,
                "neutral": 0.0
            }
            
            # Asignar confianza a la emoción detectada
            if emotion in emotion_dist:
                emotion_dist[emotion] = confidence * 100  # Convertir a porcentaje
            
            # Crear métrica de emoción
            emotion_metric = {
                "session_id": session_id,
                "timestamp": datetime.utcnow(),
                "emotion_distribution": emotion_dist,
                "face_count": face_count,
                "confidence": confidence,
                "detected_emotion": emotion,
                "metadata": metadata or {}
            }
            
            # Agregar al buffer
            self.emotion_buffer.append(emotion_metric)
            
            # Guardar si el buffer está lleno
            if len(self.emotion_buffer) >= self.buffer_size:
                await self._flush_buffer()
                
        except Exception as e:
            logger.error(f"Error guardando detección de emoción: {e}")
    
    async def _flush_buffer(self):
        """Guarda el buffer de emociones en la base de datos"""
        if not self.emotion_buffer:
            return
            
        try:
            if not self.db:
                await self.initialize()
                
            # Insertar todas las métricas del buffer
            await self.db.emotion_metrics.insert_many(self.emotion_buffer)
            logger.info(f"Guardadas {len(self.emotion_buffer)} métricas de emoción")
            
            # Limpiar buffer
            self.emotion_buffer.clear()
            
        except Exception as e:
            logger.error(f"Error guardando buffer de emociones: {e}")
    
    
    async def get_session_emotions(
        self, 
        session_id: str, 
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> List[Dict]:
        """
        Obtiene las emociones de una sesión específica
        
        Args:
            session_id: ID de la sesión
            start_time: Tiempo de inicio (opcional)
            end_time: Tiempo de fin (opcional)
        """
        try:
            if not self.db:
                await self.initialize()
                
            # Construir filtro
            filter_query = {"session_id": session_id}
            
            if start_time:
                filter_query["timestamp"] = {"$gte": start_time}
            if end_time:
                if "timestamp" in filter_query:
                    filter_query["timestamp"]["$lte"] = end_time
                else:
                    filter_query["timestamp"] = {"$lte": end_time}
            
            # Obtener métricas
            metrics = await self.db.emotion_metrics.find(filter_query).to_list(length=1000)
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error obteniendo emociones de sesión: {e}")
            return []
    
    async def get_emotion_summary(self, session_id: str) -> Dict:
        """
        Obtiene un resumen de emociones para una sesión
        
        Args:
            session_id: ID de la sesión
        """
        try:
            if not self.db:
                await self.initialize()
                
            # Obtener todas las métricas de la sesión
            metrics = await self.get_session_emotions(session_id)
            
            if not metrics:
                return {
                    "total_detections": 0,
                    "emotion_averages": {},
                    "most_common_emotion": "neutral",
                    "session_duration_minutes": 0
                }
            
            # Calcular promedios
            emotion_totals = {
                "enojo": 0, "tristeza": 0, "asco": 0, "miedo": 0,
                "felicidad": 0, "sorpresa": 0, "neutral": 0
            }
            
            total_detections = 0
            start_time = None
            end_time = None
            
            for metric in metrics:
                if "emotion_distribution" in metric:
                    for emotion, value in metric["emotion_distribution"].items():
                        if emotion in emotion_totals:
                            emotion_totals[emotion] += value
                    
                    total_detections += 1
                    
                    # Calcular duración
                    if not start_time or metric["timestamp"] < start_time:
                        start_time = metric["timestamp"]
                    if not end_time or metric["timestamp"] > end_time:
                        end_time = metric["timestamp"]
            
            # Calcular promedios
            emotion_averages = {}
            for emotion, total in emotion_totals.items():
                emotion_averages[emotion] = round(total / total_detections, 2) if total_detections > 0 else 0
            
            # Encontrar emoción más común
            most_common_emotion = max(emotion_averages, key=emotion_averages.get)
            
            # Calcular duración
            duration_minutes = 0
            if start_time and end_time:
                duration_minutes = (end_time - start_time).total_seconds() / 60
            
            return {
                "total_detections": total_detections,
                "emotion_averages": emotion_averages,
                "most_common_emotion": most_common_emotion,
                "session_duration_minutes": round(duration_minutes, 2)
            }
            
        except Exception as e:
            logger.error(f"Error obteniendo resumen de emociones: {e}")
            return {
                "total_detections": 0,
                "emotion_averages": {},
                "most_common_emotion": "neutral",
                "session_duration_minutes": 0
            }
    

# Instancia global del servicio
emotion_storage = EmotionStorageService()
