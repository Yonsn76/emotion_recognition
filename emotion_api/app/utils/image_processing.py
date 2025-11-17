import cv2
import numpy as np
import base64
from typing import Optional, Tuple
import logging

logger = logging.getLogger(__name__)

def base64_to_image(base64_string: str) -> Optional[np.ndarray]:
    """
    Convierte string base64 a imagen OpenCV
    
    Args:
        base64_string: String base64 de la imagen
        
    Returns:
        Imagen como array numpy o None si hay error
    """
    try:
        # Decodificar base64
        image_data = base64.b64decode(base64_string)
        
        # Convertir a array numpy
        nparr = np.frombuffer(image_data, np.uint8)
        
        # Decodificar imagen
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            logger.error("No se pudo decodificar la imagen")
            return None
        
        return image
        
    except Exception as e:
        logger.error(f"Error convirtiendo base64 a imagen: {e}")
        return None

def image_to_base64(image: np.ndarray) -> Optional[str]:
    """
    Convierte imagen OpenCV a string base64
    
    Args:
        image: Imagen como array numpy
        
    Returns:
        String base64 o None si hay error
    """
    try:
        # Codificar imagen
        _, buffer = cv2.imencode('.jpg', image)
        
        # Convertir a base64
        image_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return image_base64
        
    except Exception as e:
        logger.error(f"Error convirtiendo imagen a base64: {e}")
        return None

def resize_image(image: np.ndarray, target_size: Tuple[int, int]) -> np.ndarray:
    """
    Redimensiona imagen manteniendo proporción
    
    Args:
        image: Imagen original
        target_size: Tamaño objetivo (width, height)
        
    Returns:
        Imagen redimensionada
    """
    try:
        height, width = image.shape[:2]
        target_width, target_height = target_size
        
        # Calcular escala manteniendo proporción
        scale = min(target_width / width, target_height / height)
        
        new_width = int(width * scale)
        new_height = int(height * scale)
        
        # Redimensionar
        resized = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
        
        # Crear imagen con tamaño objetivo y centrar
        result = np.zeros((target_height, target_width, 3), dtype=np.uint8)
        
        y_offset = (target_height - new_height) // 2
        x_offset = (target_width - new_width) // 2
        
        result[y_offset:y_offset+new_height, x_offset:x_offset+new_width] = resized
        
        return result
        
    except Exception as e:
        logger.error(f"Error redimensionando imagen: {e}")
        return image

def enhance_image_quality(image: np.ndarray) -> np.ndarray:
    """
    Mejora la calidad de la imagen para mejor detección
    
    Args:
        image: Imagen original
        
    Returns:
        Imagen mejorada
    """
    try:
        # Convertir a LAB para mejor procesamiento
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        
        # Aplicar CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        
        # Recombinar canales
        enhanced_lab = cv2.merge([l, a, b])
        enhanced = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
        
        # Reducir ruido
        denoised = cv2.bilateralFilter(enhanced, 9, 75, 75)
        
        return denoised
        
    except Exception as e:
        logger.error(f"Error mejorando calidad de imagen: {e}")
        return image

def extract_face_region(image: np.ndarray, face_coords: Tuple[int, int, int, int]) -> Optional[np.ndarray]:
    """
    Extrae región del rostro de la imagen
    
    Args:
        image: Imagen completa
        face_coords: Coordenadas del rostro (x, y, width, height)
        
    Returns:
        Región del rostro o None si hay error
    """
    try:
        x, y, width, height = face_coords
        
        # Verificar que las coordenadas estén dentro de la imagen
        if (x >= 0 and y >= 0 and 
            x + width <= image.shape[1] and 
            y + height <= image.shape[0]):
            
            face_region = image[y:y+height, x:x+width]
            return face_region
        else:
            logger.warning(f"Coordenadas de rostro fuera de límites: {face_coords}")
            return None
            
    except Exception as e:
        logger.error(f"Error extrayendo región del rostro: {e}")
        return None

def validate_image(image: np.ndarray) -> bool:
    """
    Valida que la imagen sea válida para procesamiento
    
    Args:
        image: Imagen a validar
        
    Returns:
        True si la imagen es válida
    """
    try:
        if image is None:
            return False
        
        if len(image.shape) != 3:
            return False
        
        if image.shape[2] != 3:  # Debe tener 3 canales (BGR)
            return False
        
        # Verificar que no esté vacía
        if image.size == 0:
            return False
        
        # Verificar dimensiones mínimas
        if image.shape[0] < 50 or image.shape[1] < 50:
            return False
        
        return True
        
    except Exception as e:
        logger.error(f"Error validando imagen: {e}")
        return False

def preprocess_for_detection(image: np.ndarray) -> np.ndarray:
    """
    Preprocesa imagen para detección de rostros
    
    Args:
        image: Imagen original
        
    Returns:
        Imagen preprocesada
    """
    try:
        # Mejorar calidad
        enhanced = enhance_image_quality(image)
        
        # Redimensionar si es muy grande
        height, width = enhanced.shape[:2]
        if width > 1280:
            scale = 1280 / width
            new_width = int(width * scale)
            new_height = int(height * scale)
            enhanced = cv2.resize(enhanced, (new_width, new_height))
        
        return enhanced
        
    except Exception as e:
        logger.error(f"Error preprocesando imagen: {e}")
        return image
