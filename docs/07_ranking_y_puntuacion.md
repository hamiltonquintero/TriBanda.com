# 07 - Ranking y Puntuación

## Descripción
El ranking se calcula automáticamente a medida que se registran resultados.
Muestra la posición de cada jugador dentro del torneo.

---

## Columnas del Ranking
| Columna          | Descripción                                              |
|------------------|----------------------------------------------------------|
| Posición         | Lugar en el ranking (calculado automáticamente)          |
| Nombre           | Nombre completo del jugador                              |
| Club / Ciudad    | Club o ciudad que representa                             |
| Puntos           | Puntos acumulados según resultados                       |
| S.G.             | Sets ganados en total                                    |
| S.P.             | Sets perdidos en total (se muestra como valor negativo)  |
| CAR              | Total de carambolas anotadas en el torneo                |
| ENT              | Total de entradas jugadas en el torneo                   |
| Promedio         | CAR dividido entre ENT                                   |
| Puntos Ranking   | Puntos base con el incremento por fecha aplicado         |

---

## Fórmulas de Cálculo
- promedio = carambolas_total / entradas_total
- puntos_ranking = puntos_base × (1 + factor_incremento)
- Si entradas_total = 0 → promedio = 0

---

## Puntos Base por Posición Final
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

---

## Incremento por Fecha (configurable por torneo)
| Valor     | Efecto sobre puntos base |
|-----------|--------------------------|
| 0%        | Sin incremento           |
| 30%       | Puntos × 1.30            |
| 50%       | Puntos × 1.50            |
| (otro %)  | Configurable por admin   |

---

## Reglas de Desempate
Cuando dos jugadores tienen los mismos puntos, se desempata en este orden:
1. Mayor S.G. (sets ganados)
2. Menor S.P. (sets perdidos, en valor absoluto)
3. Mayor promedio
4. Mayor total de carambolas

---

## Ranking por Club
- Se calcula sumando los puntos de todos los jugadores del mismo club
- Muestra posición, nombre del club, total de puntos y número de jugadores

---

## Actualización del Ranking
- El ranking se recalcula automáticamente cada vez que se confirma un resultado
- El admin puede forzar un recálculo manual si es necesario
- Al finalizar el torneo, el ranking queda consolidado y bloqueado
