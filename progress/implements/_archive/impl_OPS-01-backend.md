# Implementación OPS-01 (backend) — endpoint público /api/health

## Estado: código completo, build BLOQUEADO por entorno (ver sección "Bloqueo")

## Archivo modificado
`apps/server/src/server.ts`

## Diff resumido

Se agregó el siguiente bloque **antes** de `app.use(clerkMiddleware())` (línea 44 original), es decir, antes de cualquier middleware de autenticación/tenancy:

```ts
// OPS-01: healthcheck público, sin ningún middleware de auth ni acceso a Mongoose.
// Solo confirma que el proceso Node está vivo (para que un cron externo evite
// que Render suspenda la instancia en el plan free por inactividad).
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use(clerkMiddleware())
```

No se tocó ninguna otra ruta, middleware, controller, route file ni modelo. No se creó ningún archivo nuevo. No hay consulta a Mongoose ni a ningún modelo en el handler.

## Decisión técnica: ubicación de la ruta

Se colocó **antes** de `app.use(clerkMiddleware())` (y por lo tanto antes de `checkAdminAccess`/`checkTenantAccess`, que se aplican por-router más abajo) para garantizar que `/api/health` sea 100% público: ningún middleware de Express se ejecuta sobre esta request antes de llegar al handler final, salvo `cors` y el parser de body (ambos inocuos y sin efectos de auth). Esto cumple el requisito de que un cron externo (cron-job.org) golpee el endpoint sin necesitar credenciales ni JWT de Clerk.

El handler es inline y sigue el mismo estilo que el `app.get('/api', ...)` preexistente (mismo bloque de código, sin controller/route separado), tal como pedía la tarea.

## Resultado del build: BLOQUEADO (no es un fallo del código de OPS-01)

Comando ejecutado:
```
pnpm --filter @estetica/server build
```

Resultado: **Exit code 1**, pero por un problema de entorno preexistente y ajeno al cambio de OPS-01:

```
Error: Cannot find module 'C:\Users\lauta\Documents\Proyectos\Cetzz Labs\Estetica-system\apps\server\node_modules\typescript\bin\tsc'
```

### Causa raíz diagnosticada
Todos los symlinks dentro de `apps/server/node_modules/*` (no solo `typescript` — se verificó también `express`, `mongoose`, `@clerk/express`, `express-validator`, `cors`) apuntan a la ruta absoluta:

```
C:\Users\lauta\Documents\Proyectos\Cetzz Labs\Estetica-system-monorepo\node_modules\.pnpm\...
```

Esa carpeta (`Estetica-system-monorepo`) **ya no existe** en el filesystem — el repo actual vive en `...\Cetzz Labs\Estetica-system` (sin el sufijo `-monorepo`). Es decir, el `node_modules` fue generado (fecha de los symlinks: 9 y 16 de junio) cuando el directorio del repo tenía otro nombre, y quedó con rutas absolutas rotas tras el rename/reclone posterior. Esto afecta **todo** `apps/server` (y probablemente `apps/client`), no algo introducido por este cambio — el build hubiera fallado igual sin tocar `server.ts`.

### Por qué no lo resolví yo mismo
La corrección requiere `pnpm install` a nivel de monorepo para regenerar los symlinks de `node_modules` en base al `pnpm-lock.yaml` existente (no agrega ni cambia ninguna dependencia, solo repara el linking). Sin embargo:
- Es una operación que excede el sandbox de `apps/server/` (toca el `node_modules` raíz y de todos los workspaces).
- La regla dura del arnés prohíbe explícitamente ejecutar `pnpm install`/`npm install` sin aprobación humana explícita, incluso cuando no agrega dependencias nuevas.
- No es un problema catastrófico de mi código — es un problema de infraestructura del entorno que requiere intervención humana o del Leader.

Por lo tanto, siguiendo el protocolo de "Gestión de Bloqueos", no improvisé un workaround (no reescribí symlinks manualmente ni ejecuté `pnpm install` por mi cuenta) y marqué la tarea como bloqueada en `progress/current.md`.

## Qué falta para cerrar OPS-01
1. Alguien con permiso (humano o Leader) corre `pnpm install` en la raíz del monorepo para regenerar los symlinks de `node_modules`.
2. Re-ejecutar `pnpm --filter @estetica/server build` — debería salir exit code 0, dado que el único cambio de código (`server.ts`) es un `app.get` inline sin dependencias nuevas ni tipos complejos.
3. Si el build pasa, el `reviewer` puede auditar el endpoint contra `CHECKPOINTS.md` (verificar: sin auth, sin acceso a DB, no rompe rutas existentes) y marcar OPS-01 `done` en `feature_list.json`.

## Verificación manual del código (sin build)
Revisión visual de `apps/server/src/server.ts`: el bloque agregado es sintácticamente válido TypeScript/Express, consistente con el patrón existente (`app.get('/api', (req, res) => { res.send('Hello World!') })`), sin imports nuevos, sin nuevas dependencias, sin acceso a `mongoose` ni a ningún modelo.
