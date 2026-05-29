
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
                Guardar Presupuesto
            </button>
            <button onclick="window._guardarManual('OT')"
                style="flex:1;padding:14px;background:#F15A24;border:none;color:white;border-radius:14px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;cursor:pointer;">
                Generar OT
            </button>
        </div>
    </div>`;

    document.body.appendChild(modal);
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
            items.push({ tipo: 'manual', nombre: desc, textoOpciones: desc, costo: precio, otDetalle: desc });
        }
    });
    if (items.length === 0) { alert('Agregá al menos un ítem con descripción y precio.'); return; }

    const total = items.reduce((acc, it) => acc + it.costo, 0);
    const cat = document.getElementById('manualCategoria')?.value || 'Gráfica';

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
    const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const p = lista.find(x => String(x.id) === String(id));
    if (!p) { alert('No se encontró el documento.'); return; }

    const saldo = (p.total || 0) - (p.sena || 0);
    const resumenItems = (p.items || []).map(it =>
        `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #1f1f23;">
            <span style="color:#a1a1aa;font-size:12px;font-weight:600;">${it.nombre || it.textoOpciones || 'Ítem'}</span>
            <span style="color:#F15A24;font-size:12px;font-weight:900;font-family:monospace;">$${Math.round(it.costo || 0).toLocaleString('es-AR')}</span>
        </div>`
    ).join('');

    document.getElementById('modalVerOT')?.remove();
    const modal = document.createElement('div');
    modal.id = 'modalVerOT';
    modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:9999;background:rgba(10,12,20,0.75);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = `
    <div style="background:#141417;border:1px solid #27272a;border-radius:24px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;padding:28px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <div>
                <p style="color:#F15A24;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:3px;">${p.status === 'OT' ? 'Orden de Trabajo' : 'Presupuesto'} #${String(id).padStart(4, '0')}</p>
                <h2 style="color:white;font-size:20px;font-weight:900;margin:0;">${p.cliente || 'S/N'}</h2>
            </div>
            <button onclick="document.getElementById('modalVerOT').remove()" style="background:#27272a;border:none;color:#71717a;width:34px;height:34px;border-radius:10px;cursor:pointer;font-size:16px;">✕</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;">
            <div style="background:#09090b;border:1px solid #27272a;border-radius:12px;padding:12px;">
                <p style="color:#71717a;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Estado</p>
                <p style="color:white;font-size:14px;font-weight:900;">${p.estado_ot || p.status || '—'}</p>
            </div>
            <div style="background:#09090b;border:1px solid #27272a;border-radius:12px;padding:12px;">
                <p style="color:#71717a;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Entrega</p>
                <p style="color:white;font-size:14px;font-weight:900;">${p.fecha_entrega || 'A confirmar'}</p>
            </div>
            <div style="background:#09090b;border:1px solid #27272a;border-radius:12px;padding:12px;">
                <p style="color:#71717a;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Total</p>
                <p style="color:#F15A24;font-size:16px;font-weight:900;">$${Math.round(p.total || 0).toLocaleString('es-AR')}</p>
            </div>
            <div style="background:#09090b;border:1px solid ${saldo > 0 ? '#ef4444' : '#10b981'};border-radius:12px;padding:12px;">
                <p style="color:#71717a;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Saldo</p>
                <p style="color:${saldo > 0 ? '#ef4444' : '#10b981'};font-size:16px;font-weight:900;">$${Math.round(saldo).toLocaleString('es-AR')}</p>
            </div>
        </div>
        ${resumenItems ? `<div style="background:#09090b;border:1px solid #27272a;border-radius:14px;padding:16px;margin-bottom:20px;">
            <p style="color:#71717a;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;">Trabajo</p>
            ${resumenItems}
        </div>` : ''}
        <div style="display:flex;gap:10px;">
            <button onclick="window._imprimirDocumento('${id}')"
                style="flex:1;padding:13px;background:#F15A24;border:none;color:white;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;letter-spacing:1px;">Imprimir</button>
            <button onclick="window._descargarDocumento('${id}')"
                style="flex:1;padding:13px;background:#1A1A1A;border:1px solid #27272a;color:white;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;letter-spacing:1px;">Descargar</button>
            <button onclick="document.getElementById('modalVerOT').remove()"
                style="padding:13px 16px;background:transparent;border:1px solid #3f3f46;color:#71717a;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">Cerrar</button>
        </div>
    </div>`;
    document.body.appendChild(modal);
};

window._imprimirDocumento = async function (id) {
    const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const p = lista.find(x => String(x.id) === String(id));
    if (!p) return;

    const esOT = p.status === 'OT';
    const html = esOT
        ? await window.generarDocOT({ ...p, entrega: p.fecha_entrega || 'A confirmar', imagenes: [] })
        : await window.generarDocPresupuesto({ ...p, mostrarPrecios: true, imagenes: [] });

    const htmlFinal = html
        .replace('<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}<\/script>', '')
        .replace('</body>', `
        <div id="previewToolbar" style="position:fixed;bottom:24px;left:50%;transform:translateX(-50%);display:flex;gap:12px;z-index:9999;background:#141417;border:1px solid #27272a;border-radius:16px;padding:12px 20px;box-shadow:0 8px 32px rgba(0,0,0,0.5);">
            <button onclick="window.print()" style="background:#F15A24;border:none;color:white;padding:10px 20px;border-radius:10px;font-size:12px;font-weight:900;text-transform:uppercase;cursor:pointer;letter-spacing:1px;">Imprimir</button>
            <button onclick="window.close()" style="background:transparent;border:1px solid #3f3f46;color:#71717a;padding:10px 20px;border-radius:10px;font-size:12px;font-weight:900;text-transform:uppercase;cursor:pointer;">Cerrar</button>
        </div>
        <style>@media print { #previewToolbar { display: none !important; } }</style>
        </body>`);

    const win = window.open('', '_blank', 'width=960,height=780');
    if (!win) { alert('Permití las ventanas emergentes.'); return; }
    win.document.write(htmlFinal);
    win.document.close();
};

window._descargarDocumento = function (id) { window._imprimirDocumento(id); };


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

// Hook switchMenu para auto-render al entrar a pedidos
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

                <button onclick="this.closest('.gecko-modal-overlay').remove()"
                    style="position:absolute;top:20px;right:20px;width:32px;height:32px;border-radius:8px;background:#2a2a2a;border:1px solid #333;color:#666;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;"
                    onmouseover="this.style.color='white';this.style.borderColor='#555'"
                    onmouseout="this.style.color='#666';this.style.borderColor='#333'">✕</button>

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
                    </button>` : ''}
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
    const lista = window.LISTA_GASTOS_FIJOS;
    if (!lista || !lista[idx]) return;
    lista[idx].estado = 'Pagado';
    localStorage.setItem('gecko_gastos_fijos', JSON.stringify(lista));
    // Register as expense movement
    const g = lista[idx];
    const cajas = window.LISTA_CAJAS || JSON.parse(localStorage.getItem('gecko_cajas') || '[]');
    if (cajas.length > 0 && typeof window.registrarMovimiento === 'function') {
        window.registrarMovimiento(g.concepto, cajas[0].nombre, g.monto, 'Egreso', g.categoria || 'Gastos Fijos');
    } else {
        const movs = JSON.parse(localStorage.getItem('gecko_movimientos') || '[]');
        movs.push({ fecha: new Date().toLocaleDateString('es-AR'), detalle: g.concepto, caja: cajas[0]?.nombre || '—', tipo: 'Egreso', monto: g.monto, categoria: g.categoria || 'Gastos Fijos' });
        localStorage.setItem('gecko_movimientos', JSON.stringify(movs));
        window.LISTA_MOVIMIENTOS = movs;
    }
    window.renderGastosFijos();
    if (typeof window.mostrarExito === 'function') window.mostrarExito(`${g.concepto} marcado como pagado.`, '¡Listo!');
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
    modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:10000;background:rgba(10,12,20,0.75);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:16px;';
    const cats = ['Alquiler', 'Servicios', 'Internet', 'Sueldos', 'Impuestos', 'Insumos', 'Varios'];
    const catLabels = { Alquiler: 'Alquiler', Servicios: 'Servicios (Luz, Agua, Gas)', Internet: 'Internet / Telefonía', Sueldos: 'Sueldos', Impuestos: 'Impuestos / Monotributo', Insumos: 'Insumos recurrentes', Varios: 'Varios' };
    modal.innerHTML = `
        <div style="background:#141417;border:1px solid #27272a;border-radius:24px;width:100%;max-width:440px;padding:32px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
                <div>
                    <p style="color:#F15A24;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px 0;">Finanzas</p>
                    <h3 style="color:white;font-size:18px;font-weight:900;margin:0;text-transform:uppercase;letter-spacing:1px;">Editar Gasto Fijo</h3>
                </div>
                <button onclick="document.getElementById('_geckoModalEditGasto').remove()"
                    style="background:#27272a;border:none;color:#71717a;width:36px;height:36px;border-radius:10px;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;">✕</button>
            </div>
            <div style="display:flex;flex-direction:column;gap:16px;">
                <div>
                    <label style="display:block;color:#71717a;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Concepto</label>
                    <input id="_editGastoConcepto" type="text" value="${(g.concepto || '').replace(/"/g, '&quot;')}"
                        style="width:100%;background:#09090b;border:1px solid #27272a;border-radius:12px;padding:12px 16px;color:white;font-size:14px;font-weight:700;outline:none;box-sizing:border-box;">
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div>
                        <label style="display:block;color:#71717a;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Monto ($)</label>
                        <input id="_editGastoMonto" type="number" value="${g.monto || 0}"
                            style="width:100%;background:#09090b;border:1px solid #27272a;border-radius:12px;padding:12px 16px;color:#F15A24;font-size:14px;font-weight:900;outline:none;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="display:block;color:#71717a;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Día vencimiento</label>
                        <input id="_editGastoVencimiento" type="number" min="1" max="31" value="${g.vencimiento || 1}"
                            style="width:100%;background:#09090b;border:1px solid #27272a;border-radius:12px;padding:12px 16px;color:white;font-size:14px;font-weight:700;outline:none;box-sizing:border-box;">
                    </div>
                </div>
                <div>
                    <label style="display:block;color:#71717a;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Categoría</label>
                    <select id="_editGastoCategoria" class="gecko-select-pro" style="font-weight:700;">
                        ${cats.map(c => `<option value="${c}" ${g.categoria === c ? 'selected' : ''}>${catLabels[c]}</option>`).join('')}
                    </select>
                </div>
                <button id="_editGastoGuardarBtn"
                    style="width:100%;padding:14px;background:#F15A24;border:none;color:white;border-radius:14px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;cursor:pointer;margin-top:4px;"
                    onmouseover="this.style.transform='scale(1.03)';this.style.boxShadow='0 4px 20px rgba(241,90,36,0.4)'"
                    onmouseout="this.style.transform='';this.style.boxShadow=''">
                    Guardar Cambios
                </button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.getElementById('_editGastoGuardarBtn').onclick = function () {
        const concepto = document.getElementById('_editGastoConcepto').value.trim();
        const monto = parseFloat(document.getElementById('_editGastoMonto').value) || 0;
        const vencimiento = document.getElementById('_editGastoVencimiento').value.trim() || '1';
        const categoria = document.getElementById('_editGastoCategoria').value;
        if (!concepto || monto <= 0) { alert('Completá concepto y monto.'); return; }
        const arr = window.LISTA_GASTOS_FIJOS || JSON.parse(localStorage.getItem('gecko_gastos_fijos') || '[]');
        if (!arr[idx]) return;
        arr[idx] = { ...arr[idx], concepto, monto, vencimiento, categoria };
        window.LISTA_GASTOS_FIJOS = arr;
        localStorage.setItem('gecko_gastos_fijos', JSON.stringify(arr));
        modal.remove();
        window.renderGastosFijos();
        if (typeof window.mostrarExito === 'function') window.mostrarExito(`${concepto} actualizado.`, '¡Guardado!');
    };
};

window.abrirModalNuevoGastoFijo = function () {
    document.getElementById('_geckoModalNuevoGasto')?.remove();
    const modal = document.createElement('div');
    modal.id = '_geckoModalNuevoGasto';
    modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:10000;background:rgba(10,12,20,0.75);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = `
        <div style="background:#141417;border:1px solid #27272a;border-radius:24px;width:100%;max-width:440px;padding:32px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
                <div>
                    <p style="color:#F15A24;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px 0;">Finanzas</p>
                    <h3 style="color:white;font-size:18px;font-weight:900;margin:0;text-transform:uppercase;letter-spacing:1px;">Nuevo Gasto Fijo</h3>
                </div>
                <button onclick="document.getElementById('_geckoModalNuevoGasto').remove()"
                    style="background:#27272a;border:none;color:#71717a;width:36px;height:36px;border-radius:10px;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;">✕</button>
            </div>
            <div style="display:flex;flex-direction:column;gap:16px;">
                <div>
                    <label style="display:block;color:#71717a;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Concepto</label>
                    <input id="_gastoConcepto" type="text" placeholder="Ej: Alquiler, Luz, Sueldos..."
                        style="width:100%;background:#09090b;border:1px solid #27272a;border-radius:12px;padding:12px 16px;color:white;font-size:14px;font-weight:700;outline:none;box-sizing:border-box;">
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div>
                        <label style="display:block;color:#71717a;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Monto ($)</label>
                        <input id="_gastoMonto" type="number" placeholder="0"
                            style="width:100%;background:#09090b;border:1px solid #27272a;border-radius:12px;padding:12px 16px;color:#F15A24;font-size:14px;font-weight:900;outline:none;box-sizing:border-box;">
                    </div>
                    <div>
                        <label style="display:block;color:#71717a;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Día vencimiento</label>
                        <input id="_gastoVencimiento" type="number" min="1" max="31" placeholder="1-31"
                            style="width:100%;background:#09090b;border:1px solid #27272a;border-radius:12px;padding:12px 16px;color:white;font-size:14px;font-weight:700;outline:none;box-sizing:border-box;">
                    </div>
                </div>
                <div>
                    <label style="display:block;color:#71717a;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Categoría</label>
                    <select id="_gastoCategoria" class="gecko-select-pro" style="font-weight:700;">
                        <option value="Alquiler">Alquiler</option>
                        <option value="Servicios">Servicios (Luz, Agua, Gas)</option>
                        <option value="Internet">Internet / Telefonía</option>
                        <option value="Sueldos">Sueldos</option>
                        <option value="Impuestos">Impuestos / Monotributo</option>
                        <option value="Insumos">Insumos recurrentes</option>
                        <option value="Varios">Varios</option>
                    </select>
                </div>
                <button id="_gastoGuardarBtn"
                    style="width:100%;padding:14px;background:#F15A24;border:none;color:white;border-radius:14px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;cursor:pointer;margin-top:4px;">
                    Guardar Gasto Fijo
                </button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.getElementById('_gastoGuardarBtn').onclick = function () {
        const concepto = document.getElementById('_gastoConcepto').value.trim();
        const monto = parseFloat(document.getElementById('_gastoMonto').value) || 0;
        const vencimiento = document.getElementById('_gastoVencimiento').value.trim() || '1';
        const categoria = document.getElementById('_gastoCategoria').value;
        if (!concepto || monto <= 0) { alert('Completá concepto y monto.'); return; }
        if (!window.LISTA_GASTOS_FIJOS) window.LISTA_GASTOS_FIJOS = JSON.parse(localStorage.getItem('gecko_gastos_fijos') || '[]');
        window.LISTA_GASTOS_FIJOS.push({ concepto, monto, vencimiento, categoria, estado: 'Pendiente' });
        localStorage.setItem('gecko_gastos_fijos', JSON.stringify(window.LISTA_GASTOS_FIJOS));
        modal.remove();
        window.renderGastosFijos();
        if (typeof window.mostrarExito === 'function') window.mostrarExito(`${concepto} agregado.`, '¡Guardado!');
    };
};

