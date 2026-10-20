# 02 - Entidades Principales del Sistema

## Jugador
| Campo               | Tipo    | Requerido | Descripción                                      |
|---------------------|---------|-----------|--------------------------------------------------|
| id                  | UUID    | auto      | Identificador único generado automáticamente     |
| nombre              | string  | sí        | Nombre del jugador                               |
| apellido            | string  | sí        | Apellido del jugador                             |
| nombre_completo     | string  | auto      | Calculado: nombre + apellido (único)             |
| alias               | string  | no        | Apodo o nombre por el que se le conoce           |
| cedula              | string  | no        | Número de documento de identidad (único)         |
| celular             | string  | no        | Número de celular                                |
| ciudad              | string  | no        | Ciudad de residencia                             |
| pais                | string  | no        | País (default: Colombia)                         |
| club_ciudad         | string  | sí        | Club o ciudad que representa                     |
| categoria           | string  | no        | Categoría o handicap del jugador                 |
| foto_url            | string  | no        | URL de la foto del jugador                       |
| promedio_historico  | float   | auto      | Promedio acumulado de todos los torneos          |
| activo              | boolean | sí        | Indica si puede participar en torneos            |
| usuario_id          | UUID    | no        | Vinculación opcional con una cuenta de usuario   |

---

## Club
26 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
PS C:\Users\hamil\Documents\proyectos en desarrollo\app Billar\backend> DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/billar_db"
DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/billar_db: The term 'DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/billar_db' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
PS C:\Users\hamil\Documents\proyectos en desarrollo\app Billar\backend> DATABASE_URL="postgresql://postgres:@localhost:5432/billar_db"
DATABASE_URL=postgresql://postgres:@localhost:5432/billar_db: The term 'DATABASE_URL=postgresql://postgres:@localhost:5432/billar_db' is not recognized as a name of a cmdlet, function, script file, or executable program.
Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
PS C:\Users\hamil\Documents\proyectos en desarrollo\app Billar\backend> 


| Campo   | Tipo   | Requerido | Descripción                        |
|---------|--------|-----------|------------------------------------|
| id      | UUID   | auto      | Identificador único                |
| nombre  | string | sí        | Nombre del club                    |
| ciudad  | string | no        | Ciudad donde está ubicado el club  |

---

## Torneo
| Campo        | Tipo   | Requerido | Descripción                                              |
|--------------|--------|-----------|----------------------------------------------------------|
| id           | UUID   | auto      | Identificador único                                      |
| nombre       | string | sí        | Nombre del torneo                                        |
| descripcion  | string | no        | Subtítulo o descripción adicional                        |
| fecha_inicio | date   | sí        | Fecha en que inicia el torneo                            |
| fecha_fin    | date   | sí        | Fecha en que finaliza el torneo                          |
| sede         | string | sí        | Ciudad o lugar donde se realiza                          |
| estado       | enum   | sí        | Estado actual: borrador / activo / finalizado            |
| incremento   | float  | sí        | Porcentaje de incremento de puntos (ej: 0, 0.30, 0.50)  |

---

## Fase
| Campo     | Tipo   | Requerido | Descripción                                                  |
|-----------|--------|-----------|--------------------------------------------------------------|
| id        | UUID   | auto      | Identificador único                                          |
| torneo_id | UUID   | sí        | Torneo al que pertenece esta fase                            |
| tipo      | enum   | sí        | Tipo de fase: grupos / clasificatorio / llaves / final       |
| fecha     | date   | sí        | Fecha en que se juega esta fase                              |
| orden     | int    | sí        | Orden de ejecución dentro del torneo (1, 2, 3...)            |

---

## Grupo
| Campo      | Tipo   | Requerido | Descripción                                          |
|------------|--------|-----------|------------------------------------------------------|
| id         | UUID   | auto      | Identificador único                                  |
| fase_id    | UUID   | sí        | Fase a la que pertenece este grupo                   |
| numero     | int    | sí        | Número del grupo dentro de la fase                   |
| letra      | string | no        | Letra o código identificador del grupo (AA, BB...)   |
| jugadores  | array  | sí        | Lista de IDs de jugadores asignados al grupo         |

