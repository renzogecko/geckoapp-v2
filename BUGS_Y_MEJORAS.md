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
- **Estado:** ✅ Resuelto (confirmado por Renzo, sin detalle de fecha
  exacta ni de la solución aplicada — no se documentó en su momento)
 
---

## 🟡 IMPORTANTES — datos o UI rotos, no bloquean operar pero degradan la experiencia

### [BUG-003] Parámetros de corte láser/CNC vaciados ⏳ PENDIENTE
- **Sección:** Configuración › Parámetros Láser/CNC
- **Síntoma:** todos los switches "¿Se puede cortar con láser?" en OFF, tabla vacía.
- **Causa:** REPLACE INTO pisó `tieneParametrosCorte=false` desde el JSON.
- **Fix esperado:** decidir si restaurar manualmente o si el JSON los traía y reprocesar.
- **Reportado:** 22/06/2026
- **Estado:** 🟡 Pendiente

### [BUG-007] Items de cotizadores etiquetados como 'grafica' por defecto
- **Sección:** main.js — función agregarItemAlPresupuesto
- **Síntoma:** Mix de Ventas en Reportes muestra solo "Gráfica" aunque haya ventas de otros rubros.
- **Causa:** la línea "if (!item.tipo) item.tipo = 'grafica';" en agregarItemAlPresupuesto (main.js) le pone Gráfica por defecto a cualquier ítem sin etiqueta, en vez de marcarlo como desconocido. Viola la Regla R4 (nunca inventar un dato).
- **Fix esperado:** auditar los 6 archivos de cotizadores (corte.js, corporeos.js, laser.js, bastidores.js, textil.js, impresion3d.js) para confirmar que cada uno setea correctamente item.tipo antes de llamar a agregarItemAlPresupuesto. Cambiar el fallback de 'grafica' a algo neutro como 'desconocido', y que Reportes lo muestre como "Otros" en vez de inventar Gráfica.
- **Reportado:** 05/07/2026
- **Estado:** 🟡 Pendiente

---

## 🔵 MEJORAS — rediseño visual de Reportes (no son bugs, son features pendientes)

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

### [MEJ-007] Dashboard principal con datos reales + rediseño de tableros
- **Sección:** Dashboard (vista principal al entrar al sistema)
- **Descripción:** hoy las tarjetas del Dashboard tienen datos hardcodeados (de ejemplo, no reales). Hay que conectarlas a datos reales de la app. También rediseñar los tableros de Gráfica e Industrial para que muestren los trabajos actuales en proceso, de forma que el usuario al entrar tenga un primer vistazo de lo que hay que hacer.
- **Estado:** 🔵 Pendiente

### [MEJ-008] Sección de Agenda / TO-DO — REQUIERE DEFINICIÓN PREVIA
- **Sección:** Nueva sección (a definir)
- **Descripción:** agenda personal estilo TO-DO. Evaluar si conviene integrarla vía una API externa existente, o construir una sección propia dentro de la app. Antes de escribir cualquier prompt de código, charlar el alcance y diseño con Renzo.
- **Estado:** 🔵 Pendiente — a definir

### [MEJ-009] Cotizador de Stickers con nesting automático
- **Sección:** Cotizadores (nuevo)
- **Descripción:** nuevo cotizador donde se carga el tamaño del sticker individual, cantidad y tipo. El sistema calcula automáticamente: cantidad de metros necesarios, cómo se acomodan los stickers en el pliego (nesting), y el precio final al cliente. Pensado para cotizar rápido.
- **Estado:** 🔵 Pendiente

### [MEJ-010] Chatbot asistente dentro de la app — REQUIERE DEFINICIÓN PREVIA
- **Sección:** Nueva funcionalidad (a definir)
- **Descripción:** asistente conversacional dentro de GeckoApp para ayudar a encontrar información de forma más eficiente. Alcance, tecnología y diseño a definir en una sesión propia antes de escribir código.
- **Estado:** 🔵 Pendiente — a definir

### [MEJ-011] Cotizador de ACM
- **Sección:** Cotizadores (nuevo)
- **Descripción:** nuevo cotizador para trabajos en ACM (aluminium composite panel).
- **Estado:** 🔵 Pendiente

### [MEJ-012] Hoja membretada de precios de impresión para el gremio
- **Sección:** Documentos / gecko-docs.js
- **Descripción:** botón que genere un documento imprimible con todos los servicios de impresión y sus precios actualizados, para enviar al gremio.
- **Estado:** 🔵 Pendiente

### [MEJ-013] Cotizador de Productos Gecko
- **Sección:** Cotizadores (nuevo)
- **Descripción:** cotizador simple con un select que trae los "Productos Gecko" de la lista de Materiales, permitiendo multicarga (varios productos en un mismo presupuesto).
- **Estado:** 🔵 Pendiente

### [MEJ-020] Autosave completo de borrador en Presupuestador Manual (nuevo, sin guardar)
- **Sección:** Presupuestador Manual (GPM)
- **Descripción:** reemplazar el mecanismo roto de "gecko_gpm_titulo_draft" (que solo se activa después de un primer guardado exitoso) por un borrador completo que guarde TODOS los campos relevantes (cliente, título, categoría, notas, condiciones, toggles, ítems) mientras se escribe, sin depender de que el usuario guarde primero. Restaurar automáticamente al reabrir "nuevo" si hay un borrador pendiente, con opción de descartarlo.
- **Estado:** 🔵 Pendiente — sesión propia (mayor superficie de cambio).

