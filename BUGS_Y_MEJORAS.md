# 🦎 GeckoApp v2 — Bugs y Mejoras

> **Para Claude / agentes:** este archivo es la lista viva de pendientes del
> sistema. Funciona como un tablero de tareas. Reglas obligatorias al final.

---

## 🔴 CRÍTICOS — afectan cálculo de precios o pérdida de datos

### [BUG-002] Presupetador - IVA
- **Sección:** presupetador 
- **Descripción:** En el presupuestador manual, cuando activo el toggle de IVA , se suma 21% al total, pero cuando guardo el presupusto, no se suma en el pdf. 
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

## Sesión 03/07/2026 — Cotizadores (Pintura, Corte y Montado)

**Resueltos hoy:**
- ✅ Nueva tarjeta "Acabado de pintura" (con toggle apagado por defecto y 
  multicarga) agregada a 3 cotizadores: Impresión 3D, Chapa/Acrílico y 
  Letras 3D. El área a pintar se estima automáticamente según el peso 
  (Impresión 3D y Letras 3D) o según Fleje+Frente (Chapa/Acrílico), con 
  factores configurables en Configuración → Costos Operativos.
- ✅ Nueva tarjeta "Frente" en Letras 3D — permite elegir un material 
  rígido aparte (con corte láser opcional) o marcar "Frente 3D integrado" 
  (que sí suma peso extra estimado a la impresión, con un factor 
  configurable propio).
- ✅ Nuevo interruptor "¿Lleva servicio de corte láser?" en el Frente de 
  Chapa/Acrílico y Letras 3D (apagado por defecto) — antes el corte se 
  sumaba siempre automáticamente, ahora es opcional para los casos donde 
  el material va sin cortar (ej: fondos para retroiluminar).
- ✅ Bug crítico: el corte del Frente en Chapa/Acrílico y Letras 3D no 
  encontraba el precio porque buscaba solo en una lista vieja de 
  Servicios (vacía) — corregido para que revise primero el precio propio 
  del material (precioCorteMl), igual que ya hacía bien Polifán.
- ✅ Bug crítico: "Montado en Rígidos" (Gráfica → Impresión y Gráfica → 
  Corte) calculaba el corte con un precio inventado y fijo ($2.500/ml) 
  sin importar el material — corregido para usar el precio real de corte 
  de cada material. Si el material no tiene ese dato cargado, ahora 
  muestra "FALTA PARÁMETRO" en la línea del Auditor en vez de un número 
  inventado (Regla R4).
- ✅ Bug: la línea "Montado sup." en el Auditor de Gráfica → Impresión 
  mostraba $0 aunque el Total del ítem sí sumaba el monto correcto — el 
  Total nunca estuvo mal, era solo la línea visual que buscaba el precio 
  en el campo equivocado (precioVenta en vez de precio/precioVenta).
- ✅ Base de datos: 16 materiales con precio de corte láser cargado 
  tenían el interruptor tieneParametrosCorte apagado por una 
  re-importación SQL vieja (bug ya documentado) — corregido con un 
  UPDATE directo en MySQL, sin pérdida de datos (el precio nunca se 
  había borrado, solo estaba oculto).

**Pendientes / Mejoras identificadas hoy:**
- ⏳ Sospecha de bug dormido: el corte del Fleje en Chapa/Acrílico usa un 
  método de búsqueda distinto y más antiguo (window.getGeckoItem con 
  nombre armado a mano) que probablemente tiene el mismo problema que 
  tenía el Frente — no confirmado todavía, pendiente de revisar.
- ⏳ BUG-003 (cotización del dólar hardcodeada) sigue pendiente.
- ⏳ Sospecha de código muerto: confirmarPagoGlobalCliente en main.js 
  (modal antiguo), pendiente de diagnóstico.

**Prioridad recomendada para la próxima sesión:**
1. Confirmar y resolver el corte del Fleje en Chapa/Acrílico.
2. BUG-003 (cotización del dólar).

---