---

## Partida
| Campo        | Tipo   | Requerido | Descripción                                              |
|--------------|--------|-----------|----------------------------------------------------------|
| id           | UUID   | auto      | Identificador único                                      |
| fase_id      | UUID   | sí        | Fase a la que pertenece                                  |
| grupo_id     | UUID   | no        | Grupo al que pertenece (solo en fase de grupos)          |
| jugador_a_id | UUID   | sí        | Primer jugador de la partida                             |
| jugador_b_id | UUID   | sí        | Segundo jugador de la partida                            |
| juez_id      | UUID   | sí        | Juez asignado para registrar la partida                  |
| fecha        | date   | sí        | Fecha en que se juega la partida                         |
| hora         | time   | no        | Hora programada de inicio                                |
| estado       | enum   | sí        | Estado: pendiente / en_curso / finalizada                |
| ganador_id   | UUID   | calculado | Se calcula automáticamente al finalizar la partida       |

---

## Set
| Campo      | Tipo | Requerido | Descripción                                        |
|------------|------|-----------|----------------------------------------------------|
| id         | UUID | auto      | Identificador único                                |
| partida_id | UUID | sí        | Partida a la que pertenece este set                |
| numero     | int  | sí        | Número del set dentro de la partida (1, 2 o 3)     |
| ganador_id | UUID | calculado | Se calcula automáticamente al finalizar el set     |

---

## EntradaSet
| Campo          | Tipo | Requerido | Descripción                                          |
|----------------|------|-----------|------------------------------------------------------|
| id             | UUID | auto      | Identificador único                                  |
| set_id         | UUID | sí        | Set al que pertenece esta entrada                    |
| jugador_id     | UUID | sí        | Jugador que realiza la entrada                       |
| numero_entrada | int  | sí        | Número de la entrada (1 a 13 son válidas)            |
| carambolas     | int  | sí        | Cantidad de carambolas anotadas en esta entrada      |

---

## Ranking
| Campo            | Tipo  | Requerido | Descripción                                        |
|------------------|-------|-----------|----------------------------------------------------|
| id               | UUID  | auto      | Identificador único                                |
| torneo_id        | UUID  | sí        | Torneo al que corresponde este ranking             |
| jugador_id       | UUID  | sí        | Jugador al que corresponde                         |
| puntos           | float | calculado | Puntos acumulados en el torneo                     |
| sets_ganados     | int   | calculado | Total de sets ganados                              |
| sets_perdidos    | int   | calculado | Total de sets perdidos                             |
| carambolas_total | int   | calculado | Total de carambolas en todo el torneo              |
| entradas_total   | int   | calculado | Total de entradas en todo el torneo                |
| promedio         | float | calculado | carambolas_total dividido entre entradas_total     |
| puntos_ranking   | float | calculado | Puntos con el incremento por fecha aplicado        |
| posicion         | int   | calculado | Posición en el ranking general                     |

---

## Usuario
| Campo         | Tipo    | Requerido | Descripción                                        |
|---------------|---------|-----------|---------------------------------------------------|
| id            | UUID    | auto      | Identificador único                               |
| nombre        | string  | sí        | Nombre completo del usuario                       |
| email         | string  | sí        | Email único, usado para iniciar sesión            |
| password_hash | string  | sí        | Contraseña almacenada con hash bcrypt             |
| rol           | enum    | sí        | Rol: admin / juez / jugador / espectador          |
| jugador_id    | UUID    | no        | Vinculación opcional con un perfil de jugador     |
| activo        | boolean | sí        | Indica si el usuario puede acceder al sistema     |
| created_at    | date    | auto      | Fecha de creación del usuario                     |
