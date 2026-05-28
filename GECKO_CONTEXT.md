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

### 🐛 Bug activo — URGENTE
Al presionar F5 en sección Finanzas, el `modalEditarCaja` aparece ocupando toda la pantalla. El `setTimeout(1500ms)` mejoró pero no resolvió del todo. Causa probable: `main.js` tiene su propia versión del modal que se activa antes del override de `gecko-fixes.js`.

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
1. Corregir bug F5 → modalEditarCaja pantalla completa
2. Terminar ajustes visuales modales de Finanzas
3. Ajustes visuales sección Clientes
4. Cambiar botones provisorios en Materiales
5. Subir todo a Hostinger y usar en producción real
6. Desarrollar cotizadores Láser / CNC
