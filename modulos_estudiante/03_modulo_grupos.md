# Módulo 03: Fase de Grupos

## Descripción
Gestiona la fase inicial del torneo donde los jugadores se organizan en grupos pequeños.
Cada grupo juega internamente y los mejores clasifican a la siguiente fase.

---

## Campos del Formulario de Grupo
| Campo       | Tipo   | Requerido | Descripción                                          |
|-------------|--------|-----------|------------------------------------------------------|
| numero      | int    | sí        | Número del grupo (1, 2, 3...)                        |
| letra       | string | no        | Código identificador del grupo (AA, BB, CC...)       |
| jugadores   | array  | sí        | Lista de jugadores asignados (mínimo 3, máximo 4)    |

---

## Reglas del Módulo
- Cada grupo tiene mínimo 3 y máximo 4 jugadores
- Un jugador solo puede estar en un grupo por fase
- Los cupos sin asignar se marcan como pendientes
- El 1° de cada grupo clasifica automáticamente
- En caso de empate se aplican las reglas de desempate del doc 03

---

## Tabla de Posiciones por Grupo
Columnas que se muestran en tiempo real:
- Posición
- Nombre del jugador
- Club
- Puntos
- S.G. (sets ganados)
- S.P. (sets perdidos)
- CAR (carambolas)
- ENT (entradas)
- Promedio

---

## Pantallas del Módulo
1. Vista general de todos los grupos de la fase
2. Detalle de un grupo (tabla de posiciones + partidas)
3. Formulario de creación/edición de grupo
4. Asignación de jugadores a grupos (manual o sorteo)
5. Vista de clasificados al finalizar la fase

---

## Acciones Disponibles
| Acción                    | Rol mínimo requerido |
|---------------------------|----------------------|
| Ver grupos                | Espectador           |
| Crear grupos              | Admin                |
| Asignar jugadores         | Admin                |
| Sorteo automático         | Admin                |
| Ver tabla de posiciones   | Espectador           |
| Ver clasificados          | Espectador           |
