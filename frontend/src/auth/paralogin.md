# ParaLogin - Documentación de API

## 🚀 Información General

La API de Mate AI está configurada para ejecutarse en el **puerto 2025**.

### URL Base
```
http://localhost:2025
```

### Health Check
```
GET http://localhost:2025/health
```

## 🔐 Endpoints de Autenticación

### 1. Registro de Usuario
**Endpoint:** `POST /api/usuarios/registro`

**Descripción:** Permite registrar nuevos usuarios en el sistema.

**Body (JSON):**
```json
{
  "nombre": "Juan Pérez",
  "correo": "juan@ejemplo.com",
  "contrasena": "password123",
  "rol": "docente", // o "alumno"
  "grado": "5to", // Solo para alumnos
  "seccion": "A", // Solo para alumnos
  "especialidad": "Matemáticas", // Solo para docentes
  "gradosAsignados": ["4to", "5to"], // Solo para docentes
  "docenteAsignado": "ObjectId" // Solo para alumnos
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_aqui",
    "usuario": {
      "id": "ObjectId",
      "nombre": "Juan Pérez",
      "correo": "juan@ejemplo.com",
      "rol": "docente",
      "grado": "5to",
      "seccion": "A",
      "especialidad": "Matemáticas",
      "gradosAsignados": ["4to", "5to"]
    }
  }
}
```

### 2. Login de Usuario
**Endpoint:** `POST /api/usuarios/login`

**Descripción:** Autentica un usuario existente y devuelve un token JWT.

**Body (JSON):**
```json
{
  "correo": "juan@ejemplo.com",
  "contrasena": "password123"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_aqui",
    "usuario": {
      "id": "ObjectId",
      "nombre": "Juan Pérez",
      "correo": "juan@ejemplo.com",
      "rol": "docente",
      "grado": "5to",
      "seccion": "A",
      "especialidad": "Matemáticas",
      "gradosAsignados": ["4to", "5to"]
    }
  }
}
```

### 3. Obtener Perfil de Usuario
**Endpoint:** `GET /api/usuarios/me`

**Headers requeridos:**
```
Authorization: Bearer jwt_token_aqui
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "data": {
    "id": "ObjectId",
    "nombre": "Juan Pérez",
    "correo": "juan@ejemplo.com",
    "rol": "docente",
    "grado": "5to",
    "seccion": "A",
    "especialidad": "Matemáticas",
    "gradosAsignados": ["4to", "5to"],
    "docenteAsignado": {
      "nombre": "Profesor Asignado",
      "correo": "profesor@ejemplo.com",
      "especialidad": "Matemáticas"
    }
  }
}
```

## 🔗 Integración con Otros Sistemas

### Para integrar usuarios en otro sistema:

1. **Registrar usuarios:** Use el endpoint `/api/usuarios/registro`
2. **Autenticar usuarios:** Use el endpoint `/api/usuarios/login`
3. **Verificar tokens:** Incluya el header `Authorization: Bearer <token>` en todas las peticiones protegidas

### Ejemplo de integración en JavaScript:

```javascript
// Función para login
async function loginUser(email, password) {
  const response = await fetch('http://localhost:2025/api/usuarios/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      correo: email,
      contrasena: password
    })
  });
  
  const data = await response.json();
  if (data.success) {
    // Guardar token para futuras peticiones
    localStorage.setItem('token', data.data.token);
    return data.data.usuario;
  }
  throw new Error(data.message);
}

// Función para obtener perfil
async function getUserProfile() {
  const token = localStorage.getItem('token');
  const response = await fetch('http://localhost:2025/api/usuarios/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  return data.data;
}
```

## 📋 Otros Endpoints Disponibles

- **Solicitudes:** `/api/solicitudes`
- **Asignaciones:** `/api/asignaciones`
- **Grupos:** `/api/grupos`
- **Anuncios:** `/api/anuncios`
- **Plantillas:** `/api/plantillas`
- **Tests:** `/api/tests`
- **IA:** `/api/ia`
- **Reportes de Rendimiento:** `/api/rendimientoreporte`

## 🔧 Configuración

- **Puerto:** 2025
- **Base de datos:** MongoDB Atlas
- **Autenticación:** JWT (JSON Web Tokens)
- **CORS:** Habilitado para todos los orígenes
- **Entorno:** Desarrollo

## ⚠️ Notas Importantes

1. Los tokens JWT expiran en 7 días
2. Todos los endpoints requieren autenticación excepto `/registro` y `/login`
3. El sistema soporta dos roles: `docente` y `alumno`
4. Los alumnos pueden tener un docente asignado
5. Los docentes pueden ver sus alumnos asignados

## 🚨 Códigos de Error Comunes

- **400:** Datos de entrada inválidos
- **401:** No autorizado (token inválido o expirado)
- **403:** Acceso denegado (rol insuficiente)
- **404:** Recurso no encontrado
- **500:** Error interno del servidor
