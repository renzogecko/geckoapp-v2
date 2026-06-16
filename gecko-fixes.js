
// ── Alias para compatibilidad con llamadas directas de main.js ──
if (typeof renderizarFinanzas === 'undefined') {
    window.renderizarFinanzas = function () {
        if (window._renderizarFinanzasCompleto) {
            window._renderizarFinanzasCompleto();
        }
    };
}

/**
 * ================================================================
 * GECKO FIXES v2.0
 * ================================================================
 * - Fix: procesarGuardado
 * - Fix: nombres textil
 * - Fix: cotizador manual
 * - Fix: renderPresupuestos (con botones correctos)
 * - Fix: renderOts (con desplegable de estado + botones)
 * - Fix: verDocumento (preview sin auto-print)
 * - Fix: modal seña multi-caja
 * - Fix: convertirPresupuestoAOT con pregunta de seña
 * - Fix: sistema de cajas
 * ================================================================
 */

// ══════════════════════════════════════════════════════
// FIX 1: procesarGuardado — Guardar presupuesto / OT
// ══════════════════════════════════════════════════════

window.procesarGuardado = function (status) {
    const cliente = document.getElementById('clienteNombre')?.value?.trim() || 'Cliente Genérico';
    const total = parseFloat(document.getElementById('precioTotal')?.value) ||
        parseFloat(document.getElementById('labelTotalPresupuesto')?.innerText?.replace(/[$.\\s]/g, '').replace(',', '.')) || 0;
    const categoria = document.getElementById('categoriaPedido')?.value || 'Gráfica';

    if (!window.presupuesto || window.presupuesto.length === 0) {
        alert('Agregá al menos un ítem antes de guardar.');
        return;
    }

    let lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');

    const editId = window._editandoPresupuestoId;
    if (editId) {
        // UPDATE existing
        const idx = lista.findIndex(x => String(x.id) === String(editId));
        if (idx !== -1) {
            lista[idx] = Object.assign({}, lista[idx], {
                cliente, total, categoria,
                items: window.presupuesto.map(it => ({ ...it })),
                status: lista[idx].status, // preserve OT/Cotizado
            });
            localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(lista));
            window._editandoPresupuestoId = null;

            const successEl = document.getElementById('successVista');
            if (successEl) { successEl.classList.remove('hidden'); successEl.classList.add('flex'); }
            if (typeof window.mostrarExito === 'function') window.mostrarExito(`Presupuesto #${editId} actualizado`, '¡Guardado!');
            if (typeof window.renderPresupuestos === 'function') window.renderPresupuestos();
            if (typeof window.renderOts === 'function') window.renderOts();
            window.presupuesto = [];
            if (typeof window.renderizarPresupuesto === 'function') window.renderizarPresupuesto();
            console.log(`✅ GECKO: Presupuesto #${editId} actualizado.`);
            return;
        }
    }

    // INSERT new
    const id = window.nextBudgetId || (parseInt(localStorage.getItem('gecko_nextId')) || 1001);
    const nuevo = {
        id, cliente, categoria,
        fecha: new Date().toLocaleDateString('es-AR'),
        total, status,
        sena: 0,
        estado_ot: status === 'OT' ? 'En Proceso' : '',
        items: window.presupuesto.map(it => ({ ...it })),
        metodo_pago: ''
    };

    lista.push(nuevo);
    localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(lista));

    window.nextBudgetId = id + 1;
    localStorage.setItem('gecko_nextId', window.nextBudgetId);

    const successEl = document.getElementById('successVista');
    if (successEl) { successEl.classList.remove('hidden'); successEl.classList.add('flex'); }

    if (typeof window.mostrarExito === 'function') {
        window.mostrarExito(
            status === 'OT' ? `OT #${id} generada para ${cliente}` : `Presupuesto #${id} guardado`,
            status === 'OT' ? '¡OT Creada!' : '¡Guardado!'
        );
    }

    if (typeof window.renderPresupuestos === 'function') window.renderPresupuestos();
    if (typeof window.renderOts === 'function') window.renderOts();

    window.presupuesto = [];
    if (typeof window.renderizarPresupuesto === 'function') window.renderizarPresupuesto();

    console.log(`✅ GECKO: ${status} #${id} guardado.`, nuevo);
};

// ══════════════════════════════════════════════════════
// FIX 2: Nombres del cotizador Textil
// ══════════════════════════════════════════════════════

document.addEventListener('inventoryReady', () => {
    const _getOriginal = window.getGeckoItem;
    window.getGeckoItem = function (query) {
        const resultado = _getOriginal(query);
        if (resultado) return resultado;

        const aliases = {
            'DTF TEXTIL': ['DTF - TEXTIL', 'DTF TEXTIL', 'DTF'],
            'ESTAMPADO': ['ESTAMPADO', 'ESTAMPADO '],
            'TERMOVINILO': ['TERMOVINILO', 'TERMO'],
            'PLOTER DE CORTE - 60CM': ['PLOTER DE CORTE - 60CM', 'PLOTER DE CORTE  - 60CM', 'PLOTER 60', 'PLOTER DE CORTE'],
            'PLOTER 60': ['PLOTER DE CORTE - 60CM', 'PLOTER DE CORTE  - 60CM'],
            'SERVICIO DE CORTE': ['PLOTER DE CORTE - 60CM', 'PLOTER DE CORTE  - 60CM', 'PLOTER DE CORTE - 120CM'],
            'DTF': ['DTF - TEXTIL', 'DTF - UV'],
            'TERMO': ['TERMOVINILO']
        };

        const qNorm = String(query).toUpperCase().trim().replace(/\s+/g, ' ');
        const alternativas = aliases[qNorm] || [];

        for (const alt of alternativas) {
            const res = _getOriginal(alt);
            if (res) {
                console.log(`🦎 GECKO-FIX: Alias resuelto "${query}" → "${alt}"`);
                return res;
            }
        }
        return null;
    };
    console.log('🦎 GECKO-FIX: Aliases textil activados.');
});


// ══════════════════════════════════════════════════════
// COTIZADOR MANUAL
// ══════════════════════════════════════════════════════

window.abrirCotizadorManual = function () {
    if (document.getElementById('modalCotizadorManual')) {
        document.getElementById('modalCotizadorManual').style.display = 'flex';
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'modalCotizadorManual';
    modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:9999;background:rgba(10,12,20,0.75);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:16px;';

    modal.innerHTML = `
    <div style="background:#141417;border:1px solid #27272a;border-radius:24px;width:100%;max-width:640px;max-height:90vh;overflow-y:auto;padding:32px;position:relative;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
            <div>
                <h2 style="color:#F15A24;font-size:20px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin:0;">Presupuesto Manual</h2>
                <p style="color:#71717a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:4px 0 0 0;">Ingresá los ítems manualmente</p>
            </div>
            <button onclick="document.getElementById('modalCotizadorManual').style.display='none'"
                style="background:#27272a;border:none;color:#71717a;width:36px;height:36px;border-radius:12px;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;">✕</button>
        </div>
        <div style="margin-bottom:16px;">
            <label style="display:block;color:#71717a;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Cliente</label>
            <input type="text" id="manualCliente" list="listaSugerenciasClientes" placeholder="Nombre del cliente..."
                style="width:100%;background:#09090b;border:1px solid #27272a;border-radius:12px;padding:12px 16px;color:white;font-size:14px;font-weight:700;outline:none;box-sizing:border-box;">
        </div>
        <div style="margin-bottom:16px;">
            <label style="display:block;color:#71717a;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Categoría</label>
            <select id="manualCategoria" class="gecko-select-pro" style="font-weight:700;">
                <option value="Gráfica">Gráfica</option>
                <option value="Industrial">Industrial</option>
            </select>
        </div>
        <div style="margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <label style="color:#71717a;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;">Ítems del trabajo</label>
                <button onclick="window._agregarFilaManual()"
                    style="background:#F15A24;border:none;color:white;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">
                    + Agregar ítem
                </button>
            </div>
            <div id="filasManual" style="display:flex;flex-direction:column;gap:8px;"></div>
        </div>
        <div style="background:#09090b;border:1px solid #27272a;border-radius:16px;padding:16px 20px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
            <span style="color:#71717a;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;">TOTAL</span>
            <span id="manualTotal" style="color:#F15A24;font-size:28px;font-weight:900;">$0</span>
        </div>
        <div style="display:flex;gap:12px;">
            <button onclick="window._guardarManual('Cotizado')"
                style="flex:1;padding:14px;background:transparent;border:1px solid #F15A24;color:#F15A24;border-radius:14px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;cursor:pointer;">
                Generar Presupuesto
            </button>
            <button onclick="window._guardarManual('OT')"
                style="flex:1;padding:14px;background:#F15A24;border:none;color:white;border-radius:14px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;cursor:pointer;">
                Generar OT
            </button>
        </div>
    </div>`;

    document.body.appendChild(modal);

    // Bug fix: forzar apertura del calendario en input[type=date]
    setTimeout(function () {
        var campoFecha = document.getElementById('manualFecha');
        if (campoFecha) {
            campoFecha.addEventListener('click', function () {
                try { this.showPicker(); } catch (e) { }
            });
        }
    }, 100);

    window._agregarFilaManual();
};

window._agregarFilaManual = function () {
    const contenedor = document.getElementById('filasManual');
    if (!contenedor) return;
    const fila = document.createElement('div');
    fila.style.cssText = 'display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;';
    fila.innerHTML = `
        <input type="text" placeholder="Descripción del trabajo..." class="fila-manual-desc"
            style="background:#09090b;border:1px solid #27272a;border-radius:10px;padding:10px 14px;color:white;font-size:13px;font-weight:600;outline:none;width:100%;box-sizing:border-box;">
        <input type="number" placeholder="Precio" class="fila-manual-precio" oninput="window._recalcularManual()"
            style="background:#09090b;border:1px solid #27272a;border-radius:10px;padding:10px 14px;color:#F15A24;font-size:13px;font-weight:900;outline:none;width:130px;text-align:right;">
        <button onclick="this.closest('div').remove(); window._recalcularManual();"
            style="background:#27272a;border:none;color:#71717a;width:36px;height:36px;border-radius:10px;cursor:pointer;font-size:16px;flex-shrink:0;">✕</button>
    `;
    contenedor.appendChild(fila);
};

window._recalcularManual = function () {
    const precios = document.querySelectorAll('.fila-manual-precio');
    let total = 0;
    precios.forEach(p => { total += parseFloat(p.value) || 0; });
    const el = document.getElementById('manualTotal');
    if (el) el.innerText = '$' + Math.round(total).toLocaleString('es-AR');
};

window._guardarManual = function (status) {
    const cliente = document.getElementById('manualCliente')?.value?.trim() || 'Cliente Genérico';
    const filas = document.querySelectorAll('#filasManual > div');
    const items = [];
    filas.forEach(fila => {
        const desc = fila.querySelector('.fila-manual-desc')?.value?.trim();
        const precio = parseFloat(fila.querySelector('.fila-manual-precio')?.value) || 0;
        if (desc && precio > 0) {
            items.push({ tipo: 'manual', nombre: desc, textoOpciones: desc, costo: precio, otDetalle: desc, origen: 'manual' });
        }
    });
    if (items.length === 0) { alert('Agregá al menos un ítem con descripción y precio.'); return; }

    const total = items.reduce((acc, it) => acc + it.costo, 0);
    const cat = document.getElementById('manualCategoria')?.value || 'Gráfica';

    // Asignar tipo correcto a cada ítem según la categoría para que el Mix de Ventas funcione
    const catATipo = { 'Gráfica': 'grafica', 'Industrial': 'bastidores', 'Corpóreos': 'corporeos', 'Láser/CNC': 'laser_cnc', 'Textil': 'textil' };
    items.forEach(it => { it.tipo = catATipo[cat] || 'grafica'; });

    // Garantizar ID único
    const _listaActual = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const _maxId = _listaActual.length > 0 ? Math.max(..._listaActual.map(x => parseInt(x.id) || 0)) : 1000;
    window._nextPresupuestoId = _maxId + 1;

    window.presupuesto = items;
    if (document.getElementById('precioTotal')) document.getElementById('precioTotal').value = total;

    const clienteInput = document.getElementById('clienteNombre');
    if (clienteInput) clienteInput.value = cliente;

    const catSelect = document.getElementById('categoriaPedido');
    if (catSelect) catSelect.value = cat;

    document.getElementById('modalCotizadorManual').style.display = 'none';
    window.procesarGuardado(status);
    setTimeout(() => {
        if (typeof window.switchMenu === 'function') window.switchMenu('pedidos');
    }, 300);
};


// ══════════════════════════════════════════════════════
// VISTA PREVIA SIN AUTO-PRINT
// Esta función sobreescribe la versión básica de gecko-docs.js
// ══════════════════════════════════════════════════════

window.verDocumento = function (id) {
    if (typeof window._imprimirDocumento === 'function') {
        window._imprimirDocumento(id);
    }
};

window._imprimirDocumento = async function (id) {
    // Usar verDocumento (gecko-docs.js) que tiene el modal oscuro correcto
    if (typeof window.verDocumento === 'function') {
        window.verDocumento(id);
    }
    // Redirección post-print al cerrar
    const _checkClosed = setInterval(() => {
        if (!document.getElementById('modalVerDocumento')) {
            clearInterval(_checkClosed);
            const destino = window._gpmPostPrintRedirect;
            window._gpmPostPrintRedirect = null;
            if (destino && typeof window.switchMenu === 'function') {
                window.switchMenu('pedidos');
                setTimeout(() => {
                    if (typeof window.switchTabPedidos === 'function') {
                        window.switchTabPedidos(destino);
                    }
                }, 100);
            }
        }
    }, 500);
};

window._descargarDocumento = async function (id) {
    const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const p = lista.find(x => String(x.id) === String(id));
    if (!p) return;

    const esOT = p.status === 'OT';
    const html = esOT
        ? await window.generarDocOT({ ...p, entrega: p.fecha_entrega || 'A confirmar', imagenes: p.imagenes || [] })
        : await window.generarDocPresupuesto({ ...p, entrega: p.fechaEntrega || 'A convenir', imagenes: p.imagenes || [] });

    const clienteSlug = (p.cliente || 'cliente').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '').trim().replace(/\s+/g, '_');
    const tituloSlug = (p.titulo || '').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, '').trim().replace(/\s+/g, '_');
    const nombreArchivo = esOT
        ? `OT_${String(id).padStart(4, '0')}_${clienteSlug}`
        : `Pres_${clienteSlug}${tituloSlug ? '_' + tituloSlug : ''}`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { alert("Permití las ventanas emergentes para descargar."); return; }

    const htmlConPrint = html.replace('</title>', `</title><script>
        window.onload = function() {
            document.title = '${nombreArchivo}';
            setTimeout(function() { window.print(); }, 300);
            window.onafterprint = function() { window.close(); };
        };
    <\/script>`);

    win.document.write(htmlConPrint);
    win.document.close();
};

window._descargarDesdePopup = function () {
    // Descargar directamente desde el contenido del popup actual
    const { jsPDF } = window.jspdf;
    const nombreArchivo = document.title || 'presupuesto';
    html2canvas(document.body, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgHeight = (canvas.height * pageWidth) / canvas.width;
        let position = 0;
        let remaining = imgHeight;
        while (remaining > 0) {
            pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeight);
            remaining -= pageHeight;
            position -= pageHeight;
            if (remaining > 0) pdf.addPage();
        }
        pdf.save(nombreArchivo + '.pdf');
    });
};


// ══════════════════════════════════════════════════════
// ESTADOS OT
// ══════════════════════════════════════════════════════

const ESTADOS_OT = ['En Proceso', 'En Taller', 'Impresión', 'Terminaciones', 'Listo', 'Entregado'];
const ESTADO_COLORS = {
    'En Proceso': { bg: '#F15A24', text: 'white' },
    'En Taller': { bg: '#8b5cf6', text: 'white' },
    'Impresión': { bg: '#3b82f6', text: 'white' },
    'Terminaciones': { bg: '#f59e0b', text: 'white' },
    'Listo': { bg: '#10b981', text: 'white' },
    'Entregado': { bg: '#6b7280', text: 'white' },
};

// ── Detectar categoría (Gráfica / Industrial) ──
window._detectarCategoria = function (doc) {
    // Explicit field wins
    if (doc.categoria === 'Gráfica' || doc.categoria === 'Industrial') return doc.categoria;

    var area = (doc.area || '');
    if (/gr[aá]fica/i.test(area)) return 'Gráfica';
    if (/industrial/i.test(area)) return 'Industrial';

    var texto = (doc.items || []).map(function (it) {
        return ((it.nombre || '') + ' ' + (it.textoOpciones || '')).toLowerCase();
    }).join(' ');
    if (!texto.trim()) return 'Gráfica'; // default for print shops

    var kwGraf = ['banner', 'flex', 'lona', 'vinilo', 'ploter', 'plotter', 'impresión', 'impresion', 'folleter', 'serigraf', 'dtf', 'folio', 'rígido', 'rigido', 'cartel', 'vidriera', 'textil', 'estampado', 'termovinilo', 'bordado', 'sublimaci', 'remera', 'prenda'];
    var kwInd = ['industrial', 'chapa', 'acero', 'led', 'luminoso'];

    if (kwInd.some(function (k) { return texto.includes(k); })) return 'Industrial';
    if (kwGraf.some(function (k) { return texto.includes(k); })) return 'Gráfica';
    return 'Gráfica';
};

window._tagCategoria = function (doc) {
    var cat = window._detectarCategoria(doc);
    if (!cat) return '';
    var C = {
        'Gráfica': 'background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.3);color:#60a5fa;',
        'Industrial': 'background:rgba(168,85,247,0.12);border:1px solid rgba(168,85,247,0.3);color:#c084fc;'
    };
    var s = C[cat] || C['Gráfica'];
    return '<span style="display:inline-block;padding:1px 7px;' + s + 'border-radius:4px;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">' + cat + '</span>';
};

window._cambiarEstadoOTDesplegable = function (id, nuevoEstado) {
    if (nuevoEstado === 'Entregado') {
        if (!confirm('¿Confirmar entrega? El trabajo pasará al historial.')) return;
    }
    let lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const idx = lista.findIndex(x => String(x.id) === String(id));
    if (idx === -1) return;
    lista[idx].estado_ot = nuevoEstado;
    localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(lista));

    const _C = { 'En Proceso': '#F15A24', 'En Taller': '#8b5cf6', 'Impresión': '#3b82f6', 'Terminaciones': '#f59e0b', 'Listo': '#10b981', 'Entregado': '#6b7280' };
    const color = _C[nuevoEstado] || '#F15A24';
    const wrapper = document.getElementById('estado-ot-' + id);
    if (wrapper) {
        const trigger = wrapper.querySelector('div');
        if (trigger) {
            trigger.style.background = color + '22';
            trigger.style.borderColor = color + '55';
            trigger.querySelectorAll('span').forEach(s => s.style.color = color);
        }
        const label = document.getElementById('estado-ot-label-' + id);
        if (label) label.textContent = nuevoEstado;
    }
    if (nuevoEstado === 'Entregado') {
        setTimeout(() => window.renderOts(), 300);
    }
};

window._toggleEstadoDropdown = function (id, event) {
    event.stopPropagation();
    document.querySelectorAll('[id^="estado-ot-dropdown-"]').forEach(d => {
        if (d.id !== 'estado-ot-dropdown-' + id) d.style.display = 'none';
    });
    const dd = document.getElementById('estado-ot-dropdown-' + id);
    if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
};

window._seleccionarEstadoOT = function (id, estado) {
    const dd = document.getElementById('estado-ot-dropdown-' + id);
    if (dd) dd.style.display = 'none';
    window._cambiarEstadoOTDesplegable(id, estado);
};

// Cerrar dropdowns al hacer clic fuera
document.addEventListener('click', function () {
    document.querySelectorAll('[id^="estado-ot-dropdown-"]').forEach(d => d.style.display = 'none');
    ['sena1Forma-dropdown', 'sena1Caja-dropdown', 'sena2Forma-dropdown', 'sena2Caja-dropdown'].forEach(function (did) {
        const d = document.getElementById(did);
        if (d) d.style.display = 'none';
    });
});

// ── Eliminar OT con modal Gecko ──
window.eliminarOT = function (id) {
    document.getElementById('modalConfirmEliminarOT')?.remove();
    const modal = document.createElement('div');
    modal.id = 'modalConfirmEliminarOT';
    modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:10000;background:rgba(10,12,20,0.75);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = `
        <div style="background:#141417;border:1px solid #27272a;border-radius:24px;width:100%;max-width:400px;padding:32px;text-align:center;">
            <div style="width:56px;height:56px;background:rgba(239,68,68,0.1);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px auto;">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#ef4444" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
            </div>
            <h3 style="color:white;font-size:18px;font-weight:900;margin:0 0 8px 0;">Eliminar OT #${String(id).padStart(4, '0')}</h3>
            <p style="color:#71717a;font-size:13px;margin:0 0 28px 0;">Esta acción no se puede deshacer. La OT será eliminada permanentemente.</p>
            <div style="display:flex;gap:10px;">
                <button onclick="document.getElementById('modalConfirmEliminarOT').remove()"
                    style="flex:1;padding:13px;background:transparent;border:1px solid #27272a;color:#71717a;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">Cancelar</button>
                <button onclick="window._confirmarEliminarOT('${id}')"
                    style="flex:1;padding:13px;background:#ef4444;border:none;color:white;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">Eliminar</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
};

window._confirmarEliminarOT = function (id) {
    let lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    lista = lista.filter(x => String(x.id) !== String(id));
    localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(lista));
    document.getElementById('modalConfirmEliminarOT')?.remove();
    if (typeof window.mostrarExito === 'function') window.mostrarExito(`OT #${id} eliminada.`, 'Listo');
    window.renderOts();
};

// ── Dropdowns custom para modal de pago ──
window._htmlDropdownPago = function (inputId, opciones, valorDefault) {
    const opts = opciones.map(function (op) {
        return `<div onclick="window._setDropdownPagoValue('${inputId}','${op}');event.stopPropagation()"
              style="padding:10px 16px;font-size:12px;font-weight:700;color:#a1a1aa;cursor:pointer;border-bottom:1px solid #1a1a1d;"
              onmouseover="this.style.color='white';this.style.background='#1f1f23'"
              onmouseout="this.style.color='#a1a1aa';this.style.background='transparent'">${op}</div>`;
    }).join('');
    return `<div id="${inputId}-wrapper" style="position:relative;width:100%;">
        <input type="hidden" id="${inputId}" value="${valorDefault}">
        <div onclick="window._toggleDropdownPago('${inputId}',event)"
             style="display:flex;align-items:center;justify-content:space-between;background:#09090b;border:1px solid #27272a;border-radius:12px;padding:10px 14px;cursor:pointer;box-sizing:border-box;width:100%;">
            <span id="${inputId}-label" style="color:white;font-size:13px;font-weight:700;">${valorDefault}</span>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#6b7280" stroke-width="2.5" style="flex-shrink:0;"><path stroke-linecap="round" stroke-linejoin="round" d="m19 9-7 7-7-7"/></svg>
        </div>
        <div id="${inputId}-dropdown" style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:#141417;border:1px solid #27272a;border-radius:12px;z-index:1001;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.6);">
            ${opts}
        </div>
    </div>`;
};

window._toggleDropdownPago = function (id, event) {
    event.stopPropagation();
    ['sena1Forma', 'sena1Caja', 'sena2Forma', 'sena2Caja'].forEach(function (did) {
        if (did !== id) { const d = document.getElementById(did + '-dropdown'); if (d) d.style.display = 'none'; }
    });
    const dd = document.getElementById(id + '-dropdown');
    if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
};

window._setDropdownPagoValue = function (id, value) {
    const input = document.getElementById(id);
    const label = document.getElementById(id + '-label');
    const dd = document.getElementById(id + '-dropdown');
    if (input) input.value = value;
    if (label) label.textContent = value;
    if (dd) dd.style.display = 'none';
};


// ══════════════════════════════════════════════════════
// RENDER PRESUPUESTOS — 4 botones correctos
// ══════════════════════════════════════════════════════

window.renderPresupuestos = async function () {
    const tbody = document.getElementById('tbodyPresupuestos');
    if (!tbody) return;

    if (window._geckoAPIPromise) await window._geckoAPIPromise;

    const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');

    if (typeof listaPresupuestos !== 'undefined') {
        listaPresupuestos.length = 0;
        lista.forEach(p => listaPresupuestos.push(p));
    }
    window.listaPresupuestos = lista;

    const busqueda = document.getElementById('filtroPresupuestoBusqueda')?.value?.toLowerCase() || '';
    const mostrarHistorial = window._mostrarHistorialPresupuestos || false;

    const filtrados = lista.filter(p => {
        const esPresupuesto = p.status === 'Cotizado' || p.status === 'Presupuesto';
        if (!mostrarHistorial && !esPresupuesto) return false;
        if (mostrarHistorial && esPresupuesto) return false;
        if (busqueda && !p.cliente?.toLowerCase().includes(busqueda)) return false;
        return true;
    });

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-16 text-center text-zinc-500 font-medium italic">
            ${mostrarHistorial ? 'Sin historial de presupuestos.' : 'No hay presupuestos activos.'}
        </td></tr>`;
        return;
    }

    tbody.innerHTML = filtrados.map(p => {
        const resumen = (p.items || []).map(it => it.nombre || it.textoOpciones || '').filter(Boolean).join(' · ') || 'Sin ítems';
        return `
        <tr draggable="true" data-drag-key="${p.id}" class="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors" style="cursor:grab;">
            <td class="py-4 px-6 font-black text-zinc-400 text-[11px]">#${p.id}</td>
            <td class="py-4 px-6 text-[12px] text-zinc-400 font-bold">${p.fecha || ''}</td>
            <td class="py-4 px-6">
                <span class="font-extrabold dark:text-white text-[14px] uppercase">${p.cliente || 'S/N'}</span>
            </td>
            <td class="py-4 px-6 max-w-[220px]">
                <div class="flex flex-col">
                    ${window._tagCategoria(p)}
                    <span class="text-[11px] text-zinc-500 font-medium truncate">${resumen}</span>
                </div>
            </td>
            <td class="py-4 px-6 font-black text-gecko text-[14px]">$${Math.round(p.total || 0).toLocaleString('es-AR')}</td>
            <td class="py-4 px-6 text-right">
                <div class="flex justify-end gap-2">
                    <button onclick="window.verDocumento(${p.id})" title="Ver"
                        class="p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 transition-all duration-150 hover:scale-110 hover:text-white hover:border-zinc-500">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    </button>
                    <button onclick="window.editarPresupuesto(${p.id})" title="Editar"
                        class="p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 transition-all duration-150 hover:scale-110 hover:text-white hover:border-zinc-500">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    <button onclick="window.convertirPresupuestoAOT(${p.id})" title="Convertir a OT"
                        class="p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 transition-all duration-150 hover:scale-110 hover:text-white hover:border-zinc-500">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </button>
                    <button onclick="window.eliminarPresupuesto(${p.id})" title="Eliminar"
                        class="p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 transition-all duration-150 hover:scale-110 hover:text-white hover:border-zinc-500">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
    if (typeof window._geckoDragTable === 'function') {
        window._geckoDragTable(tbody, function (srcId, dstId) {
            const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
            const si = lista.findIndex(x => String(x.id) === String(srcId));
            const di = lista.findIndex(x => String(x.id) === String(dstId));
            if (si < 0 || di < 0) return;
            const moved = lista.splice(si, 1)[0];
            lista.splice(di, 0, moved);
            localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(lista));
            window.renderPresupuestos();
        });
    }
};

window.toggleHistorialPresupuestos = function () {
    window._mostrarHistorialPresupuestos = !window._mostrarHistorialPresupuestos;
    const btn = document.getElementById('btnToggleHistorialPresupuestosText');
    if (btn) btn.innerText = window._mostrarHistorialPresupuestos ? 'Ver Activos' : 'Ver Historial Presupuestos';
    window.renderPresupuestos();
};

window.eliminarPresupuesto = function (id) {
    document.getElementById('_geckoConfirmElimPres')?.remove();
    const modal = document.createElement('div');
    modal.id = '_geckoConfirmElimPres';
    modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:10000;background:rgba(10,12,20,0.75);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = `
        <div style="background:#141417;border:1px solid #27272a;border-radius:24px;width:100%;max-width:400px;padding:32px;text-align:center;">
            <div style="width:56px;height:56px;background:rgba(239,68,68,0.1);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px auto;">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#ef4444" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
            </div>
            <h3 style="color:white;font-size:18px;font-weight:900;margin:0 0 8px 0;">Eliminar presupuesto #${id}</h3>
            <p style="color:#71717a;font-size:13px;margin:0 0 28px 0;">Esta acción no se puede deshacer. El presupuesto será eliminado permanentemente.</p>
            <div style="display:flex;gap:10px;">
                <button onclick="document.getElementById('_geckoConfirmElimPres').remove()"
                    style="flex:1;padding:13px;background:transparent;border:1px solid #27272a;color:#71717a;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">Cancelar</button>
                <button id="_geckoElimPresOk"
                    style="flex:1;padding:13px;background:#ef4444;border:none;color:white;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">Eliminar</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.getElementById('_geckoElimPresOk').onclick = function () {
        modal.remove();
        let lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
        lista = lista.filter(x => String(x.id) !== String(id));
        localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(lista));
        window.renderPresupuestos();
    };
};

// ──────────────────────────────────────────────────────
// CONVERTIR PRESUPUESTO → OT  (con modal de seña)
// ──────────────────────────────────────────────────────
window._confirmarConversionOT = function (id) {
    let lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const p = lista.find(x => String(x.id) === String(id));
    if (!p) return;
    p.status = 'OT';
    p.estado_ot = 'En Proceso';
    // Preservar fecha de entrega del presupuesto original si existe
    if (!p.fecha_entrega && p.metadata) {
        try {
            const meta = typeof p.metadata === 'string' ? JSON.parse(p.metadata) : p.metadata;
            if (meta.fechaEntrega) p.fecha_entrega = meta.fechaEntrega;
        } catch (e) { }
    }
    localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(lista));
    if (typeof window.mostrarExito === 'function') window.mostrarExito(`OT #${id} generada`, '¡Listo!');
    window.renderPresupuestos();
    if (typeof window.renderOts === 'function') window.renderOts();
    // Ask about deposit with Gecko modal
    setTimeout(() => {
        document.getElementById('_geckoConfirmSena')?.remove();
        const m2 = document.createElement('div');
        m2.id = '_geckoConfirmSena';
        m2.style.cssText = 'display:flex;position:fixed;inset:0;z-index:10000;background:rgba(10,12,20,0.75);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:16px;';
        m2.innerHTML = `
            <div style="background:#141417;border:1px solid #27272a;border-radius:24px;width:100%;max-width:400px;padding:32px;text-align:center;">
                <div style="width:56px;height:56px;background:rgba(34,197,94,0.1);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px auto;">
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#22c55e" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                </div>
                <h3 style="color:white;font-size:18px;font-weight:900;margin:0 0 8px 0;">OT #${id} generada</h3>
                <p style="color:#71717a;font-size:13px;margin:0 0 28px 0;">¿El cliente realizó un pago de seña o adelanto?</p>
                <div style="display:flex;gap:10px;">
                    <button onclick="document.getElementById('_geckoConfirmSena').remove()"
                        style="flex:1;padding:13px;background:transparent;border:1px solid #27272a;color:#71717a;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">No, después</button>
                    <button id="_geckoSenaSi"
                        style="flex:1;padding:13px;background:#22c55e;border:none;color:white;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">Sí, registrar</button>
                </div>
            </div>`;
        document.body.appendChild(m2);
        m2.addEventListener('click', e => { if (e.target === m2) m2.remove(); });
        document.getElementById('_geckoSenaSi').onclick = function () { m2.remove(); window.abrirModalSena(id); };
    }, 400);
};

