# Módulo 07: Autenticación y Usuarios

## Descripción
Gestiona el acceso al sistema mediante autenticación JWT.
Controla los roles y permisos de cada tipo de usuario.

---

## Campos del Formulario de Login
| Campo    | Tipo   | Requerido | Descripción                    |
|----------|--------|-----------|--------------------------------|
| email    | string | sí        | Email registrado en el sistema |
| password | string | sí        | Contraseña del usuario         |

---

## Campos del Formulario de Registro de Usuario
| Campo      | Tipo   | Requerido | Descripción                                      |
|------------|--------|-----------|--------------------------------------------------|
| nombre     | string | sí        | Nombre completo del usuario                      |
| email      | string | sí        | Email único en el sistema                        |
| password   | string | sí        | Contraseña (mínimo 8 caracteres)                 |
| rol        | enum   | sí        | admin / juez / jugador / espectador              |
| jugador_id | UUID   | no        | Vinculación opcional con un perfil de jugador    |

---

## Reglas del Módulo
- El email debe ser único en el sistema
- La contraseña debe tener mínimo 8 caracteres
- Las contraseñas se almacenan con hash bcrypt
- Los tokens JWT expiran en 24 horas
- Un usuario inactivo no puede iniciar sesión
- Solo el admin puede crear usuarios y cambiar roles
- El espectador no necesita cuenta (acceso público)

---

## Flujo de Autenticación
1. Usuario ingresa email + contraseña en el formulario de login
2. El backend valida las credenciales
3. Si son válidas: genera un token JWT con { id, email, rol }
4. El frontend almacena el token de forma segura
5. Cada petición al backend incluye el token en el header
6. El backend valida el token y verifica el rol antes de responder

---

## Pantallas del Módulo
1. Pantalla de login
2. Pantalla de cambio de contraseña
3. Lista de usuarios (solo admin)
4. Formulario de creación de usuario (solo admin)
5. Formulario de edición de usuario (solo admin)
6. Perfil propio del usuario

---

## Acciones Disponibles
| Acción                    | Rol mínimo requerido |
|---------------------------|----------------------|
| Login                     | Todos                |
| Logout                    | Todos                |
| Cambiar contraseña propia | Todos                |
| Ver perfil propio         | Todos                |
| Crear usuario             | Admin                |
| Editar usuario            | Admin                |
| Cambiar rol               | Admin                |
| Desactivar usuario        | Admin                |
