# Cambios del sistema

## PENDIENTES

- En el cotizador de gráfica, tarjeta de "montado": agregarle las unidades a los items de alto y ancho (metros, centímetros, milímetros) lo que corresponda. Ej: 1.5mts o 150cm. Siempre tiene que estar en la unidad que cargaste el item.
- En el cotizador de gráfica, tarjeta de "montado": el precio se debe calcular siempre aunque no se carguen los metros lineales. Si no se cargan los metros lineales de corte, igual tiene que calcular el precio con los otros datos. Si se cargan los metros lineales de corte, automáticamente se suma. Si se deja en 0, el sistema debe detectar que debe calcular por la suma de los ítems. Ej: si ponés 4 ítems de 100cm de ancho y 1m de largo, debería calcular solo el área sin sumar el corte.
- Mensajes de confirmación consistentes en formularios que hoy guardan en silencio (Costos Operativos, Parámetros Láser, otros).

---

## RESUELTOS ✅

### Sesión 08/06/2026

- ✅ Al modificar el precio global del dólar, impacta en los precios de los materiales (costoARS y precioVenta se recalculan al guardar Finanzas).
- ✅ Lista de clientes: iconos de contacto directo WhatsApp con etiqueta del contacto.
- ✅ Modal de insumos: precios sin decimales, siempre número redondo.
- ✅ Al imprimir o descargar el PDF, el nombre del archivo es "PRES_(cliente) - (Trabajo)".
- ✅ Toggle Público/Gremio en cotizador Vinilo Corte: funciona cuando el material tiene precioGremio cargado.
- ✅ 85 materiales en lugar de 66: descartado, son materiales nuevos agregados manualmente.
- ✅ Scroll roto al cerrar modales: resuelto con MutationObserver global que restaura el overflow automáticamente.
- ✅ Lista de clientes vacía (crash): normalización defensiva de cuits/telefonos legacy desde MySQL.
- ✅ Botón Editar cliente abría la Ficha en lugar del modal de edición: resuelto con delegación de eventos en el tr.
- ✅ CUITs visibles en lista de clientes: eliminados, ahora solo se muestra nombre y rubro.
- ✅ Modal Nuevo Cliente y Editar Cliente con etiquetas en CUIT y teléfonos.
- ✅ Parámetros Láser/CNC: nombres editables inline y botón eliminar por fila.
- ✅ Pestaña renombrada a "Parámetros Láser / CNC" con campos Minuto Láser y Minuto CNC.
- ✅ Precio $/ML no persistía al recargar: normalización de claves con espacios dobles.
- ✅ precioGremio no persistía en modal de insumos: recalcularCostoReal ya no pisa el valor guardado.
- ✅ Fecha de entrega mostraba "A convenir" aunque estuviera guardada: gecko-docs.js ahora lee p.entrega || p.fechaEntrega || p.fecha_entrega.
- ✅ Cotización dólar online: chip BNA Oficial con valor del día desde dolarapi.com.
- ✅ Scoring de clientes a 4 niveles (Base / Bronce / Plata / Oro) con umbrales configurables.
- ✅ Validaciones con toast amarillo en Configuración: Cotización Dólar en $0, Hora Hombre en $0, materiales Láser sin precio.
- ✅ Sección Configuración: refresh visual completo con gecko Design System (tarjetas, inputs con prefijo, botones unificados).
- ✅ Barra fija Parámetros Láser reemplazada por botón al pie igual que las otras pestañas.

### Sesión 06/06/2026

- ✅ Bug crítico #1: Imágenes adjuntas y metadata (titulo, fechaEntrega, mostrarPrecios) no persistían tras recargar. Agregada columna metadata LONGTEXT en tabla presupuestos. api.php actualizado.
- ✅ Bug crítico #2: Precio $/ML en Parámetros Láser no persistía. Endpoint laser_params agregado a api.php en producción.
- ✅ Input número de teléfono oculto en modal Nuevo Cliente.
- ✅ Segundo teléfono no se guardaba.
- ✅ Costos Operativos mostraba valores vacíos: initConfiguracion ahora hace fetch desde MySQL al abrir el tab.
- ✅ Sin feedback visual al guardar Parámetros Láser.
- ✅ Búsqueda de clientes no filtraba la lista.

---

## CONTEXTO TÉCNICO IMPORTANTE

- `gecko-input-line` en styles.css tiene `width:100% !important` — cualquier override necesita `!important`.
- `gecko-fixes.js` usa un `setInterval` guardián que sobreescribe `window.renderClientes` con `_geckoRenderFijo` — fixes al render de clientes deben hacerse en `_geckoRenderFijo` directamente.
- Datos legacy de MySQL pueden devolver `cuits`, `telefonos`, `emails` como JSON strings en lugar de arrays — siempre normalizar con `Array.isArray()` + `JSON.parse()` fallback.
- Tabla `configuracion` usa patrón clave-valor con `REPLACE INTO` — todo el JSON de settings en una sola fila.
- `verDocumento` (gecko-docs.js) es la función correcta para previews — usa iframe + modal oscuro.
- El nombre del PDF se controla cambiando `document.title` antes de abrir la ventana de impresión.
- MutationObserver en main.js restaura `document.body.style.overflow` automáticamente al cerrar cualquier modal.




## BUGS DETECTADOR POR MI 

- Al generar un presupuesto, las imágenes adjuntas, no se muestran completas, solo se ve una pequeña parte. No toma el tamaño completo de la imagen.
 