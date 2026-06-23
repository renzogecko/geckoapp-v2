# 🦎 GeckoApp v2 — Bugs y Mejoras

> **Para Claude / agentes:** este archivo es la lista viva de pendientes del
> sistema. Funciona como un tablero de tareas. Reglas obligatorias al final.

---

## 🔴 CRÍTICOS — afectan cálculo de precios o pérdida de datos

### [BUG-001] Polifán: cálculo de corte da $3.8M por 1m²
- **Sección:** Cotizadores › Gráfica › Montado sobre rígido
- **Síntoma:** 1m × 1m de polifán 30mm con corte 1500ml devuelve $3.853.089.
- **Causa probable:** material sin `precioCorteMl` → fallback inventa número.
- **Fix esperado:** si falta parámetro, auditor muestra "FALTA PARÁMETRO" y devuelve $0.
- **Reportado:** 22/06/2026
- **Estado:** 🔴 Pendiente

### [BUG-002] Cotizador Gráfica/Corte: no llegan precios de Transfer y Ploter
- **Sección:** Cotizadores › Gráfica › Corte
- **Síntoma:** Transfer y Ploter 60cm/120cm no traen precio.
- **Causa probable:** lookup por nombre exacto, IDs cambiaron tras re-importación.
- **Fix esperado:** revisar lookup, normalizar nombre o migrar a búsqueda por id.
- **Reportado:** 22/06/2026
- **Estado:** 🔴 Pendiente

---

## 🟡 IMPORTANTES — datos o UI rotos, no bloquean operar pero degradan la experiencia

### [BUG-003] Parámetros de corte láser/CNC vaciados
- **Sección:** Configuración › Parámetros Láser/CNC
- **Síntoma:** todos los switches "¿Se puede cortar con láser?" en OFF, tabla vacía.
- **Causa:** REPLACE INTO pisó `tieneParametrosCorte=false` desde el JSON.
- **Fix esperado:** decidir si restaurar manualmente o si el JSON los traía y reprocesar.
- **Reportado:** 22/06/2026
- **Estado:** 🟡 Pendiente

### [BUG-004] Productos Gecko con precio fijo no guardan precio venta
- **Sección:** Materiales › Nuevo Insumo (estrategia FIJA)
- **Síntoma:** "Precio venta sugerido" se guarda en $0, solo persiste "Precio gremio".
- **Reportado:** 22/06/2026
- **Estado:** 🟡 Pendiente

### [BUG-005] Servicios: botones editar y borrar no responden
- **Sección:** Materiales › Servicios & Mano de Obra
- **Síntoma:** clic en lápiz o tachito no hace nada.
- **Causa probable:** IDs cambiaron tras re-importación, handlers buscan id inexistente.
- **Reportado:** 22/06/2026
- **Estado:** 🟡 Pendiente

### [BUG-006] Modal editar servicio no trae datos pre-cargados
- **Sección:** Materiales › Servicios & Mano de Obra › Editar
- **Síntoma:** formulario abre vacío en lugar de con los datos del servicio.
- **Causa probable:** relacionado con BUG-005.
- **Reportado:** 22/06/2026
- **Estado:** 🟡 Pendiente

---

## 🔵 MEJORAS — rediseño visual de Reportes (no son bugs, son features pendientes)

### [MEJ-001] Punto de Equilibrio (card hero en Reportes)
- **Sección:** Finanzas › Reportes
- **Descripción:** nueva card arriba de todo. Muestra PE en $, PE en OTs, barra de progreso facturado vs PE, footer con costos fijos / margen contribución / % avance del mes.
- **Cálculo:** PE en $ = costos fijos / margen contribución. PE en OTs = PE en $ / ticket promedio.
- **Diseño:** fondo `rgba(241,90,36,0.07)`, borde `rgba(241,90,36,0.35)`.
- **Estado:** 🔵 Pendiente

