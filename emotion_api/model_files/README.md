# Modelos de IA para Análisis de Emociones

## Modelos incluidos:

### 1. YOLO (Detección de rostros)
- **Archivo:** yolov8n.pt
- **Propósito:** Detectar rostros en tiempo real
- **Tamaño:** ~6MB
- **Precisión:** Alta

### 2. Haar Cascade (Detección facial)
- **Archivo:** haarcascade_frontalface_default.xml
- **Propósito:** Detección rápida de rostros
- **Tamaño:** ~1MB
- **Velocidad:** Muy rápida

### 3. Modelos de Emociones (Opcional)
- **Archivo:** emotion_model.h5
- **Propósito:** Clasificación de emociones
- **Tamaño:** ~10MB
- **Emociones:** 7 categorías

## Uso:
Los modelos se cargan automáticamente cuando se inicia la API.
No es necesario descargarlos manualmente.

## Ubicación:
Todos los modelos están en la carpeta `model_files/` para mejor organización.