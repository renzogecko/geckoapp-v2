# 🦎 GeckoApp v2 — Contexto de traspaso entre sesiones

> Pegá este archivo entero al inicio de la próxima conversación con Claude.
> Contiene: bugs pendientes, rediseño visual aprobado, y reglas de oro.

---

## PARTE 1 — Bugs pendientes (orden de prioridad por riesgo)

### 🔴 CRÍTICOS — afectan cálculo de precios, no operar sin esto resuelto

**1. Polifán: cálculo de corte da $3.8M por 1m²**
- Síntoma: un montado sobre polifán 30mm de 1m × 1m con corte 1500ml devuelve $3.853.089.
- Causa probable: el material no tiene `precioCorteMl` cargado y el cálculo cae a un fallback que multiplica mal.
- Fix esperado: si falta un parámetro de cálculo, el auditor debe mostrar **"FALTA PARÁMETRO: precioCorteMl"** en rojo y devolver $0, **nunca** un número inventado.

**2. Cotizador Gráfica/Corte: no llegan precios**
- Síntoma: Transfer no devuelve precio. Ploter 60cm y Ploter 120cm tampoco.
- Causa probable: el cotizador busca el material/servicio por nombre exacto. Tras la re-importación de servicios algunos nombres tienen diferencias (espacios, mayúsculas, guiones), o los IDs cambiaron.
- Fix esperado: revisar la función de lookup, normalizar nombres (trim + lowercase) o cambiar a búsqueda por ID.

### 🟡 IMPORTANTES — datos y UI rotos

**3. Parámetros de corte láser/CNC vaciados**
- Síntoma: todos los materiales que tenían el switch "¿Se puede cortar con láser?" en ON ahora están en OFF, y la tabla de Configuración → Parámetros Láser/CNC está vacía.
- Causa: la re-importación SQL pisó el flag `tieneParametrosCorte` con `false` por defecto del JSON de backup.
- Decisión pendiente: ¿restaurar manualmente con Renzo, o el JSON de backup los traía y hay que re-procesarlo?

**4. Productos Gecko con precio fijo no guardan precio venta**
- Síntoma: al crear un producto con estrategia FIJA, completar "Precio venta sugerido" y "Precio gremio", al guardar el precio venta queda en $0 y solo persiste el gremio.
- Causa probable: bug en la función guardar — campo mal mapeado o sobreescrito.

**5. Servicios: botones editar y borrar no funcionan**
- Síntoma: en la lista de servicios, los botones del lápiz y el tachito no hacen nada al clickear.
- Causa probable: los IDs de servicios cambiaron tras la re-importación. Los handlers buscan por un ID que ya no existe.

**6. Servicios: modal editar no trae datos**
- Síntoma: al abrir editar servicio, el formulario aparece vacío en lugar de pre-cargado con los datos del ítem.
- Causa probable: relacionado con el #5 — no encuentra el servicio por ID.

---

## PARTE 2 — Rediseño visual aprobado de Reportes (Finanzas)

> **Estado: 100% COMPLETA (05/07/2026).** Los 3 prompts ya están aplicados en producción: prompt 1 (limpieza de Mix de Ventas por `it.tipo`), prompt 2 (Chart.js + donut + área), y prompt 3 (Punto de Equilibrio, Ticket Promedio por Rubro, count-up animado y ajustes visuales de espaciado/sombras/títulos). Ver detalle de lo resuelto en BUGS_Y_MEJORAS.md, sesión 05/07/2026. Bug nuevo detectado durante esta parte: BUG-007 (items de cotizadores etiquetados 'grafica' por defecto), pendiente para próxima sesión.

### Decisiones de diseño ya cerradas (no volver a discutir)

- **Stack:** Chart.js desde jsDelivr (NO cdnjs, da 404). URL en index.html:
  `https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js`
- **Mix de Ventas:** donut con 6 rubros separados (Gráfica / Láser-CNC / Corpóreos / Textil / Industrial / Impresión 3D), leyenda lateral con conteo, total al centro.
- **Paleta unificada del donut** (tierras y naranjas, sin azules/violetas/rosas chillones):
  - Gráfica: `#F15A24`
  - Láser/CNC: `#E07A4E`
  - Corpóreos: `#C98A5E`
  - Textil: `#6FA8A0`
  - Industrial: `#5E84A8`
  - Impresión 3D: `#8C7BA6`
  - Otros: `#71717a`
- **Ingresos por Categoría:** área con degradado, binario Gráfica vs Industrial, lee `p.categoria` del Presupuesto Manual.
- **Mapa canónico de rubros** (vive en `main.js`, función `rubroDeItem`):
  - `grafica` / `corte` → Gráfica
  - `corporeos` → Corpóreos
  - `laser_cnc` → Láser/CNC
  - `textil` → Textil
  - `3d` / `impresion3d` → Impresión 3D
  - `bastidores` → Industrial
  - `manual` → según `p.categoria`
  - desconocido → "Otros" (NUNCA inventar "Industrial")

### Pendiente en Reportes

**A. Métricas con count-up animado**
Ticket Promedio, Tasa de Cierre, Dinero Estancado y Rubro+Rentable deben animar el número al cargar (de 0 al valor real, con easing). Función simple en JS, sin librería extra.

**B. Card hero de Punto de Equilibrio (nueva, va arriba de todo en Reportes)**
- Muestra: PE en $ (necesario para cubrir costos fijos), PE en cantidad de OTs (PE ÷ ticket promedio), barra de progreso (facturado vs PE) con línea blanca al 100%.
- Footer con 3 datos: costos fijos del mes, margen de contribución %, % de avance del mes.
- Cálculo:
  - Costos fijos = suma de `gecko_gastos_fijos` + egresos del mes con categoría Alquiler/Sueldos
  - Margen contribución = (Ingresos − costos variables insumos) / Ingresos
  - PE en $ = Costos fijos / Margen contribución
  - PE en OTs = PE en $ / Ticket promedio
- Card destacada con borde y fondo `rgba(241,90,36,0.07)` y borde `rgba(241,90,36,0.35)`.

**C. "Rubro más rentable" (métrica nueva)**
Card chiquita con el rubro de mayor margen real (no volumen). Calcular: `(ingresos rubro − costos insumos rubro) / ingresos rubro`. Mostrar nombre del rubro + % de margen.

### Mockup de referencia
El mockup visual ya fue aprobado en la sesión anterior. Si la nueva sesión quiere ver la dirección visual, puede pedir un re-render del widget de visualización.

---

## PARTE 3 — Estado de datos al cierre de la sesión

- ✅ Base MySQL restaurada vía SQL directo: 67 materiales, 38 servicios
- ✅ Blindaje aplicado: catálogos de materiales nunca se borran por sync (solo alta/update)
- ✅ Fix botón Importar: espera sincronización antes de recargar
- ⚠️ Aún sin blindar: tabla `servicios` y `clientes` tienen la misma vulnerabilidad que tenía materiales antes del fix. **Pendiente aplicar protección idéntica.**

---

## PARTE 4 — Reglas de oro (ver archivo separado `GECKO_REGLAS_DE_ORO.md`)

Antes de tocar cualquier código que afecte datos, cálculos o sincronización, leer y respetar las reglas. Las reglas son obligatorias y no negociables, tanto para Claude (este agente) como para los agentes de Antigravity (Sonnet/Opus).