### [MEJ-002] Count-up animado en métricas
- **Sección:** Finanzas › Reportes
- **Descripción:** Ticket Promedio, Tasa de Cierre, Dinero Estancado y Rubro+Rentable animan el número de 0 al valor real con easing al cargar la sección.
- **Estado:** 🔵 Pendiente

### [MEJ-003] Card "Rubro más rentable"
- **Sección:** Finanzas › Reportes
- **Descripción:** card chiquita con el rubro de mayor margen real (no volumen). Cálculo: (ingresos rubro − costos insumos rubro) / ingresos rubro.
- **Estado:** 🔵 Pendiente

### [MEJ-004] Blindar tablas `servicios` y `clientes`
- **Sección:** gecko-api.js
- **Descripción:** aplicar misma protección que ya tiene `gecko_materiales` (agregar al array `GECKO_CATALOG_KEYS`).
- **Estado:** 🔵 Pendiente

---

## ✅ RESUELTOS — historial (no borrar, sirve de referencia)

### [RES-001] Mix de Ventas reportaba "Industrial 8" fantasma
- **Resuelto:** 22/06/2026
- **Cómo:** eliminado override binario viejo en gecko-fixes.js, render canónico por `it.tipo` con 6 rubros separados en main.js.
- **Commit:** `28d9c20`

### [RES-002] Gráficos de Reportes planos sin animación
- **Resuelto:** 22/06/2026
- **Cómo:** integrado Chart.js desde jsDelivr, área animada para Ingresos por Categoría y donut para Mix de Ventas con paleta unificada.
- **Commit:** `748212f`

### [RES-003] Materiales se borraban de la base por sincronización
- **Resuelto:** 22/06/2026
- **Cómo:** agregado array `GECKO_CATALOG_KEYS` en gecko-api.js, los catálogos ya no se borran por diff. Borrado intencional via `window.geckoApiEliminar()`.

### [RES-004] Botón Importar recargaba antes de sincronizar a MySQL
- **Resuelto:** 22/06/2026
- **Cómo:** import ahora await `window.geckoSyncQueue()` antes de `location.reload()`.

### [RES-005] Pérdida de 44 materiales y 16 servicios de MySQL
- **Resuelto:** 22/06/2026
- **Cómo:** restauración por SQL directo (REPLACE INTO) desde JSON de backup. Tabla restaurada a 67 materiales y 38 servicios.

---

## 📋 Reglas de mantenimiento de este archivo (OBLIGATORIO para el agente)

### Cuando Renzo reporta un bug o pide una mejora
1. Agregarlo en la sección que corresponda (🔴 / 🟡 / 🔵).
2. Asignarle un ID correlativo (BUG-XXX o MEJ-XXX).
3. Completar todos los campos del template (sección, síntoma, causa probable, fecha).
4. Confirmarle a Renzo: "Agregado como BUG-XXX al archivo".

### Cuando Renzo dice "está resuelto X" / "ya anda" / "ok funcionó"
1. **MOVER** el ítem desde su sección actual a la sección ✅ RESUELTOS.
2. Cambiar el prefijo BUG/MEJ por RES.
3. Agregar fecha de resolución y resumen del fix.
4. Si hay commit relacionado, anotarlo.
5. **No borrar el ítem** — queda como historial.
6. Hacer commit del cambio: `git add BUGS_Y_MEJORAS.md && git commit -m "Resuelve BUG-XXX: descripcion corta" && git push origin main`.

### Al inicio de cada sesión nueva
1. Leer este archivo completo.
2. Empezar la conversación con un resumen: "Tenés N bugs críticos, N importantes y N mejoras pendientes. ¿Por cuál arrancamos?"

### Antes de cerrar una sesión
1. Si hubo cambios en bugs (resueltos, nuevos, edits), commitear este archivo.
2. Verificar que el estado refleje la realidad (no dejar bugs cerrados marcados como pendientes ni viceversa).

---

*Última actualización: 22 de junio 2026.*