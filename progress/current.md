# Plan y Estado de la Sesión Actual

## Metadatos de la Sesión
- **Última actualización:** 2026-07-25
- **Sesión:** activa
- **Feature en curso:** ninguna — `UX-45` cerrada y aprobada en esta sesión

## Plan de Acción
- **`UX-44` cerrada definitivamente (2026-07-25, tras 2 rondas de fix)** y luego **reemplazada por
  completo por `UX-45`** en la misma sesión (ver historial): el ciclo de 9 rondas de animación del
  hero (UX-38..44 + 2 fix) fue descartado a pedido explícito del usuario, que pidió rediseñar la
  Landing desde cero con animaciones en toda la página, no solo el hero.
- **`UX-45` cerrada (2026-07-25, 1 ronda de exploración + 4 sub-lotes de implementación A→B→C→D +
  1 ronda de revisión final):** Landing reconstruida con dirección "Scroll Story" — 100% `motion`,
  sin WebGL/GSAP (se eliminaron `three`/`@react-three/fiber`/`@react-three/drei`/`gsap`/`@gsap/react`
  y `Hero3DScene.tsx`). Hero con reveal de título por palabra + blobs de fondo + stat cards con tilt
  3D vía CSS + CTAs con hover magnético; nueva franja de confianza (marquee); Features en bento grid
  con reveal por `clip-path`; Stats con conteo animado; "Cómo funciona" con línea de progreso ligada
  a scroll; CTA final con textura de puntos. Única relajación de `design.md`: `box-shadow` sutil solo
  en `:hover` de cards de Features. Reviewer: APROBADO (build/lint exit 0, bundle bajó de ~2579 kB en
  dos chunks a 1640.50 kB en uno solo). Detalle completo en `progress/history.md` (entrada 2026-07-25).
  Patrón nuevo extraído a `docs/patterns-frontend.md § P14` (gotcha de `useScroll`/`useGSAP` con
  `ref`/`target` detrás de un `return` condicional).
- **Ronda de fix de `UX-45` cerrada (2026-07-25):** el usuario probó la Landing en su navegador real
  (primera validación visual real de todo el ciclo) y reportó 4 cosas, todas corregidas y aprobadas:
  (1) sección Funcionalidades en blanco — el reveal por `clipPath` se reemplazó por `opacity`+`y`
  (patrón ya probado en el resto del archivo); (2) línea de "Cómo funciona" superpuesta al texto —
  resuelto con `z-index` explícito; (3) blobs del hero más rápidos (duraciones ~a la mitad) y 3
  nuevos (total 6); (4) íconos de `react-icons/fi` de las stat cards del hero y de Stats/"Impacto"
  reemplazados por 5 SVG a medida con animación perpetua (`components/landing/StatIcons.tsx`) —
  Funcionalidades no se tocó. El reviewer de paso detectó y reparó un `feature_list.json` inválido
  (error propio del leader al editar el `reopen_note`, ver lección de proceso en `history.md`).
- **Ronda de fix2 de `UX-45` cerrada (2026-07-25):** segundo refinamiento visual tras feedback en
  navegador real. (1) los SVG a medida de `StatIcons.tsx` se reemplazaron por íconos de
  `react-icons/pi` (Phosphor Duotone) más grandes, vía un wrapper único `AnimatedStatIcon`; (2) los
  blobs del hero ahora animan opacidad+escala además de posición, se sacó el parallax de scroll y el
  fondo decorativo se extendió para pasar detrás de `<TrustMarquee />`; (3) la línea de "Cómo
  funciona" es ahora un SVG serpenteante con `pathLength` ligado a scroll; (4) la card del CTA final
  tiene tilt 3D en hover (reutiliza `TiltCard`). Reviewer: APROBADO sin hallazgos, JSON de
  `feature_list.json` validado explícitamente tras la edición (lección de la ronda de fix anterior).
