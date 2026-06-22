# Cambios del sistema

## PENDIENTES

- Revisar por que no carga 2 imagenes en el presupuesto. 
- En el presupuesto no hay una seccion que lleva los datos del cuadro de condiciones para el cliente. (no se imprimen en el prespuesto)
- Lista de servicios - Revisar al editar que no lleva datos / al elimnar no desaparece de la lista. 
- dashboard - Cambiar estilo por algo mas moderno 
- Crear seccion de agenda persona estilo TO DO de microsoft. 
- Revisar convertir a orden en presupeustos, q no se va automaticamente a OT 
 
- Seccion clientes , al editar un cliente no se puede cambiar el nombre. reveer eso  

- En el cotizador de gráfica, tarjeta de "montado": agregarle las unidades a los items de alto y ancho (metros, centímetros, milímetros) lo que corresponda. Ej: 1.5mts o 150cm. Siempre tiene que estar en la unidad que cargaste el item.


- Dejar la tarjeta de item actual fija flotante.
- Re-editar los items cargados al carrito.
- Mix de Ventas en Reportes: main.js pisa el override de gecko-fixes.js. Hay que unificar para que use solo p.categoria (Gráfica / Industrial) y no los tipos de ítem.
- Diseño del PDF de cierre de mes: darle estilo de marca Gecko (tipografía, colores, logo).

---

## RESUELTOS ✅

### Sesión 16/06/2026

- ✅ Gastos Fijos — campo `categoria` no se guardaba en MySQL: agregada columna `categoria` a tabla `gastos_fijos` y actualizado `api.php`.
- ✅ Gastos Fijos — race condition al cargar varios gastos seguidos: eliminada actualización prematura del `_cache` en `_sincronizarArray` de `gecko-api.js`.
- ✅ Cierre de mes — el botón ahora abre modal con balance (Ingresos / Egresos / Balance neto) y botón Descargar PDF.
- ✅ Cierre de mes — PDF del balance con movimientos del mes funcional.
- ✅ Historial de cierres — tabla `historico_cierres` creada en MySQL y conectada vía `api.php` + `gecko-api.js`.
- ✅ Historial de cierres — sección "Cierres Anteriores" en Reportes muestra los cierres con balance y botón ↓ PDF. Fix: `main.js` buscaba elemento hijo `repoHistorialCierres` que no existía — corregido para escribir directo en `contenedorHistorialCierres` con fallback a localStorage.
- ✅ Presupuesto Manual — select de Área/Categoría reducido a solo Gráfica e Industrial.
- ✅ Modal nuevo cliente con campo CUIT y múltiples teléfonos con nombre.
- ✅ Clientes y Pedidos — scroll libre fuera de los containers.
- ✅ Presupuestador Manual — arranca en blanco en vez del último cargado.
- ✅ Texto duplicado en la impresión de documentos.
- ✅ Documentos imprimibles — campos `titulo` y `descripcion` separados en gecko-docs.js.

### Sesión 08/06/2026

- ✅ Al modificar el precio global del dólar, impacta en los precios de los materiales.
- ✅ Lista de clientes: iconos de contacto directo WhatsApp con etiqueta del contacto.
- ✅ Modal de insumos: precios sin decimales, siempre número redondo.
- ✅ Al imprimir o descargar el PDF, el nombre del archivo es "PRES_(cliente) - (Trabajo)".
- ✅ Toggle Público/Gremio en cotizador Vinilo Corte.
- ✅ Scroll roto al cerrar modales: resuelto con MutationObserver global.
- ✅ Lista de clientes vacía (crash): normalización defensiva de cuits/telefonos legacy desde MySQL.
- ✅ Botón Editar cliente abría la Ficha en lugar del modal de edición.
- ✅ CUITs visibles en lista de clientes: eliminados.
- ✅ Modal Nuevo Cliente y Editar Cliente con etiquetas en CUIT y teléfonos.
- ✅ Parámetros Láser/CNC: nombres editables inline y botón eliminar por fila.
- ✅ Pestaña renombrada a "Parámetros Láser / CNC" con campos Minuto Láser y Minuto CNC.
- ✅ Precio $/ML no persistía al recargar.
- ✅ precioGremio no persistía en modal de insumos.
- ✅ Fecha de entrega mostraba "A convenir" aunque estuviera guardada.
- ✅ Cotización dólar online: chip BNA Oficial con valor del día desde dolarapi.com.
- ✅ Scoring de clientes a 4 niveles (Base / Bronce / Plata / Oro).
- ✅ Validaciones con toast amarillo en Configuración.
- ✅ Sección Configuración: refresh visual completo con gecko Design System.
- ✅ Barra fija Parámetros Láser reemplazada por botón al pie.

### Sesión 06/06/2026

- ✅ Bug crítico #1: Imágenes adjuntas y metadata no persistían tras recargar.
- ✅ Bug crítico #2: Precio $/ML en Parámetros Láser no persistía.
- ✅ Input número de teléfono oculto en modal Nuevo Cliente.
- ✅ Segundo teléfono no se guardaba.
- ✅ Costos Operativos mostraba valores vacíos.
- ✅ Sin feedback visual al guardar Parámetros Láser.
- ✅ Búsqueda de clientes no filtraba la lista.

---

## CONTEXTO TÉCNICO IMPORTANTE

- `gecko-input-line` en styles.css tiene `width:100% !important` — cualquier override necesita `!important`.
- `gecko-fixes.js` usa un `setInterval` guardián que sobreescribe `window.renderClientes` con `_geckoRenderFijo` — fixes al render de clientes deben hacerse en `_geckoRenderFijo` directamente.
- Datos legacy de MySQL pueden devolver `cuits`, `telefonos`, `emails` como JSON strings en lugar de arrays — siempre normalizar con `Array.isArray()` + `JSON.parse()` fallback.
- Tabla `configuracion` usa patrón clave-valor con `REPLACE INTO`.
- `verDocumento` (gecko-docs.js) es la función correcta para previews.
- MutationObserver en main.js restaura `document.body.style.overflow` automáticamente al cerrar cualquier modal.
- `_sincronizarArray` en gecko-api.js actualiza `_cache` solo AL FINAL de todos los POSTs — no antes, para evitar race conditions.
- `main.js` tiene su propia `renderReportesDashboard` que puede pisar overrides de `gecko-fixes.js` — siempre verificar cuál función está corriendo realmente con F12.
- `contenedorHistorialCierres` es el ID real del contenedor en el HTML — no existe ningún hijo `repoHistorialCierres`.
- Tabla `historico_cierres` en MySQL guarda un registro por cada cierre mensual con: id, periodo, mes, anio, ingresos, gastos, balance, fecha_cierre, movimientos, gastos_fijos.