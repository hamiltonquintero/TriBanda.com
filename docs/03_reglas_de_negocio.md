# 03 - Reglas de Negocio

## Cálculo de Promedio
- Formula: promedio = carambolas_total / entradas_total
- Si entradas_total = 0, el promedio es 0 (evitar división por cero)
- Se calcula automáticamente al registrar cada entrada

## Entradas Válidas por Set
- Solo las entradas del 1 al 13 son válidas para el cómputo
- Las entradas 14 y 15 están marcadas como inválidas (X) y no se registran
- Cada jugador tiene sus propias entradas dentro del set

## Ganador de un Set
- Gana el set el jugador con mayor total de carambolas al finalizar las 13 entradas
- El ganador se calcula automáticamente al completar todas las entradas del set

## Ganador de una Partida
- Cada partida se juega a 3 sets
- Gana la partida el jugador que gane 2 de los 3 sets
- El ganador se calcula automáticamente al finalizar los sets necesarios

## Puntos por Posición Final
| Posición        | Puntos Base |
|-----------------|-------------|
| 1° (Campeón)    | 90          |
| 2° (Subcampeón) | 48          |
| 3°              | 30          |
| 4°              | 24          |
| 5° - 8°         | 12          |
| 9° - 16°        | 6           |
| Clasificatorio  | 3 - 4       |
| Fase de Grupos  | 1 - 2       |

## Incremento de Puntos por Fecha
- Cada torneo tiene un porcentaje de incremento configurado por el admin
- Ejemplos de incremento: 0% (sin incremento), 30%, 50%
- Formula: puntos_finales = puntos_base × (1 + incremento)

## Desempate en Ranking
Cuando dos jugadores tienen los mismos puntos, se desempata en este orden:
1. Mayor cantidad de sets ganados (S.G.)
2. Menor cantidad de sets perdidos (S.P.)
3. Mayor promedio (carambolas / entradas)
4. Mayor total de carambolas

## Clasificación dentro de un Grupo
- El 1° de cada grupo clasifica automáticamente a la siguiente fase
- El desempate dentro del grupo sigue las mismas reglas de ranking

## Avance entre Fases
- Fase de Grupos → Clasificatorio: avanzan los primeros de cada grupo
- Clasificatorio → Llaves: avanzan los mejores según ranking del clasificatorio
- Llaves: eliminación directa, el ganador avanza al siguiente cruce

## Cupos Pendientes
- Un grupo puede tener cupos sin asignar al momento de crearse
- Los cupos se identifican con un marcador especial hasta ser asignados
- Un cupo sin asignar no puede tener partidas registradas

## Estado del Torneo
- borrador: se puede editar todo (jugadores, grupos, fases)
- activo: no se puede editar la estructura, solo registrar resultados
- finalizado: todo bloqueado, solo lectura y exportación

## Confirmación de Resultados
- El juez debe confirmar el resultado de cada partida para que sea oficial
- Una partida confirmada no puede editarse sin permiso de administrador
