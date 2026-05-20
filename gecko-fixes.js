
// ── Alias para compatibilidad con llamadas directas de main.js ──
if (typeof renderizarFinanzas === 'undefined') {
    window.renderizarFinanzas = function() {
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

window.procesarGuardado = function(status) {
    const cliente = document.getElementById('clienteNombre')?.value?.trim() || 'Cliente Genérico';
    const total   = parseFloat(document.getElementById('precioTotal')?.value) ||
                    parseFloat(document.getElementById('labelTotalPresupuesto')?.innerText?.replace(/[$.\\s]/g,'').replace(',','.')) || 0;

    if (!window.presupuesto || window.presupuesto.length === 0) {
        alert('Agregá al menos un ítem antes de guardar.');
        return;
    }

    const id = window.nextBudgetId || (parseInt(localStorage.getItem('gecko_nextId')) || 1001);
    const nuevo = {
        id, cliente,
        fecha: new Date().toLocaleDateString('es-AR'),
        total, status,
        sena: 0,
        estado_ot: status === 'OT' ? 'En Proceso' : '',
        items: window.presupuesto.map(it => ({ ...it })),
        metodo_pago: ''
    };

    if (typeof listaPresupuestos !== 'undefined') {
        listaPresupuestos.push(nuevo);
    } else {
        window.listaPresupuestos = window.listaPresupuestos || [];
        window.listaPresupuestos.push(nuevo);
    }

    const lista = typeof listaPresupuestos !== 'undefined' ? listaPresupuestos : window.listaPresupuestos;
    localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(lista));

    window.nextBudgetId = id + 1;
    localStorage.setItem('gecko_nextId', window.nextBudgetId);

    const successEl = document.getElementById('successVista');
    if (successEl) {
        successEl.classList.remove('hidden');
        successEl.classList.add('flex');
    }

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
    window.getGeckoItem = function(query) {
        const resultado = _getOriginal(query);
        if (resultado) return resultado;

        const aliases = {
            'DTF TEXTIL':            ['DTF - TEXTIL', 'DTF TEXTIL', 'DTF'],
            'ESTAMPADO':             ['ESTAMPADO', 'ESTAMPADO '],
            'TERMOVINILO':           ['TERMOVINILO', 'TERMO'],
            'PLOTER DE CORTE - 60CM':['PLOTER DE CORTE - 60CM', 'PLOTER DE CORTE  - 60CM', 'PLOTER 60', 'PLOTER DE CORTE'],
            'PLOTER 60':             ['PLOTER DE CORTE - 60CM', 'PLOTER DE CORTE  - 60CM'],
            'SERVICIO DE CORTE':     ['PLOTER DE CORTE - 60CM', 'PLOTER DE CORTE  - 60CM', 'PLOTER DE CORTE - 120CM'],
            'DTF':                   ['DTF - TEXTIL', 'DTF - UV'],
            'TERMO':                 ['TERMOVINILO']
        };

        const qNorm = String(query).toUpperCase().trim().replace(/\s+/g,' ');
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

window.abrirCotizadorManual = function() {
    if (document.getElementById('modalCotizadorManual')) {
        document.getElementById('modalCotizadorManual').style.display = 'flex';
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'modalCotizadorManual';
    modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.85);backdrop-filter:blur(4px);align-items:center;justify-content:center;padding:16px;';

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

window._agregarFilaManual = function() {
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

window._recalcularManual = function() {
    const precios = document.querySelectorAll('.fila-manual-precio');
    let total = 0;
    precios.forEach(p => { total += parseFloat(p.value) || 0; });
    const el = document.getElementById('manualTotal');
    if (el) el.innerText = '$' + Math.round(total).toLocaleString('es-AR');
};

window._guardarManual = function(status) {
    const cliente = document.getElementById('manualCliente')?.value?.trim() || 'Cliente Genérico';
    const filas   = document.querySelectorAll('#filasManual > div');
    const items = [];
    filas.forEach(fila => {
        const desc  = fila.querySelector('.fila-manual-desc')?.value?.trim();
        const precio = parseFloat(fila.querySelector('.fila-manual-precio')?.value) || 0;
        if (desc && precio > 0) {
            items.push({ tipo:'manual', nombre:desc, textoOpciones:desc, costo:precio, otDetalle:desc });
        }
    });
    if (items.length === 0) { alert('Agregá al menos un ítem con descripción y precio.'); return; }

    const total = items.reduce((acc, it) => acc + it.costo, 0);
    window.presupuesto = items;
    if (document.getElementById('precioTotal')) document.getElementById('precioTotal').value = total;

    const clienteInput = document.getElementById('clienteNombre');
    if (clienteInput) clienteInput.value = cliente;

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

window.verDocumento = async function(id) {
    const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const p = lista.find(x => String(x.id) === String(id));
    if (!p) { alert('No se encontró el documento.'); return; }

    const esOT = p.status === 'OT';
    const html = esOT
        ? await window.generarDocOT({ ...p, entrega: p.fecha_entrega || 'A confirmar', imagenes: [] })
        : await window.generarDocPresupuesto({ ...p, mostrarPrecios: true, imagenes: [] });

    // Quitar el script de auto-print y agregar toolbar
    const htmlPreview = html
        .replace('<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close();}<\/script>', '')
        .replace('</body>', `
        <div id="previewToolbar" style="position:fixed;bottom:24px;left:50%;transform:translateX(-50%);display:flex;gap:12px;z-index:9999;background:#141417;border:1px solid #27272a;border-radius:16px;padding:12px 20px;box-shadow:0 8px 32px rgba(0,0,0,0.5);">
            <button onclick="window.print()" style="background:#F15A24;border:none;color:white;padding:10px 20px;border-radius:10px;font-size:12px;font-weight:900;text-transform:uppercase;cursor:pointer;letter-spacing:1px;">🖨 Imprimir</button>
            <button onclick="window.print()" style="background:#1A1A1A;border:1px solid #27272a;color:white;padding:10px 20px;border-radius:10px;font-size:12px;font-weight:900;text-transform:uppercase;cursor:pointer;letter-spacing:1px;">⬇ Descargar PDF</button>
            <button onclick="window.close()" style="background:transparent;border:1px solid #3f3f46;color:#71717a;padding:10px 20px;border-radius:10px;font-size:12px;font-weight:900;text-transform:uppercase;cursor:pointer;">✕ Cerrar</button>
        </div>
        <style>@media print { #previewToolbar { display: none !important; } }</style>
        </body>`);

    const win = window.open('', '_blank', 'width=960,height=780');
    if (!win) { alert('Permití las ventanas emergentes.'); return; }
    win.document.write(htmlPreview);
    win.document.close();
};


// ══════════════════════════════════════════════════════
// ESTADOS OT
// ══════════════════════════════════════════════════════

const ESTADOS_OT = ['En Proceso', 'En Taller', 'Impresión', 'Terminaciones', 'Listo', 'Entregado'];
const ESTADO_COLORS = {
    'En Proceso':    { bg: '#F15A24', text: 'white' },
    'En Taller':     { bg: '#8b5cf6', text: 'white' },
    'Impresión':     { bg: '#3b82f6', text: 'white' },
    'Terminaciones': { bg: '#f59e0b', text: 'white' },
    'Listo':         { bg: '#10b981', text: 'white' },
    'Entregado':     { bg: '#6b7280', text: 'white' },
};

window._cambiarEstadoOTDesplegable = function(id, nuevoEstado) {
    if (nuevoEstado === 'Entregado') {
        if (!confirm('¿Confirmar entrega? El trabajo pasará al historial.')) {
            const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
            const ot = lista.find(x => String(x.id) === String(id));
            const sel = document.getElementById('estado-ot-' + id);
            if (sel && ot) sel.value = ot.estado_ot || 'En Proceso';
            return;
        }
    }
    let lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const idx = lista.findIndex(x => String(x.id) === String(id));
    if (idx === -1) return;
    lista[idx].estado_ot = nuevoEstado;
    localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(lista));
    const sel = document.getElementById('estado-ot-' + id);
    if (sel) {
        const color = ESTADO_COLORS[nuevoEstado] || ESTADO_COLORS['En Proceso'];
        sel.style.background = color.bg;
        sel.style.color = color.text;
    }
};


// ══════════════════════════════════════════════════════
// RENDER PRESUPUESTOS — 4 botones correctos
// ══════════════════════════════════════════════════════

window.renderPresupuestos = async function() {
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
        <tr class="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
            <td class="py-4 px-6 font-black text-zinc-400 text-[11px]">#${p.id}</td>
            <td class="py-4 px-6 text-[12px] text-zinc-400 font-bold">${p.fecha || ''}</td>
            <td class="py-4 px-6">
                <span class="font-extrabold dark:text-white text-[14px] uppercase">${p.cliente || 'S/N'}</span>
            </td>
            <td class="py-4 px-6 text-[11px] text-zinc-500 font-medium max-w-[200px] truncate">${resumen}</td>
            <td class="py-4 px-6 font-black text-gecko text-[14px]">$${Math.round(p.total || 0).toLocaleString('es-AR')}</td>
            <td class="py-4 px-6 text-right">
                <div class="flex justify-end gap-2">
                    <button onclick="window.verDocumento(${p.id})"
                        title="Ver PDF"
                        class="px-3 py-1.5 rounded-lg bg-zinc-700/50 text-zinc-300 text-[10px] font-black uppercase tracking-widest border border-zinc-600/30 hover:bg-zinc-600 hover:text-white transition-all">
                        👁 Ver
                    </button>
                    <button onclick="window.editarPresupuesto(${p.id})"
                        title="Editar presupuesto"
                        class="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all">
                        ✏ Editar
                    </button>
                    <button onclick="window.convertirPresupuestoAOT(${p.id})"
                        title="Convertir a OT"
                        class="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase tracking-widest border border-orange-500/20 hover:bg-orange-500 hover:text-white transition-all">
                        → OT
                    </button>
                    <button onclick="window.eliminarPresupuesto(${p.id})"
                        title="Eliminar"
                        class="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
};

window.toggleHistorialPresupuestos = function() {
    window._mostrarHistorialPresupuestos = !window._mostrarHistorialPresupuestos;
    const btn = document.getElementById('btnToggleHistorialPresupuestosText');
    if (btn) btn.innerText = window._mostrarHistorialPresupuestos ? 'Ver Activos' : 'Ver Historial Presupuestos';
    window.renderPresupuestos();
};

window.eliminarPresupuesto = function(id) {
    if (!confirm('¿Eliminar este presupuesto? Esta acción no se puede deshacer.')) return;
    let lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    lista = lista.filter(x => String(x.id) !== String(id));
    localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(lista));
    window.renderPresupuestos();
};

// ──────────────────────────────────────────────────────
// CONVERTIR PRESUPUESTO → OT  (con modal de seña)
// ──────────────────────────────────────────────────────
window.convertirPresupuestoAOT = function(id) {
    if (!confirm('¿Convertir este presupuesto en Orden de Trabajo?')) return;
    let lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const p = lista.find(x => String(x.id) === String(id));
    if (!p) return;
    p.status = 'OT';
    p.estado_ot = 'En Proceso';
    localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(lista));
    if (typeof window.mostrarExito === 'function') window.mostrarExito(`OT #${id} generada`, '¡Listo!');
    window.renderPresupuestos();
    if (typeof window.renderOts === 'function') window.renderOts();
    // Preguntar por seña
    setTimeout(() => {
        if (confirm('¿El cliente pagó una seña o adelanto?')) {
            window.abrirModalSena(id);
        }
    }, 400);
};

// ──────────────────────────────────────────────────────
// EDITAR PRESUPUESTO
// ──────────────────────────────────────────────────────
window.editarPresupuesto = function(id) {
    const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const p = lista.find(x => String(x.id) === String(id));
    if (!p) return;

    window.presupuesto = (p.items || []).map(it => ({ ...it }));

    const clienteInput = document.getElementById('clienteNombre');
    if (clienteInput) clienteInput.value = p.cliente || '';

    window._editandoPresupuestoId = id;

    if (typeof window.renderizarPresupuesto === 'function') window.renderizarPresupuesto();
    if (typeof window.switchMenu === 'function') window.switchMenu('cotizadores');

    if (typeof window.mostrarExito === 'function') {
        window.mostrarExito(`Presupuesto #${id} cargado. Podés agregar o modificar ítems.`, '✏ Editando');
    }
};

// Hook switchMenu para auto-render al entrar a pedidos
const _switchMenuOriginal = window.switchMenu;
window.switchMenu = function(view) {
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

window.renderOts = async function() {
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
        tbody.innerHTML = `<tr><td colspan="7" class="py-16 text-center text-zinc-500 font-medium italic">
            ${mostrarHistorial ? 'Sin historial de OTs.' : 'No hay órdenes de trabajo activas.'}
        </td></tr>`;
        return;
    }

    tbody.innerHTML = filtrados.map(ot => {
        const estado = ot.estado_ot || 'En Proceso';
        const color = ESTADO_COLORS[estado] || ESTADO_COLORS['En Proceso'];
        const saldo = (ot.total || 0) - (ot.sena || 0);
        const selectOpts = ESTADOS_OT.map(e =>
            `<option value="${e}" ${e === estado ? 'selected' : ''}>${e}</option>`
        ).join('');

        return `
        <tr class="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors border-b border-gray-100 dark:border-gray-800">
            <td class="py-4 px-6 text-[11px] font-black uppercase text-zinc-500">#${ot.id}</td>
            <td class="py-4 px-6">
                <div class="flex flex-col">
                    <span class="text-[14px] font-extrabold dark:text-white uppercase">${ot.cliente || 'S/N'}</span>
                    <span class="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter mt-0.5">${ot.fecha || ''}</span>
                </div>
            </td>
            <td class="py-4 px-6">
                <div class="flex flex-wrap gap-1">
                    ${(ot.items||[]).map(it => `<span class="text-[9px] font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded uppercase">${it.textoOpciones || it.nombre || ''}</span>`).join('')}
                </div>
            </td>
            <td class="py-4 px-6 text-right font-black text-white text-[14px]">
                $${Math.round(ot.total||0).toLocaleString('es-AR')}
            </td>
            <td class="py-4 px-6 text-right font-black text-[14px] ${saldo > 0 ? 'text-red-400' : 'text-emerald-400'}">
                $${Math.round(saldo).toLocaleString('es-AR')}
            </td>
            <td class="py-4 px-6 text-center">
    <select
    id="estado-ot-${ot.id}"
    onchange="window._cambiarEstadoOTDesplegable('${ot.id}', this.value)"
    class="gecko-ot-estado">
    ${opts}
</select>
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
                        class="p-2 bg-amber-500/10 text-amber-400 rounded-lg hover:bg-amber-500 hover:text-white transition-all" title="Registrar Seña/Pago">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
};

window.toggleHistorialOts = function() {
    window._mostrarHistorialOts = !window._mostrarHistorialOts;
    const btn = document.getElementById('btnToggleHistorialText');
    if (btn) btn.innerText = window._mostrarHistorialOts ? 'Ver Activas' : 'Ver Historial';
    window.renderOts();
};


// ══════════════════════════════════════════════════════
// EDITAR OT — modal
// ══════════════════════════════════════════════════════

window.editarOT = function(id) {
    const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const ot = lista.find(x => String(x.id) === String(id));
    if (!ot) return;

    document.getElementById('modalEditarOT')?.remove();
    const modal = document.createElement('div');
    modal.id = 'modalEditarOT';
    modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.88);backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:16px;';

    const inputStyle = 'width:100%;background:#09090b;border:1px solid #27272a;border-radius:12px;padding:10px 14px;color:white;font-size:13px;font-weight:600;outline:none;box-sizing:border-box;font-family:inherit;';
    const labelStyle = 'display:block;color:#71717a;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:7px;';

    const itemsHTML = (ot.items || []).map((it, i) => `
        <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #1f1f23;">
            <span style="color:#52525b;font-size:9px;font-family:monospace;">${String(i+1).padStart(2,'0')}</span>
            <span style="color:white;font-size:11px;font-weight:600;flex:1;">${it.nombre || it.textoOpciones || 'Ítem'}</span>
            <span style="color:#F15A24;font-size:11px;font-family:monospace;">$${Math.round(it.costo||0).toLocaleString('es-AR')}</span>
        </div>
    `).join('');

    modal.innerHTML = `
    <div style="background:#141417;border:1px solid #27272a;border-radius:24px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;padding:28px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <div>
                <p style="color:#F15A24;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:3px;">🔧 Orden de Trabajo #${String(id).padStart(4,'0')}</p>
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

window._guardarEdicionOT = function(id) {
    let lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const idx = lista.findIndex(x => String(x.id) === String(id));
    if (idx === -1) return;

    lista[idx].cliente       = document.getElementById('otEditCliente')?.value?.trim() || lista[idx].cliente;
    lista[idx].area          = document.getElementById('otEditArea')?.value?.trim() || '';
    lista[idx].fecha_entrega = document.getElementById('otEditEntrega')?.value?.trim() || '';
    lista[idx].instrucciones = document.getElementById('otEditInstrucciones')?.value?.trim() || '';

    localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(lista));
    document.getElementById('modalEditarOT')?.remove();

    if (typeof window.mostrarExito === 'function') window.mostrarExito(`OT #${id} actualizada.`, '¡Guardado!');
    if (typeof window.renderOts === 'function') window.renderOts();
};

window._reimprimir = async function(id) {
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

window.abrirModalSena = function(id) {
    const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const ot = lista.find(x => String(x.id) === String(id));
    if (!ot) return;

    document.getElementById('modalSena')?.remove();
    const cajas = JSON.parse(localStorage.getItem('gecko_cajas') || '[]');
    const cajaOpts = cajas.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('');
    const totalPendiente = (ot.total || 0) - (ot.sena || 0);

    const inputStyle = 'width:100%;background:#09090b;border:1px solid #27272a;border-radius:12px;padding:10px 14px;color:white;font-size:13px;font-weight:600;outline:none;box-sizing:border-box;font-family:inherit;';
    const labelStyle = 'display:block;color:#71717a;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:7px;';

    const modal = document.createElement('div');
    modal.id = 'modalSena';
    modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.88);backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:16px;';

    modal.innerHTML = `
    <div style="background:#141417;border:1px solid #27272a;border-radius:24px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;padding:28px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <div>
                <p style="color:#f59e0b;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:3px;">💰 Registro de Pago</p>
                <h2 style="color:white;font-size:18px;font-weight:900;margin:0;">OT #${String(id).padStart(4,'0')} · ${ot.cliente}</h2>
            </div>
            <button onclick="document.getElementById('modalSena').remove()" style="background:#27272a;border:none;color:#71717a;width:34px;height:34px;border-radius:10px;cursor:pointer;font-size:16px;">✕</button>
        </div>

        <!-- Resumen -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px;">
            <div style="background:#09090b;border:1px solid #27272a;border-radius:12px;padding:12px;">
                <p style="color:#71717a;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Total OT</p>
                <p style="color:white;font-size:16px;font-weight:900;">$${Math.round(ot.total||0).toLocaleString('es-AR')}</p>
            </div>
            <div style="background:#09090b;border:1px solid #27272a;border-radius:12px;padding:12px;">
                <p style="color:#71717a;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Señas prev.</p>
                <p style="color:#10b981;font-size:16px;font-weight:900;">$${Math.round(ot.sena||0).toLocaleString('es-AR')}</p>
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
                    style="padding:10px;background:#f59e0b;border:none;color:white;border-radius:10px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">
                    💰 Seña / Parcial
                </button>
                <button id="tipoPagoSaldo" onclick="window._toggleTipoPago('saldo')"
                    style="padding:10px;background:#09090b;border:1px solid #27272a;color:#71717a;border-radius:10px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">
                    ✅ Saldo Final
                </button>
            </div>
        </div>

        <!-- Pago 1 -->
        <div style="background:#09090b;border:1px solid #27272a;border-radius:14px;padding:16px;margin-bottom:12px;">
            <p style="color:#f59e0b;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">Pago 1</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
                <div>
                    <label style="${labelStyle}">Monto</label>
                    <input type="number" id="sena1Monto" placeholder="$0" style="${inputStyle}" oninput="window._calcularResto('${id}')">
                </div>
                <div>
                    <label style="${labelStyle}">Forma de pago</label>
                    <select id="sena1Forma" style="${inputStyle}cursor:pointer;">
                        <option value="Efectivo">Efectivo</option>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Débito">Débito</option>
                        <option value="Crédito">Crédito</option>
                        <option value="MercadoPago">MercadoPago</option>
                    </select>
                </div>
            </div>
            <div>
                <label style="${labelStyle}">Ingresa a caja</label>
                <select id="sena1Caja" style="${inputStyle}cursor:pointer;">
                    ${cajaOpts || '<option value="">Sin cajas creadas</option>'}
                </select>
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
                    <select id="sena2Forma" style="${inputStyle}cursor:pointer;">
                        <option value="Efectivo">Efectivo</option>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Débito">Débito</option>
                        <option value="Crédito">Crédito</option>
                        <option value="MercadoPago">MercadoPago</option>
                    </select>
                </div>
            </div>
            <div>
                <label style="${labelStyle}">Ingresa a caja</label>
                <select id="sena2Caja" style="${inputStyle}cursor:pointer;">
                    ${cajaOpts || '<option value="">Sin cajas creadas</option>'}
                </select>
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
            <button onclick="window._registrarSena('${id}')" style="flex:2;padding:13px;background:#f59e0b;border:none;color:white;border-radius:12px;font-size:12px;font-weight:900;text-transform:uppercase;cursor:pointer;">💰 Registrar Pago</button>
        </div>
    </div>`;

    document.body.appendChild(modal);
    window._tipoPagoActual = 'seña';
    window._senaPendiente = totalPendiente;
};

window._toggleTipoPago = function(tipo) {
    window._tipoPagoActual = tipo;
    const btnSeña  = document.getElementById('tipoPagoSeña');
    const btnSaldo = document.getElementById('tipoPagoSaldo');
    if (tipo === 'seña') {
        if (btnSeña)  { btnSeña.style.background  = '#f59e0b'; btnSeña.style.color  = 'white'; }
        if (btnSaldo) { btnSaldo.style.background = '#09090b'; btnSaldo.style.color = '#71717a'; }
    } else {
        if (btnSaldo) { btnSaldo.style.background = '#10b981'; btnSaldo.style.color = 'white'; }
        if (btnSeña)  { btnSeña.style.background  = '#09090b'; btnSeña.style.color  = '#71717a'; }
        // Autocompletar con el saldo pendiente
        const m1 = document.getElementById('sena1Monto');
        if (m1 && window._senaPendiente > 0) m1.value = window._senaPendiente;
    }
};

window._togglePago2 = function() {
    const container = document.getElementById('pago2Container');
    const btn = document.getElementById('btnTogglePago2');
    if (!container) return;
    const visible = container.style.display !== 'none';
    container.style.display = visible ? 'none' : 'block';
    if (btn) btn.textContent = visible
        ? '+ Agregar segundo pago (ej: parte en transferencia + parte en efectivo)'
        : '− Quitar segundo pago';
};

window._calcularResto = function(id) {
    // Podría autocompletar el 2do pago, por ahora vacío
};

window._registrarSena = function(id) {
    const monto1 = parseFloat(document.getElementById('sena1Monto')?.value) || 0;
    const forma1 = document.getElementById('sena1Forma')?.value || 'Efectivo';
    const caja1  = document.getElementById('sena1Caja')?.value || '';
    const monto2 = parseFloat(document.getElementById('sena2Monto')?.value) || 0;
    const forma2 = document.getElementById('sena2Forma')?.value || 'Efectivo';
    const caja2  = document.getElementById('sena2Caja')?.value || '';
    const nota   = document.getElementById('senaNota')?.value || '';
    const tipo   = window._tipoPagoActual || 'seña';

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
            }).catch(() => {});
        }
    };
    if (caja1) actualizarCaja(caja1, monto1);
    if (caja2 && monto2 > 0) actualizarCaja(caja2, monto2);

    // Guardar todo
    const movsStr  = JSON.stringify(movimientos);
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
        }).catch(() => {});
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

