# TriBanda — Documentación del Sistema
> Aplicativo web para gestión de torneos de billar a 3 bandas

---

## Índice
1. [Descripción general](#1-descripción-general)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Estructura de carpetas](#3-estructura-de-carpetas)
4. [Base de datos — Modelos y relaciones](#4-base-de-datos--modelos-y-relaciones)
5. [Backend — Módulos y lógica](#5-backend--módulos-y-lógica)
6. [Frontend — Páginas y navegación](#6-frontend--páginas-y-navegación)
7. [Autenticación y roles](#7-autenticación-y-roles)
8. [Flujo completo de un torneo](#8-flujo-completo-de-un-torneo)
9. [API — Endpoints registrados](#9-api--endpoints-registrados)
10. [Seguridad](#10-seguridad)
11. [Scripts y utilidades](#11-scripts-y-utilidades)

---

## 1. Descripción general

**TriBanda** es una aplicación web full-stack para gestionar torneos de billar a 3 bandas de principio a fin. Permite:

- Crear y administrar torneos con múltiples fases (grupos → bracket/llaves).
- Registrar jugadores y clubes.
- Inscribir jugadores a torneos con nivel y meta de puntos (handicap).
- Organizar fases de grupos con sorteo automático o asignación manual.
- Registrar partidas en tiempo real desde una planilla digital (entrada por entrada) o un marcador digital (carambolas +/-).
- Soportar sistema de handicap (meta por jugador).
- Calcular automáticamente ganadores de sets, ganadores de partidas, y avanzar en el bracket.
- Calcular y mostrar rankings con criterios de desempate y factor de incremento.
- Visualizar el bracket (llaves) con siembra estándar de torneo.
- Roles diferenciados: admin, juez, jugador, espectador.

No incluye datos precargados — todo se crea desde la interfaz.

---

## 2. Stack tecnológico

### Backend
| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | LTS | Runtime |
| TypeScript | 5.x | Lenguaje |
| Express | 4.18 | Framework HTTP |
| Prisma | 5.22 | ORM |
| PostgreSQL | — | Base de datos |
| jsonwebtoken | 9.x | JWT |
| bcryptjs | 2.x | Hash de contraseñas |
| Zod | 3.22 | Validación de esquemas |
| Helmet | 7.x | Headers de seguridad |
| express-rate-limit | 7.x | Rate limiting |
| cors | 2.x | CORS |

### Frontend
| Tecnología | Versión | Uso |
|---|---|---|
| React | 18.2 | Framework UI |
| TypeScript | 5.x | Lenguaje |
| Vite | 5.x | Build tool |
| TailwindCSS | 3.x | Estilos |
| React Router | 6.22 | Routing SPA |
| Zustand | 4.5 | Estado global |
| TanStack Query | 5.24 | Fetching y caché |
| Axios | 1.6 | HTTP client |
| React Hook Form | 7.51 | Formularios |
| Zod | 3.22 | Validación de formularios |

---

## 3. Estructura de carpetas

```
app Billar/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Esquema de la base de datos
│   │   ├── seed.ts                # Datos iniciales (admin)
│   │   └── migrations/            # 3 migraciones aplicadas
│   ├── src/
│   │   ├── app.ts                 # Entry point: Express + middlewares + rutas
│   │   ├── config/
│   │   │   ├── env.ts             # Variables de entorno validadas
│   │   │   └── prisma.ts          # Instancia singleton de PrismaClient
│   │   ├── middlewares/
│   │   │   ├── authGuard.ts       # Verifica JWT en header Authorization
│   │   │   └── errorHandler.ts    # Manejo centralizado de errores
│   │   └── modules/
│   │       ├── auth/              # Login, usuarios, cambio de contraseña
│   │       ├── jugadores/         # CRUD jugadores y clubes
│   │       ├── torneos/           # CRUD torneos y fases
│   │       ├── inscripciones/     # Inscripción de jugadores a torneos
│   │       ├── grupos/            # Grupos, sorteo, tabla de posiciones
│   │       ├── partidas/          # Planilla, marcador, sets, entradas
│   │       ├── bracket/           # Generación y visualización de llaves
│   │       └── ranking/           # Cálculo de rankings
│   ├── scripts/                   # Scripts auxiliares de desarrollo
│   ├── .env                       # Variables de entorno
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                # Routing principal
│   │   ├── main.tsx               # Entry point React
│   │   ├── index.css              # Estilos globales TailwindCSS
│   │   ├── assets/                # Imágenes, íconos
│   │   ├── components/            # Componentes reutilizables
│   │   ├── hooks/                 # Custom hooks
│   │   ├── pages/                 # Páginas por módulo
│   │   ├── services/
│   │   │   └── api.ts             # Axios con interceptores JWT
│   │   ├── store/
│   │   │   └── authStore.ts       # Estado de autenticación (Zustand)
│   │   └── types/                 # Tipos TypeScript compartidos
│   └── package.json
│
├── docs/
│   └── sistema.md                 # Este archivo
├── scripts/
│   └── e2e-torneo-completo.ps1    # Prueba E2E automatizada vía HTTP
└── AGENT.md                       # Guía maestra del proyecto
```

Cada módulo del backend sigue la misma estructura interna:
```
modulo/
├── modulo.router.ts      # Define las rutas Express y asigna middlewares
├── modulo.controller.ts  # Recibe req/res, valida con Zod, llama al service
├── modulo.service.ts     # Lógica de negocio + queries Prisma
└── modulo.schema.ts      # Esquemas Zod para validación de entrada
```

---

## 4. Base de datos — Modelos y relaciones

### Diagrama de relaciones

```
Usuario ──────────────────────── Jugador (1:1 opcional)
   │                                │
   │ (juez en partidas)             ├── Club (N:1)
   │                                ├── GrupoJugador (N:M)
   └── Partida[] (como juez)        ├── Partida[] (como jugador_a)
                                    ├── Partida[] (como jugador_b)
                                    ├── EntradaSet[]
                                    ├── Ranking[]
                                    ├── BracketSlot[]
                                    └── InscripcionTorneo[]

Torneo
  ├── Fase[]
  │     ├── Grupo[]
  │     │     └── GrupoJugador[]
  │     ├── Partida[]
  │     │     ├── Set[]
  │     │     │     └── EntradaSet[]
  │     │     └── (ganador, jugador_a, jugador_b, juez)
  │     └── BracketSlot[]
  ├── Ranking[]
  └── InscripcionTorneo[]
```

### Modelos principales

#### `Usuario`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Clave primaria |
| `nombre` | String | Nombre del usuario |
| `email` | String @unique | Email de login |
| `password_hash` | String | bcrypt salt 12 |
| `rol` | Enum | `admin \| juez \| jugador \| espectador` |
| `activo` | Boolean | Puede desactivarse sin borrar |
| `jugador_id` | UUID? @unique | Vinculación opcional a un Jugador |

#### `Jugador`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Clave primaria |
| `nombre`, `apellido` | String | Nombre separado |
| `nombre_completo` | String @unique | Calculado: `nombre + apellido` |
| `alias`, `cedula`, `celular` | String? | Datos opcionales |
| `ciudad`, `pais` | String? | Ubicación (default Colombia) |
| `club_ciudad` | String | Texto libre de club/ciudad |
| `club_id` | UUID? | FK a Club (opcional) |
| `categoria` | String? | Categoría del jugador |
| `foto_url` | String? | URL de foto |
| `promedio_historico` | Float | Promedio acumulado de todos los torneos |
| `activo` | Boolean | Puede desactivarse |

#### `Torneo`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Clave primaria |
| `nombre`, `descripcion` | String | Información del torneo |
| `fecha_inicio`, `fecha_fin` | DateTime | Fechas del torneo |
| `sede` | String | Lugar del torneo |
| `estado` | Enum | `borrador \| activo \| finalizado` |
| `incremento` | Float | Factor para puntos de ranking (ej. 0.3 → ×1.3) |
| `meta_base` | Int | Meta base de carambolas por set (default 30) |

#### `Fase`
| Campo | Tipo | Descripción |
|---|---|---|
| `tipo` | Enum | `grupos \| clasificatorio \| llaves \| final` |
| `fecha` | DateTime | Fecha de la fase |
| `orden` | Int | Orden secuencial de la fase en el torneo |
| `torneo_id` | UUID | FK al torneo (cascade delete) |

#### `Partida`
| Campo | Tipo | Descripción |
|---|---|---|
| `estado` | Enum | `pendiente \| en_curso \| finalizada` |
| `total_sets` | Int | Número de sets (default 3) |
| `meta_a`, `meta_b` | Int? | Meta de carambolas por jugador (handicap) |
| `jugador_a_id`, `jugador_b_id` | UUID | Los dos jugadores |
| `juez_id` | UUID? | Juez asignado (opcional) |
| `ganador_id` | UUID? | Calculado automáticamente |
| `confirmada` | Boolean | Confirmada por el juez |
| `fase_id` | UUID | A qué fase pertenece |
| `grupo_id` | UUID? | A qué grupo pertenece (si es fase de grupos) |

#### `Set` y `EntradaSet`
- Cada `Partida` tiene `N` Sets (según `total_sets`).
- Cada `Set` tiene hasta 13 `EntradaSet` por jugador (26 filas en total por set).
- Cada `EntradaSet` registra el número de entrada y las carambolas anotadas.
- El ganador del set se calcula comparando la suma de carambolas de cada jugador.

#### `Ranking`
| Campo | Tipo | Descripción |
|---|---|---|
| `puntos` | Float | Puntos acumulados (2 victoria, 1 empate, 0 derrota) |
| `sets_ganados`, `sets_perdidos` | Int | Para desempate |
| `carambolas_total`, `entradas_total` | Int | Para calcular promedio |
| `promedio` | Float | carambolas / entradas |
| `puntos_ranking` | Float | puntos × (1 + torneo.incremento) |
| `posicion` | Int | Posición calculada y persistida |

Unique constraint: `(torneo_id, jugador_id)` — un registro por jugador por torneo.

#### `BracketSlot`
| Campo | Tipo | Descripción |
|---|---|---|
| `ronda` | Int | Número de la ronda (16 = octavos, 8 = cuartos, 4 = semis, 2 = final) |
| `posicion` | Int | Posición dentro de la ronda |
| `jugador_id` | UUID? | Jugador asignado a ese slot |
| `partida_id` | UUID? | Partida creada para ese cruce |

#### `InscripcionTorneo`
| Campo | Tipo | Descripción |
|---|---|---|
| `nivel` | String | Nivel del jugador: `primera \| segunda \| ...` |
| `meta_puntos` | Int | Meta de carambolas para este jugador en el torneo (handicap global) |

Unique constraint: `(torneo_id, jugador_id)`.

---

## 5. Backend — Módulos y lógica

### Módulo `auth`

**Funcionalidades:**
- **Login**: busca usuario por email, compara bcrypt, genera JWT con `{ id, email, rol }` y expiración `JWT_EXPIRES_IN`. Devuelve token + datos del usuario.
- **Crear usuario**: hashea contraseña con bcrypt (salt 12), crea usuario con rol asignado.
- **Listar usuarios**: filtrado por rol, sin exponer `password_hash`.
- **Actualizar usuario**: modifica nombre, rol, estado activo, y puede vincular/desvincular a un Jugador.
- **Cambiar contraseña**: verifica la contraseña actual antes de permitir el cambio.

**Rutas protegidas:** todas excepto `POST /auth/login` requieren `authGuard`.

---

### Módulo `jugadores`

**Funcionalidades:**
- **CRUD completo de jugadores**: crear, leer, editar, desactivar.
- **Gestión de clubes**: crear club, listar clubes.
- **Cálculo de promedio histórico**: `recalcularPromedioHistorico(jugador_id)` — suma todas las entradas del jugador en partidas confirmadas de todos los torneos, calcula promedio global y lo persiste en `Jugador.promedio_historico`. Se llama automáticamente al confirmar una partida.
- **Búsqueda y filtros**: por nombre, club, categoría, activo/inactivo.
- **Perfil del jugador**: incluye historial de torneos, partidas jugadas, estadísticas globales.

---

### Módulo `torneos`

**Funcionalidades:**
- **CRUD de torneos**: crear, editar, listar, obtener detalle.
- **Cambio de estado**: `borrador → activo → finalizado`. El paso a `finalizado` puede disparar la asignación de puntos por posición final.
- **Gestión de fases**: agregar fases al torneo (grupos, clasificatorio, llaves, final) con su tipo, fecha y orden.
- **Detalle de torneo**: incluye lista de fases, inscripciones, estadísticas generales.

**Rutas públicas** (sin login): `GET /torneos`, `GET /torneos/:id`.

---

### Módulo `inscripciones`

**Funcionalidades:**
- **Inscribir jugador a torneo**: crea un registro `InscripcionTorneo` con nivel y meta de puntos. Valida unique `(torneo_id, jugador_id)`.
- **Listar inscritos de un torneo**: devuelve jugadores con su nivel y meta.
- **Eliminar inscripción**.
- **Actualizar meta/nivel**: permite ajustar el handicap de un jugador específico en un torneo.

---

### Módulo `grupos`

**Funcionalidades:**
- **Crear grupos**: para una fase específica, con número y letra opcional (Grupo A, Grupo B...).
- **Asignar jugadores manualmente**: valida que el grupo tenga entre 3 y 4 jugadores, que no estén ya en otro grupo de la misma fase. Reemplaza la asignación en transacción.
- **Sorteo automático** (`sorteoAutomatico(fase_id, jugador_ids)`):
  1. Mezcla la lista de jugadores con el algoritmo Fisher-Yates.
  2. Distribuye round-robin entre los grupos existentes de la fase.
  3. Valida que cada grupo quede con 3-4 jugadores.
- **Tabla de posiciones** (`calcularTablaGrupo(grupo_id)`):
  - Itera sobre todas las partidas `finalizada` del grupo.
  - Calcula puntos (2 victoria, 1 empate, 0 derrota), sets ganados/perdidos, carambolas, promedio por jugador.
  - Ordena con criterio de desempate: `puntos DESC → sets_ganados DESC → sets_perdidos ASC → promedio DESC → carambolas DESC`.
  - Retorna la tabla en tiempo real (no persiste).
- **Obtener clasificados** (`obtenerClasificados(fase_id)`): devuelve solo el primero de la tabla de cada grupo — estos pasan a la siguiente fase/bracket.

**Rutas públicas** (sin login): `GET /grupos` de un torneo.

---

### Módulo `partidas`

Es el módulo más complejo. Gestiona el registro en tiempo real de partidas.

**Estados de una partida:** `pendiente → en_curso → finalizada`

#### Creación
`crearPartida(data)` — crea una partida con:
- Fase y grupo de origen.
- Dos jugadores (A y B).
- Juez asignado (opcional).
- Fecha y hora opcionales.
- `total_sets` (cuántos sets se juegan).
- `meta_a` y `meta_b` opcionales para handicap por jugador.

#### Inicio
`iniciarPartida(id)` — cambia estado a `en_curso` y crea los N Sets vacíos en una transacción de Prisma.

#### Modo Planilla (clásico)
`registrarEntrada(partida_id, { jugador_id, set_numero, numero_entrada, carambolas })`:
- Hace un **upsert** de la `EntradaSet` (crea o actualiza).
- Permite registrar entradas del 1 al 13 para cada jugador.
- Al llegar a la entrada 13 de ambos jugadores, calcula automáticamente el ganador del set.
- Si hay `meta_a`/`meta_b` y se alcanza la meta, calcula ganador del set inmediatamente.
- Tras calcular el ganador del set, verifica si hay ganador de la partida.

#### Modo Marcador digital
`marcadorAccion(partida_id, { jugador_id, set_numero, accion })`:
- Acción: `sumar` o `restar` 1 carambola en la entrada actual del jugador.
- Si el jugador no tiene entrada activa, crea una nueva.
- Si hay `meta_a`/`meta_b` y se alcanza la meta del jugador, calcula ganador del set.
- Retorna el marcador actualizado.

#### Cambio de turno
`cambioTurno(partida_id, set_numero)`:
- Crea una nueva entrada (con 0 carambolas) para ambos jugadores, incrementando el número de entrada.
- Si ambos jugadores ya llegaron a la entrada 13, calcula ganador del set en lugar de crear más entradas.
- Retorna el marcador actualizado.

#### Cálculo de ganadores (helpers internos)
- `calcularGanadorSet(set_id)`: suma carambolas de cada jugador en el set, asigna `ganador_id` al set.
- `calcularGanadorPartida(partida_id)`: cuenta sets ganados por cada jugador. Para ganar se necesita mayoría (`Math.ceil(total_sets / 2)`). Actualiza `ganador_id` y `estado = 'finalizada'` en la partida.

#### Confirmación de partida
`confirmarPartida(id, usuario_id, usuario_rol)`:
1. Verifica que quien confirma es el juez asignado o un admin.
2. Actualiza `confirmada = true`.
3. Llama a `actualizarRanking(partida_id)` — suma los puntos/stats de esta partida al ranking del torneo.
4. Llama a `recalcularPromedioHistorico` para los dos jugadores.
5. Llama a `avanzarGanador(partida_id)` del módulo bracket — si la partida era de llaves, mueve al ganador al siguiente slot.

#### Marcador en tiempo real
`obtenerMarcador(id)` — retorna el estado actual completo:
```
{
  partida_id, estado, total_sets, confirmada, meta_a, meta_b,
  jugador_a, jugador_b, ganador,
  sets: [
    {
      numero, ganador_id,
      carambolas_a, carambolas_b,
      entradas_a, entradas_b,
      entrada_actual_a, entrada_actual_b
    }
  ],
  resumen: {
    carambolas_a, carambolas_b,
    entradas_a, entradas_b,
    sets_ganados_a, sets_ganados_b,
    promedio_a, promedio_b
  }
}
```

#### Planilla tabular
`obtenerPlanilla(id)` — vista tabular de 13 filas por set con los valores de cada entrada y totales acumulados.

---

### Módulo `bracket`

**Generación del bracket** (`generarBracket(fase_id, jugador_ids, tamano_manual?)`):
1. Elimina el bracket existente de la fase.
2. Determina el tamaño: si el admin eligió uno (`8 | 16 | 32 | 64`), lo usa. Si no, calcula la siguiente potencia de 2 (ej. 10 jugadores → bracket de 16).
3. Genera el **orden de siembra estándar** (algoritmo recursivo): 1 vs 16, 8 vs 9, 5 vs 12, 4 vs 13, 6 vs 11, 3 vs 14, 7 vs 10, 2 vs 15 (para un bracket de 16).
4. Crea `BracketSlot` para la ronda inicial con jugadores asignados (los que no tienen jugador quedan como "bye" con `jugador_id = null`).
5. Crea slots vacíos para todas las rondas siguientes (semis, cuartos, final).

**Avance del ganador** (`avanzarGanador(partida_id)`):
- Busca el `BracketSlot` que contiene esa partida.
- Calcula el slot destino: `ronda_siguiente = ronda_actual / 2`, `posicion_siguiente = ceil(posicion_actual / 2)`.
- Determina si va al slot A (posición impar) o B (posición par) del cruce siguiente.
- Actualiza el slot destino con el `jugador_id` del ganador.

**Estructura de respuesta del bracket:**
```
{
  fase_id,
  rondas: [
    {
      numero: 16,  // Octavos
      nombre: "Octavos de Final",
      cruces: [{ slot_a, slot_b }, ...]
    },
    { numero: 8, nombre: "Cuartos de Final", cruces: [...] },
    { numero: 4, nombre: "Semifinales", cruces: [...] },
    { numero: 2, nombre: "Final", cruces: [...] }
  ],
  campeon: Jugador | null
}
```

**Clasificados** (`obtenerClasificadosBracket(fase_id)`): extrae campeón y subcampeón desde la partida de la final.

**Rutas públicas** (sin login): `GET /bracket` de un torneo.

---

### Módulo `ranking`

**Ranking del torneo** (`obtenerRankingTorneo(torneo_id)`):
1. Lee todos los registros de `Ranking` para el torneo.
2. Aplica `factor = 1 + torneo.incremento` a los puntos.
3. Ordena: `puntos DESC → sets_ganados DESC → sets_perdidos ASC → promedio DESC → carambolas_total DESC`.
4. Persiste la posición calculada y `puntos_ranking` en la DB.
5. Retorna la tabla completa con datos del jugador.

**Ranking por club** (`obtenerRankingClub(torneo_id)`):
- Agrupa los rankings por `jugador.club_ciudad`.
- Suma puntos con factor de incremento por club.
- Calcula promedio del club.
- Retorna tabla de clubes ordenada por total de puntos.

**Recálculo completo** (`recalcularRankingCompleto(torneo_id)`):
- Elimina todos los registros de ranking del torneo.
- Recalcula desde cero leyendo todas las partidas `confirmada = true` y `estado = 'finalizada'`.
- Útil para corregir inconsistencias.

**Puntos por posición final** (`asignarPuntosPosicionFinal(torneo_id)`):
- Se llama al finalizar el torneo.
- Tabla de puntos base por posición:

| Posición | Puntos base |
|---|---|
| 1° | 90 |
| 2° | 48 |
| 3° | 30 |
| 4° | 24 |
| 5° – 8° | 12 |
| 9° – 16° | 6 |
| 17° – 27° | 4 |
| Resto (grupos) | 2 |

Los puntos base se multiplican por `(1 + torneo.incremento)` para obtener `puntos_ranking`.

**Estadísticas de jugador** (`obtenerEstadisticasJugador(jugador_id, torneo_id?)`):
- Con `torneo_id`: estadísticas del jugador en ese torneo específico.
- Sin `torneo_id`: estadísticas globales del jugador en todos los torneos.

**Rutas públicas** (sin login): `GET /ranking` de un torneo.

---

## 6. Frontend — Páginas y navegación

### Layouts

| Layout | Usado en | Descripción |
|---|---|---|
| `Layout` | Mayoría de páginas | Header con nav, logo "TRIBANDA", logout, footer |
| `JuezLayout` | Panel del juez | Layout simplificado para uso en tablet/celular |
| Sin layout | `/login`, `/publico` | Páginas completamente públicas |

### Rutas y páginas

#### Públicas (sin autenticación)
| Ruta | Página | Descripción |
|---|---|---|
| `/login` | `LoginPage` | Formulario de login con React Hook Form + Zod |
| `/publico` | `PublicHomePage` | Página pública de inicio |
| `/publico/torneos/:id` | `PublicTorneoPage` | Vista pública de un torneo |
| `/publico/jugador/:id` | `JugadorDetallePage` | Perfil público de jugador |

#### Con Layout (no requieren login)
| Ruta | Página | Descripción |
|---|---|---|
| `/torneos` | `TorneosPage` | Lista de todos los torneos |
| `/torneos/:id` | `DetalleTorneoPage` | Detalle del torneo con fases |
| `/torneos/:id/grupos` | `TorneoGruposRedirectPage` | Redirige a la fase de grupos activa |
| `/torneos/:id/ranking` | `RankingPage` | Tabla de ranking del torneo |
| `/torneos/:id/bracket` | `BracketPage` | Visualización del bracket (auto-refresco 15s) |
| `/dashboard` | `DashboardPage` | Panel general de resumen |
| `/partidas/:id/marcador` | `MarcadorPage` | Marcador en tiempo real de una partida |
| `/torneos/:torneoId/partidas` | `PartidasPage` | Lista de partidas del torneo |
| `/torneos/:torneoId/fases/:faseId/grupos` | `GruposPage` | Vista de grupos de una fase |
| `/torneos/:torneoId/fases/:faseId/grupos/:id` | `DetalleGrupoPage` | Tabla de posiciones de un grupo |

#### Protegidas — Solo admin
| Ruta | Página | Descripción |
|---|---|---|
| `/torneos/nuevo` | `NuevoTorneoPage` | Formulario de creación de torneo |
| `/torneos/:id/editar` | `EditarTorneoPage` | Editar torneo existente |
| `/torneos/:id/fases/nueva` | `NuevaFasePage` | Agregar una fase al torneo |
| `/torneos/:torneoId/fases/:faseId/grupos/:id/asignar` | `AsignarJugadoresPage` | Asignar jugadores a un grupo |
| `/torneos/:torneoId/partidas/nueva` | `NuevaPartidaPage` | Crear nueva partida |
| `/jugadores/nuevo` | `NuevoJugadorPage` | Registrar nuevo jugador |
| `/jugadores/:id/editar` | `EditarJugadorPage` | Editar jugador existente |

#### Protegidas — Autenticado (cualquier rol)
| Ruta | Página | Descripción |
|---|---|---|
| `/jugadores` | `JugadoresPage` | Lista de jugadores |
| `/jugadores/:id` | `JugadorDetallePage` | Perfil completo del jugador |
| `/partidas/:id/planilla` | `PlanillaPage` | Planilla digital de registro entrada por entrada |

#### Panel del Juez — Solo juez o admin
| Ruta | Página | Descripción |
|---|---|---|
| `/juez` | `JuezPanelPage` | Panel del juez (auto-refresco 10s) |
| `/juez/marcador/:id` | `MarcadorPage` | Marcador desde el panel del juez |
| `/juez/planilla/:id` | `PlanillaPage` | Planilla desde el panel del juez |

### Comportamiento del JuezPanel
- Carga todos los torneos activos.
- Filtra partidas asignadas al juez logueado (o sin juez asignado).
- Organiza partidas por prioridad: `en_curso → por confirmar → pendientes → confirmadas`.
- Se auto-refresca cada **10 segundos**.
- Al entrar a una partida: si es marcador digital va a `/marcador/:id`, si es planilla va a `/planilla/:id`.

### Comportamiento del BracketPage
- Identifica automáticamente la fase de grupos y la fase de llaves del torneo.
- Muestra los clasificados de grupos.
- Permite al admin generar el bracket con tamaño manual (`8 | 16 | 32 | 64`) o automático.
- Renderiza rondas horizontalmente con cruces y nombres.
- Se auto-refresca cada **15 segundos**.
- Muestra el campeón cuando la final está resuelta.

### Autenticación en el frontend
- Al hacer login exitoso, redirige según rol:
  - `juez` → `/juez`
  - `admin` → `/dashboard`
  - otros → `/publico`
- `ProtectedRoute` verifica el token en el store de Zustand. Si no hay token, redirige a `/login`.
- El interceptor de Axios en `services/api.ts` adjunta `Authorization: Bearer <token>` en cada request.
- Si el servidor responde `401`, limpia el token y redirige a `/login` (excepto si ya está en `/login` o `/publico`).

---

## 7. Autenticación y roles

### Estrategia JWT
- Stateless: el servidor no guarda sesiones.
- Token en header `Authorization: Bearer <token>`.
- Payload: `{ id, email, rol }`.
- Expiración: configurable via `JWT_EXPIRES_IN` (típicamente 24h).
- Contraseñas: bcrypt con salt rounds 12.

### Roles y permisos

| Rol | Puede hacer |
|---|---|
| `admin` | Acceso total a toda la aplicación |
| `juez` | Solo registrar y confirmar partidas asignadas a él. Panel `/juez`. |
| `jugador` | Solo lectura de su propio perfil y resultados |
| `espectador` | Solo vistas públicas (sin login requerido) |

### Rutas públicas (sin login)
- `GET /api/v1/torneos` — lista de torneos
- `GET /api/v1/torneos/:id` — detalle de torneo
- `GET /api/v1/torneos/:id/ranking` — ranking público
- `GET /api/v1/torneos/:id/bracket` — bracket público
- `GET /api/v1/torneos/:id/grupos` — grupos públicos
- `GET /api/v1/health` — healthcheck

---

## 8. Flujo completo de un torneo

```
1. ADMIN: Crear torneo
   └── Nombre, sede, fechas, incremento de ranking, meta_base

2. ADMIN: Agregar fases al torneo
   ├── Fase 1: tipo "grupos", orden 1
   └── Fase 2: tipo "llaves", orden 2

3. ADMIN: Registrar jugadores
   └── Nombre, apellido, club, categoría, etc.

4. ADMIN: Inscribir jugadores al torneo
   └── Asignar nivel y meta_puntos (handicap) por jugador

5. ADMIN: Cambiar estado del torneo a "activo"

6. ADMIN: Crear grupos en la Fase 1
   └── Ej: Grupo A, Grupo B, Grupo C...

7. ADMIN: Asignar jugadores a grupos
   ├── Manual: seleccionar 3-4 jugadores por grupo
   └── Sorteo: Fisher-Yates + distribución round-robin automática

8. ADMIN: Crear partidas de la fase de grupos
   └── Asignar juez (opcional), fecha, hora, sets, metas de handicap

9. JUEZ/ADMIN: Iniciar partida
   └── Estado cambia a "en_curso", se crean los Sets vacíos

10. JUEZ/ADMIN: Registrar resultados (en tiempo real)
    ├── Modo Planilla: entrada por entrada (1 a 13 por jugador por set)
    └── Modo Marcador: sumar/restar carambolas con botones +/-
    └── El sistema calcula automáticamente el ganador del set y de la partida

11. JUEZ/ADMIN: Confirmar partida
    └── Actualiza ranking del torneo
    └── Actualiza promedio histórico del jugador
    └── Si es partida de bracket, avanza al ganador en el bracket

12. [Se repite 8-11 para todas las partidas de grupos]

13. ADMIN: Ver tabla de posiciones de cada grupo
    └── Visualizar clasificados (primero de cada grupo)

14. ADMIN: Generar bracket (Fase 2 — Llaves)
    └── Toma los clasificados de grupos
    └── Genera siembra estándar (1 vs último, 2 vs penúltimo...)
    └── Tamaño: automático (siguiente potencia de 2) o manual (8/16/32/64)

15. ADMIN: Crear partidas del bracket
    └── Las partidas de cada cruce del bracket

16. [Se repite 9-11 para partidas del bracket]
    └── Al confirmar, el ganador avanza automáticamente al siguiente slot

17. ADMIN: Finalizar torneo
    └── Cambiar estado a "finalizado"
    └── Asignar puntos de ranking por posición final (tabla fija + factor incremento)

18. Todos: Ver ranking final del torneo
    └── Tabla de jugadores, tabla de clubes
    └── Vista pública disponible sin login
```

---

## 9. API — Endpoints registrados

Todos bajo `/api/v1/`.

```
Auth
  POST   /auth/login                       # Público
  POST   /auth/usuarios                    # Admin
  GET    /auth/usuarios                    # Admin
  PATCH  /auth/usuarios/:id                # Admin
  PATCH  /auth/usuarios/:id/password       # Autenticado

Jugadores
  GET    /jugadores                        # Autenticado
  POST   /jugadores                        # Admin
  GET    /jugadores/:id                    # Autenticado
  PATCH  /jugadores/:id                    # Admin
  GET    /jugadores/:id/estadisticas       # Autenticado
  GET    /clubes                           # Autenticado
  POST   /clubes                           # Admin

Torneos
  GET    /torneos                          # Público
  POST   /torneos                          # Admin
  GET    /torneos/:id                      # Público
  PATCH  /torneos/:id                      # Admin
  PATCH  /torneos/:id/estado               # Admin
  POST   /torneos/:id/fases                # Admin
  GET    /torneos/:id/fases                # Público

Inscripciones
  POST   /inscripciones                    # Admin
  GET    /inscripciones/torneo/:torneo_id  # Autenticado
  PATCH  /inscripciones/:id                # Admin
  DELETE /inscripciones/:id                # Admin

Grupos
  POST   /grupos                           # Admin
  GET    /grupos/fase/:fase_id             # Público
  GET    /grupos/:id                       # Público
  POST   /grupos/:id/jugadores             # Admin
  POST   /grupos/sorteo                    # Admin
  GET    /grupos/:id/tabla                 # Público
  GET    /grupos/fase/:fase_id/clasificados # Público

Partidas
  GET    /partidas/torneo/:torneo_id       # Autenticado
  POST   /partidas                         # Admin
  GET    /partidas/:id                     # Autenticado
  POST   /partidas/:id/iniciar             # Juez/Admin
  POST   /partidas/:id/entrada             # Juez/Admin
  POST   /partidas/:id/marcador            # Juez/Admin
  POST   /partidas/:id/turno               # Juez/Admin
  POST   /partidas/:id/set/:num/finalizar  # Juez/Admin
  POST   /partidas/:id/confirmar           # Juez/Admin
  GET    /partidas/:id/marcador            # Autenticado
  GET    /partidas/:id/planilla            # Autenticado

Ranking
  GET    /ranking/torneo/:torneo_id                  # Público
  GET    /ranking/torneo/:torneo_id/club             # Público
  POST   /ranking/torneo/:torneo_id/recalcular       # Admin
  POST   /ranking/torneo/:torneo_id/puntos-finales   # Admin
  GET    /ranking/jugador/:jugador_id                # Autenticado

Bracket
  GET    /bracket/fase/:fase_id                      # Público
  POST   /bracket/fase/:fase_id/generar              # Admin
  GET    /bracket/fase/:fase_id/clasificados         # Admin

Admin
  DELETE /admin/reset                      # Admin (requiere body "ELIMINAR_TODO")

Health
  GET    /health                           # Público
```

---

## 10. Seguridad

| Capa | Mecanismo | Configuración |
|---|---|---|
| Headers HTTP | `helmet()` | `crossOriginResourcePolicy: cross-origin` |
| CORS | `cors()` | Solo origen configurado en `CORS_ORIGIN`, métodos explícitos |
| Rate limiting global | `express-rate-limit` | 200 req/min por IP |
| Rate limiting login | `express-rate-limit` | 5 req/min por IP en `/auth/login` |
| Body size | `express.json` | Límite 1MB |
| Autenticación | JWT + `authGuard` | Verifica firma y expiración |
| Autorización | `roleGuard(roles[])` | Verifica rol del usuario |
| Contraseñas | `bcryptjs` | Salt rounds 12 |
| Reset de BD | Endpoint protegido | Admin + body `"ELIMINAR_TODO"` + audit log |

---

## 11. Scripts y utilidades

### `scripts/e2e-torneo-completo.ps1`
Script PowerShell de prueba end-to-end completa via HTTP. Ejecuta el flujo completo del sistema:
1. Login como admin.
2. Crear 10 jugadores (con sufijos de timestamp para evitar colisiones).
3. Crear torneo con incremento 0.3.
4. Crear fases de grupos y llaves.
5. Asignar jugadores a grupos.
6. Crear y registrar partidas.
7. Confirmar resultados.
8. Generar bracket.
9. Consultar ranking final.

### `backend/scripts/`
| Script | Propósito |
|---|---|
| `simulacion.ts` | Simulación general de un torneo |
| `sim-56-grupos.ts` | Simula un torneo con 56 jugadores en grupos |
| `agregar-bracket-168.ts` | Genera un bracket de 168 jugadores (caso extremo) |
| `prueba-frontend.ts` | Prueba de integración con el frontend |

### `backend/prisma/seed.ts`
Crea el usuario administrador inicial para arrancar el sistema.

---

*Documentación generada el 7 de octubre de 2026*
