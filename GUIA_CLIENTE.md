# 🎱 SISTEMA TRIBANDA — DOCUMENTO MAESTRO TÉCNICO Y OPERATIVO
### Manual Integral de Arquitectura, Comportamiento del Software y Guía Paso a Paso para Validación del Cliente

---

> **🌐 ENLACE DE ACCESO EN LÍNEA (EN VIVO):**  
> 👉 **[https://create-highly-pilot-intense.trycloudflare.com](https://create-highly-pilot-intense.trycloudflare.com)**  
>
> **📺 MODO PANTALLA GIGANTE / PROYECTOR DEL CLUB (PÚBLICO EN VIVO):**  
> 👉 **[https://create-highly-pilot-intense.trycloudflare.com/publico](https://create-highly-pilot-intense.trycloudflare.com/publico)**  
>
> *Compatible de forma nativa con cualquier navegador moderno en computadores, tablets, teléfonos móviles y Smart TVs. No requiere instalación de software adicional.*

---

## 📑 ÍNDICE GENERAL DEL DOCUMENTO

1. **[Ficha Técnica del Proyecto y Propósito del Software](#1-ficha-técnica-del-proyecto-y-propósito-del-software)**
2. **[Arquitectura Tecnológica y Stack de Desarrollo](#2-arquitectura-tecnológica-y-stack-de-desarrollo)**
3. **[Matriz de Seguridad y Perfiles de Usuario (3 Roles)](#3-matriz-de-seguridad-y-perfiles-de-usuario-3-roles)**
4. **[Reglamentación Oficial UMB / Fecolbi y Algoritmos del Sistema](#4-reglamentación-oficial-umb--fecolbi-y-algoritmos-del-sistema)**
5. **[Guía Paso a Paso: Ciclo Completo del Torneo (10 Etapas)](#5-guía-paso-a-paso-ciclo-completo-del-torneo-10-etapas)**
6. **[Infraestructura de Servidores y Despliegue en la Nube](#6-infraestructura-de-servidores-y-despliegue-en-la-nube)**
7. **[Preguntas Frecuentes y Respuestas Operativas](#7-preguntas-frecuentes-y-respuestas-operativas)**

---

## 1. FICHA TÉCNICA DEL PROYECTO Y PROPÓSITO DEL SOFTWARE

### ¿Qué es TriBanda?
**TriBanda** es una solución web integral diseñada para profesionalizar, auditar y modernizar la gestión de torneos de billar a tres bandas. Reemplaza por completo el uso tradicional de planillas físicas en papel y complejas hojas de cálculo de Excel propensas a errores de digitación.

```
          ┌─────────────────────────────────────────────────────────────┐
          │             GESTIÓN TRADICIONAL VS TRIBANDA                 │
          ├──────────────────────────────┬──────────────────────────────┤
          │     MÉTODO TRADICIONAL       │       SISTEMA TRIBANDA       │
          ├──────────────────────────────┼──────────────────────────────┤
          │ Planillas de papel en mesas  │ Marcador digital táctil      │
          │ Fórmulas manuales en Excel   │ Cálculo instantáneo milésima │
          │ Desempates discutidos        │ Cascada de 6 reglas UMB      │
          │ Espera para armar llaves     │ Llaves y ajuste automáticos  │
          │ Resultados sin auditoría     │ Bloqueo seguro con candado 🔒│
          │ Público desinformado         │ TV en vivo y móvil para club │
          └──────────────────────────────┴──────────────────────────────┘
```

### Problemas que resuelve de raíz
1. **Eliminación del error humano en promedios:** El sistema calcula a nivel de milésimas tanto el Promedio General ($\text{Carambolas} / \text{Entradas}$) como el Promedio Particular y las tacadas máximas al instante de registrarse cada carambola.
2. **Cero disputas en clasificaciones:** Aplica matemáticamente la estricta cascada de desempate de la Unión Mundial de Billar (UMB) y la Federación Colombiana de Billar (Fecolbi).
3. **Integridad deportiva blindada:** Al finalizar una partida, el sistema la bloquea con un candado digital 🔒. Ningún juez ni operador puede alterar un resultado ya firmado a menos que emita una solicitud justificada que debe ser aprobada por el Superadministrador.
4. **Experiencia en el club en tiempo real:** Los asistentes ven los marcadores, clasificaciones y cruces proyectados en televisores del club sin demoras ni recargar la página.

---

## 2. ARQUITECTURA TECNOLÓGICA Y STACK DE DESARROLLO

El sistema está construido siguiendo las mejores prácticas de la ingeniería de software actual: separación estricta de responsabilidades, tipado estricto, seguridad perimetral y alta disponibilidad.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CAPA DE PRESENTACIÓN (FRONTEND)                 │
│                                                                        │
│   • React 18 + TypeScript + Vite                                       │
│   • TanStack Query v5 (React Query) para sincronización en tiempo real │
│   • Interfaz de alto contraste (Dark Theme) optimizada para TV/Club    │
│   • Botones táctiles de gran tamaño para jueces en celular o tablet    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Peticiones HTTPS / REST JSON
┌───────────────────────────────────▼────────────────────────────────────┐
│                        CAPA DE NEGOCIO (BACKEND API)                   │
│                                                                        │
│   • Node.js & Express con TypeScript                                   │
│   • Arquitectura modular por capas: Router → Controller → Service      │
│   • Validación estricta con esquemas Zod en todas las entradas         │
│   • Seguridad perimetral: Helmet, CORS estricto, Rate Limiting         │
│   • Autenticación basada en Tokens JWT con control de roles (RBAC)     │
│   • Motor de reglas UMB, Ronda de Ajuste y Puntos de Medellín          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Prisma ORM (Consultas tipadas)
┌───────────────────────────────────▼────────────────────────────────────┐
│                    CAPA DE PERSISTENCIA (BASE DE DATOS)                │
│                                                                        │
│   • PostgreSQL (Base de datos relacional transaccional ACID)           │
│   • Integridad referencial: Partidas, Sets, Entradas, Ranking, Auditor │
│   • Transacciones atómicas: ninguna entrada queda a medio guardar      │
└────────────────────────────────────────────────────────────────────────┘
```

### Componentes Clave del Stack:
* **Frontend:** Desarrollado como una Single Page Application (SPA) ultrarrápida. La navegación entre pantallas no recarga el navegador; las vistas se actualizan automáticamente cada 2 segundos mediante consultas reactivas cuando hay partidas en curso.
* **Backend:** Diseñado para soportar alta concurrencia durante torneos masivos. Cada acción crítica (iniciar partida, sumar carambola, solicitar corrección, calcular llaves) se procesa en servicios desacoplados con validación de tipos estricta.
* **Base de Datos Relacional:** El uso de PostgreSQL garantiza que si la conexión a internet en el club titubea, la base de datos mantiene consistencia absoluta sin duplicación ni pérdida de carambolas.

---

## 3. MATRIZ DE SEGURIDAD Y PERFILES DE USUARIO (3 ROLES)

El sistema opera con tres perfiles perfectamente diferenciados según la responsabilidad en el torneo:

| Perfil | Credencial de Acceso | Contraseña | Alcance y Facultades en el Sistema |
| :--- | :--- | :--- | :--- |
| **👑 Superadmin** | `superadmin@tribanda.com` | `admin1234` | **Control total del evento:** Registro de deportistas, creación de torneos, factor de incremento de puntos, sorteo automático de grupos, generación de llaves con ronda de ajuste, panel de auditoría exclusivo para aprobar reaperturas de partidas bloqueadas y cierre oficial del ranking. |
| **⚖️ Juez de Mesa** | `juez1@tribanda.com` | `admin1234` | **Operación en mesa:** Visualiza las partidas asignadas a su mesa, anota carambolas y entradas mediante el marcador digital táctil (+/-) o la planilla tradicional, finaliza con bloqueo de seguridad 🔒 y emite solicitudes formales de corrección con justificación escrita. |
| **📺 Público / TV** | *(Acceso Libre)* | *(Sin clave)* | **Transmisión en vivo:** Modo pantalla completa para televisores del club, marcadores en tiempo real, tabla general de posiciones ordenada con los 6 criterios UMB y cuadro interactivo de llaves. |

```
                              ┌─────────────────────────────┐
                              │     👑 SUPERADMIN           │
                              │ (superadmin@tribanda.com)   │
                              └──────────────┬──────────────┘
                                             │
                   ┌─────────────────────────┴─────────────────────────┐
                   ▼                                                   ▼
     ┌─────────────────────────────┐                     ┌─────────────────────────────┐
     │      ⚖️ JUEZ DE MESA        │                     │   📺 PÚBLICO / ESPECTADOR   │
     │   (juez1@tribanda.com)      │                     │       (Acceso Libre)        │
     ├─────────────────────────────┤                     ├─────────────────────────────┤
     │ • Marcador táctil (+ / -)   │                     │ • Marcadores en vivo        │
     │ • Planilla entrada x entrada│                     │ • Tabla L. General UMB      │
     │ • Bloqueo de seguridad 🔒   │                     │ • Cuadro de Llaves y Ajuste │
     │ • Solicitar Corrección      │                     │ • Modo TV para proyectores  │
     └─────────────────────────────┘                     └─────────────────────────────┘
```

---

## 4. REGLAMENTACIÓN OFICIAL UMB / FECOLBI Y ALGORITMOS DEL SISTEMA

TriBanda incorpora de forma nativa la reglamentación internacional de la **Unión Mundial de Billar (UMB)**, la **Federación Colombiana de Billar (Fecolbi)** y la matriz de cálculo del Clasificatorio Oficial de Medellín.

### A. Motor de Desempate Oficial UMB (6 Criterios en Cascada)
Al clasificar jugadores dentro de sus grupos o conformar la tabla general de siembra, el sistema resuelve los empates aplicando automáticamente la jerarquía oficial:

$$\begin{aligned}
\mathbf{1^\circ} & \quad \text{\textbf{Puntos de Partida (PTS):} 2 puntos por victoria, 1 por empate, 0 por derrota.} \\
\mathbf{2^\circ} & \quad \text{\textbf{Promedio General (PROM G):} } \frac{\text{Carambolas Totales}}{\text{Entradas Totales}} \text{ (mayor rendimiento acumulado).} \\
\mathbf{3^\circ} & \quad \text{\textbf{Promedio Particular (PROM P):} Mejor promedio obtenido en una sola partida.} \\
\mathbf{4^\circ} & \quad \text{\textbf{Mayor Serie (M. SERIE):} Tacada más alta realizada por el jugador en el torneo.} \\
\mathbf{5^\circ} & \quad \text{\textbf{Carambolas Totales (CAR):} Mayor cantidad de carambolas acumuladas a favor.} \\
\mathbf{6^\circ} & \quad \text{\textbf{Menor Número de Entradas (ENT):} Eficiencia en turnos disputados.}
\end{aligned}$$

### B. Regla Proporcional de Clasificación por Grupo
El sistema clasifica exactamente a la mitad de los integrantes de cada grupo:
* Grupos de **4 jugadores** $\longrightarrow$ Clasifican **2 jugadores** a la siguiente fase.
* Grupos de **6 jugadores** $\longrightarrow$ Clasifican **3 jugadores** a la siguiente fase.
* Grupos de **3 jugadores** $\longrightarrow$ Clasifican **2 jugadores** a la siguiente fase.

### C. Algoritmo de Ronda de Ajuste (Play-in Automático)
En los torneos donde el total de clasificados ($N$) no es una potencia exacta de dos ($4, 8, 16, 32$):
1. **Potencia inferior más cercana ($P$):**  
   $$P = 2^{\lfloor \log_2(N) \rfloor}$$  
   *(Ejemplo: Con $N = 6$ clasificados, la potencia objetivo es $P = 4$, correspondiente a semifinales).*
2. **Cálculo de eliminados necesarios ($E$):**  
   $$E = N - P \quad (6 - 4 = 2 \text{ eliminados obligatorios}).$$
3. **Distribución del cuadro:**
   * **Clasificados directos que descansan:** Los mejores $2P - N$ clasificados de la tabla general (en este ejemplo: $2(4) - 6 = 2$ jugadores pasan directo a semifinales por mérito deportivo).
   * **Disputan Ronda de Ajuste:** Los $2E$ clasificados con menor promedio/siembra (en este ejemplo: las siembras 3, 4, 5 y 6 juegan 2 partidos de ajuste).
4. **Promoción automática:** Al ganar su partido de ajuste, el sistema promueve automáticamente al deportista al cuadro principal de $P$ jugadores.

### D. Matriz Oficial de Puntuación de Medellín (Fórmula Excel)
Al finalizar el certamen, el sistema asigna la puntuación oficial del ranking de la ciudad:

| Posición Final en el Evento | Puntos Base del Clasificatorio | Con Incremento $+30\%$ (`0.30`) | Con Incremento $+50\%$ (`0.50`) |
| :--- | :---: | :---: | :---: |
| 🥇 **1° Campeón** | **90** | 117.0 | 135.0 |
| 🥈 **2° Subcampeón** | **48** | 62.4 | 72.0 |
| 🥉 **3° Tercer Lugar** | **30** | 39.0 | 45.0 |
| **4° Cuarto Lugar** | **24** | 31.2 | 36.0 |
| **5° al 8° Lugar (Cuartos de final)** | **12** | 15.6 | 18.0 |
| **9° al 16° Lugar (Octavos de final)** | **6** | 7.8 | 9.0 |
| **17° y 18° Lugar** | **4** | 5.2 | 6.0 |
| **19° al 27° Lugar** | **3** | 3.9 | 4.5 |
| **28° Lugar en adelante** | **2** | 2.6 | 3.0 |

---

## 5. GUÍA PASO A PASO: CICLO COMPLETO DEL TORNEO (10 ETAPAS)

Esta ruta guía al cliente en una validación integral, cubriendo desde el registro del primer jugador hasta la entrega de puntos del ranking:

```
[1. Jugadores] ──► [2. Torneo] ──► [3. Fases] ──► [4. Sorteo] ──► [5. Partidas]
      │
      ▼
[6. Juez Mesa] ──► [7. Bloqueo 🔒] ──► [8. Auditoría] ──► [9. Ajuste/TV] ──► [10. Ranking]
```

---

### ETAPA 1: Registro de Nuevos Jugadores
*(Responsable: Superadmin o Juez)*

1. Abra en su navegador: **[https://create-highly-pilot-intense.trycloudflare.com](https://create-highly-pilot-intense.trycloudflare.com)**
2. Inicie sesión con la cuenta de **Superadmin** (`superadmin@tribanda.com` / `admin1234`).
3. En la barra de navegación superior, haga clic en la opción **"Jugadores"**.
4. Presione el botón verde **"+ Registrar Jugador"**.
5. Complete la ficha del deportista:
   * **Nombre:** *Ej: Daniel*
   * **Apellido:** *Ej: Sánchez*
   * **Alias / Apodo:** *Ej: El Bombardero*
   * **Cédula:** *Ej: 71234567*
   * **Celular:** *Ej: 3019876543*
   * **Ciudad:** *Ej: Medellín*
   * **Club o Ciudad que representa:** *Ej: Club Central*
   * **Categoría / Handicap:** *Ej: Primera Categoría*
6. Presione **"Registrar jugador"**.
7. **Comportamiento esperado:** El sistema redirige al listado general de jugadores donde el nuevo participante figura inmediatamente activo con su fotografía y club.

---

### ETAPA 2: Creación de un Nuevo Torneo
*(Responsable: Superadmin)*

1. En el menú superior, haga clic en **"Torneos"**.
2. Presione el botón azul **"+ Nuevo Torneo"**.
3. Ingrese los parámetros de la competencia:
   * **Nombre del Torneo:** *Ej: III Clasificatorio Medellín 2026*
   * **Descripción:** *Ej: Clasificatorio Departamental Feria de las Flores*
   * **Fecha de Inicio:** Seleccione la fecha de inicio del certamen.
   * **Fecha de Fin:** Seleccione la fecha de clausura.
   * **Sede:** *Ej: Billares El Diamante, Medellín*
   * **Incremento de puntos (%):** Ingrese `0.30` (para aplicar $+30\%$ de bonificación) o `0.50` (para $+50\%$).
4. Presione **"Crear torneo"**.
5. **Comportamiento esperado:** El torneo se crea con estado inicial **BORRADOR** y se muestra su cabecera general con el resumen de sede, fechas e incremento.

---

### ETAPA 3: Configuración y Activación de Fases
*(Responsable: Superadmin)*

Un torneo profesional se estructura en dos fases: Fase de Grupos (clasificatoria) y Fase de Llaves (eliminación directa).

1. En la ficha del torneo creado, ubique la tarjeta **"Fases del torneo"**.
2. Presione **"+ Agregar fase"**:
   * **Tipo de fase:** Seleccione `Grupos`.
   * **Fecha:** Fecha de inicio de zonas.
   * **Orden:** `1`.
   * Presione **"Crear fase"**.
3. Presione nuevamente **"+ Agregar fase"**:
   * **Tipo de fase:** Seleccione `Llaves`.
   * **Fecha:** Fecha de las finales.
   * **Orden:** `2`.
   * Presione **"Crear fase"**.
4. Una vez creadas ambas fases, presione el botón dorado superior **"Activar torneo"**.
5. **Comportamiento esperado:** El estado del torneo cambia de **BORRADOR** a **ACTIVO**, habilitando los módulos de sorteo y mesas.

---

### ETAPA 4: Sorteo Automático de Grupos
*(Responsable: Superadmin)*

1. En la pantalla del torneo, presione el botón **"Grupos"** en la botonera de accesos rápidos.
2. Haga clic en el botón **"🎲 Sorteo automático"**.
3. En la ventana emergente:
   * En el campo de búsqueda, escriba el nombre o alias de los jugadores y haga clic sobre ellos para incorporarlos a la lista de participantes.
   * En la sección **Tamaño de grupos (Reglamento)**, elija el formato de su torneo:
     * **3 jugadores** *(clasifican 2)*
     * **4 jugadores** *(clasifican 2)*
     * **6 jugadores** *(clasifican 3)*
4. Presione el botón verde **"Sortear X jugadores"**.
5. **Comportamiento esperado:** El algoritmo reparte a los deportistas de forma balanceada y transparente en el Grupo 1, Grupo 2, etc., generando las tablas de posiciones iniciales en cero.

---

### ETAPA 5: Generación del Calendario de Partidas (Fixture)
*(Responsable: Superadmin)*

1. Estando en la pestaña **"Fase de Grupos"**, presione el botón **"Auto-generar partidas"** (icono de varita mágica ✨).
2. **Comportamiento esperado:** El sistema procesa el algoritmo *Round Robin* (todos contra todos en cada grupo) y despliega el mensaje de éxito:  
   *"Se generaron X partidas automáticamente (todos contra todos)"*.
3. Puede hacer clic en **"Ver detalle y partidas"** de cualquier grupo para constatar la programación de mesas con estado **Pendiente**.

---

### ETAPA 6: Operación de Mesa por el Juez (Marcador Digital y Planilla)
*(Responsable: Juez de Mesa)*

1. Abra una ventana de incógnito o use su teléfono móvil e ingrese a:  
   **[https://create-highly-pilot-intense.trycloudflare.com](https://create-highly-pilot-intense.trycloudflare.com)**
2. Inicie sesión con la cuenta de juez: `juez1@tribanda.com` / `admin1234`.
3. El sistema abrirá automáticamente el **"Panel de Juez"**, mostrando únicamente las partidas asignadas.
4. Seleccione una partida y pruebe los dos modos de juzgamiento:
   * **Modo Marcador Táctil (+/-):**  
     Presione los botones gigantes `+` y `-` para sumar carambolas a cada jugador. Presione el botón **"Turno"** para alternar jugador y avanzar la entrada. El promedio de cada deportista se recalcula en vivo.
   * **Modo Planilla Clásica de Entradas:**  
     Permite registrar entrada por entrada la serie anotada por cada deportista (idéntico a la planilla física tradicional).
5. Al completarse la meta de carambolas o el límite de entradas, presione el botón verde **"Confirmar y Finalizar Partida"**.

---

### ETAPA 7: Bloqueo de Partida 🔒 y Protocolo de Corrección
*(Responsable: Juez de Mesa)*

1. Al confirmar la partida:
   * El estado cambia a **BLOQUEADA** con un icono de candado 🔒.
   * Los botones de suma y edición quedan deshabilitados de inmediato para proteger la integridad del resultado.
2. **Simulación de error del juez:** Si el juez detecta que se equivocó en una anotación:
   * Presione el botón ámbar **"Solicitar Corrección"**.
   * En el cuadro de diálogo, escriba el motivo justificado:  
     *Ej: "Error al registrar la entrada 12: se asignó 1 carambola de más al jugador local"*.
   * Presione **"Enviar Solicitud"**.
3. **Comportamiento esperado:** La partida muestra la alerta: *"Solicitud de reapertura pendiente de aprobación por el Administrador"*.

---

### ETAPA 8: Panel de Auditoría y Aprobación del Superadmin
*(Responsable: Superadmin)*

1. Vuelva a la sesión de **Superadmin** (`superadmin@tribanda.com`).
2. Haga clic en **"Dashboard"** en el menú de navegación.
3. En la parte superior observará la tarjeta de alertas activas:  
   **"⚠️ Solicitudes de Corrección Pendientes (1)"**.
4. El Superadmin examina: la mesa, los dos jugadores enfrentados, el nombre del juez y el motivo textual de la corrección.
5. El Superadmin presiona **"Aprobar y Reabrir"**.
6. **Comportamiento esperado:** El candado de la partida se abre instantáneamente. El juez puede regresar a su pantalla, corregir las carambolas o entradas correspondientes y volver a confirmar y bloquear.

---

### ETAPA 9: Desempates Oficiales UMB y Ronda de Ajuste (Play-in)
*(Responsable: Público, TV o Administrador)*

1. **Inspección de la Tabla General:**
   * En la fase de grupos, haga clic en la pestaña **"L. General"** (o abra la vista pública).
   * Observe el ordenamiento estricto de todos los deportistas según los 6 criterios UMB: `PTS → PROM G → PROM P → M. SERIE → CAR → ENT`.
2. **Generación del Cuadro con Ronda de Ajuste:**
   * Ingrese a la opción **"Bracket"** (icono de llaves).
   * Si el número de clasificados es impar o no es potencia de dos (ej: 6 clasificados para llaves de 4):
     * El sistema calcula automáticamente:  
       *Potencia objetivo: 4 (semifinales) | Eliminados necesarios: 2.*  
       *Clasificados directos: 2 mejores sembrados (descansan).*  
       *Juegan Ronda de Ajuste: 4 clasificados con menor siembra (2 partidos de ajuste).*
   * Presione **"Generar Llaves con Ronda de Ajuste"**.
3. **Comportamiento esperado:** Se dibuja el árbol interactivo de eliminación directa con los partidos de repechaje claramente identificados. Al ganar un partido de ajuste, el vencedor avanza automáticamente a semifinales.

---

### ETAPA 10: Final del Torneo y Puntuación Oficial del Ranking
*(Responsable: Superadmin y Todo el Público)*

1. Al finalizar la gran final del torneo, ingrese a la ficha del torneo y presione el botón **"Finalizar torneo"**.
2. Haga clic en la pestaña **"Ranking"** en el menú de navegación.
3. **Comportamiento esperado:**
   * El sistema calcula y otorga los puntos de la **Escala Oficial de Medellín**:  
     *1° Campeón = 90 pts, 2° Subcampeón = 48 pts, 3° = 30 pts, 4° = 24 pts, etc.*
   * Si el torneo tuvo un incremento configurado del $+30\%$, el Campeón recibe $90 \times 1.30 = 117.0$ puntos.
   * Estos puntos se acumulan de forma limpia en el **Ranking Histórico General de la Temporada**, ordenado por puntos y desempatado por el promedio general de cada jugador.

---

## 6. INFRAESTRUCTURA DE SERVIDORES Y DESPLIEGUE EN LA NUBE

### 🚀 Acceso en Vivo Hoy (Cloudflare Tunnel)
Para la revisión del cliente el día de hoy, el sistema se encuentra publicado mediante un túnel seguro de Cloudflare conectado a los servidores de alta velocidad de Bogotá (`bog01`):
* **URL:** `https://create-highly-pilot-intense.trycloudflare.com`
* **Cero configuración en el cliente:** No requiere instalar nada ni lidiar con IPs públicas; cuenta con certificado SSL HTTPS válido.

### ☁️ Despliegue Permanente 24/7 en la Nube
El proyecto está preparado para desplegarse permanentemente en la nube siguiendo la arquitectura recomendada:

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│       FRONTEND WEB (SPA)        │       │       BACKEND API (NODE.JS)     │
│   Alojado en Netlify o Vercel   │ ────► │   Alojado en Render o Railway   │
│   (Archivo netlify.toml listo)  │       │   (Gestión de procesos continua)│
└─────────────────────────────────┘       └────────────────┬────────────────┘
                                                           │
                                                           ▼
                                          ┌─────────────────────────────────┐
                                          │      POSTGRESQL EN LA NUBE      │
                                          │     Neon.tech o Supabase        │
                                          │     (Copias de seguridad auto)  │
                                          └─────────────────────────────────┘
```

1. **Frontend en Netlify:** Ya cuenta con el archivo de configuración [`frontend/netlify.toml`](file:///c:/Users/hamil/Documents/proyectos%20en%20desarrollo/app%20Billar/frontend/netlify.toml) para compilar con `npm run build` y manejar rutas de Single Page Application sin errores 404.
2. **Backend en Render / Railway:** Ejecuta la API de Node.js de forma ininterrumpida con variables de entorno protegidas (`DATABASE_URL`, `JWT_SECRET`, etc.).
3. **Base de Datos en Neon / Supabase:** Instancia de PostgreSQL serverless de alto rendimiento que incluye copias de seguridad automáticas y alta disponibilidad para torneos nacionales o departamentales.

---

## 7. PREGUNTAS FRECUENTES Y RESPUESTAS OPERATIVAS

#### ¿Qué ocurre si se va el internet en el club durante una partida?
El frontend de TriBanda almacena temporalmente los datos en la memoria del navegador. Una vez restablecida la señal, el sistema sincroniza automáticamente las entradas con la base de datos PostgreSQL sin pérdida de información.

#### ¿Puede un juez alterar el resultado de un partido una vez terminado?
**No.** Al confirmar la partida, esta queda sellada con candado digital 🔒. El juez únicamente puede pulsar "Solicitar Corrección" indicando un motivo por escrito. El resultado no cambiará hasta que el Superadministrador lo apruebe formalmente desde su panel de auditoría.

#### ¿Cómo se manejan los empates en carambolas en la fase de grupos?
En la fase de grupos las partidas pueden terminar en empate (otorgando 1 punto de partida a cada jugador). La posición final en el grupo y en la tabla general de siembra la determinará el **Promedio General**, seguido del **Promedio Particular** y la **Mayor Serie (Tacada Máxima)**, según la UMB.

#### ¿Cómo se calcula la Ronda de Ajuste si clasifican por ejemplo 10 o 14 jugadores?
El sistema toma la potencia de 2 inferior más cercana ($P = 8$). Para 10 clasificados, se requieren $10 - 8 = 2$ eliminados. Por ende, los 4 jugadores con menor promedio juegan 2 partidos de ajuste, mientras que los 6 mejores clasificados descansan y pasan directo a octavos de final. Todo el cálculo es 100% automático.

---

## 8. NOVEDADES OPERATIVAS Y MEJORAS DE LA VERSIÓN FINAL (TORNEO DEL JUEVES)

A partir de la retroalimentación detallada y el análisis de los pantallazos y audios operativos, se incorporaron las siguientes herramientas de alta gama:

### 1. Tres Modalidades de Juego al Crear el Torneo
Al registrar un nuevo torneo (o editar uno existente en borrador), el organizador elige con un clic el tipo de torneo:
* **🏆 Oficial / Profesional (UMB):** Se juega a múltiples sets (al mejor de 3 sets por defecto), con planilla oficial entrada por entrada.
* **🎱 Torneo Local / Club:** Se juega a **un solo set directo**, con límite de entradas configurable (de 15 a 50 entradas) o en modo libre (sin límite), adaptado al ritmo de los clubes sociales.
* **⚡ Torneo Relámpago / Express:** Pensado para torneos rápidos de fin de semana o eliminatorias directas. Permite elegir entre **Juego Corto (8 a 10 carambolas)** o **Juego Largo (15 a 18 carambolas)** con marcador directo sin forzar la digitación de planilla entrada por entrada.

### 2. Protocolo Oficial de Inicio de Partida y Color de Bolas
Al ingresar al marcador o planilla de un partido pendiente, se abre una ventana de protocolo previo que permite:
* Seleccionar quién ganó el arrime o sorteo de salida (**Salida 🎯**).
* Asignar el color de bola: por defecto, quien tiene la salida juega con la **Bola Blanca (⚪)** y el rival con la **Bola Amarilla (🟡)**, con un botón de intercambio rápido (**⇄ Invertir Bolas**).
* Ajustar las metas individuales de carambolas (handicap de cada jugador) y el límite de entradas para esa partida específica.

### 3. Planilla Oficial con "Jugador B en Amarillo"
Inspirada directamente en las planillas físicas impresas de las federaciones de billar:
* El bloque de datos y las celdas del **Jugador B** cuentan con un **suave fondo amarillo distintivo**, evitando que el juez o anotador confunda las columnas al registrar carambolas bajo la presión de la partida.
* Filas dinámicas y adaptativas: la planilla expande automáticamente tantas entradas como se jueguen, sin topes artificiales.

### 4. Regla Oficial de Clasificación en Grupos de 3 Jugadores
En grupos triangulares (3 jugadores), el sistema califica y clasifica automáticamente a **los 2 mejores billaristas del grupo** (no a 1 solo), garantizando el avance justo de los clasificados hacia la tabla unificada de siembra y la ronda de ajuste.

### 5. Gestión Dinámica de Grupos y Jugadores en Vivo (Torneo en Curso)
* **Reemplazar Jugador Ausente:** Si un participante no llega o se retira a última hora, el administrador puede sustituirlo desde el detalle del grupo. El sistema transfiere automáticamente sus partidos pendientes al jugador sustituto sin borrar ni alterar los resultados ya jugados de los demás participantes.
* **Agregar o Eliminar Grupos en Vivo:** Permite crear nuevos grupos si llegan más inscritos tardíos o retirar grupos vacíos sin reiniciar el torneo.
* **Flujo Ultrarrápido de Creación Manual ("Guardar y Crear Siguiente Grupo ➡️"):** Al armar grupos manualmente, el administrador selecciona los 3 jugadores y pulsa "Guardar y Crear Siguiente Grupo", lo que crea de inmediato el Grupo N+1 y abre su lista numerada para continuar sin salir de la pantalla.
* **Guardado Progresivo del Sorteo:** Al ir agregando billaristas al sorteo automático, la lista se guarda progresivamente en memoria local; si se recarga la página por accidente, ningún jugador se pierde.
* **Cartelera Oficial para Imprimir:** Botón **"Exportar / Imprimir Grupos"** que genera una cartelera apaisada con membrete oficial lista para imprimir o exportar a PDF y colocar en el tablón del club.

### 6. Directorio Compacto de Jugadores e Impresión
En la sección **Jugadores**, se añadió:
* Modo de visualización en **Tabla Compacta** que muestra número consecutivo, nombre completo, apodo/alias, club, cédula, celular, promedio histórico y categoría con medalla de color.
* Botón **"Imprimir Directorio"** para emitir en un clic la lista completa oficial de billaristas afiliados.

### 7. Control de Inscripciones y Pagos por Torneo
En la pantalla de detalle de cada torneo:
* Panel de **Participantes Inscritos** con contador de recaudación en vivo (ej. *Pagados: 28 / 32*).
* Casilla de verificación para marcar el **pago de inscripción confirmado** al instante.
* Botón **"Imprimir Planilla"** para generar la hoja oficial de firmas y distancias de juego para la mesa técnica del evento.

