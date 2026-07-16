
document.addEventListener('DOMContentLoaded', async function geckoAuthInit() {
    try {
        const res = await fetch('api.php?endpoint=auth');
        if (res.status === 401 || !res.ok) { if (!window._geckoLocalMode) window.location.href = 'login.html'; return; }
        const data = await res.json();
        if (!data.logueado) { if (!window._geckoLocalMode) window.location.href = 'login.html'; return; }

        window.GECKO_USER = { nombre: data.nombre, rol: data.rol, email: data.email };

        if (data.rol === 'usuario') {
            const navFin = document.getElementById('nav-finanzas');
            if (navFin) navFin.style.display = 'none';
        }

        const iniciales = data.nombre.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
        const elInic   = document.getElementById('gecko-perfil-iniciales');
        const elNombre = document.getElementById('gecko-perfil-nombre');
        const elRol    = document.getElementById('gecko-perfil-rol');
        if (elInic)   elInic.textContent   = iniciales;
        if (elNombre) elNombre.textContent = data.nombre;
        if (elRol)    elRol.textContent    = data.rol === 'admin' ? 'Admin' : 'Usuario';

        const btnLogout = document.getElementById('gecko-logout-btn');
        if (btnLogout) {
            btnLogout.addEventListener('click', async () => {
                await fetch('api.php?endpoint=auth', { method: 'DELETE' });
                Object.keys(localStorage)
                    .filter(k => k.startsWith('gecko') || k.startsWith('GECKO') || k === 'clientes')
                    .forEach(k => localStorage.removeItem(k));
                if (!window._geckoLocalMode) window.location.href = 'login.html';
            });
        }
    } catch (_) {
        if (!window._geckoLocalMode) window.location.href = 'login.html';
    }
});

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
    let categoria = document.getElementById('categoriaPedido')?.value || 'Gráfica';
    if (window._gpmCategoriaActual) {
        categoria = window._gpmCategoriaActual;
        window._gpmCategoriaActual = null;
    }

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
    const _listaActual2 = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const _maxId2 = _listaActual2.length > 0 ? Math.max(..._listaActual2.map(p => parseInt(p.id) || 0)) : 1000;
    const id = Math.max(window.nextBudgetId || 0, parseInt(localStorage.getItem('gecko_nextId')) || 0, _maxId2) + 1;
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
    // Fix A: Guardar en localStorage SIN imágenes para evitar QuotaExceededError
    const listaParaStorage = lista.map(p => {
        const copia = { ...p };
        if (copia.imagenes) delete copia.imagenes;
        if (copia.items) copia.items = copia.items.map(it => {
            const itCopia = { ...it };
            if (itCopia.imagenBase64) delete itCopia.imagenBase64;
            if (itCopia.imagenes) delete itCopia.imagenes;
            return itCopia;
        });
        return copia;
    });
    try {
        localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(listaParaStorage));
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            if (typeof window.mostrarAdvertencia === 'function') {
                window.mostrarAdvertencia('El presupuesto se guardó en la base de datos, pero el almacenamiento local está lleno. Recargá la página para verlo.', 'Atención');
            }
        }
    }

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

const _EST = ['En Proceso', 'En Taller', 'Impresión', 'Terminaciones', 'Listo', 'Pendiente de Pago', 'Entregado'];
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
    if (doc.categoria === 'Gráfica' || doc.categoria === 'Industrial' || doc.categoria === 'Gráfica/Industrial') return doc.categoria;

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
        'Industrial': 'background:rgba(168,85,247,0.12);border:1px solid rgba(168,85,247,0.3);color:#c084fc;',
        'Gráfica/Industrial': 'background:rgba(202,138,4,0.12);border:1px solid rgba(202,138,4,0.3);color:#ca8a04;'
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

    // Cerrar todos los demás dropdowns abiertos
    document.querySelectorAll('[id^="estado-ot-dropdown-"]').forEach(d => {
        if (d.id !== 'estado-ot-dropdown-' + id) d.style.display = 'none';
    });

    const dd = document.getElementById('estado-ot-dropdown-' + id);
    if (!dd) return;

    const isOpen = dd.style.display === 'block';
    if (isOpen) {
        dd.style.display = 'none';
        return;
    }

    // Calcular posición del trigger en pantalla
    const trigger = event.currentTarget;
    const rect = trigger.getBoundingClientRect();

    // Posicionar el dropdown con fixed para que salga de cualquier contenedor con overflow
    dd.style.position = 'fixed';
    dd.style.top = (rect.bottom + 4) + 'px';
    dd.style.left = rect.left + 'px';
    dd.style.zIndex = '999999';
    dd.style.display = 'block';

    // Ajustar si se sale por la derecha de la pantalla
    setTimeout(() => {
        const ddRect = dd.getBoundingClientRect();
        if (ddRect.right > window.innerWidth - 8) {
            dd.style.left = (rect.right - ddRect.width) + 'px';
        }
        // Ajustar si se sale por abajo de la pantalla
        if (ddRect.bottom > window.innerHeight - 8) {
            dd.style.top = (rect.top - ddRect.height - 4) + 'px';
        }
    }, 0);
};

window._seleccionarEstadoOT = function (id, nuevoEstado) {
    const dd = document.getElementById('estado-ot-dropdown-' + id);
    if (dd) dd.style.display = 'none';

    const COLORES = {
        'En Proceso': '#F15A24',
        'En Taller': '#8b5cf6',
        'Impresión': '#3b82f6',
        'Terminaciones': '#f59e0b',
        'Listo': '#10b981',
        'Pendiente de Pago': '#ef4444',
        'Entregado': '#6b7280'
    };

    if (nuevoEstado === 'Entregado') {
        const modalExist = document.getElementById('_geckoModalArchivarOT');
        if (modalExist) modalExist.remove();

        const btnStyle = 'width:100%;padding:15px;border-radius:14px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.12em;cursor:pointer;transition:transform 0.15s ease, box-shadow 0.15s ease;';
        const btnHover = 'onmouseover="this.style.transform=\'scale(1.03)\';this.style.boxShadow=\'0 4px 20px rgba(0,0,0,0.3)\'" onmouseout="this.style.transform=\'scale(1)\';this.style.boxShadow=\'none\'"';

        const modal = document.createElement('div');
        modal.id = '_geckoModalArchivarOT';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(10,12,20,0.82);backdrop-filter:blur(5px);padding:16px;';
        modal.innerHTML = `
            <div style="background:#1e1f20;border:1px solid #2a2a2e;border-radius:22px;width:100%;max-width:420px;padding:36px;text-align:center;">
                <div style="width:52px;height:52px;background:rgba(16,185,129,0.1);border-radius:14px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px auto;">
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#10b981" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                </div>
                <p style="color:#F15A24;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 8px 0;">Orden de Trabajo</p>
                <h3 style="color:white;font-size:19px;font-weight:900;margin:0 0 10px 0;text-transform:uppercase;">¿Archivar trabajo?</h3>
                <p style="color:#71717a;font-size:13px;margin:0 0 28px 0;line-height:1.65;">Verificá que el trabajo esté cobrado antes de archivar. Si falta registrar un pago, usá el botón naranja.</p>
                <div style="display:flex;flex-direction:column;gap:10px;">
                    <button id="_geckoArchivarRegistrarPago" ${btnHover}
                        style="${btnStyle}background:#F15A24;border:none;color:white;">
                        Registrar Pago
                    </button>
                    <button id="_geckoArchivarConfirmar" ${btnHover}
                        style="${btnStyle}background:#27272a;border:1px solid #3f3f46;color:#a1a1aa;">
                        Ya está cobrado — <strong style="color:white;">ARCHIVAR</strong>
                    </button>
                    <button id="_geckoArchivarCancelar" ${btnHover}
                        style="${btnStyle}background:#1c1c1f;border:1px solid #27272a;color:#52525b;">
                        Cancelar
                    </button>
                </div>
            </div>`;
        document.body.appendChild(modal);

        document.getElementById('_geckoArchivarCancelar').onclick = function () {
            modal.remove();
        };

        modal.addEventListener('click', function (e) {
            if (e.target === modal) modal.remove();
        });

        document.getElementById('_geckoArchivarRegistrarPago').onclick = function () {
            modal.remove();
            // Abrir modal de pago. Al confirmar el pago, archivar automáticamente.
            window._archivarDespuesDePago = id;
            if (typeof window.abrirModalSena === 'function') window.abrirModalSena(id);
        };

        document.getElementById('_geckoArchivarConfirmar').onclick = function () {
            modal.remove();
            window._archivarOT(id);
        };

        return;
    }

    // Para todos los demás estados: aplicar directo sin modal
    let lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const idx = lista.findIndex(x => String(x.id) === String(id));
    if (idx === -1) return;
    lista[idx].estado_ot = nuevoEstado;
    localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(lista));

    const color = COLORES[nuevoEstado] || '#F15A24';
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
};

window._archivarOT = function (id) {
    let lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const idx = lista.findIndex(x => String(x.id) === String(id));
    if (idx !== -1) {
        lista[idx].estado_ot = 'Entregado';
        localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(lista));
    }
    if (typeof window.mostrarExito === 'function') window.mostrarExito('OT archivada correctamente.', '¡Listo!');
    setTimeout(() => { if (typeof window.renderOts === 'function') window.renderOts(); }, 300);
};