## Sesión 01/07/2026 (continuación) — Finanzas y Clientes

**Resueltos hoy:**
- ✅ Historial de Cajas — nuevo modal accesible con un ícono en cada 
  tarjeta de caja, muestra los últimos 100 movimientos de esa caja 
  específica.
- ✅ Bug: las tarjetas de cajas desaparecían al refrescar Finanzas o 
  cerrar un modal — causado por un conflicto entre el ícono nuevo de 
  historial y la detección del botón "+ Nueva Caja". Corregido usando 
  un selector que busca solo hijos directos del contenedor.
- ✅ Regla R3 completada: geckoServicios y clientes blindados en 
  GECKO_CATALOG_KEYS (antes solo materiales lo estaba). El borrado 
  intencional de servicios y clientes ahora usa geckoApiEliminar de 
  forma explícita, en vez de depender de la sincronización automática.
- ✅ Código muerto eliminado: las 2 versiones viejas de renderClientes 
  (main.js:3047 y gecko-fixes.js:3999) que nunca se ejecutaban. La 
  versión activa (_geckoRenderFijo) ahora se conecta inmediatamente al 
  cargar, sin depender del guardián por 500ms.
- ✅ Rediseño completo del modal Ficha de Cliente / Cuenta Corriente — 
  estilo oscuro Gecko, header con badge de scoring y rubro, 3 tarjetas 
  resumen (saldo, facturado del mes, trabajos activos), historial de 
  pagos real (últimos 15 + ver todos, ordenado por timestamp), 
  historial de trabajos entregados movido a un modal aparte, Total 
  Histórico eliminado de la ficha.
- ✅ Bug: al borrar un movimiento de pago de cliente, la caja se 
  corregía pero el saldo deudor del cliente no volvía a subir — 
  corregido guardando qué Orden de Trabajo recibió cada pago (y por 
  cuánto) dentro del propio movimiento, para poder revertirlo con 
  precisión al borrar. Los pagos anteriores a este cambio muestran un 
  aviso al borrarlos, indicando que hay que revisar el saldo a mano en 
  ese caso puntual.

**Pendientes / Mejoras identificadas hoy:**
- ⏳ BUG-003 sigue pendiente de resolución (cotización del dólar 
  hardcodeada en $1420, sin definir si va a ser automática por API o 
  manual).
- ⏳ Sospecha de código muerto: la función confirmarPagoGlobalCliente 
  en main.js (ligada a un modal antiguo modalPagoGlobal) podría ya no 
  usarse, similar al caso resuelto hoy con renderClientes. Pendiente 
  de diagnóstico con grep antes de tocar nada.

**Prioridad recomendada para la próxima sesión:**
1. BUG-003 (cotización del dólar).
2. Diagnóstico y eventual limpieza de confirmarPagoGlobalCliente.

---

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

### [RES-010] Materiales con estrategiaVenta FIJA mostraban $0 en la lista
- **Resuelto:** 24/06/2026
- **Cómo:** Causa raíz triple: (a) formMaterial no guardaba precioVenta, (b) MySQL no tenía columna precioVenta, (c) renderInsumos ignoraba m.precioVenta. Solución: columna precioVenta añadida a MySQL, api.php y gecko-api.js actualizados, interceptor en gecko-fixes.js captura el valor del campo matPrecioVentaManual antes del reset del formulario y lo inyecta post-save. DOM patch post-render corrige la visualización en tabla.
- **Era:** BUG-001 / BUG-004

### [RES-011] Botón editar en Servicios abría modal vacío
- **Resuelto:** 24/06/2026
- **Cómo:** Dos causas: (a) IDs string (ej: `laser_corte_cnc___chapa_iacma`) renderizados sin comillas en onclick → ReferenceError. (b) Comparación estricta `t.id === id` fallaba por type mismatch number vs string post-MySQL. Solución en gecko-fixes.js: `_geckoFixBotonesServicios` parchea onclicks post-render, override de `abrirModalTerminacion` usa `String(t.id) === String(id)` y lee directo de localStorage.
- **Era:** BUG-002