- **Pendiente de confirmación humana:** ningún reviewer de este entorno tiene navegador real — se
  recomienda al usuario correr `pnpm --filter @estetica/client dev` y confirmar que los 4 puntos
  quedaron resueltos a su gusto antes de dar el ciclo por completamente cerrado.
- **Quedan `pending` de antes, sin relación con `UX-45`** (`progress/plan_shear-redesign.md`):
  `UX-34` (Agenda, Servicios, Configuración, perfiles) y `UX-35` (limpieza final de alias-puente de
  tokens + cierre documental del ciclo).

## Estado del Backlog
- UX-45 Landing — rediseño integral desde cero + animaciones en toda la página → **done**
- UX-44 Landing — hero animación 3D (three.js/WebGL) + GSAP → **done** (dirección descartada por UX-45)
- UX-38..UX-43 Landing — ciclo de animación vistosa del hero (6 rondas) → **done**
- UX-37 Rediseño Shear Fase 2 (Landing pública) → **done**
- UX-36 Correcciones post-QA visual (nav, topbar, contraste) → **done**
- UX-33 Rediseño Shear Etapa 3 (Dashboard, tablas, listados) → **done**
- UX-32 Rediseño Shear Etapa 2 (shell, topbar, fin modo oscuro) → **done**
- UX-31 Rediseño Shear Etapa 1 (fundación CSS) → **done**
- UX-30 Historial general de visitas (nueva vista propia) → **done**
- UX-29 Alinear leyenda de profesionales a la derecha del filtro, misma altura (Turnos.tsx) → **done**
- UX-28 Editar fecha de retoque desde el modal de detalle del Dashboard → **done**
- UX-27 Bug: "próximo retoque" aceptaba fechas pasadas → **done**
- EP-17-b Migrar envío de mails de SMTP por-tenant a SMTP global de la app → **done**
- UX-26 Bug: tooltip de hover del calendario detrás de otros elementos → **done**
- UX-24 Bug visual: Select de hora recortado por el modal → **done**
- UX-18 Rediseño visual del calendario (leyenda + colores sólidos + tooltip) → **done**
- UX-17 Selector de horario con slots de disponibilidad → **done**
- UX-23 Bug: duplicado de producto no excluía eliminados → **done**
- UX-21 Validar unicidad de nombre de servicio en catálogo → **done**
- UX-19 Eliminación rápida de producto en Inventario → **done**
- UX-22 Cerrar modal al clickear afuera (backdrop) → **done**
- UX-16 Modal de detalle al click en card de turno/retoque (Dashboard) → **done**
- UX-15 Crash de página en blanco al clickear un turno pasado (tachado) → **done**
- UX-14 Desfasaje horario al mostrar la hora de una visita/retoque → **done**
- UX-13 Retoques futuros ocultos cuando existe un retoque pendiente → **done**
- UX-12 Validación de fecha/hora al crear turnos → **done**
- EP-17 Recordatorio de turno por mail → **done**
- EP-16 Configuración de disponibilidad del negocio → done
- EP-15 Conversión de turno a visita registrada → done
- EP-14 Crear y gestionar turnos → done
- EP-13 Calendario visual de turnos → done
- EP-12 Acceso diferenciado por rol (RBAC) → done
- EP-11 Gestión de Profesionales agendables → done

### Pendientes
- UX-34 Rediseño Shear Etapa 4 (Agenda, Servicios, Config, perfiles)
- UX-35 Rediseño Shear Etapa 5 (limpieza de alias-puente + cierre)
- EP-18 a EP-22 Reportes (Fase 5)
- EP-23 a EP-25 Pagos (Fase 6)

## Bloqueos y Riesgos Conocidos
- **Sin validación visual humana UX-45 (2026-07-25):** la Landing reconstruida (marquee, bento grid,
  tilt de stat cards, línea de "Cómo funciona", CTA final) fue aprobada por el reviewer a nivel de
  código (build/lint/grep/no-regresión, lectura completa del archivo), pero no hay navegador real en
  este entorno para confirmar el resultado estético. Pedirle al usuario que la revise en
  `pnpm --filter @estetica/client dev` antes de considerar el ciclo definitivamente cerrado.
