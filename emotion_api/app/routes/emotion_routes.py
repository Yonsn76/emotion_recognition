from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import List
import logging
from datetime import datetime
import base64
import cv2
import numpy as np
import asyncio
import threading
import time

from app.models.schemas import (
    EmotionAnalysisRequest, EmotionMetric, EmotionDistribution,
    HealthCheck, SessionSummary
)
from app.models.yolo_detector import YOLODetector
from app.models.emotion_classifier import EmotionClassifier
from app.services.aggregator import EmotionAggregator
# AlertService no se utiliza en este proyecto
from app.services.emotion_storage import emotion_storage
from app.utils.image_processing import base64_to_image, validate_image
from app.database.mongodb import get_database

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/emotion", tags=["emotion"])

# Variables globales para control de cámara
camera_active = False
camera_thread = None
camera_stop_event = threading.Event()
current_cap = None
current_frame = None
current_session_id = None

# Instancias globales de los servicios
yolo_detector = None
emotion_classifier = None
aggregator = EmotionAggregator()
# alert_service no se utiliza en este proyecto

def get_yolo_detector():
    global yolo_detector
    if yolo_detector is None:
        try:
            yolo_detector = YOLODetector()
        except Exception as e:
            logger.error(f"Error inicializando YOLO detector: {e}")
            # Retornar None para manejar el error en camera_worker
            return None
    return yolo_detector

def get_emotion_classifier():
    global emotion_classifier
    if emotion_classifier is None:
        emotion_classifier = EmotionClassifier()
    return emotion_classifier

@router.get("/health", response_model=HealthCheck)
async def health_check():
    """Verifica el estado del sistema"""
    try:
        db = get_database()
        
        # Verificar conexión a base de datos
        await db.command("ping")
        db_connected = True
        
        # Verificar modelos cargados
        yolo = get_yolo_detector()
        classifier = get_emotion_classifier()
        models_loaded = yolo.is_model_loaded() and classifier.is_model_loaded()
        
        # Contar sesiones activas
        active_classroomSessions = await db.classroomSessions.count_documents({"status": "active"})
        
        return HealthCheck(
            status="healthy" if db_connected and models_loaded else "degraded",
            timestamp=datetime.utcnow(),
            database_connected=db_connected,
            models_loaded=models_loaded,
            active_sessions=active_classroomSessions
        )
        
    except Exception as e:
        logger.error(f"Error en health check: {e}")
        return HealthCheck(
            status="unhealthy",
            timestamp=datetime.utcnow(),
            database_connected=False,
            models_loaded=False,
            active_sessions=0
        )

@router.post("/analyze", response_model=EmotionMetric)
async def analyze_emotion(
    request: EmotionAnalysisRequest,
    yolo: YOLODetector = Depends(get_yolo_detector),
    classifier: EmotionClassifier = Depends(get_emotion_classifier)
):
    """
    Analiza un frame de video y devuelve distribución emocional
    """
    try:
        # Convertir base64 a imagen
        image = base64_to_image(request.frame_data)
        if image is None:
            raise HTTPException(status_code=400, detail="No se pudo procesar la imagen")
        
        # Validar imagen
        if not validate_image(image):
            raise HTTPException(status_code=400, detail="Imagen inválida")
        
        # Detectar rostros
        faces = yolo.detect_faces(image)
        if not faces:
            logger.info("No se detectaron rostros en el frame")
            return EmotionMetric(
                session_id=request.session_id,
                timestamp=datetime.utcnow(),
                emotion_distribution=EmotionDistribution(
                    frustracion=0.0,
                    tristeza=0.0,
                    enojo=0.0,
                    desmotivacion=0.0,
                    atencion_baja=100.0
                ),
                total_faces_detected=0,
                average_confidence=0.0
            )
        
        # Clasificar emociones para cada rostro
        detections = []
        total_confidence = 0.0
        
        for face_coords in faces:
            x, y, width, height, confidence = face_coords
            total_confidence += confidence
            
            # Extraer ROI del rostro
            face_roi = yolo.extract_face_roi(image, (x, y, width, height))
            if face_roi is not None:
                # Clasificar emoción
                emotion, emotion_confidence = classifier.classify_emotion(face_roi)
                detections.append({
                    "emotion": emotion,
                    "confidence": emotion_confidence,
                    "timestamp": datetime.utcnow()
                })
        
        # Agregar emociones
        emotion_distribution = aggregator.aggregate_emotions(detections)
        
        # Calcular confianza promedio
        avg_confidence = total_confidence / len(faces) if faces else 0.0
        
        # Crear métrica
        metric = EmotionMetric(
            session_id=request.session_id,
            timestamp=datetime.utcnow(),
            emotion_distribution=emotion_distribution,
            total_faces_detected=len(faces),
            average_confidence=avg_confidence
        )
        
        # Guardar en base de datos
        db = get_database()
        metric_dict = metric.dict()
        metric_dict["_id"] = None  # MongoDB generará el ID
        result = await db.emotion_metrics.insert_one(metric_dict)
        metric.id = str(result.inserted_id)
        
        # Nota: Sistema de alertas no implementado en este proyecto
        
        return metric
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analizando emoción: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


