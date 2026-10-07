# Migración: `GET /api/clientes` paginado (UX-92)

## Antes

```
GET /api/clientes  →  Client[]   (todos los activos del tenant)
```

## Después

```
GET /api/clientes?page=1&limit=7&search=
  →  { data: Client[], meta: { total, page, limit, totalPages } }

GET /api/clientes/opciones?search=&limit=20   →  [{ _id, firstName, lastName, phone }]
GET /api/clientes/opciones?ids=a,b,c          →  idem, hasta 50 ids (incluye inactivos)
```

- `limit`: entero 1..100 (default 7). `search`: nombre, apellido o teléfono (regex escapado).
- Selects/pickers de cliente: usar `/opciones` con búsqueda server-side, nunca la lista completa.

## Pasos de actualización (cliente)

1. Tablas: `getClientsPage(params)` y leer el total de `meta.total`.
2. Pickers: `getClientOptions({ search, limit })`; para un cliente ya elegido, `getClientOptions({ ids })`.
