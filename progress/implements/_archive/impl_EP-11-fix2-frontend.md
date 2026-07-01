# impl_EP-11-fix2-frontend — Fix: Modal.tsx footer empujado fuera del viewport

## Contexto
Bug reportado en el componente compartido `apps/client/src/components/ui/Modal.tsx`: con `children` (body) de mucho contenido — ej. el modal de conflicto de turnos futuros al desactivar una profesional en `apps/client/src/views/Profesionales.tsx` — el modal crecía sin límite de altura y el `footer` quedaba fuera del viewport, sin poder scrollear el body ni presionar los botones de acción.

## Causa raíz
El contenedor interno (`bg-maison-card border ... ${maxWidth} shadow-xl overflow-hidden ${containerClassName}`) no tenía `flex flex-col` ni `max-h`. El body tenía `overflow-y-auto` pero, al no estar dentro de un contenedor flex con altura acotada, nunca activaba el scroll: el contenedor entero crecía y empujaba el footer fuera de pantalla.

## Cambio aplicado
Archivo modificado: `apps/client/src/components/ui/Modal.tsx` (único archivo tocado).

1. **Contenedor interno** (línea ~52-54): se agregó `flex flex-col max-h-[90vh]` a las clases base, antes de interpolar `${containerClassName}` (para que cualquier `containerClassName` custom pasado por un consumidor pueda seguir sobreescribiendo/complementando).

   - Antes:
     ```
     className={`bg-maison-card border border-maison-border rounded-2xl w-full ${maxWidth} shadow-xl overflow-hidden ${containerClassName}`}
     ```
   - Después:
     ```
     className={`bg-maison-card border border-maison-border rounded-2xl w-full ${maxWidth} shadow-xl overflow-hidden flex flex-col max-h-[90vh] ${containerClassName}`}
     ```

2. **Body** (línea ~81): se agregó `flex-1 min-h-0` junto al `overflow-y-auto custom-scrollbar` ya existente, para que el hijo respete la altura del padre flex (crítico: sin `min-h-0` un hijo flex con `overflow-y-auto` ignora el límite de altura del padre y sigue creciendo).

   - Antes:
     ```
     <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar">
     ```
   - Después:
     ```
     <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
     ```

3. **Header y footer**: sin cambios — ya tenían `shrink-0`, lo cual ahora sí surte efecto real al estar dentro de un `flex flex-col` con altura acotada, quedando fijos arriba/abajo mientras el body scrollea.

## Comportamiento resultante
- Modales cortos (contenido que cabe sin problema): `max-h-[90vh]` nunca se activa (el contenido es menor a esa altura), por lo que el layout visual no cambia respecto al comportamiento previo.
- Modales largos: el contenedor nunca excede el 90% de la altura de la ventana; el body scrollea internamente (`overflow-y-auto` + `custom-scrollbar`); header y footer permanecen siempre visibles/fijos.

## Hallazgo (no corregido, fuera de alcance de la tarea)
Se detectaron 3 consumidores que ya traían un workaround manual para este mismo bug, pasando `containerClassName` con `flex flex-col max-h-[...]`:
- `apps/client/src/components/CargaMasivaClientesModal.tsx:140` → `containerClassName="flex flex-col max-h-[85vh]"`
- `apps/client/src/components/CargaMasivaModal.tsx:139` → `containerClassName="flex flex-col max-h-[85vh]"`
- `apps/client/src/components/RegistroModal.tsx:196` → `containerClassName="flex flex-col max-h-[90vh]"`

Con el fix aplicado, estas clases quedan duplicadas (mismo `flex flex-col`, `max-h` con valor 85vh o 90vh compitiendo contra el 90vh ahora aplicado por defecto en `Modal.tsx`). Al ser utilidades Tailwind de igual especificidad, cuál de las dos gana depende del orden de generación del CSS (no del orden en el `className`), lo cual es en principio impredecible determinísticamente a simple vista. **No afecta la funcionalidad**: en ambos casos el resultado sigue siendo `flex-col` + `max-h` entre 85vh y 90vh con el body scrolleable, por lo que el bug reportado no puede reaparecer — es solo redundancia de código. Se deja documentado para una futura limpieza (remover el `containerClassName` redundante en esos 3 archivos) fuera del alcance de esta tarea, que estaba explícitamente acotada a `Modal.tsx`.

## Verificación
- `pnpm --filter @estetica/client build` → **Exit code 0**. Sin errores de TypeScript ni de Vite.
  ```
  ✓ 695 modules transformed.
  ✓ built in 836ms
  ```
- `pnpm --filter @estetica/client lint` → **Exit code 1**, pero el único `error` reportado es el preexistente y ya documentado como deuda técnica en `ProductoModal.tsx:37` (`'stock' is assigned a value but never used`), no relacionado con este cambio. Los demás hallazgos son `warning` de React Compiler (`incompatible-library` por `watch()` de react-hook-form) en archivos no tocados por esta tarea. No se introdujeron errores ni warnings nuevos.

## Archivos modificados
- `apps/client/src/components/ui/Modal.tsx`