window.convertirPresupuestoAOT = function (id) {
    document.getElementById('_geckoConfirmConvOT')?.remove();
    const modal = document.createElement('div');
    modal.id = '_geckoConfirmConvOT';
    modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:10000;background:rgba(10,12,20,0.75);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = `
        <div style="background:#141417;border:1px solid #27272a;border-radius:24px;width:100%;max-width:400px;padding:32px;text-align:center;">
            <div style="width:56px;height:56px;background:rgba(241,90,36,0.1);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px auto;">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#F15A24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            </div>
            <h3 style="color:white;font-size:18px;font-weight:900;margin:0 0 8px 0;">Convertir a OT</h3>
            <p style="color:#71717a;font-size:13px;margin:0 0 28px 0;">El presupuesto <strong style="color:white;">#${id}</strong> pasará al tablero de Órdenes de Trabajo.</p>
            <div style="display:flex;gap:10px;">
                <button onclick="document.getElementById('_geckoConfirmConvOT').remove()"
                    style="flex:1;padding:13px;background:transparent;border:1px solid #27272a;color:#71717a;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">Cancelar</button>
                <button id="_geckoConvOTOk"
                    style="flex:1;padding:13px;background:#F15A24;border:none;color:white;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">Convertir</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.getElementById('_geckoConvOTOk').onclick = function () {
        modal.remove();
        window._confirmarConversionOT(id);
    };
};

// ──────────────────────────────────────────────────────
// EDITAR PRESUPUESTO
// ──────────────────────────────────────────────────────
window.editarPresupuesto = function (id) {
    const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const p = lista.find(x => String(x.id) === String(id));
    if (!p) return;

    window.presupuesto = (p.items || []).map(it => ({ ...it }));

    const clienteInput = document.getElementById('clienteNombre');
    if (clienteInput) clienteInput.value = p.cliente || '';

    window._editandoPresupuestoId = id;

    if (typeof window.renderizarPresupuesto === 'function') window.renderizarPresupuesto();
    if (typeof window.switchMenu === 'function') window.switchMenu('cotizadores');

    setTimeout(() => {
        // Restore categoria select
        const catSelect = document.getElementById('categoriaPedido');
        if (catSelect && p.categoria) catSelect.value = p.categoria;

        // Ensure the active cotizador form body is rendered
        const activeCat = localStorage.getItem('gecko_activeCategory') || 'grafica';
        if (typeof window.cambiarCategoriaCotizador === 'function') {
            window.cambiarCategoriaCotizador(activeCat);
        }
    }, 150);
};

// Hook switchMenu unificado — pedidos, finanzas, presupuestoManual
const _switchMenuOriginal = window.switchMenu;
window.switchMenu = function (view) {
    if (typeof _switchMenuOriginal === 'function') _switchMenuOriginal(view);
    if (view === 'pedidos') {
        setTimeout(() => {
            window.renderPresupuestos();
            if (typeof window.renderOts === 'function') window.renderOts();
        }, 50);
    }
    if (view === 'finanzas') {
        setTimeout(() => window.renderizarFinanzas(), 50);
    }
    if (view === 'presupuestoManual') {
        setTimeout(() => window.abrirPresupuestadorManual(window._editandoPresupuestoId || null), 30);
    }
};


// ══════════════════════════════════════════════════════
// RENDER OTS — desplegable de estado + botones Ver/Editar/Seña
// Se define ahora y se llama también desde geckoDB_ready
// ══════════════════════════════════════════════════════

window.renderOts = async function () {
    const tbody = document.getElementById('tbodyOts');
    if (!tbody) return;

    const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const ots = lista.filter(p => p.status === 'OT');
    const mostrarHistorial = window._mostrarHistorialOts || false;
    const busqueda = document.getElementById('filtroOtBusqueda')?.value?.toLowerCase() || '';

    const filtrados = ots.filter(ot => {
        const entregado = ot.estado_ot === 'Entregado';
        if (!mostrarHistorial && entregado) return false;
        if (mostrarHistorial && !entregado) return false;
        if (busqueda && !ot.cliente?.toLowerCase().includes(busqueda)) return false;
        return true;
    });

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="py-16 text-center text-zinc-500 font-medium italic">
            ${mostrarHistorial ? 'Sin historial de OTs.' : 'No hay órdenes de trabajo activas.'}
        </td></tr>`;
        return;
    }

    tbody.innerHTML = filtrados.map(ot => {
        const estado = ot.estado_ot || 'En Proceso';
        const COLORES_OT = { 'En Proceso': '#F15A24', 'En Taller': '#8b5cf6', 'Impresión': '#3b82f6', 'Terminaciones': '#f59e0b', 'Listo': '#10b981', 'Entregado': '#6b7280' };
        const color = COLORES_OT[estado] || '#F15A24';
        const saldo = (ot.total || 0) - (ot.sena || 0);
        const estadoOpts = ESTADOS_OT.map(e =>
            `<div onclick="window._seleccionarEstadoOT('${ot.id}','${e}');event.stopPropagation()"
                  style="padding:8px 14px;cursor:pointer;font-size:10px;font-weight:900;text-transform:uppercase;color:${COLORES_OT[e] || '#F15A24'};letter-spacing:0.5px;"
                  onmouseover="this.style.background='#1f1f23'" onmouseout="this.style.background='transparent'">${e}</div>`
        ).join('');

        return `
        <tr draggable="true" data-drag-key="${ot.id}" class="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors border-b border-gray-100 dark:border-gray-800" style="cursor:grab;">
            <td class="py-4 px-6 text-[11px] font-black uppercase text-zinc-500">#${ot.id}</td>
            <td class="py-4 px-6">
                <span class="text-[14px] font-extrabold dark:text-white uppercase">${ot.cliente || 'S/N'}</span>
            </td>
            <td class="py-4 px-6">
                <div class="flex flex-wrap gap-1">
                    ${(ot.items || []).map(it => `<span class="text-[9px] font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded uppercase">${it.textoOpciones || it.nombre || ''}</span>`).join('')}
                </div>
            </td>
            <td class="py-4 px-6 text-[11px] text-zinc-400 font-bold">${ot.fecha_entrega || '—'}</td>
            <td class="py-4 px-6 text-center">
                <div id="estado-ot-${ot.id}" style="position:relative;display:inline-block;">
                    <div onclick="window._toggleEstadoDropdown('${ot.id}',event)"
                         style="display:flex;align-items:center;gap:8px;background:${color}22;border:1.5px solid ${color}55;border-radius:20px;padding:6px 10px 6px 12px;cursor:pointer;min-width:115px;">
                        <span id="estado-ot-label-${ot.id}" style="color:${color};font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;flex:1;">${estado}</span>
                        <span style="color:${color};font-size:8px;flex-shrink:0;">▼</span>
                    </div>
                    <div id="estado-ot-dropdown-${ot.id}" style="display:none;position:absolute;top:calc(100% + 4px);left:0;background:#141417;border:1px solid #27272a;border-radius:12px;z-index:1000;min-width:140px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.5);">
                        ${estadoOpts}
                    </div>
                </div>
            </td>
            <td class="py-4 px-6 text-right font-black text-white text-[14px]">
                $${Math.round(ot.total || 0).toLocaleString('es-AR')}
            </td>
            <td class="py-4 px-6 text-right font-black text-[14px] ${saldo > 0 ? 'text-red-400' : 'text-emerald-400'}">
                $${Math.round(saldo).toLocaleString('es-AR')}
            </td>
            <td class="py-4 px-6 text-right">
                <div class="flex justify-end gap-2">
                    <button onclick="window.verDocumento('${ot.id}')"
                        class="p-2 bg-zinc-700/50 text-zinc-300 rounded-lg hover:bg-zinc-600 hover:text-white transition-all" title="Ver OT">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    </button>
                    <button onclick="window.editarOT('${ot.id}')"
                        class="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-all" title="Editar OT">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    <button onclick="window.abrirModalSena('${ot.id}')"
                        class="p-2 bg-amber-500/10 text-amber-400 rounded-lg hover:bg-amber-500 hover:text-white transition-all" title="Registrar Pago">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </button>
                    <button onclick="window.eliminarOT('${ot.id}')"
                        class="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all" title="Eliminar OT">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
    if (typeof window._geckoDragTable === 'function') {
        window._geckoDragTable(tbody, function (srcId, dstId) {
            const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
            const si = lista.findIndex(x => String(x.id) === String(srcId));
            const di = lista.findIndex(x => String(x.id) === String(dstId));
            if (si < 0 || di < 0) return;
            const moved = lista.splice(si, 1)[0];
            lista.splice(di, 0, moved);
            localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(lista));
            window.renderOts();
        });
    }
};

window.toggleHistorialOts = function () {
    window._mostrarHistorialOts = !window._mostrarHistorialOts;
    const btn = document.getElementById('btnToggleHistorialText');
    if (btn) btn.innerText = window._mostrarHistorialOts ? 'Ver Activas' : 'Ver Historial';
    window.renderOts();
};


// ══════════════════════════════════════════════════════
// EDITAR OT — modal
// ══════════════════════════════════════════════════════

window.editarOT = function (id) {
    const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const ot = lista.find(x => String(x.id) === String(id));
    if (!ot) return;

    document.getElementById('modalEditarOT')?.remove();
    const modal = document.createElement('div');
    modal.id = 'modalEditarOT';
    modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:9999;background:rgba(10,12,20,0.75);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:16px;';

    const inputStyle = 'width:100%;background:#09090b;border:1px solid #27272a;border-radius:12px;padding:10px 14px;color:white;font-size:13px;font-weight:600;outline:none;box-sizing:border-box;font-family:inherit;';
    const labelStyle = 'display:block;color:#71717a;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:7px;';

    const itemsHTML = (ot.items || []).map((it, i) => `
        <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #1f1f23;">
            <span style="color:#52525b;font-size:9px;font-family:monospace;">${String(i + 1).padStart(2, '0')}</span>
            <span style="color:white;font-size:11px;font-weight:600;flex:1;">${it.nombre || it.textoOpciones || 'Ítem'}</span>
            <span style="color:#F15A24;font-size:11px;font-family:monospace;">$${Math.round(it.costo || 0).toLocaleString('es-AR')}</span>
        </div>
    `).join('');

    modal.innerHTML = `
    <div style="background:#141417;border:1px solid #27272a;border-radius:24px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;padding:28px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <div>
                <p style="color:#F15A24;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:3px;">🔧 Orden de Trabajo #${String(id).padStart(4, '0')}</p>
                <h2 style="color:white;font-size:18px;font-weight:900;margin:0;">Editar OT</h2>
            </div>
            <button onclick="document.getElementById('modalEditarOT').remove()" style="background:#27272a;border:none;color:#71717a;width:34px;height:34px;border-radius:10px;cursor:pointer;font-size:16px;">✕</button>
        </div>
        <div style="background:#09090b;border:1px solid #27272a;border-radius:14px;padding:12px 16px;margin-bottom:16px;">
            <p style="color:#71717a;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Ítems del trabajo</p>
            ${itemsHTML || '<p style="color:#52525b;font-size:11px;">Sin ítems</p>'}
        </div>
        <div style="margin-bottom:14px;">
            <label style="${labelStyle}">Cliente</label>
            <input type="text" id="otEditCliente" value="${ot.cliente || ''}" style="${inputStyle}">
        </div>
        <div style="margin-bottom:14px;">
            <label style="${labelStyle}">Área / Operario asignado</label>
            <input type="text" id="otEditArea" value="${ot.area || ''}" placeholder="Ej: Taller Gráfica · Juan" style="${inputStyle}">
        </div>
        <div style="margin-bottom:14px;">
            <label style="${labelStyle}">Fecha de entrega</label>
            <input type="text" id="otEditEntrega" value="${ot.fecha_entrega || ''}" placeholder="Ej: 30/05/2026" style="${inputStyle}">
        </div>
        <div style="margin-bottom:14px;">
            <label style="${labelStyle}">⚠ Instrucciones especiales de producción</label>
            <textarea id="otEditInstrucciones" rows="5" placeholder="Ej: Pintar con verde furioso..." style="${inputStyle}resize:vertical;border-left:3px solid #F15A24;">${ot.instrucciones || ''}</textarea>
        </div>
        <div style="display:flex;gap:10px;">
            <button onclick="document.getElementById('modalEditarOT').remove()" style="flex:1;padding:13px;background:transparent;border:1px solid #27272a;color:#71717a;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">Cancelar</button>
            <button onclick="window._guardarEdicionOT('${id}')" style="flex:1;padding:13px;background:#1A1A1A;border:1px solid #27272a;color:white;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">💾 Guardar</button>
            <button onclick="window._reimprimir('${id}')" style="flex:1;padding:13px;background:#F15A24;border:none;color:white;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">🖨 Reimprimir</button>
        </div>
    </div>`;

    document.body.appendChild(modal);
};

window._guardarEdicionOT = function (id) {
    let lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const idx = lista.findIndex(x => String(x.id) === String(id));
    if (idx === -1) return;

    lista[idx].cliente = document.getElementById('otEditCliente')?.value?.trim() || lista[idx].cliente;
    lista[idx].area = document.getElementById('otEditArea')?.value?.trim() || '';
    lista[idx].fecha_entrega = document.getElementById('otEditEntrega')?.value?.trim() || '';
    lista[idx].instrucciones = document.getElementById('otEditInstrucciones')?.value?.trim() || '';

    localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(lista));
    document.getElementById('modalEditarOT')?.remove();

    if (typeof window.mostrarExito === 'function') window.mostrarExito(`OT #${id} actualizada.`, '¡Guardado!');
    if (typeof window.renderOts === 'function') window.renderOts();
};

window._reimprimir = async function (id) {
    const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const p = lista.find(x => String(x.id) === String(id));
    if (!p || typeof window.generarDocOT !== 'function') return;
    // Usa verDocumento para mostrar preview con toolbar
    window.verDocumento(id);
    document.getElementById('modalEditarOT')?.remove();
};


// ══════════════════════════════════════════════════════
// MODAL DE SEÑA (con soporte para múltiples cajas)
// ══════════════════════════════════════════════════════

window.abrirModalSena = function (id) {
    const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const ot = lista.find(x => String(x.id) === String(id));
    if (!ot) return;

    document.getElementById('modalSena')?.remove();
    const cajas = JSON.parse(localStorage.getItem('gecko_cajas') || '[]');
    const totalPendiente = (ot.total || 0) - (ot.sena || 0);

    const inputStyle = 'width:100%;background:#09090b;border:1px solid #27272a;border-radius:12px;padding:10px 14px;color:white;font-size:13px;font-weight:600;outline:none;box-sizing:border-box;font-family:inherit;';
    const labelStyle = 'display:block;color:#71717a;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:7px;';

    const modal = document.createElement('div');
    modal.id = 'modalSena';
    modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:9999;background:rgba(10,12,20,0.75);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:16px;';

    const formasPago = ['Efectivo', 'Transferencia', 'Débito', 'Crédito', 'MercadoPago'];
    const cajasList = cajas.map(c => c.nombre);
    const cajasDefault = cajasList[0] || '';

    modal.innerHTML = `
    <div style="background:#141417;border:1px solid #27272a;border-radius:24px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;padding:28px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <div>
                <p style="color:#F15A24;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:3px;">Registro de Pago</p>
                <h2 style="color:white;font-size:18px;font-weight:900;margin:0;">OT #${String(id).padStart(4, '0')} · ${ot.cliente}</h2>
            </div>
            <button onclick="document.getElementById('modalSena').remove()" style="background:#27272a;border:none;color:#71717a;width:34px;height:34px;border-radius:10px;cursor:pointer;font-size:16px;">✕</button>
        </div>

        <!-- Resumen -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px;">
            <div style="background:#09090b;border:1px solid #27272a;border-radius:12px;padding:12px;">
                <p style="color:#71717a;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Total OT</p>
                <p style="color:white;font-size:16px;font-weight:900;">$${Math.round(ot.total || 0).toLocaleString('es-AR')}</p>
            </div>
            <div style="background:#09090b;border:1px solid #27272a;border-radius:12px;padding:12px;">
                <p style="color:#71717a;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Pagado</p>
                <p style="color:#10b981;font-size:16px;font-weight:900;">$${Math.round(ot.sena || 0).toLocaleString('es-AR')}</p>
            </div>
            <div style="background:#09090b;border:1px solid ${totalPendiente > 0 ? '#ef4444' : '#10b981'};border-radius:12px;padding:12px;">
                <p style="color:#71717a;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Saldo</p>
                <p style="color:${totalPendiente > 0 ? '#ef4444' : '#10b981'};font-size:16px;font-weight:900;">$${Math.round(totalPendiente).toLocaleString('es-AR')}</p>
            </div>
        </div>

        <!-- Tipo de pago -->
        <div style="margin-bottom:16px;">
            <label style="${labelStyle}">Tipo de pago</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <button id="tipoPagoSeña" onclick="window._toggleTipoPago('seña')"
                    style="padding:10px;background:#1A1A1A;border:1px solid #3f3f46;color:#a1a1aa;border-radius:10px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">
                    Seña / Parcial
                </button>
                <button id="tipoPagoSaldo" onclick="window._toggleTipoPago('saldo')"
                    style="padding:10px;background:#09090b;border:1px solid #27272a;color:#71717a;border-radius:10px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">
                    Saldo Final
                </button>
            </div>
        </div>

        <!-- Pago 1 -->
        <div style="background:#09090b;border:1px solid #27272a;border-radius:14px;padding:16px;margin-bottom:12px;">
            <p style="color:#F15A24;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">Pago 1</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
                <div>
                    <label style="${labelStyle}">Monto</label>
                    <input type="number" id="sena1Monto" placeholder="$0" style="${inputStyle}" oninput="window._calcularResto('${id}')">
                </div>
                <div>
                    <label style="${labelStyle}">Forma de pago</label>
                    ${window._htmlDropdownPago('sena1Forma', formasPago, 'Efectivo')}
                </div>
            </div>
            <div>
                <label style="${labelStyle}">Ingresa a caja</label>
                ${cajasList.length > 0 ? window._htmlDropdownPago('sena1Caja', cajasList, cajasDefault) : '<p style="color:#52525b;font-size:11px;padding:8px 0;">Sin cajas creadas</p><input type="hidden" id="sena1Caja" value="">'}
            </div>
        </div>

        <!-- Pago 2 (opcional) -->
        <div id="pago2Container" style="display:none;background:#09090b;border:1px solid #27272a;border-radius:14px;padding:16px;margin-bottom:12px;">
            <p style="color:#3b82f6;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">Pago 2 <span style="color:#52525b;">(ej: resto en efectivo)</span></p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
                <div>
                    <label style="${labelStyle}">Monto</label>
                    <input type="number" id="sena2Monto" placeholder="$0" style="${inputStyle}">
                </div>
                <div>
                    <label style="${labelStyle}">Forma de pago</label>
                    ${window._htmlDropdownPago('sena2Forma', formasPago, 'Efectivo')}
                </div>
            </div>
            <div>
                <label style="${labelStyle}">Ingresa a caja</label>
                ${cajasList.length > 0 ? window._htmlDropdownPago('sena2Caja', cajasList, cajasDefault) : '<p style="color:#52525b;font-size:11px;padding:8px 0;">Sin cajas creadas</p><input type="hidden" id="sena2Caja" value="">'}
            </div>
        </div>

        <button onclick="window._togglePago2()" id="btnTogglePago2"
            style="width:100%;padding:10px;background:transparent;border:1px dashed #27272a;color:#52525b;border-radius:10px;font-size:11px;font-weight:700;cursor:pointer;margin-bottom:16px;">
            + Agregar segundo pago (ej: parte en transferencia + parte en efectivo)
        </button>

        <div style="margin-bottom:20px;">
            <label style="${labelStyle}">Nota (opcional)</label>
            <input type="text" id="senaNota" placeholder="Ej: Seña 60% por transferencia" style="${inputStyle}">
        </div>

        <div style="display:flex;gap:10px;">
            <button onclick="document.getElementById('modalSena').remove()" style="flex:1;padding:13px;background:transparent;border:1px solid #27272a;color:#71717a;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">Cancelar</button>
            <button onclick="window._registrarSena('${id}')" style="flex:2;padding:13px;background:#22c55e;border:none;color:white;border-radius:12px;font-size:12px;font-weight:900;text-transform:uppercase;cursor:pointer;">Registrar Pago</button>
        </div>
    </div>`;

    document.body.appendChild(modal);
    window._tipoPagoActual = 'seña';
    window._senaPendiente = totalPendiente;
};

window._toggleTipoPago = function (tipo) {
    window._tipoPagoActual = tipo;
    const btnSeña = document.getElementById('tipoPagoSeña');
    const btnSaldo = document.getElementById('tipoPagoSaldo');
    if (tipo === 'seña') {
        if (btnSeña) { btnSeña.style.background = '#1A1A1A'; btnSeña.style.border = '1px solid #3f3f46'; btnSeña.style.color = '#a1a1aa'; }
        if (btnSaldo) { btnSaldo.style.background = '#09090b'; btnSaldo.style.border = '1px solid #27272a'; btnSaldo.style.color = '#71717a'; }
    } else {
        if (btnSaldo) { btnSaldo.style.background = '#10b981'; btnSaldo.style.border = '1px solid #10b981'; btnSaldo.style.color = 'white'; }
        if (btnSeña) { btnSeña.style.background = '#09090b'; btnSeña.style.border = '1px solid #27272a'; btnSeña.style.color = '#71717a'; }
        const m1 = document.getElementById('sena1Monto');
        if (m1 && window._senaPendiente > 0) m1.value = window._senaPendiente;
    }
};

window._togglePago2 = function () {
    const container = document.getElementById('pago2Container');
    const btn = document.getElementById('btnTogglePago2');
    if (!container) return;
    const visible = container.style.display !== 'none';
    container.style.display = visible ? 'none' : 'block';
    if (btn) btn.textContent = visible
        ? '+ Agregar segundo pago (ej: parte en transferencia + parte en efectivo)'
        : '− Quitar segundo pago';
};

window._calcularResto = function (id) {
    // Podría autocompletar el 2do pago, por ahora vacío
};

window._registrarSena = function (id) {
    const monto1 = parseFloat(document.getElementById('sena1Monto')?.value) || 0;
    const forma1 = document.getElementById('sena1Forma')?.value || 'Efectivo';
    const caja1 = document.getElementById('sena1Caja')?.value || '';
    const monto2 = parseFloat(document.getElementById('sena2Monto')?.value) || 0;
    const forma2 = document.getElementById('sena2Forma')?.value || 'Efectivo';
    const caja2 = document.getElementById('sena2Caja')?.value || '';
    const nota = document.getElementById('senaNota')?.value || '';
    const tipo = window._tipoPagoActual || 'seña';

    if (monto1 <= 0) { alert('Ingresá un monto válido.'); return; }

    const totalPago = monto1 + monto2;
    const fecha = new Date().toLocaleDateString('es-AR');

    // Actualizar OT
    let lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const idx = lista.findIndex(x => String(x.id) === String(id));
    if (idx === -1) return;

    lista[idx].sena = (lista[idx].sena || 0) + totalPago;
    localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(lista));

    // Registrar movimientos en finanzas
    const _ls = window._localStorage_original || localStorage;
    const movimientos = JSON.parse(_ls.getItem('gecko_movimientos') || '[]');
    const desc = tipo === 'saldo' ? 'Saldo final' : 'Seña';
    const cliente = lista[idx].cliente || 'Cliente';

    const mov1 = {
        id: 'mov_' + Date.now(),
        fecha, caja: caja1, tipo: 'Ingreso', monto: monto1,
        detalle: `${desc} OT#${id} - ${cliente}${nota ? ' · ' + nota : ''}`,
        categoria: tipo === 'saldo' ? 'Cobro Final' : 'Seña'
    };
    movimientos.push(mov1);

    let mov2 = null;
    if (monto2 > 0) {
        mov2 = {
            id: 'mov_' + (Date.now() + 1),
            fecha, caja: caja2, tipo: 'Ingreso', monto: monto2,
            detalle: `${desc} OT#${id} - ${cliente} (${forma2})${nota ? ' · ' + nota : ''}`,
            categoria: tipo === 'saldo' ? 'Cobro Final' : 'Seña'
        };
        movimientos.push(mov2);
    }

    // Actualizar saldo de cajas
    const cajas = JSON.parse(_ls.getItem('gecko_cajas') || '[]');
    const actualizarCaja = (nombre, monto) => {
        const c = cajas.find(x => x.nombre === nombre);
        if (c) {
            c.saldo = (parseFloat(c.saldo) || 0) + monto;
            fetch('/app/api.php?endpoint=cajas', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(c)
            }).catch(() => { });
        }
    };
    if (caja1) actualizarCaja(caja1, monto1);
    if (caja2 && monto2 > 0) actualizarCaja(caja2, monto2);

    // Guardar todo
    const movsStr = JSON.stringify(movimientos);
    const cajasStr = JSON.stringify(cajas);
    _ls.setItem('gecko_movimientos', movsStr);
    _ls.setItem('gecko_cajas', cajasStr);
    localStorage.setItem('gecko_movimientos', movsStr);
    localStorage.setItem('gecko_cajas', cajasStr);
    window.LISTA_MOVIMIENTOS = movimientos;
    window.LISTA_CAJAS = cajas;

    // Sincronizar con API
    [mov1, mov2].filter(Boolean).forEach(mov => {
        fetch('/app/api.php?endpoint=movimientos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mov)
        }).catch(() => { });
    });

    document.getElementById('modalSena')?.remove();

    if (typeof window.mostrarExito === 'function') {
        window.mostrarExito(
            `$${Math.round(totalPago).toLocaleString('es-AR')} registrado en ${caja1}${monto2 > 0 ? ' + ' + caja2 : ''}`,
            tipo === 'saldo' ? '✅ Saldo cobrado' : '💰 Seña registrada'
        );
    }

    if (typeof window.renderOts === 'function') window.renderOts();
    if (typeof window.renderizarFinanzas === 'function') window.renderizarFinanzas();
    if (typeof window.renderizarMovimientos === 'function') window.renderizarMovimientos();
};


// ══════════════════════════════════════════════════════
// CAJAS — render y gestión
// ══════════════════════════════════════════════════════

window._renderizarFinanzasCompleto = async function () {
    if (window._geckoAPIPromise) await window._geckoAPIPromise;

    const _ls = window._localStorage_original || localStorage;
    const cajas = JSON.parse(_ls.getItem('gecko_cajas') || '[]');
    window.LISTA_CAJAS = cajas;

    const contenedor = document.getElementById('contenedor-cajas');
    if (!contenedor) return;

    const btnNueva = contenedor.querySelector('button');

    // Estilos por tipo de caja
    const _CAJA_EST = {
        efectivo: { bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.22)', hoverBorder: '#10b981', iconBg: 'rgba(16,185,129,0.12)', iconColor: '#10b981', balColor: '#34d399' },
        mercado_pago_celeste: { bg: 'rgba(59,130,246,0.07)', border: 'rgba(59,130,246,0.22)', hoverBorder: '#3b82f6', iconBg: 'rgba(59,130,246,0.12)', iconColor: '#3b82f6', balColor: '#60a5fa' },
        banco: { bg: 'rgba(100,116,139,0.07)', border: 'rgba(100,116,139,0.22)', hoverBorder: '#64748b', iconBg: 'rgba(100,116,139,0.12)', iconColor: '#64748b', balColor: '#94a3b8' }
    };
    // Paths SVG lineales por tipo
    const _CAJA_SVG_PATH = {
        efectivo: 'M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z',
        mercado_pago_celeste: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z',
        banco: 'M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z'
    };

    Array.from(contenedor.children).forEach(el => { if (el !== btnNueva) el.remove(); });

    if (cajas.length === 0) {
        const empty = document.createElement('p');
        empty.style.cssText = 'color:#52525b;font-size:12px;font-weight:700;font-style:italic;';
        empty.innerText = 'No hay cajas creadas. Creá una con el botón +.';
        contenedor.insertBefore(empty, btnNueva);
        return;
    }

    cajas.forEach(caja => {
        const est = _CAJA_EST[caja.icono] || _CAJA_EST.efectivo;
        const path = _CAJA_SVG_PATH[caja.icono] || _CAJA_SVG_PATH.efectivo;
        const saldo = parseFloat(caja.saldo) || 0;
        const card = document.createElement('div');
        card.style.cssText = `
            display:flex;flex-direction:column;gap:0;
            padding:20px 22px 18px 22px;
            border-radius:20px;
            background:${est.bg};
            border:1px solid ${est.border};
            min-width:160px;
            cursor:pointer;
            transition:transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        `;
        card.onmouseenter = () => {
            card.style.transform = 'scale(1.04)';
            card.style.borderColor = est.hoverBorder;
            card.style.boxShadow = `0 8px 28px rgba(0,0,0,0.35)`;
        };
        card.onmouseleave = () => {
            card.style.transform = 'scale(1)';
            card.style.borderColor = est.border;
            card.style.boxShadow = 'none';
        };
        card.onclick = (e) => { if (e.isTrusted) window.editarCaja(caja.id); };
        card.innerHTML = `
            <div style="width:36px;height:36px;border-radius:10px;background:${est.iconBg};display:flex;align-items:center;justify-content:center;margin-bottom:14px;flex-shrink:0;">
                <svg width="19" height="19" fill="none" viewBox="0 0 24 24" stroke="${est.iconColor}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                    <path d="${path}"/>
                </svg>
            </div>
            <p style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#71717a;margin:0 0 5px 0;line-height:1;">${caja.nombre}</p>
            <p style="font-size:22px;font-weight:900;color:${saldo >= 0 ? est.balColor : '#ef4444'};margin:0;line-height:1.15;letter-spacing:-0.3px;">$${Math.round(saldo).toLocaleString('es-AR')}</p>
        `;
        contenedor.insertBefore(card, btnNueva);
    });

    if (typeof window.updateCajaSelectors === 'function') window.updateCajaSelectors();
    if (typeof window.renderizarMovimientos === 'function') window.renderizarMovimientos();
};

