# Convenciones de Código (Maison CRM)

> Homogeneidad extrema. La IA predice mejor cuando el repositorio se parece a sí mismo en todas partes.

---

## Estilo TypeScript y Formateo

* **Versión:** TypeScript 6.0 con modo estricto.
* **Indentación:** 4 espacios (no tabs).
* **Semicolons:** Obligatorios al final de cada statement.
* **Strings:** Comillas simples `'...'` para TypeScript. Comillas dobles `"..."` para JSX/TSX.
* **Tipado:** Prohibido `any`. Todo parámetro y retorno debe tener tipo explícito.

---

## Nomenclatura Estricta (Naming)

| Elemento | Convención | Ejemplo |
| --- | --- | --- |
| **Componentes React** | PascalCase, `export default` | `export default function Dashboard()` |
| **Vistas** | PascalCase | `Clients.tsx`, `ProfileClient.tsx` |
| **Archivos de API** | camelCase | `clientApi.ts`, `serviceApi.ts` |
| **Interfaces/Types** | PascalCase | `Client`, `ServiceRecord` |
| **Props de componente** | `interface Props` (local) | `interface Props { isOpen: boolean }` |
| **Variables/Funciones** | camelCase | `handleClose`, `searchTerm` |
| **Archivos backend** | PascalCase (models), camelCase (controllers/routes) | `Client.ts`, `clientController.ts` |
| **Interfaces backend** | PascalCase con prefijo `I` | `IClient`, `IServiceRecord` |
| **Constantes** | UPPER_SNAKE | `DEFAULT_PAGE_SIZE` |

---

## Estructura de Importaciones

### Frontend (`apps/client`)

```
// 1. Librerías externas
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiPlus } from 'react-icons/fi';

// 2. Módulos internos
import { getClients } from '../api/clientApi';
import { handleApiError } from '../api/errorHandler';
import type { Client } from '../types';
import Modal from '../components/ui/Modal';
```

### Backend (`apps/server`)

```
// 1. Librerías externas
import { Router } from 'express';
import { body } from 'express-validator';

// 2. Módulos internos
import { getClients } from '../controllers/clientController';
import { checkAdminAccess } from '../middlewares/authMiddleware';
```

---

## Patrones de Componentes (Frontend)

### Estructura de Vista

```typescript
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FiIcon } from 'react-icons/fi';
import { getData } from '../api/someApi';
import type { SomeType } from '../types';

export default function SomeView() {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const { data, isLoading } = useQuery<SomeType[]>({
        queryKey: ['key'],
        queryFn: getData,
    });

    const handleClick = () => { ... };

    if (isLoading) return <div className="animate-pulse">...</div>;
    if (isError) return <div>Error message</div>;
    if (!data?.length) return <div>Empty message</div>;

    return ( ... );
}
```

### Estados Cubrir Obligatoriamente
1. **Loading**: Skeleton con `animate-pulse`.
2. **Error**: Trifecta de accesibilidad (color + icono + texto) + `toast.error()`.
3. **Empty**: Mensaje claro "Aún no tienes...".
4. **Data**: Contenido real.

---

## Patrones de Error (Backend)

```typescript
try {
    // lógica
    return res.status(200).json(result);
} catch (error) {
    console.error('Contexto del error:', error);
    return res.status(500).json({ error: 'Mensaje descriptivo' });
}
```

### Códigos HTTP
- 200: Éxito GET/PUT/DELETE
- 201: Creación POST exitosa
- 400: Error de validación / regla de negocio
- 401: No autenticado
- 403: No autorizado
- 404: No encontrado
- 500: Error interno

---

## Modelos Mongoose (Backend)

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IEntity extends Document {
    field: string;
    createdAt: Date;
    updatedAt: Date;
}

const EntitySchema: Schema = new Schema({
    field: { type: String, required: true, trim: true },
}, { timestamps: true });

export const Entity = mongoose.model<IEntity>('Entity', EntitySchema);
```

### Convenciones de Schema
- `trim: true` en todos los String.
- `timestamps: true` para createdAt/updatedAt automáticos.
- `isActive: { type: Boolean, default: true }` para soft delete.
- `ref: 'Model'` para relaciones ObjectId.
- Índices compuestos con `schema.index({ field1: 1, field2: 1 })`.

---

## Rutas Express (Backend)

```typescript
const router: Router = Router();
router.use(checkAdminAccess);

router.get('/', controller.getAll);
router.get('/:id', [param('id').isMongoId(), validateRequest], controller.getById);
router.post('/', [body('name').notEmpty(), validateRequest], controller.create);

export default router;
```

Montaje en `server.ts`: `app.use('/api/clientes', clientRoutes)`.

---

## API Functions (Frontend)

```typescript
import api from '../libs/axios';
import type { Client } from '../types';

export interface ClientFormData {
    firstName: string;
    lastName: string;
    phone?: string;
    medicalNotes?: string;
}

export const getClients = async (): Promise<Client[]> => {
    const { data } = await api.get('/clientes');
    return data;
};

export const createClient = async (data: ClientFormData): Promise<Client> => {
    const response = await api.post('/clientes', data);
    return response.data;
};
```

---

## Política de Comentarios

No escribir comentarios que describan *qué* hace el código. Solo autorizados para explicar **por qué** se hace algo no obvio.

```typescript
// Se usa $inc en lugar de save() para evitar race conditions en stock concurrente
```