### [MEJ-021] Poder re-editar un ítem ya agregado al carrito (cotizador y GPM)
- **Sección:** Cotizadores y Presupuestador Manual
- **Descripción:** hoy, si te equivocás en un dato de un ítem ya agregado (al carrito de un cotizador, o ya cargado en el Presupuestador Manual), la única opción es borrarlo y cargarlo de nuevo desde cero. Se pidió: poder clickear un ítem en cualquiera de las 2 listas y volver al formulario con los datos precargados para corregir solo lo necesario, en vez de recrearlo entero. Requiere diseño previo: cada cotizador tiene campos distintos, así que "recargar" un ítem viejo en el formulario no es trivial — no es un bug chico, es una funcionalidad nueva a diseñar con calma.
- **Estado:** 🔵 Pendiente — sesión propia, con diseño previo antes de código.

---

## ✅ RESUELTOS — historial (no borrar, sirve de referencia)

## Sesión 05/07/2026 — Finanzas › Reportes: rediseño visual (parte 2 completa)

**Resueltos hoy:**
- ✅ [MEJ-001] Punto de Equilibrio → card hero agregada en gecko-fixes.js
  (`window.renderPuntoEquilibrio`) e index.html, con cálculo real de
  costos fijos, margen de contribución y avance del mes.
- ✅ [MEJ-002] Count-up animado → función `window._geckoAnimarNumero` en
  gecko-fixes.js, aplicada a Dinero Estancado, Tasa de Cierre, Ticket
  Promedio, Ticket Prom. por Rubro y Punto de Equilibrio. Duración
  final: 1600ms.
- ✅ [MEJ-003] Card "Rubro más rentable" → RESUELTA, pero RENOMBRADA a
  "Ticket Promedio por Rubro". No se pudo calcular margen real por
  rubro (insumos compartidos entre rubros, ej. acrílico usado en
  Gráfica/Industrial/Corpóreos/Láser). Se implementó como aproximación
  honesta: promedio de venta por ítem, no rentabilidad real. Función
  `window.renderTicketPorRubro` en gecko-fixes.js.

**Bug nuevo detectado hoy:** ver [BUG-007] en sección 🟡 IMPORTANTES
(items de cotizadores etiquetados como 'grafica' por defecto).

## Sesión 03/07/2026 (continuación) — Nuevo cotizador de Instalación

**Resueltos hoy:**
- ✅ Nuevo cotizador "Instalación" (archivo instalaciones.js) — sección
  propia en el menú lateral, independiente de los 7 cotizadores
  existentes. Calcula:
  - Mano de obra: cantidad de empleados × horas de trabajo × valor
    "Hora Hombre" (tomado de Configuración → Costos Operativos, campo
    ya existente).
  - Gastos extra: sistema de multicarga (varias filas con descripción
    y monto), igual que la tarjeta de Pintura.
  - Instalación fuera de La Plata (interruptor apagado por defecto):
    kilómetros de un tramo (se duplican automáticamente para ida y
    vuelta) × nuevo campo configurable "Precio por Km", más viáticos
    y peajes cargados a mano.
  - Sigue la Regla R4: si "Hora Hombre" está en $0, muestra aviso
    "FALTA PARÁMETRO" en el Auditor en vez de calcular en silencio.
  - Se integra al presupuesto con el mismo mecanismo probado que ya
    usa Chapa/Acrílico (agregarItemAlPresupuesto), sin tocar ningún
    cotizador existente.
- ✅ Nuevo campo "Precio por Km" agregado en Configuración → Costos
  Operativos.

**Prioridad recomendada para la próxima sesión:**
1. Confirmar y resolver el corte del Fleje en Chapa/Acrílico (sospecha
   de bug dormido, anotada en la sesión anterior).
2. BUG-003 (cotización del dólar hardcodeada).
3. Sospecha de código muerto: confirmarPagoGlobalCliente en main.js.

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

---

### [MEJ-014] Rediseño completo de la Orden de Trabajo (OT) — RESUELTO 09/07/2026

**Modal de Editar OT (gecko-fixes.js):**
- Restyle completo con sistema de clases estándar Gecko (gecko-modal-*, 
  gecko-label, gecko-input-line), reemplazando el estilo improvisado 
  anterior. Modal ensanchado a 960px.
- Campos nuevos a nivel de toda la orden: Fecha de ingreso, Teléfono/
  WhatsApp, Atendido por — con el mismo patrón de calendario nativo 
  (showPicker + conversión DD/MM/YYYY ↔ ISO) ya usado en Fecha de entrega.
- Sección de Planos/Referencias generales de la OT: agregar por archivo o 
  pegar con Ctrl+V.
- Botón "Revertir a Presupuesto" (con confirmación modal estilo Gecko, no 
  el confirm() nativo): permite reabrir una OT en el Presupuestador Manual 
  para editar ítems/precios de forma segura, en vez de editarlos 
  directamente en la OT (evita romper stock/finanzas ya comprometidos).
- Ítems del trabajo: pasaron de "solo lectura" a fichas desplegables y 
  editables por ítem, con campos: Área/operario asignado, Material, 
  Medidas, Espesor, Color/acabado, Lleva estructura, Sección, Cantidad, 
  Vinilo, Descripción de corte, Ubicación de archivo, Observaciones 
  (guardados en la propiedad nueva "otFicha" de cada ítem, sin tocar 
  nombre/costo/otDetalle original).
- Sección de Iluminación condicional dentro de la ficha de cada ítem: 
  aparece solo si el ítem es de rubro Corpóreos (it.tipo === 'corporeos').
- Plano específico por ítem, independiente de los planos generales de la 
  OT, con el mismo mecanismo de archivo/paste (detecta automáticamente a 
  qué ítem pegar según cuál esté con la ficha abierta).

**Documento impreso de OT (gecko-docs.js):**
- Especificaciones de cada ítem: tabla dinámica tipo grilla (etiqueta + 
  dato), mostrando solo los campos que tengan valor cargado — sin filas ni 
  secciones vacías. Ítems sin ficha nueva cargada (OTs viejas) siguen 
  usando el formato de renglones anterior, sin romperse.
