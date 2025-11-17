from typing import List, Dict, Any, Optional
import logging
from app.models.schemas import EmotionDistribution, SessionSummary
from app.database.mongodb import get_database

logger = logging.getLogger(__name__)

class EmotionAggregator:
    def __init__(self):
        self.db = get_database()
    
    def aggregate_emotions(self, detections: List[Dict[str, Any]]) -> EmotionDistribution:
        """
        Agrega detecciones individuales en métricas colectivas
        
        Args:
            detections: Lista de detecciones con emociones individuales
            
        Returns:
            Distribución emocional agregada
        """
        try:
            if not detections:
                return EmotionDistribution(
                    frustracion=0.0,
                    tristeza=0.0,
                    enojo=0.0,
                    desmotivacion=0.0,
                    atencion_baja=0.0
                )
            
            # Contar emociones
            emotion_counts = {
                "frustracion": 0,
                "tristeza": 0,
                "enojo": 0,
                "desmotivacion": 0,
                "atencion_baja": 0
            }
            
            total_detections = len(detections)
            
            for detection in detections:
                emotion = detection.get("emotion", "atencion_baja")
                if emotion in emotion_counts:
                    emotion_counts[emotion] += 1
            
            # Calcular porcentajes
            distribution = EmotionDistribution(
                frustracion=(emotion_counts["frustracion"] / total_detections) * 100,
                tristeza=(emotion_counts["tristeza"] / total_detections) * 100,
                enojo=(emotion_counts["enojo"] / total_detections) * 100,
                desmotivacion=(emotion_counts["desmotivacion"] / total_detections) * 100,
                atencion_baja=(emotion_counts["atencion_baja"] / total_detections) * 100
            )
            
            logger.debug(f"Agregadas {total_detections} detecciones en distribución emocional")
            return distribution
            
        except Exception as e:
            logger.error(f"Error agregando emociones: {e}")
            return EmotionDistribution(
                frustracion=0.0,
                tristeza=0.0,
                enojo=0.0,
                desmotivacion=0.0,
                atencion_baja=0.0
            )
    
    
    def get_session_summary(self, session_id: str) -> Optional[SessionSummary]:
        """
        Genera resumen completo de una sesión con estadísticas agregadas
        
        Args:
            session_id: ID de la sesión
            
        Returns:
            Resumen de la sesión o None si no existe
        """
        try:
            # Obtener información de la sesión
            session = self.db.classroomSessions.find_one({"_id": session_id})
            if not session:
                return None
            
            # Obtener todas las métricas de la sesión
            metrics = list(self.db.emotion_metrics.find({"session_id": session_id}))
            
            if not metrics:
                return SessionSummary(
                    id=session_id,
                    teacher_id=session["teacher_id"],
                    class_name=session["class_name"],
                    subject=session["subject"],
                    start_time=session["start_time"],
                    end_time=session.get("end_time"),
                    duration_minutes=None,
                    status=session["status"],
                    total_metrics=0,
                    average_emotion_distribution=EmotionDistribution(
                        frustracion=0.0,
                        tristeza=0.0,
                        enojo=0.0,
                        desmotivacion=0.0,
                        atencion_baja=0.0
                    ),
                    # Sistema de alertas no implementado
                    critical_moments=[]
                )
            
            # Calcular duración
            duration_minutes = None
            if session.get("end_time"):
                duration = session["end_time"] - session["start_time"]
                duration_minutes = int(duration.total_seconds() / 60)
            
            # Calcular distribución emocional promedio
            total_frustracion = sum(m.get("emotion_distribution", {}).get("frustracion", 0) for m in metrics)
            total_tristeza = sum(m.get("emotion_distribution", {}).get("tristeza", 0) for m in metrics)
            total_enojo = sum(m.get("emotion_distribution", {}).get("enojo", 0) for m in metrics)
            total_desmotivacion = sum(m.get("emotion_distribution", {}).get("desmotivacion", 0) for m in metrics)
            total_atencion_baja = sum(m.get("emotion_distribution", {}).get("atencion_baja", 0) for m in metrics)
            
            num_metrics = len(metrics)
            avg_distribution = EmotionDistribution(
                frustracion=total_frustracion / num_metrics,
                tristeza=total_tristeza / num_metrics,
                enojo=total_enojo / num_metrics,
                desmotivacion=total_desmotivacion / num_metrics,
                atencion_baja=total_atencion_baja / num_metrics
            )
            
            # Sistema de alertas no implementado
            
            # Identificar momentos críticos (simplificado)
            critical_moments = []
            
            summary = SessionSummary(
                id=session_id,
                teacher_id=session["teacher_id"],
                class_name=session["class_name"],
                subject=session["subject"],
                start_time=session["start_time"],
                end_time=session.get("end_time"),
                duration_minutes=duration_minutes,
                status=session["status"],
                total_metrics=num_metrics,
                average_emotion_distribution=avg_distribution,
                # Sistema de alertas no implementado
                critical_moments=critical_moments
            )
            
            logger.info(f"Generado resumen para sesión {session_id}")
            return summary
            
        except Exception as e:
            logger.error(f"Error generando resumen de sesión: {e}")
            return None
    
