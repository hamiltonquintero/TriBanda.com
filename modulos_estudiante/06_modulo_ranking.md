# Módulo 06: Ranking y Estadísticas

## Descripción
Calcula y muestra el ranking general del torneo en tiempo real.
Incluye estadísticas individuales por jugador y comparativas por club.

---

## Columnas del Ranking
| Columna          | Tipo  | Descripción                                              |
|------------------|-------|----------------------------------------------------------|
| posicion         | int   | Posición en el ranking (calculada automáticamente)       |
| nombre_completo  | string| Nombre del jugador                                       |
| club_ciudad      | string| Club o ciudad que representa                             |
| puntos           | float | Puntos acumulados en el torneo                           |
| sets_ganados     | int   | Total de sets ganados                                    |
| sets_perdidos    | int   | Total de sets perdidos (valor negativo)                  |
| carambolas_total | int   | Total de carambolas en el torneo                         |
| entradas_total   | int   | Total de entradas en el torneo                           |
| promedio         | float | carambolas_total / entradas_total                        |
| puntos_ranking   | float | Puntos con incremento por fecha aplicado                 |

---

## Reglas del Módulo
- El ranking se recalcula automáticamente al confirmar cada resultado
- Si entradas_total = 0, el promedio se muestra como 0
- El desempate sigue el orden: S.G. → S.P. → promedio → carambolas
- Al finalizar el torneo el ranking queda consolidado y bloqueado

---

## Pantallas del Módulo
1. Tabla de ranking general del torneo
2. Perfil estadístico de un jugador
3. Ranking por club (suma de puntos del equipo)
4. Comparativa entre dos jugadores

---

## Acciones Disponibles
| Acción                    | Rol mínimo requerido |
|---------------------------|----------------------|
| Ver ranking general       | Espectador           |
| Ver estadísticas jugador  | Espectador           |
| Ver ranking por club      | Espectador           |
| Exportar ranking (Excel)  | Admin                |
| Exportar ranking (PDF)    | Admin                |
| Forzar recálculo          | Admin                |