// ── Reportes: override ranking para usar p.categoria (Gráfica / Industrial) ──
const _renderReportesOriginal = window.renderReportesDashboard;
window.renderReportesDashboard = function () {
    if (typeof _renderReportesOriginal === 'function') _renderReportesOriginal();

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
        const cat = p.categoria || (typeof window._detectarCategoria === 'function' ? window._detectarCategoria(p) : null) || 'Gráfica';
        counts[cat] = (counts[cat] || 0) + 1;
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
window.ejecutarCierreMensual = function () {
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
        const hist = window.HISTORICO_CIERRES || JSON.parse(localStorage.getItem('gecko_historico_cierres') || '[]');
        hist.push({ periodo: `${meses[ahora.getMonth()]} ${ahora.getFullYear()}`, ingresos: ing, gastos: egr, balance: ing - egr, fecha_cierre: ahora.toLocaleDateString('es-AR') });
        window.HISTORICO_CIERRES = hist;
        localStorage.setItem('gecko_historico_cierres', JSON.stringify(hist));
        const gastos = window.LISTA_GASTOS_FIJOS || [];
        gastos.forEach(g => { g.estado = 'Pendiente'; });
        localStorage.setItem('gecko_gastos_fijos', JSON.stringify(gastos));
        if (typeof window.renderReportesDashboard === 'function') window.renderReportesDashboard();
        if (typeof window.renderGastosFijos === 'function') window.renderGastosFijos();
        if (typeof window.mostrarExito === 'function') window.mostrarExito(`Cierre de ${mesNom} procesado.`, '¡Mes Cerrado!');
    };
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

            if (!window.LISTA_MOVIMIENTOS) {
                window.LISTA_MOVIMIENTOS = JSON.parse(localStorage.getItem('gecko_movimientos') || '[]');
            }
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
            // Intentar updateCajaSelectors de main.js primero; si no existe, usar fallback propio
            if (typeof updateCajaSelectors === 'function') {
                updateCajaSelectors();
            } else {
                window._geckoPopulateCajaSelect('nuevoMovCaja');
            }
            const m = document.getElementById('modalNuevoMovimiento');
            if (m) { m.style.display = 'flex'; }
            const desc = document.getElementById('nuevoMovDesc');
            const monto = document.getElementById('nuevoMovMonto');
            if (desc) desc.value = '';
            if (monto) monto.value = '';
        };

        window.abrirModalTransferencia = function () {
            if (typeof updateCajaSelectors === 'function') {
                updateCajaSelectors();
            } else {
                window._geckoPopulateCajaSelect('transferenciaOrigen');
                window._geckoPopulateCajaSelect('transferenciaDestino');
            }
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

        // ── Override renderClientes con drag & drop ──
        (function () {
            const _origRC = window.renderClientes;
            window.renderClientes = function () {
                const tbody = document.getElementById('tbodyClientes');
                if (!tbody) return;
                const filtro = document.getElementById('filtroClienteBusqueda')?.value?.toLowerCase() || '';
                const allClientes = JSON.parse(localStorage.getItem('clientes') || '[]');
                const filtered = allClientes.filter(c =>
                    c.nombre.toLowerCase().includes(filtro) ||
                    (c.cuit && c.cuit.includes(filtro)) ||
                    (c.rubro && c.rubro.toLowerCase().includes(filtro))
                );
                if (!filtered.length) {
                    tbody.innerHTML = '<tr><td colspan="4" class="py-10 text-center text-gray-400 font-medium italic">No se encontraron clientes.</td></tr>';
                    return;
                }
                const presupuestos = window.listaPresupuestos || JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
                tbody.innerHTML = filtered.map((c, i) => {
                    const trabajos = presupuestos.filter(p => p.cliente === c.nombre && p.status === 'OT');
                    const saldoTotal = trabajos.filter(p => p.estado_ot !== 'Entregado').reduce((acc, p) => acc + (p.total - (p.sena || 0)), 0);
                    const waLink = c.tel ? `<a href="https://wa.me/${c.tel.replace(/\D/g, '')}" target="_blank" class="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-colors" title="WhatsApp"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg></a>` : '';
                    const mailLink = c.email ? `<a href="mailto:${c.email}" class="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-colors" title="Email"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg></a>` : '';
                    const badge = typeof window.obtenerBadgeScoring === 'function' ? window.obtenerBadgeScoring(c.nombre) : '';
                    return `<tr draggable="true" data-drag-key="${i}" class="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors group" style="cursor:grab;">
                        <td class="py-4 px-6">
                            <div class="flex items-center">
                                <p class="font-extrabold dark:text-white tracking-tight text-[14px]">${c.nombre}</p>
                                ${badge}
                            </div>
                            <div class="flex gap-2 text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-widest">
                                <span>${c.cuit || 'Sin CUIT'}</span>
                                ${c.rubro ? `<span class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-darkBg">${c.rubro}</span>` : ''}
                            </div>
                        </td>
                        <td class="py-4 px-6 text-center hidden md:table-cell">
                            <div class="flex items-center justify-center gap-2">${waLink}${mailLink}</div>
                        </td>
                        <td class="py-4 px-6 text-right">
                            <span class="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider ${saldoTotal > 0 ? 'bg-red-50 dark:bg-red-900/10 text-red-500 border border-red-100 dark:border-red-900/20' : 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-500 border border-emerald-100 dark:border-emerald-900/20'}">
                                $${saldoTotal.toLocaleString('es-AR')}
                            </span>
                        </td>
                        <td class="py-4 px-6 text-right">
                            <button onclick="abrirFichaCliente('${c.nombre.replace(/'/g, "\\'")}');event.stopPropagation();" class="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-darkBg text-gray-700 dark:text-gray-300 font-bold hover:bg-gecko hover:text-white transition-all text-[11px] uppercase tracking-widest inline-flex items-center gap-2">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                Ver Ficha / CC
                            </button>
                        </td>
                    </tr>`;
                }).join('');
                if (typeof window._geckoDragTable === 'function') {
                    window._geckoDragTable(tbody, function (srcKey, destKey) {
                        const si = parseInt(srcKey), di = parseInt(destKey);
                        const all = JSON.parse(localStorage.getItem('clientes') || '[]');
                        const filtroNow = document.getElementById('filtroClienteBusqueda')?.value?.toLowerCase() || '';
                        const filt = all.filter(c =>
                            c.nombre.toLowerCase().includes(filtroNow) ||
                            (c.cuit && c.cuit.includes(filtroNow)) ||
                            (c.rubro && c.rubro.toLowerCase().includes(filtroNow))
                        );
                        const srcNom = filt[si]?.nombre, dstNom = filt[di]?.nombre;
                        if (!srcNom || !dstNom) return;
                        const fo = all.findIndex(c => c.nombre === srcNom);
                        const fd = all.findIndex(c => c.nombre === dstNom);
                        if (fo < 0 || fd < 0) return;
                        const moved = all.splice(fo, 1)[0];
                        all.splice(fd, 0, moved);
                        localStorage.setItem('clientes', JSON.stringify(all));
                        window.renderClientes();
                    });
                }
            };
        })();

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
