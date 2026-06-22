# GECKO_CONTEXT — GeckoApp v2
> Leer este archivo antes de cualquier acción. No hacer cambios sin leerlo completo.

---

## EL PROYECTO
GeckoApp es una SPA (Single Page Application) de gestión interna para **Gecko Estudio Creativo** — estudio-taller de diseño gráfico e industrial en La Plata, Argentina. Servicios: impresión de gran formato, gráfica adhesiva, lonas, carteles, corporeos con/sin iluminación, letras en polifan/chapa/acrílico, impresión 3D, señalética, revestimiento de fachadas (ACM), productos de stock (table tent, carteles de vereda, paneles retroiluminados).

**Usuarios:** 5 personas — Renzo, Rodrigo, Agustín (admins), Nicolás, Sebastián (empleados).

---

## STACK TÉCNICO
- **Frontend:** Vanilla JS + Tailwind CSS — SPA, sin frameworks
- **Backend:** PHP + MySQL (Hostinger)
- **Producción:** `geckoestudio.ar/app` → archivos en `public_html/app/`
- **DB:** `u532400705_Gecko_app` — phpMyAdmin vía panel Hostinger
- **Repo:** `https://github.com/renzogecko/geckoapp-v2.git` (privado, rama `main`)
- **Local:** `H:\Mi unidad\GeckoApp_v2` — abrir `index.html` directo en browser (`file://`)

---

## ARCHIVOS DEL SISTEMA
| Archivo | Rol |
|---|---|
| `index.html` | App completa (~216kb), contiene modales estáticos |
| `main.js` | Lógica principal (~3800 líneas) — NO MODIFICAR sin necesidad |
| `gecko-fixes.js` | **Archivo principal de desarrollo** — fixes, funciones nuevas, overrides |
| `gecko-docs.js` | Sistema de presupuestos y OTs imprimibles |
| `gecko-api.js` | Intercepta localStorage y sincroniza con MySQL vía `api.php` |
| `gecko-mock-data.js` | Datos simulados — **solo entorno local**, NO subir a producción |
| `gecko-backup_14-5-2026.json` | Backup puntual — no tocar |
| `styles.css` | Estilos globales + Design System `gecko-*` |
| `api.php` | API REST PHP |
| `db_config.php` | Conexión PDO MySQL |

---

## REGLAS CRÍTICAS — RESPETAR SIEMPRE

1. **NUNCA regenerar archivos completos** — siempre fragmentos específicos con búsqueda exacta
2. **`main.js` tiene su propia `renderOts()`** que pisa la de `gecko-fixes.js`. Por eso `gecko-fixes.js` usa `setTimeout(1500ms)` para redefinirla después de que carga `main.js`. No reducir ese timeout.
3. **Todos los estilos `gecko-*` usan `!important`** — cualquier override también necesita `!important`
4. **Sin emojis en ningún lugar** — solo SVG lineales estilo outline
5. **Los selects nativos del browser** pueden ignorar `background` en dark mode — usar selectores múltiples + `-webkit/-moz-appearance: none`
6. **`gecko-mock-data.js` NO se sube a producción** — solo existe para desarrollo local
7. **No hacer commits automáticos** sin confirmación explícita del usuario

## REGLA FIJA: Limpieza de código duplicado

Cada vez que se detecte código duplicado, funciones viejas sin usar, o dos sistemas paralelos
resolviendo lo mismo (ej: dos definiciones CSS de la misma clase, dos funciones con nombres
similares para la misma acción), el agente debe:

1. Confirmar que ningún otro lugar del código llama a la versión vieja antes de tocar nada.
2. Eliminar el código viejo/duplicado por completo (no dejarlo comentado "por las dudas").
3. Informar en su respuesta qué se eliminó y por qué.

Motivo: en GeckoApp ya se generaron bugs reales por código duplicado acumulado de sesiones
anteriores (ej: doble definición de .gecko-btn-primary con !important, sistema viejo
confirmarConversionOT() conviviendo con el nuevo window._confirmarConversionOT()).
---

## DESIGN SYSTEM — clases gecko-*

**Modal de referencia visual:** `modalMaterial` en `index.html` — cualquier modal nuevo debe verse igual.

