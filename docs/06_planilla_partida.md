# 06 - Planilla de Partida (3 Sets)

## Descripción
Formulario digital que replica la planilla física de registro de partidas.
Se llena en tiempo real durante la partida, entrada por entrada.

---

## Encabezado de la Planilla
| Campo        | Descripción                                  |
|--------------|----------------------------------------------|
| Deportista A | Nombre del primer jugador                    |
| Deportista B | Nombre del segundo jugador                   |
| Juez         | Nombre del juez que registra la partida      |
| Fecha        | Fecha en que se juega la partida             |
| Fase         | Fase del torneo a la que pertenece           |

---

## Estructura por Set (se repite para Set 1, Set 2 y Set 3)

Por cada set, se registran las entradas de ambos jugadores en paralelo:

| Entrada | Deportista A — CAR | Deportista A — TOTAL | Deportista B — CAR | Deportista B — TOTAL |
|---------|--------------------|----------------------|--------------------|----------------------|
| 1       | (ingresar)         | (calculado)          | (ingresar)         | (calculado)          |
| 2       | (ingresar)         | (calculado)          | (ingresar)         | (calculado)          |
| ...     | ...                | ...                  | ...                | ...                  |
| 13      | (ingresar)         | (calculado)          | (ingresar)         | (calculado)          |
| 14      | ✗ inválida         | ✗                    | ✗ inválida         | ✗                    |
| 15      | ✗ inválida         | ✗                    | ✗ inválida         | ✗                    |

- CAR: carambolas anotadas en esa entrada (se ingresa manualmente)
- TOTAL: acumulado de carambolas hasta esa entrada (calculado automáticamente)
- Ganador del set: se muestra automáticamente al completar la entrada 13

---

## Resumen Final de la Partida
| Campo            | Deportista A | Deportista B |
|------------------|-------------|-------------|
| Total Carambolas | calculado   | calculado   |
| Total Entradas   | calculado   | calculado   |
| Sets Ganados     | calculado   | calculado   |
| Promedio         | calculado   | calculado   |

---

## Confirmación
- El juez debe confirmar el resultado para que sea oficial
- Una vez confirmado, el resultado se bloquea
- Solo el admin puede desbloquear un resultado confirmado

---

## Reglas de la Planilla
- Solo las entradas 1 a 13 son válidas para el cómputo
- Las carambolas por entrada deben ser un número entero >= 0
- El total es acumulativo dentro del set
- El promedio se calcula sobre el total de la partida completa (no por set individual)
- El juez no puede dejar entradas vacías antes de confirmar