window.renderizarFinanzas = window._renderizarFinanzasCompleto;

// ── guardarNuevaCaja: disponible inmediatamente (sin esperar geckoDB_ready)
//    para que funcione también en entorno local sin backend
window.guardarNuevaCaja = function () {
    const nombre = document.getElementById('nombreNuevaCaja')?.value?.trim();
    const icono = document.getElementById('iconoNuevaCaja')?.value || 'efectivo';
    const saldo = parseFloat(document.getElementById('saldoInicialCaja')?.value) || 0;

    if (!nombre) { alert('Ingresá un nombre para la caja.'); return; }

    const id = 'caja_' + Date.now();
    const _ls = window._localStorage_original || localStorage;
    const cajas = JSON.parse(_ls.getItem('gecko_cajas') || '[]');
    cajas.push({ id, nombre, saldo, icono });
    _ls.setItem('gecko_cajas', JSON.stringify(cajas));
    window.LISTA_CAJAS = cajas;

    // Sincronizar con API si está disponible (falla silenciosa en local)
    fetch('/app/api.php?endpoint=cajas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, nombre, saldo, icono })
    }).catch(() => { });

    if (saldo !== 0) {
        const movId = 'mov_' + Date.now();
        const mov = {
            id: movId,
            fecha: new Date().toLocaleDateString('es-AR'),
            detalle: 'Saldo inicial de caja',
            caja: nombre,
            tipo: saldo > 0 ? 'Ingreso' : 'Egreso',
            monto: Math.abs(saldo),
            categoria: 'Sistema'
        };
        const movimientos = JSON.parse(_ls.getItem('gecko_movimientos') || '[]');
        movimientos.push(mov);
        _ls.setItem('gecko_movimientos', JSON.stringify(movimientos));
        window.LISTA_MOVIMIENTOS = movimientos;
        fetch('/app/api.php?endpoint=movimientos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mov)
        }).catch(() => { });
    }

    document.getElementById('modalNuevaCaja').style.display = 'none';
    document.getElementById('nombreNuevaCaja').value = '';
    document.getElementById('saldoInicialCaja').value = '0';

    if (typeof window.mostrarExito === 'function') {
        window.mostrarExito(`Caja "${nombre}" creada con $${saldo.toLocaleString('es-AR')}.`, '¡Hecho!');
    }
    setTimeout(() => {
        const movsActualizados = JSON.parse((_ls).getItem('gecko_movimientos') || '[]');
        window.LISTA_MOVIMIENTOS = movsActualizados;
        if (typeof LISTA_MOVIMIENTOS !== 'undefined') {
            LISTA_MOVIMIENTOS.length = 0;
            movsActualizados.forEach(m => LISTA_MOVIMIENTOS.push(m));
        }
        window.renderizarFinanzas();
        if (typeof window.renderizarMovimientos === 'function') window.renderizarMovimientos();
        if (typeof window.renderizarFiltrosCajas === 'function') window.renderizarFiltrosCajas();
    }, 200);
};

// ── _selectNuevaCajaTipo: maneja el selector visual en modalNuevaCaja
window._selectNuevaCajaTipo = function (tipo) {
    const el = document.getElementById('iconoNuevaCaja');
    if (el) el.value = tipo;
    const ACTIVE = {
        efectivo: { border: 'rgba(16,185,129,0.8)', bg: 'rgba(16,185,129,0.15)', shadow: 'rgba(16,185,129,0.25)' },
        mercado_pago_celeste: { border: 'rgba(59,130,246,0.8)', bg: 'rgba(59,130,246,0.15)', shadow: 'rgba(59,130,246,0.25)' },
        banco: { border: 'rgba(100,116,139,0.8)', bg: 'rgba(100,116,139,0.15)', shadow: 'rgba(100,116,139,0.25)' }
    };
    const IDLE = {
        efectivo: { border: 'rgba(16,185,129,0.35)', bg: 'rgba(16,185,129,0.07)' },
        mercado_pago_celeste: { border: 'rgba(59,130,246,0.35)', bg: 'rgba(59,130,246,0.07)' },
        banco: { border: 'rgba(100,116,139,0.35)', bg: 'rgba(100,116,139,0.07)' }
    };
    const IDS = { efectivo: 'nuevaCajaTipoEfectivo', mercado_pago_celeste: 'nuevaCajaTipoMp', banco: 'nuevaCajaTipoBanco' };
    Object.keys(IDS).forEach(t => {
        const btn = document.getElementById(IDS[t]);
        if (!btn) return;
        if (t === tipo) {
            btn.style.borderColor = ACTIVE[t].border;
            btn.style.background = ACTIVE[t].bg;
            btn.style.boxShadow = `0 0 12px ${ACTIVE[t].shadow}`;
        } else {
            btn.style.borderColor = IDLE[t].border;
            btn.style.background = IDLE[t].bg;
            btn.style.boxShadow = 'none';
        }
    });
};

// ── toggleListaCajas: muestra cajas existentes en el modal de nueva caja
window.toggleListaCajas = function () {
    const container = document.getElementById('listaGestionCajas');
    const arrow = document.getElementById('arrowListaCajas');
    if (!container) return;
    const isHidden = container.classList.contains('hidden');
    if (isHidden) {
        const cajas = window.LISTA_CAJAS || JSON.parse(localStorage.getItem('gecko_cajas') || '[]');
        const _CAJA_COLORS = {
            efectivo: '#34d399',
            mercado_pago_celeste: '#60a5fa',
            banco: '#94a3b8'
        };
        if (!cajas.length) {
            container.innerHTML = '<div style="padding:16px;text-align:center;color:#71717a;font-size:12px;font-weight:700;">No hay cajas creadas aún.</div>';
        } else {
            container.innerHTML = cajas.map(c => {
                const col = _CAJA_COLORS[c.icono] || '#F15A24';
                const saldo = parseFloat(c.saldo) || 0;
                return `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #1f1f23;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="width:8px;height:8px;border-radius:50%;background:${col};flex-shrink:0;"></span>
                        <span style="font-size:12px;font-weight:900;text-transform:uppercase;color:white;letter-spacing:0.5px;">${c.nombre}</span>
                    </div>
                    <span style="font-size:13px;font-weight:900;color:${saldo >= 0 ? col : '#ef4444'};">$${Math.round(saldo).toLocaleString('es-AR')}</span>
                </div>`;
            }).join('');
        }
        container.classList.remove('hidden');
        if (arrow) arrow.style.transform = 'rotate(180deg)';
    } else {
        container.classList.add('hidden');
        if (arrow) arrow.style.transform = 'rotate(0deg)';
    }
};

// Sistema de cajas — se inicializa con geckoDB_ready
document.addEventListener('geckoDB_ready', () => {

    window.guardarNuevaCaja = function () {
        const nombre = document.getElementById('nombreNuevaCaja')?.value?.trim();
        const icono = document.getElementById('iconoNuevaCaja')?.value || 'efectivo';
        const saldo = parseFloat(document.getElementById('saldoInicialCaja')?.value) || 0;

        if (!nombre) { alert('Ingresá un nombre para la caja.'); return; }

        const id = 'caja_' + Date.now();
        const _ls = window._localStorage_original || localStorage;
        const cajas = JSON.parse(_ls.getItem('gecko_cajas') || '[]');
        cajas.push({ id, nombre, saldo, icono });
        _ls.setItem('gecko_cajas', JSON.stringify(cajas));
        window.LISTA_CAJAS = cajas;

        fetch('/app/api.php?endpoint=cajas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, nombre, saldo, icono })
        }).catch(e => console.warn('Error guardando caja:', e));

        if (saldo !== 0) {
            const movId = 'mov_' + Date.now();
            const mov = {
                id: movId,
                fecha: new Date().toLocaleDateString('es-AR'),
                detalle: 'Saldo inicial de caja',
                caja: nombre,
                tipo: saldo > 0 ? 'Ingreso' : 'Egreso',
                monto: Math.abs(saldo),
                categoria: 'Sistema'
            };
            const movimientos = JSON.parse(_ls.getItem('gecko_movimientos') || '[]');
            movimientos.push(mov);
            _ls.setItem('gecko_movimientos', JSON.stringify(movimientos));
            window.LISTA_MOVIMIENTOS = movimientos;
            fetch('/app/api.php?endpoint=movimientos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(mov)
            }).catch(() => { });
        }

        document.getElementById('modalNuevaCaja').style.display = 'none';
        document.getElementById('nombreNuevaCaja').value = '';
        document.getElementById('saldoInicialCaja').value = '0';

        if (typeof window.mostrarExito === 'function') {
            window.mostrarExito(`Caja "${nombre}" creada con $${saldo.toLocaleString('es-AR')}.`, '¡Hecho!');
        }
        setTimeout(() => {
            const movsActualizados = JSON.parse((_ls).getItem('gecko_movimientos') || '[]');
            window.LISTA_MOVIMIENTOS = movsActualizados;
            if (typeof LISTA_MOVIMIENTOS !== 'undefined') {
                LISTA_MOVIMIENTOS.length = 0;
                movsActualizados.forEach(m => LISTA_MOVIMIENTOS.push(m));
            }
            window.renderizarFinanzas();
            if (typeof window.renderizarMovimientos === 'function') window.renderizarMovimientos();
            if (typeof window.renderizarFiltrosCajas === 'function') window.renderizarFiltrosCajas();
        }, 200);
    };

    // Modal editar caja — MODAL-GECKO-PRO style
    if (!document.getElementById('modalEditarCaja')) {
        const modal = document.createElement('div');
        modal.id = 'modalEditarCaja';
        modal.className = 'gecko-modal-overlay';
        modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:10000;background:rgba(10,12,20,0.75);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:20px;';
        modal.innerHTML = `
            <div class="gecko-modal-box">

                <!-- Header -->
                <p class="gecko-modal-subtitle">Finanzas / Cajas</p>
                <h2 class="gecko-modal-title">Editar Caja</h2>

                <!-- Cerrar -->
                <button onclick="document.getElementById('modalEditarCaja').style.display='none'"
                    style="position:absolute;top:24px;right:24px;width:32px;height:32px;border-radius:8px;background:#2a2a2a;border:1px solid #333;color:#666;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all 0.15s;"
                    onmouseover="this.style.color='white';this.style.borderColor='#555'"
                    onmouseout="this.style.color='#666';this.style.borderColor='#333'">✕</button>

                <input type="hidden" id="editCajaId">

                <!-- Tipo de caja — 3 botones, seleccionado en naranja -->
                <div style="margin-bottom:20px;">
                    <label class="gecko-label">Tipo de caja</label>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
                        <button id="cajaTipoEfectivo" onclick="window._selectCajaTipo('efectivo')" class="mgp-type-btn active">
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#10b981" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"/>
                            </svg>
                            <span style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#10b981;">Efectivo</span>
                        </button>
                        <button id="cajaTipoMp" onclick="window._selectCajaTipo('mercado_pago_celeste')" class="mgp-type-btn">
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#3b82f6" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z"/>
                            </svg>
                            <span style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#3b82f6;">Billeteras</span>
                        </button>
                        <button id="cajaTipoBanco" onclick="window._selectCajaTipo('banco')" class="mgp-type-btn">
                            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#64748b" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z"/>
                            </svg>
                            <span style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#64748b;">Banco</span>
                        </button>
                    </div>
                    <input type="hidden" id="editCajaIcono" value="efectivo">
                </div>

                <!-- Nombre -->
                <div style="margin-bottom:20px;">
                    <label class="gecko-label">Nombre de la caja</label>
                    <input type="text" id="editCajaNombre" class="gecko-input-line"
                        placeholder="Ej: Efectivo, Banco Galicia, MP Principal...">
                </div>

                <!-- Saldo -->
                <div style="margin-bottom:28px;">
                    <label class="gecko-label">Saldo actual</label>
                    <div class="gecko-input-group">
                        <span class="gecko-input-prefix">$</span>
                        <input type="number" class="gecko-input-num" id="editCajaSaldo" placeholder="0">
                    </div>
                </div>

                <!-- Botones -->
                <div class="gecko-modal-footer">
                    <button onclick="window._eliminarCaja()" class="gecko-btn-danger">
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        Eliminar
                    </button>
                    <button onclick="document.getElementById('modalEditarCaja').style.display='none'" class="gecko-btn-cancel">
                        Cancelar
                    </button>
                    <button onclick="window._guardarEdicionCaja()" class="gecko-btn-primary">
                        Guardar Cambios
                    </button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
    }

    // Helper: seleccionar tipo de caja visualmente — Design System gecko-toggle-btn
    window._selectCajaTipo = function (tipo) {
        const editHidden = document.getElementById('editCajaTipo');
        if (editHidden) editHidden.value = tipo;
        const nuevaHidden = document.getElementById('nuevaCajaTipo');
        if (nuevaHidden) nuevaHidden.value = tipo;

        const colores = {
            efectivo: { bg: 'rgba(16,185,129,0.15)', border: '#10b981', color: '#10b981' },
            billeteras: { bg: 'rgba(59,130,246,0.15)', border: '#3b82f6', color: '#3b82f6' },
            banco: { bg: 'rgba(100,116,139,0.15)', border: '#64748b', color: '#94a3b8' }
        };

        const grupos = document.querySelectorAll('#editCajaTipoGroup, #nuevaCajaTipoGroup');
        grupos.forEach(function (grupo) {
            grupo.querySelectorAll('.gecko-toggle-btn').forEach(function (btn) {
                const btnTipo = btn.dataset.tipo;
                btn.classList.remove('active');
                if (btnTipo === tipo) {
                    btn.classList.add('active');
                    const col = colores[tipo] || colores.efectivo;
                    btn.style.background = col.bg;
                    btn.style.borderColor = col.border;
                    btn.style.color = col.color;
                } else {
                    btn.style.background = '';
                    btn.style.borderColor = '';
                    btn.style.color = '#64748b';
                }
            });
        });
    };

    window.editarCaja = function (id) {
        const _ls = window._localStorage_original || localStorage;
        const cajas = JSON.parse(_ls.getItem('gecko_cajas') || '[]');
        const caja = cajas.find(c => c.id === id);
        if (!caja) return;
        const tipoCaja = caja.icono === 'mercado_pago_celeste' ? 'billeteras' : (caja.icono || 'efectivo');
        // Recrear siempre para reflejar datos actuales
        document.getElementById('modalEditarCaja')?.remove();
        const modal = document.createElement('div');
        modal.id = 'modalEditarCaja';
        modal.className = 'gecko-modal-overlay';
        modal.innerHTML = `
            <div class="gecko-modal-box" style="max-width:480px;width:100%;position:relative;">

                <button onclick="this.closest('.gecko-modal-overlay').remove()" style="position:absolute;top:24px;right:24px;width:40px;height:40px;border-radius:12px;background:#18181b;border:1px solid #27272a;color:#71717a;display:flex;align-items:center;justify-content:center;transition:all 0.2s;cursor:pointer;" onmouseover="this.style.color='#ef4444';this.style.transform='rotate(90deg)'" onmouseout="this.style.color='#71717a';this.style.transform='rotate(0deg)'">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18L18 6M6 6l12 12"/></svg>
                </button>

                <p class="gecko-modal-subtitle">Finanzas / Cajas</p>
                <h2 class="gecko-modal-title">Editar Caja</h2>

                <div style="margin-top:24px;display:flex;flex-direction:column;gap:20px;">

                    <div>
                        <label class="gecko-label">Nombre de la caja</label>
                        <input id="editCajaNombre" class="gecko-input-line" type="text"
                            placeholder="Ej: Efectivo, Banco Galicia, MP Principal..."
                            value="${(caja.nombre || '').replace(/"/g, '&quot;')}">
                    </div>

                    <div>
                        <label class="gecko-label">Tipo de caja</label>
                        <div class="gecko-toggle-group" style="margin-top:8px;" id="editCajaTipoGroup">
                            <button class="gecko-toggle-btn ${tipoCaja === 'efectivo' ? 'active' : ''}" 
                                data-tipo="efectivo" onclick="_selectCajaTipo('efectivo')"
                                style="${tipoCaja === 'efectivo' ? 'background:rgba(16,185,129,0.15);border-color:#10b981;color:#10b981;' : 'color:#64748b;'}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                                EFECTIVO
                            </button>
                            <button class="gecko-toggle-btn ${tipoCaja === 'billeteras' ? 'active' : ''}" 
                                data-tipo="billeteras" onclick="_selectCajaTipo('billeteras')"
                                style="${tipoCaja === 'billeteras' ? 'background:rgba(59,130,246,0.15);border-color:#3b82f6;color:#3b82f6;' : 'color:#64748b;'}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>
                                BILLETERAS
                            </button>
                            <button class="gecko-toggle-btn ${tipoCaja === 'banco' ? 'active' : ''}" 
                                data-tipo="banco" onclick="_selectCajaTipo('banco')"
                                style="${tipoCaja === 'banco' ? 'background:rgba(100,116,139,0.15);border-color:#64748b;color:#94a3b8;' : 'color:#64748b;'}">
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 9 12 2 21 9"/><rect x="3" y="9" width="18" height="13"/><line x1="9" y1="22" x2="9" y2="9"/><line x1="15" y1="22" x2="15" y2="9"/></svg>
                                BANCO
                            </button>
                        </div>
                        <input type="hidden" id="editCajaTipo" value="${tipoCaja}">
                        <input type="hidden" id="editCajaId" value="${id}">
                    </div>

                    <div>
                        <label class="gecko-label">Saldo actual</label>
                        <div style="display:flex;align-items:center;background:#27272a;border:1.5px solid #3f3f46;border-radius:12px;overflow:hidden;transition:border-color 0.2s;margin-top:6px;"
                             onfocusin="this.style.borderColor='#F15A24'" onfocusout="this.style.borderColor='#3f3f46'">
                            <span style="padding:12px 16px;color:#ffffff;font-size:14px;font-weight:900;border-right:1.5px solid #3f3f46;background:#222;flex-shrink:0;">$</span>
                            <input id="editCajaSaldo" type="number" value="${caja.saldo || 0}"
                                style="background:transparent;border:none;outline:none;color:#ffffff;font-size:15px;font-weight:600;padding:12px 16px !important;width:100%;-webkit-text-fill-color:#ffffff;">
                        </div>
                    </div>

                </div>

                <div class="gecko-modal-footer" style="align-items:center;justify-content:center !important; gap: 1.5rem !important;">
                    <button class="gecko-btn-danger" onclick="window._eliminarCaja()">
                        ELIMINAR
                    </button>
                    <button class="gecko-btn-cancel" onclick="this.closest('.gecko-modal-overlay').remove()">CANCELAR</button>
                    <button class="gecko-btn-primary" onclick="window._guardarEdicionCaja()" style="white-space:nowrap;">GUARDAR</button>
                </div>

            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
        if (typeof window._selectCajaTipo === 'function') window._selectCajaTipo(tipoCaja);
    };

    window._guardarEdicionCaja = function () {
        const id = document.getElementById('editCajaId').value;
        const nombre = document.getElementById('editCajaNombre').value.trim();
        let icono = document.getElementById('editCajaTipo').value;
        if (icono === 'billeteras') icono = 'mercado_pago_celeste';
        const saldo = parseFloat(document.getElementById('editCajaSaldo').value) || 0;

        if (!nombre) { alert('El nombre no puede estar vacío.'); return; }

        const _ls = window._localStorage_original || localStorage;
        let cajas = JSON.parse(_ls.getItem('gecko_cajas') || '[]');
        const idx = cajas.findIndex(c => c.id === id);
        if (idx === -1) return;
        cajas[idx] = { ...cajas[idx], nombre, icono, saldo };
        _ls.setItem('gecko_cajas', JSON.stringify(cajas));
        window.LISTA_CAJAS = cajas;

        fetch('/app/api.php?endpoint=cajas', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, nombre, icono, saldo })
        }).catch(() => { });

        document.getElementById('modalEditarCaja').style.display = 'none';
        if (typeof window.mostrarExito === 'function') window.mostrarExito(`Caja "${nombre}" actualizada.`, '¡Guardado!');
        setTimeout(() => window.renderizarFinanzas(), 150);
    };

    window._eliminarCaja = function () {
        const id = document.getElementById('editCajaId').value;
        const _ls = window._localStorage_original || localStorage;
        const cajas = JSON.parse(_ls.getItem('gecko_cajas') || '[]');
        const caja = cajas.find(c => c.id === id);
        if (!caja) return;
        if (!confirm(`¿Eliminar la caja "${caja.nombre}"? Esta acción no se puede deshacer.`)) return;
        const nuevas = cajas.filter(c => c.id !== id);
        _ls.setItem('gecko_cajas', JSON.stringify(nuevas));
        window.LISTA_CAJAS = nuevas;
        fetch('/app/api.php?endpoint=cajas', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        }).catch(() => { });
        document.getElementById('modalEditarCaja').style.display = 'none';
        if (typeof window.mostrarExito === 'function') window.mostrarExito('Caja eliminada.', '¡Listo!');
        setTimeout(() => window.renderizarFinanzas(), 150);
    };

    // Auto-render finanzas y pedidos al cargar
    const viewFin = document.getElementById('viewFinanzas');
    if (viewFin && !viewFin.classList.contains('hidden')) setTimeout(() => {
        if (!document.getElementById('modalEditarCaja')) {
            window.renderizarFinanzas();
        }
    }, 300);

    const viewPedidos = document.getElementById('viewPedidos');
    if (viewPedidos && !viewPedidos.classList.contains('hidden')) {
        window.renderPresupuestos();
        window.renderOts();
    }
});

// Auto-render al DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    if (window._geckoAPIPromise) await window._geckoAPIPromise;
    setTimeout(() => {
        const viewPedidos = document.getElementById('viewPedidos');
        if (viewPedidos && !viewPedidos.classList.contains('hidden')) {
            window.renderPresupuestos();
            window.renderOts();
        }
    }, 200);
});
// ══════════════════════════════════════════════════════
// FINANZAS — Movimientos, Gastos Fijos, Reportes
// ══════════════════════════════════════════════════════

// Globals de filtro
window.filtroActual = window.filtroActual || 'mes';
window.filtroCajaActual = window.filtroCajaActual || 'todas';

// ── Render Movimientos (5 columnas, filtro por categoría) ──
// NOTA: main.js tiene 'defer' y sobreescribe esta función. El override definitivo
// está en el window.addEventListener('load') al final del archivo.
window.renderizarMovimientos = function () {
    const tbody = document.getElementById('tbodyMovimientos');
    if (!tbody) return;

    let movs = [...(window.LISTA_MOVIMIENTOS || JSON.parse(localStorage.getItem('gecko_movimientos') || '[]'))];

    // Filtro por categoría
    const catEl = document.getElementById('filterCategoriaMov');
    const catFilt = catEl?.value || '';
    movs = movs.filter(m => {
        if (catFilt && m.categoria !== catFilt) return false;
        return true;
    });

    // Más recientes primero
    movs = movs.slice().reverse();

    if (!movs.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-20 text-center text-zinc-500 font-bold italic text-[13px]">Sin movimientos para este periodo.</td></tr>`;
        return;
    }

    const cajas = window.LISTA_CAJAS || JSON.parse(localStorage.getItem('gecko_cajas') || '[]');
    const CAJA_STYLES = {
        efectivo: { dot: '#10b981', color: '#34d399', border: 'rgba(16,185,129,0.35)' },
        mercado_pago_celeste: { dot: '#3b82f6', color: '#60a5fa', border: 'rgba(59,130,246,0.35)' },
        banco: { dot: '#64748b', color: '#94a3b8', border: 'rgba(100,116,139,0.35)' }
    };

    tbody.innerHTML = movs.map(m => {
        const infoCaja = cajas.find(c => c.nombre === m.caja);
        const cs = CAJA_STYLES[infoCaja?.icono] || CAJA_STYLES.efectivo;
        const esIngreso = m.tipo === 'Ingreso';
        const detalle = m.otDetalle || m.detalle || m.concepto || 'Sin detalle';
        const cat = m.categoria || 'Varios';

        return `
        <tr style="border-bottom:1px solid rgba(39,39,42,0.5);" onmouseover="this.style.background='rgba(24,24,27,0.4)'" onmouseout="this.style.background='transparent'">
            <td style="padding:14px 24px;">
                <span style="color:#71717a;font-size:11px;font-weight:800;letter-spacing:1px;">${m.fecha || '—'}</span>
            </td>
            <td style="padding:14px 24px;">
                <span style="color:white;font-size:13px;font-weight:800;text-transform:uppercase;">${detalle}</span>
            </td>
            <td style="padding:14px 24px;">
                <span style="display:inline-block;padding:2px 10px;background:rgba(63,63,70,0.5);border:1px solid #3f3f46;border-radius:6px;color:#a1a1aa;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">${cat}</span>
            </td>
            <td style="padding:14px 24px;">
                <div style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:transparent;border:1px solid ${cs.border};border-radius:20px;">
                    <span style="width:6px;height:6px;border-radius:50%;background:${cs.dot};flex-shrink:0;"></span>
                    <span style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;color:${cs.color};">${m.caja || '—'}</span>
                </div>
            </td>
            <td style="padding:14px 24px;text-align:right;">
                <span style="font-size:15px;font-weight:900;color:${esIngreso ? '#22c55e' : '#ef4444'};">
                    ${esIngreso ? '+' : '-'}$${Math.round(m.monto || 0).toLocaleString('es-AR')}
                </span>
                <div style="font-size:9px;font-weight:900;color:#52525b;text-transform:uppercase;letter-spacing:1px;margin-top:2px;">${m.tipo}</div>
            </td>
        </tr>`;
    }).join('');
};

// ── Helper universal: drag & drop para reordenar filas en tablas ──
window._geckoDragTable = function (tbody, onDrop) {
    var _dragKey = null;
    tbody.querySelectorAll('tr[draggable="true"]').forEach(function (row) {
        row.addEventListener('dragstart', function (e) {
            _dragKey = row.dataset.dragKey;
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(function () { row.style.opacity = '0.4'; }, 0);
        });
        row.addEventListener('dragend', function () {
            row.style.opacity = '';
            tbody.querySelectorAll('tr').forEach(function (r) { r.style.borderTop = ''; });
        });
        row.addEventListener('dragover', function (e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            tbody.querySelectorAll('tr').forEach(function (r) { r.style.borderTop = ''; });
            row.style.borderTop = '2px solid #F15A24';
        });
        row.addEventListener('dragleave', function () {
            row.style.borderTop = '';
        });
        row.addEventListener('drop', function (e) {
            e.preventDefault();
            tbody.querySelectorAll('tr').forEach(function (r) { r.style.borderTop = ''; });
            var destKey = row.dataset.dragKey;
            if (_dragKey !== null && destKey && _dragKey !== destKey) {
                onDrop(_dragKey, destKey);
            }
            _dragKey = null;
        });
    });
};

