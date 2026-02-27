# Error Code Reference

All API errors follow a consistent JSON shape:

```json
{ "error": "Human-readable message" }
```

---

## HTTP Status Codes

| Code | Name | When it occurs |
|------|------|----------------|
| `400` | Bad Request | A required field is missing or a parameter fails validation |
| `401` | Unauthorized | The `Authorization` header is absent, the token is malformed, or the session has expired |
| `403` | Forbidden | The token is valid but the user's role does not allow this operation |
| `404` | Not Found | The requested entity (order, assignment, waiter, etc.) does not exist |
| `405` | Method Not Allowed | An unsupported HTTP method was used (e.g. PUT on a POST-only endpoint) |
| `409` | Conflict | Duplicate operation — e.g. check-in already registered for this type |
| `500` | Internal Server Error | Unexpected server-side error |

---

## Error Messages by Endpoint

### `enviarWhatsAppDirecto`

| HTTP | `error` message | Cause |
|------|-----------------|-------|
| `400` | `"Teléfono y mensaje son requeridos"` | `telefono` or `mensaje` missing |
| `400` | `"Número de teléfono con formato inválido"` | `telefono` fails phone-number validation |
| `400` | `"Número de teléfono inválido"` | `telefono` (digits only) is shorter than 9 digits |
| `401` | `"No autorizado - Token inválido o expirado"` | Missing or invalid Bearer token |
| `403` | `"No autorizado - Rol insuficiente"` | Role is not `admin` or `coordinador` |
| `500` | `"Internal server error"` | Unexpected error |

### `enviarWhatsAppMasivo`

| HTTP | `error` message | Cause |
|------|-----------------|-------|
| `400` | `"Debe seleccionar al menos un camarero"` | `camareros_ids` is empty or missing |
| `400` | `"Debe proporcionar un mensaje o plantilla"` | Both `mensaje` and `plantilla_id` are absent |
| `401` | `"No autorizado - Token inválido o expirado"` | Missing or invalid Bearer token |
| `403` | `"No autorizado - Rol insuficiente"` | Role is not `admin` or `coordinador` |
| `500` | `"Error al enviar mensajes"` | Unexpected error |

### `confirmarServicioAutomatico`

| HTTP | `error` message | Cause |
|------|-----------------|-------|
| `400` | `"asignacion_id requerido"` | Body field missing |
| `401` | `"No autorizado - Token inválido o expirado"` | Missing or invalid Bearer token |
| `403` | `"No autorizado - Rol insuficiente"` | Role is not `admin` or `coordinador` |
| `404` | `"Asignación no encontrada"` | No assignment with the given ID |
| `500` | `"Internal server error"` | Unexpected error |

### `sugerirCamarerosInteligente`

| HTTP | `error` message | Cause |
|------|-----------------|-------|
| `400` | `"pedido_id es requerido"` | Body field missing |
| `401` | `"No autorizado - Token inválido o expirado"` | Missing or invalid Bearer token |
| `403` | `"No autorizado - Rol insuficiente"` | Role is not `admin` or `coordinador` |
| `404` | `"Pedido no encontrado"` | No order with the given ID |
| `500` | `"Internal server error"` | Unexpected error |

### `generarDocumentacionServicio`

| HTTP | `error` message | Cause |
|------|-----------------|-------|
| `400` | `"pedido_id es requerido"` | Body field missing |
| `403` | `"No autorizado"` | Role is not `admin` or `coordinador` |
| `404` | `"Pedido no encontrado"` | No order with the given ID |
| `500` | `"Internal server error"` | Unexpected error |

### `exportarAsistenciaSheets`

| HTTP | `error` message | Cause |
|------|-----------------|-------|
| `401` | `"No autenticado"` | Missing or invalid Bearer token |
| `404` | `"Pedido no encontrado"` | No order with the given ID |
| `500` | `"Internal server error"` | Unexpected error |

### `registrarFichajeQR`

| HTTP | `error` message | Cause |
|------|-----------------|-------|
| `400` | `"Token requerido"` | `token` query parameter missing |
| `400` | `"tipo debe ser \"entrada\" o \"salida\""` | Invalid `tipo` value |
| `400` | `"Primero debes registrar la entrada"` | Tried to register exit before entry |
| `404` | `"Token no válido o asignación no encontrada"` | No assignment for the given token |
| `405` | `"Método no permitido"` | HTTP method other than GET / POST / OPTIONS |
| `409` | `"Ya se registró la entrada anteriormente"` | Entry already registered |
| `409` | `"Ya se registró la salida anteriormente"` | Exit already registered |
| `500` | `<error.message>` | Unexpected error |

### `generarTokensQR`

| HTTP | `error` message | Cause |
|------|-----------------|-------|
| `400` | `"pedido_id requerido"` | Body field missing |
| `403` | `"No autorizado"` | Role is not `admin` or `coordinador` |
| `404` | `"Pedido no encontrado"` | No order with the given ID |
| `500` | `"Internal server error"` | Unexpected error |

### `enviarParteAutomatico`

| HTTP | `error` message | Cause |
|------|-----------------|-------|
| `400` | `"pedido_id requerido"` | Body field missing |
| `401` | `"No autorizado - Token inválido o expirado"` | Missing or invalid Bearer token |
| `403` | `"No autorizado - Rol insuficiente"` | Role is not `admin` or `coordinador` |
| `404` | `"Pedido no encontrado"` | No order with the given ID |
| `500` | `"Internal server error"` | Unexpected error |

### `createUser`

| HTTP | `error` message | Cause |
|------|-----------------|-------|
| `400` | `"Missing required fields"` | `email`, `password`, or `role` missing |
| `401` | `"Missing authorization"` | No `Authorization` header |
| `401` | `"Unauthorized"` | Token invalid or expired |
| `403` | `"Forbidden"` | Role is not `admin` |
| `500` | `"Internal server error"` | Unexpected error |

### `autoCrearGrupoChatConfirmado` *(webhook)*

| HTTP | `error` message | Cause |
|------|-----------------|-------|
| `400` | `"Asignación sin pedido_id"` | Assignment record has no `pedido_id` |
| `500` | `"Internal server error"` | Unexpected error |

---

## RBAC Error Codes

The `validateUserAccess` utility (`utils/rbacValidator.ts`) throws `RBACError`
which is mapped to HTTP status codes as follows:

| `RBACError.statusCode` | Meaning |
|------------------------|---------|
| `401` | User not authenticated (no token or invalid token) |
| `403` | User authenticated but role not in the allowed list |

---

## Debugging Tips

1. **401 on every request** — Check that the `Authorization` header is set and
   the token has not expired. Re-authenticate to get a fresh token.
2. **403 on coordinator-level endpoints** — Verify the user's `role` field in the
   database. Only `admin` and `coordinador` can call most endpoints.
3. **404 on entity endpoints** — Double-check the entity ID. IDs are case-sensitive
   MongoDB-style strings.
4. **409 on QR check-in** — Each type (`entrada`/`salida`) can only be registered
   once per assignment. Check the existing `hora_entrada_real` / `hora_salida_real`
   values on the assignment record.
5. **500 errors** — Check the Cloud Function logs in the Base44 dashboard. The
   response body may include additional detail in the `error` field.