- Planos: agrupados por ítem (con título "Ítem 0X — nombre del trabajo") y 
  al final los planos generales de la orden, todo en un flujo continuo sin 
  páginas forzadas (se eliminó el "page-break-before" que generaba 
  espacios en blanco).
- Firma separada del contenido con margen propio.
- Pantalla de selección al imprimir ("Elegir qué imprimir"): filtro rápido 
  por área (agrupa ítems según su área asignada) + checkboxes individuales, 
  permitiendo imprimir/reimprimir solo una parte de la OT (ej: solo lo que 
  corresponde al taller de Estructuras, sin mostrarle al operario datos de 
  otras áreas que no le competen).

**Estado:** ✅ Completo y probado en producción.

---

### [MEJ-015] Fix bug de etiquetas (tipo) en el Presupuestador Manual — RESUELTO 09/07/2026
- Causa raíz: el puente cotizador→GPM (gecko-docs.js) descartaba el
  campo "tipo" del ítem; el formulario del GPM (_gpmAgregarItem) no lo
  conservaba; y _gpmGuardar (gecko-fixes.js) hardcodeaba tipo:'manual'
  para el 100% de los ítems, sin excepción.
- Fix: se propaga el tipo real de origen de punta a punta (puente →
  campo oculto en el formulario → guardado), respetándolo cuando el
  ítem viene de un cotizador real. Se agregó un flag separado
  "origenFormulario:'gpm'" a nivel de presupuesto (no de ítem) para
  distinguir "se armó a mano en el GPM" de "el ítem es de tal rubro" —
  ese flag solo se setea cuando NINGÚN ítem tiene tipo de origen real.
  Se mantiene compatibilidad con presupuestos históricos vía "||" con
  el chequeo viejo.
- Efecto: corrige Mix de Ventas, Ticket Promedio por Rubro, Iluminación
  en OT, y Eficiencia Segmentada, que dependían de este dato.

### [MEJ-016] Autocompletado de ficha de ítem en OT desde otDetalle — RESUELTO 09/07/2026
- La ficha desplegable de cada ítem en Editar OT ahora se autocompleta,
  la primera vez que se abre (sin pisar datos ya editados), parseando
  el texto otDetalle del cotizador de origen (Medidas, Material,
  Cantidad, Color/Acabado, Iluminación).
- El mismo parser se usa también en la impresión, para que la grilla
  aparezca desde la primera vez que se genera el documento, sin
  necesitar pasar antes por Editar OT.
- Limitación conocida: el campo "Fuente" de Iluminación no siempre se
  separa bien del texto combinado que arma el cotizador de Corpóreos
  hoy — pendiente de resolver junto con MEJ-017.

---

### [MEJ-017] Rediseño del cotizador de Iluminación (Corpóreos y afines) — RESUELTO 10/07/2026

**Base de datos (MySQL, tabla materiales):**
- 3 columnas nuevas: `watts` (consumo por unidad/metro), `densidad` 
  (módulos por m², solo aplica a Módulos), `lumenes` (dato del 
  fabricante, autocompleta Densidad con la fórmula 7840÷Lúmenes, 
  editable después).

**Formulario de Materiales (main.js):**
- Categoría "Eléctrico" reordenada: Watts / Lúmenes / Densidad en una 
  fila, Especificaciones ocupando el ancho completo abajo.

**Cotizador Chapa/Acrílico:**
- El select fijo de "Módulos LED / Tira LED" (1 sola opción cada uno) 
  se reemplazó por un select único combinado que lista TODOS los 
  módulos y tiras cargados en Materiales, cada uno con su Watts y 
  Densidad reales.
- Si el material elegido no tiene Watts o Densidad cargada, se muestra 
  "FALTA PARÁMETRO" en vez de inventar un número (Regla R4).
- Selección de fuente mejorada: si ninguna fuente sola alcanza el 
  consumo necesario, el sistema prueba combinar 2, 3 o 4 unidades del 
  mismo modelo (respetando el stock real disponible) antes de avisar 
  que faltan fuentes.
- Caja de "Consumo Estimado" rediseñada: 2 líneas, mismo tamaño de 
  letra, con punto naranja identificador.

**Cotizador Letras 3D (Estimado):**
- Se agregó la tarjeta de Iluminación completa (antes no existía), 
  reutilizando la misma lógica de Chapa/Acrílico vía funciones 
  compartidas (`_geckoHtmlCardIluminacion`, `_geckoCalcularIluminacion`, 
  `_geckoRecalcularIluminacion` como dispatcher según el cotizador 
  activo) — evita código duplicado entre ambos cotizadores.
- Corregida la conversión de perímetro (cm → metros lineales) para que 
  el cálculo de tiras sea correcto en este cotizador.

**Modal de Editar OT (gecko-fixes.js):**
- La ficha de cada ítem ahora también trae Iluminación cuando 
  corresponde, con el texto guardado en 3 campos separados por "|" 
  (Modelo / Cantidad / Fuente) para que el autocompletado los separe 
  bien sin ambigüedad (antes, cuando el nombre de la fuente tenía 
  paréntesis propios, todo quedaba mezclado en un solo campo). Los 
  ítems guardados con el formato viejo siguen funcionando igual 
  (compatibilidad hacia atrás).
- Reordenado el modal: ahora el bloque "Ítems del trabajo" aparece 
  después de los datos generales de la OT (Cliente, Área, Fechas, 
  Teléfono, Atendido por) y antes de Instrucciones especiales, para una 
  lectura más natural (primero el contexto general, después el detalle 
  de cada trabajo).

**Estado:** ✅ Completo y probado en producción.