// ── Gastos Fijos ──
window.renderGastosFijos = function () {
    const tbody = document.getElementById('tbodyGastosFijos');
    if (!tbody) return;

    const lista = window.LISTA_GASTOS_FIJOS || JSON.parse(localStorage.getItem('gecko_gastos_fijos') || '[]');
    if (!window.LISTA_GASTOS_FIJOS) window.LISTA_GASTOS_FIJOS = lista;

    if (!lista.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-16 text-center text-zinc-500 font-bold italic text-[13px]">Sin gastos fijos registrados.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map((g, idx) => {
        const pagado = g.estado === 'Pagado';
        return `
        <tr draggable="true" data-drag-key="${idx}" style="border-bottom:1px solid rgba(39,39,42,0.5);cursor:grab;" class="hover:bg-zinc-900/20 transition-colors">
            <td class="py-4 px-6">
                <span style="color:white;font-size:13px;font-weight:800;text-transform:uppercase;">${g.concepto}</span>
                ${g.categoria ? `<div style="font-size:9px;color:#71717a;font-weight:900;text-transform:uppercase;letter-spacing:1px;margin-top:2px;">${g.categoria}</div>` : ''}
            </td>
            <td class="py-4 px-6">
                <span style="color:#F15A24;font-size:14px;font-weight:900;">$${Math.round(g.monto).toLocaleString('es-AR')}</span>
            </td>
            <td class="py-4 px-6">
                <span style="color:#a1a1aa;font-size:12px;font-weight:700;">Día ${g.vencimiento} de cada mes</span>
            </td>
            <td class="py-4 px-6">
                <span style="display:inline-block;padding:3px 12px;border-radius:20px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;
                    ${pagado ? 'background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);color:#22c55e;' : 'background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);color:#f59e0b;'}">
                    ${pagado ? 'Pagado' : 'Pendiente'}
                </span>
            </td>
            <td class="py-4 px-6 text-right">
                <div style="display:flex;justify-content:flex-end;gap:8px;align-items:center;">
                    ${!pagado ? `<button onclick="window.pagarGastoFijo(${idx})" title="Marcar como pagado"
                        style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);color:#ccc;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:all 0.2s;"
                        onmouseover="this.style.background='rgba(34,197,94,0.2)';this.style.borderColor='#22c55e';this.style.color='#22c55e'"
                        onmouseout="this.style.background='rgba(255,255,255,0.07)';this.style.borderColor='rgba(255,255,255,0.15)';this.style.color='#ccc'">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </button>` : `<button onclick="window.revertirPagoGastoFijo(${idx})" title="Revertir pago"
                        style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);color:#ccc;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:all 0.2s;"
                        onmouseover="this.style.background='rgba(241,90,36,0.2)';this.style.borderColor='#F15A24';this.style.color='#F15A24'"
                        onmouseout="this.style.background='rgba(255,255,255,0.07)';this.style.borderColor='rgba(255,255,255,0.15)';this.style.color='#ccc'">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
                    </button>`}
                    <button onclick="window.editarGastoFijo(${idx})" title="Ver/Editar"
                        style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);color:#ccc;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:all 0.2s;"
                        onmouseover="this.style.background='rgba(241,90,36,0.2)';this.style.borderColor='#F15A24';this.style.color='#F15A24'"
                        onmouseout="this.style.background='rgba(255,255,255,0.07)';this.style.borderColor='rgba(255,255,255,0.15)';this.style.color='#ccc'">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                    </button>
                    <button onclick="window.eliminarGastoFijo(${idx})" title="Eliminar"
                        style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);color:#ccc;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:all 0.2s;"
                        onmouseover="this.style.background='rgba(239,68,68,0.2)';this.style.borderColor='#ef4444';this.style.color='#ef4444'"
                        onmouseout="this.style.background='rgba(255,255,255,0.07)';this.style.borderColor='rgba(255,255,255,0.15)';this.style.color='#ccc'">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6"/><path d="M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
    if (typeof window._geckoDragTable === 'function') {
        window._geckoDragTable(tbody, function (srcKey, destKey) {
            const si = parseInt(srcKey), di = parseInt(destKey);
            const arr = window.LISTA_GASTOS_FIJOS;
            const moved = arr.splice(si, 1)[0];
            arr.splice(di, 0, moved);
            localStorage.setItem('gecko_gastos_fijos', JSON.stringify(arr));
            window.renderGastosFijos();
        });
    }
};

window.pagarGastoFijo = function (idx) {
    const lista = window.LISTA_GASTOS_FIJOS || JSON.parse(localStorage.getItem('gecko_gastos_fijos') || '[]');
    const g = lista[idx];
    if (!g) return;

    // Guardar el índice globalmente para usarlo en la confirmación
    window._gastoFijoAPagarIdx = idx;

    // Poblar select
    const cajas = JSON.parse(localStorage.getItem('gecko_cajas') || '[]');
    const opts = cajas.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('');
    const sel = document.getElementById('pagoGfCaja');
    if (sel) sel.innerHTML = `<option value="">Seleccionar caja origen...</option>` + opts;

    // Poblar datos visuales
    const nombreEl = document.getElementById('pagoGfNombre');
    const montoEl = document.getElementById('pagoGfMonto');
    if (nombreEl) nombreEl.innerText = g.concepto;
    if (montoEl) montoEl.innerText = '$' + Math.round(g.monto).toLocaleString('es-AR');

    document.getElementById('modalPagoGastoFijo').style.display = 'flex';
};

window.confirmarPagoGastoFijo = function () {
    const idx = window._gastoFijoAPagarIdx;
    if (idx === undefined || idx === null) return;

    const lista = window.LISTA_GASTOS_FIJOS || JSON.parse(localStorage.getItem('gecko_gastos_fijos') || '[]');
    const g = lista[idx];
    if (!g) return;

    const cajaNombre = document.getElementById('pagoGfCaja').value;
    if (!cajaNombre) { alert("Seleccion\u00e1 la caja desde donde se pagar\u00e1."); return; }

    const cajas = JSON.parse(localStorage.getItem('gecko_cajas') || '[]');
    const cajaObj = cajas.find(c => c.nombre === cajaNombre);
    if (!cajaObj) { alert("Caja no v\u00e1lida."); return; }

    // 1. Restar saldo de la caja seleccionada
    cajaObj.saldo -= g.monto;
    localStorage.setItem('gecko_cajas', JSON.stringify(cajas));

    // 2. Crear el movimiento en el historial
    const mov = {
        id: 'mov_' + Date.now(),
        fecha: new Date().toLocaleDateString('es-AR'),
        detalle: g.concepto,
        caja: cajaNombre,
        tipo: 'Egreso',
        monto: g.monto,
        categoria: g.categoria || 'Gastos Fijos'
    };
    const movs = JSON.parse(localStorage.getItem('gecko_movimientos') || '[]');
    movs.push(mov);
    localStorage.setItem('gecko_movimientos', JSON.stringify(movs));
    window.LISTA_MOVIMIENTOS = movs;

    // 3. Actualizar estado del Gasto a "Pagado" y guardar referencia al movimiento para poder revertirlo
    g.estado = 'Pagado';
    g.movimientoId = mov.id;
    g.cajaPago = cajaNombre;
    localStorage.setItem('gecko_gastos_fijos', JSON.stringify(lista));
    window.LISTA_GASTOS_FIJOS = lista;

    // 4. Cerrar y Notificar
    document.getElementById('modalPagoGastoFijo').style.display = 'none';

    window.renderGastosFijos();
    if (typeof window.renderizarFinanzas === 'function') window.renderizarFinanzas();
    if (typeof window.renderizarMovimientos === 'function') window.renderizarMovimientos();
    if (typeof window.mostrarExito === 'function') window.mostrarExito(`${g.concepto} pagado desde ${cajaNombre}.`, '\u00a1Abonado!');
};

window.revertirPagoGastoFijo = function (idx) {
    const lista = window.LISTA_GASTOS_FIJOS || JSON.parse(localStorage.getItem('gecko_gastos_fijos') || '[]');
    const g = lista[idx];
    if (!g || g.estado !== 'Pagado') return;

    const modal = document.createElement('div');
    modal.id = '_geckoConfirmRevertirPago';
    modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:10000;background:rgba(10,12,20,0.75);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = `
        <div style="background:#141417;border:1px solid #27272a;border-radius:24px;width:100%;max-width:400px;padding:32px;text-align:center;">
            <div style="width:56px;height:56px;background:rgba(241,90,36,0.1);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px auto;">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#F15A24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
            </div>
            <h3 style="color:white;font-size:18px;font-weight:900;margin:0 0 8px 0;">Revertir pago</h3>
            <p style="color:#71717a;font-size:13px;margin:0 0 28px 0;">Se revertirá el pago de <strong style="color:white;">${g.concepto}</strong>${g.cajaPago ? ` y se devolverá el monto a <strong style="color:white;">${g.cajaPago}</strong>` : ''}.</p>
            <div style="display:flex;gap:10px;">
                <button onclick="document.getElementById('_geckoConfirmRevertirPago').remove()"
                    style="flex:1;padding:13px;background:transparent;border:1px solid #27272a;color:#71717a;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">Cancelar</button>
                <button id="_geckoRevertirOk"
                    style="flex:1;padding:13px;background:#F15A24;border:none;color:white;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">Revertir</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    document.getElementById('_geckoRevertirOk').onclick = function () {
        modal.remove();
        const movs = JSON.parse(localStorage.getItem('gecko_movimientos') || '[]');
        // Buscar el movimiento de egreso asociado (por id guardado, o por detalle+monto como fallback)
        let movIdx = g.movimientoId ? movs.findIndex(m => m.id === g.movimientoId) : -1;
        if (movIdx === -1) movIdx = movs.findIndex(m => m.tipo === 'Egreso' && m.detalle === g.concepto && m.monto === g.monto);
        let cajaNombreRevertir = g.cajaPago;
        if (movIdx !== -1) {
            cajaNombreRevertir = cajaNombreRevertir || movs[movIdx].caja;
            movs.splice(movIdx, 1);
            localStorage.setItem('gecko_movimientos', JSON.stringify(movs));
            window.LISTA_MOVIMIENTOS = movs;
        }
        if (cajaNombreRevertir) {
            const cajas = JSON.parse(localStorage.getItem('gecko_cajas') || '[]');
            const cajaObj = cajas.find(c => c.nombre === cajaNombreRevertir);
            if (cajaObj) { cajaObj.saldo += g.monto; localStorage.setItem('gecko_cajas', JSON.stringify(cajas)); }
        }
        g.estado = 'Pendiente';
        delete g.movimientoId;
        delete g.cajaPago;
        localStorage.setItem('gecko_gastos_fijos', JSON.stringify(lista));
        window.LISTA_GASTOS_FIJOS = lista;
        window.renderGastosFijos();
        if (typeof window.renderizarFinanzas === 'function') window.renderizarFinanzas();
        if (typeof window.renderizarMovimientos === 'function') window.renderizarMovimientos();
        if (typeof window.mostrarExito === 'function') window.mostrarExito(`Pago de ${g.concepto} revertido.`, '¡Revertido!');
    };
};

window.eliminarGastoFijo = function (idx) {
    document.getElementById('_geckoConfirmElimGasto')?.remove();
    const lista = window.LISTA_GASTOS_FIJOS;
    if (!lista || !lista[idx]) return;
    const g = lista[idx];
    const modal = document.createElement('div');
    modal.id = '_geckoConfirmElimGasto';
    modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:10000;background:rgba(10,12,20,0.75);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = `
        <div style="background:#141417;border:1px solid #27272a;border-radius:24px;width:100%;max-width:400px;padding:32px;text-align:center;">
            <div style="width:56px;height:56px;background:rgba(239,68,68,0.1);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px auto;">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#ef4444" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </div>
            <h3 style="color:white;font-size:18px;font-weight:900;margin:0 0 8px 0;">Eliminar gasto fijo</h3>
            <p style="color:#71717a;font-size:13px;margin:0 0 28px 0;">Se eliminará <strong style="color:white;">${g.concepto}</strong> de la lista de gastos fijos.</p>
            <div style="display:flex;gap:10px;">
                <button onclick="document.getElementById('_geckoConfirmElimGasto').remove()"
                    style="flex:1;padding:13px;background:transparent;border:1px solid #27272a;color:#71717a;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">Cancelar</button>
                <button id="_geckoElimGastoOk"
                    style="flex:1;padding:13px;background:#ef4444;border:none;color:white;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">Eliminar</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.getElementById('_geckoElimGastoOk').onclick = function () {
        modal.remove();
        lista.splice(idx, 1);
        localStorage.setItem('gecko_gastos_fijos', JSON.stringify(lista));
        window.renderGastosFijos();
    };
};

window.editarGastoFijo = function (idx) {
    const lista = window.LISTA_GASTOS_FIJOS || JSON.parse(localStorage.getItem('gecko_gastos_fijos') || '[]');
    const g = lista[idx];
    if (!g) return;
    document.getElementById('_geckoModalEditGasto')?.remove();
    const modal = document.createElement('div');
    modal.id = '_geckoModalEditGasto';
    modal.className = 'gecko-modal-overlay';
    modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:10000;background:rgba(10,12,20,0.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);align-items:center;justify-content:center;';
    const cats = ['Alquiler', 'Servicios', 'Internet', 'Sueldos', 'Impuestos', 'Insumos', 'Varios'];
    const catLabels = { Alquiler: 'Alquiler', Servicios: 'Servicios (Luz, Agua, Gas)', Internet: 'Internet / Telefon\u00eda', Sueldos: 'Sueldos', Impuestos: 'Impuestos / Monotributo', Insumos: 'Insumos recurrentes', Varios: 'Varios' };

    modal.innerHTML = `
            <div class="gecko-modal-box max-w-md w-full mx-4">
                <button onclick="document.getElementById('_geckoModalEditGasto').remove()" style="position:absolute;top:24px;right:24px;width:40px;height:40px;border-radius:12px;background:#18181b;border:1px solid #27272a;color:#71717a;display:flex;align-items:center;justify-content:center;transition:all 0.2s;cursor:pointer;" onmouseover="this.style.color='#ef4444';this.style.transform='rotate(90deg)'" onmouseout="this.style.color='#71717a';this.style.transform='rotate(0deg)'">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18L18 6M6 6l12 12"/></svg>
                </button>

                <p class="gecko-modal-subtitle">FINANZAS / GASTOS FIJOS</p>
                <h2 class="gecko-modal-title">EDITAR GASTO</h2>

                <div class="space-y-5 mt-6">
                    <div>
                        <label class="gecko-label">Concepto del Gasto</label>
                        <input id="_editGastoConcepto" type="text" class="gecko-input-line" value="${(g.concepto || '').replace(/"/g, '&quot;')}">
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="gecko-label">Monto ($)</label>
                            <div class="gecko-input-group mt-1">
                                <span class="gecko-input-prefix">$</span>
                                <input id="_editGastoMonto" class="gecko-input-num" type="number" value="${g.monto || 0}" min="0" style="padding-left: 16px !important;">
                            </div>
                        </div>
                        <div>
                            <label class="gecko-label">D\u00eda vencimiento</label>
                            <input id="_editGastoVencimiento" type="number" min="1" max="31" class="gecko-input-line mt-1" value="${g.vencimiento || 1}">
                        </div>
                    </div>

                    <div>
                        <label class="gecko-label">Categor\u00eda</label>
                        <select id="_editGastoCategoria" class="gecko-select-pro">
                            ${cats.map(c => `<option value="${c}" ${g.categoria === c ? 'selected' : ''}>${catLabels[c]}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div class="gecko-modal-footer" style="align-items:center;justify-content:center !important; gap: 1.5rem !important;">
                    <button class="gecko-btn-cancel" onclick="document.getElementById('_geckoModalEditGasto').remove()">CANCELAR</button>
                    <button class="gecko-btn-primary" id="_editGastoGuardarBtn">GUARDAR CAMBIOS</button>
                </div>
            </div>`;

    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    document.getElementById('_editGastoGuardarBtn').onclick = async function () {
        const concepto = modal.querySelector('#_editGastoConcepto').value.trim();
        const monto = parseFloat(modal.querySelector('#_editGastoMonto').value) || 0;
        const vencimiento = modal.querySelector('#_editGastoVencimiento').value.trim() || '1';
        const categoria = modal.querySelector('#_editGastoCategoria').value;
        if (!concepto || monto <= 0) { alert('Complet\u00e1 concepto y monto.'); return; }
        const arr = window.LISTA_GASTOS_FIJOS || JSON.parse(localStorage.getItem('gecko_gastos_fijos') || '[]');
        if (!arr[idx]) return;
        arr[idx] = { ...arr[idx], concepto, monto, vencimiento, categoria };
        window.LISTA_GASTOS_FIJOS = arr;
        localStorage.setItem('gecko_gastos_fijos', JSON.stringify(arr));
        if (window._syncQueue) await window._syncQueue;
        modal.remove();
        window.renderGastosFijos();
        if (typeof window.mostrarExito === 'function') window.mostrarExito(`${concepto} actualizado.`, '\u00a1Guardado!');
    };
};

window.abrirModalNuevoGastoFijo = function () {
    document.getElementById('_geckoModalNuevoGasto')?.remove();
    const modal = document.createElement('div');
    modal.id = '_geckoModalNuevoGasto';
    modal.className = 'gecko-modal-overlay';
    modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:10000;background:rgba(10,12,20,0.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);align-items:center;justify-content:center;';
    modal.innerHTML = `
            <div class="gecko-modal-box max-w-md w-full mx-4">
                <button onclick="document.getElementById('_geckoModalNuevoGasto').remove()" style="position:absolute;top:24px;right:24px;width:40px;height:40px;border-radius:12px;background:#18181b;border:1px solid #27272a;color:#71717a;display:flex;align-items:center;justify-content:center;transition:all 0.2s;cursor:pointer;" onmouseover="this.style.color='#ef4444';this.style.transform='rotate(90deg)'" onmouseout="this.style.color='#71717a';this.style.transform='rotate(0deg)'">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18L18 6M6 6l12 12"/></svg>
                </button>

                <p class="gecko-modal-subtitle">FINANZAS / GASTOS FIJOS</p>
                <h2 class="gecko-modal-title">NUEVO GASTO FIJO</h2>

                <div class="space-y-5 mt-6">
                    <div>
                        <label class="gecko-label">Concepto del Gasto</label>
                        <input id="_gastoConcepto" type="text" class="gecko-input-line" placeholder="Ej: Alquiler, Luz, Sueldos...">
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="gecko-label">Monto ($)</label>
                            <div class="gecko-input-group mt-1">
                                <span class="gecko-input-prefix">$</span>
                                <input id="_gastoMonto" class="gecko-input-num" type="number" placeholder="0" min="0" style="padding-left: 16px !important;">
                            </div>
                        </div>
                        <div>
                            <label class="gecko-label">D\u00eda vencimiento</label>
                            <input id="_gastoVencimiento" type="number" min="1" max="31" class="gecko-input-line mt-1" placeholder="Ej: 15">
                        </div>
                    </div>

                    <div>
                        <label class="gecko-label">Categor\u00eda</label>
                        <select id="_gastoCategoria" class="gecko-select-pro">
                            <option value="Alquiler">Alquiler</option>
                            <option value="Servicios">Servicios (Luz, Agua, Gas)</option>
                            <option value="Internet">Internet / Telefon\u00eda</option>
                            <option value="Sueldos">Sueldos</option>
                            <option value="Impuestos">Impuestos / Monotributo</option>
                            <option value="Insumos">Insumos recurrentes</option>
                            <option value="Varios">Varios</option>
                        </select>
                    </div>
                </div>

                <div class="gecko-modal-footer" style="align-items:center;justify-content:center !important; gap: 1.5rem !important;">
                    <button class="gecko-btn-cancel" onclick="document.getElementById('_geckoModalNuevoGasto').remove()">CANCELAR</button>
                    <button class="gecko-btn-primary" id="_gastoGuardarBtn">GUARDAR GASTO</button>
                </div>
            </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    document.getElementById('_gastoGuardarBtn').onclick = async function () {
        const concepto = modal.querySelector('#_gastoConcepto').value.trim();
        const monto = parseFloat(modal.querySelector('#_gastoMonto').value) || 0;
        const vencimiento = modal.querySelector('#_gastoVencimiento').value.trim() || '1';
        const categoria = modal.querySelector('#_gastoCategoria').value;
        if (!concepto || monto <= 0) { alert('Complet\u00e1 concepto y monto.'); return; }
        if (!window.LISTA_GASTOS_FIJOS) window.LISTA_GASTOS_FIJOS = JSON.parse(localStorage.getItem('gecko_gastos_fijos') || '[]');
        const nuevoGasto = {
            id: 'gf_' + Date.now().toString(16) + Math.random().toString(16).slice(2, 7),
            concepto,
            monto,
            vencimiento,
            categoria,
            estado: 'Pendiente'
        };
        window.LISTA_GASTOS_FIJOS.push(nuevoGasto);
        localStorage.setItem('gecko_gastos_fijos', JSON.stringify(window.LISTA_GASTOS_FIJOS));
        await window._syncQueue;
        modal.remove();
        window.renderGastosFijos();
        if (typeof window.mostrarExito === 'function') window.mostrarExito(`${concepto} agregado.`, '\u00a1Guardado!');
    };
};

// ── Reportes: override ranking para usar p.categoria (Gráfica / Industrial) ──
const _renderReportesOriginal = window.renderReportesDashboard;
window.renderReportesDashboard = function () {
    if (typeof _renderReportesOriginal === 'function') _renderReportesOriginal();

    // Asegurar que HISTORICO_CIERRES esté cargado antes de renderizar
    if (!window.HISTORICO_CIERRES || window.HISTORICO_CIERRES.length === 0) {
        const local = JSON.parse(localStorage.getItem('gecko_historico_cierres') || '[]');
        if (local.length > 0) {
            window.HISTORICO_CIERRES = local;
        }
    }

    // Sobreescribir sección ranking con 2 categorías
    const ahora = new Date();
    const cajas = window.LISTA_CAJAS || JSON.parse(localStorage.getItem('gecko_cajas') || '[]');
    const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const otsMes = lista.filter(p => {
        const pts = (p.fecha || '').split('/');
        if (pts.length < 3) return false;
        return p.status === 'OT' && parseInt(pts[1]) - 1 === ahora.getMonth() && parseInt(pts[2]) === ahora.getFullYear();
    });

    const counts = { 'Gráfica': 0, 'Industrial': 0 };
    otsMes.forEach(p => {
        const cat = p.categoria === 'Gráfica' ? 'Gráfica' : 'Industrial';
        counts[cat]++;
    });

    const total = otsMes.length || 1;
    const ranking = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const COLORS = { 'Gráfica': '#3b82f6', 'Industrial': '#a855f7' };

    const contRanking = document.getElementById('repoRankingProductos');
    if (contRanking) {
        contRanking.innerHTML = ranking.map(([cat, count], idx) => `
            <div class="flex items-center gap-4">
                <div class="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-xs font-black text-zinc-400">#${idx + 1}</div>
                <div class="flex-1">
                    <div class="flex justify-between items-end mb-1">
                        <span class="text-[11px] font-black text-white uppercase tracking-tight">${cat}</span>
                        <span class="text-[10px] text-zinc-400 font-bold">${count} OTs</span>
                    </div>
                    <div class="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div class="h-full rounded-full" style="width:${Math.min(100, (count / total) * 100)}%;background:${COLORS[cat] || '#F15A24'};"></div>
                    </div>
                </div>
            </div>`).join('');
    }

    // Total cajas en reportes
    const totalCajas = cajas.reduce((a, c) => a + (parseFloat(c.saldo) || 0), 0);
    const elCajas = document.getElementById('metricCajas');
    if (elCajas) elCajas.innerText = `$${Math.round(totalCajas).toLocaleString('es-AR')}`;

    // Por cobrar (saldos pendientes de OTs activas)
    const porCobrar = lista.filter(p => p.status === 'OT' && p.estado_ot !== 'Entregado')
        .reduce((a, p) => a + Math.max(0, (p.total || 0) - (p.sena || 0)), 0);
    const elCobrar = document.getElementById('metricCobrar');
    if (elCobrar) elCobrar.innerText = `$${Math.round(porCobrar).toLocaleString('es-AR')}`;

    // ── Historial de cierres ──
    const contenedorHistorialCierres = document.getElementById('contenedorHistorialCierres');
    if (contenedorHistorialCierres) {
        const histCierres = window.HISTORICO_CIERRES || JSON.parse(localStorage.getItem('gecko_historico_cierres') || '[]');
        if (histCierres.length === 0) {
            contenedorHistorialCierres.innerHTML = '<p style="color:#52525b;font-size:11px;font-style:italic;text-align:center;padding:16px 0;">No hay cierres registrados aún.</p>';
        } else {
            contenedorHistorialCierres.innerHTML = histCierres.slice().reverse().map(c => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #27272a;">
                    <div>
                        <p style="color:white;font-size:12px;font-weight:900;margin:0 0 2px;">${c.periodo}</p>
                        <p style="color:#71717a;font-size:10px;margin:0;">${c.fecha_cierre} · ${c.movimientos || 0} movimientos</p>
                    </div>
                    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
                        <p style="font-size:13px;font-weight:900;margin:0;color:${(c.balance||0)>=0?'#22c55e':'#ef4444'};">$${Math.round(c.balance||0).toLocaleString('es-AR')}</p>
                        <button onclick="window._generarPDFCierreMes('${c.periodo}','',${c.ingresos||0},${c.gastos||0},[],[])"
                            style="font-size:9px;color:#F15A24;background:none;border:none;cursor:pointer;font-weight:900;text-transform:uppercase;letter-spacing:1px;padding:0;">
                            ↓ PDF
                        </button>
                    </div>
                </div>`).join('');
        }
    }

    // ── Gráfico de líneas: Ingresos por Categoría (últimos 6 meses) ──
    const svgChart = document.getElementById('svgIngresosCategoria');
    const labelsContainer = document.getElementById('chartIngresosLabels');
    if (svgChart) {
        const MESES_NOM = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const meses6 = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
            meses6.push({ m: d.getMonth(), y: d.getFullYear(), label: MESES_NOM[d.getMonth()] });
        }

        // Sample baseline — displayed only when real data is all-zero
        const SAMPLE_GRAF = [85000, 120000, 95000, 160000, 130000, 195000];
        const SAMPLE_IND = [35000, 48000, 62000, 52000, 80000, 95000];

        const data6raw = meses6.map(mes => {
            const otsDelMes = lista.filter(p => {
                if (p.status !== 'OT') return false;
                const pts = (p.fecha || '').split('/');
                if (pts.length < 3) return false;
                return parseInt(pts[1]) - 1 === mes.m && parseInt(pts[2]) === mes.y;
            });
            const graf = otsDelMes
                .filter(p => (p.categoria || (typeof window._detectarCategoria === 'function' ? window._detectarCategoria(p) : 'Gráfica')) === 'Gráfica')
                .reduce((a, p) => a + (p.total || 0), 0);
            const ind = otsDelMes
                .filter(p => (p.categoria || (typeof window._detectarCategoria === 'function' ? window._detectarCategoria(p) : 'Gráfica')) === 'Industrial')
                .reduce((a, p) => a + (p.total || 0), 0);
            return { ...mes, graf, ind };
        });

        const hasRealData = data6raw.some(d => d.graf > 0 || d.ind > 0);
        const data6 = hasRealData
            ? data6raw
            : data6raw.map((d, i) => ({ ...d, graf: SAMPLE_GRAF[i] || 0, ind: SAMPLE_IND[i] || 0, isSample: true }));

        const W = 400, H = 130;
        const padL = 10, padR = 10, padT = 12, padB = 18;
        const maxVal = Math.max(...data6.map(d => Math.max(d.graf, d.ind)), 1);
        const xStep = (W - padL - padR) / (meses6.length - 1);
        const toX = i => padL + i * xStep;
        const toY = v => H - padB - ((v / maxVal) * (H - padT - padB));

        const ptsGraf = data6.map((d, i) => `${toX(i).toFixed(1)},${toY(d.graf).toFixed(1)}`).join(' ');
        const ptsInd = data6.map((d, i) => `${toX(i).toFixed(1)},${toY(d.ind).toFixed(1)}`).join(' ');
        const dotsGraf = data6.map((d, i) => `<circle cx="${toX(i).toFixed(1)}" cy="${toY(d.graf).toFixed(1)}" r="3.5" fill="#3b82f6" stroke="#141417" stroke-width="1.5"/>`).join('');
        const dotsInd = data6.map((d, i) => `<circle cx="${toX(i).toFixed(1)}" cy="${toY(d.ind).toFixed(1)}" r="3.5" fill="#a855f7" stroke="#141417" stroke-width="1.5"/>`).join('');

        // Watermark text if sample data
        const sampleNote = !hasRealData
            ? `<text x="200" y="68" text-anchor="middle" fill="#3f3f46" font-size="9" font-weight="900" font-family="sans-serif" letter-spacing="2" text-transform="uppercase">DATOS DE EJEMPLO</text>`
            : '';

        svgChart.innerHTML =
            `<polyline points="${ptsGraf}" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" opacity="0.9"/>` +
            `<polyline points="${ptsInd}"  fill="none" stroke="#a855f7" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" opacity="0.9"/>` +
            dotsGraf + dotsInd + sampleNote;

        if (labelsContainer) {
            labelsContainer.innerHTML = meses6.map(mes =>
                `<span style="font-size:9px;color:#52525b;font-weight:900;text-transform:uppercase;letter-spacing:1px;">${mes.label}</span>`
            ).join('');
            labelsContainer.style.cssText = 'display:flex;justify-content:space-between;padding:0 10px;margin-top:4px;';
        }
    }

    // ── Barras de Liquidez por caja ──
    const liquidezBarsEl = document.getElementById('liquidezBarsContainer');
    if (liquidezBarsEl && cajas.length > 0) {
        const maxSaldo = Math.max(...cajas.map(c => Math.max(0, parseFloat(c.saldo) || 0)), porCobrar, 1);
        const CAJA_COLORS = {
            efectivo: { bar: '#10b981', label: '#34d399' },
            mercado_pago_celeste: { bar: '#3b82f6', label: '#60a5fa' },
            banco: { bar: '#64748b', label: '#94a3b8' }
        };

        const barsCajas = cajas.map(caja => {
            const saldo = parseFloat(caja.saldo) || 0;
            const pct = Math.min(100, (Math.max(0, saldo) / maxSaldo) * 100);
            const cc = CAJA_COLORS[caja.icono] || CAJA_COLORS.efectivo;
            return `
            <div style="margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                    <span style="color:#a1a1aa;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;">${caja.nombre}</span>
                    <span style="color:${cc.label};font-size:12px;font-weight:900;">$${Math.round(saldo).toLocaleString('es-AR')}</span>
                </div>
                <div style="width:100%;height:8px;background:#1f1f23;border-radius:4px;overflow:hidden;">
                    <div style="width:${pct.toFixed(1)}%;height:100%;background:${cc.bar};border-radius:4px;transition:width 0.5s ease;"></div>
                </div>
            </div>`;
        }).join('');

        const barCobrar = porCobrar > 0 ? `
            <div style="margin-bottom:4px;border-top:1px solid #27272a;padding-top:10px;margin-top:4px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                    <span style="color:#a1a1aa;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;">Por Cobrar (OTs)</span>
                    <span style="color:#f59e0b;font-size:12px;font-weight:900;">$${Math.round(porCobrar).toLocaleString('es-AR')}</span>
                </div>
                <div style="width:100%;height:8px;background:#1f1f23;border-radius:4px;overflow:hidden;">
                    <div style="width:${Math.min(100, (porCobrar / maxSaldo) * 100).toFixed(1)}%;height:100%;background:#f59e0b;border-radius:4px;transition:width 0.5s ease;"></div>
                </div>
            </div>` : '';

        liquidezBarsEl.innerHTML = barsCajas + barCobrar;
    }
};

