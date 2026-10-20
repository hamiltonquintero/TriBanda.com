# Módulo 05: Bracket / Llaves

## Descripción
Gestiona la fase de eliminación directa del torneo.
Genera el bracket automáticamente desde los clasificados y lo actualiza en tiempo real.

---

## Campos del Bracket
| Campo      | Tipo | Requerido | Descripción                                              |
|------------|------|-----------|----------------------------------------------------------|
| torneo_id  | UUID | sí        | Torneo al que pertenece                                  |
| fase_id    | UUID | sí        | Fase de llaves                                           |
| tamaño     | int  | sí        | Número de jugadores: 8, 16 o 32                          |
| ronda      | int  | sí        | Ronda actual (16, 8, 4, 2, 1)                            |
| posicion   | int  | sí        | Posición del jugador en el bracket (siembra)             |
| jugador_id | UUID | no        | Jugador asignado (puede estar vacío al inicio)           |
| partida_id | UUID | no        | Partida asociada a este cruce                            |

---

## Reglas del Módulo
- El bracket se genera automáticamente al finalizar el clasificatorio
- La siembra se basa en el ranking del clasificatorio (1° vs último, etc.)
- El ganador de cada partida avanza automáticamente al siguiente cruce
- El bracket es fijo una vez generado (no se puede reordenar)
- Los cupos vacíos se completan con el clasificado correspondiente

---

## Pantallas del Módulo
1. Vista visual del bracket completo (árbol de eliminación)
2. Detalle de cada cruce (jugadores, resultado, fecha)
3. Vista de avance en tiempo real

---

## Acciones Disponibles
| Acción                    | Rol mínimo requerido |
|---------------------------|----------------------|
| Ver bracket               | Espectador           |
| Generar bracket           | Admin                |
| Ver detalle de cruce      | Espectador           |
| Exportar bracket (imagen) | Admin                |
