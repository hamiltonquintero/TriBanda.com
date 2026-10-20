# Módulo 01: Gestión de Jugadores

## Descripción
Permite registrar, editar y consultar los jugadores que participarán en los torneos.
Es el módulo base — todos los demás dependen de tener jugadores registrados.

---

## Campos del Formulario de Registro
| Campo           | Tipo    | Requerido | Descripción                                      |
|-----------------|---------|-----------|--------------------------------------------------|
| nombre_completo | string  | sí        | Nombre y apellido completo del jugador           |
| club_ciudad     | string  | sí        | Nombre del club o ciudad que representa          |
| categoria       | string  | no        | Categoría o handicap del jugador                 |
| activo          | boolean | sí        | Si está activo puede ser asignado a torneos      |

---

## Reglas del Módulo
- El nombre_completo debe ser único en el sistema
- Un jugador inactivo no puede ser asignado a grupos ni partidas
- No se puede eliminar un jugador que tenga partidas registradas (solo desactivar)
- Un jugador puede pertenecer a un solo club por torneo

---

## Pantallas del Módulo
1. Lista de jugadores (con filtros por club, estado)
2. Formulario de creación de jugador
3. Formulario de edición de jugador
4. Perfil del jugador (estadísticas, historial de partidas)

---

## Acciones Disponibles
| Acción             | Rol mínimo requerido |
|--------------------|----------------------|
| Ver lista          | Juez                 |
| Crear jugador      | Admin                |
| Editar jugador     | Admin                |
| Desactivar jugador | Admin                |
| Ver perfil         | Jugador (propio)     |
| Importar desde CSV | Admin                |