// ── Cierre mensual con modal Gecko ──
window._ejecutarCierreMensualGecko = function () {
window.ejecutarCierreMensual = window._ejecutarCierreMensualGecko;
    document.getElementById('_geckoConfirmCierre')?.remove();
    const modal = document.createElement('div');
    modal.id = '_geckoConfirmCierre';
    modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:10000;background:rgba(10,12,20,0.75);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:16px;';
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const mesNom = meses[new Date().getMonth()];
    modal.innerHTML = `
        <div style="background:#141417;border:1px solid #27272a;border-radius:24px;width:100%;max-width:400px;padding:32px;text-align:center;">
            <div style="width:56px;height:56px;background:rgba(241,90,36,0.1);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px auto;">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#F15A24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
            <h3 style="color:white;font-size:18px;font-weight:900;margin:0 0 8px 0;">Cerrar mes de ${mesNom}</h3>
            <p style="color:#71717a;font-size:13px;margin:0 0 28px 0;">Se archivará el balance actual y todos los gastos fijos volverán a estado <strong style="color:white;">Pendiente</strong>.</p>
            <div style="display:flex;gap:10px;">
                <button onclick="document.getElementById('_geckoConfirmCierre').remove()"
                    style="flex:1;padding:13px;background:transparent;border:1px solid #27272a;color:#71717a;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">Cancelar</button>
                <button id="_geckoCierreOk"
                    style="flex:1;padding:13px;background:#F15A24;border:none;color:white;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">Cerrar mes</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.getElementById('_geckoCierreOk').onclick = function () {
        modal.remove();
        const ahora = new Date();
        const movs = window.LISTA_MOVIMIENTOS || JSON.parse(localStorage.getItem('gecko_movimientos') || '[]');
        const movsMes = movs.filter(m => {
            const pts = (m.fecha || '').split('/');
            return pts.length >= 3 && parseInt(pts[1]) - 1 === ahora.getMonth() && parseInt(pts[2]) === ahora.getFullYear();
        });
        const ing = movsMes.filter(m => m.tipo === 'Ingreso').reduce((a, m) => a + m.monto, 0);
        const egr = movsMes.filter(m => m.tipo === 'Egreso').reduce((a, m) => a + m.monto, 0);
        const gastosFijos = window.LISTA_GASTOS_FIJOS || [];

        // Guardar en historial
        const cierre = {
            id: 'cierre_' + Date.now(),
            periodo: `${meses[ahora.getMonth()]} ${ahora.getFullYear()}`,
            mes: ahora.getMonth(),
            anio: ahora.getFullYear(),
            ingresos: ing,
            gastos: egr,
            balance: ing - egr,
            fecha_cierre: ahora.toLocaleDateString('es-AR'),
            movimientos: movsMes.length,
            gastos_fijos: gastosFijos.length
        };
        const hist = window.HISTORICO_CIERRES || JSON.parse(localStorage.getItem('gecko_historico_cierres') || '[]');
        hist.push(cierre);
        window.HISTORICO_CIERRES = hist;
        localStorage.setItem('gecko_historico_cierres', JSON.stringify(hist));

        // Reiniciar gastos fijos
        gastosFijos.forEach(g => { g.estado = 'Pendiente'; delete g.movimientoId; delete g.cajaPago; });
        localStorage.setItem('gecko_gastos_fijos', JSON.stringify(gastosFijos));
        window.LISTA_GASTOS_FIJOS = gastosFijos;

        if (typeof window.renderGastosFijos === 'function') window.renderGastosFijos();
        if (typeof window.renderReportesDashboard === 'function') window.renderReportesDashboard();

        // Guardar en MySQL via localStorage proxy
        window.HISTORICO_CIERRES = hist;
        localStorage.setItem('gecko_historico_cierres', JSON.stringify(hist));
        // Sincronizar cierre individual con MySQL directamente
        fetch('/app/api.php?endpoint=historico_cierres', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cierre)
        }).catch(e => console.warn('GECKO: Error guardando cierre en MySQL:', e));

        // Mostrar modal de resultado con descarga PDF
        const fmt = n => '$' + Math.round(n).toLocaleString('es-AR');
        const modalResult = document.createElement('div');
        modalResult.id = '_geckoModalResultCierre';
        modalResult.style.cssText = 'display:flex;position:fixed;inset:0;z-index:10001;background:rgba(10,12,20,0.85);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);align-items:center;justify-content:center;padding:16px;';
        modalResult.innerHTML = `
            <div style="background:#141417;border:1px solid #27272a;border-radius:24px;width:100%;max-width:460px;padding:36px;text-align:center;">
                <div style="width:64px;height:64px;background:rgba(34,197,94,0.1);border-radius:20px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px auto;">
                    <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#22c55e" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <p style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#F15A24;margin:0 0 6px;">Mes cerrado</p>
                <h3 style="color:white;font-size:22px;font-weight:900;margin:0 0 4px;">${meses[ahora.getMonth()]} ${ahora.getFullYear()}</h3>
                <p style="color:#71717a;font-size:12px;margin:0 0 24px;">${ahora.toLocaleDateString('es-AR')} · ${movsMes.length} movimientos</p>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:24px;">
                    <div style="background:#1e1f20;border-radius:12px;padding:12px 8px;">
                        <div style="font-size:9px;color:#71717a;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Ingresos</div>
                        <div style="font-size:14px;font-weight:900;color:#22c55e;">${fmt(ing)}</div>
                    </div>
                    <div style="background:#1e1f20;border-radius:12px;padding:12px 8px;">
                        <div style="font-size:9px;color:#71717a;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Egresos</div>
                        <div style="font-size:14px;font-weight:900;color:#ef4444;">${fmt(egr)}</div>
                    </div>
                    <div style="background:#1e1f20;border-radius:12px;padding:12px 8px;">
                        <div style="font-size:9px;color:#71717a;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Balance</div>
                        <div style="font-size:14px;font-weight:900;color:${ing - egr >= 0 ? '#22c55e' : '#ef4444'};">${fmt(ing - egr)}</div>
                    </div>
                </div>
                <div style="display:flex;gap:10px;">
                    <button id="_geckoCierreDescargar"
                        style="flex:1;padding:13px;background:#1e1f20;border:1px solid #27272a;color:white;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">
                        <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                        Descargar PDF
                    </button>
                    <button id="_geckoCierreCerrar"
                        style="flex:1;padding:13px;background:#F15A24;border:none;color:white;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">
                        Listo
                    </button>
                </div>
            </div>`;
        document.body.appendChild(modalResult);
        document.getElementById('_geckoCierreDescargar').onclick = function () {
            window._generarPDFCierreMes(meses[ahora.getMonth()], ahora.getFullYear(), ing, egr, movsMes, gastosFijos);
        };
        document.getElementById('_geckoCierreCerrar').onclick = function () {
            modalResult.remove();
        };
    };
};

window._generarPDFCierreMes = function (mesNom, anio, ingresos, egresos, movimientos, gastosFijos) {
    const balance = ingresos - egresos;
    const fmt = n => '$' + Math.round(n).toLocaleString('es-AR');
    const filasMov = movimientos.map(m => `
        <tr style="border-bottom:1px solid #eee;">
            <td style="padding:6px 8px;font-size:11px;color:#555;">${m.fecha}</td>
            <td style="padding:6px 8px;font-size:11px;">${m.detalle}</td>
            <td style="padding:6px 8px;font-size:11px;color:#777;">${m.categoria || ''}</td>
            <td style="padding:6px 8px;font-size:11px;color:#777;">${m.caja || ''}</td>
            <td style="padding:6px 8px;font-size:11px;text-align:right;font-weight:700;color:${m.tipo === 'Ingreso' ? '#16a34a' : '#dc2626'};">${m.tipo === 'Ingreso' ? '+' : '−'}${fmt(m.monto)}</td>
        </tr>`).join('');
    const filasGastos = gastosFijos.map(g => `
        <tr style="border-bottom:1px solid #eee;">
            <td style="padding:6px 8px;font-size:11px;">${g.concepto}</td>
            <td style="padding:6px 8px;font-size:11px;color:#777;">${g.categoria || ''}</td>
            <td style="padding:6px 8px;font-size:11px;text-align:right;font-weight:700;">${fmt(g.monto)}</td>
            <td style="padding:6px 8px;font-size:11px;text-align:center;">
                <span style="padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:${g.estado === 'Pagado' ? '#dcfce7' : '#fef9c3'};color:${g.estado === 'Pagado' ? '#16a34a' : '#ca8a04'};">${g.estado}</span>
            </td>
        </tr>`).join('');

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
        <title>Cierre ${mesNom} ${anio} — Gecko Estudio</title>
        <style>
            body { font-family: Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 32px; }
            h1 { color: #F15A24; font-size: 22px; margin: 0; }
            h2 { font-size: 13px; color: #555; margin: 4px 0 24px; font-weight: normal; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #F15A24; padding-bottom: 16px; margin-bottom: 24px; }
            .logo { font-size: 28px; font-weight: 900; color: #F15A24; letter-spacing: -1px; }
            .kpis { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 28px; }
            .kpi { background: #f8f8f8; border-radius: 10px; padding: 14px 16px; }
            .kpi-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
            .kpi-value { font-size: 20px; font-weight: 900; }
            .section-title { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; color: #F15A24; margin: 20px 0 8px; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f3f3f3; padding: 7px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #888; }
            .footer { margin-top: 32px; border-top: 1px solid #eee; padding-top: 12px; font-size: 10px; color: #aaa; text-align: center; }
        </style>
    </head><body>
        <div class="header">
            <div>
                <div class="logo">gecko</div>
                <h1>Balance Mensual — ${mesNom} ${anio}</h1>
                <h2>Gecko Estudio Creativo · Fecha de cierre: ${new Date().toLocaleDateString('es-AR')}</h2>
            </div>
        </div>
        <div class="kpis">
            <div class="kpi"><div class="kpi-label">Ingresos del mes</div><div class="kpi-value" style="color:#16a34a;">${fmt(ingresos)}</div></div>
            <div class="kpi"><div class="kpi-label">Egresos del mes</div><div class="kpi-value" style="color:#dc2626;">${fmt(egresos)}</div></div>
            <div class="kpi"><div class="kpi-label">Balance neto</div><div class="kpi-value" style="color:${balance >= 0 ? '#16a34a' : '#dc2626'};">${fmt(balance)}</div></div>
        </div>
        <div class="section-title">Movimientos del mes (${movimientos.length})</div>
        <table>
            <thead><tr><th>Fecha</th><th>Detalle</th><th>Categoría</th><th>Caja</th><th style="text-align:right;">Monto</th></tr></thead>
            <tbody>${filasMov || '<tr><td colspan="5" style="padding:12px;text-align:center;color:#aaa;font-size:11px;">Sin movimientos registrados</td></tr>'}</tbody>
        </table>
        <div class="section-title">Gastos fijos del mes (${gastosFijos.length})</div>
        <table>
            <thead><tr><th>Concepto</th><th>Categoría</th><th style="text-align:right;">Monto</th><th style="text-align:center;">Estado</th></tr></thead>
            <tbody>${filasGastos || '<tr><td colspan="4" style="padding:12px;text-align:center;color:#aaa;font-size:11px;">Sin gastos fijos</td></tr>'}</tbody>
        </table>
        <div class="footer">Gecko Estudio Creativo · Balance generado automáticamente por GeckoApp v2</div>
    </body></html>`;

    const win = window.open('', '_blank');
    if (win) {
        win.document.write(html);
        win.document.close();
        setTimeout(() => { win.print(); }, 500);
    }
};

// ── Hook switchTabFinanzas para asegurar que siempre se actualice filtroCajaActual ──
const _origSwitchTabFin = window.switchTabFinanzas;
window.switchTabFinanzas = function (tab) {
    if (typeof _origSwitchTabFin === 'function') _origSwitchTabFin(tab);
    if (tab === 'gastos') window.renderGastosFijos();
    if (tab === 'reportes') window.renderReportesDashboard();
};

