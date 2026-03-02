# Informe de Auditoría Técnica — Camareros Bcn
**Fecha:** 2026-03-02
**Repositorio:** joseluiscarrizo/AppServicioshosteleria

## Stack Detectado
- Frontend: React + Vite + TailwindCSS
- BaaS: Base44 SDK
- Cloud Functions: Deno/TypeScript
- Deploy: Netlify

## Issues Encontrados

| ID | Severidad | Archivo | Descripción | Estado |
|----|-----------|---------|-------------|--------|
| 001 | CRÍTICA | src/api/base44Client.js | requiresAuth: false — cualquier usuario no autenticado puede acceder | ✅ Corregido Fase 1 |
| 002 | CRÍTICA | functions/eliminarGruposExpirados.ts | Función completamente vacía — los grupos expirados no se eliminan nunca | ✅ Corregido Fase 1 |
| 003 | ALTA | index.html | Título genérico "Base44 APP", favicon de terceros, lang="en" | ✅ Corregido Fase 1 |
| 004 | ALTA | .env.example | Variables de entorno de Laravel genéricas, no corresponden al proyecto | ✅ Corregido Fase 1 |
| 005 | ALTA | src/components/admin/AdminDashboard.jsx | KPIs hardcodeados con "--", sin conexión a datos reales | 📋 Fase 2 |
| 006 | ALTA | src/components/admin/UserManagement.jsx | Llama a Netlify Functions en lugar de Base44 functions | 📋 Fase 2 |
| 007 | MEDIA | src/api/base44Client.js | SDK sin versión fijada | 📋 Fase 2 |
| 008 | MEDIA | functions/ | CORS wildcard (*) en funciones serverless | 📋 Fase 2 |
| 009 | BAJA | public/manifest.json | Manifest PWA incompleto sin iconos ni shortcuts | 📋 Fase 3 |
| 010 | BAJA | - | Sin tests unitarios | 📋 Fase 3 |

## Cambios Aplicados en Fase 1
1. requiresAuth: false → true en base44Client.js
2. Implementada función eliminarGruposExpirados.ts (estaba vacía)
3. index.html: branding propio, lang=es, favicon local, meta tags
4. .env.example: variables correctas del proyecto

## Plan Fase 2
- Conectar AdminDashboard a datos reales (TanStack Query)
- Corregir UserManagement: Netlify → Base44 functions
- CORS dinámico con variable de entorno
- RBAC unificado en validador central
- SDK con versión fijada

## Plan Fase 3
- Tests unitarios con Vitest
- Rate-limiting en endpoints públicos
- TTL tokens QR
- PWA manifest completo
- Datos demo para presentaciones