window._desarchivarOT = function (id) {
    if (!confirm('¿Querés desarchivar esta OT y devolverla a la lista activa?')) return;
    let lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const idx = lista.findIndex(x => String(x.id) === String(id));
    if (idx !== -1) {
        lista[idx].estado_ot = 'En Proceso';
        localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(lista));
    }
    if (typeof window.mostrarExito === 'function') window.mostrarExito('OT devuelta a lista activa.', '¡Listo!');
    setTimeout(() => { if (typeof window.renderOts === 'function') window.renderOts(); }, 300);
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
                    style="flex:1;padding:13px;background:transparent;border:1px solid #27272a;color:#71717a;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;" onmouseover="this.style.borderColor='#3f3f46';this.style.color='#a1a1aa'" onmouseout="this.style.borderColor='#27272a';this.style.color='#71717a'">Cancelar</button>
                <button onclick="window._confirmarEliminarOT('${id}')"
                    style="flex:1;padding:13px;background:#ef4444;border:none;color:white;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;" onmouseover="this.style.background='#f87171'" onmouseout="this.style.background='#ef4444'">Eliminar</button>
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
    filtrados.sort((a, b) => parseInt(b.id) - parseInt(a.id));

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-16 text-center text-zinc-500 font-medium italic">
            ${mostrarHistorial ? 'Sin historial de presupuestos.' : 'No hay presupuestos activos.'}
        </td></tr>`;
        return;
    }

    tbody.innerHTML = filtrados.map(p => {
        const resumen = p.titulo || (p.items || []).map(it => it.nombre || it.textoOpciones).filter(Boolean).join(' · ') || 'Sin título';
        const esOTEnHistorial = mostrarHistorial && p.status === 'OT';
        return `
        <tr draggable="true" data-drag-key="${p.id}" class="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors" style="cursor:grab;">
            <td class="py-4 px-6 font-black text-zinc-400 text-[11px]">#${p.id}</td>
            <td class="py-4 px-6 text-[12px] text-zinc-400 font-bold">${p.fecha || ''}</td>
            <td class="py-4 px-6">
                <span onclick="event.stopPropagation();window.abrirFichaCliente('${(p.cliente || '').replace(/'/g, "\\'")}')" class="font-extrabold dark:text-white text-[14px] uppercase cursor-pointer hover:text-gecko transition-colors" title="Ver ficha de cliente">${p.cliente || 'S/N'}</span>
            </td>
            <td class="py-4 px-6 max-w-[220px]">
                <div class="flex flex-col gap-1">
                    ${esOTEnHistorial ? '<span style="display:inline-block;background:rgba(241,90,36,0.1);color:#F15A24;padding:4px 10px;border-radius:8px;font-size:10px;text-transform:uppercase;font-weight:900;width:fit-content;">Convertido a OT #' + p.id + '</span>' : ''}
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
                    <button onclick="${esOTEnHistorial ? 'window.reutilizarPresupuesto(' + p.id + ')' : 'window.editarPresupuesto(' + p.id + ')'}" title="${esOTEnHistorial ? 'Reutilizar como nuevo presupuesto' : 'Editar'}"
                        class="p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 transition-all duration-150 hover:scale-110 hover:text-white hover:border-zinc-500">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    ${esOTEnHistorial ? '' : `<button onclick="window.convertirPresupuestoAOT(${p.id})" title="Convertir a OT"
                        class="p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 transition-all duration-150 hover:scale-110 hover:text-white hover:border-zinc-500">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </button>`}
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
                    style="flex:1;padding:13px;background:transparent;border:1px solid #27272a;color:#71717a;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;" onmouseover="this.style.borderColor='#3f3f46';this.style.color='#a1a1aa'" onmouseout="this.style.borderColor='#27272a';this.style.color='#71717a'">Cancelar</button>
                <button id="_geckoElimPresOk"
                    style="flex:1;padding:13px;background:#ef4444;border:none;color:white;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;" onmouseover="this.style.background='#f87171'" onmouseout="this.style.background='#ef4444'">Eliminar</button>
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
window._confirmarConversionOT = async function (id) {
    if (window._geckoAPIPromise) {
        await window._geckoAPIPromise;
    }
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
                        style="flex:1;padding:13px;background:transparent;border:1px solid #27272a;color:#71717a;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;" onmouseover="this.style.borderColor='#3f3f46';this.style.color='#a1a1aa'" onmouseout="this.style.borderColor='#27272a';this.style.color='#71717a'">No, después</button>
                    <button id="_geckoSenaSi"
                        style="flex:1;padding:13px;background:#22c55e;border:none;color:white;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;" onmouseover="this.style.background='#4ade80'" onmouseout="this.style.background='#22c55e'">Sí, registrar</button>
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
                    style="flex:1;padding:13px;background:transparent;border:1px solid #27272a;color:#71717a;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;" onmouseover="this.style.borderColor='#3f3f46';this.style.color='#a1a1aa'" onmouseout="this.style.borderColor='#27272a';this.style.color='#71717a'">Cancelar</button>
                <button id="_geckoConvOTOk"
                    style="flex:1;padding:13px;background:#F15A24;border:none;color:white;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;" onmouseover="this.style.background='#ff6b32'" onmouseout="this.style.background='#F15A24'">Convertir</button>
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

window.reutilizarPresupuesto = function (id) {
    const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const p = lista.find(x => String(x.id) === String(id));
    if (!p) return;

    window.presupuesto = (p.items || []).map(it => ({ ...it }));

    const clienteInput = document.getElementById('clienteNombre');
    if (clienteInput) clienteInput.value = p.cliente || '';

    window._editandoPresupuestoId = null;

    if (typeof window.renderizarPresupuesto === 'function') window.renderizarPresupuesto();
    if (typeof window.switchMenu === 'function') window.switchMenu('cotizadores');

    setTimeout(() => {
        const catSelect = document.getElementById('categoriaPedido');
        if (catSelect && p.categoria) catSelect.value = p.categoria;
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
    const ots = lista.filter(p => p.status === 'OT').sort((a, b) => parseInt(b.id) - parseInt(a.id));
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
        const COLORES_OT = { 'En Proceso': '#F15A24', 'En Taller': '#8b5cf6', 'Impresión': '#3b82f6', 'Terminaciones': '#f59e0b', 'Listo': '#10b981', 'Pendiente de Pago': '#ef4444', 'Entregado': '#6b7280' };
        const color = COLORES_OT[estado] || '#F15A24';
        const saldo = (ot.total || 0) - (ot.sena || 0);
        const estadoOpts = _EST.map(e =>
            `<div onclick="window._seleccionarEstadoOT('${ot.id}','${e}');event.stopPropagation()"
                  style="padding:8px 14px;cursor:pointer;font-size:10px;font-weight:900;text-transform:uppercase;color:${COLORES_OT[e] || '#F15A24'};letter-spacing:0.5px;"
                  onmouseover="this.style.background='#1f1f23'" onmouseout="this.style.background='transparent'">${e}</div>`
        ).join('');

        const _botonesAccion = mostrarHistorial ? `
    <td class="py-4 px-6 text-right">
        <div class="flex justify-end gap-2">
            <button onclick="window.verDocumento('${ot.id}')" title="Ver OT" class="p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 transition-all duration-150 hover:scale-110 hover:text-white hover:border-zinc-500"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
            <button onclick="window._desarchivarOT('${ot.id}')" title="Desarchivar" class="p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 transition-all duration-150 hover:scale-110 hover:text-amber-400 hover:border-amber-500/40"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg></button>
            <button onclick="window.eliminarOT('${ot.id}')" title="Eliminar" class="p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 transition-all duration-150 hover:scale-110 hover:text-red-400 hover:border-red-500/40"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
        </div>
    </td>` : `
    <td class="py-4 px-6 text-right">
        <div class="flex justify-end gap-2">
            <button onclick="window.verDocumento('${ot.id}')" title="Ver OT" class="p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 transition-all duration-150 hover:scale-110 hover:text-white hover:border-zinc-500"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
            <button onclick="window.editarOT('${ot.id}')" title="Editar OT" class="p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 transition-all duration-150 hover:scale-110 hover:text-white hover:border-zinc-500"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
            <button onclick="window.abrirModalSena('${ot.id}')" title="Registrar Pago" class="p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 transition-all duration-150 hover:scale-110 hover:text-white hover:border-zinc-500"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></button>
            <button onclick="window._revertirOTaPresupuesto('${ot.id}')" title="Revertir a Presupuesto" class="p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 transition-all duration-150 hover:scale-110 hover:text-amber-400 hover:border-amber-500/40"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg></button>
            <button onclick="window.eliminarOT('${ot.id}')" title="Eliminar OT" class="p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 transition-all duration-150 hover:scale-110 hover:text-red-400 hover:border-red-500/40"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
        </div>
    </td>`;

        return `
        <tr draggable="true" data-drag-key="${ot.id}" class="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors border-b border-gray-100 dark:border-gray-800" style="cursor:grab;">
            <td class="py-4 px-6 text-[11px] font-black uppercase text-zinc-500">#${ot.id}</td>
            <td class="py-4 px-6">
                <span class="text-[14px] font-extrabold dark:text-white uppercase">${ot.cliente || 'S/N'}</span>
            </td>
            <td class="py-4 px-6 max-w-[200px]">
                <div class="flex flex-col">
                    ${window._tagCategoria(ot)}
                    <span class="text-[11px] text-zinc-500 font-medium truncate">${ot.titulo || (ot.items || []).map(it => it.textoOpciones || it.nombre).filter(Boolean).join(' · ') || 'Sin título'}</span>
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
                    <div id="estado-ot-dropdown-${ot.id}" style="display:none;background:#18181b;border:1px solid #27272a;border-radius:14px;padding:6px;min-width:160px;box-shadow:0 8px 32px rgba(0,0,0,0.5);">
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
            ${_botonesAccion}
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

window._revertirOTaPresupuesto = function (id) {
    document.getElementById('_geckoConfirmRevertirOT')?.remove();
    const modal = document.createElement('div');
    modal.id = '_geckoConfirmRevertirOT';
    modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:10000;background:rgba(10,12,20,0.75);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = `
        <div style="background:#141417;border:1px solid #27272a;border-radius:24px;width:100%;max-width:420px;padding:32px;text-align:center;">
            <div style="width:56px;height:56px;background:rgba(241,90,36,0.1);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px auto;">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#F15A24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                </svg>
            </div>
            <h3 style="color:white;font-size:18px;font-weight:900;margin:0 0 8px 0;">Revertir a Presupuesto</h3>
            <p style="color:#71717a;font-size:13px;margin:0 0 28px 0;">
                La OT <strong style="color:white;">#${id}</strong> va a volver a la
                lista de Presupuestos para que puedas editar sus ítems y precios.
                Dejará de aparecer en la lista de OTs hasta que la vuelvas a convertir.
            </p>
            <div style="display:flex;gap:10px;">
                <button onclick="document.getElementById('_geckoConfirmRevertirOT').remove()"
                    style="flex:1;padding:13px;background:transparent;border:1px solid #27272a;color:#71717a;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;"
                    onmouseover="this.style.borderColor='#3f3f46';this.style.color='#a1a1aa'"
                    onmouseout="this.style.borderColor='#27272a';this.style.color='#71717a'">Cancelar</button>
                <button onclick="window._confirmarRevertirOT('${id}')"
                    style="flex:1;padding:13px;background:#F15A24;border:none;color:white;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;"
                    onmouseover="this.style.background='#d94e1a'"
                    onmouseout="this.style.background='#F15A24'">Revertir</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
};

window._confirmarRevertirOT = function (id) {
    let lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const idx = lista.findIndex(x => String(x.id) === String(id));
    if (idx === -1) return;

    lista[idx].status = 'Cotizado';
    localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(lista));
    document.getElementById('_geckoConfirmRevertirOT')?.remove();

    if (typeof window.renderOts === 'function') window.renderOts();
    if (typeof window.renderPresupuestos === 'function') window.renderPresupuestos();
    if (typeof window.mostrarExito === 'function') {
        window.mostrarExito('OT #' + id + ' revertida a Presupuesto.', '¡Listo!');
    }
};


// ══════════════════════════════════════════════════════
// EDITAR OT — modal
// ══════════════════════════════════════════════════════

window._otParsearDetalleAFicha = function (detalle) {
    const resultado = {};
    const observacionesExtra = [];
    if (!detalle) return resultado;

    const segmentos = detalle.split('|').map(s => s.trim()).filter(Boolean);
    segmentos.forEach(seg => {
        const match = seg.match(/^([^:]+):\s*(.+)$/);
        if (!match) { observacionesExtra.push(seg); return; }
        const etiqueta = match[1].trim().toLowerCase();
        const valor = match[2].trim();

        if (etiqueta.includes('medida')) {
            resultado.medidas = valor;
        } else if (etiqueta.includes('material')) {
            resultado.material = valor;
        } else if (etiqueta.includes('acabado') || etiqueta.includes('pintura') || etiqueta.includes('color')) {
            resultado.color = valor;
        } else if (etiqueta === 'ilum modelo') {
            resultado.iluminacion = resultado.iluminacion || {};
            resultado.iluminacion.estilo = valor;
        } else if (etiqueta === 'ilum cantidad') {
            resultado.iluminacion = resultado.iluminacion || {};
            resultado.iluminacion.cantidad = valor;
        } else if (etiqueta === 'ilum fuente') {
            resultado.iluminacion = resultado.iluminacion || {};
            resultado.iluminacion.fuente = valor;
        } else if (etiqueta === 'cant' || etiqueta.includes('cantidad')) {
            resultado.cantidad = valor;
        } else if (etiqueta.includes('ilum')) {
            // Compatibilidad con ítems viejos guardados antes de este cambio
            const matchIlum = valor.match(/^(.+)\s*\(([^)]+)\)\s*$/);
            resultado.iluminacion = resultado.iluminacion || {};
            if (matchIlum) {
                resultado.iluminacion.estilo = matchIlum[1].trim();
                resultado.iluminacion.fuente = matchIlum[2].trim();
            } else {
                resultado.iluminacion.estilo = valor;
            }
        } else {
            observacionesExtra.push(`${match[1].trim()}: ${valor}`);
        }
    });

    if (observacionesExtra.length > 0) {
        resultado.observaciones = observacionesExtra.join(' · ');
    }
    return resultado;
};

window.editarOT = function (id) {
    const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const ot = lista.find(x => String(x.id) === String(id));
    if (!ot) return;

    document.getElementById('modalEditarOT')?.remove();

    const itemsHTML = (ot.items || []).map((it, i) => {
        const ficha = it.otFicha || window._otParsearDetalleAFicha(it.otDetalle) || {};
        const esc = (v) => (v || '').toString().replace(/"/g, '&quot;');
        return `
        <div style="border:1px solid #1f1f1f;border-radius:12px;margin-bottom:10px;overflow:hidden;">
            <div onclick="window._otToggleItemFicha(${i})" style="display:flex;align-items:center;gap:12px;padding:12px 14px;cursor:pointer;background:#0f0f0f;">
                <span style="color:#3f3f46;font-size:9px;font-weight:900;font-family:monospace;min-width:20px;">${String(i + 1).padStart(2, '0')}</span>
                <span style="color:#a1a1aa;font-size:12px;font-weight:600;flex:1;">${it.nombre || it.textoOpciones || 'Ítem'}</span>
                <span style="color:#F15A24;font-size:12px;font-weight:900;">$${Math.round(it.costo || 0).toLocaleString('es-AR')}</span>
                <svg id="otItemChevron${i}" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#52525b" stroke-width="2" style="transition:transform 0.2s;"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
            </div>
            <div id="otItemFicha${i}" style="display:none;padding:16px 14px;background:#131314;border-top:1px solid #1f1f1f;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div>
                        <label class="gecko-label">Área / operario</label>
                        <input type="text" id="otItemArea${i}" class="gecko-input-line" value="${esc(ficha.area)}">
                    </div>
                    <div>
                        <label class="gecko-label">Material</label>
                        <input type="text" id="otItemMaterial${i}" class="gecko-input-line" value="${esc(ficha.material)}">
                    </div>
                    <div>
                        <label class="gecko-label">Medidas</label>
                        <input type="text" id="otItemMedidas${i}" class="gecko-input-line" value="${esc(ficha.medidas)}">
                    </div>
                    <div>
                        <label class="gecko-label">Espesor (mm)</label>
                        <input type="text" id="otItemEspesor${i}" class="gecko-input-line" value="${esc(ficha.espesor)}">
                    </div>
                    <div>
                        <label class="gecko-label">Color / acabado</label>
                        <input type="text" id="otItemColor${i}" class="gecko-input-line" value="${esc(ficha.color)}">
                    </div>
                    <div>
                        <label class="gecko-label">Sección</label>
                        <input type="text" id="otItemSeccion${i}" class="gecko-input-line" value="${esc(ficha.seccion)}">
                    </div>
                    <div>
                        <label class="gecko-label">Cantidad</label>
                        <input type="text" id="otItemCantidad${i}" class="gecko-input-line" value="${esc(ficha.cantidad)}">
                    </div>
                    <div>
                        <label class="gecko-label">Ubicación de archivo</label>
                        <input type="text" id="otItemUbicacion${i}" class="gecko-input-line" value="${esc(ficha.ubicacionArchivo)}">
                    </div>
                </div>
                <div style="display:flex;gap:24px;margin-top:14px;">
                    <label style="display:flex;align-items:center;gap:8px;color:#a1a1aa;font-size:12px;">
                        <input type="checkbox" id="otItemEstructura${i}" ${ficha.llevaEstructura ? 'checked' : ''} style="accent-color:#F15A24;">
                        Lleva estructura
                    </label>
                    <label style="display:flex;align-items:center;gap:8px;color:#a1a1aa;font-size:12px;">
                        <input type="checkbox" id="otItemVinilo${i}" ${ficha.vinilo ? 'checked' : ''} style="accent-color:#F15A24;">
                        Vinilo
                    </label>
                </div>
                <div style="margin-top:14px;">
                    <label class="gecko-label">Descripción de corte</label>
                    <input type="text" id="otItemDescCorte${i}" class="gecko-input-line" value="${esc(ficha.descripcionCorte)}">
                </div>
                ${it.tipo === 'corporeos' ? `
                <div style="background:#1e1f20;border:1px solid #333333;border-radius:12px;padding:14px;margin-top:14px;">
                    <p class="gecko-label" style="margin-bottom:10px;">Iluminación</p>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                        <div>
                            <label class="gecko-label" style="font-size:9px;">Estilo</label>
                            <input type="text" id="otItemIlumEstilo${i}" class="gecko-input-line" placeholder="Ej: Módulos LED" value="${esc(ficha.iluminacion?.estilo)}">
                        </div>
                        <div>
                            <label class="gecko-label" style="font-size:9px;">Tipo</label>
                            <input type="text" id="otItemIlumTipo${i}" class="gecko-input-line" placeholder="Ej: Blanco neutro" value="${esc(ficha.iluminacion?.tipo)}">
                        </div>
                        <div>
                            <label class="gecko-label" style="font-size:9px;">Cantidad</label>
                            <input type="text" id="otItemIlumCantidad${i}" class="gecko-input-line" value="${esc(ficha.iluminacion?.cantidad)}">
                        </div>
                        <div>
                            <label class="gecko-label" style="font-size:9px;">Fuente</label>
                            <input type="text" id="otItemIlumFuente${i}" class="gecko-input-line" value="${esc(ficha.iluminacion?.fuente)}">
                        </div>
                        <div style="grid-column:1/-1;">
                            <label class="gecko-label" style="font-size:9px;">Salida del cable</label>
                            <input type="text" id="otItemIlumCable${i}" class="gecko-input-line" placeholder="Ej: Por detrás" value="${esc(ficha.iluminacion?.salidaCable)}">
                        </div>
                    </div>
                </div>` : ''}
                <div style="margin-top:14px;" onclick="window._otActiveItemIndex = ${i}">
                    <label class="gecko-label">Plano de este ítem</label>
                    <div id="otItemImagenesPreview${i}" style="display:flex;flex-wrap:wrap;gap:8px;margin:8px 0;"></div>
                    <label for="otItemImagenesInput${i}" style="display:flex;align-items:center;gap:8px;background:#131314;border:1px dashed #333333;border-radius:12px;padding:9px 14px;cursor:pointer;color:#64748b;font-size:11px;font-weight:600;">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                        <span>Agregar imagen o pegar con Ctrl+V (clickeá acá primero)</span>
                    </label>
                    <input type="file" id="otItemImagenesInput${i}" accept="image/*" multiple style="display:none;" onchange="window._otItemAgregarImagenes(${i}, this)">
                </div>
                <div style="margin-top:14px;">
                    <label class="gecko-label">Observaciones del ítem</label>
                    <textarea id="otItemObs${i}" style="width:100%;color:rgb(161,161,170);font-size:13px;font-weight:500;outline:none;box-sizing:border-box;resize:none;font-family:inherit;min-height:60px;background:rgba(24,24,27,0.5);border:1px solid rgb(51,51,51);border-radius:12px;padding:10px 14px;">${ficha.observaciones || ''}</textarea>
                </div>
            </div>
        </div>`;
    }).join('');

    window._otEditImagenes = Array.isArray(ot.imagenes) ? [...ot.imagenes] : [];
    window._otItemImagenes = {};
    (ot.items || []).forEach((it, i) => {
        window._otItemImagenes[i] = Array.isArray(it.otFicha?.imagenes) ? [...it.otFicha.imagenes] : [];
    });
    window._otActiveItemIndex = null;

    const modal = document.createElement('div');
    modal.id = 'modalEditarOT';
    modal.className = 'gecko-modal-overlay';
    modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:10000;background:rgba(10,12,20,0.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);align-items:center;justify-content:center;padding:16px;overflow-y:auto;';

    modal.innerHTML = `
        <div class="gecko-modal-box max-w-2xl w-full mx-auto my-auto relative" style="max-width:960px;">
            <button onclick="document.getElementById('modalEditarOT').remove()" style="position:absolute;top:24px;right:24px;width:40px;height:40px;border-radius:12px;background:#18181b;border:1px solid #27272a;color:#71717a;display:flex;align-items:center;justify-content:center;transition:all 0.2s;cursor:pointer;" onmouseover="this.style.color='#ef4444';this.style.transform='rotate(90deg)'" onmouseout="this.style.color='#71717a';this.style.transform='rotate(0deg)'">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18L18 6M6 6l12 12"/></svg>
            </button>

            <p class="gecko-modal-subtitle">OT #${String(id).padStart(4, '0')} · ${(ot.cliente || '').toUpperCase()}</p>
            <h2 class="gecko-modal-title">EDITAR ORDEN DE TRABAJO</h2>

            <div class="space-y-5 mt-6">
                <div>
                    <label class="gecko-label">Cliente</label>
                    <input type="text" id="otEditCliente" class="gecko-input-line" value="${(ot.cliente || '').replace(/"/g, '&quot;')}">
                </div>

                <div>
                    <label class="gecko-label">Área / Operario asignado</label>
                    <input type="text" id="otEditArea" class="gecko-input-line" placeholder="Ej: Taller Gráfica · Juan" value="${(ot.area || '').replace(/"/g, '&quot;')}">
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div>
                        <label class="gecko-label">Fecha de ingreso</label>
                        <input type="date" id="otEditFechaIngreso" class="gecko-input-line" style="color-scheme:dark;cursor:pointer;" value="${window._geckoFechaDDMMYYYYaISO(ot.fecha_ingreso || '')}" onclick="this.showPicker && this.showPicker()">
                    </div>
                    <div>
                        <label class="gecko-label">Fecha de entrega</label>
                        <input type="date" id="otEditEntrega" class="gecko-input-line" style="color-scheme:dark;cursor:pointer;" value="${window._geckoFechaDDMMYYYYaISO(ot.fecha_entrega || '')}" onclick="this.showPicker && this.showPicker()">
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                    <div>
                        <label class="gecko-label">Teléfono / WhatsApp</label>
                        <input type="text" id="otEditTelefono" class="gecko-input-line" placeholder="Ej: 11 2345-6789" value="${(ot.telefono || '').replace(/"/g, '&quot;')}">
                    </div>
                    <div>
                        <label class="gecko-label">Atendido por</label>
                        <input type="text" id="otEditAtendidoPor" class="gecko-input-line" placeholder="Ej: María" value="${(ot.atendido_por || '').replace(/"/g, '&quot;')}">
                    </div>
                </div>

                <div class="mt-6">
                    <p style="color:#3f3f46;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 6px 0;">Ítems del trabajo — click para editar detalle</p>
                    <div style="background:#0f0f0f;border:1px solid #1f1f1f;border-radius:12px;padding:4px 14px;">
                        ${itemsHTML || '<p style="color:#3f3f46;font-size:11px;padding:8px 0;margin:0;">Sin ítems registrados.</p>'}
                    </div>
                </div>

                <div>
                    <label class="gecko-label">Instrucciones especiales de producción</label>
                    <textarea id="otEditInstrucciones" rows="4"
                        placeholder="Ej: Pintar el corpóreo con verde furioso, cuidar que no chorree la pintura en los bordes..."
                        style="width:100%;color:rgb(161,161,170);font-size:14px;font-weight:500;outline:none;box-sizing:border-box;resize:none;font-family:inherit;min-height:80px;background:rgba(24,24,27,0.5) !important;border:1px solid rgb(51,51,51) !important;border-radius:12px !important;padding:12px 16px !important;"
                        onfocus="this.style.setProperty('border-color','#F15A24','important')"
                        onblur="this.style.setProperty('border-color','#333333','important')">${ot.instrucciones || ''}</textarea>
                </div>

                <div class="gecko-label" style="margin-top:24px;">Planos / Referencias técnicas</div>
                <div id="otEditImagenesPreview" style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0;"></div>
                <label for="otEditImagenesInput" style="display:flex;align-items:center;gap:8px;background:#131314;border:1px dashed #333333;border-radius:12px;padding:11px 16px;cursor:pointer;color:#64748b;font-size:12px;font-weight:600;">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                    <span>Agregar imagen o pegar con Ctrl+V</span>
                </label>
                <input type="file" id="otEditImagenesInput" accept="image/*" multiple style="display:none;" onchange="window._otEditAgregarImagenes(this)">
            </div>

            <div class="gecko-modal-footer">
                <button class="gecko-btn-cancel" onclick="document.getElementById('modalEditarOT').remove()">Cancelar</button>
                <button class="gecko-btn-cancel" onclick="window._reimprimir('${id}')">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                    Reimprimir
                </button>
                <button class="gecko-btn-primary" onclick="window._guardarEdicionOT('${id}')">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                    Guardar cambios
                </button>
            </div>

        </div>`;

    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);

    const preview = document.getElementById('otEditImagenesPreview');
    if (preview && window._otEditImagenes.length > 0) {
        window._otEditImagenes.forEach(b64 => {
            const wrap = document.createElement('div');
            wrap.style.cssText = 'position:relative;';
            const img = document.createElement('img');
            img.src = b64;
            img.style.cssText = 'height:64px;width:auto;border-radius:8px;border:1px solid #333333;object-fit:cover;';
            const del = document.createElement('button');
            del.innerHTML = '✕';
            del.style.cssText = 'position:absolute;top:-5px;right:-5px;background:#ef4444;border:none;color:white;width:17px;height:17px;border-radius:50%;cursor:pointer;font-size:9px;padding:0;';
            del.onclick = () => {
                const idx = window._otEditImagenes.indexOf(b64);
                if (idx > -1) window._otEditImagenes.splice(idx, 1);
                wrap.remove();
            };
            wrap.appendChild(img);
            wrap.appendChild(del);
            preview.appendChild(wrap);
        });
    }

    Object.keys(window._otItemImagenes).forEach(idx => {
        const previewItem = document.getElementById('otItemImagenesPreview' + idx);
        if (previewItem && window._otItemImagenes[idx].length > 0) {
            window._otItemImagenes[idx].forEach(b64 => window._otItemRenderMiniatura(idx, b64));
        }
    });
};

window._otToggleItemFicha = function (idx) {
    const ficha = document.getElementById('otItemFicha' + idx);
    const chevron = document.getElementById('otItemChevron' + idx);
    if (!ficha) return;
    const abierto = ficha.style.display === 'block';
    ficha.style.display = abierto ? 'none' : 'block';
    if (chevron) chevron.style.transform = abierto ? 'rotate(0deg)' : 'rotate(180deg)';
};

window._otEditAgregarUnaImagen = function (file) {
    const preview = document.getElementById('otEditImagenesPreview');
    if (!preview) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const b64 = e.target.result;
        window._otEditImagenes = window._otEditImagenes || [];
        window._otEditImagenes.push(b64);
        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:relative;';
        const img = document.createElement('img');
        img.src = b64;
        img.style.cssText = 'height:64px;width:auto;border-radius:8px;border:1px solid #333333;object-fit:cover;';
        const del = document.createElement('button');
        del.innerHTML = '✕';
        del.style.cssText = 'position:absolute;top:-5px;right:-5px;background:#ef4444;border:none;color:white;width:17px;height:17px;border-radius:50%;cursor:pointer;font-size:9px;padding:0;';
        del.onclick = () => {
            const idx = window._otEditImagenes.indexOf(b64);
            if (idx > -1) window._otEditImagenes.splice(idx, 1);
            wrap.remove();
        };
        wrap.appendChild(img);
        wrap.appendChild(del);
        preview.appendChild(wrap);
    };
    reader.readAsDataURL(file);
};

window._otEditAgregarImagenes = function (input) {
    Array.from(input.files).forEach(file => window._otEditAgregarUnaImagen(file));
    input.value = '';
};

window._otItemRenderMiniatura = function (idx, b64) {
    const preview = document.getElementById('otItemImagenesPreview' + idx);
    if (!preview) return;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;';
    const img = document.createElement('img');
    img.src = b64;
    img.style.cssText = 'height:56px;width:auto;border-radius:8px;border:1px solid #333333;object-fit:cover;';
    const del = document.createElement('button');
    del.innerHTML = '✕';
    del.style.cssText = 'position:absolute;top:-5px;right:-5px;background:#ef4444;border:none;color:white;width:16px;height:16px;border-radius:50%;cursor:pointer;font-size:8px;padding:0;';
    del.onclick = (e) => {
        e.stopPropagation();
        const arr = window._otItemImagenes[idx] || [];
        const i2 = arr.indexOf(b64);
        if (i2 > -1) arr.splice(i2, 1);
        wrap.remove();
    };
    wrap.appendChild(img);
    wrap.appendChild(del);
    preview.appendChild(wrap);
};

window._otItemAgregarUnaImagen = function (idx, file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        const b64 = e.target.result;
        window._otItemImagenes[idx] = window._otItemImagenes[idx] || [];
        window._otItemImagenes[idx].push(b64);
        window._otItemRenderMiniatura(idx, b64);
    };
    reader.readAsDataURL(file);
};

window._otItemAgregarImagenes = function (idx, input) {
    Array.from(input.files).forEach(file => window._otItemAgregarUnaImagen(idx, file));
    input.value = '';
    window._otActiveItemIndex = idx;
};

document.addEventListener('paste', function (e) {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    if (!imageItem) return;

    const idxActivo = window._otActiveItemIndex;
    const fichaAbierta = idxActivo !== null && idxActivo !== undefined &&
        document.getElementById('otItemFicha' + idxActivo)?.style.display === 'block';

    if (fichaAbierta) {
        e.preventDefault();
        const blob = imageItem.getAsFile();
        if (blob) window._otItemAgregarUnaImagen(idxActivo, blob);
        return;
    }

    const preview = document.getElementById('otEditImagenesPreview');
    if (!preview) return;
    e.preventDefault();
    const blob = imageItem.getAsFile();
    if (blob) window._otEditAgregarUnaImagen(blob);
});

