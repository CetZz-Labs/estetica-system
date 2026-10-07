# Migración: `GET /api/productos` paginado (UX-91)

## Antes

```
GET /api/productos  →  Product[]   (todos los activos del tenant)
```

## Después

```
GET /api/productos?page=1&limit=7&search=&lowStock=true
  →  { data: Product[], meta: { total, page, limit, totalPages } }

GET /api/productos/stats     →  { total, lowStock, outOfStock }
GET /api/productos/opciones?search=&limit=20   →  [{ _id, name, brand, stock, currentUnitLevel }]
GET /api/productos/opciones?ids=a,b,c          →  idem, hasta 50 ids (incluye inactivos)
```

- `limit`: entero 1..100 (default 7). `lowStock=true`: stock <= 5. `sort=stock`: orden `{ stock: 1, brand: 1, name: 1 }` (sin param: brand, name).
- Los KPIs ya no se derivan de la lista: usar `/stats`.
- Selects/pickers de insumos: usar `/opciones` con búsqueda server-side, nunca la lista completa.

## Pasos de actualización (cliente)

1. Reemplazar `getProducts()` por `getProductsPage(params)` en tablas; leer el total de `meta.total`.
2. Reemplazar el cálculo de KPIs en memoria por `getProductStats()`.
3. Reemplazar los pickers por `getProductOptions({ search, limit })`; para items ya guardados en un registro, `getProductOptions({ ids })`.
