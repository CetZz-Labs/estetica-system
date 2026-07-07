# Implementación — UX-21 (Frontend)

**Feature:** UX-21 — Validar unicidad de nombre de servicio en el catálogo (error inline en el formulario).
**Archivo tocado:** `apps/client/src/components/ServicioModal.tsx` (único archivo modificado).

## Diff resumido

1. Import agregado: `import axios from "axios";` (junto al resto de imports de librerías externas, respetando el orden de `.claude/rules/frontend.md §7`).
2. `useForm<ServiceFormData>()`: se agregó `setError` a la destructuración (`const { register, handleSubmit, formState: { errors }, reset, setError } = useForm<ServiceFormData>({...})`).
3. `onError` de la `useMutation` de crear/editar servicio, reemplazado de:
   ```ts
   onError: (error) => handleApiError(error, 'Error al guardar el servicio')
   ```
   a:
   ```ts
   onError: (error) => {
       const message = axios.isAxiosError(error) ? error.response?.data?.error : undefined;
       if (message === 'Ya existe un servicio activo con este nombre.') {
           setError('name', { type: 'manual', message });
           return;
       }
       handleApiError(error, 'Error al guardar el servicio');
   }
   ```
4. No se tocó el JSX del bloque de error inline de `name` — ya existía (`errors.name && <span className="flex items-center gap-1 text-xs text-maison-red mt-1 font-medium"><FiAlertCircle /> {errors.name.message}</span>`) y react-hook-form lo repinta automáticamente al llamar `setError('name', ...)`.
5. Fallback (`handleApiError(error, 'Error al guardar el servicio')`) preservado sin cambios para cualquier otro caso de error (validación de express-validator, 500, error de red, etc.) — se ejecuta solo si el `return` anterior no se disparó.

## Decisiones técnicas

- **Import de axios:** se usó `import axios from 'axios'` (igual convención que `apps/client/src/libs/axios.ts`) para acceder al type guard `axios.isAxiosError(error)`. No se reutilizó el `isAxiosError` interno de `errorHandler.ts` porque no está exportado (es una función privada del módulo) — traer axios directo es más simple y no requiere tocar `errorHandler.ts`.
- **Match exacto, sin `includes`:** se comparó `message === 'Ya existe un servicio activo con este nombre.'` (igualdad estricta), tal como pidió el encargo, para evitar falsos positivos con otros errores 400 del mismo endpoint (ej. errores de validación de `defaultTouchupDays`/`duration`).
- **No duplicar error (toast + inline):** cuando el mensaje matchea el contrato de duplicado, se hace `return` inmediatamente después de `setError`, sin llegar a `handleApiError`. Cualquier otro error sigue yendo a `handleApiError` (toast), sin cambios de comportamiento previo. Cumple `.claude/rules/frontend.md §5`.
- **Estilo del error inline:** no se creó ningún componente ni clase nueva — se reutilizó el bloque JSX ya existente para `errors.name` (líneas originales 86-90), que ya usa el patrón trifecta implícito de error de campo (color rojo `text-maison-red` + icono `FiAlertCircle` + texto). No hizo falta copiar de `ProductoModal.tsx`/`ClienteModal.tsx` porque `ServicioModal.tsx` ya tenía el bloque de error inline para el campo `name` (solo le faltaba una fuente de error del backend, que ahora se conecta vía `setError`).
- **Sin cambios en `serviceApi.ts`:** los wrappers Axios (`createService`/`updateService`) ya propagan el `AxiosError` intacto hasta el `onError` de la mutation, tal como confirmó el explorer.

## Confirmación de contrato

El string de match en frontend es:
```
'Ya existe un servicio activo con este nombre.'
```
Coincide **carácter por carácter** (incluye el punto final) con el contrato acordado con el implementer de backend:
```
HTTP 400 { error: 'Ya existe un servicio activo con este nombre.' }
```

## Resultado de build / lint

- `pnpm --filter @estetica/client build` → **Exit Code 0**. `tsc -b && vite build` compiló sin errores de TypeScript. Warning preexistente de tamaño de chunk (>500kB, `dist/assets/index-*.js`) no relacionado con este cambio.
- `pnpm --filter @estetica/client lint` → **Exit Code 1**, pero el único `error` reportado es el preexistente y fuera de alcance:
  ```
  apps\client\src\components\ProductoModal.tsx
    37:25  error  'stock' is assigned a value but never used  @typescript-eslint/no-unused-vars
  ```
  `ServicioModal.tsx` no aparece en la salida de ESLint (ni error ni warning) — el archivo modificado está limpio. Los demás warnings listados (`ProfesionalModal.tsx`, `RegistroModal.tsx`, `Negocio.tsx`, `Turnos.tsx` — todos "Compilation Skipped: incompatible library" de React Compiler por uso de `watch()`) son preexistentes y no relacionados con este cambio ni con el archivo tocado.

## Alcance

No se tocó `apps/server/`. No se modificó `feature_list.json` (el estado de UX-21 queda a criterio del reviewer). No se modificaron otros archivos del frontend.