```
.gecko-modal-overlay   → overlay blur(4px) rgba(10,12,20,0.55)
.gecko-modal-box       → fondo #1e1f20, border-radius 1.25rem, padding 2rem
.gecko-modal-subtitle  → texto naranja #F15A24, uppercase, pequeño
.gecko-modal-title     → blanco, font-weight 900, uppercase
.gecko-label           → gris #64748b, uppercase, 0.68rem
.gecko-input-line      → input underline, sin caja
.gecko-input-group     → caja borde naranja + glow, fondo #131314
.gecko-select          → dropdown oscuro fondo #1e1f20, borde #333333
.gecko-toggle-btn      → pill, inactivo gris, activo naranja
.gecko-toggle-group    → flex nowrap
.gecko-btn-primary     → naranja #F15A24, pill, uppercase
.gecko-btn-cancel      → gris sutil, pill
.gecko-btn-danger      → borde rojo, texto rojo
.gecko-modal-footer    → flex, justify end, border-top sutil
```

**Variables CSS:**
```css
--gecko: #F15A24
--dark-bg: #131314
--dark-card: #1e1f20
--dark-input: #131314
--dark-border: #333333
```

---

## INVENTARIO DE MODALES

### `gecko-fixes.js` — dinámicos (document.createElement)
| Modal | Línea aprox. | Design System |
|---|---|---|
| `modalEditarCaja` | ~1517 | ✅ |
| `modalCotizadorManual` | ~154 | pendiente |
| `modalVerOT` | ~286 | pendiente |
| `modalEditarOT` | ~902 | pendiente |
| `modalSena` | ~999 | pendiente |
| `_geckoModalNuevoGasto` | ~2017 | pendiente |
| `_geckoModalEditGasto` | ~1949 | pendiente |

### `index.html` — estáticos
| Modal | Estado |
|---|---|
| `modalNuevaCaja`, `modalNuevoMovimiento`, `modalTransferencia` | ✅ Design System |
| `modalMaterial` | ✅ REFERENCIA — no tocar |
| Todos los demás | pendiente |

---

## ESTADO ACTUAL DEL PROYECTO

### ✅ Funcional / No tocar
- Sistema de presupuestos y OTs (guardado MySQL, lista, edición)
- Hojas membretadas imprimibles (`gecko-docs.js`)
- Sistema de cajas y movimientos (finanzas base)
- Modal seña/pagos
- Migración localStorage → MySQL (`gecko-api.js`)
- Design System aplicado a 4 modales de finanzas

### 🔧 En desarrollo activo
- **Finanzas:** ajustes visuales pendientes en modales (Code no los terminó)
- **Clientes:** ajustes visuales + datos de prueba
- **Materiales:** cambiar botones provisorios por definitivos
- **Cotizadores Láser / CNC:** por desarrollar


### ⏳ Pendiente de subir a producción
Los cambios de Design System (modales de finanzas) están en local y GitHub pero **no en Hostinger**. Hostinger está en el estado anterior.

---

## FLUJO DE TRABAJO

```
1. Renzo describe el cambio en claude.ai Chat
2. Claude analiza y genera el prompt exacto para el agente
3. Renzo pega el prompt en Antigravity y elige el agente
4. Agente edita los archivos
5. Renzo recarga index.html en browser para verificar
6. Si funciona → git add + git commit + git push (con mensaje descriptivo)
7. Cuando el conjunto de cambios está validado → subir a Hostinger vía File Manager
```

**Convención de commits:** mensajes descriptivos en español, ej: `fix: corregir modal editarCaja en F5` / `feat: agregar cotizador láser`

**Deploy manual a Hostinger:** solo los archivos modificados, vía File Manager del panel. Hostinger: usuario `u532400705_Renzo`, archivos en `public_html/app/`.

---

## PRIORIDAD INMEDIATA
1. Cotizador Gráfica — tarjeta "montado": unidades en alto/ancho (m, cm, mm)
2. Cotizador Gráfica — tarjeta "montado": calcular precio aunque no haya metros lineales de corte
3. Mensajes de confirmación en formularios que guardan en silencio (Costos Operativos, Parámetros Láser)
4. Tarjeta de item actual fija flotante en cotizadores
5. Re-editar items cargados al carrito

---

## PROTOCOLO DE DEBUGGING — REGLAS ANTES DE ARMAR CUALQUIER PROMPT

Antes de escribir cualquier prompt para el agente, siempre seguir estos pasos:

### Paso 1 — Inspeccionar el elemento real
- Click derecho sobre el elemento con el bug → Inspeccionar
- Verificar el `id` exacto del elemento en el HTML
- Nunca asumir IDs — siempre confirmarlos visualmente
- Ejemplo: asumimos `id="manualFecha"` y era `id="gpmFecha"`

