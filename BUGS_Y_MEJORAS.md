# 🦎 GeckoApp v2 — Bugs y Mejoras

> **Para Claude / agentes:** este archivo es la lista viva de pendientes del
> sistema. Funciona como un tablero de tareas. Reglas obligatorias al final.

---

## 🔴 CRÍTICOS — afectan cálculo de precios o pérdida de datos

### [BUG-001] Precio de nuevo materiales, CAtegoria productos gecko 
- **Sección:** Materailes
- **Descripción:** Cuando cargo un nuevo material, le pongo los precios de venta y gremio, en el modal solo se mantiene el de gremio el de publico se borra  | en la lista los dos valores permanecen en $0 
- **Estado:** 🔴 Pendiente

### [BUG-003] Modale cliente - edicion  
- **Sección:** clientes 
- **Descripción:** Al entrar a editar un cliente no se puede cambiar el nombre, esta bloqueado. Deberia poder modificarse 
- **Estado:** 🔴 Pendiente


### [BUG-003] Valor de cotizacion de dolar - en confoguraciones y en modal de materiales,
- **Sección:** configuracion - modal Materiales
- **Descripción:** el valor de la configuracion deberia estar linkeado con una api para mantenerse actualizada, de manera automatica, o en su defecto un boton para actualizarlo manualmente.
Por el lado del modal de materiales , en la seccion de costo que tiene una calculadora automatica , eso esta harcodeado en 1420 hoy , pero ese valor se bee actualizar con el valor actual del dolar ya se por api o por un boton de actualizar. Elegir la mejor opcion 
- **Estado:** 🔴 Pendiente
 
---

## 🟡 IMPORTANTES — datos o UI rotos, no bloquean operar pero degradan la experiencia

### [BUG-003] Parámetros de corte láser/CNC vaciados ⏳ PENDIENTE
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

### [BUG-007] Modal confirm() nativo en eliminar material/servicio no se reemplaza
- **Sección:** Materiales › Servicios & Mano de Obra / Materiales
- **Síntoma:** override de `confirm()` en gecko-fixes.js no toma efecto; main.js carga después y pisa el override.
- **Causa probable:** orden de carga — main.js se ejecuta después de gecko-fixes.js y redefine las funciones.
- **Fix esperado:** investigar orden de carga o mover el fix a un setTimeout en gecko-fixes.js.
- **Reportado:** 23/06/2026
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

### [MEJ-005] Materiales
- **Sección:** Materiales
- **Descripción:** agregar una categoria para los materiales que son de impresion, para poder filtrarlos mas rapido. 
- **Estado:** 🔵 Pendiente

### [MEJ-006] En materailes / categoria nueva "impresos"
- **Sección:** Nueva categoria en materiales impresos. 
- **Descripción:** en esta seccion los precios van de manera manual, pero quiero que en paralelo se calcule un valor en dolares para saber cuando esta al cambio. Pero tambien me gustaria que a la hora de actualizar los precios, podamos hacerlo desde ese valor de dolar. (funcionamiento similar al del campo de los multiplicadores cuando esta el toggle actiado en el modo FIJA (precio de mercado) donde ese campo se calcula automatico con el margen de ganancia real, pero en este casi seria, cuanto equivaldria en dolares
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

### [RES-006] Polifán: cálculo de corte da $3.8M por 1m²
- **Resuelto:** 23/06/2026
- **Cómo:** búsqueda flexible de servicios en corte.js resolvió el fallback incorrecto. Función `_geckoFindServicioPorKeywords()` busca por keywords ignorando mayúsculas/espacios.
- **Era:** BUG-001

### [RES-007] Cotizador Gráfica/Corte: no llegan precios (Transfer, Ploter 60cm, 120cm)
- **Resuelto:** 23/06/2026
- **Cómo:** función `_geckoFindServicioPorKeywords()` en corte.js — búsqueda por keywords ignorando mayúsculas/espacios, reemplazando el lookup por nombre exacto.
- **Era:** BUG-002

### [RES-008] Servicios: botones editar y borrar no responden
- **Resuelto:** 23/06/2026
- **Cómo:** ID type mismatch resuelto en gecko-fixes.js — comparación con `String()` para unificar tipos.
- **Era:** BUG-005

### [RES-009] Modal editar servicio no trae datos pre-cargados
- **Resuelto:** 23/06/2026
- **Cómo:** relacionado con BUG-005/RES-008; fix de ID type mismatch en gecko-fixes.js resolvió también el formulario vacío.
- **Era:** BUG-006

---

## Sesión 23/06/2026 — Fixes aplicados

### ✅ Resueltos
- Bug 1 + Bug 2: Búsqueda flexible servicios en corte.js (ploter, transfer, polifán)
- Decimales excesivos en auditor: corporeos.js, laser.js, grafica.js, corte.js (toFixed(4)→parseFloat toFixed(2))
- Bug 5/6: Botones editar/borrar servicios — ID type mismatch resuelto en gecko-fixes.js

### ⚠️ Pendiente de fix (próxima sesión)
- Modal confirm() nativo en eliminar material y eliminar servicio — override en gecko-fixes.js no toma efecto, main.js carga después y pisa. Investigar orden de carga o mover fix a setTimeout.
- Bug 4: Precio fijo no guarda precioVenta
- Bug 3: Parámetros láser vaciados

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

*Última actualización: 23 de junio 2026.*
