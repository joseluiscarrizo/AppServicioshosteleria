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

Actualmente sin cobertura de tests automatizados. Roadmap:

```bash
# Futuro setup
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

Flujos prioritarios para cubrir: creación de pedido, asignación de camarero, confirmación de servicio.