window._guardarEdicionOT = function (id) {
    let lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const idx = lista.findIndex(x => String(x.id) === String(id));
    if (idx === -1) return;

    lista[idx].cliente = document.getElementById('otEditCliente')?.value?.trim() || lista[idx].cliente;
    lista[idx].area = document.getElementById('otEditArea')?.value?.trim() || '';
    lista[idx].fecha_entrega = window._geckoFechaISOaDDMMYYYY(document.getElementById('otEditEntrega')?.value || '') || lista[idx].fecha_entrega || '';
    lista[idx].fecha_ingreso = window._geckoFechaISOaDDMMYYYY(document.getElementById('otEditFechaIngreso')?.value || '') || lista[idx].fecha_ingreso || '';
    lista[idx].telefono = document.getElementById('otEditTelefono')?.value?.trim() || '';
    lista[idx].atendido_por = document.getElementById('otEditAtendidoPor')?.value?.trim() || '';
    lista[idx].instrucciones = document.getElementById('otEditInstrucciones')?.value?.trim() || '';
    lista[idx].imagenes = window._otEditImagenes || lista[idx].imagenes || [];

    lista[idx].items = (lista[idx].items || []).map((it, i) => {
        it.otFicha = {
            area: document.getElementById('otItemArea' + i)?.value?.trim() || '',
            material: document.getElementById('otItemMaterial' + i)?.value?.trim() || '',
            medidas: document.getElementById('otItemMedidas' + i)?.value?.trim() || '',
            espesor: document.getElementById('otItemEspesor' + i)?.value?.trim() || '',
            color: document.getElementById('otItemColor' + i)?.value?.trim() || '',
            seccion: document.getElementById('otItemSeccion' + i)?.value?.trim() || '',
            cantidad: document.getElementById('otItemCantidad' + i)?.value?.trim() || '',
            ubicacionArchivo: document.getElementById('otItemUbicacion' + i)?.value?.trim() || '',
            llevaEstructura: document.getElementById('otItemEstructura' + i)?.checked || false,
            vinilo: document.getElementById('otItemVinilo' + i)?.checked || false,
            descripcionCorte: document.getElementById('otItemDescCorte' + i)?.value?.trim() || '',
            observaciones: document.getElementById('otItemObs' + i)?.value?.trim() || '',
            iluminacion: it.tipo === 'corporeos' ? {
                estilo: document.getElementById('otItemIlumEstilo' + i)?.value?.trim() || '',
                tipo: document.getElementById('otItemIlumTipo' + i)?.value?.trim() || '',
                cantidad: document.getElementById('otItemIlumCantidad' + i)?.value?.trim() || '',
                fuente: document.getElementById('otItemIlumFuente' + i)?.value?.trim() || '',
                salidaCable: document.getElementById('otItemIlumCable' + i)?.value?.trim() || ''
            } : (it.otFicha?.iluminacion || undefined),
            imagenes: window._otItemImagenes[i] || it.otFicha?.imagenes || []
        };
        return it;
    });

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

    const inputStyle = 'width:100%;background:rgba(24,24,27,0.5);border:1px solid #333333;border-radius:12px;padding:11px 14px;color:white;font-size:13px;font-weight:600;outline:none;box-sizing:border-box;font-family:inherit;transition:border-color 0.2s;';
    const labelStyle = 'display:block;color:#52525b;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;';

    const modal = document.createElement('div');
    modal.id = 'modalSena';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);padding:16px;';

    const formasPago = ['Efectivo', 'Transferencia', 'Débito', 'Crédito', 'MercadoPago'];
    const cajasList = cajas.map(c => c.nombre);
    const cajasDefault = cajasList[0] || '';

    modal.innerHTML = `
        <div style="background:#141414;border-radius:20px;width:100%;max-width:720px;max-height:95vh;overflow-y:auto;display:flex;flex-direction:column;position:relative;">

            <div style="padding:32px 44px 24px 44px;border-bottom:1px solid #1f1f1f;display:flex;justify-content:space-between;align-items:flex-start;">
                <div>
                    <h2 style="color:white;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:-0.02em;margin:0 0 4px 0;">REGISTRO DE PAGO</h2>
                    <p style="color:#F15A24;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;margin:0;">OT #${String(id).padStart(4, '0')} · ${(ot.cliente || '').toUpperCase()}</p>
                </div>
                <button onclick="document.getElementById('modalSena').remove()"
                    style="width:36px;height:36px;border-radius:10px;background:#1f1f1f;border:1px solid #2a2a2a;color:#52525b;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all 0.2s;"
                    onmouseover="this.style.background='#2a1212';this.style.borderColor='#ef4444';this.style.color='#ef4444';this.style.transform='rotate(90deg)'"
                    onmouseout="this.style.background='#1f1f1f';this.style.borderColor='#2a2a2a';this.style.color='#52525b';this.style.transform='rotate(0deg)'">
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>

            <div style="padding:32px 44px;display:flex;flex-direction:column;gap:28px;flex:1;">

                <!-- Recuadros Total / Pagado / Saldo -->
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
                    <div style="background:#0f0f0f;border:1px solid #1f1f1f;border-radius:12px;padding:14px;">
                        <p style="color:#3f3f46;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 6px 0;">Total OT</p>
                        <p style="color:white;font-size:16px;font-weight:900;margin:0;">$${Math.round(ot.total || 0).toLocaleString('es-AR')}</p>
                    </div>
                    <div style="background:#0f0f0f;border:1px solid #1f1f1f;border-radius:12px;padding:14px;">
                        <p style="color:#3f3f46;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 6px 0;">Pagado</p>
                        <p style="color:#10b981;font-size:16px;font-weight:900;margin:0;">$${Math.round(ot.sena || 0).toLocaleString('es-AR')}</p>
                    </div>
                    <div style="background:#0f0f0f;border:1px solid ${totalPendiente > 0 ? '#ef444455' : '#10b98155'};border-radius:12px;padding:14px;">
                        <p style="color:#3f3f46;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 6px 0;">Saldo</p>
                        <p style="color:${totalPendiente > 0 ? '#ef4444' : '#10b981'};font-size:16px;font-weight:900;margin:0;">$${Math.round(totalPendiente).toLocaleString('es-AR')}</p>
                    </div>
                </div>

                <!-- Tipo de pago -->
                <div>
                    <label style="${labelStyle}">Tipo de pago</label>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <button id="tipoPagoSeña" onclick="window._toggleTipoPago('seña')"
                            style="padding:13px;background:#27272a;border:1px solid #3f3f46;color:white;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;cursor:pointer;transition:all 0.2s;">
                            Seña / Parcial
                        </button>
                        <button id="tipoPagoSaldo" onclick="window._toggleTipoPago('saldo')"
                            style="padding:13px;background:transparent;border:1px solid #2a2a2a;color:#52525b;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;cursor:pointer;transition:all 0.2s;">
                            Saldo Final
                        </button>
                    </div>
                </div>

                <!-- Pago 1 -->
                <div style="background:#0f0f0f;border:1px solid #1f1f1f;border-radius:14px;padding:18px;">
                    <p style="color:#F15A24;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 14px 0;">Pago 1</p>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                        <div>
                            <label style="${labelStyle}">Monto</label>
                            <input type="number" id="sena1Monto" placeholder="$0" style="${inputStyle}" oninput="window._calcularResto('${id}')"
                                onfocus="this.style.borderColor='#F15A24'" onblur="this.style.borderColor='#333333'">
                        </div>
                        <div>
                            <label style="${labelStyle}">Forma de pago</label>
                            ${window._htmlDropdownPago('sena1Forma', formasPago, 'Efectivo')}
                        </div>
                    </div>
                    <div style="margin-bottom:12px;">
                        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;color:#a1a1aa;font-size:11px;font-weight:700;">
                            <input type="checkbox" id="sena1DescChk" onchange="window._toggleDescuentoPago(1)" style="width:16px;height:16px;accent-color:#F15A24;cursor:pointer;">
                            Aplicar descuento a este pago
                        </label>
                        <div id="sena1DescWrap" style="display:none;margin-top:10px;display:grid;grid-template-columns:90px 1fr;gap:10px;">
                            <select id="sena1DescTipo" style="background:#131314;border:1px solid #333333;border-radius:12px;padding:11px 10px;color:white;font-size:12px;font-weight:700;">
                                <option value="pct">%</option>
                                <option value="fijo">$ fijo</option>
                            </select>
                            <input type="number" id="sena1DescValor" placeholder="0" style="background:#131314;border:1px solid #333333;border-radius:12px;padding:11px 14px;color:white;font-size:14px;font-weight:600;outline:none;">
                        </div>
                    </div>
                    <div>
                        <label style="${labelStyle}">Ingresa a caja</label>
                        ${cajasList.length > 0 ? `
                        <select id="sena1Caja" style="${inputStyle} appearance:none;-webkit-appearance:none;-moz-appearance:none;background-image:url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 24 24%27 stroke=%27%23ffffff%27 stroke-width=%272.5%27%3E%3Cpath stroke-linecap=%27round%27 stroke-linejoin=%27round%27 d=%27m19 9-7 7-7-7%27/%3E%3C/svg%3E');background-repeat:no-repeat;background-position:right 14px center;background-size:13px;cursor:pointer;"
                            onfocus="this.style.borderColor='#F15A24'" onblur="this.style.borderColor='#333333'">
                            ${cajasList.map(c => `<option value="${c}" ${c === cajasDefault ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>` : `<p style="color:#ef4444;font-size:11px;">No hay cajas creadas. Creá una en Finanzas.</p>`}
                    </div>
                </div>

                <!-- Toggle segundo pago -->
                <button id="btnToggleSegundoPago" onclick="window._toggleSegundoPago && window._toggleSegundoPago('${id}')"
                    style="background:transparent;border:1px dashed #2a2a2a;color:#52525b;border-radius:12px;padding:12px;font-size:11px;font-weight:700;cursor:pointer;text-align:center;transition:all 0.2s;"
                    onmouseover="this.style.borderColor='#3f3f46';this.style.color='#a1a1aa'"
                    onmouseout="this.style.borderColor='#2a2a2a';this.style.color='#52525b'">
                    + Agregar segundo pago (ej: parte en transferencia + parte en efectivo)
                </button>

                <div id="bloquePago2" style="display:none;background:#0f0f0f;border:1px solid #1f1f1f;border-radius:14px;padding:18px;">
                    <p style="color:#F15A24;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;margin:0 0 14px 0;">Pago 2</p>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                        <div>
                            <label style="${labelStyle}">Monto</label>
                            <input type="number" id="sena2Monto" placeholder="$0" style="${inputStyle}"
                                onfocus="this.style.borderColor='#F15A24'" onblur="this.style.borderColor='#333333'">
                        </div>
                        <div>
                            <label style="${labelStyle}">Forma de pago</label>
                            ${window._htmlDropdownPago('sena2Forma', formasPago, 'Efectivo')}
                        </div>
                    </div>
                    <div style="margin-bottom:12px;">
                        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;color:#a1a1aa;font-size:11px;font-weight:700;">
                            <input type="checkbox" id="sena2DescChk" onchange="window._toggleDescuentoPago(2)" style="width:16px;height:16px;accent-color:#F15A24;cursor:pointer;">
                            Aplicar descuento a este pago
                        </label>
                        <div id="sena2DescWrap" style="display:none;margin-top:10px;display:grid;grid-template-columns:90px 1fr;gap:10px;">
                            <select id="sena2DescTipo" style="background:#131314;border:1px solid #333333;border-radius:12px;padding:11px 10px;color:white;font-size:12px;font-weight:700;">
                                <option value="pct">%</option>
                                <option value="fijo">$ fijo</option>
                            </select>
                            <input type="number" id="sena2DescValor" placeholder="0" style="background:#131314;border:1px solid #333333;border-radius:12px;padding:11px 14px;color:white;font-size:14px;font-weight:600;outline:none;">
                        </div>
                    </div>
                    <div>
                        <label style="${labelStyle}">Ingresa a caja</label>
                        ${cajasList.length > 0 ? `
                        <select id="sena2Caja" style="${inputStyle} appearance:none;-webkit-appearance:none;-moz-appearance:none;background-image:url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 24 24%27 stroke=%27%23ffffff%27 stroke-width=%272.5%27%3E%3Cpath stroke-linecap=%27round%27 stroke-linejoin=%27round%27 d=%27m19 9-7 7-7-7%27/%3E%3C/svg%3E');background-repeat:no-repeat;background-position:right 14px center;background-size:13px;cursor:pointer;"
                            onfocus="this.style.borderColor='#F15A24'" onblur="this.style.borderColor='#333333'">
                            ${cajasList.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>` : ''}
                    </div>
                </div>

                <!-- Nota opcional -->
                <div>
                    <label style="${labelStyle}">Nota (opcional)</label>
                    <input type="text" id="senaNota" placeholder="Ej: Seña 60% por transferencia"
                        style="width:100%;background:transparent;border:none;border-bottom:1px solid #1f1f1f;outline:none;color:white;font-size:13px;font-weight:600;padding:0 0 8px 0;font-family:inherit;box-sizing:border-box;">
                </div>

            </div>

            <div style="padding:20px 44px 32px 44px;border-top:1px solid #1f1f1f;display:flex;gap:12px;">
                <button onclick="document.getElementById('modalSena').remove()"
                    style="flex:1;padding:15px;background:transparent;border:1px solid #2a2a2a;color:#52525b;border-radius:14px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.12em;cursor:pointer;transition:all 0.15s;"
                    onmouseover="this.style.borderColor='#3f3f46';this.style.color='#a1a1aa'"
                    onmouseout="this.style.borderColor='#2a2a2a';this.style.color='#52525b'">
                    Cancelar
                </button>
                <button onclick="window._registrarSena('${id}')"
                    style="flex:2;padding:15px;background:#F15A24;border:none;color:white;border-radius:14px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.12em;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.15s;"
                    onmouseover="this.style.background='#d94e1a'"
                    onmouseout="this.style.background='#F15A24'">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                    Registrar Pago
                </button>
            </div>

        </div>`;

    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);

    // Marcar "Seña/Parcial" como seleccionado visualmente por defecto al abrir
    window._tipoPagoActual = window._tipoPagoActual || 'seña';
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

window._toggleSegundoPago = function () {
    const container = document.getElementById('bloquePago2');
    const btn = document.getElementById('btnToggleSegundoPago');
    if (!container) return;
    const visible = container.style.display !== 'none';
    container.style.display = visible ? 'none' : 'block';
    if (btn) btn.textContent = visible
        ? '+ Agregar segundo pago (ej: parte en transferencia + parte en efectivo)'
        : '− Quitar segundo pago';
};

window._toggleDescuentoPago = function (n) {
    const wrap = document.getElementById(`sena${n}DescWrap`);
    const chk = document.getElementById(`sena${n}DescChk`);
    if (!wrap || !chk) return;
    wrap.style.display = chk.checked ? 'grid' : 'none';
    if (!chk.checked) {
        const valor = document.getElementById(`sena${n}DescValor`);
        if (valor) valor.value = '';
    }
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

    // ── Descuento por pago (MEJ: pagos combinados con descuento en efectivo) ──
    // El monto nominal (monto1/monto2) es lo que se descuenta de la deuda del
    // presupuesto. El monto real es lo que efectivamente entra a la caja.
    const desc1Chk = document.getElementById('sena1DescChk')?.checked || false;
    const desc1Tipo = document.getElementById('sena1DescTipo')?.value || 'pct';
    const desc1Valor = parseFloat(document.getElementById('sena1DescValor')?.value) || 0;
    let descMonto1 = 0;
    let montoReal1 = monto1;
    if (desc1Chk && desc1Valor > 0 && monto1 > 0) {
        descMonto1 = desc1Tipo === 'pct' ? (monto1 * desc1Valor / 100) : Math.min(desc1Valor, monto1);
        montoReal1 = monto1 - descMonto1;
    }

    const desc2Chk = document.getElementById('sena2DescChk')?.checked || false;
    const desc2Tipo = document.getElementById('sena2DescTipo')?.value || 'pct';
    const desc2Valor = parseFloat(document.getElementById('sena2DescValor')?.value) || 0;
    let descMonto2 = 0;
    let montoReal2 = monto2;
    if (desc2Chk && desc2Valor > 0 && monto2 > 0) {
        descMonto2 = desc2Tipo === 'pct' ? (monto2 * desc2Valor / 100) : Math.min(desc2Valor, monto2);
        montoReal2 = monto2 - descMonto2;
    }

    const totalPago = monto1 + monto2;
    const fecha = new Date().toLocaleDateString('es-AR');

    // Actualizar OT
    let lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const idx = lista.findIndex(x => String(x.id) === String(id));
    if (idx === -1) return;

    lista[idx].sena = (lista[idx].sena || 0) + totalPago;
    localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(lista));

    try {
        listaPresupuestos = lista;
    } catch (e) {
        window.listaPresupuestos = lista;
    }

    // Registrar movimientos en finanzas
    const _ls = window._localStorage_original || localStorage;
    const movimientos = JSON.parse(_ls.getItem('gecko_movimientos') || '[]');
    const desc = tipo === 'saldo' ? 'Saldo final' : 'Seña';
    const cliente = lista[idx].cliente || 'Cliente';

    const mov1 = {
        id: 'mov_' + Date.now(),
        fecha, caja: caja1, tipo: 'Ingreso', monto: montoReal1,
        detalle: `${desc} OT#${id} - ${cliente}${descMonto1 > 0 ? ` (Nominal $${Math.round(monto1).toLocaleString('es-AR')}, con descuento)` : ''}${nota ? ' · ' + nota : ''}`,
        categoria: tipo === 'saldo' ? 'Cobro Final' : 'Seña',
        otsAfectadas: [{ id: id, monto: monto1 }]
    };
    movimientos.push(mov1);

    if (descMonto1 > 0) {
        movimientos.push({
            id: 'mov_' + (Date.now() + 10),
            fecha, caja: caja1, tipo: 'Descuento', monto: descMonto1,
            detalle: `Descuento otorgado - OT#${id} - ${cliente}${nota ? ' · ' + nota : ''}`,
            categoria: 'Descuento Otorgado'
        });
    }

    let mov2 = null;
    if (monto2 > 0) {
        mov2 = {
            id: 'mov_' + (Date.now() + 1),
            fecha, caja: caja2, tipo: 'Ingreso', monto: montoReal2,
            detalle: `${desc} OT#${id} - ${cliente} (${forma2})${descMonto2 > 0 ? ` (Nominal $${Math.round(monto2).toLocaleString('es-AR')}, con descuento)` : ''}${nota ? ' · ' + nota : ''}`,
            categoria: tipo === 'saldo' ? 'Cobro Final' : 'Seña',
            otsAfectadas: [{ id: id, monto: monto2 }]
        };
        movimientos.push(mov2);
    }

    if (descMonto2 > 0) {
        movimientos.push({
            id: 'mov_' + (Date.now() + 11),
            fecha, caja: caja2, tipo: 'Descuento', monto: descMonto2,
            detalle: `Descuento otorgado - OT#${id} - ${cliente} (${forma2})${nota ? ' · ' + nota : ''}`,
            categoria: 'Descuento Otorgado'
        });
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
    if (caja1) actualizarCaja(caja1, montoReal1);
    if (caja2 && montoReal2 > 0) actualizarCaja(caja2, montoReal2);

    // Guardar todo
    const movsStr = JSON.stringify(movimientos);
    const cajasStr = JSON.stringify(cajas);
    _ls.setItem('gecko_movimientos', movsStr);
    _ls.setItem('gecko_cajas', cajasStr);
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

    // Actualizar el caché interno de gecko-api.js para evitar
    // que se vuelvan a sincronizar (y choquen) más adelante
    if (window._geckoUpdateCache) {
        window._geckoUpdateCache('gecko_movimientos', movimientos);
        window._geckoUpdateCache('gecko_cajas', cajas);
    }

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
    if (typeof window._geckoRenderFijo === 'function') {
        window._geckoRenderFijo();
    } else if (typeof window.renderClientes === 'function') {
        window.renderClientes();
    }

    // Auto-archivar si el pago vino desde el modal de archivo
    if (window._archivarDespuesDePago) {
        const _idParaArchivar = window._archivarDespuesDePago;
        window._archivarDespuesDePago = null;
        setTimeout(() => { window._archivarOT(_idParaArchivar); }, 400);
    }
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

    const btnNueva = contenedor.querySelector(':scope > button');

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
        card.onclick = (e) => { if (e.isTrusted) window._verHistorialCaja(caja.id); };
        card.style.position = 'relative';
        card.innerHTML = `
            <button onclick="event.stopPropagation(); window.editarCaja('${caja.id}')"
                title="Editar caja"
                style="position:absolute;top:14px;right:14px;width:26px;height:26px;border-radius:8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background 0.15s;z-index:2;"
                onmouseover="this.style.background='rgba(255,255,255,0.15)'"
                onmouseout="this.style.background='rgba(255,255,255,0.06)'">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#a1a1aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </button>
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

window._eliminarMovimientoDesdeHistorial = function (cajaId, movId) {
    const _ls = window._localStorage_original || localStorage;
    const movs = JSON.parse(_ls.getItem('gecko_movimientos') || '[]');
    const mov = movs.find(m => String(m.id) === String(movId));
    if (!mov) return;

    document.getElementById('_geckoConfirmElimMovHist')?.remove();
    const modal = document.createElement('div');
    modal.id = '_geckoConfirmElimMovHist';
    modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:10003;background:rgba(10,12,20,0.75);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = `
        <div style="background:#141417;border:1px solid #27272a;border-radius:24px;width:100%;max-width:400px;padding:32px;text-align:center;">
            <div style="width:56px;height:56px;background:rgba(239,68,68,0.1);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px auto;">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#ef4444" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </div>
            <h3 style="color:white;font-size:18px;font-weight:900;margin:0 0 8px 0;">Eliminar movimiento</h3>
            <p style="color:#71717a;font-size:13px;margin:0 0 28px 0;">Se eliminará <strong style="color:white;">${mov.detalle}</strong> y se revertirá el saldo en la caja.</p>
            <div style="display:flex;gap:10px;">
                <button onclick="document.getElementById('_geckoConfirmElimMovHist').remove()"
                    style="flex:1;padding:13px;background:transparent;border:1px solid #27272a;color:#71717a;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">Cancelar</button>
                <button id="_geckoElimMovHistOk"
                    style="flex:1;padding:13px;background:#ef4444;border:none;color:white;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;">Eliminar</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    document.getElementById('_geckoElimMovHistOk').onclick = function () {
        modal.remove();
        const cajas = JSON.parse(_ls.getItem('gecko_cajas') || '[]');
        const cajaObj = cajas.find(c => c.nombre === mov.caja);
        if (cajaObj) {
            if (mov.tipo === 'Ingreso') { cajaObj.saldo -= mov.monto; } else { cajaObj.saldo += mov.monto; }
            _ls.setItem('gecko_cajas', JSON.stringify(cajas));
            window.LISTA_CAJAS = cajas;
        }
        const dbMovs = JSON.parse(_ls.getItem('gecko_movimientos') || '[]');
        const dbIndex = dbMovs.findIndex(m => String(m.id) === String(mov.id));
        if (dbIndex !== -1) {
            dbMovs.splice(dbIndex, 1);
            _ls.setItem('gecko_movimientos', JSON.stringify(dbMovs));
            window.LISTA_MOVIMIENTOS = dbMovs;
        }
        if (typeof window.renderizarFinanzas === 'function') window.renderizarFinanzas();
        if (typeof window.renderizarMovimientos === 'function') window.renderizarMovimientos();
        if (typeof window.mostrarExito === 'function') window.mostrarExito('Movimiento eliminado', '¡Listo!');
        window._verHistorialCaja(cajaId);
    };
};

