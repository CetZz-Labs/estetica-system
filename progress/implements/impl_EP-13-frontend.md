# impl_EP-13-frontend — Rediseño visual de Turnos + fix de bug de vista del calendario

## Archivos modificados
- `apps/client/src/views/Turnos.tsx` (único archivo tocado, dentro del sandbox `apps/client/`)

## Bug corregido

**Síntoma reportado:** al entrar a Turnos y presionar "Mes" el calendario se recargaba y seguía en semana; estando en vista mes, prev/next regresaba a semana.

**Causa raíz:** el `useQuery` de appointments usaba `queryKey: ['appointments', dateRange.start, dateRange.end]`. Cada `datesSet` de FullCalendar (cambio de vista o navegación) cambiaba `dateRange`, lo cual generaba un queryKey nunca pedido antes → `isLoading: true` sin datos → el ternario de render desmontaba por completo `<FullCalendar>` → al re-montar con datos, usaba el prop fijo `initialView="timeGridWeek"`, perdiendo la vista elegida.

**Fix aplicado:**
- `placeholderData: keepPreviousData` (de `@tanstack/react-query`) en el `useQuery` de appointments: mantiene los datos anteriores visibles mientras llega el nuevo rango, por lo que `isLoading` solo es `true` en la carga inicial real. `<FullCalendar>` ya no se desmonta en cambios de vista/fecha.
- Se agregó `professionalFilter` al `queryKey` (estaba en el `queryFn` pero faltaba en la key — bug latente de caché incorrecta entre filtros de profesional).
- Indicador sutil de refetch en segundo plano vía `isFetching` (badge de texto "Actualizando...", sin spinners ni animaciones externas, conforme a `docs/design.md` §9).

## Rediseño visual aplicado
- Chips de evento del calendario (mes y semana) ahora incluyen ícono `react-icons/fi` por estado (`FiClock` pendiente, `FiCheck` confirmado, `FiX` cancelado, `FiCheckCircle` completado) vía `eventContent`, además del color de fondo y el texto — cumple la Trifecta de Accesibilidad (Checkpoint C6).
- Mismo ícono de estado reutilizado en el badge de estado del modal de detalle.
- Ajustes de estilo de grilla (bordes, número de día, header) usando solo tokens de `docs/design.md` §2.
- Filtro de profesional migrado al patrón de Input (`docs/design.md` §4.4) en vez de mezclar clases de card/botón.
- Footer del modal de detalle de turno simplificado con jerarquía de acciones:
  - Primaria destacada: "Completar y Registrar" (botón verde con ícono, mayor peso visual — acción de mayor valor de negocio).
  - Secundarias degradadas a icon-button con `aria-label` y `title`: Editar (`FiEdit2`), Cancelar (`FiTrash2`).
  - Se eliminó el botón "Cerrar" redundante con el `FiX` del header del `Modal` compartido.

## Resultado de verificación (ejecutado por el leader; el implementer fue bloqueado en Bash/Write durante su sesión)
- `pnpm --filter @estetica/client build` → **Exit code 0**.
- `pnpm --filter @estetica/client lint` → 1 error preexistente sin relación (`ProductoModal.tsx:37` variable no usada) y 2 warnings preexistentes (`Negocio.tsx`, y el mismo warning de `watch()` de react-hook-form que ya existía en `Turnos.tsx` antes de este cambio). **Ningún error nuevo introducido** por este diff.

## Nota de proceso
El subagente `implementer` completó el código (bugfix + rediseño) pero sus herramientas `Bash` y `Write` fueron denegadas en su sesión, impidiéndole correr el build/lint y escribir esta bitácora. El `leader` verificó el código resultante, ejecutó build y lint, y escribió este archivo (excepción permitida: minutas de `/progress`).
