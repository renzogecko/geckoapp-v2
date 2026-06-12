markdown# GECKO_AUDITOR_RULES.md
## Reglas de implementación del Auditor de Cálculo

Este archivo define el patrón canónico para implementar el auditor en cada cotizador.
Aplicar SIEMPRE estas reglas al agregar o modificar auditores.

---

## PATRÓN CANÓNICO (referencia: corte.js ✅)

### 1. INYECCIÓN DINÁMICA — nunca en el HTML template
El auditorWrap SIEMPRE se crea via JS con `appendChild` directo en `panelConfigurador`.
NUNCA poner `<div id="geckoAuditorXxx">` en el template HTML de la función render().

```javascript
const panelConf = document.getElementById('panelConfigurador');
let auditorWrap = document.getElementById('geckoAuditorXxx');
if (!auditorWrap && panelConf) {
    auditorWrap = document.createElement('div');
    auditorWrap.id = 'geckoAuditorXxx';
    auditorWrap.style.marginTop = '-33px';
    panelConf.appendChild(auditorWrap);
}
```

### 2. ESTADO VACÍO — siempre visible aunque no haya datos
El auditor NUNCA desaparece. Cuando no hay datos muestra un mensaje.
El `else` NUNCA usa `auditorWrap.innerHTML = ''`.

```javascript
if (hayDatos) {
    auditorWrap.innerHTML = `
        
            Auditor de cálculo
            ${html}
        `;
} else {
    auditorWrap.innerHTML = `
        
            Auditor de cálculo
            Completá los campos para ver el desglose
        `;
}
```

### 3. BOTÓN — siempre después del auditor, también dinámico
El botón "+ Añadir a Cotización" va DESPUÉS del auditor, ambos con `appendChild`.
Si el cotizador ya tenía el botón en el HTML template, quitarlo del template.

```javascript
let btnWrap = document.getElementById('btnXxxAnadir');
if (!btnWrap && panelConf) {
    btnWrap = document.createElement('div');
    btnWrap.id = 'btnXxxAnadir';
    btnWrap.style.marginTop = '12px';
    btnWrap.innerHTML = `
        + AÑADIR A COTIZACIÓN`;
    panelConf.appendChild(btnWrap);
}
```

### 4. INIT — calcular() siempre al inicializar
La función `init()` del cotizador SIEMPRE termina llamando a `calcular()` con setTimeout.

```javascript
// Al final de init():
setTimeout(() => this.calcular(), 50);
// O si es función global:
setTimeout(() => window.calcularCostoXxx(), 50);
```

### 5. AUDITORES INLINE — ocultar, nunca eliminar

```html




```

### 6. SIN DOBLE CARD
El `card-gecko` lo agrega SOLO el JS dentro del innerHTML de auditorWrap.
El div container (auditorWrap) es siempre un `<div>` sin clases.
Verificar que el auditorWrap NO esté dentro de ningún `seccion-switch-gecko` ni `card-gecko`.

---

## ESTRUCTURA DE ZONAS DEL AUDITOR
ZONA 1 — MATERIALES

• NombreMaterial  detalle (área/ML × precio/unidad)  $subtotal
ZONA 2 — SERVICIOS / PROCESO

• NombreServicio  detalle (cantidad × precio/unidad)  $subtotal
ZONA 3 — EXTRAS / TERMINACIONES (opcional)

• NombreExtra  detalle  $subtotal
SEPARADOR

TOTAL DEL ÍTEM                                        $TOTAL (naranja, 20px)

---

## ESTADO POR COTIZADOR

| Cotizador | Archivo | Dinámico | Estado vacío | margin -33px | init calcular | Inline ocultos |
|-----------|---------|----------|--------------|--------------|---------------|----------------|
| Láser/CNC | laser.js | ✅ | ❌ | ❌ | ✅ | n/a |
| Gráfica Impresión | grafica.js | ❌ | ❌ | ❌ | ❌ | ✅ |
| Vinilo Corte | corte.js | ✅ | ✅ | ✅ | ✅ | ✅ |
| Textil | textil.js | ❌ | ❌ | ❌ | ❌ | ❌ |
| Impresión 3D | impresion3d.js | ❌ | ❌ | ❌ | ✅ | n/a |
| Bastidores | bastidores.js | ❌ | ❌ | ❌ | ✅ | parcial |
| Polifán | corporeos.js | ❌ | ❌ | ❌ | ❌ | parcial |
| Corpóreos | corporeos.js | ❌ | ❌ | ❌ | ❌ | n/a |