---

### [MEJ-018] Persistencia de estado y fixes en el Presupuestador Manual — RESUELTO 14/07/2026
- Fix: toggle "Mostrar precios individuales" ahora se restaura 
  correctamente al editar un presupuesto (antes quedaba siempre 
  activado, tanto en el dato interno como en el dibujo visual del 
  interruptor).
- Fix: el IVA (21%) ahora se refleja en el documento impreso — antes se 
  calculaba bien en pantalla pero no llegaba al print. De paso se 
  corrigió que el descuento en monto fijo ($) se calculaba mal en el 
  print (se trataba siempre como porcentaje).
- Fix: al editar un presupuesto creado desde un cotizador y volver a 
  pasar por "Continuar a Presupuesto", ahora actualiza el presupuesto 
  original en vez de crear uno duplicado (se propaga correctamente el 
  ID en edición).
- Nueva categoría "Gráfica/Industrial" agregada al selector de categoría 
  del GPM (para presupuestos que mezclan ambos rubros).
- Nuevo campo "Motivo del descuento": texto libre que se guarda con el 
  presupuesto y se imprime debajo del monto de descuento en el 
  documento, para que el cliente entienda por qué se le aplicó.
- Eliminado el botón "Generar OT" del GPM — de ahora en más toda OT nace 
  obligatoriamente de convertir un Presupuesto ya guardado. Se limpió 
  también código muerto relacionado (modal viejo "Cotizador Manual" y el 
  camino sin uso de "Configurar OT").
- **Pendiente (Etapa 2, no implementada):** autosave completo del 
  borrador mientras se compone un presupuesto NUEVO sin guardar (hoy, 
  si se recarga la página a mitad de carga, se pierde todo excepto lo 
  que ya esté guardado). Documentado para sesión futura — ver [MEJ-020].

### [MEJ-019] Títulos y descripciones enriquecidas al pasar de cotizador a Presupuesto — RESUELTO 14/07/2026
- Los 7 cotizadores (Gráfica, Corpóreos ×4 modos, Láser, Textil, 
  Bastidores, Impresión 3D) ahora guardan un campo "identificacion" 
  (texto puro del input de "01. IDENTIFICACIÓN", sin el prefijo de 
  rubro) que se usa como Título en el Presupuestador Manual. El campo 
  "nombre" (con prefijo) sigue igual para OT/prints.
- Corregido: Gráfica no incluía el nombre del material en el detalle del 
  ítem — ahora sí aparece.
- Corregido: Textil mostraba el largo en centímetros bajo la etiqueta 
  "Material" (confuso) — ahora dice el servicio real (DTF Textil / 
  Termovinilo).
- Revisado y corregido el detalle de Instalación (extras que no se 
  reflejaban, según lo encontrado en la investigación puntual).

---

### Sesión 15/07/2026

**Resueltos:**
- ✅ Presupuestador Manual — la categoría (Gráfica/Industrial) no se 
  guardaba bien al generar el presupuesto: el campo puente 
  "categoriaPedido" ya no existía en el HTML y el valor se perdía, 
  cayendo siempre en "Gráfica" por defecto. RESUELTO: la categoría 
  ahora viaja directo desde el select del Presupuestador Manual sin 
  depender de ese campo puente.
- ✅ BUG-004 — la etiqueta de categoría en la lista de Pedidos (Presupuestos 
  y OTs) siempre mostraba "GRÁFICA" sin importar la categoría real 
  guardada. RESUELTO: misma causa que el punto anterior.
- ✅ Columna "Resumen de Ítems" renombrada a "Descripción Trabajo" en la 
  lista de Presupuestos.
- ✅ Nueva categoría combinada "Gráfica/Industrial": no era reconocida 
  por la función que arma la etiqueta de la lista (_detectarCategoria 
  solo aceptaba "Gráfica" o "Industrial" a secas) y caía en "Gráfica" 
  por defecto. RESUELTO: se agregó el valor exacto "Gráfica/Industrial" 
  al reconocimiento, con una etiqueta de color propio (ocre/amarillo 
  apagado, ajustado a pedido de Renzo tras una primera versión con 
  degradado que no se leía bien).
- ✅ [MEJ-020] Autosave del Presupuestador Manual: guarda un borrador 
  cada 5 segundos mientras se arma un presupuesto NUEVO (no aplica a 
  edición de existentes, que ya sobrevive a un F5 por diseño). Al 
  reabrir la sección, si hay un borrador pendiente, aparece un modal 
  "Borrador encontrado" con botones Recuperar / Empezar de cero / 
  cerrar (✕). El borrador se limpia solo al guardar con éxito. Ajustes 
  de pulido incluidos: el modal se cierra en un solo click (antes 
  necesitaba dos por duplicación), tiene botón de cerrar, y ya no 
  reaparece después de guardar un presupuesto con éxito.
- ✅ [MEJ-021 · Etapa 1] "La lotería" al editar un presupuesto — antes, 
  editar abría en el Presupuestador Manual solo si TODOS los ítems eran 
  de tipo "manual"; si venía aunque sea uno de un cotizador (Gráfica, 
  Corpóreos, etc.), abría en la pantalla vieja de cotizadores. RESUELTO: 
  Editar ahora SIEMPRE abre en el Presupuestador Manual, sin excepción. 
  Efecto colateral esperado (no es bug): al actualizar un presupuesto 
  mixto por acá, sus ítems pasan a guardarse como tipo "manual", lo que 
  solo afecta el detalle fino del gráfico Mix de Ventas en Reportes (se 
  cuenta por categoría Gráfica/Industrial en vez de por cotizador 
  específico). No afecta cálculo de precios ni totales.
