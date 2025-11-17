from fastapi import APIRouter, HTTPException
from typing import Optional
import logging
from datetime import datetime
from bson import ObjectId

from app.models.schemas import (
    SessionCreate, SessionSummary, SessionStatus, ClassroomSession
)
from app.database.mongodb import get_database

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/session", tags=["session"])

@router.post("/start")
async def start_session(session_data: SessionCreate):
    """
    Inicia una nueva sesión de monitoreo
    """
    try:
        db = get_database()
        
        # Verificar que no hay otra sesión activa para el mismo docente
        existing_session = await db.classroomSessions.find_one({
            "classroom_id": session_data.teacher_id,
            "status": "active"
        })
        
        if existing_session:
            raise HTTPException(
                status_code=400, 
                detail="Ya existe una sesión activa para este docente"
            )
        
        # Crear nueva sesión con estructura consistente
        session_doc = {
            "classroom_id": session_data.teacher_id,  # Usar teacher_id como classroom_id temporalmente
            "classroom_name": session_data.class_name,
            "subject": session_data.subject,
            "student_count": 0,  # Valor por defecto
            "start_time": datetime.utcnow(),
            "status": "active",
            "created_at": datetime.utcnow()
        }
        
        # Guardar en base de datos
        result = await db.classroomSessions.insert_one(session_doc)
        session_id = str(result.inserted_id)
        
        logger.info(f"Sesión iniciada: {session_id} - {session_data.class_name}")
        
        return {
            "id": session_id,
            "classroom_id": session_doc["classroom_id"],
            "classroom_name": session_doc["classroom_name"],
            "subject": session_doc["subject"],
            "student_count": session_doc["student_count"],
            "start_time": session_doc["start_time"],
            "status": session_doc["status"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error iniciando sesión: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.put("/{session_id}/stop")
async def stop_session(session_id: str):
    """
    Finaliza una sesión de monitoreo
    """
    try:
        db = get_database()
        
        # Verificar que la sesión existe y está activa
        classroomSession = await db.classroomSessions.find_one({
            "_id": ObjectId(session_id),
            "status": "active"
        })
        
        if not classroomSession:
            raise HTTPException(
                status_code=404, 
                detail="Sesión no encontrada o ya finalizada"
            )
        
        # Actualizar sesión
        update_data = {
            "status": SessionStatus.COMPLETED,
            "end_time": datetime.utcnow(),
            "metadata.ended_at": datetime.utcnow()
        }
        
        result = await db.classroomSessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="No se pudo finalizar la sesión")
        
        # Calcular estadísticas finales
        total_metrics = await db.emotion_metrics.count_documents({"session_id": session_id})
        logger.info(f"Sesión finalizada: {session_id} - {total_metrics} métricas")
        
        return {
            "message": "Sesión finalizada exitosamente",
            "session_id": session_id,
            "total_metrics": total_metrics,
            "end_time": datetime.utcnow()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error finalizando sesión: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.get("/{session_id}", response_model=SessionSummary)
async def get_session_details(session_id: str):
    """
    Obtiene resumen de una sesión específica
    """
    try:
        from app.services.aggregator import EmotionAggregator
        
        aggregator = EmotionAggregator()
        summary = aggregator.get_session_summary(session_id)
        
        if not summary:
            raise HTTPException(status_code=404, detail="Sesión no encontrada")
        
        return summary
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo detalles de sesión: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.get("/list")
async def list_sessions(
    teacher_id: Optional[str] = None,
    status: Optional[SessionStatus] = None,
    page: int = 1,
    size: int = 20
):
    """
    Lista todas las sesiones con paginación
    """
    try:
        db = get_database()
        
        # Construir filtro
        filter_dict = {}
        if teacher_id:
            filter_dict["teacher_id"] = teacher_id
        if status:
            filter_dict["status"] = status.value
        
        # Calcular offset
        offset = (page - 1) * size
        
        # Obtener sesiones
        classroomSessions = await db.classroomSessions.find(
            filter_dict,
            sort=[("start_time", -1)],
            skip=offset,
            limit=size
        ).to_list(length=size)
        
        # Contar total
        total = await db.classroomSessions.count_documents(filter_dict)
        
        # Convertir ObjectId a string
        for classroomSession in classroomSessions:
            classroomSession["id"] = str(classroomSession["_id"])
            del classroomSession["_id"]
        
        return {
            "classroomSessions": classroomSessions,
            "pagination": {
                "page": page,
                "size": size,
                "total": total,
                "pages": (total + size - 1) // size
            }
        }
        
    except Exception as e:
        logger.error(f"Error listando sesiones: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.get("/active/{teacher_id}")
async def get_active_session(teacher_id: str):
    """
    Obtiene la sesión activa de un docente
    """
    try:
        db = get_database()
        
        classroomSession = await db.classroomSessions.find_one({
            "classroom_id": teacher_id,
            "status": "active"
        })
        
        if not classroomSession:
            return {"active_classroomSession": None}
        
        classroomSession["id"] = str(classroomSession["_id"])
        del classroomSession["_id"]
        
        return {"active_classroomSession": classroomSession}
        
    except Exception as e:
        logger.error(f"Error obteniendo sesión activa: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
