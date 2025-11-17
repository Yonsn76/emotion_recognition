#!/usr/bin/env python3
"""
Script para ejecutar la Emotion Analysis API
Uso: python run.py
"""

import uvicorn
import sys
import os
from pathlib import Path

# Agregar el directorio actual al path para importar los módulos
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

def main():
    """Función principal para ejecutar la API"""
    print("🚀 Iniciando Emotion Analysis API...")
    print("📍 Puerto: 8000")
    print("🌐 URL: http://localhost:8000")
    print("📚 Documentación: http://localhost:8000/docs")
    print("=" * 50)
    
    try:
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info",
            access_log=True
        )
    except KeyboardInterrupt:
        print("\n🛑 API detenida por el usuario")
    except Exception as e:
        print(f"❌ Error al iniciar la API: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