- **Deuda no bloqueante UX-45 (2026-07-25):** el backdrop `<div onClick>` del menú móvil de
  `Landing.tsx` (~línea 274) viola HTML semántico (`.claude/rules/frontend.md §3`), pero es
  preexistente a UX-45 (fuera de todos sus hunks) — candidato a limpieza si se retoma esa sección.
  El `whileHover` de las cards de Features no tiene guarda de `prefers-reduced-motion` — evaluado y
  aceptado por el reviewer como micro-interacción de usuario, no un loop automático.
- **Riesgo sistémico UX-31/UX-36 (2026-07-21):** el bug de colisión `bg-muted`+`text-muted-foreground`
  (mismo hex `--muted`) puede reaparecer en cualquier vista de UX-34 todavía sin migrar (Turnos,
  Profesionales, Negocio, Disponibilidad, ProfileClient, RegistroModal, Login, Register). Ver
  `docs/patterns-frontend.md` § P13.
- Pendiente de commit: todo el ciclo UX-31..UX-45 sigue sin commit propio (working tree). Evaluar
  commitear antes de que crezca más el diff acumulado.
- Deuda técnica UX-33 (2026-07-21, hallazgo del reviewer): `Clients.tsx` sigue sin paginación
  server-side (`getClients()` plano, filtrado client-side desde EP-02) — candidato a migración P1/P3.
- Deuda de higiene UX-33 (2026-07-21): `CargaMasivaClientesModal.tsx`/`CargaMasivaModal.tsx` tienen
  botones de footer sin `type="button"` explícito (preexistente, sin impacto funcional).
- Backfill manual de `tenantId` pendiente para datos legados (operativo, no bloquea desarrollo).
- Observación UX-05: `GET /api/profesionales` expone `inviteToken` e `inviteTokenExpiry`. Candidato a `select('-inviteToken -inviteTokenExpiry')`.
- Deuda UX-09: `window.confirm` pre-existente en `handleCancelTouchup` (Dashboard.tsx) y `handleDelete` (ProfileClient.tsx) — violación GOV-CLIENT mandate 3, pendiente.
- Deuda EP-11-fix (2026-07-01): `PUT /api/profesionales/:id` no valida `confirm` con `express-validator` como sí hace el `DELETE` — asimetría de higiene, sin riesgo de seguridad.
- Deuda EP-17 (2026-07-01): sin tests automatizados para `mailService.ts`/`reminderScheduler.ts`.
- Riesgo EP-17 (2026-07-01): `pnpm --filter @estetica/server test` falla en este sandbox por un problema de entorno (descarga del binario de `mongodb-memory-server`), no por regresión de código.
- Limitación conocida UX-12 (2026-07-06, decisión de producto): la validación de superposición de turnos NO corre cuando el turno no tiene `professional` asignado. Riesgo aceptado explícitamente por el usuario.
- Deuda técnica UX-13 (2026-07-06): un `ServiceRecord` `pending` con `nextTouchupDate` null/ausente nunca se auto-completa automáticamente.
- Deuda de higiene UX-13 (2026-07-06): lógica de auto-completado de retoques duplicada en `serviceRecordController.ts` y `appointmentController.ts`.
- Deuda de higiene UX-14 (2026-07-06): `Turnos.tsx:527,733` formatea hora con `toLocaleTimeString` ad-hoc en vez de delegar en `formatDateTime`.
- Riesgo aceptado UX-14 (2026-07-06): datos históricos con offset horario incorrecto no migrados.
- Deuda EP-17-b (2026-07-08): `apps/server/src/utils/crypto.ts` queda sin consumidores tras la migración a SMTP global.
- Deuda técnica UX-30 (2026-07-10): `getClients`/`getServices`/`getProfessionals` (catálogos para selects) siguen sin paginar.