// ── PARCHE FINAL: reemplazar renderOts de main.js después de que todo cargue ──
window.addEventListener('load', function () {
    setTimeout(function () {

        window.renderOts = function () {
            const tbody = document.getElementById('tbodyOts');
            if (!tbody) return;

            const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
            const ots = lista.filter(p => p.status === 'OT');
            const mostrarHistorial = window._mostrarHistorialOts || false;
            const busqueda = document.getElementById('filtroOtBusqueda')?.value?.toLowerCase() || '';

            const filtrados = ots.filter(ot => {
                const entregado = ot.estado_ot === 'Entregado';
                if (!mostrarHistorial && entregado) return false;
                if (mostrarHistorial && !entregado) return false;
                if (busqueda && !ot.cliente?.toLowerCase().includes(busqueda)) return false;
                return true;
            });

            if (filtrados.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="py-20 text-center text-gray-400 font-medium italic">
                    ${mostrarHistorial ? 'Sin historial de OTs.' : 'No hay órdenes de trabajo activas.'}
                </td></tr>`;
                return;
            }

            const _EST = ['En Proceso', 'En Taller', 'Impresión', 'Terminaciones', 'Listo', 'Entregado'];
            const _COL = { 'En Proceso': '#F15A24', 'En Taller': '#8b5cf6', 'Impresión': '#3b82f6', 'Terminaciones': '#f59e0b', 'Listo': '#10b981', 'Entregado': '#6b7280' };

            tbody.innerHTML = filtrados.map(ot => {
                const estado = ot.estado_ot || 'En Proceso';
                const color = _COL[estado] || '#F15A24';
                const saldo = (ot.total || 0) - (ot.sena || 0);
                const estadoOpts = _EST.map(e =>
                    `<div onclick="window._seleccionarEstadoOT('${ot.id}','${e}');event.stopPropagation()"
                          style="padding:8px 14px;cursor:pointer;font-size:10px;font-weight:900;text-transform:uppercase;color:${_COL[e] || '#F15A24'};letter-spacing:0.5px;"
                          onmouseover="this.style.background='#1f1f23'" onmouseout="this.style.background='transparent'">${e}</div>`
                ).join('');

                return `
                <tr draggable="true" data-drag-key="${ot.id}" class="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors border-b border-gray-100 dark:border-gray-800" style="cursor:grab;">
                    <td class="py-4 px-6 text-[11px] font-black uppercase text-zinc-500">#${ot.id}</td>
                    <td class="py-4 px-6">
                        <span class="text-[14px] font-extrabold dark:text-white uppercase">${ot.cliente || 'S/N'}</span>
                    </td>
                    <td class="py-4 px-6 max-w-[200px]">
                        <div class="flex flex-col">
                            ${window._tagCategoria(ot)}
                            <div class="flex flex-wrap gap-1 mt-0.5">
                                ${(ot.items || []).map(it => `<span class="text-[9px] font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded uppercase">${it.textoOpciones || it.nombre || ''}</span>`).join('')}
                            </div>
                        </div>
                    </td>
                    <td class="py-4 px-6 text-[11px] text-zinc-400 font-bold">${ot.fecha_entrega || '—'}</td>
                    <td class="py-4 px-6 text-center">
                        <div id="estado-ot-${ot.id}" style="position:relative;display:inline-block;">
                            <div onclick="window._toggleEstadoDropdown('${ot.id}',event)"
                                 style="display:flex;align-items:center;gap:8px;background:${color}22;border:1.5px solid ${color}55;border-radius:20px;padding:6px 10px 6px 12px;cursor:pointer;min-width:115px;">
                                <span id="estado-ot-label-${ot.id}" style="color:${color};font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;flex:1;">${estado}</span>
                                <span style="color:${color};font-size:8px;flex-shrink:0;">▼</span>
                            </div>
                            <div id="estado-ot-dropdown-${ot.id}" style="display:none;position:absolute;top:calc(100% + 4px);left:0;background:#141417;border:1px solid #27272a;border-radius:12px;z-index:1000;min-width:140px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.5);">
                                ${estadoOpts}
                            </div>
                        </div>
                    </td>
                    <td class="py-4 px-6 text-right font-black text-white text-[14px]">
                        $${Math.round(ot.total || 0).toLocaleString('es-AR')}
                    </td>
                    <td class="py-4 px-6 text-right font-black text-[14px] ${saldo > 0 ? 'text-red-400' : 'text-emerald-400'}">
                        $${Math.round(saldo).toLocaleString('es-AR')}
                    </td>
                    <td class="py-4 px-6 text-right">
                        <div class="flex justify-end gap-2">
                            <button onclick="window.verDocumento('${ot.id}')" title="Ver OT"
                                class="p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 transition-all duration-150 hover:scale-110 hover:text-white hover:border-zinc-500">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                            </button>
                            <button onclick="window.editarOT('${ot.id}')" title="Editar OT"
                                class="p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 transition-all duration-150 hover:scale-110 hover:text-white hover:border-zinc-500">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <button onclick="window.abrirModalSena('${ot.id}')" title="Registrar Pago"
                                class="p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 transition-all duration-150 hover:scale-110 hover:text-white hover:border-zinc-500">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            </button>
                            <button onclick="window.eliminarOT('${ot.id}')" title="Eliminar OT"
                                class="p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 transition-all duration-150 hover:scale-110 hover:text-white hover:border-zinc-500">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>`;
            }).join('');
            if (typeof window._geckoDragTable === 'function') {
                window._geckoDragTable(tbody, function (srcId, dstId) {
                    const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
                    const si = lista.findIndex(x => String(x.id) === String(srcId));
                    const di = lista.findIndex(x => String(x.id) === String(dstId));
                    if (si < 0 || di < 0) return;
                    const moved = lista.splice(si, 1)[0];
                    lista.splice(di, 0, moved);
                    localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(lista));
                    window.renderOts();
                });
            }
        };

        // Ejecutar inmediatamente si la tab OT está visible
        const tabOts = document.getElementById('tabOts');
        if (tabOts && !tabOts.classList.contains('hidden')) {
            window.renderOts();
        }

        // ── Parchar renderizarMovimientos DESPUÉS de main.js (que tiene defer) ──
        // main.js corre DESPUÉS de gecko-fixes.js (por defer), por eso hacemos el override aquí.
        window.renderizarMovimientos = function () {
            const tbody = document.getElementById('tbodyMovimientos');
            if (!tbody) return;

            window.LISTA_MOVIMIENTOS = JSON.parse(localStorage.getItem('gecko_movimientos') || '[]');
            let movs = [...window.LISTA_MOVIMIENTOS];

            // Filtro por categoría
            const catEl = document.getElementById('filterCategoriaMov');
            const catFilt = catEl?.value || '';
            movs = movs.filter(m => {
                if (catFilt && m.categoria !== catFilt) return false;
                return true;
            });

            // Más recientes primero
            movs = movs.slice().reverse();

            if (!movs.length) {
                tbody.innerHTML = `<tr><td colspan="5" style="padding:60px;text-align:center;color:#52525b;font-weight:700;font-style:italic;font-size:13px;">Sin movimientos registrados.</td></tr>`;
                return;
            }

            const cajas = window.LISTA_CAJAS || JSON.parse(localStorage.getItem('gecko_cajas') || '[]');
            const CAJA_STYLES = {
                efectivo: { dot: '#10b981', color: '#34d399', border: 'rgba(16,185,129,0.35)' },
                mercado_pago_celeste: { dot: '#3b82f6', color: '#60a5fa', border: 'rgba(59,130,246,0.35)' },
                banco: { dot: '#64748b', color: '#94a3b8', border: 'rgba(100,116,139,0.35)' }
            };

            window._geckoMovsDisplayed = movs;
            tbody.innerHTML = movs.map((m, i) => {
                const infoCaja = cajas.find(c => c.nombre === m.caja);
                const cs = CAJA_STYLES[infoCaja?.icono] || CAJA_STYLES.efectivo;
                const esIngreso = m.tipo === 'Ingreso';
                const detalle = m.otDetalle || m.detalle || m.concepto || 'Sin detalle';
                const cat = m.categoria || 'Varios';

                return `
                <tr draggable="true" data-drag-key="${i}" style="border-bottom:1px solid rgba(39,39,42,0.5);cursor:grab;" onmouseover="this.style.background='rgba(24,24,27,0.4)'" onmouseout="this.style.background='transparent'">
                    <td style="padding:14px 24px;">
                        <span style="color:#71717a;font-size:11px;font-weight:800;letter-spacing:1px;">${m.fecha || '—'}</span>
                    </td>
                    <td style="padding:14px 24px;">
                        <span style="color:white;font-size:13px;font-weight:800;text-transform:uppercase;">${detalle}</span>
                    </td>
                    <td style="padding:14px 24px;">
                        <span style="display:inline-block;padding:2px 10px;background:rgba(63,63,70,0.5);border:1px solid #3f3f46;border-radius:6px;color:#a1a1aa;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">${cat}</span>
                    </td>
                    <td style="padding:14px 24px;">
                        <div style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:transparent;border:1px solid ${cs.border};border-radius:20px;">
                            <span style="width:6px;height:6px;border-radius:50%;background:${cs.dot};flex-shrink:0;"></span>
                            <span style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;color:${cs.color};">${m.caja || '—'}</span>
                        </div>
                    </td>
                    <td style="padding:14px 24px;text-align:right;">
                        <span style="font-size:15px;font-weight:900;color:${esIngreso ? '#22c55e' : '#ef4444'};">
                            ${esIngreso ? '+' : '-'}$${Math.round(m.monto || 0).toLocaleString('es-AR')}
                        </span>
                        <div style="font-size:9px;font-weight:900;color:#52525b;text-transform:uppercase;letter-spacing:1px;margin-top:2px;">${m.tipo}</div>
                    </td>
                    <td style="padding:14px 24px;text-align:right;">
                        <div style="display:flex;justify-content:flex-end;gap:8px;">
                            <button onclick="window.editarMovimiento(${i})" style="width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);color:#a1a1aa;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)';this.style.color='#fff'" onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.color='#a1a1aa'" title="Editar">
                                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button onclick="window.eliminarMovimiento(${i})" style="width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);color:#a1a1aa;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.15)';this.style.borderColor='rgba(239,68,68,0.3)';this.style.color='#ef4444'" onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.05)';this.style.color='#a1a1aa'" title="Eliminar">
                                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>`;
            }).join('');
            if (typeof window._geckoDragTable === 'function') {
                window._geckoDragTable(tbody, function (srcKey, destKey) {
                    const si = parseInt(srcKey), di = parseInt(destKey);
                    const displayed = window._geckoMovsDisplayed || [];
                    if (!displayed[si] || !displayed[di]) return;
                    const fullList = window.LISTA_MOVIMIENTOS;
                    if (!fullList) return;
                    const fo = fullList.indexOf(displayed[si]);
                    const fd = fullList.indexOf(displayed[di]);
                    if (fo < 0 || fd < 0) return;
                    const moved = fullList.splice(fo, 1)[0];
                    fullList.splice(fd, 0, moved);
                    window.LISTA_MOVIMIENTOS = fullList;
                    localStorage.setItem('gecko_movimientos', JSON.stringify(fullList));
                    window.renderizarMovimientos();
                });
            }
        };

        // ── Poblar selects de cajas al abrir modales ──
        window.abrirModalNuevoMovimiento = function () {
            const cajas = JSON.parse(localStorage.getItem('gecko_cajas') || '[]');
            const opts = cajas.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('');
            const sel = document.getElementById('nuevoMovCaja');
            if (sel) sel.innerHTML = `<option value="">Seleccionar caja...</option>` + opts;

            const m = document.getElementById('modalNuevoMovimiento');
            if (m) { m.style.display = 'flex'; }
            const desc = document.getElementById('nuevoMovDesc');
            const monto = document.getElementById('nuevoMovMonto');
            if (desc) desc.value = '';
            if (monto) monto.value = '';
        };

        window.abrirModalTransferencia = function () {
            const cajas = JSON.parse(localStorage.getItem('gecko_cajas') || '[]');
            const opts = cajas.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('');
            const selO = document.getElementById('transferenciaOrigen');
            if (selO) selO.innerHTML = `<option value="">Seleccionar caja origen...</option>` + opts;
            const selD = document.getElementById('transferenciaDestino');
            if (selD) selD.innerHTML = `<option value="">Seleccionar caja destino...</option>` + opts;

            const m = document.getElementById('modalTransferencia');
            if (m) { m.style.display = 'flex'; }
            const monto = document.getElementById('transferenciaMonto');
            if (monto) monto.value = '';
        };

        // Poblar selects una vez más ahora que main.js ya corrió
        if (typeof updateCajaSelectors === 'function') updateCajaSelectors();

        // Re-render si finanzas está activa
        const viewFin = document.getElementById('viewFinanzas');
        if (viewFin && !viewFin.classList.contains('hidden')) {
            window.renderizarMovimientos();
        }



        // ── Fase 3: Acciones (Eliminar y Editar Cliente) ──
        window.eliminarCliente = function (nombre) {
            document.getElementById('_geckoConfirmElimCli')?.remove();
            const modal = document.createElement('div');
            modal.id = '_geckoConfirmElimCli';
            modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:10000;background:rgba(10,12,20,0.75);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:16px;';
            modal.innerHTML = `
                <div style="background:#141417;border:1px solid #27272a;border-radius:24px;width:100%;max-width:400px;padding:32px;text-align:center;">
                    <div style="width:56px;height:56px;background:rgba(239,68,68,0.1);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px auto;">
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#ef4444" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </div>
                    <h3 style="color:white;font-size:18px;font-weight:900;margin:0 0 8px 0;">Eliminar Cliente</h3>
                    <p style="color:#71717a;font-size:13px;margin:0 0 28px 0;">Se eliminará a <strong style="color:white;">${nombre}</strong> del sistema. Esta acción no se puede deshacer.</p>
                    <div style="display:flex;gap:10px;">
                        <button onclick="document.getElementById('_geckoConfirmElimCli').remove()" style="flex:1;padding:13px;background:transparent;border:1px solid #27272a;color:#71717a;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">Cancelar</button>
                        <button id="_geckoElimCliOk" style="flex:1;padding:13px;background:#ef4444;border:none;color:white;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">Eliminar</button>
                    </div>
                </div>`;
            document.body.appendChild(modal);
            modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

            document.getElementById('_geckoElimCliOk').onclick = function () {
                let bdClientes = JSON.parse(localStorage.getItem('clientes')) || [];
                bdClientes = bdClientes.filter(c => c.nombre !== nombre);
                localStorage.setItem('clientes', JSON.stringify(bdClientes));
                modal.remove();
                if (typeof window.renderClientes === 'function') window.renderClientes();
                if (typeof window.mostrarExito === 'function') window.mostrarExito('Cliente eliminado', '¡Listo!');
            };
        };

        window.agregarEditCampoCuit = function () {
            const container = document.getElementById('editContainerCuits');
            if (!container) return;
            const row = document.createElement('div');
            row.className = 'flex items-center gap-2 mb-2 cuit-row animate-in fade-in slide-in-from-top-1';
            row.innerHTML = `<input type="text" class="edit-cuit-input gecko-input-line flex-1" placeholder="Otro CUIT/DNI..."><input type="text" class="edit-cuit-label-input gecko-input-line" style="width:9rem !important;flex-shrink:0;" placeholder="Etiqueta"><button type="button" onclick="this.parentElement.remove()" class="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shrink-0"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>`;
            container.appendChild(row);
        };

        window.agregarEditCampoTel = function () {
            const container = document.getElementById('editContainerTels');
            if (!container) return;
            const row = document.createElement('div');
            row.className = 'flex items-center gap-2 mb-2 tel-row animate-in fade-in slide-in-from-top-1';
            row.innerHTML = `<input type="text" class="edit-tel-num-input gecko-input-line flex-1" style="width:auto !important;min-width:0;" placeholder="Otro teléfono..."><input type="text" class="edit-tel-label-input gecko-input-line" style="width:9rem !important;flex-shrink:0;" placeholder="Etiqueta"><button type="button" onclick="this.parentElement.remove()" class="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shrink-0"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>`;
            container.appendChild(row);
        };

        window.agregarEditCampoEmail = function () {
            const container = document.getElementById('editContainerEmails');
            if (!container) return;
            const row = document.createElement('div');
            row.className = 'flex items-center gap-3 mb-2 email-row animate-in fade-in slide-in-from-top-1';
            row.innerHTML = `<input type="email" class="edit-email-input gecko-input-line w-full" placeholder="Otro email..."><button type="button" onclick="this.parentElement.remove()" class="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shrink-0"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>`;
            container.appendChild(row);
        };

        window.editarCliente = function (nombre) {
            const bdClientes = JSON.parse(localStorage.getItem('clientes')) || [];
            const cliente = bdClientes.find(c => c.nombre === nombre);
            if (!cliente) { alert("Cliente no encontrado."); return; }

            document.getElementById('_geckoModalEditCli')?.remove();
            const modal = document.createElement('div');
            modal.id = '_geckoModalEditCli';
            modal.className = 'gecko-modal-overlay';
            modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:10000;background:rgba(10,12,20,0.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);align-items:center;justify-content:center;padding:16px;overflow-y:auto;';

            // Normalizar cuits — puede venir como string JSON, array de strings o array de {numero, etiqueta}
            let cuitsNorm = [];
            if (Array.isArray(cliente.cuits) && cliente.cuits.length > 0) {
                cuitsNorm = cliente.cuits;
            } else if (typeof cliente.cuits === 'string' && cliente.cuits.startsWith('[')) {
                try { cuitsNorm = JSON.parse(cliente.cuits); } catch (e) { cuitsNorm = []; }
            }
            if (cuitsNorm.length === 0 && cliente.cuit) cuitsNorm = [{ numero: cliente.cuit, etiqueta: '' }];
            if (cuitsNorm.length === 0) cuitsNorm = [{ numero: '', etiqueta: '' }];

            let cuitsHtml = '';
            cuitsNorm.forEach((cu, idx) => {
                const num = typeof cu === 'string' ? cu : (cu.numero || '');
                const etq = typeof cu === 'string' ? '' : (cu.etiqueta || '');
                cuitsHtml += `<div class="flex items-center gap-2 mb-2 cuit-row">
                    <input type="text" class="edit-cuit-input gecko-input-line flex-1" value="${num}" placeholder="Ej: 20-12345678-9">
                    <input type="text" class="edit-cuit-label-input gecko-input-line" style="width:9rem !important;flex-shrink:0;" value="${etq}" placeholder="Etiqueta (ej: Kiara)">` +
                    (idx === 0
                        ? `<button type="button" onclick="window.agregarEditCampoCuit()" title="Añadir otro" class="w-8 h-8 rounded-lg bg-orange-500/10 text-gecko hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center shrink-0"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg></button>`
                        : `<button type="button" onclick="this.parentElement.remove()" class="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shrink-0"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>`)
                    + `</div>`;
            });

            // Normalizar telefonos — puede venir como string JSON, array de strings, o array de {numero, etiqueta}
            let telefonosNorm = [];
            if (Array.isArray(cliente.telefonos) && cliente.telefonos.length > 0) {
                telefonosNorm = cliente.telefonos;
            } else if (typeof cliente.telefonos === 'string' && cliente.telefonos.startsWith('[')) {
                try { telefonosNorm = JSON.parse(cliente.telefonos); } catch (e) { telefonosNorm = []; }
            }
            if (telefonosNorm.length === 0 && cliente.tel) telefonosNorm = [{ numero: cliente.tel, etiqueta: '' }];
            if (telefonosNorm.length === 0) telefonosNorm = [{ numero: '', etiqueta: '' }];

            let telefonosHtml = '';
            telefonosNorm.forEach((t, idx) => {
                const num = typeof t === 'string' ? t : (t.numero || '');
                const etq = typeof t === 'string' ? '' : (t.etiqueta || '');
                telefonosHtml += `<div class="flex items-center gap-2 mb-2 tel-row">
                    <input type="text" class="edit-tel-num-input gecko-input-line flex-1" style="width:auto !important;min-width:0;" value="${num}" placeholder="+54 9 221...">
                    <input type="text" class="edit-tel-label-input gecko-input-line" style="width:9rem !important;flex-shrink:0;" value="${etq}" placeholder="Etiqueta (ej: Kiara)">` +
                    (idx === 0
                        ? `<button type="button" onclick="window.agregarEditCampoTel()" title="Añadir otro" class="w-8 h-8 rounded-lg bg-orange-500/10 text-gecko hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center shrink-0"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg></button>`
                        : `<button type="button" onclick="this.parentElement.remove()" class="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shrink-0"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>`)
                    + `</div>`;
            });

            // Normalizar emails
            let emailsNorm = [];
            if (Array.isArray(cliente.emails) && cliente.emails.length > 0) {
                emailsNorm = cliente.emails;
            } else if (typeof cliente.emails === 'string' && cliente.emails.startsWith('[')) {
                try { emailsNorm = JSON.parse(cliente.emails); } catch (e) { emailsNorm = []; }
            }
            if (emailsNorm.length === 0 && cliente.email) emailsNorm = [cliente.email];
            if (emailsNorm.length === 0) emailsNorm = [''];

            let emailsHtml = '';
            emailsNorm.forEach((em, idx) => {
                const emStr = typeof em === 'string' ? em : (em.email || '');
                emailsHtml += `<div class="flex items-center gap-2 mb-2 email-row"><input type="email" class="edit-email-input gecko-input-line w-full" value="${emStr}" placeholder="ejemplo@correo.com">` +
                    (idx === 0
                        ? `<button type="button" onclick="window.agregarEditCampoEmail()" title="Añadir otro" class="w-8 h-8 rounded-lg bg-orange-500/10 text-gecko hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center shrink-0"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg></button>`
                        : `<button type="button" onclick="this.parentElement.remove()" class="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shrink-0"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>`)
                    + `</div>`;
            });

            modal.innerHTML = `
                <div class="gecko-modal-box max-w-3xl w-full mx-auto my-auto relative">
                    <button onclick="document.getElementById('_geckoModalEditCli').remove()" style="position:absolute;top:24px;right:24px;width:40px;height:40px;border-radius:12px;background:#18181b;border:1px solid #27272a;color:#71717a;display:flex;align-items:center;justify-content:center;transition:all 0.2s;cursor:pointer;" onmouseover="this.style.color='#ef4444';this.style.transform='rotate(90deg)'" onmouseout="this.style.color='#71717a';this.style.transform='rotate(0deg)'">
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                    
                    <p class="gecko-modal-subtitle">DIRECTORIO DE CLIENTES</p>
                    <h2 class="gecko-modal-title">EDITAR CLIENTE</h2>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mt-6">
                        <div>
                            <label class="gecko-label">Nombre / Razón Social</label>
                            <input type="text" id="_editCliNombre" class="gecko-input-line" value="${cliente.nombre}" disabled style="opacity:0.5;cursor:not-allowed;" title="El identificador principal no se puede modificar.">
                        </div>
                        <div id="editContainerCuits">
                            <label class="gecko-label">CUIT / DNI</label>
                            ${cuitsHtml}
                        </div>
                        <div id="editContainerTels">
                            <label class="gecko-label">Teléfonos / WhatsApp</label>
                            ${telefonosHtml}
                        </div>
                        <div id="editContainerEmails">
                            <label class="gecko-label">Email</label>
                            ${emailsHtml}
                        </div>
                        <div>
                            <label class="gecko-label">Dirección</label>
                            <input type="text" id="_editCliDir" class="gecko-input-line" value="${cliente.dir || ''}">
                        </div>
                        <div>
                            <label class="gecko-label">Localidad</label>
                            <input type="text" id="_editCliLoc" class="gecko-input-line" value="${cliente.loc || ''}">
                        </div>
                        <div class="md:col-span-2">
                            <label class="gecko-label">Rubro</label>
                            <input type="text" id="_editCliRubro" class="gecko-input-line" value="${cliente.rubro || ''}">
                        </div>
                    </div>
                    
                    <div class="gecko-modal-footer" style="align-items:center;justify-content:center !important; gap: 1.5rem !important; margin-top:32px;">
                        <button class="gecko-btn-cancel" onclick="document.getElementById('_geckoModalEditCli').remove()">CANCELAR</button>
                        <button class="gecko-btn-primary" id="_btnGuardarEditCli">GUARDAR CAMBIOS</button>
                    </div>
                </div>`;

            document.body.appendChild(modal);
            modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

            document.getElementById('_btnGuardarEditCli').onclick = function () {
                // Leer CUITs con etiqueta
                const cuits = Array.from(document.querySelectorAll('#editContainerCuits .cuit-row')).map(row => {
                    const num = row.querySelector('.edit-cuit-input')?.value.trim() || '';
                    const etq = row.querySelector('.edit-cuit-label-input')?.value.trim() || '';
                    return num ? { numero: num, etiqueta: etq } : null;
                }).filter(v => v);

                // Leer teléfonos con etiqueta
                const tels = Array.from(document.querySelectorAll('#editContainerTels .tel-row')).map(row => {
                    const num = row.querySelector('.edit-tel-num-input')?.value.trim() || '';
                    const etq = row.querySelector('.edit-tel-label-input')?.value.trim() || '';
                    return num ? { numero: num, etiqueta: etq } : null;
                }).filter(v => v);

                const emails = Array.from(document.querySelectorAll('.edit-email-input')).map(i => i.value.trim()).filter(v => v);

                const idx = bdClientes.findIndex(c => c.nombre === nombre);
                if (idx !== -1) {
                    bdClientes[idx] = {
                        ...bdClientes[idx],
                        cuits: cuits,
                        cuit: cuits.length > 0 ? cuits[0].numero : '',
                        telefonos: tels,
                        tel: tels.length > 0 ? tels[0].numero : '',
                        emails: emails,
                        email: emails[0] || '',
                        dir: document.getElementById('_editCliDir').value.trim(),
                        loc: document.getElementById('_editCliLoc').value.trim(),
                        rubro: document.getElementById('_editCliRubro').value.trim()
                    };
                    localStorage.setItem('clientes', JSON.stringify(bdClientes));
                }

                modal.remove();
                if (typeof window.mostrarExito === 'function') window.mostrarExito("Datos actualizados.", "¡Guardado!");
                if (typeof window.renderClientes === 'function') window.renderClientes();
            };
        };



        // ── SOBREESCRITURA DEFINITIVA DE MOVIMIENTOS Y TRANSFERENCIAS ──
        window.guardarNuevoMovimiento = function () {
            const tipo = document.getElementById('nuevoMovTipo')?.value || 'ingreso';
            const desc = document.getElementById('nuevoMovDesc')?.value?.trim();
            const monto = parseFloat(document.getElementById('nuevoMovMonto')?.value) || 0;
            const caja = document.getElementById('nuevoMovCaja')?.value;
            if (!desc || monto <= 0) { alert('Completá descripción y monto.'); return; }
            if (!caja) { alert('Seleccioná una caja.'); return; }

            const tipoCapital = tipo.charAt(0).toUpperCase() + tipo.slice(1);

            // Bypass de variables léxicas de main.js -> lectura directa a Base de Datos Local
            const cajas = JSON.parse(localStorage.getItem('gecko_cajas') || '[]');
            const cajObj = cajas.find(c => c.nombre === caja);
            if (cajObj) {
                tipoCapital === 'Ingreso' ? (cajObj.saldo += monto) : (cajObj.saldo -= monto);
                localStorage.setItem('gecko_cajas', JSON.stringify(cajas));
            } else {
                alert('Caja no encontrada en la base de datos.'); return;
            }

            const mov = { id: 'mov_' + Date.now(), fecha: new Date().toLocaleDateString('es-AR'), detalle: desc, caja: caja, tipo: tipoCapital, monto: monto, categoria: 'Varios' };
            const movs = JSON.parse(localStorage.getItem('gecko_movimientos') || '[]');
            movs.push(mov);
            localStorage.setItem('gecko_movimientos', JSON.stringify(movs));

            document.getElementById('modalNuevoMovimiento').style.display = 'none';

            if (typeof window.mostrarExito === 'function') window.mostrarExito(`${tipoCapital} de $${monto.toLocaleString('es-AR')} registrado.`, '¡Hecho!');

            if (typeof window.renderizarFinanzas === 'function') window.renderizarFinanzas();
            if (typeof window.renderizarMovimientos === 'function') window.renderizarMovimientos();
        };

        window.eliminarMovimiento = function (index) {
            const movs = window._geckoMovsDisplayed || window.LISTA_MOVIMIENTOS || JSON.parse(localStorage.getItem('gecko_movimientos') || '[]');
            const mov = movs[index];
            if (!mov) return;

            // 1. Crear Modal Dinámico estilo GECKO
            document.getElementById('_geckoConfirmElimMov')?.remove();
            const modal = document.createElement('div');
            modal.id = '_geckoConfirmElimMov';
            modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:10000;background:rgba(10,12,20,0.75);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:16px;';
            modal.innerHTML = `
                <div style="background:#141417;border:1px solid #27272a;border-radius:24px;width:100%;max-width:400px;padding:32px;text-align:center;">
                    <div style="width:56px;height:56px;background:rgba(239,68,68,0.1);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px auto;">
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#ef4444" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </div>
                    <h3 style="color:white;font-size:18px;font-weight:900;margin:0 0 8px 0;">Eliminar movimiento</h3>
                    <p style="color:#71717a;font-size:13px;margin:0 0 28px 0;">Se eliminará <strong style="color:white;">${mov.detalle}</strong> y se revertirá el saldo en la caja.</p>
                    <div style="display:flex;gap:10px;">
                        <button onclick="document.getElementById('_geckoConfirmElimMov').remove()"
                            style="flex:1;padding:13px;background:transparent;border:1px solid #27272a;color:#71717a;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">Cancelar</button>
                        <button id="_geckoElimMovOk"
                            style="flex:1;padding:13px;background:#ef4444;border:none;color:white;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">Eliminar</button>
                    </div>
                </div>`;
            document.body.appendChild(modal);

            // Cerrar si hace click afuera
            modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

            // 2. Ejecutar la lógica de eliminación real si confirma
            document.getElementById('_geckoElimMovOk').onclick = function () {
                modal.remove();

                const cajas = JSON.parse(localStorage.getItem('gecko_cajas') || '[]');
                const cajaObj = cajas.find(c => c.nombre === mov.caja);

                // Revertir el saldo en la caja
                if (cajaObj) {
                    if (mov.tipo === 'Ingreso') {
                        cajaObj.saldo -= mov.monto;
                    } else {
                        cajaObj.saldo += mov.monto;
                    }
                    localStorage.setItem('gecko_cajas', JSON.stringify(cajas));
                }

                // Eliminar de la base de datos principal
                const dbMovs = JSON.parse(localStorage.getItem('gecko_movimientos') || '[]');
                const dbIndex = dbMovs.findIndex(m => m.id === mov.id || (m.fecha === mov.fecha && m.monto === mov.monto && m.detalle === mov.detalle));
                if (dbIndex !== -1) {
                    dbMovs.splice(dbIndex, 1);
                    localStorage.setItem('gecko_movimientos', JSON.stringify(dbMovs));
                    window.LISTA_MOVIMIENTOS = dbMovs;
                }

                if (typeof window.renderizarFinanzas === 'function') window.renderizarFinanzas();
                if (typeof window.renderizarMovimientos === 'function') window.renderizarMovimientos();
                if (typeof window.mostrarExito === 'function') window.mostrarExito('Movimiento eliminado', '¡Listo!');
            };
        };

        window.editarMovimiento = function (index) {
            alert('La edición de movimientos estará disponible próximamente. Por ahora puedes eliminarlo y crearlo de nuevo.');
        };

        window.ejecutarTransferencia = function () {
            const origen = document.getElementById('transferenciaOrigen')?.value;
            const destino = document.getElementById('transferenciaDestino')?.value;
            const monto = parseFloat(document.getElementById('transferenciaMonto')?.value) || 0;
            const desc = document.getElementById('transferenciaDesc')?.value || '';

            if (!origen || !destino) { alert('Seleccioná cajas de origen y destino.'); return; }
            if (origen === destino) { alert('Las cajas deben ser distintas.'); return; }
            if (monto <= 0) { alert('Monto inválido.'); return; }

            const cajas = JSON.parse(localStorage.getItem('gecko_cajas') || '[]');
            const cajO = cajas.find(c => c.nombre === origen);
            const cajD = cajas.find(c => c.nombre === destino);

            if (!cajO || !cajD) { alert('Caja no encontrada.'); return; }

            cajO.saldo -= monto;
            cajD.saldo += monto;
            localStorage.setItem('gecko_cajas', JSON.stringify(cajas));

            const ts = Date.now();
            const movs = JSON.parse(localStorage.getItem('gecko_movimientos') || '[]');
            movs.push({ id: 'mov_' + ts, fecha: new Date().toLocaleDateString('es-AR'), detalle: `Transferencia a ${destino}${desc ? ' - ' + desc : ''}`, caja: origen, tipo: 'Egreso', monto: monto, categoria: 'Transferencia' });
            movs.push({ id: 'mov_' + (ts + 1), fecha: new Date().toLocaleDateString('es-AR'), detalle: `Transferencia desde ${origen}${desc ? ' - ' + desc : ''}`, caja: destino, tipo: 'Ingreso', monto: monto, categoria: 'Transferencia' });

            localStorage.setItem('gecko_movimientos', JSON.stringify(movs));

            document.getElementById('modalTransferencia').style.display = 'none';

            if (typeof window.mostrarExito === 'function') window.mostrarExito(`Transferencia de $${monto.toLocaleString('es-AR')} realizada.`, '¡Listo!');

            if (typeof window.renderizarFinanzas === 'function') window.renderizarFinanzas();
            if (typeof window.renderizarMovimientos === 'function') window.renderizarMovimientos();
        };

        // ── SOBREESCRITURA DEFINITIVA: Múltiples CUITs y Mails ──
        window.agregarCampoCuit = function () {
            const container = document.getElementById('containerCuits');
            if (!container) return;
            const row = document.createElement('div');
            row.className = 'flex items-center gap-2 mb-2 cuit-row animate-in fade-in slide-in-from-top-1';
            row.innerHTML = `<input type="text" class="cuit-input gecko-input-line flex-1" placeholder="Otro CUIT/DNI..."><input type="text" class="cuit-label-input gecko-input-line w-36" style="width:9rem !important;" placeholder="Etiqueta (ej: Movilist)"><button type="button" onclick="this.parentElement.remove()" class="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shrink-0"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>`;
            container.appendChild(row);
        };

        window.agregarCampoTel = function () {
            const container = document.getElementById('containerTels');
            if (!container) return;
            const row = document.createElement('div');
            row.className = 'flex items-center gap-2 mb-2 tel-row';
            row.innerHTML = `<input type="text" class="tel-num-input gecko-input-line flex-1" style="width:auto !important; min-width:0;" placeholder="Otro teléfono..."><input type="text" class="tel-label-input gecko-input-line w-36" style="width:9rem !important;" placeholder="Etiqueta"><button type="button" onclick="this.parentElement.remove()" class="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shrink-0"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>`;
            container.appendChild(row);
        };

        window.agregarCampoEmail = function () {
            const container = document.getElementById('containerEmails');
            if (!container) return;
            const row = document.createElement('div');
            row.className = 'flex items-center gap-3 mb-2 email-row animate-in fade-in slide-in-from-top-1';
            row.innerHTML = `<input type="email" class="email-input gecko-input-line w-full" placeholder="Otro email..."><button type="button" onclick="this.parentElement.remove()" class="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shrink-0"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>`;
            container.appendChild(row);
        };

        window.abrirModalNuevoCliente = function () {
            const modal = document.getElementById('modalNuevoCliente');
            if (modal) {
                modal.style.display = 'flex';
            }

            const ids = ['nuevoClienteNombre', 'nuevoClienteDir', 'nuevoClienteLoc', 'nuevoClienteRubro'];
            ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

            const cCuits = document.getElementById('containerCuits');
            if (cCuits) cCuits.innerHTML = `<label class="gecko-label">CUIT / DNI</label><div class="flex items-center gap-2 mb-2 cuit-row"><input type="text" class="cuit-input gecko-input-line flex-1" placeholder="Ej: 20-12345678-9"><input type="text" class="cuit-label-input gecko-input-line w-36" style="width:9rem !important;" placeholder="Etiqueta (ej: Kiara)"><button type="button" onclick="window.agregarCampoCuit()" title="Añadir otro" class="w-8 h-8 rounded-lg bg-orange-500/10 text-gecko hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center shrink-0"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg></button></div>`;

            const cEmails = document.getElementById('containerEmails');
            if (cEmails) cEmails.innerHTML = `<label class="gecko-label">Email</label><div class="flex items-center gap-2 mb-2 email-row"><input type="email" class="email-input gecko-input-line w-full" placeholder="ejemplo@correo.com"><button type="button" onclick="window.agregarCampoEmail()" title="Añadir otro" class="w-8 h-8 rounded-lg bg-orange-500/10 text-gecko hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center shrink-0"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg></button></div>`;

            const cTels = document.getElementById('containerTels');
            if (cTels) cTels.innerHTML = `<label class="gecko-label">Teléfonos / WhatsApp</label><div class="flex items-center gap-2 mb-2 tel-row"><input type="text" class="tel-num-input gecko-input-line flex-1" style="width:auto !important; min-width:0;" placeholder="+54 9 221..."><input type="text" class="tel-label-input gecko-input-line w-36" style="width:9rem !important;" placeholder="Etiqueta (ej: Laura)"><button type="button" onclick="window.agregarCampoTel()" title="Añadir otro" class="w-8 h-8 rounded-lg bg-orange-500/10 text-gecko hover:bg-orange-500 hover:text-white transition-all flex items-center justify-center shrink-0"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg></button></div>`;
        };

        window.guardarCliente = function () {
            const nombre = document.getElementById('nuevoClienteNombre')?.value.trim();
            if (!nombre) { alert("El Nombre / Razón Social es obligatorio"); return; }

            const cuits = Array.from(document.querySelectorAll('.cuit-input')).map(i => {
                const num = i.value.trim();
                const label = i.parentElement?.querySelector('.cuit-label-input')?.value?.trim() || '';
                return num ? { numero: num, etiqueta: label } : null;
            }).filter(v => v);
            const emails = Array.from(document.querySelectorAll('.email-input')).map(i => i.value.trim()).filter(v => v);
            const tels = Array.from(document.querySelectorAll('.tel-num-input')).map(i => {
                const num = i.value.trim();
                const label = i.parentElement?.querySelector('.tel-label-input')?.value?.trim() || '';
                return num ? { numero: num, etiqueta: label } : null;
            }).filter(v => v);

            const nuevoCliente = {
                id: 'client_' + Date.now(),
                nombre: nombre,
                cuits: cuits,
                cuit: cuits.length > 0 ? cuits[0].numero : '',
                telefonos: tels,
                tel: tels.length > 0 ? tels[0].numero : '',
                emails: emails,
                email: emails[0] || '',
                dir: document.getElementById('nuevoClienteDir')?.value || '',
                loc: document.getElementById('nuevoClienteLoc')?.value || '',
                rubro: document.getElementById('nuevoClienteRubro')?.value || '',
            };

            let bdClientes = JSON.parse(localStorage.getItem('clientes')) || [];
            const index = bdClientes.findIndex(c => c.nombre.toLowerCase() === nombre.toLowerCase());
            if (index !== -1) {
                bdClientes[index] = nuevoCliente;
            } else {
                bdClientes.push(nuevoCliente);
            }

            // Guardado doble para evitar conflictos con scripts antiguos
            localStorage.setItem('clientes', JSON.stringify(bdClientes));
            localStorage.setItem('gecko_clientes', JSON.stringify(bdClientes));

            // Actualización de variables globales
            window.LISTA_CLIENTES = bdClientes;
            if (typeof window.datosPrueba !== 'undefined') window.datosPrueba.clientes = bdClientes;

            const modal = document.getElementById('modalNuevoCliente');
            if (modal) modal.style.display = 'none';

            if (typeof window.mostrarExito === 'function') window.mostrarExito("El cliente " + nombre + " ha sido registrado.", "¡Cliente Guardado!");

            setTimeout(() => { window.renderClientes(); }, 100);
            if (typeof window.actualizarSugerenciaClientes === 'function') window.actualizarSugerenciaClientes();
        };

        // ── Lógica Modal Cobro ──
        window.abrirModalCobro = function () {
            const modal = document.getElementById('modalCobro');
            if (modal) modal.style.display = 'flex';

            const montoInput = document.getElementById('cobroMonto');
            if (montoInput) montoInput.value = '';

            const sel = document.getElementById('cobroCaja');
            if (sel) {
                const cajas = JSON.parse(localStorage.getItem('gecko_cajas') || '[]');
                const opts = cajas.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('');
                sel.innerHTML = `<option value="">Seleccionar caja...</option>` + opts;
            }
        };

        // Alias para compatibilidad con el código existente que use abrirModalPagoGlobal
        window.abrirModalPagoGlobal = window.abrirModalCobro;

        // confirmarCobro: delega en la función original si existe, o ejecuta lógica propia
        window.confirmarCobro = function () {
            if (typeof window.confirmarPagoGlobalCliente === 'function') {
                // Sincronizar valores a los IDs viejos por si la función original los lee
                const monto = document.getElementById('cobroMonto')?.value;
                const caja = document.getElementById('cobroCaja')?.value;
                const mOld = document.getElementById('inputMontoPagoGlobal');
                const cOld = document.getElementById('selectCajaPagoGlobal');
                if (mOld) mOld.value = monto;
                if (cOld) cOld.value = caja;
                window.confirmarPagoGlobalCliente();
            }
            document.getElementById('modalCobro').style.display = 'none';
        };

        // ── Sistema Unificado de Cierre de Modales (Evita el bug del ESC) ──
        window.modalActualEnPeligro = null;

        window.intentarCerrarModal = function (modalId) {
            const modal = document.getElementById(modalId);
            if (!modal) return;

            window.modalActualEnPeligro = modal;

            const advertencia = document.getElementById('modalAdvertencia');
            if (advertencia) {
                advertencia.style.display = 'flex';

                const btnContinuar = advertencia.querySelector('.gecko-btn-primary') || advertencia.querySelector('.btn-naranja');
                const btnCancelar = advertencia.querySelector('.gecko-btn-cancel') || advertencia.querySelector('.btn-gris');

                if (btnContinuar) {
                    btnContinuar.onclick = function () {
                        advertencia.style.display = 'none';
                        if (window.modalActualEnPeligro) window.modalActualEnPeligro.style.display = 'none';
                        window.modalActualEnPeligro = null;
                    };
                }
                if (btnCancelar) {
                    btnCancelar.onclick = function () {
                        advertencia.style.display = 'none';
                        window.modalActualEnPeligro = null;
                    };
                }
            } else {
                modal.style.display = 'none';
            }
        };

        // Interceptar ESC globalmente para usar el mismo circuito
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                const modalesAbiertos = Array.from(document.querySelectorAll('.gecko-modal-overlay, [id^="modal"]'))
                    .filter(m => m.style.display === 'flex' && m.id !== 'modalAdvertencia');
                if (modalesAbiertos.length > 0) {
                    const modalActivo = modalesAbiertos[modalesAbiertos.length - 1];
                    window.intentarCerrarModal(modalActivo.id);
                }
            }
        });

        // ── SOBREESCRITURA BLINDADA: GUARDADO Y RENDERIZADO CLIENTES ──
        window.obtenerBadgeScoring = function (clienteNombre) {
            const ahora = new Date();
            const mesActual = ahora.getMonth();
            const anioActual = ahora.getFullYear();
            const listaP = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');

            const totalMes = listaP.filter(p => {
                if (p.cliente !== clienteNombre || p.status !== 'OT' || !p.fecha) return false;
                const parts = p.fecha.split('/');
                if (parts.length < 3) return false;
                return (parseInt(parts[1]) - 1) === mesActual && parseInt(parts[2]) === anioActual;
            }).reduce((acc, p) => acc + (parseFloat(p.total) || 0), 0);

            const setG = JSON.parse(localStorage.getItem('GECKO_SETTINGS') || '{}');
            const sNivelOro = setG.nivelOro || 250000;
            const sNivelPlata = setG.nivelPlata || 100000;

            if (totalMes >= sNivelOro) {
                return `<span class="px-2 py-0.5 rounded-md bg-[#FFD700]/20 text-[#B8860B] border border-[#FFD700]/50 text-[9px] font-black uppercase tracking-widest ml-2" title="Facturación Mes: $${totalMes.toLocaleString('es-AR')}">ORO</span>`;
            } else if (totalMes >= sNivelPlata) {
                return `<span class="px-2 py-0.5 rounded-md bg-[#C0C0C0]/20 text-[#808080] border border-[#C0C0C0]/50 text-[9px] font-black uppercase tracking-widest ml-2" title="Facturación Mes: $${totalMes.toLocaleString('es-AR')}">PLATA</span>`;
            } else {
                return `<span class="px-2 py-0.5 rounded-md bg-[#CD7F32]/10 text-[#A0522D] border border-[#CD7F32]/30 text-[9px] font-black uppercase tracking-widest ml-2" title="Facturación Mes: $${totalMes.toLocaleString('es-AR')}">BRONCE</span>`;
            }
        };

        window.renderClientes = function () {
            const tbody = document.getElementById('listaClientes');
            if (!tbody) return;

            let bdClientes = JSON.parse(localStorage.getItem('clientes')) || [];
            if (bdClientes.length === 0) bdClientes = JSON.parse(localStorage.getItem('gecko_clientes')) || [];

            window.LISTA_CLIENTES = bdClientes;

            const termino = (
                document.getElementById('filtroClienteBusqueda')?.value ||
                document.getElementById('buscadorClientes')?.value || ''
            ).toLowerCase();
            tbody.innerHTML = '';

            if (bdClientes.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-gray-500">No hay clientes.</td></tr>';
                return;
            }

            bdClientes.forEach(c => {
                if (termino) {
                    const matchNombre = c.nombre.toLowerCase().includes(termino);
                    const matchCuit = (c.cuit || '').toLowerCase().includes(termino);
                    const matchCuits = (c.cuits || []).some(cu => cu.numero?.includes(termino) || cu.etiqueta?.toLowerCase().includes(termino));
                    const matchRubro = (c.rubro || '').toLowerCase().includes(termino);
                    const matchTel = (c.telefonos || []).some(t => t.numero?.includes(termino) || t.etiqueta?.toLowerCase().includes(termino));
                    if (!matchNombre && !matchCuit && !matchCuits && !matchRubro && !matchTel) return;
                }

                const pbd = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
                let saldo = pbd.filter(p => p.cliente === c.nombre && p.status === 'OT').reduce((acc, o) => acc + ((parseFloat(o.total) || 0) - (parseFloat(o.adelanto) || 0)), 0);

                let wp = c.tel ? `<a href="https://wa.me/${c.tel.replace(/\D/g, '')}" target="_blank" class="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 hover:bg-green-500 hover:text-white transition-colors" title="WhatsApp" onclick="event.stopPropagation()"><svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 21.657l-3.324.87 1.011-3.213C8.163 17.65 7.159 15.65 7.159 13.5c0-4.142 3.866-7.5 8.636-7.5 4.771 0 8.636 3.358 8.636 7.5 0 4.143-3.865 7.5-8.636 7.5-1.523 0-2.95-.342-4.178-.936l-3.586 1.593z"/></svg></a>` : '';
                let em = (c.emails && c.emails[0]) || c.email ? `<a href="mailto:${(c.emails && c.emails[0]) || c.email}" class="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 hover:bg-blue-500 hover:text-white transition-colors" title="Email" onclick="event.stopPropagation()"><svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg></a>` : '';

                const tr = document.createElement('tr');
                tr.className = 'border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/20 transition-colors cursor-pointer';
                tr.onclick = function () { abrirFichaCliente(c.nombre); };

                tr.innerHTML = `
                    <td class="py-4 px-6">
                        <div class="flex items-center">
                            <p class="font-extrabold dark:text-white tracking-tight text-[14px]">${c.nombre}</p>
                            ${window.obtenerBadgeScoring(c.nombre)}
                        </div>
                    </td>
                    <td class="py-4 px-6"><div class="flex gap-2">${wp}${em}</div></td>
                    <td class="py-4 px-6"><span class="font-black ${saldo > 0 ? 'text-red-500' : 'text-gecko'}">$${Math.round(saldo).toLocaleString('es-AR')}</span></td>
                    <td class="py-4 px-6 text-right">
                        <button onclick="abrirFichaCliente('${c.nombre.replace(/'/g, "\\'")}');event.stopPropagation();" class="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-darkBg text-gray-700 dark:text-gray-300 font-bold hover:bg-gecko hover:text-white transition-all text-[11px] uppercase tracking-widest inline-flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>Ficha / CC
                        </button>
                    </td>
                    <td class="py-4 px-6 text-center">
                        <div class="flex items-center justify-center gap-2">
                            <button onclick="window.editarCliente('${c.nombre.replace(/'/g, "\\'")}');event.stopPropagation();" style="width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);color:#a1a1aa;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)';this.style.color='#fff'" onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.color='#a1a1aa'" title="Editar"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                            <button onclick="window.eliminarCliente('${c.nombre.replace(/'/g, "\\'")}');event.stopPropagation();" style="width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);color:#a1a1aa;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.15)';this.style.borderColor='rgba(239,68,68,0.3)';this.style.color='#ef4444'" onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.05)';this.style.color='#a1a1aa'" title="Eliminar"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
                        </div>
                    </td>`;
                tbody.appendChild(tr);
            });
        };

        setTimeout(() => { window.renderClientes(); }, 200);

        console.log('🦎 GECKO-FIXES: renderOts + renderizarMovimientos + renderClientes parcheados post-main.js.');
    }, 1500); // 1500ms — espera que main.js (defer) termine todo
});
// ── filtrarMovimientos: lee los inputs de fecha/categoría y re-renderiza ──
window.filtrarMovimientos = function () {
    if (typeof window.renderizarMovimientos === 'function') window.renderizarMovimientos();
};

// ── limpiarFiltrosMovimientos: resetea el filtro de categoría y re-renderiza ──
window.limpiarFiltrosMovimientos = function () {
    const cat = document.getElementById('filterCategoriaMov');
    if (cat) cat.value = '';
    if (typeof window.renderizarMovimientos === 'function') window.renderizarMovimientos();
};

