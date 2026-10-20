# AGENT.md — TriBanda: Gestiona · Juega · Compite

## Descripción del Proyecto
TriBanda es un aplicativo web para gestionar torneos de billar a 3 bandas desde cero.
Permite crear torneos, registrar jugadores, organizar fases, registrar partidas en tiempo real y calcular rankings automáticamente.
No incluye datos precargados — todo se crea desde la interfaz.

---

## Stack Tecnológico

### Backend
- Runtime: Node.js
- Lenguaje: TypeScript
- Framework: Express
- ORM: Prisma
- Base de datos: PostgreSQL
- Autenticación: JWT (jsonwebtoken) + bcrypt
- Validación: Zod

### Frontend
- Framework: React + TypeScript
- Build tool: Vite
- Estilos: TailwindCSS
- Estado global: Zustand
- Peticiones HTTP: React Query (TanStack Query)
- Routing: React Router v6
- Formularios: React Hook Form + Zod

---

## Estructura de Carpetas

```
billar-app/
├── backend/
│   ├── src/
│   │   ├── config/           # Variables de entorno, configuración DB y JWT
│   │   ├── middlewares/      # authGuard, roleGuard, errorHandler
│   │   ├── utils/            # Funciones de cálculo (promedio, ranking, puntos)
│   │   └── modules/
│   │       ├── auth/         # Login, JWT, usuarios
│   │       ├── jugadores/    # CRUD jugadores y clubes
│   │       ├── torneos/      # CRUD torneos, estados, fases
│   │       ├── grupos/       # Fase de grupos, sorteo, tabla posiciones
│   │       ├── partidas/     # Planilla digital, sets, entradas
│   │       ├── bracket/      # Llaves, eliminación directa
│   │       └── ranking/      # Cálculo y consulta de rankings
│   ├── prisma/
│   │   └── schema.prisma     # Esquema de base de datos
│   ├── .env
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── assets/           # Imágenes, íconos
│   │   ├── components/       # Componentes UI reutilizables
│   │   ├── hooks/            # Custom hooks
│   │   ├── services/         # Llamadas a la API REST
│   │   ├── store/            # Estado global con Zustand
│   │   ├── types/            # Tipos TypeScript compartidos
│   │   └── pages/
│   │       ├── auth/         # Login, perfil
│   │       ├── dashboard/    # Panel principal
│   │       ├── jugadores/    # Lista, crear, editar, perfil
│   │       ├── torneos/      # Lista, crear, editar, detalle
│   │       ├── grupos/       # Vista de grupos, tabla posiciones
│   │       ├── partidas/     # Planilla en tiempo real, historial
│   │       ├── bracket/      # Vista visual del bracket
│   │       └── ranking/      # Tabla de ranking, estadísticas
│   ├── index.html
│   └── package.json
│
├── docs/                     # Documentación del dominio
├── modulos_estudiante/       # Especificaciones de módulos
└── AGENT.md                  # Este archivo
```

---

## Módulos del Sistema

| Módulo      | Responsabilidad principal                                    |
|-------------|--------------------------------------------------------------|
| auth        | Login, JWT, gestión de usuarios y roles                      |
| jugadores   | CRUD de jugadores y clubes                                   |
| torneos     | Crear y administrar torneos, gestionar estados y fases       |
| grupos      | Organizar fase de grupos, sorteo, tabla de posiciones        |
| partidas    | Planilla digital de registro entrada por entrada             |
| bracket     | Generar y visualizar llaves de eliminación directa           |
| ranking     | Calcular y mostrar rankings con desempate y puntos           |

---

## Entidades Principales (Prisma Schema)

```
Usuario → Jugador (1:1 opcional)
Club → Jugador (1:N)
Torneo → Fase (1:N)
Fase → Grupo (1:N)
Grupo ↔ Jugador (N:M via GrupoJugador)
Fase → Partida (1:N)
Partida → Set (1:3)
Set → EntradaSet (1:N, máx 13 por jugador)
Torneo → Ranking (1:N por jugador)
Fase → BracketSlot (1:N para llaves)
```

---

## Flujo General entre Módulos

```
[Auth] ──────────────────────────────────────────────────────────────────┐
   ↓ JWT + rol                                                            │
[Torneos] → crear torneo → configurar fases → cambiar estado a "activo"  │
   ↓                                                                      │
[Jugadores] → registrar jugadores → asignar a torneo                     │
   ↓                                                                      │
[Grupos] → crear grupos → asignar jugadores (manual o sorteo)            │
   ↓                                                                      │
[Partidas] → registrar entradas en tiempo real → confirmar resultado     │
   ↓                                                                      │
[Ranking] → recalcular automáticamente al confirmar cada resultado       │
   ↓                                                                      │
[Bracket] → generar automáticamente desde clasificados                   │
   ↓                                                                      │
[Partidas] → registrar resultados de llaves                              │
   ↓                                                                      │
[Ranking] → consolidar ranking final → torneo pasa a "finalizado"        │
```

---

## Autenticación y Roles

### Estrategia
- JWT stateless en header `Authorization: Bearer <token>`
- Token contiene: `{ id, email, rol }`
- Expiración: 24 horas
- Contraseñas: bcrypt con salt rounds 12

### Middlewares
- `authGuard`: verifica que el token sea válido
- `roleGuard(roles[])`: verifica que el rol del usuario esté en la lista permitida

### Rutas públicas (sin login)
- GET /torneos — lista de torneos
- GET /torneos/:id/ranking — ranking público
- GET /torneos/:id/bracket — bracket público
- GET /torneos/:id/grupos — grupos públicos

### Roles
| Rol        | Nivel de acceso                                    |
|------------|----------------------------------------------------|
| admin      | Acceso total                                       |
| juez       | Solo registrar y confirmar partidas asignadas      |
| jugador    | Solo lectura de su propio perfil y resultados      |
| espectador | Solo lectura pública (sin login requerido)         |

---

## Orden de Implementación por Fases

### Fase 1 — Fundación (semana 1)
1. Setup del proyecto (backend + frontend + DB)
2. Módulo auth: login, JWT, usuarios, roles
3. Módulo jugadores: CRUD básico
4. Módulo torneos: CRUD básico + estados

### Fase 2 — Competencia (semana 2)
5. Módulo grupos: crear grupos, asignar jugadores, sorteo
6. Módulo partidas: planilla digital, registro de entradas, cálculo automático

### Fase 3 — Avance (semana 3)
7. Módulo bracket: generación automática, visualización
8. Módulo ranking: cálculo automático, desempate, puntos con incremento

### Fase 4 — Pulido (semana 4)
9. Dashboard general con resumen del torneo
10. Vista pública (espectador) sin login
11. Exportación de ranking (Excel/PDF)
12. Responsive mobile

---

## Convenciones de Código

- Nombres de archivos: kebab-case (`jugador.controller.ts`)
- Nombres de funciones y variables: camelCase
- Nombres de clases y tipos: PascalCase
- Rutas API: `/api/v1/{modulo}/{accion}`
- Cada módulo tiene: `router`, `controller`, `service`, `schema` (Zod)
- Los cálculos de negocio van en `utils/` o en el `service`, nunca en el `controller`