- ✅ Número de presupuesto (#XXXX) ahora visible en el Presupuestador 
  Manual al editar un presupuesto existente, alineado a la derecha en 
  la fila de "Fecha de entrega".
- ✅ Print de Presupuesto (PDF/vista previa): se agregó columna 
  "Unidades" mostrando la cantidad de cada ítem, y se corrigió el ancho 
  de la caja de Subtotal/Descuento/Total Final para que el texto y los 
  montos tengan más espacio entre sí (manteniendo alineación a la 
  derecha, igual que la columna Precio).

**Pendiente para sesión dedicada:**
- ⏳ [MEJ-021 · Etapa 2] Botón "Editar" por ítem dentro del 
  Presupuestador Manual, que lleve de vuelta al cotizador original 
  (Gráfica, Corpóreos, Textil, etc.) con los datos precargados para 
  modificarlos, y un mecanismo para volver al Presupuestador Manual con 
  los cambios aplicados sin duplicar el ítem ni perder el resto del 
  presupuesto. Requiere diseño propio por cotizador (cada uno tiene 
  campos distintos).

---

### Sesión 15/07/2026 (tarde)

**Resueltos:**
- ✅ Auditores de cálculo duplicados en la Terminal de Cotización: al 
  cambiar de un cotizador a otro (ej: de Corpóreos a Láser/CNC), los 
  auditores de cotizadores visitados anteriormente quedaban pegados en 
  el panel en vez de desaparecer, apareciendo apilados debajo del 
  auditor correcto. RESUELTO: se agregó una limpieza automática de 
  auditores huérfanos al cambiar de categoría (cambiarCategoriaCotizador 
  en main.js).
- ✅ Causa raíz más específica del mismo síntoma: al presionar "+ Añadir 
  a Cotización" estando en Láser/CNC, el código ejecutaba por error la 
  función de recálculo de Impresión 3D (calcularCosto3D) en vez de la de 
  Láser/CNC (calcularCostoCorte), lo que generaba y mostraba el auditor 
  de Impresión 3D ("Sin filamento cargado") debajo del de Láser/CNC. 
  RESUELTO: agregarItemAlCarritoUI (main.js) ahora llama a la función de 
  recálculo correcta según la categoría activa. No afecta el 
  funcionamiento de Impresión 3D, que ya llamaba a la función correcta.

---

### Sesión 16-17/07/2026 — Pagos combinados, descuentos y Cuenta Corriente

**Resueltos:**
- ✅ Nombre del cliente clickeable en las listas de Presupuestos y OTs, 
  abre directo la Ficha de Cliente / Cuenta Corriente (antes había que 
  ir manualmente a la sección Clientes).
- ✅ Al convertir un Presupuesto a OT, el total registrado ahora es 
  siempre el Subtotal (suma de los ítems, sin el descuento global del 
  presupuesto), incluyendo el IVA si estaba activado. El descuento del 
  presupuesto queda solo como dato informativo para el PDF del cliente, 
  nunca vuelve a afectar la deuda real registrada.
- ✅ [Sistema de pagos combinados con descuento — Etapa A] Se agregó 
  checkbox de descuento (%/$ fijo) a cada pago del modal de Registro de 
  Pago. Se ajustó dos veces la lógica de cálculo hasta llegar a la 
  versión final: el campo "Monto" representa la plata REAL que el 
  cliente entrega; si hay descuento, el sistema calcula hacia arriba 
  (fórmula inversa: nominal = real ÷ (1−%), o real + valor fijo) cuánta 
  deuda del presupuesto cubre ese pago. La caja recibe exactamente lo 
  escrito; la diferencia queda registrada como movimiento tipo 
  "Descuento" (categoría "Descuento Otorgado"), sin afectar ninguna 
  caja. Esto garantiza que la Cuenta Corriente del cliente cierre 
  siempre en $0, sin importar cuántos pagos con descuento se apliquen.
- ✅ Modal de Registro de Pago reordenado: se eliminó el selector "Forma 
  de pago" (no cumplía función real) y se puso "Ingresa a caja" en su 
  lugar, junto al Monto.
- ✅ En modo "Saldo Final", el campo Monto se autocompleta con el saldo 
  pendiente, y si se activa el descuento, se recalcula en tiempo real 
  (saldo × (1−%) o saldo − valor fijo) mientras se escribe el 
  porcentaje/monto — sin necesidad de una tarjeta nueva.
- ✅ Se oculta el botón "+ Agregar segundo pago" cuando el modo activo 
  es "Saldo Final", para evitar que el autocompletado de Monto1 se 
  cruce con un Monto2 cargado en simultáneo (fuente de un posible 
  descuadre de cuenta corriente).
- ✅ Formato de miles ($ con puntos) aplicado al campo Monto del modal 
  de Registro de Pago, y mecanismo reusable genérico (clase 
  "gecko-money-fmt" + window._fmtMiles / window._parseMiles) instalado 
  para aplicar el mismo formato a otros campos de dinero de la app sin 
  repetir lógica. Ya aplicado también al campo del modal "Cobro de 
  Saldo" (Ficha de Cliente).
- ✅ Reportes (Finanzas): nueva tarjeta "Flujo de Caja Real" (Cajas − 
  Costos Fijos) arriba de todo, con color dinámico verde/rojo/amarillo 
  según el resultado, ícono y título a juego. "Punto de Equilibrio" 
  pasó a ocupar la mitad del ancho, con "Descuentos Otorgados" (monto, 
  cantidad de pagos con descuento, % sobre ingresos) al lado.
- ✅ Modal "Historial de Caja" (al clickear una tarjeta de caja): se 
  agregó botón de eliminar (🗑) por movimiento, con la misma lógica de 
  reversión de saldo que la lista general. Bug post-implementación 
  corregido: el borrado usaba un localStorage alternativo que no 
  sincronizaba con la base de datos (volvía a aparecer con F5) — ahora 
  usa el localStorage normal, igual que el borrado de la lista general, 
  y persiste correctamente.

**Pendiente para sesión dedicada:**
- ⏳ [MEJ-021 · Etapa 2] Botón "Editar" por ítem dentro del 
  Presupuestador Manual, que lleve de vuelta al cotizador original con 
  los datos precargados, y mecanismo para volver con los cambios 
  aplicados sin duplicar el ítem.
- ⏳ [MEJ-022] Reparto automático (FIFO) de un pago único registrado 
  desde la Cuenta Corriente entre varios trabajos pendientes del mismo 
  cliente, marcando visualmente cuáles quedan "Saldados" a medida que 
  se completan.

---

### Unificación de archivos — 17/07/2026

Se revisó el archivo viejo "Cambios y modificaciones.md" (que quedó 
desactualizado y generaba confusión al convivir con este archivo 
oficial) y se confirmó con Renzo el estado real de cada ítem pendiente 
que tenía. El archivo viejo se elimina del repositorio; este es el 
único registro que queda de su contenido.

**Confirmados como ya resueltos (sin fecha exacta, verificados en 
conjunto hoy):**
- ✅ Carga de imágenes en el presupuesto (antes fallaban 2 imágenes).
- ✅ Cuadro de condiciones de pago para el cliente — ya se imprime en 
  el presupuesto.
- ✅ Lista de Servicios — edición y eliminación funcionan correctamente 
  (relacionado con RES-008/RES-011 de sesiones anteriores).
- ✅ Convertir Presupuesto a OT — funciona correctamente (además 
  reforzado por los cambios de la sesión de pagos combinados).
- ✅ Edición de nombre de cliente — funciona (RES-012, sesión 26/06).
- ✅ Cotizador Gráfica, tarjeta "Montado" — ya muestra las unidades 
  (mts/cm/mm) en alto y ancho.
- ✅ Tarjeta "Ítem actual" — ya quedó fija/flotante al hacer scroll en 
  los cotizadores.
- ✅ Mix de Ventas en Reportes — ya muestra por categoría 
  (Gráfica/Industrial/Corpóreos), confirmado como el comportamiento 
  deseado.

**Pendientes reales, migrados a este archivo:**

### [MEJ-023] Modernizar el diseño del Dashboard
- **Sección:** Dashboard (pantalla de inicio)
- **Descripción:** cambiar el estilo visual actual por algo más moderno.
- **Estado:** 🔵 Pendiente

### [MEJ-024] Nueva sección de Agenda (estilo To-Do)
- **Sección:** Nueva sección en el menú principal
- **Descripción:** crear una sección de agenda personal, estilo To-Do 
  de Microsoft, para uso interno del equipo.
- **Estado:** 🔵 Pendiente

### [MEJ-025] Diseño de marca Gecko en el PDF de Cierre de Mes
- **Sección:** Finanzas › Reportes › Cierre de Mes
- **Descripción:** el PDF que se genera al cerrar el mes hoy tiene un 
  diseño genérico; darle estilo de marca Gecko (tipografía, colores, 
  logo), igual que ya tienen los PDFs de Presupuesto y OT.
- **Estado:** 🔵 Pendiente

(Nota: "Re-editar los ítems cargados al carrito", que también estaba en 
el archivo viejo, ya está trackeado en este archivo como 
MEJ-021 · Etapa 2 — no se duplica.)

---

### Nuevos pendientes anotados — 20/07/2026

### [BUG-005] Botón de editar movimiento no funciona
- **Sección:** Finanzas › Movimientos
- **Descripción:** el botón de editar (✏️) en cada fila de la tabla de 
  Movimientos existe visualmente, pero al presionarlo no pasa nada — 
  la función no está andando.
- **Estado:** 🔴 Pendiente

### [MEJ-026] PDF de estado de Cuenta Corriente para enviar por WhatsApp
- **Sección:** Clientes › Ficha de Cliente / Cuenta Corriente
- **Descripción:** poder generar un PDF con el resumen del estado de 
  cuenta de un cliente (deuda, pagos, saldo), para poder enviárselo 
  directo por WhatsApp, similar a como ya se hace con los PDFs de 
  Presupuesto y OT.
- **Estado:** 🔵 Pendiente

### [MEJ-027] Indicador visual de trabajos saldados en la Cuenta Corriente
- **Sección:** Clientes › Ficha de Cliente / Cuenta Corriente
- **Descripción:** cuando se registran pagos independientes que van 
  completando distintos trabajos de un mismo cliente, se necesita que 
  quede visualmente claro cuáles ya están "Saldados" a medida que se 
  completan. Relacionado con MEJ-022 (reparto FIFO de pagos), pero 
  puede incluir más casos que ese. 
  ⚠️ Requiere una charla de diseño antes de tocar código — hay 
  decisiones a tomar sobre cómo se determina y muestra ese estado.
- **Estado:** 🔵 Pendiente — sesión de diseño dedicada

### [MEJ-028] Cotizador de Neón LED
- **Sección:** Cotizadores › nuevo cotizador
- **Descripción:** nuevo cotizador para trabajos de Neón LED, con estas 
  variables:
  - Área de la base (materiales: acrílico, MDF 6mm)
  - Metro lineal de neón LED
  - Uniones/tramos: calcula la cantidad de soldaduras necesarias y les 
    aplica un valor fijo por soldadura
  - Días de trabajo
- **Estado:** 🔵 Pendiente

### [MEJ-029] Cotizador de Stickers con sistema de nesting
- **Sección:** Cotizadores › nuevo cotizador
- **Descripción:** nuevo cotizador para stickers, con un sistema de 
  nesting (acomodar las formas de manera eficiente sobre la plancha/
  rollo para minimizar desperdicio de material).
- **Estado:** 🔵 Pendiente

### [MEJ-030] Nueva caja de Dólares (USD) — reservas, separada de las 
cajas generales
- **Sección:** Finanzas › Cajas
- **Descripción:** crear un tipo de caja en dólares (USD), pensada como 
  reserva de ahorro, que se mantenga separada visualmente y en los 
  cálculos de las cajas operativas generales (para no mezclar el 
  efectivo/flujo del día a día con este ahorro).
- **Estado:** 🔵 Pendiente

---

### Sesión 20/07/2026 — MEJ-021 Etapa 2 completada (5 de 6 cotizadores)

**Resuelto: MEJ-021 · Etapa 2 — Re-editar ítems del carrito volviendo 
al cotizador original**

Se construyó el mecanismo completo de "ida y vuelta": cada ítem del 
Presupuestador Manual que viene de un cotizador ahora puede mostrar un 
botón ✏️ Editar que:
1. Guarda una "foto" de todo el Presupuestador Manual (cliente, 
   título, notas, condiciones, IVA, descuento, y todos los ítems).
2. Te lleva al cotizador original con el formulario recargado tal cual 
   estaba (material, medidas, cantidades, checkboxes, modo).
3. Al presionar "Añadir a Cotización" con los cambios hechos, vuelve 
   al Presupuestador Manual, restaura todo lo demás intacto, y 
   reemplaza SOLO ese ítem — sin duplicar nada.
4. Botón Cancelar en el aviso naranja para volver sin aplicar cambios.

**Piezas técnicas de la arquitectura (para futura referencia):**
- Cada ítem de cotizador ahora guarda `parametrosOriginales` (snapshot 
  de campos, y de filas múltiples si aplica) y `origenCotizador` 
  (etiqueta precisa, ej. "grafica_impresion", "grafica_corte" — 
  necesaria porque varios cotizadores comparten el mismo `tipo`).
- `window._gpmConfigOrigenes` (gecko-fixes.js) es el mapa central: por 
  cada origen, a qué categoría volver, si tiene filas múltiples, cómo 
  restaurar el "modo" si aplica, y qué función de cálculo final llamar.
- Dos puntos de enganche del botón "Añadir a Cotización": 
  `agregarItemAlPresupuesto` (Gráfica, Corte, Textil, Bastidores) y 
  `agregarItemAlCarritoUI` (Láser/CNC, Impresión 3D) — ambos 
  interceptados para detectar modo edición.

**Cotizadores completados y probados:**
- ✅ Vinilo Impresión (grafica.js) — con filas múltiples
- ✅ Vinilo Corte/ML (corte.js) — formulario simple
- ✅ Textil (textil.js) — con restauración de modo (DTF/Termo/Estampado)
- ✅ Láser/CNC (laser.js) — con dos listas de filas (piezas + acabados) 
  y restauración de modo (Láser/CNC Router)
- ✅ Bastidores (bastidores.js) — con filas múltiples + revestimiento
- ✅ Impresión 3D (impresion3d.js) — formulario simple

**Corpóreos — COMPLETADO (20/07/2026):**
Se investigó primero (Regla R10) y se confirmó que solo existen 3 
modos reales alcanzables desde el menú (Polifán, Chapa/Acrílico, 
Letras 3D); el 4to bloque de código encontrado (calcularCorporeos() / 
addCorporeoAlPresupuesto()) es código muerto, inalcanzable desde la UI 
— queda anotado para limpieza en otra sesión, no se tocó ahora.
Se aplicó el mismo patrón de 4 piezas a los 3 modos reales, cada uno 
con su propio origenCotizador (corporeos_polifan, corporeos_chapa, 
corporeos_letras3d) y su propia función de setup para restaurar el 
modo correcto (window._corpModo) antes de re-renderizar.

**MEJ-021 · Etapa 2 — ESTADO FINAL: 100% completa.** Los 7 cotizadores 
(Impresión, Corte, Textil, Láser/CNC, Bastidores, Impresión 3D, 
Corpóreos con sus 3 modos) tienen el botón Editar funcionando.

**Detalle menor sin resolver, revisar en otra sesión:**
- Al editar un ítem y volver al cotizador (al menos visto en Láser/CNC 
  y CNC Router), el campo Cliente del cotizador queda con un valor 
  cargado de forma extraña. No se identificó la causa todavía — 
  investigar antes de tocar nada.

### [MEJ-031] Limpieza de código muerto — calcularCorporeos() viejo
- **Sección:** corporeos.js
- **Descripción:** existe un bloque de código (función 
  window.calcularCorporeos, window.addCorporeoAlPresupuesto, campos 
  corpNombre/corpAncho/corpAlto/corpPerimetro/corpProfundidad/
  corpDesperdicio) que parece ser una versión anterior de Corpóreos. 
  Se confirmó que no es alcanzable desde ningún link del menú (Renzo 
  probó y solo ve Polifán, Chapa/Acrílico y Letras 3D). Candidato a 
  limpieza, pero hay que confirmar con más detalle que nada más lo 
  llame antes de borrarlo (Regla de "no dejar código muerto").
- **Estado:** 🔵 Pendiente

### [MEJ-023] Dashboard — Diseño aprobado, listo para aplicar

**Sección:** Dashboard (pantalla de inicio)
**Estado:** 🟢 Diseño aprobado — pendiente de construcción (depende de 
que exista el sistema de Usuarios/Login, ver dependencia abajo)

**Resumen del cambio:** reemplazar el Dashboard actual por un tablero 
estilo Trello, personalizable por usuario, con las OT reales del 
sistema como tarjetas.

**Tarjetas resumen (arriba de todo):**
- En proceso (cantidad total)
- Atrasados / vencidos
- Próximos a entregar (por fecha de entrega cercana)

**Tableros (pestañas, filtran por la categoría real de la OT):**
- Gráfica → categoría "Gráfica" → columnas: En Proceso, Impresión, Listo
- Industrial → categoría "Industrial" → columnas: En Proceso, En Taller, 
  Listo
- Compartida → categoría "Gráfica/Industrial" → columnas: En Proceso, 
  En Taller, En Impresión, Listo

**Cada usuario puede:**
- Elegir un tablero como "principal" (se guarda como preferencia, 
  aparece resaltado y es el que ve al entrar)
- Ver los otros tableros igual, con un clic en la pestaña
- Ver el tablero "Compartida" siempre, sin importar cuál sea su 
  principal

**Contenido de cada tarjeta:**
- Título del trabajo
- Cliente
- Número de OT
- Fecha de entrega (en rojo si está atrasada)
- Círculo con la inicial de quién cargó el presupuesto/OT (color por 
  persona)
- Botón de acceso directo (↗) que lleva a la OT completa

**Comportamiento del tablero:**
- Cada columna tiene su propio contenedor visual (fondo levemente 
  distinto al de las tarjetas), para que no se mezclen a simple vista
- Las tarjetas se pueden arrastrar (drag and drop) de una columna a 
  otra
- Arrastrar una tarjeta CAMBIA EL ESTADO REAL de esa OT en el sistema 
  (ej: de "En Proceso" a "Listo") — no es solo un orden visual

**⚠️ DEPENDENCIA CRÍTICA — construir en este orden:**
1. Primero: Sistema de Usuarios/Login (ver MEJ-032 abajo) — sin esto, 
   no hay forma de saber "quién" está mirando el Dashboard para 
   personalizarlo, ni quién cargó cada trabajo.
2. Después: este Dashboard, conectado al login ya existente.
3. Alternativa si se quiere adelantar: se puede construir la mecánica 
   del tablero (columnas + tarjetas de OT reales + drag and drop que 
   cambia estado + botón de acceso directo) ANTES del login, sin la 
   parte de personalización por usuario ni el círculo de "quién la 
   cargó" — Renzo decide si prefiere esta versión intermedia primero.

**Boceto visual:** aprobado en sesión del 21/07/2026 (dos iteraciones, 
la segunda con columnas en contenedores separados y botón de acceso 
directo a la OT).

### [MEJ-032] Sistema de Usuarios / Login completo

**Sección:** Login, roles y auditoría
**Estado:** 🟢 Diseño aprobado — pendiente de construcción. PRIMER 
PASO antes de MEJ-023 (Dashboard).

**🔎 HALLAZGO CLAVE (sesión 21/07/2026):** la base técnica YA EXISTE y 
funciona:
- `login.html` con email + contraseña real.
- `api.php?endpoint=auth`: valida contra tabla `usuarios` en MySQL, 
  contraseñas con bcrypt (con migración automática desde texto plano 
  si hiciera falta), sesión de servidor PHP real (`$_SESSION`), todos 
  los demás endpoints ya exigen sesión activa.
- Roles ya diferenciados (`admin` / `usuario`) en la tabla `usuarios`.
- `window.GECKO_USER` disponible globalmente en toda la app 
  ({nombre, rol, email}).
- Botón de Logout funcional.
- Los 5 perfiles YA ESTÁN CARGADOS en la base con su rol correcto 
  (confirmado por Renzo).
- **Lo único que falta:** que el equipo empiece a usarlo de verdad — 
  hoy todos siguen entrando con una cuenta compartida en vez de la 
  propia.

**A construir, en este orden:**

**1. Rollout real + autogestión:**
- Migrar de "cuenta compartida" a que cada persona use su propio login.
- Agregar "Cambiar mi contraseña" (self-service, sin depender de 
  phpMyAdmin).

**2. Nuevo modelo de permisos para Finanzas (más preciso que "ocultar 
todo"):**
- **Admin** (Renzo, Rodri, Agus): acceso completo sin restricciones.
- **Usuario** (Nico, Seba):
  - Pestaña **Movimientos**: visible y 100% funcional (cargar pagos, 
    cargar movimientos, revisar historial) — NO se oculta.
  - Tarjetas de saldo de cada caja (los números grandes arriba de 
    todo en Finanzas): el número NO se muestra — queda vacío o con 
    ícono de candado 🔒 (nunca "tapado/blur", directamente ausente).
  - Pestaña **Reportes**: oculta por completo — solo para admins.
  - Pestaña **Gastos Fijos**: a definir en el momento de programar 
    (¿va con Movimientos o se oculta con Reportes?).
- ⚠️ Verificar al programar: el bloqueo de Finanzas hoy es solo 
  visual (JavaScript oculta el ítem de menú) — falta confirmar/agregar 
  que el bloqueo sea real también del lado del servidor (api.php), no 
  solo estético.

**3. Auditoría — "creado por":**
- Agregar el usuario que creó cada Presupuesto, OT, Movimiento y 
  Cliente (capturado automático desde `window.GECKO_USER` al guardar).

**4. Feed de actividad:**
- Registro simple tipo campanita: "Nico creó el Presupuesto #1234 — 
  hace 5 min", visible para todo el equipo. Sin notificaciones push 
  del navegador por ahora (más complejas, se evalúa después si hace 
  falta).

**5. Conectar con el Dashboard (MEJ-023):**
- Tablero principal guardado por usuario.
- Círculo con inicial + color de quién cargó cada tarjeta.

**6. Pantalla de administración de usuarios (solo admins):**
- Alta/baja de usuarios, cambiar contraseña de otros, cambiar rol — 
  sin necesidad de entrar a phpMyAdmin.