def camera_worker():
    """Worker thread para captura de video"""
    global current_cap, camera_active, current_session_id
    
    try:
        # Crear nueva instancia de cámara
        current_cap = cv2.VideoCapture(0)
        
        if not current_cap.isOpened():
            logger.error("No se pudo abrir la cámara")
            camera_active = False
            return
        
        # Configurar resolución de cámara
        current_cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        current_cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        current_cap.set(cv2.CAP_PROP_FPS, 30)
        
        # Obtener instancias de los modelos
        yolo = get_yolo_detector()
        emotion_classifier = get_emotion_classifier()
        
        if yolo is None:
            logger.error("No se pudo inicializar YOLO detector")
            camera_active = False
            return
        
        logger.info("Cámara iniciada correctamente")
        
        # Contador para guardar datos cada cierto tiempo
        frame_count = 0
        
        # Inicializar ventana de agregación de 30 segundos
        logger.info("🚀 Iniciando sistema de agregación de emociones...")
        emotion_storage.start_aggregation_window()
        
        # Inicializar conexión a base de datos
        logger.info("🔗 Inicializando conexión a base de datos...")
        emotion_storage.initialize()
        
        while camera_active and not camera_stop_event.is_set():
            ret, frame = current_cap.read()
            if not ret:
                logger.warning("No se pudo leer frame de la cámara")
                break
            
            frame_count += 1
            
            # Preprocesar frame
            frame = yolo.preprocess_frame(frame)
            
            # Detectar rostros con YOLO
            faces = yolo.detect_faces(frame)
            
            # Dibujar información del sistema
            cv2.putText(frame, "YOLO + DeepFace Detection", (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.putText(frame, f"N. Rostros: {len(faces)}", (10, 60), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            
            # Procesar cada rostro detectado
            for i, (x, y, w, h, confidence) in enumerate(faces):
                # Extraer ROI del rostro
                face_roi = yolo.extract_face_roi(frame, (x, y, w, h))
                
                if face_roi is not None and face_roi.size > 0:
                    # Clasificar emoción con DeepFace
                    emotion, emotion_confidence = emotion_classifier.classify_emotion(face_roi)
                    
                    # Agregar emoción al sistema de agregación de 30 segundos
                    if current_session_id:
                        emotion_storage.add_emotion_to_aggregation(emotion, emotion_confidence)
                        logger.debug(f"Emoción agregada: {emotion} ({emotion_confidence:.2f}) - Total: {emotion_storage.total_detections}")
                    
                    # Definir colores según la emoción (emociones en español)
                    color_map = {
                        "enojo": (0, 0, 255),            # Rojo
                        "tristeza": (255, 0, 0),         # Azul
                        "asco": (0, 255, 255),           # Amarillo
                        "miedo": (128, 0, 128),          # Púrpura
                        "felicidad": (0, 255, 0),        # Verde
                        "sorpresa": (255, 165, 0),       # Naranja
                        "neutral": (128, 128, 128)       # Gris
                    }
                    
                    color = color_map.get(emotion, (0, 255, 0))  # Verde por defecto
                    
                    # Dibujar rectángulo alrededor del rostro
                    cv2.rectangle(frame, (x, y), (x+w, y+h), color, 3)
                    
                    # Dibujar etiqueta de emoción
                    label = f"{emotion.replace('_', ' ').title()}: {emotion_confidence:.2f}"
                    label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
                    
                    # Fondo para el texto
                    cv2.rectangle(frame, (x, y-35), (x + label_size[0] + 10, y-5), color, -1)
                    
                    # Texto de la emoción
                    cv2.putText(frame, label, (x+5, y-15), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                    
                    # Información de confianza YOLO
                    yolo_label = f"YOLO: {confidence:.2f}"
                    cv2.putText(frame, yolo_label, (x+5, y+h+20), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            # Mostrar mensaje si no hay rostros
            if len(faces) == 0:
                cv2.putText(frame, "Rostros no detectados", (10, 100), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                cv2.putText(frame, "La posicion del rostro debe estar en frente de la camara", (10, 130), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            # Verificar si debe guardar agregación cada 30 segundos
            if current_session_id and emotion_storage.should_save_aggregation():
                logger.info(f"💾 Guardando agregación - Detecciones: {emotion_storage.total_detections}")
                try:
                    emotion_storage.save_emotion_aggregation(current_session_id)
                    logger.info("✅ Agregación guardada exitosamente")
                except Exception as e:
                    logger.error(f"❌ Error guardando agregación de 30 segundos: {e}")
                    import traceback
                    traceback.print_exc()
            elif not current_session_id:
                # Log cada 100 frames si no hay sesión activa
                if frame_count % 100 == 0:
                    logger.warning("⚠️ No hay sesión activa - Los datos no se están guardando")
            
            # Almacenar frame para el stream
            global current_frame
            current_frame = frame
            
            # Control de FPS
            time.sleep(0.033)  # ~30 FPS
            
    except Exception as e:
        logger.error(f"Error en worker de cámara: {e}")
    finally:
        if current_cap:
            current_cap.release()
            current_cap = None
        camera_active = False
        logger.info("Cámara detenida")

def generate_frames():
    """Genera frames de video con detección de emociones en tiempo real"""
    global current_frame, camera_active
    
    # Esperar a que la cámara esté activa
    max_wait = 10  # 10 segundos máximo
    wait_count = 0
    
    while not camera_active and wait_count < max_wait:
        time.sleep(0.1)
        wait_count += 1
    
    if not camera_active:
        # Frame de error si no se puede iniciar
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(frame, "Error: Camara no disponible", (150, 200), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
        cv2.putText(frame, "Presiona 'Iniciar Camara'", (180, 240), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if ret:
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        return
    
    # Generar frames mientras la cámara esté activa
    while camera_active:
        if current_frame is not None:
            # Codificar frame como JPEG
            ret, buffer = cv2.imencode('.jpg', current_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            if ret:
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        else:
            # Frame de espera
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(frame, "Iniciando camara...", (200, 240), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            if ret:
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        
        time.sleep(0.033)  # ~30 FPS

@router.get("/video-stream")
async def video_stream():
    """
    Stream de video en tiempo real con detección de emociones
    """
    try:
        return StreamingResponse(
            generate_frames(),
            media_type="multipart/x-mixed-replace; boundary=frame"
        )
    except Exception as e:
        logger.error(f"Error iniciando stream de video: {e}")
        raise HTTPException(status_code=500, detail="Error iniciando cámara")

@router.post("/start-camera")
async def start_camera():
    """
    Inicia la cámara y verifica que esté funcionando
    """
    global camera_active, camera_thread, camera_stop_event
    
    try:
        if camera_active:
            return {"message": "Cámara ya está activa", "status": "active"}
        
        # Detener cualquier proceso anterior
        if camera_thread and camera_thread.is_alive():
            camera_stop_event.set()
            camera_thread.join(timeout=2)
        
        # Limpiar frame anterior
        current_frame = None
        
        # Resetear eventos
        camera_stop_event.clear()
        camera_active = True
        
        # Iniciar nuevo thread de cámara
        camera_thread = threading.Thread(target=camera_worker, daemon=True)
        camera_thread.start()
        
        # Esperar un momento para que la cámara se inicialice
        time.sleep(1)
        
        return {"message": "Cámara iniciada correctamente", "status": "active"}
    except Exception as e:
        logger.error(f"Error iniciando cámara: {e}")
        camera_active = False
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.post("/stop-camera")
async def stop_camera():
    """
    Detiene la cámara
    """
    global camera_active, camera_thread, camera_stop_event, current_frame
    
    try:
        if not camera_active:
            return {"message": "Cámara ya está detenida", "status": "stopped"}
        
        # Detener la cámara
        camera_active = False
        camera_stop_event.set()
        
        # Limpiar frame actual
        current_frame = None
        
        # Esperar a que el thread termine
        if camera_thread and camera_thread.is_alive():
            camera_thread.join(timeout=3)
        
        # Limpiar referencias
        camera_thread = None
        
        return {"message": "Cámara detenida correctamente", "status": "stopped"}
    except Exception as e:
        logger.error(f"Error deteniendo cámara: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.get("/camera-status")
async def get_camera_status():
    """
    Obtiene el estado actual de la cámara
    """
    global camera_active, camera_thread
    
    return {
        "active": camera_active,
        "thread_alive": camera_thread.is_alive() if camera_thread else False,
        "status": "active" if camera_active else "stopped"
    }

@router.post("/create-session")
async def create_session(session_data: dict):
    """
    Crea una nueva sesión de análisis de emociones
    """
    global current_session_id
    
    logger.info(f"📝 Creando sesión con datos: {session_data}")
    
    try:
        if not current_session_id:
            # Crear nueva sesión
            from bson import ObjectId
            session_id = ObjectId()
            current_session_id = str(session_id)
            
            # Guardar sesión en la base de datos
            db = await get_database()
            session_doc = {
                "_id": session_id,
                "classroom_id": session_data.get("classroom_id", "default_classroom"),
                "classroom_name": session_data.get("classroom_name", "Aula Demo"),
                "subject": session_data.get("subject", "General"),
                "student_count": session_data.get("student_count", 0),
                "start_time": datetime.utcnow(),
                "status": "active",
                "created_at": datetime.utcnow()
            }
            
            await db.classroomSessions.insert_one(session_doc)
            
            logger.info(f"✅ Sesión creada exitosamente: {current_session_id}")
            
            return {
                "session_id": str(session_id),
                "message": "Sesión creada correctamente",
                "status": "active"
            }
        else:
            return {
                "session_id": current_session_id,
                "message": "Ya hay una sesión activa",
                "status": "active"
            }
            
    except Exception as e:
        logger.error(f"Error creando sesión: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.post("/end-session")
async def end_session():
    """
    Termina la sesión actual
    """
    global current_session_id
    
    try:
        if current_session_id:
            # Actualizar sesión en la base de datos
            db = await get_database()
            await db.classroomSessions.update_one(
                {"_id": current_session_id},
                {
                    "$set": {
                        "end_time": datetime.utcnow(),
                        "status": "completed",
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            
            session_id = current_session_id
            current_session_id = None
            
            return {
                "session_id": session_id,
                "message": "Sesión terminada correctamente",
                "status": "completed"
            }
        else:
            return {
                "message": "No hay sesión activa",
                "status": "no_session"
            }
            
    except Exception as e:
        logger.error(f"Error terminando sesión: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

@router.get("/emotion-distribution")
async def get_emotion_distribution():
    """
    Obtiene la distribución emocional en tiempo real desde el stream de video
    """
    try:
        # Si la cámara no está activa, devolver datos vacíos
        if not camera_active:
            return {
                "felicidad": {"percentage": 0, "count": 0},
                "tristeza": {"percentage": 0, "count": 0},
                "enojo": {"percentage": 0, "count": 0},
                "neutral": {"percentage": 0, "count": 0},
                "total_detections": 0,
                "camera_active": camera_active
            }
        
        # Obtener datos de la sesión activa más reciente
        db = get_database()
        active_classroomSession = await db.classroomSessions.find_one(
            {"status": "active"},
            sort=[("start_time", -1)]
        )
        
        if not active_classroomSession:
            return {
                "felicidad": {"percentage": 0, "count": 0},
                "tristeza": {"percentage": 0, "count": 0},
                "enojo": {"percentage": 0, "count": 0},
                "neutral": {"percentage": 0, "count": 0},
                "total_detections": 0,
                "camera_active": camera_active
            }
        
        # Obtener las últimas detecciones de los últimos 10 segundos
        from datetime import datetime, timedelta
        ten_seconds_ago = datetime.utcnow() - timedelta(seconds=10)
        
        recent_detections = await db.emotion_metrics.find(
            {
                "session_id": active_classroomSession["_id"],
                "timestamp": {"$gte": ten_seconds_ago}
            },
            sort=[("timestamp", -1)]
        ).to_list(50)  # Últimas 50 detecciones
        
        if not recent_detections:
            return {
                "felicidad": {"percentage": 0, "count": 0},
                "tristeza": {"percentage": 0, "count": 0},
                "enojo": {"percentage": 0, "count": 0},
                "neutral": {"percentage": 0, "count": 0},
                "total_detections": 0,
                "camera_active": camera_active
            }
        
        # Procesar detecciones recientes
        emotion_counts = {
            "felicidad": 0,
            "tristeza": 0,
            "enojo": 0,
            "neutral": 0
        }
        total_detections = 0
        
        for detection in recent_detections:
            if "emotion_distribution" in detection:
                emotion_dist = detection["emotion_distribution"]
                total_detections += detection.get("total_faces_detected", 0)
                
                # Mapear las emociones del sistema a nuestro formato
                if "frustracion" in emotion_dist:
                    emotion_counts["enojo"] += emotion_dist.get("frustracion", 0)
                if "tristeza" in emotion_dist:
                    emotion_counts["tristeza"] += emotion_dist.get("tristeza", 0)
                if "desmotivacion" in emotion_dist:
                    emotion_counts["tristeza"] += emotion_dist.get("desmotivacion", 0)
                if "atencion_baja" in emotion_dist:
                    emotion_counts["neutral"] += emotion_dist.get("atencion_baja", 0)
        
        # Calcular porcentajes
        total_emotions = sum(emotion_counts.values())
        
        if total_emotions > 0:
            return {
                "felicidad": {
                    "percentage": round((emotion_counts["felicidad"] / total_emotions) * 100, 1),
                    "count": int(emotion_counts["felicidad"])
                },
                "tristeza": {
                    "percentage": round((emotion_counts["tristeza"] / total_emotions) * 100, 1),
                    "count": int(emotion_counts["tristeza"])
                },
                "enojo": {
                    "percentage": round((emotion_counts["enojo"] / total_emotions) * 100, 1),
                    "count": int(emotion_counts["enojo"])
                },
                "neutral": {
                    "percentage": round((emotion_counts["neutral"] / total_emotions) * 100, 1),
                    "count": int(emotion_counts["neutral"])
                },
                "total_detections": total_detections,
                "camera_active": camera_active
            }
        else:
            return {
                "felicidad": {"percentage": 0, "count": 0},
                "tristeza": {"percentage": 0, "count": 0},
                "enojo": {"percentage": 0, "count": 0},
                "neutral": {"percentage": 0, "count": 0},
                "total_detections": total_detections,
                "camera_active": camera_active
            }
        
    except Exception as e:
        logger.error(f"Error obteniendo distribución emocional: {e}")
        return {
            "felicidad": {"percentage": 0, "count": 0},
            "tristeza": {"percentage": 0, "count": 0},
            "enojo": {"percentage": 0, "count": 0},
            "neutral": {"percentage": 0, "count": 0},
            "total_detections": 0,
            "camera_active": camera_active
        }

@router.get("/realtime-emotions")
async def get_realtime_emotions():
    """
    Obtiene las emociones detectadas en tiempo real desde el frame actual
    """
    try:
        if not camera_active or current_frame is None:
            return {
                "felicidad": {"percentage": 0, "count": 0},
                "tristeza": {"percentage": 0, "count": 0},
                "enojo": {"percentage": 0, "count": 0},
                "neutral": {"percentage": 0, "count": 0},
                "total_detections": 0,
                "camera_active": camera_active
            }
        
        # Procesar el frame actual
        yolo = get_yolo_detector()
        classifier = get_emotion_classifier()
        
        # Detectar rostros en el frame actual
        faces = yolo.detect_faces(current_frame)
        
        if not faces:
            return {
                "felicidad": {"percentage": 0, "count": 0},
                "tristeza": {"percentage": 0, "count": 0},
                "enojo": {"percentage": 0, "count": 0},
                "neutral": {"percentage": 0, "count": 0},
                "total_detections": 0,
                "camera_active": camera_active
            }
        
        # Clasificar emociones para cada rostro
        emotion_counts = {
            "felicidad": 0,
            "tristeza": 0,
            "enojo": 0,
            "neutral": 0
        }
        
        for face_coords in faces:
            x, y, width, height, confidence = face_coords
            
            # Extraer ROI del rostro
            face_roi = yolo.extract_face_roi(current_frame, (x, y, width, height))
            if face_roi is not None:
                # Clasificar emoción
                emotion, emotion_confidence = classifier.classify_emotion(face_roi)
                
                # Mapear emociones del sistema a nuestro formato
                if emotion in ["felicidad", "alegria", "satisfaccion"]:
                    emotion_counts["felicidad"] += 1
                elif emotion in ["tristeza", "desmotivacion", "depresion"]:
                    emotion_counts["tristeza"] += 1
                elif emotion in ["enojo", "frustracion", "ira"]:
                    emotion_counts["enojo"] += 1
                else:
                    emotion_counts["neutral"] += 1
        
        # Calcular porcentajes
        total_faces = len(faces)
        
        if total_faces > 0:
            return {
                "felicidad": {
                    "percentage": round((emotion_counts["felicidad"] / total_faces) * 100, 1),
                    "count": emotion_counts["felicidad"]
                },
                "tristeza": {
                    "percentage": round((emotion_counts["tristeza"] / total_faces) * 100, 1),
                    "count": emotion_counts["tristeza"]
                },
                "enojo": {
                    "percentage": round((emotion_counts["enojo"] / total_faces) * 100, 1),
                    "count": emotion_counts["enojo"]
                },
                "neutral": {
                    "percentage": round((emotion_counts["neutral"] / total_faces) * 100, 1),
                    "count": emotion_counts["neutral"]
                },
                "total_detections": total_faces,
                "camera_active": camera_active
            }
        else:
            return {
                "felicidad": {"percentage": 0, "count": 0},
                "tristeza": {"percentage": 0, "count": 0},
                "enojo": {"percentage": 0, "count": 0},
                "neutral": {"percentage": 0, "count": 0},
                "total_detections": 0,
                "camera_active": camera_active
            }
        
    except Exception as e:
        logger.error(f"Error obteniendo emociones en tiempo real: {e}")
        return {
            "felicidad": {"percentage": 0, "count": 0},
            "tristeza": {"percentage": 0, "count": 0},
            "enojo": {"percentage": 0, "count": 0},
            "neutral": {"percentage": 0, "count": 0},
            "total_detections": 0,
            "camera_active": camera_active
        }

@router.get("/current-stats")
async def get_current_stats():
    """
    Obtiene estadísticas actuales del sistema
    """
    try:
        # Obtener estadísticas de la sesión más reciente
        db = get_database()
        
        # Buscar la sesión activa más reciente
        active_classroomSession = await db.classroomSessions.find_one(
            {"status": "active"},
            sort=[("start_time", -1)]
        )
        
        if not active_classroomSession:
            # Si no hay sesión activa, devolver estadísticas vacías
            return {
                "enojo": 0,
                "tristeza": 0,
                "asco": 0,
                "miedo": 0,
                "felicidad": 0,
                "sorpresa": 0,
                "neutral": 0,
                "total_detections": 0,
                "active_session": None
            }
        
        # Obtener la agregación más reciente de 30 segundos (modo prueba)
        latest_aggregation = await db.emotion_metrics.find_one(
            {
                "session_id": active_classroomSession["_id"],
                "type": "30sec_aggregation"
            },
            sort=[("timestamp", -1)]
        )
        
        # Si hay agregación reciente, usar esos datos
        if latest_aggregation and "emotion_averages" in latest_aggregation:
            emotion_averages = latest_aggregation["emotion_averages"]
            return {
                "enojo": int(emotion_averages.get("enojo", 0)),
                "tristeza": int(emotion_averages.get("tristeza", 0)),
                "asco": int(emotion_averages.get("asco", 0)),
                "miedo": int(emotion_averages.get("miedo", 0)),
                "felicidad": int(emotion_averages.get("felicidad", 0)),
                "sorpresa": int(emotion_averages.get("sorpresa", 0)),
                "neutral": int(emotion_averages.get("neutral", 0)),
                "total_detections": latest_aggregation.get("total_detections", 0),
                "active_session": str(active_classroomSession["_id"]),
                "last_update": latest_aggregation.get("timestamp")
            }
        else:
            return {
                "enojo": 0,
                "tristeza": 0,
                "asco": 0,
                "miedo": 0,
                "felicidad": 0,
                "sorpresa": 0,
                "neutral": 0,
                "total_detections": 0,
                "active_session": str(active_classroomSession["_id"])
            }
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas actuales: {e}")
        return {
            "enojo": 0,
            "tristeza": 0,
            "asco": 0,
            "miedo": 0,
            "felicidad": 0,
            "sorpresa": 0,
            "neutral": 0,
            "total_detections": 0,
            "active_session": None
        }