window._verHistorialCaja = function (cajaId) {
    const _ls = window._localStorage_original || localStorage;
    const cajas = window.LISTA_CAJAS || JSON.parse(_ls.getItem('gecko_cajas') || '[]');
    const caja = cajas.find(c => c.id === cajaId);
    if (!caja) return;

    const movs = JSON.parse(_ls.getItem('gecko_movimientos') || '[]')
        .filter(m => m.caja === caja.nombre)
        .sort((a, b) => {
            const idA = (a.id || '').toString().split('_')[1] || 0;
            const idB = (b.id || '').toString().split('_')[1] || 0;
            return idB - idA;
        })
        .slice(0, 100);

    document.getElementById('modalHistorialCaja')?.remove();
    const modal = document.createElement('div');
    modal.id = 'modalHistorialCaja';
    modal.className = 'gecko-modal-overlay';
    modal.style.cssText = 'display:flex;position:fixed;inset:0;z-index:10002;background:rgba(10,12,20,0.75);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:20px;';

    const filasHTML = movs.length === 0
        ? `<p style="color:#52525b;font-size:12px;font-style:italic;text-align:center;padding:24px 0;">No hay movimientos registrados en esta caja todavía.</p>`
        : movs.map(m => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #27272a;gap:10px;">
                <div style="min-width:0;flex:1;">
                    <p style="color:white;font-size:12px;font-weight:700;margin:0 0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.detalle || 'Sin descripción'}</p>
                    <p style="color:#71717a;font-size:10px;margin:0;">${m.fecha || ''} · ${m.categoria || 'Varios'}</p>
                </div>
                <p style="font-size:13px;font-weight:900;margin:0;padding-left:12px;flex-shrink:0;color:${m.tipo === 'Ingreso' ? '#22c55e' : '#ef4444'};">
                    ${m.tipo === 'Ingreso' ? '+' : '-'}$${Math.round(m.monto || 0).toLocaleString('es-AR')}
                </p>
                <button onclick="window._eliminarMovimientoDesdeHistorial('${caja.id}', '${m.id || ''}')" style="width:30px;height:30px;border-radius:9px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);color:#a1a1aa;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.2s;cursor:pointer;" onmouseover="this.style.background='rgba(239,68,68,0.15)';this.style.borderColor='rgba(239,68,68,0.3)';this.style.color='#ef4444'" onmouseout="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.05)';this.style.color='#a1a1aa'" title="Eliminar">
                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
            </div>`).join('');

    modal.innerHTML = `
        <div class="gecko-modal-box" style="max-width:620px;width:100%;position:relative;">
            <button onclick="this.closest('.gecko-modal-overlay').remove()" style="position:absolute;top:24px;right:24px;width:40px;height:40px;border-radius:12px;background:#18181b;border:1px solid #27272a;color:#71717a;display:flex;align-items:center;justify-content:center;transition:all 0.2s;cursor:pointer;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#71717a'">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
            <p class="gecko-modal-subtitle">Finanzas / Cajas</p>
            <h2 class="gecko-modal-title">Historial — ${caja.nombre}</h2>
            <p style="color:#71717a;font-size:11px;margin:4px 0 20px;">Últimos ${movs.length} movimientos · Saldo actual: $${Math.round(caja.saldo || 0).toLocaleString('es-AR')}</p>
            <div style="max-height:400px;overflow-y:auto;padding-right:4px;">
                ${filasHTML}
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
};

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

    // Más recientes primero (orden real por timestamp del id, con
    // fallback al orden del array si el id no tiene el formato esperado)
    movs = movs.slice().sort((a, b) => {
        const ta = parseInt(String(a.id).replace('mov_', '')) || 0;
        const tb = parseInt(String(b.id).replace('mov_', '')) || 0;
        return tb - ta;
    });

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
                    style="flex:1;padding:13px;background:transparent;border:1px solid #27272a;color:#71717a;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;" onmouseover="this.style.borderColor='#3f3f46';this.style.color='#a1a1aa'" onmouseout="this.style.borderColor='#27272a';this.style.color='#71717a'">Cancelar</button>
                <button id="_geckoRevertirOk"
                    style="flex:1;padding:13px;background:#F15A24;border:none;color:white;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;" onmouseover="this.style.background='#ff6b32'" onmouseout="this.style.background='#F15A24'">Revertir</button>
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
                    style="flex:1;padding:13px;background:transparent;border:1px solid #27272a;color:#71717a;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;" onmouseover="this.style.borderColor='#3f3f46';this.style.color='#a1a1aa'" onmouseout="this.style.borderColor='#27272a';this.style.color='#71717a'">Cancelar</button>
                <button id="_geckoElimGastoOk"
                    style="flex:1;padding:13px;background:#ef4444;border:none;color:white;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;" onmouseover="this.style.background='#f87171'" onmouseout="this.style.background='#ef4444'">Eliminar</button>
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
// FIX (05/07/2026): se envuelve en window.addEventListener('load') porque
// gecko-fixes.js no tiene "defer" y se ejecuta ANTES que main.js (que sí
// tiene defer). Esto hacía que main.js pisara este override al terminar
// de cargar, y por eso los gráficos de Chart.js nunca se dibujaban.
window.addEventListener('load', function () {
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

    // (Ranking Mix de Ventas: ahora se calcula de forma canónica en main.js por it.tipo)
    const ahora = new Date();
    const cajas = window.LISTA_CAJAS || JSON.parse(localStorage.getItem('gecko_cajas') || '[]');
    const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');

    // Total cajas en reportes
    const totalCajas = cajas.reduce((a, c) => a + (parseFloat(c.saldo) || 0), 0);
    const elCajas = document.getElementById('metricCajas');
    if (elCajas) elCajas.innerText = `$${Math.round(totalCajas).toLocaleString('es-AR')}`;

    // Por cobrar (saldos pendientes de OTs activas)
    const porCobrar = lista.filter(p => p.status === 'OT' && p.estado_ot !== 'Entregado')
        .reduce((a, p) => a + Math.max(0, (p.total || 0) - (p.sena || 0)), 0);
    const elCobrar = document.getElementById('metricCobrar');
    if (elCobrar) elCobrar.innerText = `$${Math.round(porCobrar).toLocaleString('es-AR')}`;

    // ── Flujo de Caja Real (Cajas − Costos Fijos) ──
    const costosFijosTexto = document.getElementById('peCostosFijos')?.innerText || '$0';
    const costosFijosNum = parseFloat(costosFijosTexto.replace(/[^0-9,-]/g, '').replace(',', '.')) || 0;
    const flujoCajaReal = totalCajas - costosFijosNum;
    const elFcrCard = document.getElementById('cardFlujoCajaReal');
    const elFcrMonto = document.getElementById('fcrMonto');
    const elFcrDetalle = document.getElementById('fcrDetalle');
    if (elFcrCard && elFcrMonto) {
        let colorFondo, colorBorde, colorTexto;
        if (flujoCajaReal > 0) { colorFondo = 'rgba(16,185,129,0.07)'; colorBorde = 'rgba(16,185,129,0.35)'; colorTexto = '#10b981'; }
        else if (flujoCajaReal < 0) { colorFondo = 'rgba(239,68,68,0.07)'; colorBorde = 'rgba(239,68,68,0.35)'; colorTexto = '#ef4444'; }
        else { colorFondo = 'rgba(234,179,8,0.07)'; colorBorde = 'rgba(234,179,8,0.35)'; colorTexto = '#eab308'; }
        elFcrCard.style.background = colorFondo;
        elFcrCard.style.border = `1px solid ${colorBorde}`;
        elFcrMonto.style.color = colorTexto;
        const elFcrTitulo = document.getElementById('fcrTitulo');
        const elFcrIcono = document.getElementById('fcrIcono');
        const elFcrIconoWrap = document.getElementById('fcrIconoWrap');
        if (elFcrTitulo) elFcrTitulo.style.color = colorTexto;
        if (elFcrIcono) elFcrIcono.setAttribute('stroke', colorTexto);
        if (elFcrIconoWrap) elFcrIconoWrap.style.background = colorFondo.replace('0.07', '0.15');
        elFcrMonto.innerText = `${flujoCajaReal < 0 ? '-' : ''}$${Math.round(Math.abs(flujoCajaReal)).toLocaleString('es-AR')}`;
        if (elFcrDetalle) elFcrDetalle.innerText = `Cajas: $${Math.round(totalCajas).toLocaleString('es-AR')} — Costos Fijos: $${Math.round(costosFijosNum).toLocaleString('es-AR')}`;
    }

    // ── Descuentos Otorgados (mes actual) ──
    const movsTodos = window.LISTA_MOVIMIENTOS || JSON.parse(localStorage.getItem('gecko_movimientos') || '[]');
    const movsMesActual = movsTodos.filter(m => {
        const pts = (m.fecha || '').split('/');
        return pts.length >= 3 && (parseInt(pts[1]) - 1) === ahora.getMonth() && parseInt(pts[2]) === ahora.getFullYear();
    });
    const descuentosMes = movsMesActual.filter(m => m.tipo === 'Descuento');
    const totalDescuentos = descuentosMes.reduce((a, m) => a + (parseFloat(m.monto) || 0), 0);
    const ingresosMes = movsMesActual.filter(m => m.tipo === 'Ingreso').reduce((a, m) => a + (parseFloat(m.monto) || 0), 0);
    const pctDescuentos = ingresosMes > 0 ? (totalDescuentos / ingresosMes) * 100 : 0;
    const elDoMonto = document.getElementById('doMonto');
    const elDoCantidad = document.getElementById('doCantidad');
    const elDoPorcentaje = document.getElementById('doPorcentaje');
    if (elDoMonto) elDoMonto.innerText = `$${Math.round(totalDescuentos).toLocaleString('es-AR')}`;
    if (elDoCantidad) elDoCantidad.innerText = String(descuentosMes.length);
    if (elDoPorcentaje) elDoPorcentaje.innerText = `${pctDescuentos.toFixed(1)}%`;

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
                        <p style="font-size:13px;font-weight:900;margin:0;color:${(c.balance || 0) >= 0 ? '#22c55e' : '#ef4444'};">$${Math.round(c.balance || 0).toLocaleString('es-AR')}</p>
                        <button onclick="window._generarPDFCierreMes('${c.periodo}','',${c.ingresos || 0},${c.gastos || 0},[],[])"
                            style="font-size:9px;color:#F15A24;background:none;border:none;cursor:pointer;font-weight:900;text-transform:uppercase;letter-spacing:1px;padding:0;">
                            ↓ PDF
                        </button>
                    </div>
                </div>`).join('');
        }
    }

    // ── Gráficos Chart.js: Ingresos por Categoría (área) + Mix de Ventas (donut) ──
    if (typeof window.renderChartIngresos === 'function') window.renderChartIngresos(lista, ahora);
    if (typeof window.renderChartMix === 'function') window.renderChartMix();
    if (typeof window.renderChartCrecimiento === 'function') window.renderChartCrecimiento(lista, ahora);

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
// Fuerza el primer dibujado ya con el override activo
if (typeof window.renderReportesDashboard === 'function') window.renderReportesDashboard();

// ── Punto de Equilibrio (MEJ-001) ──
if (typeof window.renderPuntoEquilibrio === 'function') window.renderPuntoEquilibrio();
// ── Ticket Promedio por Rubro (MEJ-003, aproximación por venta, no margen) ──
if (typeof window.renderTicketPorRubro === 'function') window.renderTicketPorRubro();
// ── Mini resumen de Egresos por Categoría (dentro de Rentabilidad y Flujo) ──
if (typeof window.renderMiniDesgloseGastos === 'function') window.renderMiniDesgloseGastos();

// ── Count-up (MEJ-002): anima los números ya calculados por main.js ──
setTimeout(function () {
    const elEstancado = document.getElementById('metricEstancado');
    if (elEstancado) {
        const val = parseFloat(elEstancado.innerText.replace(/[^0-9.-]/g, '')) || 0;
        window._geckoAnimarNumero(elEstancado, val, v => '$' + Math.round(v).toLocaleString('es-AR'));
    }
    const elTasa = document.getElementById('metricTasaCierre');
    if (elTasa) {
        const val = parseFloat(elTasa.innerText.replace('%', '')) || 0;
        window._geckoAnimarNumero(elTasa, val, v => v.toFixed(1) + '%');
    }
    const elTicket = document.getElementById('metricTicketProm');
    if (elTicket) {
        const val = parseFloat(elTicket.innerText.replace(/[^0-9.-]/g, '')) || 0;
        window._geckoAnimarNumero(elTicket, val, v => '$' + Math.round(v).toLocaleString('es-AR'));
    }
}, 50);
});

window.renderMiniDesgloseGastos = function () {
    const cont = document.getElementById('repoMiniDesgloseGastos');
    if (!cont) return;

    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();
    const movimientos = window.LISTA_MOVIMIENTOS || JSON.parse(localStorage.getItem('gecko_movimientos') || '[]');

    const movsMes = movimientos.filter(m => {
        const [d, mo, y] = (m.fecha || '').split('/');
        return (parseInt(mo) - 1) === mesActual && parseInt(y) === anioActual;
    });

    const egresosMes = movsMes.filter(m => m.tipo === 'Egreso');
    if (egresosMes.length === 0) {
        cont.innerHTML = '<p style="color:#71717a;font-size:11px;font-style:italic;">Sin egresos registrados este mes.</p>';
        return;
    }

    const gastosPorCategoria = {};
    egresosMes.forEach(m => {
        const cat = m.categoria || 'Varios';
        gastosPorCategoria[cat] = (gastosPorCategoria[cat] || 0) + (m.monto || 0);
    });

    const totalEgresos = Object.values(gastosPorCategoria).reduce((a, v) => a + v, 0);
    const categoriasOrdenadas = Object.entries(gastosPorCategoria).sort((a, b) => b[1] - a[1]);

    cont.innerHTML = categoriasOrdenadas.map(([cat, monto]) => {
        const porc = totalEgresos > 0 ? ((monto / totalEgresos) * 100).toFixed(0) : 0;
        return `
            <div>
                <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:4px;">
                    <span style="color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;">${cat}</span>
                    <span style="color:#e4e4e7;">$${Math.round(monto).toLocaleString('es-AR')}</span>
                </div>
                <div style="width:100%;height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">
                    <div style="width:${porc}%;height:100%;background:#ef4444;border-radius:3px;"></div>
                </div>
            </div>
        `;
    }).join('');
};

// ── Ticket Promedio por Rubro: mapeo tipo→rubro duplicado de main.js (rubroDeItem no está expuesta en window) ──
window.renderTicketPorRubro = function () {
    const elNombre = document.getElementById('metricRubroTicketNombre');
    const elValor = document.getElementById('metricRubroTicketValor');
    if (!elNombre || !elValor) return;

    function rubroDeItemLocal(it, p) {
        const t = (it.tipo || '').toLowerCase();
        if (t === 'grafica' || t === 'corte') return 'Gráfica';
        if (t === 'corporeos') return 'Corpóreos';
        if (t === 'laser_cnc') return 'Láser/CNC';
        if (t === 'textil') return 'Textil';
        if (t === '3d' || t === 'impresion3d') return 'Impresión 3D';
        if (t === 'bastidores') return 'Industrial';
        if (t === 'manual') return (p && p.categoria === 'Industrial') ? 'Industrial' : 'Gráfica';
        return 'Otros';
    }

    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();
    const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');

    const otsMes = lista.filter(p => {
        if (p.status !== 'OT') return false;
        const [d, mo, y] = (p.fecha || '').split('/');
        return (parseInt(mo) - 1) === mesActual && parseInt(y) === anioActual;
    });

    const sumas = {}, conteos = {};
    otsMes.forEach(p => (p.items || []).forEach(it => {
        const rubro = rubroDeItemLocal(it, p);
        if (rubro === 'Otros') return;
        sumas[rubro] = (sumas[rubro] || 0) + (parseFloat(it.costo) || 0);
        conteos[rubro] = (conteos[rubro] || 0) + 1;
    }));

    const rubros = Object.keys(sumas);
    if (rubros.length === 0) {
        elNombre.innerText = 'Sin datos este mes';
        elValor.innerText = '';
        return;
    }

    let mejorRubro = null, mejorPromedio = -1;
    rubros.forEach(r => {
        const promedio = sumas[r] / conteos[r];
        if (promedio > mejorPromedio) {
            mejorPromedio = promedio;
            mejorRubro = r;
        }
    });

    elNombre.innerText = mejorRubro;
    elValor.innerText = '$' + Math.round(mejorPromedio).toLocaleString('es-AR');
    window._geckoAnimarNumero(elValor, mejorPromedio, v => '$' + Math.round(v).toLocaleString('es-AR'));
};

// ── Utilidad reutilizable: anima un número de 0 al valor final ──
// elemento: el <p> o <span> donde se muestra el número
// valorFinal: el número real (sin formato) al que tiene que llegar
// formateador: función que recibe el número y devuelve el texto a mostrar
window._geckoAnimarNumero = function (elemento, valorFinal, formateador) {
    if (!elemento || isNaN(valorFinal)) return;
    const duracion = 1600; // milisegundos
    const inicio = performance.now();
    function paso(ahora) {
        const progreso = Math.min(1, (ahora - inicio) / duracion);
        // easing suave (desacelera al final)
        const progresoSuave = 1 - Math.pow(1 - progreso, 3);
        const valorActual = valorFinal * progresoSuave;
        elemento.innerText = formateador(valorActual);
        if (progreso < 1) requestAnimationFrame(paso);
        else elemento.innerText = formateador(valorFinal);
    }
    requestAnimationFrame(paso);
};

// ── Punto de Equilibrio: cálculo con datos reales, sin inventar números ──
window.renderPuntoEquilibrio = function () {
    const cont = document.getElementById('cardPuntoEquilibrio');
    if (!cont) return;

    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();

    const movimientos = window.LISTA_MOVIMIENTOS || JSON.parse(localStorage.getItem('gecko_movimientos') || '[]');
    const gastosFijos = window.LISTA_GASTOS_FIJOS || JSON.parse(localStorage.getItem('gecko_gastos_fijos') || '[]');
    const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');

    const movsMes = movimientos.filter(m => {
        const [d, mo, y] = (m.fecha || '').split('/');
        return (parseInt(mo) - 1) === mesActual && parseInt(y) === anioActual;
    });

    const ingresos = movsMes.filter(m => m.tipo === 'Ingreso').reduce((a, m) => a + (m.monto || 0), 0);

    const egresosFijosCategorias = movsMes.filter(m => m.tipo === 'Egreso' && ['Alquiler', 'Sueldos'].includes(m.categoria))
        .reduce((a, m) => a + (m.monto || 0), 0);
    const totalGastosFijosCargados = gastosFijos.reduce((a, g) => a + (parseFloat(g.monto) || 0), 0);
    const costosFijos = totalGastosFijosCargados + egresosFijosCategorias;

    const costosVariables = movsMes.filter(m => m.tipo === 'Egreso' && m.categoria === 'Insumos')
        .reduce((a, m) => a + (m.monto || 0), 0);

    const otsMes = lista.filter(p => {
        if (p.status !== 'OT') return false;
        const [d, mo, y] = (p.fecha || '').split('/');
        return (parseInt(mo) - 1) === mesActual && parseInt(y) === anioActual;
    });
    const ticketProm = otsMes.length > 0 ? (otsMes.reduce((a, p) => a + (p.total || 0), 0) / otsMes.length) : 0;

    const elAviso = document.getElementById('peAvisoFaltaDato');

    if (ingresos <= 0 || costosFijos <= 0) {
        if (elAviso) {
            elAviso.style.display = 'block';
            elAviso.innerText = ingresos <= 0
                ? 'FALTA DATO: no hay ingresos registrados este mes todavía para calcular el margen.'
                : 'FALTA DATO: no hay Gastos Fijos cargados este mes.';
        }
        document.getElementById('pePuntoEquilibrioMonto').innerText = '—';
        document.getElementById('pePuntoEquilibrioOts').innerText = 'Sin datos suficientes';
        return;
    }
    if (elAviso) elAviso.style.display = 'none';

    const margenContribucion = (ingresos - costosVariables) / ingresos;

    if (margenContribucion <= 0) {
        if (elAviso) {
            elAviso.style.display = 'block';
            elAviso.innerText = 'FALTA DATO: el margen de contribución da 0 o negativo (revisá que los Egresos con categoría "Insumos" no superen a los Ingresos).';
        }
        document.getElementById('pePuntoEquilibrioMonto').innerText = '—';
        return;
    }

    const peMonto = costosFijos / margenContribucion;
    const peOts = ticketProm > 0 ? Math.ceil(peMonto / ticketProm) : 0;
    const avanceMes = Math.min(100, (ingresos / peMonto) * 100);
    const faltan = Math.max(0, peMonto - ingresos);
    const otsFaltantes = ticketProm > 0 ? Math.ceil(faltan / ticketProm) : 0;

    const fmt = n => '$' + Math.round(n).toLocaleString('es-AR');

    window._geckoAnimarNumero(document.getElementById('pePuntoEquilibrioMonto'), peMonto, v => fmt(v));
    document.getElementById('pePuntoEquilibrioOts').innerText = `≈ ${peOts} OTs este mes`;
    document.getElementById('peFacturadoLabel').innerText = `Facturado: ${fmt(ingresos)}`;
    document.getElementById('peFaltanLabel').innerText = avanceMes >= 100
        ? '¡Punto de equilibrio alcanzado!'
        : `Faltan ${fmt(faltan)} · ${otsFaltantes} OTs`;
    document.getElementById('peBarraProgreso').style.width = avanceMes + '%';
    document.getElementById('peCostosFijos').innerText = fmt(costosFijos);
    document.getElementById('peMargenContribucion').innerText = (margenContribucion * 100).toFixed(0) + '%';
    document.getElementById('peAvanceMes').innerText = avanceMes.toFixed(0) + '%';
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
                    style="flex:1;padding:13px;background:transparent;border:1px solid #27272a;color:#71717a;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;" onmouseover="this.style.borderColor='#3f3f46';this.style.color='#a1a1aa'" onmouseout="this.style.borderColor='#27272a';this.style.color='#71717a'">Cancelar</button>
                <button id="_geckoCierreOk"
                    style="flex:1;padding:13px;background:#F15A24;border:none;color:white;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;" onmouseover="this.style.background='#ff6b32'" onmouseout="this.style.background='#F15A24'">Cerrar mes</button>
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

// ══════════════════════════════════════════════════════
// FIX: Precios visibles para materiales con estrategia FIJA
// renderInsumos ignora m.precioVenta → este patch lo corrige post-render
// ══════════════════════════════════════════════════════
window._geckoFixPreciosFijos = function () {
    var tbody = document.getElementById('tablaMaterialesBody');
    if (!tbody) return;

    var materiales = JSON.parse(localStorage.getItem('gecko_materiales') || '[]');
    var fijos = materiales.filter(function (m) {
        return m.estrategiaVenta === 'fija' &&
            (parseFloat(m.precioVenta) > 0 || parseFloat(m.precioGremio) > 0);
    });
    if (fijos.length === 0) return;

    var formatter = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });

    fijos.forEach(function (m) {
        var id = String(m.id);
        var btn = tbody.querySelector('button[onclick*="editarMaterial"][onclick*="' + id + '"]');
        if (!btn) return;
        var tr = btn.closest('tr');
        if (!tr) return;
        var tds = tr.querySelectorAll(':scope > td');
        if (tds.length < 5) return;

        if (parseFloat(m.precioVenta) > 0) {
            var pVenta = tds[3].querySelector('p');
            if (pVenta) pVenta.textContent = formatter.format(Math.round(parseFloat(m.precioVenta)));
        }
        if (parseFloat(m.precioGremio) > 0) {
            var pGremio = tds[4].querySelector('p');
            if (pGremio) pGremio.textContent = formatter.format(Math.round(parseFloat(m.precioGremio)));
        }
    });

    console.log('🦎 GECKO-FIX: Precios fijos corregidos (' + fijos.length + ' materiales).');
};

// ── PARCHE FINAL: reemplazar renderOts de main.js después de que todo cargue ──
window.addEventListener('load', function () {
    setTimeout(function () {

        // Asegurar que registrarMovimiento SIEMPRE asigne un id con
        // timestamp, sin importar desde qué parte del código se llame
        window.registrarMovimiento = function (detalle, cajaNombre, monto, tipo, categoria = 'Varios', otsAfectadas = null) {
            const caja = LISTA_CAJAS.find(c => c.nombre === cajaNombre);
            if (!caja) return;

            if (tipo === 'Ingreso') caja.saldo += monto;
            else caja.saldo -= monto;

            const mov = {
                id: 'mov_' + Date.now(),
                fecha: new Date().toLocaleDateString('es-AR'),
                detalle: detalle,
                caja: cajaNombre,
                tipo: tipo,
                monto: monto,
                categoria: categoria
            };
            if (otsAfectadas && otsAfectadas.length > 0) {
                mov.otsAfectadas = otsAfectadas;
            }

            LISTA_MOVIMIENTOS.push(mov);
            localStorage.setItem('gecko_cajas', JSON.stringify(LISTA_CAJAS));
            localStorage.setItem('gecko_movimientos', JSON.stringify(LISTA_MOVIMIENTOS));

            if (typeof window.renderizarFinanzas === 'function') window.renderizarFinanzas();
            if (typeof window.renderizarMovimientos === 'function') window.renderizarMovimientos();
            if (typeof window.renderizarFiltrosCajas === 'function') window.renderizarFiltrosCajas();
        };

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
            filtrados.sort((a, b) => parseInt(b.id) - parseInt(a.id));

            if (filtrados.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="py-20 text-center text-gray-400 font-medium italic">
                    ${mostrarHistorial ? 'Sin historial de OTs.' : 'No hay órdenes de trabajo activas.'}
                </td></tr>`;
                return;
            }

            const _EST = ['En Proceso', 'En Taller', 'Impresión', 'Terminaciones', 'Listo', 'Pendiente de Pago', 'Entregado'];
            const _COL = { 'En Proceso': '#F15A24', 'En Taller': '#8b5cf6', 'Impresión': '#3b82f6', 'Terminaciones': '#f59e0b', 'Listo': '#10b981', 'Pendiente de Pago': '#ef4444', 'Entregado': '#6b7280' };

            tbody.innerHTML = filtrados.map(ot => {
                const estado = ot.estado_ot || 'En Proceso';
                const color = _COL[estado] || '#F15A24';
                const saldo = (ot.total || 0) - (ot.sena || 0);
                const estadoOpts = _EST.map(e =>
                    `<div onclick="window._seleccionarEstadoOT('${ot.id}','${e}');event.stopPropagation()"
                          style="padding:8px 14px;cursor:pointer;font-size:10px;font-weight:900;text-transform:uppercase;color:${_COL[e] || '#F15A24'};letter-spacing:0.5px;"
                          onmouseover="this.style.background='#1f1f23'" onmouseout="this.style.background='transparent'">${e}</div>`
                ).join('');

                const _botonesAccion = mostrarHistorial ? `
    <td class="py-4 px-6 text-right">
        <div class="flex justify-end gap-2">
            <button onclick="window.verDocumento('${ot.id}')" title="Ver OT" class="p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 transition-all duration-150 hover:scale-110 hover:text-white hover:border-zinc-500"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
            <button onclick="window._desarchivarOT('${ot.id}')" title="Desarchivar" class="p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 transition-all duration-150 hover:scale-110 hover:text-amber-400 hover:border-amber-500/40"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg></button>
            <button onclick="window.eliminarOT('${ot.id}')" title="Eliminar" class="p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 transition-all duration-150 hover:scale-110 hover:text-red-400 hover:border-red-500/40"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
        </div>
    </td>` : `
    <td class="py-4 px-6 text-right">
        <div class="flex justify-end gap-2">
            <button onclick="window.verDocumento('${ot.id}')" title="Ver OT" class="p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 transition-all duration-150 hover:scale-110 hover:text-white hover:border-zinc-500"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
            <button onclick="window.editarOT('${ot.id}')" title="Editar OT" class="p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 transition-all duration-150 hover:scale-110 hover:text-white hover:border-zinc-500"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
            <button onclick="window.abrirModalSena('${ot.id}')" title="Registrar Pago" class="p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 transition-all duration-150 hover:scale-110 hover:text-white hover:border-zinc-500"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></button>
            <button onclick="window._revertirOTaPresupuesto('${ot.id}')" title="Revertir a Presupuesto" class="p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 transition-all duration-150 hover:scale-110 hover:text-amber-400 hover:border-amber-500/40"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg></button>
            <button onclick="window.eliminarOT('${ot.id}')" title="Eliminar OT" class="p-2 rounded-xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-400 transition-all duration-150 hover:scale-110 hover:text-red-400 hover:border-red-500/40"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
        </div>
    </td>`;

                return `
                <tr draggable="true" data-drag-key="${ot.id}" class="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors border-b border-gray-100 dark:border-gray-800" style="cursor:grab;">
                    <td class="py-4 px-6 text-[11px] font-black uppercase text-zinc-500">#${ot.id}</td>
                    <td class="py-4 px-6">
                        <span onclick="event.stopPropagation();window.abrirFichaCliente('${(ot.cliente || '').replace(/'/g, "\\'")}')" class="text-[14px] font-extrabold dark:text-white uppercase cursor-pointer hover:text-gecko transition-colors" title="Ver ficha de cliente">${ot.cliente || 'S/N'}</span>
                    </td>
                    <td class="py-4 px-6 max-w-[200px]">
                        <div class="flex flex-col">
                            ${window._tagCategoria(ot)}
                            <span class="text-[11px] text-zinc-500 font-medium truncate">${ot.titulo || (ot.items || []).map(it => it.textoOpciones || it.nombre).filter(Boolean).join(' · ') || 'Sin título'}</span>
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
                            <div id="estado-ot-dropdown-${ot.id}" style="display:none;background:#18181b;border:1px solid #27272a;border-radius:14px;padding:6px;min-width:160px;box-shadow:0 8px 32px rgba(0,0,0,0.5);">
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
                    ${_botonesAccion}
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

            // Más recientes primero (orden real por timestamp del id, con
            // fallback al orden del array si el id no tiene el formato esperado)
            movs = movs.slice().sort((a, b) => {
                const ta = parseInt(String(a.id).replace('mov_', '')) || 0;
                const tb = parseInt(String(b.id).replace('mov_', '')) || 0;
                return tb - ta;
            });

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
                        <button onclick="document.getElementById('_geckoConfirmElimCli').remove()" style="flex:1;padding:13px;background:transparent;border:1px solid #27272a;color:#71717a;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;" onmouseover="this.style.borderColor='#3f3f46';this.style.color='#a1a1aa'" onmouseout="this.style.borderColor='#27272a';this.style.color='#71717a'">Cancelar</button>
                        <button id="_geckoElimCliOk" style="flex:1;padding:13px;background:#ef4444;border:none;color:white;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;" onmouseover="this.style.background='#f87171'" onmouseout="this.style.background='#ef4444'">Eliminar</button>
                    </div>
                </div>`;
            document.body.appendChild(modal);
            modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

            document.getElementById('_geckoElimCliOk').onclick = function () {
                let bdClientes = JSON.parse(localStorage.getItem('clientes')) || [];
                const _cliEliminado = bdClientes.find(c => c.nombre === nombre);
                bdClientes = bdClientes.filter(c => c.nombre !== nombre);
                localStorage.setItem('clientes', JSON.stringify(bdClientes));
                if (_cliEliminado && _cliEliminado.id && typeof window.geckoApiEliminar === 'function') {
                    window.geckoApiEliminar('clientes', _cliEliminado.id);
                }
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
                            <input type="text" id="_editCliNombre" class="gecko-input-line" value="${cliente.nombre}">
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

                var nombreAnterior = cliente.nombre;
                var nuevoNombre = document.getElementById('_editCliNombre')?.value.trim() || nombreAnterior;

                const idx = bdClientes.findIndex(c => c.nombre === nombre);
                if (idx !== -1) {
                    bdClientes[idx] = {
                        ...bdClientes[idx],
                        nombre: nuevoNombre,
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

                    // Cascade: actualizar nombre en presupuestos y OTs si cambió
                    if (nuevoNombre && nuevoNombre !== nombreAnterior) {
                        var presups = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
                        var actualizados = 0;
                        presups = presups.map(function(p) {
                            if ((p.cliente || '').trim() === nombreAnterior.trim()) {
                                p.cliente = nuevoNombre;
                                actualizados++;
                            }
                            return p;
                        });
                        if (actualizados > 0) {
                            localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(presups));
                            presups.filter(function(p) {
                                return (p.cliente || '').trim() === nuevoNombre.trim();
                            }).forEach(function(p) {
                                fetch('api.php?endpoint=presupuestos', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(p)
                                }).catch(function(e) {
                                    console.warn('GECKO-FIX: Error sync presupuesto cascade:', e);
                                });
                            });
                            console.log('GECKO-FIX: Cascade cliente — ' + actualizados +
                                ' presupuesto(s)/OT(s) actualizados de "' +
                                nombreAnterior + '" -> "' + nuevoNombre + '"');
                        }
                    }

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
                            style="flex:1;padding:13px;background:transparent;border:1px solid #27272a;color:#71717a;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;" onmouseover="this.style.borderColor='#3f3f46';this.style.color='#a1a1aa'" onmouseout="this.style.borderColor='#27272a';this.style.color='#71717a'">Cancelar</button>
                        <button id="_geckoElimMovOk"
                            style="flex:1;padding:13px;background:#ef4444;border:none;color:white;border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;cursor:pointer;" onmouseover="this.style.background='#f87171'" onmouseout="this.style.background='#ef4444'">Eliminar</button>
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

                // Devolver la deuda a la(s) OT(s) que recibieron este pago (si el
                // movimiento tiene el detalle guardado)
                if (mov.otsAfectadas && mov.otsAfectadas.length > 0) {
                    const listaOts = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
                    mov.otsAfectadas.forEach(function (item) {
                        const ot = listaOts.find(function (o) { return String(o.id) === String(item.id); });
                        if (ot) { ot.sena = (ot.sena || 0) - item.monto; }
                    });
                    localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(listaOts));
                    try { listaPresupuestos = listaOts; } catch (e) { window.listaPresupuestos = listaOts; }
                    if (typeof window.renderOts === 'function') window.renderOts();
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

                const esPagoSinDetalle = ['Cobro Cliente', 'Seña', 'Cobro Final'].includes(mov.categoria) && !(mov.otsAfectadas && mov.otsAfectadas.length > 0);
                if (esPagoSinDetalle && typeof window.mostrarExito === 'function') {
                    window.mostrarExito('Movimiento eliminado. Este pago es anterior a la mejora de reversión automática — revisá manualmente el saldo del cliente si corresponde.', 'Atención');
                } else if (typeof window.mostrarExito === 'function') {
                    window.mostrarExito('Movimiento eliminado', '¡Listo!');
                }
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
            if (window._gpmAbiertoDesdePresupuesto) {
                const nombreClienteNuevo = document.getElementById('nuevoClienteNombre')?.value?.trim();
                const inputClientePresupuesto = document.getElementById('gpmCliente');
                if (inputClientePresupuesto && nombreClienteNuevo) {
                    inputClientePresupuesto.value = nombreClienteNuevo;
                }
                window._gpmAbiertoDesdePresupuesto = false;
            }
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

        window.confirmarCobro = function () {
            const montoOriginal = parseFloat(document.getElementById('cobroMonto')?.value) || 0;
            const cajaNombre = document.getElementById('cobroCaja')?.value || '';

            if (montoOriginal <= 0) { alert('Ingresá un monto válido.'); return; }
            if (!cajaNombre) { alert('Seleccioná una caja.'); return; }

            let cliente;
            try { cliente = clienteActualFicha; } catch (e) { cliente = window.clienteActualFicha; }
            if (!cliente) { alert('No se encontró el cliente actual.'); return; }

            let lista;
            try { lista = listaPresupuestos; } catch (e) { lista = window.listaPresupuestos || []; }

            let montoRestante = montoOriginal;
            const pends = lista.filter(p => p.cliente === cliente && p.status === 'OT' && (p.total - (p.sena || 0)) > 0)
                .sort((a, b) => {
                    const fa = (a.fecha || '').split('/').reverse().join('-');
                    const fb = (b.fecha || '').split('/').reverse().join('-');
                    return fa.localeCompare(fb);
                });

            if (pends.length === 0) { alert('Este cliente no tiene deudas pendientes.'); return; }

            const otsAfectadas = [];
            pends.forEach(p => {
                if (montoRestante <= 0) return;
                const saldo = p.total - (p.sena || 0);
                const pago = Math.min(saldo, montoRestante);
                p.sena = (p.sena || 0) + pago;
                montoRestante -= pago;
                otsAfectadas.push({ id: p.id, monto: pago });
            });

            if (typeof window.registrarMovimiento === 'function') {
                window.registrarMovimiento(`Pago Cta. Cte. - ${cliente}`, cajaNombre, montoOriginal, 'Ingreso', 'Cobro Cliente', otsAfectadas);
            }

            try { listaPresupuestos = lista; } catch (e) { window.listaPresupuestos = lista; }
            localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(lista));

            document.getElementById('modalCobro').style.display = 'none';

            if (typeof window.abrirFichaCliente === 'function') window.abrirFichaCliente(cliente);
            if (typeof window.renderOts === 'function') window.renderOts();
            if (typeof window._geckoRenderFijo === 'function') window._geckoRenderFijo();

            if (typeof window.mostrarExito === 'function') {
                window.mostrarExito(`Se aplicaron $${montoOriginal.toLocaleString('es-AR')} a la deuda de ${cliente}.`, '¡Cobro Exitoso!');
            }
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

        setTimeout(() => { window.renderClientes(); }, 200);

        console.log('🦎 GECKO-FIXES: renderOts + renderizarMovimientos + renderClientes parcheados post-main.js.');

        // Override renderInsumos para aplicar fix de precios fijos post-render
        (function () {
            var _origRenderInsumos = window.renderInsumos;
            if (typeof _origRenderInsumos === 'function') {
                window.renderInsumos = function () {
                    _origRenderInsumos.apply(this, arguments);
                    window._geckoFixPreciosFijos();
                };
            }
            // Aplicar fix inmediato (la tabla ya puede estar dibujada)
            window._geckoFixPreciosFijos();
            console.log('🦎 GECKO-FIX: Override renderInsumos activo — precios fijos habilitados.');
        })();

        // Interceptor: captura precioVenta del form antes de que main.js lo resetee
        (function () {
            var form = document.getElementById('formMaterial');
            if (!form) return;
            form.addEventListener('submit', function () {
                window._geckoCapturePV = {
                    precioVenta: parseFloat(document.getElementById('matPrecioVentaManual')?.value) || 0,
                    estrategia: document.getElementById('matEstrategia')?.value || '',
                    editId: this.dataset.editId || null
                };
            }, true);
            form.addEventListener('submit', function () {
                var cap = window._geckoCapturePV;
                if (!cap || cap.estrategia !== 'fija' || cap.precioVenta <= 0) return;
                setTimeout(function () {
                    var mats = JSON.parse(localStorage.getItem('gecko_materiales') || '[]');
                    var mat = cap.editId
                        ? mats.find(function (m) { return String(m.id) === String(cap.editId); })
                        : mats[mats.length - 1];
                    if (mat) {
                        mat.precioVenta = cap.precioVenta;
                        localStorage.setItem('gecko_materiales', JSON.stringify(mats));
                        console.log('🦎 GECKO-FIX: precioVenta guardado: ' + mat.nombre + ' $' + cap.precioVenta);
                    }
                    window._geckoCapturePV = null;
                }, 150);
            });
            console.log('🦎 GECKO-FIX: Interceptor precioVenta activo.');
        })();

        // ── Persistencia de filtro activo en Materiales ──
        (function () {
            // 1. Guardar filtro cada vez que el usuario lo aplica
            var _origFiltrar = window.filtrarInsumos;
            if (typeof _origFiltrar === 'function') {
                window.filtrarInsumos = function (cat, btn) {
                    if (cat) sessionStorage.setItem('gecko_filtro_materiales', cat);
                    return _origFiltrar.apply(this, arguments);
                };
            }

            // 2. Restaurar filtro después de cada renderInsumos
            // Se encadena sobre _geckoFixPreciosFijos que ya hookea renderInsumos.
            // El flag _restaurando evita loops.
            var _restaurando = false;
            var _origFixPF = window._geckoFixPreciosFijos;
            window._geckoFixPreciosFijos = function () {
                if (typeof _origFixPF === 'function') _origFixPF();
                if (_restaurando) return;
                var filtro = sessionStorage.getItem('gecko_filtro_materiales');
                if (!filtro || filtro === 'todos') return;
                _restaurando = true;
                setTimeout(function () {
                    var btns = document.querySelectorAll('button[onclick*="filtrarInsumos"]');
                    for (var i = 0; i < btns.length; i++) {
                        var oc = btns[i].getAttribute('onclick') || '';
                        if (oc.indexOf("'" + filtro + "'") !== -1 || oc.indexOf('"' + filtro + '"') !== -1) {
                            if (typeof window.filtrarInsumos === 'function') {
                                window.filtrarInsumos(filtro, btns[i]);
                            }
                            break;
                        }
                    }
                    _restaurando = false;
                }, 150);
            };

            console.log('🦎 GECKO-FIX: Filtro de materiales persistente activo.');
        })();

        // ── Persistencia de pestaña activa en Materiales (Insumos / Servicios) ──
        (function () {
            var TAB_KEY = 'gecko_tab_materiales';

            setTimeout(function () {
                var tabBtns = document.querySelectorAll('#tabMat-insumos, #tabMat-servicios');
                tabBtns.forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        var oc = btn.getAttribute('onclick') || '';
                        var match = oc.match(/switchTabMateriales\('([^']+)'\)/);
                        if (match) sessionStorage.setItem(TAB_KEY, match[1]);
                    });
                });

                // Restaurar pestaña guardada
                var saved = sessionStorage.getItem(TAB_KEY);
                if (saved && typeof window.switchTabMateriales === 'function') {
                    window.switchTabMateriales(saved);
                }

                console.log('🦎 GECKO-FIX: Persistencia de pestaña Materiales activa.');
            }, 500);
        })();

        // ══ Fix consolidado: edición de servicios ══
        // Corrige dos bugs:
        // 1. IDs string sin comillas en onclick → ReferenceError
        // 2. modal abre vacío → data filling completo desde localStorage

        // Fix A: parchear onclick de botones con IDs string sin comillas
        window._geckoFixBotonesServicios = function () {
            var selectores = [
                'button[onclick*="abrirModalTerminacion"]',
                'button[onclick*="eliminarTerminacion"]'
            ];
            selectores.forEach(function(selector) {
                document.querySelectorAll(selector).forEach(function (btn) {
                    var oc = btn.getAttribute('onclick') || '';
                    var fixed = oc.replace(
                        /(abrirModalTerminacion|eliminarTerminacion)\(([^'")\s]+)\)/,
                        function (match, fn, id) {
                            if (!id || /^\d+$/.test(id)) return match;
                            return fn + "('" + id + "')";
                        }
                    );
                    if (fixed !== oc) btn.setAttribute('onclick', fixed);
                });
            });
        };

        // Fix B: override completo de abrirModalTerminacion con data filling
        window.abrirModalTerminacion = function (id) {
            var form = document.getElementById('formTerminacion');
            if (!form) return;
            form.reset();
            delete form.dataset.editId;

            if (id !== null && id !== undefined && id !== '') {
                var servicios = JSON.parse(localStorage.getItem('geckoServicios') || '[]');
                var term = servicios.find(function (t) {
                    return String(t.id) === String(id);
                });
                if (term) {
                    document.getElementById('termNom').value        = term.nombre    || '';
                    document.getElementById('termCat').value        = term.categoria || 'mano_obra';
                    document.getElementById('termCosto').value      = term.costo     || 0;
                    document.getElementById('termUni').value        = term.unidad    || 'hora';
                    document.getElementById('termPrecio').value     = term.precio    || 0;
                    form.dataset.editId = String(id);
                    var h3 = document.querySelector('#modalTerminacion h3');
                    if (h3) h3.innerText = 'Editar Servicio';
                } else {
                    console.warn('🦎 GECKO-FIX: Servicio no encontrado, id:', id);
                }
            } else {
                var h3n = document.querySelector('#modalTerminacion h3');
                if (h3n) h3n.innerText = 'Nuevo Servicio';
            }
            if (typeof window.openModal === 'function') window.openModal('modalTerminacion');
        };

        // Hook a renderServicios para re-aplicar Fix A después de cada render
        (function () {
            var _origRS = window.renderServicios;
            if (typeof _origRS === 'function') {
                window.renderServicios = function () {
                    _origRS.apply(this, arguments);
                    window._geckoFixBotonesServicios();
                };
            }
            window._geckoFixBotonesServicios();
            console.log('🦎 GECKO-FIX: Fix edición servicios activo (botones + data filling).');
        })();

        // BUG-005: override switchParamsTab dentro del setTimeout para que pise el original de main.js
        (function () {
            var _origSwitch = window.switchParamsTab;
            if (typeof _origSwitch !== 'function') return;
            window.switchParamsTab = function (tab) {
                _origSwitch.call(this, tab);
                if (tab === 'grabado') {
                    _ensureBotonAgregarGrabado();
                    window.renderTablaParametrosGrabado();
                }
            };
        })();

        (function () {
            var _origGuardar = window.guardarParametrosLaser;
            if (typeof _origGuardar !== 'function') return;
            window.guardarParametrosLaser = async function () {
                await window._guardarParametrosGrabado();
                await _origGuardar.call(this);
                window.renderTablaParametrosGrabado();
            };
        })();

        const _origCambiarCategoriaCotizadorInst = window.cambiarCategoriaCotizador;
        window.cambiarCategoriaCotizador = function (cat) {
            if (cat === 'instalacion') {
                document.querySelectorAll('.btn-cat').forEach(function (btn) {
                    btn.classList.remove('bg-zinc-900', 'border-gecko/30', 'btn-cat-active');
                });
                localStorage.setItem('gecko_activeCategory', cat);
                const titleEl = document.getElementById('configuradorTitle');
                if (titleEl) {
                    titleEl.innerText = 'Cotizador de Instalación';
                    titleEl.className = "text-2xl font-black uppercase italic dark:text-zinc-100 tracking-wider";
                }
                document.querySelectorAll('[id^="side-"], [id^="sub-"]').forEach(function (el) {
                    el.classList.remove('nav-active');
                });
                const subLink = document.getElementById('side-instalacion');
                if (subLink) subLink.classList.add('nav-active');
                if (typeof window.renderInstalacion === 'function') window.renderInstalacion();
                return;
            }
            if (typeof _origCambiarCategoriaCotizadorInst === 'function') {
                _origCambiarCategoriaCotizadorInst(cat);
            }
        };
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
                // Helper: parsear campo que puede ser string JSON o array
                var parsearArray = function(val) {
                    if (!val) return [];
                    if (Array.isArray(val)) return val;
                    try { var p = JSON.parse(val); return Array.isArray(p) ? p : []; }
                    catch(e) { return []; }
                };

                var nombreStr = (c.nombre || '').toLowerCase();
                var cuitStr   = (c.cuit  || '').toLowerCase();
                var rubroStr  = (c.rubro || '').toLowerCase();
                var locStr    = (c.loc   || '').toLowerCase();

                var cuitsArr  = parsearArray(c.cuits);
                var telsArr   = parsearArray(c.telefonos);
                var emailsArr = parsearArray(c.emails);

                var cuitsMatch = cuitsArr.some(function(cu) {
                    var num = typeof cu === 'string' ? cu : (cu.numero || '');
                    return num.toLowerCase().includes(termino);
                });
                var telsMatch = telsArr.some(function(t) {
                    var num = typeof t === 'string' ? t : (t.numero || '');
                    return num.toLowerCase().includes(termino);
                });
                var emailsMatch = emailsArr.some(function(e) {
                    var addr = typeof e === 'string' ? e : (e.email || e.direccion || '');
                    return addr.toLowerCase().includes(termino);
                });

                var hayMatch = nombreStr.includes(termino) ||
                    cuitStr.includes(termino) ||
                    rubroStr.includes(termino) ||
                    locStr.includes(termino) ||
                    cuitsMatch || telsMatch || emailsMatch;

                if (!hayMatch) return;
            }

            const pbd = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
            let saldo = pbd.filter(p => p.cliente === c.nombre && p.status === 'OT').reduce((acc, o) => acc + ((parseFloat(o.total) || 0) - (parseFloat(o.sena) || 0)), 0);

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

window.renderClientes = window._geckoRenderFijo;

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
    if (window._gpmAbiertoDesdePresupuesto) {
        const nombreClienteNuevo = document.getElementById('nuevoClienteNombre')?.value?.trim();
        const inputClientePresupuesto = document.getElementById('gpmCliente');
        if (inputClientePresupuesto && nombreClienteNuevo) {
            inputClientePresupuesto.value = nombreClienteNuevo;
        }
        window._gpmAbiertoDesdePresupuesto = false;
    }
};



// ══════════════════════════════════════════════════════════════════════
// PRESUPUESTADOR MANUAL — SECCIÓN v2.0
// Se renderiza dentro de #presupuestoManualContainer (viewPresupuestoManual)
// Estilo 100% consistente con el sistema Gecko
// ══════════════════════════════════════════════════════════════════════

window._gpmAbrirManualReal = function (presupuestoEditId = null) {
    window._gpmYaGuardado = false;
    const container = document.getElementById('presupuestoManualContainer');
    if (!container) return;

    // Datos a editar si viene de "Editar"
    let datosEdicion = null;
    if (presupuestoEditId) {
        const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
        const _todosEdit = lista.filter(x => String(x.id) === String(presupuestoEditId));
        datosEdicion = _todosEdit[_todosEdit.length - 1];
        window._editandoPresupuestoId = presupuestoEditId;
        // Persistir ID en edición para sobrevivir recargas
        localStorage.setItem('gecko_gpm_editing_id', String(presupuestoEditId));
    } else {
        window._editandoPresupuestoId = null;
        // Limpiar draft solo si se abre en blanco explícitamente
        localStorage.removeItem('gecko_gpm_editing_id');
        // NO resetear _gpmItemsDesdeCotzador aquí, se consume después de renderizar
    }

    const clienteInicial = datosEdicion?.cliente || '';
    const tituloInicial = datosEdicion?.titulo || '';
    const areaInicial = datosEdicion?.categoria || 'Gráfica';
    const notasInternas = datosEdicion?.notasInternas || '';
    const condiciones = datosEdicion?.condiciones || '';
    const itemsIniciales = datosEdicion?.items || [];

    // Opciones del select de área
    const areas = ['Gráfica', 'Industrial', 'Gráfica/Industrial'];
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
            <div style="display:flex;gap:8px;align-items:stretch;">
              <div style="flex:1;position:relative;">
                <input id="gpmCliente" type="text" list="gpm-clientes-list"
                  placeholder="Nombre del cliente..." value="${clienteInicial}"
                  autocomplete="off"
                  style="width:100%;background:#131314;border:1px solid #333333;border-radius:12px;padding:12px 16px;color:white;font-size:14px;font-weight:700;outline:none;box-sizing:border-box;"
                  onfocus="this.style.borderColor='#F15A24'" onblur="this.style.borderColor='#333333'" />
                <datalist id="gpm-clientes-list">
                  ${(JSON.parse(localStorage.getItem('clientes') || '[]')).map(c => `<option value="${c.nombre || c.name || ''}"></option>`).join('')}
                </datalist>
              </div>
              <button type="button"
                onclick="window._gpmAbiertoDesdePresupuesto=true;window.abrirModalNuevoCliente()"
                style="padding:10px 15px;background:transparent;border:1px solid rgb(217,78,26);color:rgb(217,78,26);border-radius:12px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.12em;cursor:pointer;transition:0.15s;white-space:nowrap;display:flex;align-items:center;gap:6px;"
                onmouseover="this.style.borderColor='#ff7a3d';this.style.color='#ff7a3d'"
                onmouseout="this.style.borderColor='rgb(217,78,26)';this.style.color='rgb(217,78,26)'"
                title="Nuevo cliente">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
                Nuevo Cliente
              </button>
            </div>
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
        <div style="margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:end;">
          <div>
            <label style="display:block;color:#71717a;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Fecha de entrega</label>
            <input id="gpmEntrega" type="date"
              value="${datosEdicion?.fechaEntrega || ''}"
              style="width:100%;background:#131314;border:1px solid #333333;border-radius:12px;padding:12px 16px;color:#71717a;font-size:14px;font-weight:600;outline:none;box-sizing:border-box;color-scheme:dark;"
              onfocus="this.style.borderColor='#F15A24'"
              onblur="this.style.borderColor='#333333'" />
          </div>
          <div style="text-align:right;">
            ${presupuestoEditId ? `<span style="display:inline-block;width:100%;box-sizing:border-box;background:#131314;border:1px solid #333333;border-radius:12px;padding:12px 16px;color:#71717a;font-size:14px;font-weight:900;text-align:right;">Presupuesto #${presupuestoEditId}</span>` : ''}
          </div>
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

          <div id="gpmDescMotivoWrap" style="display:none;padding:0 0 8px;">
            <label style="display:block;font-size:11px;color:#52525b;font-weight:700;margin-bottom:4px;">Motivo del descuento</label>
            <input type="text" id="gpmDescMotivo" class="gecko-input-line"
              placeholder="Ej: Descuento por pago en efectivo"
              value="${datosEdicion?.motivoDescuento ? datosEdicion.motivoDescuento.replace(/"/g, '&quot;') : ''}">
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
            <input type="checkbox" id="gpmMostrarPrecios" ${datosEdicion?.mostrarPrecios === false ? '' : 'checked'}
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
          <button onclick="window._gpmGuardar('${datosEdicion.status || 'Cotizado'}')" class="gecko-btn-primary" style="flex:none;width:auto;">
            ${datosEdicion.status === 'OT' ? 'Actualizar OT' : 'Actualizar Presupuesto'}
          </button>
        ` : `
          <button onclick="window._gpmGuardar('Cotizado')" class="gecko-btn-primary" style="flex:none;width:auto;">
            Generar Presupuesto
          </button>
        `}
      </div>

    </div>`;

    // Inicializar toggles con JS (sin CSS externo)
    window._gpmInitToggles();
    window._gpmSyncToggle('gpmMostrarPrecios', 'gpmMostrarPreciosSlider', 'gpmMostrarPreciosThumb');

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
            document.getElementById('gpmDescMotivoWrap').style.display = 'block';
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
    if (datos?.tipo) div.dataset.tipoOrigen = datos.tipo;
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
    if (document.getElementById('gpmDescMotivoWrap')) document.getElementById('gpmDescMotivoWrap').style.display = descOn ? 'block' : 'none';
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
    localStorage.removeItem('gecko_gpm_editing_id');
    if (typeof window.switchMenu === 'function') window.switchMenu('pedidos');
};

