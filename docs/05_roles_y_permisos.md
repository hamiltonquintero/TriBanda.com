# 05 - Roles y Permisos

## Roles del Sistema

### Admin
- Acceso total al sistema
- Crea y configura torneos desde cero
- Registra jugadores y clubes
- Asigna jugadores a grupos
- Gestiona fases y brackets
- Puede corregir resultados confirmados
- Gestiona usuarios y sus roles
- Exporta reportes y rankings

### Juez
- Registra resultados de las partidas que le son asignadas
- Ingresa entradas y carambolas set por set
- Confirma el resultado final de la partida
- Ve su agenda de partidas asignadas

### Jugador
- Ve su propio perfil y estadísticas
- Ve su posición en el ranking
- Ve su bracket y próximas partidas
- No puede editar nada

### Espectador (acceso público, sin login)
- Ve el ranking en tiempo real
- Ve el bracket y resultados
- No requiere cuenta de usuario

---

## Matriz de Permisos

| Acción                        | Admin | Juez | Jugador | Espectador |
|-------------------------------|-------|------|---------|------------|
| Crear torneo                  | ✅    | ❌   | ❌      | ❌         |
| Editar torneo                 | ✅    | ❌   | ❌      | ❌         |
| Registrar jugadores           | ✅    | ❌   | ❌      | ❌         |
| Asignar jugadores a grupos    | ✅    | ❌   | ❌      | ❌         |
| Registrar resultados          | ✅    | ✅   | ❌      | ❌         |
| Confirmar resultado partida   | ✅    | ✅   | ❌      | ❌         |
| Corregir resultado confirmado | ✅    | ❌   | ❌      | ❌         |
| Ver ranking                   | ✅    | ✅   | ✅      | ✅         |
| Ver bracket                   | ✅    | ✅   | ✅      | ✅         |
| Ver perfil propio             | ✅    | ✅   | ✅      | ❌         |
| Ver perfil de otros           | ✅    | ✅   | ❌      | ❌         |
| Gestionar usuarios            | ✅    | ❌   | ❌      | ❌         |
| Exportar reportes             | ✅    | ❌   | ❌      | ❌         |