window._renderizarFinanzasCompleto = async function() {
    if (window._geckoAPIPromise) await window._geckoAPIPromise;

    const _ls = window._localStorage_original || localStorage;
    const cajas = JSON.parse(_ls.getItem('gecko_cajas') || '[]');
    window.LISTA_CAJAS = cajas;

    const contenedor = document.getElementById('contenedor-cajas');
    if (!contenedor) return;

    const btnNueva = contenedor.querySelector('button');

    const estilos = {
        efectivo:            { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', emoji: '💵' },
        mercado_pago_celeste:{ bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20',    emoji: '🔵' },
        banco:               { bg: 'bg-zinc-800',        text: 'text-zinc-300',    border: 'border-zinc-700',        emoji: '🏦' }
    };

    Array.from(contenedor.children).forEach(el => { if (el !== btnNueva) el.remove(); });

    if (cajas.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'text-zinc-600 text-[12px] font-bold italic';
        empty.innerText = 'No hay cajas creadas. Creá una con el botón +.';
        contenedor.insertBefore(empty, btnNueva);
        return;
    }

    cajas.forEach(caja => {
        const est = estilos[caja.icono] || estilos.efectivo;
        const saldo = parseFloat(caja.saldo) || 0;
        const card = document.createElement('div');
        card.className = `flex flex-col gap-1 px-5 py-4 rounded-2xl border ${est.bg} ${est.border} min-w-[140px] cursor-pointer hover:scale-105 transition-all group relative`;
        card.onclick = () => window.editarCaja(caja.id);
        card.title = 'Click para editar';
        card.innerHTML = `
            <div class="flex items-center justify-between gap-3">
                <span class="text-lg">${est.emoji}</span>
                <span class="text-[9px] font-black uppercase tracking-widest ${est.text} opacity-70">${caja.icono === 'mercado_pago_celeste' ? 'MP' : caja.icono}</span>
            </div>
            <p class="text-[11px] font-black text-zinc-300 uppercase tracking-tight mt-1">${caja.nombre}</p>
            <p class="text-[18px] font-black ${saldo >= 0 ? est.text : 'text-red-400'} leading-none">$${Math.round(saldo).toLocaleString('es-AR')}</p>
            <span class="text-[8px] text-zinc-600 group-hover:text-zinc-400 transition-all uppercase tracking-widest mt-1">✏ editar</span>
        `;
        contenedor.insertBefore(card, btnNueva);
    });

    if (typeof window.updateCajaSelectors === 'function') window.updateCajaSelectors();
    if (typeof window.renderizarMovimientos === 'function') window.renderizarMovimientos();
};

window.renderizarFinanzas = window._renderizarFinanzasCompleto;

// Sistema de cajas — se inicializa con geckoDB_ready
document.addEventListener('geckoDB_ready', () => {

    window.guardarNuevaCaja = function() {
        const nombre = document.getElementById('nombreNuevaCaja')?.value?.trim();
        const icono  = document.getElementById('iconoNuevaCaja')?.value || 'efectivo';
        const saldo  = parseFloat(document.getElementById('saldoInicialCaja')?.value) || 0;

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
            }).catch(() => {});
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

    // Modal editar caja
    if (!document.getElementById('modalEditarCaja')) {
        const modal = document.createElement('div');
        modal.id = 'modalEditarCaja';
        modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);align-items:center;justify-content:center;padding:16px;';
        modal.innerHTML = `
            <div style="background:#141417;border:1px solid #27272a;border-radius:24px;width:100%;max-width:420px;padding:32px;position:relative;">
                <h2 style="color:#F15A24;font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin:0 0 24px 0;">Editar Caja</h2>
                <input type="hidden" id="editCajaId">
                <div style="margin-bottom:16px;">
                    <label style="display:block;color:#71717a;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Nombre</label>
                    <input type="text" id="editCajaNombre" style="width:100%;background:#09090b;border:1px solid #27272a;border-radius:12px;padding:12px 16px;color:white;font-size:14px;font-weight:700;outline:none;box-sizing:border-box;">
                </div>
                <div style="margin-bottom:16px;">
                    <label style="display:block;color:#71717a;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Estilo de Icono</label>
                    <select id="editCajaIcono" style="width:100%;background:#09090b;border:1px solid #27272a;border-radius:12px;padding:12px 16px;color:white;font-size:13px;font-weight:600;outline:none;cursor:pointer;">
                        <option value="efectivo">💵 Verde (Efectivo)</option>
                        <option value="mercado_pago_celeste">🔵 Azul MP (Billeteras)</option>
                        <option value="banco">🏦 Gris (Bancos)</option>
                    </select>
                </div>
                <div style="margin-bottom:24px;">
                    <label style="display:block;color:#71717a;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Saldo Actual ($)</label>
                    <input type="number" id="editCajaSaldo" style="width:100%;background:#09090b;border:1px solid #27272a;border-radius:12px;padding:12px 16px;color:#F15A24;font-size:18px;font-weight:900;outline:none;box-sizing:border-box;">
                </div>
                <div style="display:flex;gap:12px;">
                    <button onclick="window._eliminarCaja()" style="padding:12px 16px;background:transparent;border:1px solid #ef4444;color:#ef4444;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;flex-shrink:0;">🗑 Eliminar</button>
                    <button onclick="document.getElementById('modalEditarCaja').style.display='none'" style="flex:1;padding:12px;background:transparent;border:1px solid #27272a;color:#71717a;border-radius:12px;font-size:11px;font-weight:900;cursor:pointer;">Cancelar</button>
                    <button onclick="window._guardarEdicionCaja()" style="flex:1;padding:12px;background:#F15A24;border:none;color:white;border-radius:12px;font-size:11px;font-weight:900;cursor:pointer;">Guardar</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
    }

    window.editarCaja = function(id) {
        const cajas = JSON.parse(localStorage.getItem('gecko_cajas') || '[]');
        const caja = cajas.find(c => c.id === id);
        if (!caja) return;
        document.getElementById('editCajaId').value = id;
        document.getElementById('editCajaNombre').value = caja.nombre;
        document.getElementById('editCajaIcono').value = caja.icono || 'efectivo';
        document.getElementById('editCajaSaldo').value = caja.saldo || 0;
        document.getElementById('modalEditarCaja').style.display = 'flex';
    };

    window._guardarEdicionCaja = function() {
        const id     = document.getElementById('editCajaId').value;
        const nombre = document.getElementById('editCajaNombre').value.trim();
        const icono  = document.getElementById('editCajaIcono').value;
        const saldo  = parseFloat(document.getElementById('editCajaSaldo').value) || 0;

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
        }).catch(() => {});

        document.getElementById('modalEditarCaja').style.display = 'none';
        if (typeof window.mostrarExito === 'function') window.mostrarExito(`Caja "${nombre}" actualizada.`, '¡Guardado!');
        setTimeout(() => window.renderizarFinanzas(), 150);
    };

    window._eliminarCaja = function() {
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
        }).catch(() => {});
        document.getElementById('modalEditarCaja').style.display = 'none';
        if (typeof window.mostrarExito === 'function') window.mostrarExito('Caja eliminada.', '¡Listo!');
        setTimeout(() => window.renderizarFinanzas(), 150);
    };

    // Auto-render finanzas y pedidos al cargar
    const viewFin = document.getElementById('viewFinanzas');
    if (viewFin && !viewFin.classList.contains('hidden')) window.renderizarFinanzas();

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
// ── PARCHE FINAL: reemplazar renderOts de main.js después de que todo cargue ──
window.addEventListener('load', function() {
    setTimeout(function() {

        window.renderOts = function() {
            const tbody = document.getElementById('tbodyOts');
            if (!tbody) return;

            // Leer de localStorage (fuente unificada)
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
                tbody.innerHTML = `<tr><td colspan="7" class="py-20 text-center text-gray-400 font-medium italic">
                    ${mostrarHistorial ? 'Sin historial de OTs.' : 'No hay órdenes de trabajo activas.'}
                </td></tr>`;
                return;
            }

            const ESTADOS_OT = ['En Proceso','En Taller','Impresión','Terminaciones','Listo','Entregado'];
            const COLORES = {
                'En Proceso':'#F15A24','En Taller':'#8b5cf6','Impresión':'#3b82f6',
                'Terminaciones':'#f59e0b','Listo':'#10b981','Entregado':'#6b7280'
            };

            tbody.innerHTML = filtrados.map(ot => {
                const estado = ot.estado_ot || 'En Proceso';
                const color  = COLORES[estado] || '#F15A24';
                const saldo  = (ot.total||0) - (ot.sena||0);
                const opts   = ESTADOS_OT.map(e =>
                    `<option value="${e}" ${e===estado?'selected':''}>${e}</option>`
                ).join('');

                return `
                <tr class="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors border-b border-gray-100 dark:border-gray-800">
                    <td class="py-4 px-6 text-[11px] font-black uppercase text-zinc-500">#${ot.id}</td>
                    <td class="py-4 px-6">
                        <div class="flex flex-col">
                            <span class="text-[14px] font-extrabold dark:text-white uppercase">${ot.cliente||'S/N'}</span>
                            <span class="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter mt-0.5">${ot.fecha||''}</span>
                        </div>
                    </td>
                    <td class="py-4 px-6">
                        <div class="flex flex-wrap gap-1">
                            ${(ot.items||[]).map(it=>`<span class="text-[9px] font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded uppercase">${it.textoOpciones||it.nombre||''}</span>`).join('')}
                        </div>
                    </td>
                    <td class="py-4 px-6 text-right font-black text-white text-[14px]">
                        $${Math.round(ot.total||0).toLocaleString('es-AR')}
                    </td>
                    <td class="py-4 px-6 text-right font-black text-[14px] ${saldo>0?'text-red-400':'text-emerald-400'}">
                        $${Math.round(saldo).toLocaleString('es-AR')}
                    </td>
                    <td class="py-4 px-6 text-center">
    <div style="position:relative;display:inline-block;">
        <select
            id="estado-ot-${ot.id}"
            onchange="window._cambiarEstadoOTDesplegable('${ot.id}', this.value)"
            style="appearance:none;-webkit-appearance:none;background:${color}22;color:${color};border:1.5px solid ${color}55;padding:5px 28px 5px 12px;border-radius:20px;font-size:10px;font-weight:900;text-transform:uppercase;cursor:pointer;outline:none;letter-spacing:0.5px;font-family:inherit;min-width:110px;">
            ${opts}
        </select>
        <span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:${color};font-size:8px;pointer-events:none;">▼</span>
    </div>
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
                        </div>
                    </td>
                </tr>`;
            }).join('');
        };

        // Ejecutar inmediatamente si la tab OT está visible
        const tabOts = document.getElementById('tabOts');
        if (tabOts && !tabOts.classList.contains('hidden')) {
            window.renderOts();
        }

        console.log('🦎 GECKO-FIXES: renderOts parcheada con desplegable y botones.');
    }, 800); // 800ms — espera que main.js termine todo
});
console.log('🦎 GECKO-FIXES v2.0 cargado — preview, desplegable OT, seña multi-caja, botones presupuestos.');
