# Módulo 02: Gestión de Torneos

## Descripción
Permite crear y administrar torneos desde cero.
Cada torneo es independiente y tiene su propia configuración de fases, grupos y ranking.

---

## Campos del Formulario de Creación
| Campo        | Tipo   | Requerido | Descripción                                              |
|--------------|--------|-----------|----------------------------------------------------------|
| nombre       | string | sí        | Nombre del torneo                                        |
| descripcion  | string | no        | Subtítulo o descripción adicional                        |
| fecha_inicio | date   | sí        | Fecha en que inicia el torneo                            |
| fecha_fin    | date   | sí        | Fecha en que finaliza el torneo                          |
| sede         | string | sí        | Ciudad o lugar donde se realiza                          |
| incremento   | float  | sí        | Porcentaje de incremento de puntos (0, 0.30, 0.50, etc.) |

---

## Estados del Torneo
| Estado      | Qué permite                                              |
|-------------|----------------------------------------------------------|
| borrador    | Editar toda la configuración, fases, grupos y jugadores  |
| activo      | Solo registrar resultados, no editar estructura          |
| finalizado  | Solo lectura y exportación, todo bloqueado               |

---

## Reglas del Módulo
- Solo el admin puede crear y editar torneos
- Un torneo en estado "activo" no puede cambiar su estructura de fases
- Un torneo en estado "finalizado" consolida el ranking definitivo
- La fecha_fin debe ser posterior a la fecha_inicio

---

## Pantallas del Módulo
1. Lista de torneos (con estado y fechas)
2. Formulario de creación de torneo
3. Formulario de edición de torneo (solo en estado borrador)
4. Vista general del torneo (resumen de fases, jugadores, resultados)
5. Panel de cambio de estado

---

## Acciones Disponibles
| Acción              | Rol mínimo requerido |
|---------------------|----------------------|
| Ver lista torneos   | Espectador           |
| Crear torneo        | Admin                |
| Editar torneo       | Admin                |
| Cambiar estado      | Admin                |
| Ver resumen torneo  | Espectador           |
| Exportar resultados | Admin                |
