# Arnés de Reglas y Habilidades de Backend (Maison CRM API)

> **Documento de Gobernanza:** Define las políticas operativas, límites estructurales y mandatos de seguridad para cualquier interacción automatizada dentro de la capa backend de Maison CRM.

## 1. ROL Y LÍMITES DEL AGENTE EN EL BACKEND

* **Sandbox de Ejecución:** Tu contexto está restringido al directorio `apps/server`.
* **Prohibición de Alcance Global:** Prohibido alterar configuraciones del monorepo o interactuar con `apps/client`.
* **Stack Tecnológico:** Node.js 21+, Express 4.21, TypeScript 6, Mongoose 9.6, Clerk Express 2.1, express-validator 7.3, cors, ts-node + nodemon (dev).

## 2. ARQUITECTURA DE CARPETAS

La API sigue una estructura de capas:

- `src/config/`: Configuración (db, Clerk, etc.)
- `src/controllers/`: Lógica de endpoints (camelCase, `export const fn = async (req, res) => {...}`)
- `src/models/`: Schemas de Mongoose (PascalCase, interfaz `IEntity`, schema `EntitySchema`, export `Entity`)
- `src/routes/`: Definición de rutas Express (crean Router, aplican middleware, export default)
- `src/middlewares/`: Middleware personalizados (auth, validación)

### Patrón de Controlador

```typescript
export const getClients = async (req: Request, res: Response) => {
    try {
        const clients = await Client.find({ isActive: true }).sort({ lastName: 1 });
        return res.status(200).json(clients);
    } catch (error) {
        console.error('Error al obtener clientes:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};
```

### Patrón de Rutas

```typescript
import { Router } from 'express';
import { checkAdminAccess } from '../middlewares/authMiddleware';

const router: Router = Router();
router.use(checkAdminAccess);

router.get('/', getClients);
router.post('/', [body('firstName').notEmpty(), validateRequest], createClient);

export default router;
```

### Patrón de Modelo Mongoose

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IClient extends Document {
    firstName: string;
    lastName: string;
    phone?: string;
    medicalNotes?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ClientSchema: Schema = new Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    medicalNotes: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Client = mongoose.model<IClient>('Client', ClientSchema);
```

## 3. REGLAS DE SEGURIDAD

* **Autenticación:** Usar `checkAdminAccess` middleware de `middlewares/authMiddleware.ts`. Verifica Clerk JWT via `getAuth(req)` y busca `externalId` en colección `admins`.
* **Validación:** Usar `express-validator` en arrays inline dentro de las rutas. `validateRequest` como último elemento.
* **CORS:** Configurado en `server.ts` con orígenes permitidos.
* **Soft Delete:** Clientes, servicios y productos usan `isActive: false`. No eliminar físicamente.
* **Control de Stock:** Validar stock >= 0 antes de egresos. Actualizar con `$inc` o cálculo manual.

## 4. CONVENCIONES DE NAMING

| Elemento | Convención | Ejemplo |
| --- | --- | --- |
| Archivos de modelo | PascalCase | `Client.ts`, `ServiceRecord.ts` |
| Archivos de controller/routes | camelCase | `clientController.ts`, `clientRoutes.ts` |
| Funciones exportadas | camelCase, `export const` | `export const getClients = async...` |
| Interfaces | PascalCase con prefijo `I` | `IClient`, `IServiceRecord` |
| Ruta Router | `const router: Router = Router()` | |
| Variable de ruta | `export default router` | |

## 5. RESPUESTAS HTTP

| Código | Uso |
|--------|-----|
| 200 | GET/PUT/DELETE exitoso |
| 201 | POST creación exitosa |
| 400 | Error de validación o regla de negocio |
| 401 | No autenticado (Clerk) |
| 403 | No autorizado (admin check falló) |
| 404 | Recurso no encontrado |
| 500 | Error interno del servidor |

Formato de error: `{ error: 'mensaje descriptivo' }`.

## 6. MANEJO DE ERRORES

* Cada controller envuelve su lógica en `try/catch`.
* En el catch: `console.error('Contexto:', error)` + `res.status(500).json({ error: '...' })`.
* Para errores de negocio: retornar 400 con mensaje descriptivo.
* No existe middleware global de errores — cada controller maneja sus propios errores.

## 7. REGLAS DE GOBERNANZA TRANSVERSALES

* **Fuente Canónica:** Todo subagente DEBE consultar `docs/governance-rules.md` como fuente única de verdad para reglas de seguridad, autenticación, soft deletes, control de stock y registro de visitas. Este archivo solo referencia — nunca redefine — esas reglas.

## 8. ESQUEMA DE BASE DE DATOS (DOCUMENTACIÓN CANÓNICA)

* **Referencia Inmutable:** Todo subagente DEBE leer `docs/db-schema.md` antes de crear o modificar cualquier modelo Mongoose en `apps/server/src/models/`.
* **SRS §3.3:** El esquema definido en `docs/db-schema.md` se alinea con la especificación en `EsteticaSystem_SRS_v1_0.md §3.3`. Cualquier divergencia debe ser documentada y justificada.
* **Colecciones:** Las 5 colecciones de Fase 1 son `admins`, `clients`, `services`, `products`, `servicerecords`.

## 9. ARNÉS DE VERIFICACIÓN

Antes de reportar cierre, ejecuta:
```
pnpm --filter @estetica/server build
```
