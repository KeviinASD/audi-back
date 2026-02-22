# 🔐 Módulo de Autenticación (`/auth`)

Gestión de sesiones de auditores y validación de identidad.

## Endpoints

### 1. Iniciar Sesión [POST]
Valida credenciales y genera un token de acceso.
- **URL:** `/auth/login`
- **Público:** Sí
- **Cuerpo (JSON):**
```json
{
  "email": "usuario@gmail.com",
  "password": "mi_password_segura"
}
```
- **Respuesta Exitosa (200):**
```json
{
  "user": {
    "id": 1,
    "username": "krivas",
    "email": "usuario@gmail.com"
  },
  "access_token": "eyJhbGciOiJIUzI1..."
}
```

### 2. Registro de Auditor [POST]
Crea una nueva cuenta técnica para un auditor.
- **URL:** `/auth/register`
- **Público:** Sí
- **Cuerpo (JSON):**
```json
{
  "username": "krivas",
  "email": "usuario@gmail.com",
  "password": "password123"
}
```
- **Respuesta Exitosa (201):** Retorna el mismo objeto que el Login (incluye token).

### 3. Verificar Mi Sesión [GET]
Verifica si el token es válido y extrae el ID del usuario.
- **URL:** `/auth/me`
- **Requiere Bearer Token:** Sí
- **Respuesta Exitosa (200):**
```json
{
  "sub": 1
}
```

### 4. Google OAuth [GET]
Endpoints para autenticación social.
- `GET /auth/google/login`: Redirige a Google.
- `GET /auth/google/callback`: Recibe el perfil y redirige al dashboard final.

---
**Importante:** El `access_token` debe enviarse en la cabecera `Authorization: Bearer <TOKEN>` para el resto de peticiones.
