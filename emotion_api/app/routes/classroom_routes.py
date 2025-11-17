from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime
from bson import ObjectId
from ..database.mongodb import get_database
from ..models.schemas import Classroom, ClassroomCreate

router = APIRouter(prefix="/api/classroom", tags=["classroom"])

@router.post("/create", response_model=Classroom)
async def create_classroom(classroom_data: ClassroomCreate):
    """Crear una nueva aula"""
    try:
        db = get_database()
        if db is None:
            raise HTTPException(status_code=500, detail="Base de datos no disponible")
        if db is None:
            raise HTTPException(status_code=500, detail="Base de datos no disponible")
        
        # Verificar si ya existe un aula con el mismo número
        existing_classroom = await db.classrooms.find_one({"number": classroom_data.number})
        if existing_classroom:
            raise HTTPException(status_code=400, detail="Ya existe un aula con ese número")
        
        # Crear el documento del aula
        classroom_doc = {
            "name": classroom_data.name,
            "number": classroom_data.number,
            "description": classroom_data.description,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insertar en la base de datos
        result = await db.classrooms.insert_one(classroom_doc)
        
        # Obtener el aula creada
        created_classroom = await db.classrooms.find_one({"_id": result.inserted_id})
        
        return Classroom(
            id=str(created_classroom["_id"]),
            name=created_classroom["name"],
            number=created_classroom["number"],
            description=created_classroom.get("description"),
            created_at=created_classroom["created_at"],
            updated_at=created_classroom["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creando aula: {str(e)}") from e

@router.get("/list", response_model=List[Classroom])
async def list_classrooms():
    """Obtener lista de todas las aulas"""
    try:
        db = get_database()
        if db is None:
            raise HTTPException(status_code=500, detail="Base de datos no disponible")
        
        classrooms = []
        async for classroom in db.classrooms.find().sort("created_at", -1):
            # Verificar que el documento tenga los campos requeridos
            if "name" in classroom and "number" in classroom:
                classrooms.append(Classroom(
                    id=str(classroom["_id"]),
                    name=classroom["name"],
                    number=classroom["number"],
                    description=classroom.get("description"),
                    created_at=classroom.get("created_at"),
                    updated_at=classroom.get("updated_at")
                ))
        
        return classrooms
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo aulas: {str(e)}") from e

@router.get("/reports")
async def get_session_reports():
    """Obtener reportes de todas las sesiones finalizadas"""
    try:
        db = get_database()
        if db is None:
            raise HTTPException(status_code=500, detail="Base de datos no disponible")
        
        # Obtener sesiones finalizadas
        sessions = []
        async for session in db.classroomSessions.find({"status": "finished"}).sort("end_time", -1):
            # Obtener métricas emocionales para esta sesión
            emotion_metrics = []
            async for metric in db.emotion_metrics.find({"classroomSessions_id": session["_id"]}):
                emotion_metrics.append(metric)
            
            # Calcular promedios de emociones
            total_metrics = len(emotion_metrics)
            emotion_totals = {
                "felicidad": 0, "tristeza": 0, "enojo": 0, "asco": 0,
                "miedo": 0, "sorpresa": 0, "neutral": 0
            }
            total_faces = 0
            
            for metric in emotion_metrics:
                total_faces += metric.get("total_faces_detected", 0)
                emotion_dist = metric.get("emotion_distribution", {})
                for emotion in emotion_totals:
                    emotion_totals[emotion] += emotion_dist.get(emotion, 0)
            
            # Calcular promedios (si no hay métricas, usar valores por defecto)
            if total_metrics > 0:
                average_emotions = {}
                for emotion, total in emotion_totals.items():
                    average_emotions[emotion] = total / total_metrics
            else:
                # Valores por defecto cuando no hay métricas
                average_emotions = {
                    "felicidad": 0, "tristeza": 0, "enojo": 0, "asco": 0,
                    "miedo": 0, "sorpresa": 0, "neutral": 100
                }
            
            # Calcular engagement y attention scores
            positive_emotions = average_emotions["felicidad"] + average_emotions["sorpresa"]
            negative_emotions = average_emotions["tristeza"] + average_emotions["enojo"] + average_emotions["asco"] + average_emotions["miedo"]
            
            engagement_score = min(100, max(0, positive_emotions - negative_emotions + 50))
            attention_score = min(100, max(0, 100 - negative_emotions))
            
            # Calcular duración
            start_time = session["start_time"]
            end_time = session["end_time"]
            duration_minutes = (end_time - start_time).total_seconds() / 60 if end_time else 0
            
            # Generar recomendaciones
            recommendations = []
            if total_metrics == 0:
                recommendations.append("No se detectaron métricas emocionales en esta sesión")
            else:
                if average_emotions["tristeza"] > 20:
                    recommendations.append("Considerar actividades más motivadoras para reducir la tristeza")
                if average_emotions["enojo"] > 15:
                    recommendations.append("Identificar y abordar las causas del enojo en el aula")
                if average_emotions["felicidad"] > 50:
                    recommendations.append("Mantener el ambiente positivo actual")
                if engagement_score < 60:
                    recommendations.append("Implementar más actividades interactivas")
            
            sessions.append({
                "session_id": str(session["_id"]),
                "classroom_id": str(session["classroom_id"]),
                "classroom_name": session["classroom_name"],
                "materia": session.get("materia", session.get("subject", "N/A")),
                "total_duration_minutes": duration_minutes,
                "average_emotions": average_emotions,
                "peak_emotions": {
                    max_emotion: max(average_emotions.values()) for max_emotion in average_emotions.keys() 
                    if average_emotions[max_emotion] == max(average_emotions.values())
                },
                "engagement_score": engagement_score,
                "attention_score": attention_score,
                "total_faces_detected": total_faces,
                "recommendations": recommendations,
                "start_time": session["start_time"],
                "end_time": session["end_time"]
            })
        
        return {"reports": sessions}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo reportes: {str(e)}") from e

@router.get("/{classroom_id}", response_model=Classroom)
async def get_classroom(classroom_id: str):
    """Obtener un aula específica por ID"""
    try:
        db = get_database()
        if db is None:
            raise HTTPException(status_code=500, detail="Base de datos no disponible")
        
        if not ObjectId.is_valid(classroom_id):
            raise HTTPException(status_code=400, detail="ID de aula inválido")
        
        classroom = await db.classrooms.find_one({"_id": ObjectId(classroom_id)})
        if not classroom:
            raise HTTPException(status_code=404, detail="Aula no encontrada")
        
        return Classroom(
            id=str(classroom["_id"]),
            name=classroom["name"],
            number=classroom["number"],
            description=classroom.get("description"),
            created_at=classroom["created_at"],
            updated_at=classroom["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo aula: {str(e)}") from e

@router.put("/{classroom_id}", response_model=Classroom)
async def update_classroom(classroom_id: str, classroom_data: ClassroomCreate):
    """Actualizar un aula existente"""
    try:
        db = get_database()
        if db is None:
            raise HTTPException(status_code=500, detail="Base de datos no disponible")
        
        if not ObjectId.is_valid(classroom_id):
            raise HTTPException(status_code=400, detail="ID de aula inválido")
        
        # Verificar si el aula existe
        existing_classroom = await db.classrooms.find_one({"_id": ObjectId(classroom_id)})
        if not existing_classroom:
            raise HTTPException(status_code=404, detail="Aula no encontrada")
        
        # Verificar si ya existe otro aula con el mismo número
        if classroom_data.number != existing_classroom["number"]:
            duplicate_classroom = await db.classrooms.find_one({
                "number": classroom_data.number,
                "_id": {"$ne": ObjectId(classroom_id)}
            })
            if duplicate_classroom:
                raise HTTPException(status_code=400, detail="Ya existe otro aula con ese número")
        
        # Actualizar el aula
        update_data = {
            "name": classroom_data.name,
            "number": classroom_data.number,
            "description": classroom_data.description,
            "updated_at": datetime.utcnow()
        }
        
        await db.classrooms.update_one(
            {"_id": ObjectId(classroom_id)},
            {"$set": update_data}
        )
        
        # Obtener el aula actualizada
        updated_classroom = await db.classrooms.find_one({"_id": ObjectId(classroom_id)})
        
        return Classroom(
            id=str(updated_classroom["_id"]),
            name=updated_classroom["name"],
            number=updated_classroom["number"],
            description=updated_classroom.get("description"),
            created_at=updated_classroom["created_at"],
            updated_at=updated_classroom["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error actualizando aula: {str(e)}") from e

@router.delete("/{classroom_id}")
async def delete_classroom(classroom_id: str):
    """Eliminar un aula"""
    try:
        db = get_database()
        if db is None:
            raise HTTPException(status_code=500, detail="Base de datos no disponible")
        
        if not ObjectId.is_valid(classroom_id):
            raise HTTPException(status_code=400, detail="ID de aula inválido")
        
        # Verificar si el aula existe
        classroom = await db.classrooms.find_one({"_id": ObjectId(classroom_id)})
        if not classroom:
            raise HTTPException(status_code=404, detail="Aula no encontrada")
        
        # Eliminar el aula
        await db.classrooms.delete_one({"_id": ObjectId(classroom_id)})
        
        return {"message": "Aula eliminada exitosamente"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error eliminando aula: {str(e)}") from e

@router.post("/start-session")
async def start_classroom_session(session_data: dict):
    """Iniciar una sesión en un aula específica"""
    try:
        db = get_database()
        if db is None:
            raise HTTPException(status_code=500, detail="Base de datos no disponible")
        
        # Extraer datos del JSON
        classroom_id = session_data.get("classroom_id")
        materia = session_data.get("materia")
        student_count = session_data.get("student_count")
        
        if not classroom_id or not materia or student_count is None:
            raise HTTPException(status_code=400, detail="Datos de sesión incompletos")
        
        # Verificar que el aula existe
        if not ObjectId.is_valid(classroom_id):
            raise HTTPException(status_code=400, detail="ID de aula inválido")
        
        classroom = await db.classrooms.find_one({"_id": ObjectId(classroom_id)})
        if not classroom:
            raise HTTPException(status_code=404, detail="Aula no encontrada")
        
        # Crear sesión
        session_doc = {
            "classroom_id": classroom_id,
            "classroom_name": classroom["name"],
            "materia": materia,
            "student_count": student_count,
            "start_time": datetime.utcnow(),
            "status": "created",  # Estado inicial: sesión creada, esperando monitoreo
            "created_at": datetime.utcnow()
        }
        
        result = await db.classroomSessions.insert_one(session_doc)
        
        return {
            "id": str(result.inserted_id),
            "classroom_id": classroom_id,
            "classroom_name": classroom["name"],
            "materia": materia,
            "student_count": student_count,
            "start_time": session_doc["start_time"],
            "status": "created"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error iniciando sesión: {str(e)}") from e

@router.get("/active-sessions")
async def get_active_sessions():
    """Obtener todas las sesiones activas"""
    try:
        db = get_database()
        if db is None:
            raise HTTPException(status_code=500, detail="Base de datos no disponible")
        
        # Buscar sesiones activas (created o monitoring)
        classroomSessions = await db.classroomSessions.find({
            "status": {"$in": ["created", "monitoring"]}
        }).to_list(length=None)
        
        # Convertir ObjectId a string
        for session in classroomSessions:
            session["id"] = str(session["_id"])
            del session["_id"]
        
        return {"active_sessions": classroomSessions}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo sesiones activas: {str(e)}") from e

@router.post("/{session_id}/start-monitoring")
async def start_monitoring_session(session_id: str):
    """Iniciar monitoreo de una sesión"""
    try:
        db = get_database()
        if db is None:
            raise HTTPException(status_code=500, detail="Base de datos no disponible")
        
        # Verificar que la sesión existe y está en estado "created"
        session = await db.classroomSessions.find_one({
            "_id": ObjectId(session_id),
            "status": "created"
        })
        
        if not session:
            raise HTTPException(status_code=404, detail="Sesión no encontrada o ya iniciada")
        
        # Actualizar estado a "monitoring"
        result = await db.classroomSessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"status": "monitoring", "monitoring_start_time": datetime.utcnow()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="No se pudo iniciar el monitoreo")
        
        return {
            "message": "Monitoreo iniciado exitosamente",
            "session_id": session_id,
            "status": "monitoring"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error iniciando monitoreo: {str(e)}") from e

@router.post("/{session_id}/end-session")
async def end_classroom_session(session_id: str):
    """Finalizar una sesión de monitoreo"""
    try:
        db = get_database()
        if db is None:
            raise HTTPException(status_code=500, detail="Base de datos no disponible")
        
        # Verificar que la sesión existe y está en monitoreo
        session = await db.classroomSessions.find_one({
            "_id": ObjectId(session_id),
            "status": "monitoring"
        })
        
        if not session:
            raise HTTPException(status_code=404, detail="Sesión no encontrada o ya finalizada")
        
        # Calcular duración de la sesión
        end_time = datetime.utcnow()
        start_time = session["start_time"]
        session_duration = (end_time - start_time).total_seconds()
        
        # Actualizar sesión con estado finished y duración
        update_data = {
            "status": "finished",
            "end_time": end_time,
            "session_duration_formatted": f"{int(session_duration // 3600)}h {int((session_duration % 3600) // 60)}m {int(session_duration % 60)}s"
        }
        
        result = await db.classroomSessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=500, detail="No se pudo finalizar la sesión")
        
        return {
            "message": "Sesión finalizada exitosamente",
            "session_id": session_id,
            "session_duration_formatted": update_data["session_duration_formatted"],
            "end_time": end_time
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error finalizando sesión: {str(e)}") from e
