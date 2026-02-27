# AppServicioshosteleria

Sistema de gestión de personal temporal para eventos de hostelería. Permite a coordinadores crear pedidos de servicio, asignar camareros, gestionar disponibilidades, y automatizar comunicaciones vía WhatsApp y email.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite |
| Routing | React Router v6 |
| Estado/Cache | TanStack Query v5 |
| UI | Tailwind CSS + shadcn/ui + Framer Motion |
| Drag & Drop | @hello-pangea/dnd |
| BaaS | Base44 SDK v0.8.x |
| Cloud Functions | TypeScript (serverless en Base44) |
| Hosting | Firebase Hosting |

---

## Variables de entorno

Crea un archivo `.env.local` en la raíz con:

```env
VITE_BASE44_APP_ID=<tu_app_id_de_base44>
VITE_BASE44_BACKEND_URL=<url_del_backend_base44>
```

Estos valores los obtenes desde el Dashboard de Base44 → Settings → API Keys.

> **Importante:** `requiresAuth` en `src/api/base44Client.js` debe estar en `true` para producción. Verificar las reglas de seguridad de cada entidad en el Dashboard de Base44.

---

## Instalación y desarrollo

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo (http://localhost:5173)
npm run dev

# Build de producción
npm run build

# Preview del build
npm run preview

# Lint
npm run lint
npm run lint:fix
```

---

## Integración con Slack

El repositorio envía notificaciones automáticas a Slack mediante GitHub Actions para los siguientes eventos:

| Evento | Descripción |
|--------|-------------|
| 🔀 Push a `main` | Se notifica el commit, autor y mensaje |
| 🟢 PR abierta / reabierta | Número, título, rama y autor |
| 🟣 PR mergeada | Confirmación del merge |
| 🔴 PR cerrada sin merge | Aviso de cierre sin integración |
| ✅ / ❌ Despliegue a Firebase | Resultado del workflow de deploy |

### Configuración inicial

1. **Crear una Slack App con Incoming Webhook:**
   - Ve a [https://api.slack.com/apps](https://api.slack.com/apps) e inicia sesión en tu workspace.
   - Haz clic en **"Create New App"** → **"From scratch"**, elige un nombre (p.ej. `GitHub AppHosteleria`) y tu workspace.
   - En el menú izquierdo, selecciona **"Incoming Webhooks"** y actívalo.
   - Haz clic en **"Add New Webhook to Workspace"**, elige el canal donde quieres recibir las notificaciones y confirma.
   - Copia la **Webhook URL** generada (formato: `https://hooks.slack.com/services/...`).

2. **Añadir el secreto en GitHub:**
   - En el repositorio de GitHub, ve a **Settings → Secrets and variables → Actions**.
   - Crea un nuevo secreto llamado exactamente `SLACK_WEBHOOK_URL` y pega la Webhook URL copiada.

3. **Verificar:** A partir del siguiente push a `main` o apertura de PR, recibirás notificaciones en el canal de Slack elegido.

> **Nota:** El canal de Slack destino se configura en el Incoming Webhook de la Slack App. Para cambiar el canal, edita o crea un nuevo webhook en [api.slack.com/apps](https://api.slack.com/apps) y actualiza el secreto `SLACK_WEBHOOK_URL`.

---

## Despliegue

La app está desplegada en Firebase Hosting:

```
https://servicios-hosteleros-app.web.app
```

Para desplegar manualmente:

```bash
npm run build
firebase deploy --only hosting
```

---

## Arquitectura

```
src/
├── api/
│   └── base44Client.js        # Cliente Base44 (BaaS)
├── components/
│   ├── asignacion/            # Kanban, drag-drop, sugerencias IA
│   ├── camareros/             # Gestión, valoraciones, disponibilidad
│   ├── informes/              # Análisis, rendimiento, tendencias
│   ├── notificaciones/        # Push, in-app, polling
│   ├── pedidos/               # Formularios, editor de turnos, extractor IA
│   ├── recordatorios/         # Servicio de recordatorios configurables
│   ├── tiemporeal/            # Hoja de asistencia
│   └── whatsapp/              # Envíos, plantillas, programados
├── hooks/
│   └── useBackgroundServices.js  # Servicios background unificados
├── pages/
│   ├── Pedidos.jsx            # CRUD pedidos + extractor IA
│   ├── Asignacion.jsx         # Vista kanban / lista / calendario
│   ├── Camareros.jsx          # CRUD camareros
│   ├── Clientes.jsx           # CRUD clientes
│   ├── Coordinadores.jsx      # CRUD coordinadores
│   ├── Disponibilidad.jsx     # Calendario de disponibilidad
│   ├── TiempoReal.jsx         # Monitoreo en tiempo real
│   ├── DashboardCoordinador.jsx
│   ├── TableroEventos.jsx
│   ├── VistaMovil.jsx
│   ├── ConfirmarServicio.jsx  # Página pública para camareros (sin auth)
│   └── ...
├── Layout.jsx                 # Nav + servicios background globales
└── utils.js
functions/                     # 13 Cloud Functions TypeScript (Base44)
```

### Flujo principal

1. **Coordinador crea pedido** (con o sin extractor IA)
2. **Asigna camareros** al pedido via kanban drag-drop o lista
3. **Camarero recibe notificación** WhatsApp con detalles del servicio
4. **Camarero confirma** via link público (`/ConfirmarServicio`)
5. **Sistema envía recordatorios** automáticos 24h y 2h antes del evento
6. **Durante el servicio**: hoja de asistencia y monitoreo en tiempo real

---

## Servicios background

Coordinados desde un único hook `useBackgroundServices` montado en `Layout.jsx`:

- **Notificaciones automáticas** — alertas de eventos próximos y pedidos incompletos (cada 10-15 min)
- **Recordatorios WhatsApp** — mensajes automáticos 24h y 2h antes del servicio (cada 5 min)
- **Tareas pendientes** — recordatorios de tareas que vencen hoy o mañana

---

## Cloud Functions (Base44)

| Función | Descripción |
|---------|-------------|
| `sugerirCamarerosInteligente` | Sugerencias de asignación basadas en historial e IA |
| `notificarAsignacionesProximas` | Notificaciones push a coordinadores |
| `enviarWhatsAppDirecto` | Envío directo de mensajes WhatsApp |
| `enviarWhatsAppMasivo` | Envío masivo a múltiples camareros |
| `exportarAsignacionesExcel` | Exportación de asignaciones a Excel |
| `exportarAsistenciaSheets` | Sincronización con Google Sheets |
| `enviarHojaAsistenciaGmail` | Hoja de asistencia por email |
| `verificarDocumentosExpirados` | Alertas de documentación caducada |
| `procesarEnviosProgramados` | Procesamiento de envíos programados |
| `confirmarServicioAutomatico` | Confirmación automática de servicios |
| `autoCrearGrupoChatConfirmado` | Creación automática de grupos de chat |
| `eliminarGruposExpirados` | Limpieza de grupos inactivos |
| `generarDocumentacionServicio` | Generación de documentos de servicio |

---

## Modelo de datos principal

### Pedido
```js
{
  id, cliente, lugar_evento, direccion_completa,
  dia,               // 'yyyy-MM-dd'
  turnos: [{         // modelo actual
    cantidad_camareros, entrada, salida, t_horas
  }],
  camisa, extra_transporte, link_ubicacion, notas,
  estado_evento      // 'pendiente' | 'en_curso' | 'completado' | 'cancelado'
}
```

### AsignacionCamarero
```js
{
  id, pedido_id, camarero_id, camarero_nombre, camarero_codigo,
  turno_index, posicion_slot,
  hora_entrada, hora_salida,
  estado,       // 'pendiente' | 'confirmado' | 'alta' | 'no_asistio'
  fecha_pedido  // copia desnormalizada para filtros de rango
}
```

---

## Convenciones de código

- Queries React Query con `queryKey` consistentes: `['pedidos']`, `['camareros']`, `['asignaciones']`
- Todas las mutations tienen `onSuccess` con `toast.success()` y `onError` con `toast.error()`
- Fechas como strings `'yyyy-MM-dd'` — siempre parsear con `parseISO()` de date-fns, nunca `new Date(string)`
- Eliminaciones protegidas con `AlertDialog` de confirmación
- Componentes de fondo (null render) eliminados: usar `useBackgroundServices` hook

---

## Tests

El proyecto cuenta con una suite de tests automatizados usando **Vitest + Testing Library** con cobertura de los flujos críticos.

### Ejecutar tests

```bash
# Correr todos los tests una vez
npm test

# Correr tests en modo watch (re-ejecuta al guardar)
npx vitest

# Dashboard visual interactivo de tests
npm run test:ui

# Tests con reporte de cobertura
npm run test:coverage
```

### Estructura de tests

```
tests/
├── setup.js                    # Setup global de Vitest + mocks
├── fixtures/                   # Datos mock reutilizables
│   ├── pedidos.json
│   ├── camareros.json
│   ├── asignaciones.json
│   └── coordinadores.json
├── flows/                      # Tests de flujos críticos (40 tests)
│   ├── crear-pedido.test.jsx       # 12 tests
│   ├── asignar-camarero.test.jsx   # 13 tests
│   └── confirmar-servicio.test.jsx # 15 tests
└── utils/
    ├── render.jsx              # Custom render con providers (BrowserRouter + QueryClient)
    ├── mocks.js                # Mocks de base44, sonner
    └── factories.js            # Factory functions para crear datos de test
```

### Flujos cubiertos

| Flujo | Tests | Descripción |
|-------|-------|-------------|
| Crear Pedido | 12 | Renderizado, formulario, CRUD, errores de red |
| Asignar Camarero | 13 | Kanban, asignaciones, estados, notificaciones |
| Confirmar Servicio | 15 | Token URL, confirmación, rechazo, toast, estado |