// ── cerrarModalMovimiento: cierra sin disparar el aviso de "cambios pendientes" ──
window.cerrarModalMovimiento = function () {
    const modal = document.getElementById('modalNuevoMovimiento');
    if (!modal) return;
    modal.style.display = 'none';
    // Limpiar campos para que no queden con datos sucios
    ['nuevoMovFecha', 'nuevoMovMonto', 'nuevoMovDesc'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const movTipo = document.getElementById('nuevoMovTipo');
    if (movTipo) movTipo.value = 'ingreso';
    const movCaja = document.getElementById('nuevoMovCaja');
    if (movCaja) movCaja.value = movCaja.options[0]?.value || '';
};

// ── window.geckoDB — objeto de acceso unificado a datos locales
//    Compatible con referencia window.geckoDB.cajas mencionada en MODAL-GECKO-PRO
window.geckoDB = window.geckoDB || {};
Object.defineProperty(window.geckoDB, 'cajas', {
    get: function () {
        return window.LISTA_CAJAS || JSON.parse(localStorage.getItem('gecko_cajas') || '[]');
    },
    configurable: true
});

// ── _geckoPopulateCajaSelect: puebla un <select> con las cajas disponibles
window._geckoPopulateCajaSelect = function (selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const cajas = window.geckoDB.cajas;
    const current = sel.value;
    sel.innerHTML = cajas.length
        ? cajas.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('')
        : '<option value="">Sin cajas disponibles</option>';
    if (current && cajas.find(c => c.nombre === current)) sel.value = current;
};

// ══════════════════════════════════════════════════════
// GECKO DESIGN SYSTEM — Funciones de modales de finanzas
// ══════════════════════════════════════════════════════

// ── _selectCajaTipo: unificado para editarCaja y nuevaCaja (override final)
window._selectCajaTipo = function (tipo) {
    const editHidden = document.getElementById('editCajaTipo');
    if (editHidden) editHidden.value = tipo;
    const nuevaHidden = document.getElementById('nuevaCajaTipo');
    if (nuevaHidden) nuevaHidden.value = tipo;
    const colores = {
        efectivo: { bg: '#15803d', border: '#22c55e' },
        billeteras: { bg: '#1d4ed8', border: '#3b82f6' },
        banco: { bg: '#5b21b6', border: '#7c3aed' }
    };
    document.querySelectorAll('#editCajaTipoGroup, #nuevaCajaTipoGroup').forEach(function (grupo) {
        grupo.querySelectorAll('.gecko-toggle-btn').forEach(function (btn) {
            const btnTipo = btn.dataset.tipo;
            btn.classList.remove('active');
            if (btnTipo === tipo) {
                btn.classList.add('active');
                const col = colores[tipo] || colores.efectivo;
                btn.style.background = col.bg;
                btn.style.borderColor = col.border;
                btn.style.color = '#fff';
            } else {
                btn.style.background = '';
                btn.style.borderColor = '';
                btn.style.color = '';
            }
        });
    });
};

// ── editarCaja: override final — siempre recrea el modal con datos frescos
window.editarCaja = function (id) {
    console.trace('🔴 editarCaja() llamado — id:', id);
    const _ls = window._localStorage_original || localStorage;
    const cajas = JSON.parse(_ls.getItem('gecko_cajas') || '[]');
    const caja = cajas.find(function (c) { return c.id === id; });
    if (!caja) return;
    const tipoCaja = caja.icono === 'mercado_pago_celeste' ? 'billeteras' : (caja.icono || 'efectivo');
    document.getElementById('modalEditarCaja')?.remove();
    const modal = document.createElement('div');
    modal.id = 'modalEditarCaja';
    modal.className = 'gecko-modal-overlay';
    modal.innerHTML = `
        <div class="gecko-modal-box max-w-md w-full mx-4">
            <p class="gecko-modal-subtitle">Finanzas</p>
            <h2 class="gecko-modal-title">Editar Caja</h2>
            <div class="space-y-5 mt-2">
                <div>
                    <label class="gecko-label">Nombre</label>
                    <input id="editCajaNombre" class="gecko-input-line" type="text" value="${(caja.nombre || '').replace(/"/g, '&quot;')}">
                </div>
                <div>
                    <label class="gecko-label">Tipo</label>
                    <div class="gecko-toggle-group mt-2" id="editCajaTipoGroup">
                        <button class="gecko-toggle-btn ${tipoCaja === 'efectivo' ? 'active' : ''}" data-tipo="efectivo" onclick="_selectCajaTipo('efectivo')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                            EFECTIVO
                        </button>
                        <button class="gecko-toggle-btn ${tipoCaja === 'billeteras' ? 'active' : ''}" data-tipo="billeteras" onclick="_selectCajaTipo('billeteras')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>
                            BILLETERAS
                        </button>
                        <button class="gecko-toggle-btn ${tipoCaja === 'banco' ? 'active' : ''}" data-tipo="banco" onclick="_selectCajaTipo('banco')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 9 12 2 21 9"/><rect x="3" y="9" width="18" height="13"/><line x1="9" y1="22" x2="9" y2="9"/><line x1="15" y1="22" x2="15" y2="9"/></svg>
                            BANCO
                        </button>
                    </div>
                    <input type="hidden" id="editCajaTipo" value="${tipoCaja}">
                    <input type="hidden" id="editCajaId" value="${id}">
                </div>
                <div>
                    <label class="gecko-label">Saldo actual</label>
                    <div class="gecko-input-group mt-1">
                        <span class="gecko-input-prefix">$</span>
                        <input id="editCajaSaldo" class="gecko-input-num" type="number" value="${caja.saldo || 0}" style="padding-left: 12px !important;">
                    </div>
                </div>
            </div>
            <div class="gecko-modal-footer" style="justify-content: center !important; gap: 1.5rem !important;">
                <button class="gecko-btn-danger" onclick="window._eliminarCaja()">
                    ELIMINAR
                </button>
                <button class="gecko-btn-cancel" onclick="this.closest('.gecko-modal-overlay').remove()">CANCELAR</button>
                <button class="gecko-btn-primary" onclick="window._guardarEdicionCaja()">GUARDAR</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) { if (e.target === modal) modal.style.display = 'none'; });
    if (typeof window._selectCajaTipo === 'function') window._selectCajaTipo(tipoCaja);
};

// ── crearCaja: nueva caja desde modalNuevaCaja (IDs nuevos)
window.crearCaja = function () {
    const nombre = document.getElementById('nuevaCajaNombre')?.value?.trim();
    let tipo = document.getElementById('nuevaCajaTipo')?.value || 'efectivo';
    if (tipo === 'billeteras') tipo = 'mercado_pago_celeste';
    const saldo = parseFloat(document.getElementById('nuevaCajaSaldo')?.value) || 0;
    if (!nombre) { alert('Ingresá un nombre para la caja.'); return; }
    const _ls = window._localStorage_original || localStorage;
    const id = 'caja_' + Date.now();
    const cajas = JSON.parse(_ls.getItem('gecko_cajas') || '[]');
    cajas.push({ id, nombre, saldo, icono: tipo });
    _ls.setItem('gecko_cajas', JSON.stringify(cajas));
    window.LISTA_CAJAS = cajas;
    fetch('/app/api.php?endpoint=cajas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, nombre, saldo, icono: tipo }) }).catch(() => { });
    if (saldo !== 0) {
        const mov = { id: 'mov_' + Date.now(), fecha: new Date().toLocaleDateString('es-AR'), detalle: 'Saldo inicial de caja', caja: nombre, tipo: saldo > 0 ? 'Ingreso' : 'Egreso', monto: Math.abs(saldo), categoria: 'Sistema' };
        const movs = JSON.parse(_ls.getItem('gecko_movimientos') || '[]');
        movs.push(mov);
        _ls.setItem('gecko_movimientos', JSON.stringify(movs));
        window.LISTA_MOVIMIENTOS = movs;
        fetch('/app/api.php?endpoint=movimientos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mov) }).catch(() => { });
    }
    document.getElementById('modalNuevaCaja').style.display = 'none';
    const f = document.getElementById('nuevaCajaNombre'); if (f) f.value = '';
    const s = document.getElementById('nuevaCajaSaldo'); if (s) s.value = '0';
    if (typeof window.mostrarExito === 'function') window.mostrarExito(`Caja "${nombre}" creada.`, '¡Hecho!');
    setTimeout(function () {
        window.LISTA_MOVIMIENTOS = JSON.parse(_ls.getItem('gecko_movimientos') || '[]');
        window.renderizarFinanzas();
        if (typeof window.renderizarMovimientos === 'function') window.renderizarMovimientos();
        if (typeof window.renderizarFiltrosCajas === 'function') window.renderizarFiltrosCajas();
    }, 200);
};

// ── _geckoSelectTipoMov: toggle Ingreso/Egreso en modalNuevoMovimiento
window._geckoSelectTipoMov = function (tipo) {
    const hidden = document.getElementById('nuevoMovTipo');
    if (hidden) hidden.value = tipo;
    const group = document.querySelector('#modalNuevoMovimiento .gecko-toggle-group');
    if (!group) return;
    group.querySelectorAll('.gecko-toggle-btn').forEach(function (btn) {
        const btnTipo = btn.dataset.tipo;
        btn.classList.remove('active');
        btn.style.background = '';
        btn.style.borderColor = '';
        btn.style.color = '';
        if (btnTipo === tipo) {
            btn.classList.add('active');
            if (tipo === 'ingreso') { btn.style.background = '#16a34a'; btn.style.borderColor = '#22c55e'; }
            else { btn.style.background = '#dc2626'; btn.style.borderColor = '#ef4444'; }
            btn.style.color = '#fff';
        }
    });
};

// ── guardarNuevoMovimiento: registra movimiento desde modalNuevoMovimiento (IDs nuevos)
window.guardarNuevoMovimiento = function () {
    try {
        const tipo = document.getElementById('nuevoMovTipo')?.value || 'ingreso';
        const desc = document.getElementById('nuevoMovDesc')?.value?.trim();
        const monto = parseFloat(document.getElementById('nuevoMovMonto')?.value) || 0;
        const caja = document.getElementById('nuevoMovCaja')?.value;
        if (!desc || monto <= 0) { alert('Completá descripción y monto.'); return; }
        if (!caja) { alert('Seleccioná una caja.'); return; }
        const tipoCapital = tipo.charAt(0).toUpperCase() + tipo.slice(1);
        if (typeof registrarMovimiento === 'function') {
            registrarMovimiento(desc, caja, monto, tipoCapital, 'Varios');
        } else {
            const _ls = window._localStorage_original || localStorage;
            const cajas = window.LISTA_CAJAS || JSON.parse(_ls.getItem('gecko_cajas') || '[]');
            const cajObj = cajas.find(function (c) { return c.nombre === caja; });
            if (cajObj) { tipoCapital === 'Ingreso' ? (cajObj.saldo += monto) : (cajObj.saldo -= monto); }
            _ls.setItem('gecko_cajas', JSON.stringify(cajas));
            window.LISTA_CAJAS = cajas;
            const mov = { id: 'mov_' + Date.now(), fecha: new Date().toLocaleDateString('es-AR'), detalle: desc, caja, tipo: tipoCapital, monto, categoria: 'Varios' };
            const movs = window.LISTA_MOVIMIENTOS || JSON.parse(_ls.getItem('gecko_movimientos') || '[]');
            movs.push(mov);
            _ls.setItem('gecko_movimientos', JSON.stringify(movs));
            window.LISTA_MOVIMIENTOS = movs;
        }
        document.getElementById('modalNuevoMovimiento').style.display = 'none';
        ['nuevoMovDesc', 'nuevoMovMonto'].forEach(function (id) { const el = document.getElementById(id); if (el) el.value = ''; });
        if (typeof window.mostrarExito === 'function') window.mostrarExito(`${tipoCapital} de $${monto.toLocaleString('es-AR')} registrado.`, '¡Hecho!');
        if (typeof window.renderizarFinanzas === 'function') setTimeout(window.renderizarFinanzas, 150);
        if (typeof window.renderizarMovimientos === 'function') setTimeout(window.renderizarMovimientos, 150);
    } catch (e) { console.error('Error registrando movimiento:', e); }
};

// ── ejecutarTransferencia: override — lee IDs nuevos del modal rediseñado
window.ejecutarTransferencia = function () {
    const origen = document.getElementById('transferenciaOrigen')?.value;
    const destino = document.getElementById('transferenciaDestino')?.value;
    const monto = parseFloat(document.getElementById('transferenciaMonto')?.value) || 0;
    if (!origen || !destino) { alert('Seleccioná cajas de origen y destino.'); return; }
    if (origen === destino) { alert('Las cajas deben ser distintas.'); return; }
    if (monto <= 0) { alert('Monto inválido.'); return; }
    const _ls = window._localStorage_original || localStorage;
    const cajas = window.LISTA_CAJAS || JSON.parse(_ls.getItem('gecko_cajas') || '[]');
    const cajO = cajas.find(function (c) { return c.nombre === origen; });
    const cajD = cajas.find(function (c) { return c.nombre === destino; });
    if (!cajO || !cajD) { alert('Caja no encontrada.'); return; }
    cajO.saldo -= monto;
    cajD.saldo += monto;
    _ls.setItem('gecko_cajas', JSON.stringify(cajas));
    window.LISTA_CAJAS = cajas;
    const ts = Date.now();
    const movs = window.LISTA_MOVIMIENTOS || JSON.parse(_ls.getItem('gecko_movimientos') || '[]');
    movs.push({ id: 'mov_' + ts, fecha: new Date().toLocaleDateString('es-AR'), detalle: `Transferencia a ${destino}`, caja: origen, tipo: 'Egreso', monto, categoria: 'Transferencia' });
    movs.push({ id: 'mov_' + (ts + 1), fecha: new Date().toLocaleDateString('es-AR'), detalle: `Transferencia desde ${origen}`, caja: destino, tipo: 'Ingreso', monto, categoria: 'Transferencia' });
    _ls.setItem('gecko_movimientos', JSON.stringify(movs));
    window.LISTA_MOVIMIENTOS = movs;
    document.getElementById('modalTransferencia').style.display = 'none';
    const mEl = document.getElementById('transferenciaMonto'); if (mEl) mEl.value = '';
    if (typeof window.mostrarExito === 'function') window.mostrarExito(`Transferencia de $${monto.toLocaleString('es-AR')} realizada.`, '¡Listo!');
    if (typeof window.renderizarFinanzas === 'function') setTimeout(window.renderizarFinanzas, 150);
    if (typeof window.renderizarMovimientos === 'function') setTimeout(window.renderizarMovimientos, 150);
};

// ── updateCajaSelectors: override — también puebla selects de nuevos modales
(function () {
    const _orig = window.updateCajaSelectors;
    window.updateCajaSelectors = function () {
        if (typeof _orig === 'function') _orig();
        const cajas = window.LISTA_CAJAS || JSON.parse(localStorage.getItem('gecko_cajas') || '[]');
        const opts = cajas.length
            ? cajas.map(function (c) { return '<option value="' + c.nombre + '">' + c.nombre + '</option>'; }).join('')
            : '<option value="">Sin cajas disponibles</option>';
        ['nuevoMovCaja', 'transferenciaOrigen', 'transferenciaDestino'].forEach(function (id) {
            const el = document.getElementById(id);
            if (el) el.innerHTML = opts;
        });
    };
})();


console.log('🦎 GECKO-FIXES v2.0 cargado — preview, desplegable OT, seña multi-caja, botones presupuestos.');

// ── BÚNKER DE PRODUCCIÓN: sobrescritura tardía de funciones de clientes ──
window.addEventListener('load', function () {
    setTimeout(function () {

        // Funciones maestras de clientes movidas al scope global.

        // Forzar la tabla nueva al cargar
        window.renderClientes();

    }, 500);
});

// ── GECKO FIXES: FUNCIONES MAESTRAS DE CLIENTES ──
window._geckoBadgeFijo = function (clienteNombre) {
    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();
    const listaP = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');

    const totalMes = listaP.filter(p => {
        if (p.cliente !== clienteNombre || p.status !== 'OT' || !p.fecha) return false;
        const parts = p.fecha.split('/');
        if (parts.length < 3) return false;
        return (parseInt(parts[1]) - 1) === mesActual && parseInt(parts[2]) === anioActual;
    }).reduce((acc, p) => acc + (parseFloat(p.total) || 0), 0);

    const setG = JSON.parse(localStorage.getItem('GECKO_SETTINGS') || '{}');
    const sNivelOro = setG.nivelOro || 250000;
    const sNivelPlata = setG.nivelPlata || 100000;

    if (totalMes >= sNivelOro) return `<span class="px-2 py-0.5 rounded-md bg-[#FFD700]/20 text-[#B8860B] border border-[#FFD700]/50 text-[9px] font-black uppercase tracking-widest ml-2" title="Facturación: $${totalMes.toLocaleString('es-AR')}">ORO</span>`;
    if (totalMes >= sNivelPlata) return `<span class="px-2 py-0.5 rounded-md bg-[#C0C0C0]/20 text-[#808080] border border-[#C0C0C0]/50 text-[9px] font-black uppercase tracking-widest ml-2" title="Facturación: $${totalMes.toLocaleString('es-AR')}">PLATA</span>`;
    return `<span class="px-2 py-0.5 rounded-md bg-[#CD7F32]/10 text-[#A0522D] border border-[#CD7F32]/30 text-[9px] font-black uppercase tracking-widest ml-2" title="Facturación: $${totalMes.toLocaleString('es-AR')}">BRONCE</span>`;
};

window._geckoRenderFijo = function () {
    const tbody = document.getElementById('listaClientesMaster');
    if (!tbody) return;

    let bdClientes = JSON.parse(localStorage.getItem('clientes')) || [];
    if (bdClientes.length === 0) bdClientes = JSON.parse(localStorage.getItem('gecko_clientes')) || [];

    window.LISTA_CLIENTES = bdClientes;
    const termino = (
        document.getElementById('filtroClienteBusqueda')?.value ||
        document.getElementById('buscadorClientes')?.value || ''
    ).toLowerCase().trim();
    tbody.innerHTML = '';

    if (bdClientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-gray-500">No hay clientes.</td></tr>';
        return;
    }

    bdClientes.forEach(c => {
        try {
            if (termino) {
                const matchNombre = c.nombre.toLowerCase().includes(termino);
                const matchCuit = (c.cuit || '').toLowerCase().includes(termino);
                const matchCuits = (c.cuits || []).some(cu =>
                    (typeof cu === 'string' ? cu : cu.numero || '').includes(termino) ||
                    (typeof cu === 'object' ? (cu.etiqueta || '').toLowerCase().includes(termino) : false)
                );
                const matchRubro = (c.rubro || '').toLowerCase().includes(termino);
                const matchTel = (c.telefonos || []).some(t => (t.numero || '').includes(termino) || (t.etiqueta || '').toLowerCase().includes(termino));
                if (!matchNombre && !matchCuit && !matchCuits && !matchRubro && !matchTel) return;
            }

            const pbd = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
            let saldo = pbd.filter(p => p.cliente === c.nombre && p.status === 'OT').reduce((acc, o) => acc + ((parseFloat(o.total) || 0) - (parseFloat(o.adelanto) || 0)), 0);

            // Normalizar telefonos: puede ser string JSON legacy, array de strings, o array de {numero, etiqueta}
            let telefonosArr = [];
            if (Array.isArray(c.telefonos)) {
                telefonosArr = c.telefonos;
            } else if (typeof c.telefonos === 'string' && c.telefonos.startsWith('[')) {
                try { telefonosArr = JSON.parse(c.telefonos); } catch (e) { telefonosArr = []; }
            }
            let wp = telefonosArr.length > 0
                ? telefonosArr.map(t => {
                    const num = typeof t === 'string' ? t : (t.numero || '');
                    const etq = typeof t === 'string' ? '' : (t.etiqueta || '');
                    if (!num) return '';
                    return `<a href="https://wa.me/${num.replace(/\D/g, '')}" target="_blank" class="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-colors text-[10px] font-bold" title="WhatsApp ${etq || num}" onclick="event.stopPropagation()"><svg class="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 21.657l-3.324.87 1.011-3.213C8.163 17.65 7.159 15.65 7.159 13.5c0-4.142 3.866-7.5 8.636-7.5 4.771 0 8.636 3.358 8.636 7.5 0 4.143-3.865 7.5-8.636 7.5-1.523 0-2.95-.342-4.178-.936l-3.586 1.593z"/></svg>${etq || num}</a>`;
                }).join('')
                : c.tel ? `<a href="https://wa.me/${c.tel.replace(/\D/g, '')}" target="_blank" class="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 hover:bg-green-500 hover:text-white transition-colors" title="WhatsApp" onclick="event.stopPropagation()"><svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 21.657l-3.324.87 1.011-3.213C8.163 17.65 7.159 15.65 7.159 13.5c0-4.142 3.866-7.5 8.636-7.5 4.771 0 8.636 3.358 8.636 7.5 0 4.143-3.865 7.5-8.636 7.5-1.523 0-2.95-.342-4.178-.936l-3.586 1.593z"/></svg></a>` : '';
            let em = (c.emails && c.emails[0]) || c.email ? `<a href="mailto:${(c.emails && c.emails[0]) || c.email}" class="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 hover:bg-blue-500 hover:text-white transition-colors" title="Email" onclick="event.stopPropagation()"><svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg></a>` : '';

            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/20 transition-colors cursor-pointer';

            tr.innerHTML = `
            <td class="py-4 px-6" data-accion="ficha">
                <div class="flex items-center">
                    <p class="font-extrabold dark:text-white tracking-tight text-[14px]">${c.nombre}</p>
                    ${window._geckoBadgeFijo(c.nombre)}
                </div>
                ${c.rubro ? `<p class="text-zinc-600 text-[10px] font-bold uppercase tracking-wider mt-0.5">${c.rubro}</p>` : ''}
            </td>
            <td class="py-4 px-6" data-accion="ficha"><div class="flex flex-wrap items-center gap-1">${wp}${em}</div></td>
            <td class="py-4 px-6" data-accion="ficha"><span class="font-black ${saldo > 0 ? 'text-red-500' : 'text-gecko'}">$${Math.round(saldo).toLocaleString('es-AR')}</span></td>
            <td class="py-4 px-6 text-right" data-accion="ficha">
                <button class="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-darkBg text-gray-700 dark:text-gray-300 font-bold hover:bg-gecko hover:text-white transition-all text-[11px] uppercase tracking-widest inline-flex items-center gap-2" data-accion="ficha">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>Ficha / CC
                </button>
            </td>
            <td class="py-4 px-6 text-center">
                <div class="flex items-center justify-center gap-2">
                    <button data-accion="editar" style="width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);color:#a1a1aa;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)';this.style.color='#fff'" onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.color='#a1a1aa'" title="Editar"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                    <button data-accion="eliminar" style="width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);color:#a1a1aa;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.15)';this.style.borderColor='rgba(239,68,68,0.3)';this.style.color='#ef4444'" onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.05)';this.style.color='#a1a1aa'" title="Eliminar"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
                </div>
            </td>`;

            // Delegación de eventos — un solo listener en el tr que distingue la acción
            tr.addEventListener('click', function (e) {
                const accion = e.target.closest('[data-accion]')?.dataset?.accion;
                if (accion === 'editar') {
                    if (typeof window.editarCliente === 'function') window.editarCliente(c.nombre);
                } else if (accion === 'eliminar') {
                    if (typeof window.eliminarCliente === 'function') window.eliminarCliente(c.nombre);
                } else if (accion === 'ficha' || !accion) {
                    if (typeof abrirFichaCliente === 'function') abrirFichaCliente(c.nombre);
                }
            });

            tbody.appendChild(tr);
        } catch (e) { console.warn('GECKO: error renderizando cliente', c.nombre, e); }
    });
};

// 🔥 GUARDIÁN: Sobrescribe constantemente para evitar que main.js recupere el control
setInterval(() => {
    if (window.renderClientes !== window._geckoRenderFijo) {
        window.renderClientes = window._geckoRenderFijo;
        window.obtenerBadgeScoring = window._geckoBadgeFijo;
    }

    let bdClientes = JSON.parse(localStorage.getItem('clientes')) || [];
    if (bdClientes.length > 0 && document.getElementById('listaClientesMaster')?.innerHTML === '') {
        window._geckoRenderFijo();
    }
}, 500);

window.guardarCliente = function () {
    const nombre = document.getElementById('nuevoClienteNombre')?.value.trim();
    if (!nombre) { alert("El Nombre / Razón Social es obligatorio"); return; }

    const cuits = Array.from(document.querySelectorAll('.cuit-input')).map(i => {
        const num = i.value.trim();
        const etq = i.parentElement?.querySelector('.cuit-label-input')?.value?.trim() || '';
        return num ? { numero: num, etiqueta: etq } : null;
    }).filter(v => v);
    const emails = Array.from(document.querySelectorAll('.email-input')).map(i => i.value.trim()).filter(v => v);

    const nuevoCliente = {
        id: 'client_' + Date.now(),
        nombre: nombre,
        cuits: cuits,
        cuit: cuits[0] || '',
        tel: document.getElementById('nuevoClienteTel')?.value || '',
        emails: emails,
        email: emails[0] || '',
        dir: document.getElementById('nuevoClienteDir')?.value || '',
        loc: document.getElementById('nuevoClienteLoc')?.value || '',
        rubro: document.getElementById('nuevoClienteRubro')?.value || '',
    };

    let bdClientes = JSON.parse(localStorage.getItem('clientes')) || [];
    const index = bdClientes.findIndex(c => c.nombre.toLowerCase() === nombre.toLowerCase());
    if (index !== -1) bdClientes[index] = nuevoCliente;
    else bdClientes.push(nuevoCliente);

    localStorage.setItem('clientes', JSON.stringify(bdClientes));
    localStorage.setItem('gecko_clientes', JSON.stringify(bdClientes));
    window.LISTA_CLIENTES = bdClientes;

    // Preparar Payload para MySQL (Stringificando Arrays)
    const payloadBD = {
        ...nuevoCliente,
        cuits: JSON.stringify(cuits),
        emails: JSON.stringify(emails)
    };

    fetch('api.php?endpoint=clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadBD)
    }).catch(e => console.log('Fetch silencioso.'));

    const modal = document.getElementById('modalNuevoCliente');
    if (modal) modal.style.display = 'none';

    if (typeof window.mostrarExito === 'function') window.mostrarExito("El cliente " + nombre + " ha sido registrado.", "¡Cliente Guardado!");
    window._geckoRenderFijo();
};



// ══════════════════════════════════════════════════════════════════════
// PRESUPUESTADOR MANUAL — SECCIÓN v2.0
// Se renderiza dentro de #presupuestoManualContainer (viewPresupuestoManual)
// Estilo 100% consistente con el sistema Gecko
// ══════════════════════════════════════════════════════════════════════

