# impl_UX-05-backend — Sistema de Invitaciones a Profesionales (Backend)

**Feature:** UX-05
**Fecha:** 2026-06-25
**Sandbox:** `apps/server`
**Estado:** implementado — pendiente de review

---

## Archivos Modificados

| Archivo | Tipo | Cambio |
|---|---|---|
| `apps/server/src/models/Professional.ts` | Modificado | Campos de invitación en interfaz y schema |
| `apps/server/src/controllers/professionalController.ts` | Modificado | Validación unicidad Admin↔Profesional + soporte `inviteEmail` |
| `apps/server/src/routes/professionalRoutes.ts` | Modificado | Validador `inviteEmail` en POST `/` |
| `apps/server/src/server.ts` | Modificado | Montaje de `/api/invitacion` |

## Archivos Nuevos

| Archivo | Tipo | Descripción |
|---|---|---|
| `apps/server/src/controllers/invitationController.ts` | Nuevo | `validateInvitation` + `acceptInvitation` |
| `apps/server/src/routes/invitationRoutes.ts` | Nuevo | Router `/validate` (GET) + `/aceptar` (POST) |

---

## Detalle de Cambios

### Cambio 1 — Unicidad Admin↔Profesional (createProfessional / updateProfessional)
- En `createProfessional`: luego de validar que el Admin pertenece al tenant, se busca si ya existe otro `Professional` activo del mismo tenant con ese `linkedAdmin`. Si existe → 409 con mensaje descriptivo del nombre de la profesional conflictuante.
- En `updateProfessional`: misma lógica pero excluye el documento actual (`_id: { $ne: id }`).
- Ambas validaciones solo se disparan si `linkedAdmin` está presente en el body.

### Cambio 2 — Modelo Professional: campos de invitación
Tres campos nuevos en interfaz y schema:
- `pendingInviteEmail: string | null` — email del invitado hasta que acepte.
- `inviteToken: string | null` — token hex 64 chars. Índice `sparse: true` (no indexa nulls).
- `inviteTokenExpiry: Date | null` — TTL de 7 días desde creación.

### Cambio 3 — Soporte `inviteEmail` en createProfessional
- Flujo mutual exclusivo: si viene `linkedAdmin`, se ignora `inviteEmail` (vínculo directo). Si viene solo `inviteEmail`, se genera token, se guarda la profesional y luego se llama a `clerkClient.invitations.createInvitation`.
- Degrado graceful: si Clerk falla al enviar el mail, la profesional queda creada y la respuesta 201 incluye `_inviteWarning` para que el frontend lo notifique al admin.
- Email de invitado se normaliza a lowercase antes de guardar y comparar.

### Cambio 4 — invitationController.ts
- `validateInvitation` (GET `/validate?token=`): endpoint público. Busca Professional por token no expirado → devuelve nombre profesional, nombre tenant y email invitado. No expone el token en la respuesta.
- `acceptInvitation` (POST `/aceptar`): semi-público (requiere sesión Clerk vía `getAuth`). Valida token, verifica que el email del usuario autenticado coincide con `pendingInviteEmail`, crea el Admin con rol `PROFESSIONAL`, vincula la profesional y limpia los campos de invitación. Idempotente: si el Admin ya existe, devuelve 200.

### Cambio 5 — invitationRoutes.ts
- EXCEPCIÓN de seguridad documentada: sin `checkAdminAccess` ni `checkTenantAccess` porque el invitado no tiene registro en `admins` aún. El gate es `clerkMiddleware` global + validación lógica en el controller.

### Cambio 6 — server.ts
- Montado en `/api/invitacion` antes de rutas con `checkAdminAccess`, después de `/api/onboarding` (misma categoría de excepción documentada).

---

## Resultado del Build

```
> @estetica/server@1.0.0 build
> tsc

Exit Code: 0 — sin errores ni warnings
```

---

## Decisiones Técnicas

1. **Degrado graceful de Clerk**: guardar la profesional antes de llamar a la API de Clerk es deliberado. Si Clerk falla (rate limit, downtime), la profesional queda en BD con token válido y el admin puede reenviar la invitación desde el panel en una iteración futura.

2. **Token `sparse: true`**: el campo `inviteToken` es `null` en la mayoría de los documentos (solo presente mientras la invitación está pendiente). El índice sparse evita indexar los nulls, reduciendo el tamaño del índice sin perder la eficiencia de búsqueda.

3. **TTL manual vs. `expireAfterSeconds`**: se usa `inviteTokenExpiry` como campo de fecha y se filtra con `$gt: new Date()` en las queries, en lugar de un índice TTL de Mongoose. Razón: el TTL de Mongo borra el documento completo, y aquí solo queremos invalidar el token, no eliminar la profesional.

4. **Idempotencia en aceptar**: si el usuario ya tiene Admin en el sistema (porque la operación se ejecutó dos veces), el endpoint devuelve 200 (no error) para que el flujo del frontend sea robusto ante doble-click o redirecciones duplicadas.
