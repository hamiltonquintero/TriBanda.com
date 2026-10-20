# Módulo 04: Registro de Partidas

## Descripción
Módulo central de captura de datos en tiempo real.
Permite registrar cada partida entrada por entrada, set por set.
Replica digitalmente la planilla física de registro.

---

## Campos de la Partida
| Campo        | Tipo   | Requerido | Descripción                                              |
|--------------|--------|-----------|----------------------------------------------------------|
| jugador_a_id | UUID   | sí        | Primer jugador de la partida                             |
| jugador_b_id | UUID   | sí        | Segundo jugador de la partida                            |
| juez_id      | UUID   | sí        | Juez asignado para registrar                             |
| fase_id      | UUID   | sí        | Fase del torneo a la que pertenece                       |
| grupo_id     | UUID   | no        | Grupo (solo aplica en fase de grupos)                    |
| fecha        | date   | sí        | Fecha de la partida                                      |
| hora         | time   | no        | Hora programada de inicio                                |
| estado       | enum   | sí        | pendiente / en_curso / finalizada                        |

---

## Campos por Entrada (dentro de cada set)
| Campo          | Tipo | Requerido | Descripción                                          |
|----------------|------|-----------|------------------------------------------------------|
| numero_entrada | int  | sí        | Número de la entrada (1 a 13 son válidas)            |
| carambolas_a   | int  | sí        | Carambolas del jugador A en esta entrada (>= 0)      |
| carambolas_b   | int  | sí        | Carambolas del jugador B en esta entrada (>= 0)      |

---

## Campos Calculados Automáticamente
| Campo          | Cómo se calcula                                      |
|----------------|------------------------------------------------------|
| total_a        | Suma acumulada de carambolas del jugador A en el set |
| total_b        | Suma acumulada de carambolas del jugador B en el set |
| ganador_set    | Jugador con mayor total al finalizar entrada 13      |
| ganador_partida| Jugador que gane 2 de los 3 sets                     |
| promedio_a     | carambolas_total_a / entradas_total_a                |
| promedio_b     | carambolas_total_b / entradas_total_b                |

---

## Reglas del Módulo
- Solo entradas 1 a 13 son válidas (14 y 15 no se registran)
- Las carambolas por entrada deben ser un número entero >= 0
- El juez no puede confirmar si hay entradas vacías
- Una partida confirmada no puede editarse sin permiso de admin
- El ganador se calcula automáticamente, no se ingresa manualmente

---

## Pantallas del Módulo
1. Lista de partidas del torneo (con estado y fase)
2. Planilla de registro en tiempo real (entrada por entrada)
3. Resumen de partida finalizada
4. Historial de partidas por jugador

---

## Acciones Disponibles
| Acción                    | Rol mínimo requerido |
|---------------------------|----------------------|
| Ver lista de partidas     | Espectador           |
| Crear partida             | Admin                |
| Registrar entradas        | Juez                 |
| Confirmar resultado       | Juez                 |
| Editar resultado confirmado| Admin               |
| Ver historial jugador     | Jugador (propio)     |