// ── Guardar ──
window._gpmGuardar = function (status) {
    // Fix B: Limpiar título guardado al confirmar guardado exitoso
    localStorage.removeItem('gecko_gpm_titulo_draft');
    localStorage.removeItem('gecko_gpm_draft_nuevo');
    const cliente = document.getElementById('gpmCliente')?.value?.trim();
    if (!cliente) { alert('Ingresá el nombre del cliente.'); document.getElementById('gpmCliente')?.focus(); return; }

    const _tituloPresupuesto = document.getElementById('gpmTitulo')?.value?.trim() || '';
    // Fix B: Guardar título en localStorage mientras el usuario escribe
    const _inputTituloRef = document.getElementById('gpmTitulo');
    if (_inputTituloRef && !_inputTituloRef.dataset.persistBound) {
        _inputTituloRef.dataset.persistBound = '1';
        _inputTituloRef.addEventListener('input', function () {
            localStorage.setItem('gecko_gpm_titulo_draft', this.value);
        });
    }
    // Fix B: Restaurar título si se recargó la página con un borrador guardado
    if (!_tituloPresupuesto) {
        const _draft = localStorage.getItem('gecko_gpm_titulo_draft');
        const _inputTituloRestore = document.getElementById('gpmTitulo');
        if (_draft && _inputTituloRestore && !_inputTituloRestore.value.trim()) {
            _inputTituloRestore.value = _draft;
        }
    }
    if (!_tituloPresupuesto) {
        const _inputTitulo = document.getElementById('gpmTitulo');
        if (_inputTitulo) {
            _inputTitulo.style.setProperty('border-color', '#ef4444', 'important');
            _inputTitulo.focus();
            _inputTitulo.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        alert('Falta completar el Título del presupuesto. Es un campo obligatorio para poder guardar.');
        return;
    }

    const items = [];
    let _tieneItemDeCotizadorReal = false;
    document.querySelectorAll('#gpm-items-list .gpm-item').forEach(item => {
        const titulo = item.querySelector('.gpm-item-title')?.value?.trim();
        const desc = item.querySelector('.gpm-item-desc')?.value?.trim();
        const qty = parseFloat(item.querySelector('.gpm-qty')?.value) || 1;
        const precio = parseFloat(String(item.querySelector('.gpm-price')?.value || '').replace(/[^0-9.]/g, '')) || 0;
        if (titulo && precio > 0) {
            if (item.dataset.tipoOrigen) _tieneItemDeCotizadorReal = true;
            items.push({
                tipo: item.dataset.tipoOrigen || '',
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
    let descuento = 0, descuentoValor = 0, tipoDescuento = 'pct', motivoDescuento = '';
    if (descOn) {
        const dv = pn(document.getElementById('gpmDescVal')?.value);
        tipoDescuento = document.getElementById('gpmDescTipo')?.value || 'pct';
        // descuento = el valor ingresado por el usuario (% o monto fijo) — se guarda tal cual
        descuento = dv;
        // descuentoValor = el monto real descontado en pesos — se usa solo para el cálculo del total
        descuentoValor = tipoDescuento === 'pct' ? total * (dv / 100) : dv;
        total -= descuentoValor;
        motivoDescuento = document.getElementById('gpmDescMotivo')?.value?.trim() || '';
    }
    const ivaOn = document.getElementById('gpmTogIva')?.checked;
    if (ivaOn) total *= 1.21;

    const categoria = document.getElementById('gpmCategoria')?.value || 'Gráfica';
    window._gpmCategoriaActual = categoria;
    // Ítems sin tipo de origen (genuinamente manuales): usar el mismo mapeo que _guardarManual
    const catATipo = { 'Gráfica': 'grafica', 'Industrial': 'bastidores', 'Corpóreos': 'corporeos', 'Láser/CNC': 'laser_cnc', 'Textil': 'textil' };
    items.forEach(it => { if (!it.tipo) it.tipo = catATipo[categoria] || 'manual'; });
    const titulo = _tituloPresupuesto;
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
    window._gpmMetadataPendiente = { titulo, notasInternas, condiciones, descuento, tipoDescuento, motivoDescuento, conIva: ivaOn, fechaEntrega, mostrarPrecios, imagenes: imagenesRef, _tsGuardado };
    if (!_tieneItemDeCotizadorReal) window._gpmMetadataPendiente.origenFormulario = 'gpm';

    window._gpmYaGuardado = true;
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

// ══════════════════════════════════════════════════════════════════════
// AUTOSAVE + BORRADOR — Presupuestador Manual (MEJ-020)
// ══════════════════════════════════════════════════════════════════════

// Wrapper: si se abre en blanco y hay un borrador, preguntar antes de renderizar
window.abrirPresupuestadorManual = function (presupuestoEditId = null) {
    if (!presupuestoEditId) {
        const draftRaw = localStorage.getItem('gecko_gpm_draft_nuevo');
        if (draftRaw) {
            window._gpmMostrarModalBorrador(draftRaw);
            return;
        }
    }
    window._gpmAbrirManualReal(presupuestoEditId);
};

window._gpmMostrarModalBorrador = function (draftRaw) {
    document.querySelectorAll('#modalGpmBorrador').forEach(m => m.remove());
    const modal = document.createElement('div');
    modal.className = 'gecko-modal-overlay';
    modal.id = 'modalGpmBorrador';
    modal.innerHTML = `
      <div class="gecko-modal-box" style="max-width:420px;position:relative;">
        <button onclick="window._gpmCerrarModalBorrador()" style="position:absolute;top:14px;right:14px;background:transparent;border:none;color:#71717a;font-size:18px;cursor:pointer;line-height:1;">✕</button>
        <div class="gecko-modal-header">
          <h3>Borrador encontrado</h3>
        </div>
        <div class="gecko-modal-body">
          <p style="color:#a1a1aa;font-size:13px;line-height:1.5;">
            Encontramos un presupuesto sin terminar. ¿Querés recuperarlo o empezar de cero?
          </p>
        </div>
        <div class="gecko-modal-footer">
          <button class="gecko-btn-cancel" onclick="window._gpmDescartarBorrador()">Empezar de cero</button>
          <button class="gecko-btn-primary" onclick="window._gpmRecuperarBorrador()">Recuperar borrador</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
};

window._gpmCerrarModalBorrador = function () {
    document.querySelectorAll('#modalGpmBorrador').forEach(m => m.remove());
    window._gpmAbrirManualReal(null);
};

window._gpmDescartarBorrador = function () {
    localStorage.removeItem('gecko_gpm_draft_nuevo');
    document.querySelectorAll('#modalGpmBorrador').forEach(m => m.remove());
    window._gpmAbrirManualReal(null);
};

window._gpmRecuperarBorrador = function () {
    const draftRaw = localStorage.getItem('gecko_gpm_draft_nuevo');
    document.querySelectorAll('#modalGpmBorrador').forEach(m => m.remove());
    window._gpmAbrirManualReal(null);
    if (!draftRaw) return;
    try {
        const draft = JSON.parse(draftRaw);
        setTimeout(() => {
            const setVal = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
            setVal('gpmCliente', draft.cliente);
            setVal('gpmTitulo', draft.titulo);
            setVal('gpmCategoria', draft.categoria);
            setVal('gpmNotasInternas', draft.notasInternas);
            setVal('gpmCondiciones', draft.condiciones);
            setVal('gpmEntrega', draft.fechaEntrega);
            (draft.items || []).forEach(it => window._gpmAgregarItem(it));
            if (draft.conIva) {
                document.getElementById('gpmTogIva').checked = true;
                window._gpmSyncToggle('gpmTogIva', 'gpmTogIvaSlider', 'gpmTogIvaThumb');
            }
            if (draft.descOn) {
                document.getElementById('gpmTogDesc').checked = true;
                window._gpmSyncToggle('gpmTogDesc', 'gpmTogDescSlider', 'gpmTogDescThumb');
                setVal('gpmDescVal', draft.descVal);
                setVal('gpmDescTipo', draft.descTipo);
                document.getElementById('gpmDescPanel').style.display = 'flex';
                document.getElementById('gpmRowDesc').style.display = 'flex';
            }
            window._gpmCalc();
        }, 100);
    } catch (e) { console.error('Error al recuperar borrador:', e); }
};

window._gpmGuardarBorradorAuto = function () {
    if (window._editandoPresupuestoId) return;
    if (window._gpmYaGuardado) return;
    if (!document.getElementById('gpmCliente')) return;
    const cliente = document.getElementById('gpmCliente')?.value?.trim() || '';
    const titulo = document.getElementById('gpmTitulo')?.value?.trim() || '';
    const items = [];
    document.querySelectorAll('#gpm-items-list .gpm-item').forEach(item => {
        const it_titulo = item.querySelector('.gpm-item-title')?.value?.trim();
        const it_desc = item.querySelector('.gpm-item-desc')?.value?.trim();
        const it_cant = item.querySelector('.gpm-qty')?.value;
        const it_precio = item.querySelector('.gpm-price')?.value;
        if (it_titulo || it_precio) items.push({ titulo: it_titulo, descripcion: it_desc, cantidad: it_cant, precio: it_precio });
    });
    if (!cliente && !titulo && items.length === 0) return;
    const draft = {
        cliente, titulo,
        categoria: document.getElementById('gpmCategoria')?.value || 'Gráfica',
        notasInternas: document.getElementById('gpmNotasInternas')?.value || '',
        condiciones: document.getElementById('gpmCondiciones')?.value || '',
        fechaEntrega: document.getElementById('gpmEntrega')?.value || '',
        conIva: document.getElementById('gpmTogIva')?.checked || false,
        descOn: document.getElementById('gpmTogDesc')?.checked || false,
        descVal: document.getElementById('gpmDescVal')?.value || '',
        descTipo: document.getElementById('gpmDescTipo')?.value || 'pct',
        items
    };
    localStorage.setItem('gecko_gpm_draft_nuevo', JSON.stringify(draft));
};

setInterval(function () {
    if (typeof window._gpmGuardarBorradorAuto === 'function') window._gpmGuardarBorradorAuto();
}, 5000);

// ── editarPresupuesto: detectar si es manual y abrir la sección correcta ──
const _editarPresupuestoOrigGPM = window.editarPresupuesto;
window.editarPresupuesto = function (id) {
    const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const _todos = lista.filter(x => String(x.id) === String(id));
    const p = _todos[_todos.length - 1];
    if (!p) return;
    // Editar SIEMPRE abre en el Presupuestador Manual, sin importar el origen de los ítems
    if (typeof window.switchMenu === 'function') window.switchMenu('presupuestoManual');
    window.abrirPresupuestadorManual(id);
};

console.log('🦎 GECKO: Presupuestador Manual (sección nativa) v2.0 cargado.');

// Auto-render presupuestoManual — restaura edición en curso si hubo recarga
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
        const hash = window.location.hash;
        const editingId = localStorage.getItem('gecko_gpm_editing_id');
        if (hash === '#presupuestoManual') {
            if (typeof window.abrirPresupuestadorManual === 'function') {
                if (editingId) {
                    if (typeof window.switchMenu === 'function') window.switchMenu('presupuestoManual');
                    window.abrirPresupuestadorManual(editingId);
                } else {
                    window.abrirPresupuestadorManual(null);
                }
            }
        }
    }, 800);
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

document.addEventListener('click', function () {
    document.querySelectorAll('[id^="estado-ot-dropdown-"]').forEach(d => {
        d.style.display = 'none';
    });
});

document.addEventListener('scroll', function () {
    document.querySelectorAll('[id^="estado-ot-dropdown-"]').forEach(d => {
        d.style.display = 'none';
    });
}, true);

// ════ Gráficos de Reportes con Chart.js ════
window.renderChartIngresos = function (lista, ahora) {
    const canvas = document.getElementById('canvasIngresosCategoria');
    if (!canvas || typeof Chart === 'undefined') return;
    lista = lista || JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    ahora = ahora || new Date();
    const MESES_NOM = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const meses6 = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
        meses6.push({ m: d.getMonth(), y: d.getFullYear(), label: MESES_NOM[d.getMonth()] });
    }
    const graf = [], ind = [];
    meses6.forEach(mes => {
        const ots = lista.filter(p => {
            if (p.status !== 'OT') return false;
            const pts = (p.fecha || '').split('/');
            if (pts.length < 3) return false;
            return parseInt(pts[1]) - 1 === mes.m && parseInt(pts[2]) === mes.y;
        });
        graf.push(ots.filter(p => p.categoria !== 'Industrial').reduce((a, p) => a + (p.total || 0), 0));
        ind.push(ots.filter(p => p.categoria === 'Industrial').reduce((a, p) => a + (p.total || 0), 0));
    });
    const prev = Chart.getChart(canvas);
    if (prev) prev.destroy();
    const ctx = canvas.getContext('2d');
    function grad(color) {
        const g = ctx.createLinearGradient(0, 0, 0, 150);
        g.addColorStop(0, color + '55');
        g.addColorStop(1, color + '00');
        return g;
    }
    new Chart(canvas, {
        type: 'line',
        data: {
            labels: meses6.map(m => m.label),
            datasets: [
                { label: 'Gráfica', data: graf, borderColor: '#378ADD', borderWidth: 2.5, tension: 0.4, pointRadius: 0, pointHoverRadius: 4, fill: true, backgroundColor: grad('#378ADD') },
                { label: 'Industrial', data: ind, borderColor: '#7F77DD', borderWidth: 2.5, tension: 0.4, pointRadius: 0, pointHoverRadius: 4, fill: true, backgroundColor: grad('#7F77DD') }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: { duration: 1400 },
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.dataset.label + ': $' + c.parsed.y.toLocaleString('es-AR') } } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#71717a', font: { size: 10 } } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#52525b', font: { size: 9 }, callback: v => { v = Math.abs(v); return '$' + (v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : (v / 1000).toFixed(0) + 'k'); } } }
            }
        }
    });
};

window.renderChartMix = function () {
    const canvas = document.getElementById('canvasMixVentas');
    if (!canvas || typeof Chart === 'undefined') return;
    const ranking = window.GECKO_MIX_RANKING || [];
    const COLORS = {
        'Gráfica': '#F15A24', 'Láser/CNC': '#E07A4E', 'Corpóreos': '#C98A5E',
        'Textil': '#6FA8A0', 'Industrial': '#5E84A8', 'Impresión 3D': '#8C7BA6', 'Otros': '#71717a'
    };
    const prev = Chart.getChart(canvas);
    if (prev) prev.destroy();
    if (ranking.length === 0) return;
    new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ranking.map(r => r[0]),
            datasets: [{
                data: ranking.map(r => r[1]),
                backgroundColor: ranking.map(r => COLORS[r[0]] || '#71717a'),
                borderColor: '#141417',
                borderWidth: 3,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '72%',
            animation: { animateRotate: true, duration: 1300 },
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.label + ': ' + c.parsed + ' trabajos' } } }
        }
    });
};

window.renderChartCrecimiento = function (lista, ahora) {
    const canvas = document.getElementById('canvasCrecimientoVentas');
    if (!canvas || typeof Chart === 'undefined') return;
    lista = lista || JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    ahora = ahora || new Date();
    const MESES_NOM = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const meses6 = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
        meses6.push({ m: d.getMonth(), y: d.getFullYear(), label: MESES_NOM[d.getMonth()] });
    }
    const totales = meses6.map(mes => {
        return lista.filter(p => {
            if (p.status !== 'OT') return false;
            const pts = (p.fecha || '').split('/');
            if (pts.length < 3) return false;
            return parseInt(pts[1]) - 1 === mes.m && parseInt(pts[2]) === mes.y;
        }).reduce((a, p) => a + (p.total || 0), 0);
    });

    const prev = Chart.getChart(canvas);
    if (prev) prev.destroy();
    const ctx = canvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 110);
    g.addColorStop(0, '#F15A2455');
    g.addColorStop(1, '#F15A2400');

    new Chart(canvas, {
        type: 'line',
        data: {
            labels: meses6.map(m => m.label),
            datasets: [{
                data: totales, borderColor: '#F15A24', borderWidth: 2.5,
                tension: 0.4, pointRadius: 0, pointHoverRadius: 4,
                fill: true, backgroundColor: g
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: { duration: 1400 },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: c => 'Ingresos: $' + c.parsed.y.toLocaleString('es-AR') } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#71717a', font: { size: 9 } } },
                y: { display: false }
            }
        }
    });
};

// ── FIX: Modal custom eliminar servicio y material ───────────────────────────
setTimeout(function () {
    window.eliminarTerminacion = function (id) {
        window.confirmGecko('¿Estás seguro de que deseas eliminar este servicio definitivamente?', 'Eliminar servicio').then(function (confirmado) {
            if (!confirmado) return;
            // BUG-004: capturar nombre ANTES del filter (para blacklist por nombre)
            var _svcEliminado = (window.geckoServicios || []).find(function (s) { return String(s.id) === String(id); });
            var nuevos = (window.geckoServicios || []).filter(function (t) { return String(t.id) !== String(id); });
            window.geckoServicios = nuevos;
            localStorage.setItem('geckoServicios', JSON.stringify(nuevos));
            if (typeof window.geckoApiEliminar === 'function') window.geckoApiEliminar('geckoServicios', id);
            if (typeof renderServicios === 'function') renderServicios();
            if (typeof window.mostrarExito === 'function') window.mostrarExito('Servicio eliminado correctamente');
            // BUG-004: si era servicio láser, persistir en blacklist y borrar de MySQL
            if (_svcEliminado && /corte laser|corte cnc|grabado laser/i.test(_svcEliminado.nombre || '')) {
                var _laserDel = JSON.parse(localStorage.getItem('geckoLaserEliminados') || '[]');
                var _nombreUp = (_svcEliminado.nombre || '').toUpperCase();
                if (!_laserDel.includes(_nombreUp)) { _laserDel.push(_nombreUp); }
                localStorage.setItem('geckoLaserEliminados', JSON.stringify(_laserDel));
                fetch('/app/api.php?endpoint=servicios', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: id })
                }).catch(function (e) { console.warn('GECKO-FIX BUG-004 DELETE error:', e); });
            }
        });
    };
    window.eliminarMaterial = function (id) {
        window.confirmGecko('¿Seguro que querés eliminar este material?', 'Eliminar material').then(function (confirmado) {
            if (!confirmado) return;
            var mats = JSON.parse(localStorage.getItem('gecko_materiales') || '[]').filter(function (m) { return String(m.id) !== String(id); });
            window.materiales = mats;
            localStorage.setItem('gecko_materiales', JSON.stringify(mats));
            if (typeof renderInsumos === 'function') renderInsumos();
            if (typeof window.poblarMaterialesGrafica === 'function') window.poblarMaterialesGrafica();
            if (typeof window.mostrarExito === 'function') window.mostrarExito('Material eliminado.', '¡Eliminado!');
        });
    };
}, 2000);
// ── FIN FIX modales custom eliminar ─────────────────────────────────────────

// ── FIX: Restaurar presupuesto en edición tras F5 ────────────────────────────
// Cuando el usuario edita un presupuesto manual y recarga, se reabre automáticamente.

// 1. Guardar ID en edición cada vez que se abre un presupuesto para editar
const _origEditarPresupuestoReload = window.editarPresupuesto;
window.editarPresupuesto = function (id) {
    const lista = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
    const p = lista.find(x => String(x.id) === String(id));
    if (p) {
        // Editar SIEMPRE abre en el Presupuestador Manual, sin importar el origen de los ítems
        localStorage.setItem('gecko_gpm_editing_id', String(id));
    }
    if (typeof _origEditarPresupuestoReload === 'function') _origEditarPresupuestoReload(id);
};

// 2. Al cargar la app, si había un presupuesto en edición, reabrirlo
document.addEventListener('geckoDB_ready', function () {
    const editingId = localStorage.getItem('gecko_gpm_editing_id');
    if (!editingId) return;
    const activeTab = localStorage.getItem('gecko_activeTab') || '';
    if (activeTab !== 'presupuestoManual') return;
    setTimeout(function () {
        if (typeof window.switchMenu === 'function') window.switchMenu('presupuestoManual');
        if (typeof window.abrirPresupuestadorManual === 'function') {
            window.abrirPresupuestadorManual(editingId);
        }
    }, 600);
});

// 3. Limpiar el ID guardado cuando el usuario cancela o guarda
const _origGpmCerrarReload = window._gpmCerrar;
window._gpmCerrar = function () {
    localStorage.removeItem('gecko_gpm_editing_id');
    if (typeof _origGpmCerrarReload === 'function') _origGpmCerrarReload();
};
// ── FIN FIX restaurar edición tras recarga ───────────────────────────────────

// ── FIX BUG-001: Alias para poblarMaterialesGraficaCascada (typo en main.js) ──
// main.js line 4070 llama poblarMaterialesGraficaCascada() que no existe,
// tirando error que corta el guardado antes de registrar los precios.
window.poblarMaterialesGraficaCascada = function () {
    if (typeof window.poblarMaterialesGrafica === 'function') {
        window.poblarMaterialesGrafica();
    }
};

// ── FIX: Persistir borrador del modal de material al cerrar accidentalmente ──
// Si el usuario cierra el modal clickando afuera (sin guardar), los campos
// se guardan en localStorage como borrador y se restauran al volver a abrir.

// IDs de todos los campos del formulario de material
var _GECKO_MAT_FIELDS = [
    'matNombre', 'matCat', 'matSubCat', 'matUnidad', 'matUnidadVenta',
    'matCostoUSD', 'matCostoReal', 'matContenido', 'matAncho', 'matLargo',
    'matEspesor', 'matPeso', 'matWatts', 'matLumenes', 'matDensidad', 'matStock', 'matNota', 'matMultiplicador',
    'matPrecioVentaManual', 'matPrecioGremio', 'matMultGremio', 'matCortePrecioML',
    'matCorteSpeed', 'matCortePower'
];

function _geckoSaveMatDraft() {
    var draft = {};
    var hasData = false;
    _GECKO_MAT_FIELDS.forEach(function (id) {
        var el = document.getElementById(id);
        if (el && el.value) {
            draft[id] = el.value;
            hasData = true;
        }
    });
    // Guardar editId si estamos editando
    var form = document.getElementById('formMaterial');
    if (form && form.dataset.editId) draft._editId = form.dataset.editId;
    // Solo guardar si hay datos reales
    if (hasData) {
        localStorage.setItem('gecko_mat_draft', JSON.stringify(draft));
    }
}

function _geckoRestoreMatDraft() {
    var raw = localStorage.getItem('gecko_mat_draft');
    if (!raw) return;
    try {
        var draft = JSON.parse(raw);
        // Solo restaurar si NO es una edición nueva (no tenemos editId en el form)
        var form = document.getElementById('formMaterial');
        if (!form) return;
        // Si el draft era de una edición, no restaurar (ya se carga desde editarMaterial)
        if (draft._editId) return;
        _GECKO_MAT_FIELDS.forEach(function (id) {
            if (draft[id]) {
                var el = document.getElementById(id);
                if (el) el.value = draft[id];
            }
        });
    } catch (e) { }
}

// Interceptar intentarCerrarModal para guardar borrador cuando cierra modalMaterial
var _origIntentarCerrar = window.intentarCerrarModal;
window.intentarCerrarModal = function (id) {
    if (id === 'modalMaterial') {
        var form = document.getElementById('formMaterial');
        // Solo guardar borrador si el formulario tiene datos y NO fue submit (guardado real)
        if (form && !form.dataset.editId) {
            var nombre = document.getElementById('matNombre');
            if (nombre && nombre.value.trim()) {
                _geckoSaveMatDraft();
            }
        }
    }
    if (typeof _origIntentarCerrar === 'function') _origIntentarCerrar(id);
};

// Interceptar abrirModalMaterial para restaurar borrador
var _origAbrirModalMaterial = window.abrirModalMaterial;
window.abrirModalMaterial = function () {
    if (typeof _origAbrirModalMaterial === 'function') _origAbrirModalMaterial();
    // Restaurar borrador si existe (después del reset del original)
    setTimeout(_geckoRestoreMatDraft, 50);
};

// Limpiar borrador al guardar exitosamente
var _origFormMatSubmit = document.getElementById('formMaterial');
if (_origFormMatSubmit) {
    _origFormMatSubmit.addEventListener('submit', function () {
        localStorage.removeItem('gecko_mat_draft');
    }, true); // capture=true para correr antes del handler de main.js
}
// ── FIN FIX borrador modal material ─────────────────────────────────────────

// ── FIX BUG-001 + BORRADOR MODAL MATERIAL (versión corregida) ────────────────
window.addEventListener('load', function () {
    setTimeout(function () {

        // ── PARTE A: BUG-001 — precioVenta no se guardaba cuando costo=0 ──
        // El listener se registra acá (no en parse time) para garantizar que
        // formMaterial existe en el DOM.
        var _fm2 = document.getElementById('formMaterial');
        if (_fm2) {
            _fm2.addEventListener('submit', function () {
                // Capturar valores ANTES de que main.js resetee el formulario
                var _pv = parseFloat(document.getElementById('matPrecioVentaManual')?.value) || 0;
                var _pg = parseFloat(document.getElementById('matPrecioGremio')?.value) || 0;
                var _est = document.getElementById('matEstrategia')?.value || 'dinamica';
                var _eid = this.dataset.editId || null;
                if (_est !== 'fija' || _pv === 0) return;
                setTimeout(function () {
                    var mats = JSON.parse(localStorage.getItem('gecko_materiales') || '[]');
                    var target = _eid
                        ? mats.find(function (m) { return String(m.id) === String(_eid); })
                        : mats[mats.length - 1];
                    if (target) {
                        target.precioVenta = _pv;
                        if (_pg > 0) target.precioGremio = _pg;
                        localStorage.setItem('gecko_materiales', JSON.stringify(mats));
                        window.materiales = mats;
                        if (typeof renderInsumos === 'function') renderInsumos();
                        console.log('🦎 GECKO-FIX BUG-001: precioVenta parcheado →', _pv);
                    }
                }, 350);
            });
        }

        // ── PARTE B: BORRADOR — restaurar datos si modal se cerró accidentalmente ──

        var _DRAFT_FIELDS = [
            'matNom', 'matCat', 'matSubCat', 'matUnidad', 'matUnidadVenta',
            'matContenidoUnidad', 'matCostUSD', 'matCostARS', 'matStock',
            'matMult', 'matAncho', 'matLargo', 'matEspesor', 'matNota',
            'matPrecioVentaManual', 'matPrecioGremio', 'matMultGremio',
            'matCortePrecioML', 'matCorteSpeed', 'matCortePower'
        ];

        function _saveDraft2() {
            var draft = { _est: document.getElementById('matEstrategia')?.value || 'dinamica' };
            var hasData = false;
            _DRAFT_FIELDS.forEach(function (id) {
                var el = document.getElementById(id);
                if (el && el.value) { draft[id] = el.value; hasData = true; }
            });
            if (hasData) localStorage.setItem('gecko_mat_draft2', JSON.stringify(draft));
        }

        function _restoreDraft2() {
            var raw = localStorage.getItem('gecko_mat_draft2');
            if (!raw) return;
            var form2 = document.getElementById('formMaterial');
            if (form2 && form2.dataset.editId) return;
            try {
                var d = JSON.parse(raw);
                _DRAFT_FIELDS.forEach(function (id) {
                    if (d[id]) { var el = document.getElementById(id); if (el) el.value = d[id]; }
                });
                if (d._est && typeof setEstrategiaVenta === 'function') setEstrategiaVenta(d._est);
            } catch (e) { }
        }

        // Cuando el usuario clickea "NUEVO INSUMO" explícitamente → limpiar borrador
        document.addEventListener('click', function (e) {
            var btn = e.target.closest('button');
            if (btn && (btn.textContent || '').toUpperCase().includes('NUEVO INSUMO')) {
                localStorage.removeItem('gecko_mat_draft2');
            }
        });

        // Al cerrar modal accidentalmente → guardar borrador
        var _origICM2 = window.intentarCerrarModal;
        window.intentarCerrarModal = function (id) {
            if (id === 'modalMaterial') {
                var n = document.getElementById('matNom');
                if (n && n.value.trim()) _saveDraft2();
            }
            if (typeof _origICM2 === 'function') _origICM2(id);
        };

        // Al abrir modal → restaurar borrador si existe
        var _origAMM2 = window.abrirModalMaterial;
        window.abrirModalMaterial = function () {
            if (typeof _origAMM2 === 'function') _origAMM2();
            setTimeout(_restoreDraft2, 80);
        };

        // Al guardar correctamente → limpiar borrador
        var _fm3 = document.getElementById('formMaterial');
        if (_fm3) {
            _fm3.addEventListener('submit', function () {
                localStorage.removeItem('gecko_mat_draft2');
            }, true);
        }

    }, 1700);
});
// ── FIN FIX BUG-001 + BORRADOR ───────────────────────────────────────────────

// ── FIX BUG-001 + BORRADOR v3 (corrección definitiva) ────────────────────────
window.addEventListener('load', function () {
    setTimeout(function () {

        // == BUG-001: Capturar precio ANTES de que main.js haga form.reset() ==
        // El truco: capturar en el click del botón submit, antes del evento submit
        var _geckoCaptura = null;
        var _submitBtn = document.querySelector('#modalMaterial button[type="submit"]');
        if (_submitBtn) {
            _submitBtn.addEventListener('mousedown', function () {
                _geckoCaptura = {
                    pv: parseFloat(document.getElementById('matPrecioVentaManual')?.value) || 0,
                    pg: parseFloat(document.getElementById('matPrecioGremio')?.value) || 0,
                    est: document.getElementById('matEstrategia')?.value || 'dinamica',
                    eid: document.getElementById('formMaterial')?.dataset?.editId || null
                };
            });
        }

        var _fm = document.getElementById('formMaterial');
        if (_fm) {
            _fm.addEventListener('submit', function () {
                localStorage.removeItem('gecko_mat_draft3');
                var cap = _geckoCaptura;
                _geckoCaptura = null;
                if (!cap || cap.est !== 'fija' || cap.pv === 0) return;
                setTimeout(function () {
                    var mats = JSON.parse(localStorage.getItem('gecko_materiales') || '[]');
                    var target = cap.eid
                        ? mats.find(function (m) { return String(m.id) === String(cap.eid); })
                        : mats[mats.length - 1];
                    if (target) {
                        target.precioVenta = cap.pv;
                        if (cap.pg > 0) target.precioGremio = cap.pg;
                        localStorage.setItem('gecko_materiales', JSON.stringify(mats));
                        window.materiales = mats;
                        if (typeof renderInsumos === 'function') renderInsumos();
                        console.log('🦎 BUG-001 parcheado: precioVenta =', cap.pv);
                    }
                }, 250);
            });
        }

        // == BORRADOR: guardar al cerrar accidentalmente, restaurar al reabrir ==
        var _DRAFT3_FIELDS = [
            'matNom','matCat','matSubCat','matUnidad','matUnidadVenta',
            'matContenidoUnidad','matCostUSD','matCostARS','matStock',
            'matMult','matAncho','matLargo','matEspesor','matNota',
            'matPrecioVentaManual','matPrecioGremio','matMultGremio',
            'matCortePrecioML','matCorteSpeed','matCortePower'
        ];

        function _saveDraft3() {
            var draft = { _est: document.getElementById('matEstrategia')?.value || 'dinamica' };
            var hasData = false;
            _DRAFT3_FIELDS.forEach(function (id) {
                var el = document.getElementById(id);
                if (el && el.value) { draft[id] = el.value; hasData = true; }
            });
            if (hasData) localStorage.setItem('gecko_mat_draft3', JSON.stringify(draft));
        }

        function _restoreDraft3() {
            var raw = localStorage.getItem('gecko_mat_draft3');
            if (!raw) return;
            var form = document.getElementById('formMaterial');
            if (form && form.dataset.editId) return;
            try {
                var d = JSON.parse(raw);
                _DRAFT3_FIELDS.forEach(function (id) {
                    if (d[id]) {
                        var el = document.getElementById(id);
                        if (el) el.value = d[id];
                    }
                });
                if (d._est && typeof setEstrategiaVenta === 'function') {
                    setEstrategiaVenta(d._est);
                }
            } catch (e) {}
        }

        // Cerrar accidentalmente (backdrop click) → guardar borrador
        var _origICM3 = window.intentarCerrarModal;
        window.intentarCerrarModal = function (id) {
            if (id === 'modalMaterial') {
                var n = document.getElementById('matNom');
                if (n && n.value.trim()) _saveDraft3();
            }
            if (typeof _origICM3 === 'function') _origICM3(id);
        };

        // Cancelar explícitamente → limpiar borrador
        var _cancelBtn = document.querySelector('#modalMaterial .flex.gap-4 button[type="button"]');
        if (_cancelBtn) {
            _cancelBtn.addEventListener('click', function () {
                localStorage.removeItem('gecko_mat_draft3');
            });
        }

        // Abrir modal → restaurar borrador si existe
        var _origAMM3 = window.abrirModalMaterial;
        window.abrirModalMaterial = function () {
            if (typeof _origAMM3 === 'function') _origAMM3();
            setTimeout(_restoreDraft3, 100);
        };

    }, 1800);
});
// ── FIN FIX BUG-001 + BORRADOR v3 ────────────────────────────────────────────

// ── FIX BUG-001 v4: intercepción de localStorage + carga correcta en edición ──
window.addEventListener('load', function () {
    setTimeout(function () {

        // PASO 1: Capturar precio manual ANTES del submit (mousedown en botón guardar)
        var _geckoPrecioCaptura = null;

        document.addEventListener('mousedown', function (e) {
            var btn = e.target.closest('button[type="submit"]');
            if (!btn) return;
            var modal = btn.closest('#modalMaterial');
            if (!modal) return;
            var est = document.getElementById('matEstrategia')?.value;
            if (est !== 'fija') return;
            _geckoPrecioCaptura = {
                pv: parseFloat(document.getElementById('matPrecioVentaManual')?.value) || 0,
                pg: parseFloat(document.getElementById('matPrecioGremio')?.value) || 0,
                eid: document.getElementById('formMaterial')?.dataset?.editId || null
            };
        }, true);

        // PASO 2: Interceptar localStorage.setItem para inyectar precioVenta al guardar
        var _origLS = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
            if (key === 'gecko_materiales' && _geckoPrecioCaptura) {
                try {
                    var mats = JSON.parse(value);
                    var cap = _geckoPrecioCaptura;
                    var target = cap.eid
                        ? mats.find(function (m) { return String(m.id) === String(cap.eid); })
                        : mats[mats.length - 1];
                    if (target && cap.pv > 0) {
                        target.precioVenta = cap.pv;
                        if (cap.pg > 0) target.precioGremio = cap.pg;
                    }
                    value = JSON.stringify(mats);
                } catch (e) {}
                _geckoPrecioCaptura = null;
            }
            _origLS.call(this, key, value);
        };

        // PASO 3: Override editarMaterial para cargar precioVenta correctamente
        var _origEditarMat = window.editarMaterial;
        window.editarMaterial = function (id) {
            if (typeof _origEditarMat === 'function') _origEditarMat(id);
            setTimeout(function () {
                var mats = JSON.parse(localStorage.getItem('gecko_materiales') || '[]');
                var mat = mats.find(function (m) { return String(m.id) === String(id); });
                if (!mat || mat.estrategiaVenta !== 'fija') return;
                // Restaurar precio venta real (main.js lo pisa con costo×mult)
                if (mat.precioVenta > 0) {
                    var el = document.getElementById('matPrecioVentaManual');
                    if (el) el.value = mat.precioVenta;
                }
                if (mat.precioGremio > 0) {
                    var elg = document.getElementById('matPrecioGremio');
                    if (elg) elg.value = mat.precioGremio;
                }
            }, 150);
        };

    }, 1900);
});

// ── FIX renderInsumos: usar precioVenta y precioGremio guardados cuando existen ─
// main.js líneas 3544-3545 siempre calcula costo × mult, ignorando m.precioVenta.
// Este fix intercepta localStorage para parchear los materiales antes del render.
setTimeout(function () {
    var _origRenderInsumos = window.renderInsumos;
    if (typeof _origRenderInsumos !== 'function') return;
    window.renderInsumos = function () {
        // Parchear temporalmente los materiales en memoria antes de renderizar
        var mats = window.materiales || [];
        mats.forEach(function (m) {
            if (m.estrategiaVenta === 'fija') {
                // Guardar multiplicadores reales para restaurar después
                m._multOrig = m.multiplicador;
                m._multGremioOrig = m.multGremio;
                // Si tiene precioVenta guardado y costo=0, simular multiplicador=1
                // y poner el precio directamente en costo para que mult×costo = precio
                if (m.precioVenta > 0 && (m.costo === 0 || !m.costo)) {
                    m._costoOrig = m.costo;
                    m.costo = m.precioVenta;
                    m.multiplicador = 1;
                    if (m.precioGremio > 0) {
                        m.multGremio = m.precioGremio / m.precioVenta;
                    }
                }
            }
        });
        _origRenderInsumos.apply(this, arguments);
        // Restaurar valores originales
        mats.forEach(function (m) {
            if (m.estrategiaVenta === 'fija') {
                if (m._costoOrig !== undefined) {
                    m.costo = m._costoOrig;
                    delete m._costoOrig;
                }
                if (m._multOrig !== undefined) {
                    m.multiplicador = m._multOrig;
                    delete m._multOrig;
                }
                if (m._multGremioOrig !== undefined) {
                    m.multGremio = m._multGremioOrig;
                    delete m._multGremioOrig;
                }
            }
        });
    };
    console.log('🦎 GECKO-FIX: renderInsumos parcheado para precioVenta fija.');
}, 2000);
// ── FIN FIX renderInsumos ────────────────────────────────────────────────────
// ── FIN FIX BUG-001 v4 ───────────────────────────────────────────────────────

// ── FIX renderInsumos v2: parchear DOM después del render ────────────────────
// renderInsumos usa variable local 'materiales' (closure de main.js), no
// window.materiales. La única forma de corregir los precios es parchear el
// DOM después de que la función dibuje la tabla.
setTimeout(function () {
    var _origRI2 = window.renderInsumos;
    if (typeof _origRI2 !== 'function') return;

    window.renderInsumos = function () {
        _origRI2.apply(this, arguments);
        // Parchear precios en el DOM para materiales con estrategia FIJA
        setTimeout(function () {
            var mats = JSON.parse(localStorage.getItem('gecko_materiales') || '[]');
            var tbody = document.getElementById('tablaMaterialesBody');
            if (!tbody) return;
            var rows = tbody.querySelectorAll('tr');
            rows.forEach(function (tr) {
                // Extraer ID del material desde el botón editar
                var editBtn = tr.querySelector('button[onclick*="editarMaterial"]');
                if (!editBtn) return;
                var match = editBtn.getAttribute('onclick').match(/editarMaterial\('?([^')]+)'?\)/);
                if (!match) return;
                var id = match[1];
                var mat = mats.find(function (m) { return String(m.id) === String(id); });
                if (!mat || mat.estrategiaVenta !== 'fija') return;
                if (!mat.precioVenta && !mat.precioGremio) return;

                // Encontrar celdas de precio en la fila
                var tds = tr.querySelectorAll('td');
                // Celda VENTA (índice 3) y GREMIO (índice 4)
                var ventaTd = tds[3];
                var gremioTd = tds[4];
                var fmt = function (n) {
                    return new Intl.NumberFormat('es-AR', {
                        style: 'currency', currency: 'ARS',
                        minimumFractionDigits: 0, maximumFractionDigits: 0
                    }).format(n);
                };

                if (ventaTd && mat.precioVenta > 0) {
                    var ventaEl = ventaTd.querySelector('p.font-black, p.text-gecko, strong, p');
                    if (ventaEl) ventaEl.textContent = fmt(mat.precioVenta);
                }
                if (gremioTd && mat.precioGremio > 0) {
                    var gremioEl = gremioTd.querySelector('p.font-black, p, strong');
                    if (gremioEl) gremioEl.textContent = fmt(mat.precioGremio);
                }
            });
        }, 50);
    };
    console.log('🦎 GECKO-FIX: renderInsumos v2 — DOM patch activo.');
}, 2100);

// ── FIX BUG-004: Re-aplicar eliminaciones láser post-sync MySQL ──────────────
// Después de que gecko-api.js sincroniza MySQL y llama seed_laser, este listener
// re-aplica el blacklist "geckoLaserEliminados" sobre geckoServicios en localStorage,
// evitando que servicios eliminados por el usuario vuelvan por seed_laser o reload.
document.addEventListener('geckoDB_ready', function () {
    var eliminados = JSON.parse(localStorage.getItem('geckoLaserEliminados') || '[]');
    if (!eliminados.length) return;

    var servicios = JSON.parse(localStorage.getItem('geckoServicios') || '[]');

    // GUARDA CRÍTICA: si localStorage está vacío en este momento,
    // es un timing issue — no hacer nada para no corromper datos
    if (servicios.length === 0) {
        console.warn('🦎 GECKO-FIX BUG-004: geckoServicios vacío al disparar geckoDB_ready — abortando para evitar corrupción.');
        return;
    }

    var filtrados = servicios.filter(function (s) {
        return !eliminados.includes((s.nombre || '').toUpperCase());
    });

    // GUARDA: nunca escribir si el resultado es vacío o demasiado reducido
    if (filtrados.length === 0) {
        console.warn('🦎 GECKO-FIX BUG-004: filtrado resultó en lista vacía — abortando para evitar pérdida de datos.');
        return;
    }

    if (filtrados.length < servicios.length) {
        localStorage.setItem('geckoServicios', JSON.stringify(filtrados));
        window.geckoServicios = filtrados;
        servicios.filter(function (s) {
            return eliminados.includes((s.nombre || '').toUpperCase());
        }).forEach(function (s) {
            fetch('/app/api.php?endpoint=servicios', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: s.id })
            }).catch(function(e) { console.warn('GECKO-FIX BUG-004 re-delete error:', e); });
        });
        console.log('🦎 GECKO-FIX BUG-004: Re-aplicada eliminación de ' +
            (servicios.length - filtrados.length) + ' servicio(s) láser post-sync.');
    }
});

// ── BUG-005: Sección Grabado en Configuración ──────────────────────────────

window._grabadoEliminar = [];
window._grabadoParamsTemp = {};

window.renderTablaParametrosGrabado = function () {
    var tbody = document.getElementById('tablaParametrosGrabado');
    if (!tbody) return;

    var servicios = JSON.parse(localStorage.getItem('geckoServicios') || '[]');
    var grabadoParams = JSON.parse(localStorage.getItem('gecko_grabadoParams') || '{}');
    var eliminados = JSON.parse(localStorage.getItem('geckoLaserEliminados') || '[]');

    var grabados = servicios.filter(function (s) {
        return /grabado/i.test(s.nombre) && !eliminados.includes((s.nombre || '').toUpperCase());
    });

    if (grabados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="py-10 text-center text-zinc-500 italic text-sm">' +
            'Sin parámetros de grabado configurados.<br>' +
            '<span class="text-[11px]">Usá el botón + para agregar uno.</span>' +
            '</td></tr>';
        return;
    }

    tbody.innerHTML = grabados.map(function (s) {
        var nombreSeguro = (s.nombre || '').replace(/"/g, '&quot;');
        var params = grabadoParams[s.nombre] || grabadoParams[(s.nombre || '').toUpperCase()] || {};
        var precio = s.precioVenta || s.precio || params.precio || '';
        var speed = params.speed !== undefined ? params.speed : '';
        var power = params.power !== undefined ? params.power : '';
        return '<tr class="hover:bg-white/3 transition-colors" data-id-servicio="' + (s.id || '') + '" data-nombre-original="' + nombreSeguro + '">' +
            '<td style="padding:12px 20px;">' +
            '<input type="text" data-servicio="' + nombreSeguro + '" data-campo="nombre"' +
            ' value="' + nombreSeguro + '"' +
            ' class="w-full bg-transparent border-b border-zinc-800 focus:border-gecko outline-none text-white font-bold text-[13px] py-1 uppercase tracking-wide"' +
            ' style="min-width:180px;" oninput="window._actualizarParamGrabado(this)">' +
            '<p style="color:#52525b;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-top:2px;">MIN</p>' +
            '</td>' +
            '<td style="padding:12px 16px;text-align:center;">' +
            '<input type="number" data-servicio="' + nombreSeguro + '" data-campo="speed"' +
            ' value="' + speed + '" placeholder="—"' +
            ' class="w-16 text-center bg-transparent border-b border-zinc-800 focus:border-gecko outline-none text-zinc-300 font-bold text-[13px] py-1"' +
            ' oninput="window._actualizarParamGrabado(this)">' +
            '</td>' +
            '<td style="padding:12px 16px;text-align:center;">' +
            '<input type="number" data-servicio="' + nombreSeguro + '" data-campo="power"' +
            ' value="' + power + '" placeholder="—"' +
            ' class="w-16 text-center bg-transparent border-b border-zinc-800 focus:border-gecko outline-none text-zinc-300 font-bold text-[13px] py-1"' +
            ' oninput="window._actualizarParamGrabado(this)">' +
            '</td>' +
            '<td style="padding:12px 16px;text-align:right;">' +
            '<div style="display:flex;align-items:center;justify-content:flex-end;gap:4px;">' +
            '<span style="color:#52525b;font-size:12px;">$</span>' +
            '<input type="number" data-servicio="' + nombreSeguro + '" data-campo="precio"' +
            ' value="' + precio + '" placeholder="0"' +
            ' class="w-24 text-right bg-transparent border-b border-zinc-800 focus:border-gecko outline-none text-gecko font-black text-[14px] py-1"' +
            ' oninput="window._actualizarParamGrabado(this)">' +
            '</div>' +
            '</td>' +
            '<td style="padding:12px;text-align:center;">' +
            '<button onclick="window._eliminarFilaGrabado(this)"' +
            ' style="width:28px;height:28px;border-radius:8px;background:transparent;border:1px solid rgba(239,68,68,0.2);color:#71717a;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.2s;"' +
            ' onmouseover="this.style.background=\'rgba(239,68,68,0.15)\';this.style.borderColor=\'rgba(239,68,68,0.5)\';this.style.color=\'#ef4444\'"' +
            ' onmouseout="this.style.background=\'transparent\';this.style.borderColor=\'rgba(239,68,68,0.2)\';this.style.color=\'#71717a\'"' +
            ' title="Eliminar">' +
            '<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
            '<path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>' +
            '</svg></button>' +
            '</td>' +
            '</tr>';
    }).join('');
};

window._actualizarParamGrabado = function (input) {
    var servicio = input.dataset.servicio;
    var campo = input.dataset.campo;
    if (!window._grabadoParamsTemp[servicio]) window._grabadoParamsTemp[servicio] = {};
    window._grabadoParamsTemp[servicio][campo] = parseFloat(input.value) || input.value;
};

window._eliminarFilaGrabado = function (btn) {
    var tr = btn.closest('tr');
    if (!tr) return;
    var nombreOriginal = tr.dataset.nombreOriginal;
    var idServicio = tr.dataset.idServicio;
    var eliminados = JSON.parse(localStorage.getItem('geckoLaserEliminados') || '[]');
    var key = (nombreOriginal || '').toUpperCase();
    if (key && !eliminados.includes(key)) {
        eliminados.push(key);
        localStorage.setItem('geckoLaserEliminados', JSON.stringify(eliminados));
    }
    window._grabadoEliminar = window._grabadoEliminar || [];
    window._grabadoEliminar.push({ nombre: nombreOriginal, id: idServicio });
    tr.style.opacity = '0';
    tr.style.transition = 'opacity 0.3s';
    setTimeout(function () {
        tr.remove();
        var tbody = document.getElementById('tablaParametrosGrabado');
        if (tbody && !tbody.querySelector('tr[data-nombre-original]') && !tbody.querySelector('.fila-grabado-nueva')) {
            window.renderTablaParametrosGrabado();
        }
    }, 300);
};

window._agregarFilaGrabadoNueva = function () {
    var tbody = document.getElementById('tablaParametrosGrabado');
    if (!tbody) return;
    var placeholder = tbody.querySelector('td[colspan]');
    if (placeholder) tbody.innerHTML = '';

    var tr = document.createElement('tr');
    tr.className = 'fila-grabado-nueva';

    var td1 = document.createElement('td');
    td1.style.cssText = 'padding:12px 20px;';
    var inp1 = document.createElement('input');
    inp1.type = 'text';
    inp1.className = 'fila-nueva-nombre';
    inp1.placeholder = 'Ej: GRABADO LASER - MDF';
    inp1.style.cssText = 'width:100%;background:transparent;border:none;outline:none;color:white;font-weight:700;font-size:13px;padding:2px 0;font-family:inherit;text-transform:uppercase;';
    var sub1 = document.createElement('p');
    sub1.textContent = 'MIN';
    sub1.style.cssText = 'color:#52525b;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-top:2px;';
    td1.appendChild(inp1);
    td1.appendChild(sub1);

    var mkTdCenter = function (cls) {
        var td = document.createElement('td');
        td.style.cssText = 'padding:12px 16px;text-align:center;';
        var inp = document.createElement('input');
        inp.type = 'number';
        inp.className = cls;
        inp.placeholder = '—';
        inp.style.cssText = 'width:64px;text-align:center;background:transparent;border:none;border-bottom:1px solid #3f3f46;outline:none;color:#d4d4d8;font-weight:700;font-size:13px;padding:2px 0;font-family:inherit;';
        td.appendChild(inp);
        return td;
    };

    var td4 = document.createElement('td');
    td4.style.cssText = 'padding:12px 16px;text-align:right;';
    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;gap:4px;';
    var sign = document.createElement('span');
    sign.textContent = '$';
    sign.style.cssText = 'color:#52525b;font-size:12px;';
    var inpPrecio = document.createElement('input');
    inpPrecio.type = 'number';
    inpPrecio.className = 'fila-nueva-precio';
    inpPrecio.placeholder = '0';
    inpPrecio.style.cssText = 'width:96px;text-align:right;background:transparent;border:none;border-bottom:1px solid #3f3f46;outline:none;color:#f15a24;font-weight:900;font-size:14px;padding:2px 0;font-family:inherit;';
    wrapper.appendChild(sign);
    wrapper.appendChild(inpPrecio);
    td4.appendChild(wrapper);

    var td5 = document.createElement('td');
    td5.style.cssText = 'padding:12px;text-align:center;';
    var btnElim = document.createElement('button');
    btnElim.textContent = '✕';
    btnElim.style.cssText = 'background:none;border:none;color:#3f3f46;font-size:16px;font-weight:900;cursor:pointer;line-height:1;';
    btnElim.onmouseover = function () { this.style.color = '#ef4444'; };
    btnElim.onmouseout = function () { this.style.color = '#3f3f46'; };
    btnElim.onclick = function () { tr.remove(); };
    td5.appendChild(btnElim);

    tr.appendChild(td1);
    tr.appendChild(mkTdCenter('fila-nueva-speed'));
    tr.appendChild(mkTdCenter('fila-nueva-power'));
    tr.appendChild(td4);
    tr.appendChild(td5);

    tbody.appendChild(tr);
    inp1.focus();
};

window._guardarParametrosGrabado = async function () {
    var servicios = JSON.parse(localStorage.getItem('geckoServicios') || '[]');
    var grabadoParams = JSON.parse(localStorage.getItem('gecko_grabadoParams') || '{}');

    // a. Procesar eliminaciones pendientes
    var pendElim = window._grabadoEliminar || [];
    pendElim.forEach(function (e) {
        var idx = servicios.findIndex(function (s) { return s.nombre === e.nombre || s.id === e.id; });
        if (idx !== -1) servicios.splice(idx, 1);
        delete grabadoParams[e.nombre];
    });
    if (pendElim.length > 0) {
        await Promise.all(pendElim.filter(function (e) { return e.id; }).map(function (e) {
            return fetch('/app/api.php?endpoint=servicios', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: e.id })
            }).catch(function () { });
        }));
    }
    window._grabadoEliminar = [];

    // b. Procesar renombres de filas existentes
    document.querySelectorAll('#tablaParametrosGrabado tr[data-nombre-original]').forEach(function (tr) {
        var nombreOriginal = tr.dataset.nombreOriginal;
        var inputNombre = tr.querySelector('input[data-campo="nombre"]');
        var nombreNuevo = inputNombre ? inputNombre.value.trim().toUpperCase() : '';
        if (!nombreNuevo || nombreNuevo === nombreOriginal) return;
        var idx = servicios.findIndex(function (s) { return s.nombre === nombreOriginal; });
        if (idx !== -1) {
            servicios[idx].nombre = nombreNuevo;
            if (grabadoParams[nombreOriginal]) {
                grabadoParams[nombreNuevo] = grabadoParams[nombreOriginal];
                delete grabadoParams[nombreOriginal];
            }
            tr.querySelectorAll('input[data-servicio]').forEach(function (inp) { inp.dataset.servicio = nombreNuevo; });
            tr.dataset.nombreOriginal = nombreNuevo;
        }
    });

    // c. Procesar speed/power/precio de filas existentes
    document.querySelectorAll('#tablaParametrosGrabado tr[data-nombre-original]').forEach(function (tr) {
        var nombre = tr.dataset.nombreOriginal;
        if (!grabadoParams[nombre]) grabadoParams[nombre] = {};
        tr.querySelectorAll('input[data-campo]').forEach(function (inp) {
            var campo = inp.dataset.campo;
            if (campo === 'nombre') return;
            var val = parseFloat(inp.value);
            if (!isNaN(val)) {
                grabadoParams[nombre][campo] = val;
                if (campo === 'precio') {
                    var idx = servicios.findIndex(function (s) { return s.nombre === nombre; });
                    if (idx !== -1) {
                        servicios[idx].precio = val;
                        servicios[idx].precioVenta = val;
                    }
                }
            }
        });
    });

    // d. Procesar filas nuevas
    document.querySelectorAll('.fila-grabado-nueva').forEach(function (tr) {
        var inpNombre = tr.querySelector('.fila-nueva-nombre');
        var nombre = inpNombre ? inpNombre.value.trim().toUpperCase() : '';
        if (!nombre) return;
        var speed = parseFloat((tr.querySelector('.fila-nueva-speed') || {}).value) || 0;
        var power = parseFloat((tr.querySelector('.fila-nueva-power') || {}).value) || 0;
        var precio = parseFloat((tr.querySelector('.fila-nueva-precio') || {}).value) || 0;
        var existeIdx = servicios.findIndex(function (s) { return (s.nombre || '').trim().toUpperCase() === nombre; });
        if (existeIdx === -1) {
            servicios.push({ id: 'grabado_' + Date.now(), nombre: nombre, unidad: 'min', precio: precio, precioVenta: precio, categoria: 'Servicios de Grabado', costo: 0 });
        } else {
            servicios[existeIdx].precio = precio;
            servicios[existeIdx].precioVenta = precio;
        }
        grabadoParams[nombre] = { speed: speed, power: power, precio: precio };
    });

    // e. Persistir en localStorage
    localStorage.setItem('geckoServicios', JSON.stringify(servicios));
    localStorage.setItem('gecko_grabadoParams', JSON.stringify(grabadoParams));

    // f. Sincronizar grabados con MySQL vía PUT (no depende del filtro del original)
    try {
        var grabadoServs = servicios.filter(function (s) { return /grabado/i.test(s.nombre); });
        await Promise.all(grabadoServs.map(function (s) {
            return fetch('/app/api.php?endpoint=servicios', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: s.id, nombre: s.nombre, categoria: s.categoria || 'Servicios de Grabado', costo: 0, unidad: s.unidad || 'min', precio: s.precio || 0 })
            }).catch(function () { });
        }));
    } catch (e) {
        console.warn('GECKO BUG-005: Error sincronizando grabados con API.', e);
    }
};

function _ensureBotonAgregarGrabado() {
    var panel = document.getElementById('panelParamsGrabado');
    if (!panel || panel.querySelector('.btn-agregar-grabado')) return;
    var btn = document.createElement('button');
    btn.className = 'btn-agregar-grabado';
    btn.style.cssText = 'margin-top:12px;padding:8px 16px;border-radius:8px;background:transparent;border:1px solid #3f3f46;color:#71717a;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;cursor:pointer;transition:all 0.2s;';
    btn.textContent = '+ Agregar Grabado';
    btn.onmouseover = function () { this.style.borderColor = 'rgba(241,90,36,0.5)'; this.style.color = '#f15a24'; };
    btn.onmouseout = function () { this.style.borderColor = '#3f3f46'; this.style.color = '#71717a'; };
    btn.onclick = window._agregarFilaGrabadoNueva;
    panel.appendChild(btn);
}

window._geckoFechaDDMMYYYYaISO = function (fechaTexto) {
    if (!fechaTexto) return '';
    const partes = fechaTexto.trim().split('/');
    if (partes.length !== 3) return '';
    const [d, m, y] = partes;
    if (!d || !m || !y) return '';
    return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

window._geckoFechaISOaDDMMYYYY = function (fechaISO) {
    if (!fechaISO) return '';
    const partes = fechaISO.split('-');
    if (partes.length !== 3) return '';
    const [y, m, d] = partes;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
};

// ── FIN FIX BUG-004 ──────────────────────────────────────────────────────────
// ── FIN FIX renderInsumos v2 ─────────────────────────────────────────────────