### [RES-012] Nombres de clientes bloqueados en modal de edición
- **Resuelto:** 26/06/2026
- **Era:** BUG-001

### [RES-013] Modal confirm() nativo en eliminar material/servicio no se reemplazaba
- **Resuelto:** 26/06/2026
- **Era:** BUG-007

### [RES-014] Servicios de corte láser se regeneraban automáticamente al eliminarlos
- **Resuelto:** 26/06/2026
- **Era:** BUG-004

### [RES-015] Configuración Grabados Láser — carga manual de servicio
- **Resuelto:** 26/06/2026
- **Era:** BUG-005

### [BUG-CON-001] Límite max_connections_per_hour MySQL
- **Resuelto:** 26/06/2026
- **Cómo:** conexiones PDO persistentes en db_config.php + debounce 2000ms en gecko-api.js + host cambiado a localhost.

### [BUG-AUTH-001] api.php bloqueaba todos los endpoints con $_SESSION['usuario'] incorrecta
- **Resuelto:** 26/06/2026
- **Cómo:** corregido a $_SESSION['gecko_user_id'] con endpoint auth excluido del chequeo.

### [BUG-DEV-001] Live Server redirigía al login en entorno local
- **Resuelto:** 26/06/2026
- **Cómo:** gecko-local.js creado con flag window._geckoLocalMode que bloquea redirects en gecko-fixes.js.

### [BUG-PRECIO-001] Precio de servicios editados no se guardaba (ni en pantalla ni en MySQL)
- **Resuelto:** 01/07/2026
- **Cómo:** en main.js, la comparación de ID usaba `===` estricto entre string y number (`t.id === parseInt(editId)`); cambiado a comparación por texto (`String(t.id) === String(editId)`).

### [BUG-SEED-001] Servicios de corte láser (11 ítems específicos) se regeneraban solos al borrarlos
- **Resuelto:** 01/07/2026
- **Cómo:** se eliminó la llamada automática a `api.php?endpoint=seed_laser` que se ejecutaba en cada carga de la app en gecko-api.js. El endpoint sigue existiendo en api.php por si se necesita usar manualmente en el futuro.

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

## Sesión 24/06/2026 — Fixes aplicados

### ✅ Resueltos
- RES-010 (ex BUG-001 / BUG-004): Materiales FIJA mostraban $0 — columna precioVenta añadida a MySQL, interceptor en gecko-fixes.js, DOM patch post-render.
- RES-011 (ex BUG-002): Botón editar Servicios abría modal vacío — IDs sin comillas en onclick + type mismatch resueltos en gecko-fixes.js.
- Persistencia de pestaña activa y filtro en sección Materiales.

### ⚠️ Nuevos pendientes
- BUG-003 (🟡): Parámetros láser/CNC vaciados — decidir si restaurar manualmente.
- BUG-004 (🟡): Servicios láser se regeneran al eliminarlos — implementar flag/lista de exclusión.
- BUG-005 (🟡): Grabados Láser sin carga manual — agregar formulario en Configuración.
- BUG-007 (🟡): Modal confirm() nativo — investigar orden de carga gecko-fixes.js vs main.js.

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

*Última actualización: 01 de julio 2026.*

---

### Sesión 01/07/2026

**Resueltos — Infraestructura y conexión:**
- ✅ Límite de max_connections_per_hour en MySQL — RESUELTO: conexiones 
  PDO persistentes en db_config.php, debounce 2000ms en gecko-api.js, 
  host cambiado a localhost.
- ✅ api.php bloqueaba todos los endpoints por clave de sesión 
  incorrecta ($_SESSION['usuario'] en vez de $_SESSION['gecko_user_id']) 
  — RESUELTO: api.php reescrito completo con la clave correcta y el 
  endpoint auth excluido del chequeo de sesión.