window.abrirPresupuestadorManual = function (presupuestoEditId = null) {
    const container = document.getElementById('presupuestoManualContainer');
    if (!container) return;

    // Datos a editar si viene de "Editar"
    let datosEdicion = null;
    if (presupuestoEditId) {
        const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
        const _todosEdit = lista.filter(x => String(x.id) === String(presupuestoEditId));
        datosEdicion = _todosEdit[_todosEdit.length - 1];
        window._editandoPresupuestoId = presupuestoEditId;
    } else {
        window._editandoPresupuestoId = null;
        // NO resetear _gpmItemsDesdeCotzador aquí, se consume después de renderizar
    }

    const clienteInicial = datosEdicion?.cliente || '';
    const tituloInicial = datosEdicion?.titulo || '';
    const areaInicial = datosEdicion?.categoria || 'Gráfica';
    const notasInternas = datosEdicion?.notasInternas || '';
    const condiciones = datosEdicion?.condiciones || '';
    const itemsIniciales = datosEdicion?.items || [];

    // Opciones del select de área
    const areas = ['Gráfica', 'Industrial'];
    const areaOpts = areas.map(a =>
        `<option value="${a}" ${areaInicial === a ? 'selected' : ''}>${a}</option>`
    ).join('');

    if (presupuestoEditId) {
        const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
        const doc = lista.filter(x => String(x.id) === String(presupuestoEditId));
        const docActual = doc[doc.length - 1];
        window._gpmImagenes = (docActual?.imagenes || []).filter(img => typeof img === 'string' && img.startsWith('data:'));
    } else {
        window._gpmImagenes = [];
    }
    container.innerHTML = `
    <div style="max-width:100%;">

      <!-- DATOS GENERALES -->
      <div style="background:#1e1f20;border:1px solid #333333;border-radius:20px;padding:24px;margin-bottom:16px;">
        <p style="color:#F15A24;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin:0 0 20px;">Datos generales</p>
        <div style="display:grid;grid-template-columns:1fr 180px;gap:14px;margin-bottom:14px;">
          <div>
            <label style="display:block;color:#71717a;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Cliente</label>
            <input id="gpmCliente" type="text" list="gpm-clientes-list"
              placeholder="Nombre del cliente..." value="${clienteInicial}"
              autocomplete="off"
              style="width:100%;background:#131314;border:1px solid #333333;border-radius:12px;padding:12px 16px;color:white;font-size:14px;font-weight:700;outline:none;box-sizing:border-box;"
              onfocus="this.style.borderColor='#F15A24'" onblur="this.style.borderColor='#333333'" />
            <datalist id="gpm-clientes-list">
              ${(JSON.parse(localStorage.getItem('clientes') || '[]')).map(c => `<option value="${c.nombre || c.name || ''}"></option>`).join('')}
            </datalist>
          </div>
          <div>
            <label style="display:block;color:#71717a;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Fecha</label>
            <input id="gpmFecha" type="date"
              value="${new Date().toISOString().split('T')[0]}"
              style="width:100%;background:#131314;border:1px solid #333333;border-radius:12px;padding:12px 16px;color:#71717a;font-size:14px;font-weight:600;outline:none;box-sizing:border-box;color-scheme:dark;"
              onfocus="this.style.borderColor='#F15A24'"
              onblur="this.style.borderColor='#333333'" />
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div>
            <label style="display:block;color:#71717a;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Título del presupuesto</label>
            <input id="gpmTitulo" type="text"
              placeholder="Ej: Cartelería evento corporativo Mayo"
              value="${tituloInicial}"
              style="width:100%;background:#131314;border:1px solid #333333;border-radius:12px;padding:12px 16px;color:white;font-size:14px;font-weight:600;outline:none;box-sizing:border-box;"
              onfocus="this.style.borderColor='#F15A24'" onblur="this.style.borderColor='#333333'" />
          </div>
          <div>
            <label style="display:block;color:#71717a;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Área / categoría</label>
            <select id="gpmCategoria" class="gecko-select-pro" style="font-weight:700;color:white;-webkit-text-fill-color:white;background-color:#18181b80 !important;">
              ${areaOpts}
            </select>
          </div>
        </div>
        <div style="margin-top:14px;">
          <label style="display:block;color:#71717a;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Fecha de entrega</label>
          <input id="gpmEntrega" type="date"
            value="${datosEdicion?.fechaEntrega || ''}"
            style="width:100%;background:#131314;border:1px solid #333333;border-radius:12px;padding:12px 16px;color:#71717a;font-size:14px;font-weight:600;outline:none;box-sizing:border-box;color-scheme:dark;"
            onfocus="this.style.borderColor='#F15A24'"
            onblur="this.style.borderColor='#333333'" />
        </div>
      </div>

      <!-- ÍTEMS -->
      <div style="background:#1e1f20;border:1px solid #333333;border-radius:20px;padding:24px;margin-bottom:16px;">
        <p style="color:#F15A24;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin:0 0 20px;">Ítems del presupuesto</p>

        <!-- Cabecera columnas -->
        <div style="display:grid;grid-template-columns:28px minmax(0,1fr) 72px 130px 100px 36px;gap:0;padding:0 0 10px;margin-bottom:10px;border-bottom:1px solid #333333;">
          <span></span>
          <span style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#3f3f46;padding-left:12px;">Trabajo / descripción</span>
          <span style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#3f3f46;text-align:center;">Cant.</span>
          <span style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#3f3f46;text-align:right;padding-right:8px;">Precio unit.</span>
          <span style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:#3f3f46;text-align:right;">Subtotal</span>
          <span></span>
        </div>

        <div id="gpm-items-list"></div>

        <button onclick="window._gpmAgregarItem()"
          style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px;margin-top:8px;background:transparent;border:1px dashed #333333;border-radius:12px;color:#52525b;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;cursor:pointer;"
          onmouseover="this.style.color='#F15A24';this.style.borderColor='#F15A24'"
          onmouseout="this.style.color='#52525b';this.style.borderColor='#333333'">
          + Agregar ítem
        </button>

        <!-- TOTALES -->
        <div style="margin-top:20px;padding-top:20px;border-top:1px solid #333333;">

          <!-- Toggle Descuento -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #333333;margin-bottom:8px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <label style="position:relative;width:36px;height:20px;flex-shrink:0;cursor:pointer;">
                <input type="checkbox" id="gpmTogDesc" onchange="window._gpmCalc()" style="opacity:0;width:0;height:0;position:absolute;">
                <span id="gpmTogDescSlider" style="position:absolute;inset:0;background:#27272a;border-radius:20px;transition:background .2s;"></span>
                <span id="gpmTogDescThumb" style="position:absolute;width:14px;height:14px;left:3px;top:3px;background:#52525b;border-radius:50%;transition:transform .2s;"></span>
              </label>
              <span style="color:#71717a;font-size:12px;font-weight:700;">Aplicar descuento</span>
            </div>
            <div id="gpmDescPanel" style="display:none;align-items:center;gap:8px;">
              <input type="number" id="gpmDescVal" value="10" min="0"
                oninput="window._gpmCalc()"
                style="width:65px;text-align:center;background:#131314;border:1px solid #333333;border-radius:10px;padding:8px;color:#F15A24;font-size:13px;font-weight:900;outline:none;"
                onfocus="this.style.borderColor='#F15A24'" onblur="this.style.borderColor='#333333'" />
              <select id="gpmDescTipo" onchange="window._gpmCalc()"
                class="gecko-select-pro"
                style="width:72px!important;padding:8px 10px!important;font-weight:700;color:white;-webkit-text-fill-color:white;">
                <option value="pct">%</option>
                <option value="fixed">$</option>
              </select>
              <span id="gpmDescLabel" style="font-size:12px;color:#52525b;min-width:80px;"></span>
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;">
            <span style="color:#71717a;font-weight:700;">Subtotal</span>
            <span id="gpmSubtotal" style="color:#a1a1aa;font-weight:700;">$0</span>
          </div>
          <div id="gpmRowDesc" style="display:none;justify-content:space-between;padding:6px 0;font-size:13px;">
            <span style="color:#ef4444;font-weight:700;">Descuento</span>
            <span id="gpmDescMonto" style="color:#ef4444;font-weight:700;"></span>
          </div>

          <!-- Toggle IVA -->
          <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid #333333;margin-top:6px;">
            <label style="position:relative;width:36px;height:20px;flex-shrink:0;cursor:pointer;">
              <input type="checkbox" id="gpmTogIva" onchange="window._gpmCalc()" style="opacity:0;width:0;height:0;position:absolute;">
              <span id="gpmTogIvaSlider" style="position:absolute;inset:0;background:#27272a;border-radius:20px;transition:background .2s;"></span>
              <span id="gpmTogIvaThumb" style="position:absolute;width:14px;height:14px;left:3px;top:3px;background:#52525b;border-radius:50%;transition:transform .2s;"></span>
            </label>
            <span style="color:#71717a;font-size:12px;font-weight:700;">Incluir IVA (21%)</span>
          </div>
          <div id="gpmRowIva" style="display:none;justify-content:space-between;padding:6px 0;font-size:13px;">
            <span style="color:#71717a;font-weight:700;">IVA 21%</span>
            <span id="gpmIvaMonto" style="color:#a1a1aa;font-weight:700;"></span>
          </div>

          <!-- Total final -->
          <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 0 0;margin-top:8px;border-top:1px solid #333333;">
            <span style="color:white;font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">Total</span>
            <span id="gpmTotal" style="color:#F15A24;font-size:28px;font-weight:900;">$0</span>
          </div>
        </div>
      </div>

      <!-- NOTAS Y CONDICIONES -->
      <div style="background:#1e1f20;border:1px solid #333333;border-radius:20px;padding:24px;margin-bottom:16px;">
        <p style="color:#F15A24;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin:0 0 20px;">Notas y condiciones</p>
        <div style="display:flex;align-items:center;justify-content:space-between;background:#131314;border:1px solid #333333;border-radius:12px;padding:12px 16px;margin-bottom:14px;">
          <div>
            <p style="color:#f1f5f9;font-size:13px;font-weight:700;margin:0;">Mostrar precios individuales</p>
            <p style="color:#52525b;font-size:10px;margin-top:2px;">Desactivá para mostrar solo el total al cliente</p>
          </div>
          <label style="position:relative;width:36px;height:20px;flex-shrink:0;cursor:pointer;">
            <input type="checkbox" id="gpmMostrarPrecios" checked
              onchange="window._gpmSyncToggle('gpmMostrarPrecios','gpmMostrarPreciosSlider','gpmMostrarPreciosThumb')"
              style="opacity:0;width:0;height:0;position:absolute;">
            <span id="gpmMostrarPreciosSlider" style="position:absolute;inset:0;background:#F15A24;border-radius:20px;transition:background .2s;"></span>
            <span id="gpmMostrarPreciosThumb" style="position:absolute;width:14px;height:14px;left:3px;top:3px;background:white;border-radius:50%;transition:transform .2s;transform:translateX(16px);"></span>
          </label>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div>
            <label style="display:block;color:#71717a;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Notas internas (no se imprimen)</label>
            <textarea id="gpmNotasInternas" rows="3"
              placeholder="Ej: Cliente pidió entrega urgente para el viernes..."
              style="width:100%;background:#18181b80 !important;border:1px solid #333333 !important;border-radius:12px !important;padding:12px 16px !important;color:#a1a1aa;font-size:14px;font-weight:500;outline:none;box-sizing:border-box;resize:none;font-family:inherit;min-height:80px;"
              onfocus="this.style.setProperty('border-color','#F15A24','important')" onblur="this.style.setProperty('border-color','#333333','important')">${notasInternas}</textarea>
          </div>
          <div>
            <label style="display:block;color:#71717a;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Condiciones para el cliente</label>
            <textarea id="gpmCondiciones" rows="3"
              placeholder="Ej: Validez 7 días. Seña 50% para iniciar trabajo..."
              style="width:100%;background:#18181b80 !important;border:1px solid #333333 !important;border-radius:12px !important;padding:12px 16px !important;color:#a1a1aa;font-size:14px;font-weight:500;outline:none;box-sizing:border-box;resize:none;font-family:inherit;min-height:80px;"
              onfocus="this.style.setProperty('border-color','#F15A24','important')" onblur="this.style.setProperty('border-color','#333333','important')">${condiciones}</textarea>
          </div>
        </div>
      </div>

      <div style="background:#1e1f20;border:1px solid #333333;border-radius:20px;padding:24px;margin-bottom:16px;">
        <p style="color:#F15A24;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin:0 0 20px;">Imágenes de referencia <span style="color:#52525b;font-weight:700;">(máx. 5)</span></p>
        <div id="gpmImagenesPreview" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;"></div>
        <label for="gpmImagenesInput"
          style="display:flex;align-items:center;gap:10px;background:#131314;border:1px dashed #333333;border-radius:12px;padding:12px 16px;cursor:pointer;color:#52525b;font-size:12px;font-weight:600;"
          onmouseover="this.style.borderColor='#F15A24';this.style.color='#F15A24'"
          onmouseout="this.style.borderColor='#333333';this.style.color='#52525b'">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
          <span>Adjuntar imágenes (JPG, PNG, etc.)</span>
        </label>
        <input type="file" id="gpmImagenesInput" accept="image/*" multiple style="display:none;"
          onchange="window._gpmAgregarImagenes(this)">
      </div>

      <!-- Footer acciones -->
      <div style="display:flex;justify-content:flex-end;align-items:center;padding:20px 0;gap:10px;">
        ${datosEdicion ? `
          <button onclick="window._gpmGuardar('${datosEdicion.status || 'Cotizado'}')"
            style="padding:12px 28px;background:#F15A24;border:none;border-radius:12px;color:white;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;cursor:pointer;">
            ${datosEdicion.status === 'OT' ? 'Actualizar OT' : 'Actualizar Presupuesto'}
          </button>
        ` : `
          <button onclick="window._gpmGuardar('Cotizado')"
            style="padding:12px 20px;background:transparent;border:1px solid #333333;border-radius:12px;color:#a1a1aa;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;cursor:pointer;">
            Generar Presupuesto
          </button>
          <button onclick="window._gpmGuardar('OT')"
            style="padding:12px 20px;background:#F15A24;border:none;border-radius:12px;color:white;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;cursor:pointer;">
            Generar OT
          </button>
        `}
      </div>

    </div>`;

    // Inicializar toggles con JS (sin CSS externo)
    window._gpmInitToggles();

    // Cargar ítems
    if (itemsIniciales.length > 0) {
        itemsIniciales.forEach(it => window._gpmAgregarItem({
            titulo: it.nombre || it.textoOpciones || '',
            descripcion: it.descripcion || (it.otDetalle !== it.nombre ? it.otDetalle : '') || '',
            cantidad: it.cantidad || 1,
            precio: it.precioUnitario || it.costo || 0
        }));
        if (datosEdicion?.conIva) {
            document.getElementById('gpmTogIva').checked = true;
            window._gpmSyncToggle('gpmTogIva', 'gpmTogIvaSlider', 'gpmTogIvaThumb');
        }
        if (datosEdicion?.descuento > 0) {
            document.getElementById('gpmTogDesc').checked = true;
            window._gpmSyncToggle('gpmTogDesc', 'gpmTogDescSlider', 'gpmTogDescThumb');
            document.getElementById('gpmDescVal').value = datosEdicion.descuento;
            document.getElementById('gpmDescTipo').value = datosEdicion.tipoDescuento || 'pct';
            document.getElementById('gpmDescPanel').style.display = 'flex';
            document.getElementById('gpmRowDesc').style.display = 'flex';
        }
    } else if (window._gpmItemsDesdeCotzador && window._gpmItemsDesdeCotzador.length > 0) {
        // Vienen ítems precargados desde los cotizadores
        window._gpmItemsDesdeCotzador.forEach(it => window._gpmAgregarItem(it));
        window._gpmItemsDesdeCotzador = null;
        // Precargar cliente si viene del cotizador
        if (window._gpmClienteDesdeCotzador) {
            const clienteEl = document.getElementById('gpmCliente');
            if (clienteEl) clienteEl.value = window._gpmClienteDesdeCotzador;
            window._gpmClienteDesdeCotzador = null;
        }
    } else {
        window._gpmAgregarItem();
    }

    window._gpmCalc();

    // Mostrar previews de imágenes si hay imágenes cargadas (modo edición)
    if (window._gpmImagenes.length > 0) {
        const preview = document.getElementById('gpmImagenesPreview');
        if (preview) {
            window._gpmImagenes.forEach(b64 => {
                const wrap = document.createElement('div');
                wrap.style.cssText = 'position:relative;';
                const img = document.createElement('img');
                img.src = b64;
                img.style.cssText = 'height:72px;width:auto;border-radius:10px;border:1px solid #333333;object-fit:cover;';
                const del = document.createElement('button');
                del.innerHTML = '✕';
                del.style.cssText = 'position:absolute;top:-5px;right:-5px;background:#ef4444;border:none;color:white;width:18px;height:18px;border-radius:50%;cursor:pointer;font-size:9px;padding:0;font-weight:900;';
                del.onclick = () => {
                    const idx = window._gpmImagenes.indexOf(b64);
                    if (idx > -1) window._gpmImagenes.splice(idx, 1);
                    wrap.remove();
                };
                wrap.appendChild(img);
                wrap.appendChild(del);
                preview.appendChild(wrap);
            });
        }
    }
};

// ── Sincronizar estilos del toggle visualmente ──
window._gpmSyncToggle = function (inputId, sliderId, thumbId) {
    const checked = document.getElementById(inputId)?.checked;
    const slider = document.getElementById(sliderId);
    const thumb = document.getElementById(thumbId);
    if (!slider || !thumb) return;
    slider.style.background = checked ? '#F15A24' : '#27272a';
    thumb.style.background = checked ? 'white' : '#52525b';
    thumb.style.transform = checked ? 'translateX(16px)' : 'translateX(0)';
};

// ── Inicializar listeners de toggles ──
window._gpmInitToggles = function () {
    ['gpmTogDesc', 'gpmTogIva', 'gpmMostrarPrecios'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const sliderId = id + 'Slider';
        const thumbId = id + 'Thumb';
        el.addEventListener('change', () => window._gpmSyncToggle(id, sliderId, thumbId));
    });
};

// ── Imágenes de referencia ──
window._gpmImagenes = [];
// Función reutilizable para agregar una imagen (File o Blob) al preview
window._gpmAgregarUnaImagen = function (file) {
    if (window._gpmImagenes.length >= 5) return;
    const preview = document.getElementById('gpmImagenesPreview');
    if (!preview) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const b64 = e.target.result;
        window._gpmImagenes.push(b64);
        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:relative;';
        const img = document.createElement('img');
        img.src = b64;
        img.style.cssText = 'height:72px;width:auto;max-width:120px;border-radius:10px;border:1px solid #333333;object-fit:cover;';
        const del = document.createElement('button');
        del.innerHTML = '✕';
        del.style.cssText = 'position:absolute;top:-5px;right:-5px;background:#ef4444;border:none;color:white;width:18px;height:18px;border-radius:50%;cursor:pointer;font-size:9px;padding:0;font-weight:900;';
        del.onclick = () => {
            const idx = window._gpmImagenes.indexOf(b64);
            if (idx > -1) window._gpmImagenes.splice(idx, 1);
            wrap.remove();
        };
        wrap.appendChild(img);
        wrap.appendChild(del);
        preview.appendChild(wrap);
    };
    reader.readAsDataURL(file);
};

window._gpmAgregarImagenes = function (input) {
    const files = Array.from(input.files);
    for (const file of files) {
        if (window._gpmImagenes.length >= 5) break;
        window._gpmAgregarUnaImagen(file);
    }
    input.value = '';
};

// Listener de paste global — activo solo cuando el modal de presupuesto está abierto
document.addEventListener('paste', function (e) {
    // Solo actuar si el contenedor de imágenes está visible en el DOM
    const preview = document.getElementById('gpmImagenesPreview');
    if (!preview) return;
    if (window._gpmImagenes.length >= 5) return;
    const items = Array.from(e.clipboardData?.items || []);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    if (!imageItem) return;
    e.preventDefault();
    const blob = imageItem.getAsFile();
    if (blob) {
        window._gpmAgregarUnaImagen(blob);
        // Flash visual en el área de drop para confirmar el pegado
        const label = preview.nextElementSibling;
        if (label) {
            label.style.borderColor = '#F15A24';
            label.style.color = '#F15A24';
            setTimeout(() => {
                label.style.borderColor = '#333333';
                label.style.color = '#52525b';
            }, 800);
        }
    }
});

// ── Agregar ítem ──
window._gpmAgregarItem = function (datos = null) {
    const lista = document.getElementById('gpm-items-list');
    if (!lista) return;
    const n = lista.querySelectorAll('.gpm-item').length + 1;
    const titulo = (datos?.titulo || '').replace(/"/g, '&quot;');
    const desc = datos?.descripcion || '';
    const cant = datos?.cantidad || 1;
    const precio = datos?.precio || '';

    const div = document.createElement('div');
    div.className = 'gpm-item';
    div.style.cssText = 'background:transparent;border:none;border-bottom:1px solid #333333;border-radius:0;margin-bottom:0;overflow:hidden;';
    div.innerHTML = `
      <div style="display:grid;grid-template-columns:28px minmax(0,1fr) 72px 130px 100px 36px;align-items:stretch;">

        <div style="display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:#F15A24;">${String(n).padStart(2, '0')}</div>

        <div style="padding:12px 10px;display:flex;flex-direction:column;gap:6px;border-left:1px solid #333333;">
          <input class="gpm-item-title" type="text" value="${titulo}" placeholder="Título del trabajo"
            oninput="window._gpmCalc()"
            style="background:transparent;border:none !important;border-bottom:none !important;outline:none;font-size:14px;font-weight:700;color:#e0e0e0;font-family:inherit;padding:2px 0;width:100%;box-sizing:border-box;"
            onfocus="this.closest('.gpm-item').style.borderColor='#333333'"
            placeholder="Título del trabajo" />
          <input type="text" class="gpm-item-desc" value="${desc}"
            placeholder="Descripción detallada (dimensiones, material, acabado...)"
            oninput="window._gpmCalc()"
            style="background:transparent !important;border:none !important;border-bottom:none !important;outline:none !important;font-size:12px !important;font-weight:400 !important;color:#71717a !important;font-family:inherit;padding:2px 0;width:100%;box-sizing:border-box;" />
        </div>

        <div style="display:flex;align-items:center;justify-content:center;padding:10px 8px;border-left:1px solid #333333;">
          <input type="number" class="gpm-qty" value="${cant}" min="1" oninput="window._gpmCalc()"
            style="width:100%;text-align:center;background:#131314 !important;border:1px solid #333333 !important;border-radius:8px !important;font-size:13px;font-weight:700;color:#e0e0e0;font-family:inherit;padding:6px 4px !important;outline:none;box-sizing:border-box;" />
        </div>

        <div style="display:flex;align-items:center;padding:10px 10px;border-left:1px solid #333333;">
          <input type="text" class="gpm-price" value="${precio || ''}" placeholder="0"
            oninput="window._gpmCalc()"
            style="width:100%;text-align:right;background:#131314 !important;border:1px solid #333333 !important;border-radius:8px !important;font-size:13px;font-weight:700;color:#e0e0e0;font-family:inherit;padding:6px 8px !important;outline:none;box-sizing:border-box;" />
        </div>

        <div style="display:flex;align-items:center;justify-content:flex-end;padding:10px 10px;border-left:1px solid #333333;font-size:14px;font-weight:900;color:#ffffff;white-space:nowrap;">
          <span class="gpm-sv">$0</span>
        </div>

        <div style="display:flex;align-items:center;justify-content:center;border-left:1px solid #333333;">
          <button onclick="window._gpmRemoverItem(this)"
            style="background:transparent;border:none;color:#3f3f46;cursor:pointer;padding:8px;border-radius:8px;display:flex;align-items:center;"
            onmouseover="this.style.color='#ef4444';this.style.background='#1f0a0a'"
            onmouseout="this.style.color='#3f3f46';this.style.background='transparent'"
            aria-label="Eliminar ítem">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6m4-6v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>

      </div>`;
    lista.appendChild(div);
    if (!datos) div.querySelector('.gpm-item-title').focus();
    window._gpmCalc();
};

// ── Renumerar ──
window._gpmRenumerar = function () {
    document.querySelectorAll('#gpm-items-list .gpm-item').forEach((c, i) => {
        c.querySelector('div[style*="color:#F15A24"]').textContent = String(i + 1).padStart(2, '0');
    });
};

// ── Remover ítem ──
window._gpmRemoverItem = function (btn) {
    btn.closest('.gpm-item').remove();
    window._gpmRenumerar();
    window._gpmCalc();
};

// ── Calcular totales ──
window._gpmCalc = function () {
    const fmt = n => '$' + Math.round(n).toLocaleString('es-AR');
    const pn = s => parseFloat(String(s).replace(/[^0-9.]/g, '')) || 0;

    let sub = 0;
    document.querySelectorAll('#gpm-items-list .gpm-item').forEach(item => {
        const qty = pn(item.querySelector('.gpm-qty')?.value);
        const price = pn(item.querySelector('.gpm-price')?.value);
        const st = qty * price;
        const sv = item.querySelector('.gpm-sv');
        if (sv) sv.textContent = fmt(st);
        sub += st;
    });

    // Descuento
    const descOn = document.getElementById('gpmTogDesc')?.checked;
    if (document.getElementById('gpmDescPanel')) document.getElementById('gpmDescPanel').style.display = descOn ? 'flex' : 'none';
    if (document.getElementById('gpmRowDesc')) document.getElementById('gpmRowDesc').style.display = descOn ? 'flex' : 'none';
    let descAmt = 0;
    if (descOn) {
        const dv = pn(document.getElementById('gpmDescVal')?.value);
        const dtype = document.getElementById('gpmDescTipo')?.value;
        descAmt = dtype === 'pct' ? sub * (dv / 100) : dv;
        const el = document.getElementById('gpmDescMonto');
        if (el) el.textContent = '-' + fmt(descAmt);
        const lbl = document.getElementById('gpmDescLabel');
        if (lbl) lbl.textContent = '= -' + fmt(descAmt);
    }

    const afterDisc = sub - descAmt;

    // IVA
    const ivaOn = document.getElementById('gpmTogIva')?.checked;
    if (document.getElementById('gpmRowIva')) document.getElementById('gpmRowIva').style.display = ivaOn ? 'flex' : 'none';
    const ivaAmt = ivaOn ? afterDisc * 0.21 : 0;
    const elIva = document.getElementById('gpmIvaMonto');
    if (elIva) elIva.textContent = fmt(ivaAmt);

    const elSub = document.getElementById('gpmSubtotal');
    if (elSub) elSub.textContent = fmt(sub);
    const elTotal = document.getElementById('gpmTotal');
    if (elTotal) elTotal.textContent = fmt(afterDisc + ivaAmt);
};

// ── Cerrar / Cancelar ──
window._gpmCerrar = function () {
    window._editandoPresupuestoId = null;
    if (typeof window.switchMenu === 'function') window.switchMenu('pedidos');
};

// ── Guardar ──
window._gpmGuardar = function (status) {
    const cliente = document.getElementById('gpmCliente')?.value?.trim();
    if (!cliente) { alert('Ingresá el nombre del cliente.'); document.getElementById('gpmCliente')?.focus(); return; }

    const items = [];
    document.querySelectorAll('#gpm-items-list .gpm-item').forEach(item => {
        const titulo = item.querySelector('.gpm-item-title')?.value?.trim();
        const desc = item.querySelector('.gpm-item-desc')?.value?.trim();
        const qty = parseFloat(item.querySelector('.gpm-qty')?.value) || 1;
        const precio = parseFloat(String(item.querySelector('.gpm-price')?.value || '').replace(/[^0-9.]/g, '')) || 0;
        if (titulo && precio > 0) {
            items.push({
                tipo: 'manual',
                nombre: titulo,
                textoOpciones: titulo,
                descripcion: desc || '',
                otDetalle: desc || titulo,
                costo: precio * qty,
                cantidad: qty,
                precioUnitario: precio
            });
        }
    });

    if (items.length === 0) { alert('Agregá al menos un ítem con título y precio.'); return; }

    const pn = s => parseFloat(String(s).replace(/[^0-9.]/g, '')) || 0;
    let total = items.reduce((acc, it) => acc + it.costo, 0);

    const descOn = document.getElementById('gpmTogDesc')?.checked;
    let descuento = 0, descuentoValor = 0, tipoDescuento = 'pct';
    if (descOn) {
        const dv = pn(document.getElementById('gpmDescVal')?.value);
        tipoDescuento = document.getElementById('gpmDescTipo')?.value || 'pct';
        // descuento = el valor ingresado por el usuario (% o monto fijo) — se guarda tal cual
        descuento = dv;
        // descuentoValor = el monto real descontado en pesos — se usa solo para el cálculo del total
        descuentoValor = tipoDescuento === 'pct' ? total * (dv / 100) : dv;
        total -= descuentoValor;
    }
    const ivaOn = document.getElementById('gpmTogIva')?.checked;
    if (ivaOn) total *= 1.21;

    const categoria = document.getElementById('gpmCategoria')?.value || 'Gráfica';
    const titulo = document.getElementById('gpmTitulo')?.value?.trim() || '';
    const notasInternas = document.getElementById('gpmNotasInternas')?.value?.trim() || '';
    const condiciones = document.getElementById('gpmCondiciones')?.value?.trim() || '';
    const fechaEntrega = document.getElementById('gpmEntrega')?.value || '';
    const mostrarPrecios = document.getElementById('gpmMostrarPrecios')?.checked !== false;
    const imagenesRef = Array.isArray(window._gpmImagenes)
        ? window._gpmImagenes.filter(img => typeof img === 'string' && img.length > 100)
        : [];

    console.log('GECKO _gpmGuardar: imagenes a guardar:', imagenesRef.length);

    // Conectar con el sistema existente
    window.presupuesto = items;
    const clienteInput = document.getElementById('clienteNombre');
    if (clienteInput) clienteInput.value = cliente;
    const catSelect = document.getElementById('categoriaPedido');
    if (catSelect) catSelect.value = categoria;
    if (document.getElementById('precioTotal')) document.getElementById('precioTotal').value = total;

    // En edición conservar el status original
    const _esEdicion = !!window._editandoPresupuestoId;
    const _editId = window._editandoPresupuestoId;
    const _statusFinal = _esEdicion
        ? (() => {
            const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
            const doc = lista.find(x => String(x.id) === String(_editId));
            return doc?.status || status;
        })()
        : status;

    // Marcar timestamp único para identificar el doc recién guardado
    const _tsGuardado = Date.now();
    window._gpmMetadataPendiente = { titulo, notasInternas, condiciones, descuento, tipoDescuento, conIva: ivaOn, fechaEntrega, mostrarPrecios, imagenes: imagenesRef, _tsGuardado };

    window.procesarGuardado(status);

    setTimeout(() => {
        const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
        let docTarget;
        if (_esEdicion) {
            // Edición: buscar por ID editado
            docTarget = lista.filter(x => String(x.id) === String(_editId)).pop();
        } else {
            // Nuevo: buscar el doc con el timestamp que inyectamos en metadatos
            docTarget = lista.filter(x => x._tsGuardado === _tsGuardado).pop();
            // Fallback: el último con el status correcto y cliente correcto
            if (!docTarget) {
                docTarget = lista.filter(x => x.status === status && x.cliente === cliente).pop();
            }
        }
        if (!docTarget) return;

        // Garantizar que las imágenes estén en el doc antes de mostrar el PDF.
        // No confiar en el timeout del hook — inyectarlas directamente en memoria.
        const imagenesParaPDF = imagenesRef.length > 0
            ? imagenesRef
            : (Array.isArray(window._gpmImagenes) ? window._gpmImagenes.filter(img => typeof img === 'string' && img.length > 100) : []);
        if (imagenesParaPDF.length > 0 && (!docTarget.imagenes || docTarget.imagenes.length === 0)) {
            docTarget.imagenes = imagenesParaPDF;
            // También persistir en localStorage para que verDocumento lo encuentre al leer
            const idxDoc = lista.findIndex(x => String(x.id) === String(docTarget.id));
            if (idxDoc !== -1) {
                lista[idxDoc] = docTarget;
                localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(lista));
            }
        }

        const _tabDestino = _statusFinal === 'OT' ? 'ots' : 'presupuestos';
        window._gpmPostPrintRedirect = _tabDestino;
        if (typeof window._imprimirDocumento === 'function') {
            window._imprimirDocumento(String(docTarget.id));
        }
    }, 1200);
};

// ── Hook procesarGuardado para inyectar metadatos extra ──
const _procesarGuardadoOrigGPM = window.procesarGuardado;
window.procesarGuardado = function (status) {
    const _editIdAntes = window._editandoPresupuestoId;
    const _nextIdAntes = window.nextBudgetId || (parseInt(localStorage.getItem('gecko_nextId')) || 1001);
    _procesarGuardadoOrigGPM(status);
    if (window._gpmMetadataPendiente) {
        setTimeout(() => {
            const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
            let target;
            if (_editIdAntes) {
                target = lista.find(x => String(x.id) === String(_editIdAntes));
            } else {
                const ts = window._gpmMetadataPendiente?._tsGuardado;
                target = ts
                    ? lista.find(x => x._tsGuardado === ts)
                    : lista.find(x => String(x.id) === String(_nextIdAntes));
                if (!target) target = lista[lista.length - 1];
            }
            if (target) {
                Object.assign(target, window._gpmMetadataPendiente);
                localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(lista));
            }
            window._gpmMetadataPendiente = null;
        }, 200);
    }
};

// ── Reemplazar abrirCotizadorManual (botón de header) ──
window.abrirCotizadorManual = function () {
    if (typeof window.switchMenu === 'function') window.switchMenu('presupuestoManual');
    window.abrirPresupuestadorManual(null);
};

// ── editarPresupuesto: detectar si es manual y abrir la sección correcta ──
const _editarPresupuestoOrigGPM = window.editarPresupuesto;
window.editarPresupuesto = function (id) {
    const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const _todos = lista.filter(x => String(x.id) === String(id));
    const p = _todos[_todos.length - 1];
    if (!p) return;
    const esManual = p.items && p.items.length > 0 && p.items.every(it => it.tipo === 'manual');
    if (esManual) {
        if (typeof window.switchMenu === 'function') window.switchMenu('presupuestoManual');
        window.abrirPresupuestadorManual(id);
    } else {
        if (typeof _editarPresupuestoOrigGPM === 'function') _editarPresupuestoOrigGPM(id);
    }
};

console.log('🦎 GECKO: Presupuestador Manual (sección nativa) v2.0 cargado.');

// Auto-render presupuestoManual si la URL tiene #presupuestoManual al cargar
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
        const hash = window.location.hash;
        if (hash === '#presupuestoManual') {
            if (typeof window.abrirPresupuestadorManual === 'function') {
                window.abrirPresupuestadorManual(null);
            }
        }
    }, 500);
});

// También escuchar el evento geckoDB_ready por si carga después
document.addEventListener('geckoDB_ready', function () {
    const hash = window.location.hash;
    if (hash === '#presupuestoManual') {
        const container = document.getElementById('presupuestoManualContainer');
        if (container && container.innerHTML.trim() === '') {
            window.abrirPresupuestadorManual(null);
        }
    }
});

// ══════════════════════════════════════════════════════
// FIX: showPicker en campo fecha del presupuestador manual nativo
// ══════════════════════════════════════════════════════
document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'gpmFecha') {
        try { e.target.showPicker(); } catch (err) { }
    }
});
document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'gpmEntrega') {
        try { e.target.showPicker(); } catch (err) { }
    }
});

// ══════════════════════════════════════════════════════
// FIX: Placeholders gpmNotasInternas y gpmCondiciones
// ══════════════════════════════════════════════════════
(function () {
    var style = document.createElement('style');
    style.innerHTML = [
        '#gpmNotasInternas::placeholder {',
        '  color: #71717a !important;',
        '  font-weight: 400 !important;',
        '  opacity: 1 !important;',
        '}',
        '#gpmCondiciones::placeholder {',
        '  color: #71717a !important;',
        '  font-weight: 400 !important;',
        '  opacity: 1 !important;',
        '}'
    ].join('\n');
    document.head.appendChild(style);
})();

// ══════════════════════════════════════════════════════
// FIX: color placeholder gpmNotasInternas y gpmCondiciones
// ══════════════════════════════════════════════════════
(function () {
    var s = document.createElement('style');
    s.innerHTML =
        '.dark #gpmNotasInternas::placeholder { color: #71717a !important; opacity: 1 !important; }' +
        '.dark #gpmCondiciones::placeholder { color: #71717a !important; opacity: 1 !important; }' +
        '#gpmNotasInternas::placeholder { color: #71717a !important; opacity: 1 !important; }' +
        '#gpmCondiciones::placeholder { color: #71717a !important; opacity: 1 !important; }';
    document.head.appendChild(s);
})();

// ══════════════════════════════════════════════════════
// FIX: placeholder notas y condiciones — override webkit-text-fill-color
// ══════════════════════════════════════════════════════
(function () {
    var s = document.createElement('style');
    s.innerHTML =
        '#gpmCondiciones::placeholder { color: #71717a !important; -webkit-text-fill-color: #71717a !important; opacity: 1 !important; }' +
        '#gpmNotasInternas::placeholder { color: #71717a !important; -webkit-text-fill-color: #71717a !important; opacity: 1 !important; }';
    document.head.appendChild(s);
})();

// ══════════════════════════════════════════════════════
// FIX: renderPresupuestos al cargar sección Pedidos
// ══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
        if (typeof renderPresupuestos === 'function') {
            renderPresupuestos();
        }
    }, 1500);
});