### Paso 2 — Probar el fix en la consola del browser ANTES de mandarlo al agente
- Abrir F12 → Consola
- Escribir el fix directamente en la consola y ver si funciona
- Si funciona en consola → recién ahí armar el prompt para el agente
- Esto evita ciclos de prompt → falla → nuevo prompt → falla

### Paso 3 — Una conversación nueva por tarea en Antigravity
- Cada bug o feature = conversación nueva en Antigravity
- El agente acumula contexto y se confunde con historial viejo
- Siempre empezar con git pull, siempre terminar con commit + push

### Paso 4 — Prompts quirúrgicos, sin margen de interpretación
- Decir exactamente QUÉ archivo, QUÉ línea buscar, QUÉ agregar
- Agregar siempre al final: "No analices el archivo. No agregues nada extra."
- Cuanto más corto y específico el prompt, menos errores comete el agente

### Flujo completo de un fix
1. Ver el bug en el browser
2. Inspeccionar el elemento (F12 → Elements) → confirmar ID y estructura
3. Probar el fix en consola (F12 → Console) → confirmar que funciona
4. Armar prompt quirúrgico con los datos reales
5. Nueva conversación en Antigravity → pegar prompt
6. Verificar en browser (Ctrl+Shift+R para limpiar caché)
7. Commit + push

---

## APRENDIZAJES TÉCNICOS — Sesión 16/06/2026

### getGeckoItem — conflicto materiales vs servicios
`getGeckoItem` busca en un pool combinado de materiales + servicios. Si un material tiene un nombre similar al servicio buscado, lo encuentra primero y devuelve valores incorrectos (ej: buscar "Troquelado" encuentra "Sticker Troquelado - Simple" en vinilos_lonas con precioVenta calculado incorrecto).
**Regla:** Para terminaciones y servicios, NO usar `getGeckoItem`. Siempre buscar directamente:
```js
const servicios = JSON.parse(localStorage.getItem('geckoServicios') || '[]');
const serv = servicios.find(s => s.nombre?.toLowerCase().includes('nombre_servicio'));
const precio = serv ? (serv.precio || serv.precioVenta || FALLBACK) : FALLBACK;
```

### precio vs precioVenta en servicios
Los servicios cargados manualmente tienen `precio` como campo principal. `precioVenta` es un campo calculado automáticamente (costoARS × multiplicador) que puede dar 0 si el costo es 0. Siempre leer `serv.precio || serv.precioVenta || fallback`.

### contenedorHistorialCierres — ID real en el HTML
El contenedor del historial de cierres en `index.html` tiene id `contenedorHistorialCierres`. No existe ningún elemento hijo `repoHistorialCierres`. Escribir siempre directo en `contenedorHistorialCierres.innerHTML`.

### main.js pisa overrides de gecko-fixes.js
`main.js` carga después de `gecko-fixes.js` y redefine funciones como `renderReportesDashboard` y `ejecutarCierreMensual`. Si un fix en `gecko-fixes.js` no tiene efecto, verificar si `main.js` tiene su propia versión que la pisa. Solución: en `gecko-fixes.js` renombrar la función con prefijo `_gecko` y hacer que `main.js` delegue a ella.

### HISTORICO_CIERRES — carga al inicio
`window.HISTORICO_CIERRES` puede estar `undefined` cuando `renderReportesDashboard` corre por primera vez. Siempre usar como fallback:
```js
const hist = window.HISTORICO_CIERRES || JSON.parse(localStorage.getItem('gecko_historico_cierres') || '[]');
```

### Cierre de mes — flujo completo
1. `ejecutarCierreMensual()` en main.js delega a `window._ejecutarCierreMensualGecko()` en gecko-fixes.js
2. Al confirmar: reinicia gastos fijos, guarda cierre en localStorage Y en MySQL via fetch POST a `api.php?endpoint=historico_cierres`
3. Muestra modal con balance (Ingresos / Egresos / Balance neto) + botón Descargar PDF
4. PDF generado por `window._generarPDFCierreMes()`

### Tabla historico_cierres en MySQL
Columnas: `id, periodo, mes, anio, ingresos, gastos, balance, fecha_cierre, movimientos, gastos_fijos`
Mapeada en gecko-api.js como `gecko_historico_cierres → historico_cierres`
