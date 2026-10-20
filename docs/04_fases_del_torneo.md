# 04 - Fases del Torneo

## Estructura General
Un torneo puede tener entre 1 y 4 fases, configuradas por el administrador al crear el torneo.
Las fases se ejecutan en orden secuencial.

---

## Fase 1: Fase de Grupos

### Descripción
Los jugadores se dividen en grupos pequeños. Cada grupo juega internamente y los mejores clasifican.

### Configuración
| Campo              | Descripción                                              |
|--------------------|----------------------------------------------------------|
| Número de grupos   | Cuántos grupos se crean (configurable por el admin)      |
| Jugadores por grupo| Mínimo 3, máximo 4 jugadores por grupo                   |
| Método de sorteo   | Manual (admin asigna) o automático (sorteo aleatorio)    |
| Clasificados       | Cuántos jugadores de cada grupo avanzan (normalmente 1)  |

### Tabla de posiciones por grupo
Columnas que se muestran por cada grupo:
- Posición
- Nombre del jugador
- Club
- Puntos
- Sets Ganados (S.G.)
- Sets Perdidos (S.P.)
- Carambolas (CAR)
- Entradas (ENT)
- Promedio

---

## Fase 2: Clasificatorio

### Descripción
Los clasificados de los grupos compiten entre sí. Los mejores avanzan al bracket de llaves.

### Configuración
| Campo           | Descripción                                              |
|-----------------|----------------------------------------------------------|
| Formato         | Round-robin (todos contra todos) o eliminación simple    |
| Clasificados    | Cuántos jugadores avanzan a la fase de llaves (ej: top 8)|

---

## Fase 3: Llaves (Bracket de Eliminación Directa)

### Descripción
Bracket de eliminación directa. El ganador de cada partida avanza al siguiente cruce.

### Configuración
| Campo         | Descripción                                              |
|---------------|----------------------------------------------------------|
| Tamaño        | 8, 16 o 32 jugadores                                     |
| Siembra       | Basada en el ranking del clasificatorio                  |
| Generación    | Automática al finalizar la fase anterior                 |

### Rondas del bracket (ejemplo para 16 jugadores)
- Ronda de 16 (octavos)
- Cuartos de final
- Semifinales
- Final

---

## Fase 4: Final

### Descripción
Partida única entre los dos finalistas. Se registra con la planilla estándar de 3 sets.

### Resultado
- Campeón: jugador que gane 2 de 3 sets
- Subcampeón: jugador perdedor de la final
- El resultado consolida el ranking final del torneo
