from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # Base de datos
    mongodb_url: str = "mongodb+srv://yonsn:1234@cluster0.7imrsfw.mongodb.net"
    database_name: str = "emotion_register"
    
    # Configuración del servidor
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True
    
    # Seguridad
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Configuración de IA
    yolo_model_path: str = "model_files/yolov8n-face.pt"  # Usar modelo específico para rostros
    haar_cascade_path: str = "model_files/haarcascade_frontalface_default.xml"
    confidence_threshold: float = 0.6
    
    # Umbrales por defecto
    frustration_threshold_medium: int = 25
    frustration_threshold_high: int = 35
    frustration_threshold_critical: int = 45
    
    sadness_threshold_medium: int = 20
    sadness_threshold_high: int = 30
    sadness_threshold_critical: int = 40
    
    anger_threshold_medium: int = 15
    anger_threshold_high: int = 25
    anger_threshold_critical: int = 35
    
    demotivation_threshold_medium: int = 30
    demotivation_threshold_high: int = 40
    demotivation_threshold_critical: int = 50
    
    low_attention_threshold_medium: int = 35
    low_attention_threshold_high: int = 45
    low_attention_threshold_critical: int = 55
    
    # Configuración de video
    video_fps: int = 15
    frame_width: int = 640
    frame_height: int = 480
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Instancia global de configuración
settings = Settings()