- ✅ Live Server (desarrollo local) redirigía al login constantemente — 
  RESUELTO: gecko-local.js con flag window._geckoLocalMode que bloquea 
  los redirects a login.html en gecko-fixes.js.

**Resueltos — Servicios y Materiales:**
- ✅ Servicios de corte láser se regeneraban solos al borrarlos (11 
  ítems específicos como "CORTE CNC - CHAPA IACMA") — RESUELTO: se 
  eliminó la llamada automática a api.php?endpoint=seed_laser que se 
  ejecutaba en cada carga de la app.
- ✅ Precio de servicios editados no se guardaba (ni en pantalla ni en 
  MySQL) — RESUELTO: en main.js, comparación de ID usaba === estricto 
  entre string y number, cambiado a comparación por texto.
- ✅ Mecanismo de "protección anti-borrado" en gecko-api.js no distinguía 
  entre tabla genuinamente vacía y error de conexión (401/500/timeout) 
  — RESUELTO: _apiGet ahora devuelve null en error real, y ese caso ya 
  no dispara la restauración automática de datos viejos del navegador.

**Resueltos — Finanzas (críticos, con dinero real de por medio):**
- ✅ Error 500 "Duplicate entry" al registrar señas — RESUELTO: 
  gecko-api.js expone window._geckoUpdateCache para mantener sincronizado 
  el caché interno cuando se guarda por fuera del flujo normal.
- ✅ Saldo Deudor en Ficha de Cliente no se actualizaba sin recargar 
  (F5) — RESUELTO: la variable listaPresupuestos de main.js se actualiza 
  directamente por su nombre (no como copia en window).
- ✅ Columna "Saldo Pendiente" en la tabla general de Clientes siempre 
  mostraba el total bruto, nunca restaba las señas pagadas — RESUELTO: 
  bug de tipeo en gecko-fixes.js (o.adelanto, campo que no existe) 
  corregido a o.sena, el campo real usado en todo el resto del sistema.
- ✅ Botón "Registrar Pago de Saldo" dentro de la Ficha de Cliente 
  tiraba error y no funcionaba — RESUELTO: dependía de un modal viejo 
  con IDs que ya no existen en el HTML; reescrito en gecko-fixes.js 
  como función autónoma.
- ✅ Orden de la lista de Movimientos en Finanzas no era realmente 
  cronológico (a veces el último movimiento no quedaba arriba) — 
  RESUELTO: se ordena ahora por el timestamp real guardado en el id de 
  cada movimiento. También se corrigió registrarMovimiento para que 
  siempre asigne un id con timestamp (antes, los pagos desde la Ficha 
  de Cliente no tenían id y quedaban mal ordenados).

**Pendientes / Mejoras identificadas hoy:**
- ⏳ Historial de pagos parciales dentro de la Cuenta Corriente de cada 
  cliente (hoy dice "No hay historial" aunque haya pagos registrados).
- ⏳ Historial de movimientos por caja individual — para poder entrar 
  a una caja puntual y auditar qué entró/salió, sin tener que confiar 
  ciegamente en el saldo total.
- ⏳ Código muerto identificado (bajo riesgo, no urgente): hay dos 
  definiciones viejas de la función renderClientes (en main.js:3047 y 
  gecko-fixes.js:3859) que apuntan a IDs de tabla que ya no existen en 
  el HTML actual — nunca se ejecutan, pero conviene limpiarlas en algún 
  momento para evitar confusión futura. Una de esas copias muertas tiene 
  el mismo bug de "o.adelanto" que se corrigió arriba, pero al ser 
  código muerto no afecta nada hoy.

**Prioridad recomendada para la próxima sesión:**
1. Blindar geckoServicios y clientes en GECKO_CATALOG_KEYS (Regla R3, 
   sigue pendiente desde antes — cobra más importancia después de los 
   bugs de datos de hoy).
2. Historial de pagos parciales en Cuenta Corriente.
3. Historial de movimientos por caja.
4. Limpieza de código muerto (renderClientes viejas).
5. BUG-003 (pendiente de detalle, sin especificar aún).
