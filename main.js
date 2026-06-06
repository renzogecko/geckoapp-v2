tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Plus Jakarta Sans', 'sans-serif'],
            },
            colors: {
                gecko: '#F15A24',
                geckoHover: '#E04A16',
                darkBg: '#09090b',
                darkCard: '#141417',
            }
        }
    }
}


let graficaState = JSON.parse(localStorage.getItem('gecko_grafica_state')) || { tipoTrabajo: 'impresion', montado: false };

// —— Constantes de Diseño y Estructura Visual ——
const labelStyle = "block text-[11px] font-normal text-zinc-500";;
const inputStyle = "w-full bg-transparent border-b-2 border-zinc-800 p-3 text-[11px] font-normal text-white transition-all outline-none placeholder:text-zinc-500";;
const cardStyle = "card-gecko";
// ═══════════════════════════════════════════════════════════════
// 🦎 GECKO_DB — SISTEMA CENTRALIZADO DE DATOS V1.0
// ═══════════════════════════════════════════════════════════════

const GECKO_DB_DEFAULTS = {
    version: '1.0',
    creadoEn: new Date().toISOString(),
    constantes: {
        Hora_Laser: 0,
        Hora_CNC: 0,
        Hora_3D: 0,
        Hora_Hombre: 0,
        Acrilico_3mm: 0,
        PVC_5mm: 0,
        Chapa_N18: 0,
        PAI_1_5mm: 0,
        Vinilo: 0,
        Filamento_PLA: 0,
        LED_Modulo: 0,
        Tira_LED_m: 0,
        Fuente_LED: 0
    }
};

/**
 * GECKO DATA MANAGER (GDM) - BUSCADOR UNIVERSAL
 * Busca un ítem por Nombre o ID en Insumos y en Servicios.
 * @param {string|number} query - El nombre o ID del material/servicio.
 * @returns {Object|null} Ítem normalizado con costo, multiplicador y precioVenta.
 */
window.getGeckoItem = function (query) {
    if (!query) return null;

    // Función de normalización universal solicitada
    const normalizar = (texto) => {
        return String(texto)
            .toUpperCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
            .replace(/[^A-Z0-9]/g, ""); // Eliminar espacios, guiones y caracteres especiales
    };

    const insumos = JSON.parse(localStorage.getItem('gecko_materiales')) || [];
    const servicios = JSON.parse(localStorage.getItem('geckoServicios')) || [];
    const pool = [...insumos, ...servicios];

    const qNorm = normalizar(query);

    const item = pool.find(i => {
        const iNorm = normalizar(i.nombre);
        // Búsqueda por ID exacto o por coincidencia normalizada (uno contiene al otro)
        return String(i.id) === String(query) || iNorm === qNorm || iNorm.includes(qNorm) || qNorm.includes(iNorm);
    });

    if (!item) {
        console.warn(`🦎 GECKO GDM: No se encontró el ítem "${query}" (Norm: ${qNorm})`);
        return null;
    }

    // 3. NORMALIZACIÓN DE PROPIEDADES (Defensa contra Nulls)
    const cotiz = window.GECKO_SETTINGS?.cotizacionDolar || 1420;
    const multGlobal = window.GECKO_SETTINGS?.multiplicadorGlobal || 2.0;

    // Calcular Costo Base en ARS
    let costoBase = parseFloat(item.costo || item.costoARS || 0);
    if (item.costoUSD && costoBase === 0) {
        costoBase = parseFloat(item.costoUSD) * cotiz;
    }

    // Determinar Multiplicador
    const multiplicador = parseFloat(item.multiplicador || item.coeficiente || multGlobal);

    // Calcular Precio de Venta (si no está fijado manualmente)
    const precioVenta = item.precio || item.precioVenta || Math.round(costoBase * multiplicador);

    return {
        ...item,
        costoARS: costoBase,
        multiplicador: multiplicador,
        precioVenta: precioVenta,
        unidad: item.unidad || item.unidadVenta || 'unidad'
    };
};

function initGeckoDB() {
    const existente = localStorage.getItem('GECKO_DB');
    if (!existente) {
        localStorage.setItem('GECKO_DB', JSON.stringify(GECKO_DB_DEFAULTS));
        console.log('%c 🦎 GECKO_DB inicializado con valores por defecto. ', 'background:#F15A24;color:white;font-weight:bold;padding:3px 8px;border-radius:4px;');
    } else {
        const db = JSON.parse(existente);
        const merged = { ...GECKO_DB_DEFAULTS, ...db, constantes: { ...GECKO_DB_DEFAULTS.constantes, ...db.constantes } };
        localStorage.setItem('GECKO_DB', JSON.stringify(merged));
    }
    syncConstantesFromDB();
}

function syncConstantesFromDB() {
    const db = JSON.parse(localStorage.getItem('GECKO_DB') || '{}');
    const c = db.constantes || GECKO_DB_DEFAULTS.constantes;
    window.GECKO_CONSTANTS = {
        Maquinas: { Hora_Laser: c.Hora_Laser, Hora_CNC: c.Hora_CNC, Hora_3D: c.Hora_3D },
        ManoObra: { Hora_Hombre: c.Hora_Hombre },
        Materiales_m2: { Acrilico_3mm: c.Acrilico_3mm, PVC_5mm: c.PVC_5mm, Chapa_N18: c.Chapa_N18, PAI_1_5mm: c.PAI_1_5mm, Vinilo: c.Vinilo },
        Otros: { Filamento_PLA: c.Filamento_PLA, LED: c.LED_Modulo, Tira_LED: c.Tira_LED_m, Fuente: c.Fuente_LED }
    };
}

// Guardar precios base desde el panel de admin
window.guardarConstantesDB = function () {
    const db = JSON.parse(localStorage.getItem('GECKO_DB') || JSON.stringify(GECKO_DB_DEFAULTS));
    const get = (id) => parseFloat(document.getElementById(id)?.value) || 0;
    db.constantes = {
        Hora_Laser: get('gc_HoraLaser'),
        Hora_CNC: get('gc_HoraCNC'),
        Hora_3D: get('gc_Hora3D'),
        Hora_Hombre: get('gc_HoraHombre'),
        Acrilico_3mm: get('gc_Acrilico3mm'),
        PVC_5mm: get('gc_PVC5mm'),
        Chapa_N18: get('gc_ChapaN18'),
        PAI_1_5mm: get('gc_PAI15mm'),
        Vinilo: get('gc_Vinilo'),
        Filamento_PLA: get('gc_FilamentoPLA'),
        LED_Modulo: get('gc_LEDModulo'),
        Tira_LED_m: get('gc_TiraLEDm'),
        Fuente_LED: get('gc_FuenteLED')
    };
    localStorage.setItem('GECKO_DB', JSON.stringify(db));
    syncConstantesFromDB();
    // Refrescar selectores y recalcular si el cotizador de Corpóreos está activo
    if (typeof window.poblarSelectoresCorpóreos === 'function') window.poblarSelectoresCorpóreos();
    if (document.getElementById('corpAncho')) window.calcularCorporeos?.();
    if (typeof mostrarExito === 'function') mostrarExito('Datos guardados correctamente', 'GECKO_DB');
    console.log('%c 🦎 GECKO_DB Constantes guardadas ', 'background:#16a34a;color:white;font-weight:bold;padding:3px;', db.constantes);
};

// ⚠️ Función Crítica: Resetear Precios Base
window.resetPreciosBase = function () {
    if (confirm('¿Estás SEGURO de resetear todos los precios base a 0? Esta acción limpiará la GECKO_DB.')) {
        localStorage.removeItem('GECKO_DB');
        initGeckoDB();

        if (typeof mostrarExito === 'function') mostrarExito('Precios base reseteados a 0.', 'Sistema Limpio');
    }
};

// Exportar backup completo como JSON descargable
window.exportarGeckoDB = function () {
    const backup = {
        timestamp: new Date().toISOString(),
        GECKO_DB: JSON.parse(localStorage.getItem('GECKO_DB') || '{}'),
        materiales: JSON.parse(localStorage.getItem('gecko_materiales') || '[]'),
        geckoServicios: JSON.parse(localStorage.getItem('geckoServicios') || '[]'),
        GECKO_SETTINGS: JSON.parse(localStorage.getItem('GECKO_SETTINGS') || '{}'),
        clientes: JSON.parse(localStorage.getItem('clientes') || '[]'),
        presupuestos: JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]'),
        cajas: JSON.parse(localStorage.getItem('gecko_cajas') || '[]'),
        movimientos: JSON.parse(localStorage.getItem('gecko_movimientos') || '[]')
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gecko_backup_${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (typeof mostrarExito === 'function') mostrarExito('Backup exportado como archivo JSON.', 'Exportacion Lista');
};

window.importarGeckoDB = function (input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);

            // Validación mínima de que es un archivo de Gecko
            if (!data.materiales && !data.clientes && !data.geckoServicios && !data.terminaciones) {
                throw new Error("El archivo no parece ser un backup válido de GeckoApp.");
            }

            if (confirm("Se van a FUSIONAR los datos del archivo con los actuales. Los ítems duplicados se actualizarán con la versión del backup. ¿Deseas continuar?")) {

                // Función auxiliar para fusionar listas por un campo clave
                const fusionar = (actual, nueva, key = 'nombre') => {
                    const pool = new Map();
                    // Primero cargamos lo actual
                    actual.forEach(item => {
                        const val = (item[key] || '').toString().trim().toUpperCase();
                        if (val) pool.set(val, item);
                    });
                    // Luego sobreescribimos con lo nuevo del backup
                    nueva.forEach(item => {
                        const val = (item[key] || '').toString().trim().toUpperCase();
                        if (val) pool.set(val, item);
                    });
                    return Array.from(pool.values());
                };

                // 1. Fusionar Insumos (Materiales)
                const matsActuales = JSON.parse(localStorage.getItem('gecko_materiales') || '[]');
                const matsNuevos = data.materiales || [];
                const matsFusionados = fusionar(matsActuales, matsNuevos, 'nombre');
                const matsAgregados = matsFusionados.length - matsActuales.length;
                localStorage.setItem('gecko_materiales', JSON.stringify(matsFusionados));

                // 2. Fusionar Servicios (geckoServicios)
                const servActuales = JSON.parse(localStorage.getItem('geckoServicios') || '[]');
                const servNuevos = data.geckoServicios || data.terminaciones || data.gecko_terminaciones || [];
                const servFusionados = fusionar(servActuales, servNuevos, 'nombre');
                const servAgregados = servFusionados.length - servActuales.length;
                localStorage.setItem('geckoServicios', JSON.stringify(servFusionados));

                // 3. Fusionar Clientes
                const clieActuales = JSON.parse(localStorage.getItem('clientes') || '[]');
                const clieNuevos = data.clientes || [];
                const clieFusionados = fusionar(clieActuales, clieNuevos, 'nombre');
                localStorage.setItem('clientes', JSON.stringify(clieFusionados));

                // 4. Otros datos (Config y Registros)
                // Los presupuestos se fusionan por ID
                const presuActuales = JSON.parse(localStorage.getItem('gecko_listaPresupuestos') || '[]');
                const presuNuevos = data.presupuestos || [];
                const presuFusionados = fusionar(presuActuales, presuNuevos, 'id');
                localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(presuFusionados));

                // Ajustes Globales (Se sobreescriben para mantener integridad de arquitectura)
                if (data.GECKO_DB) localStorage.setItem('GECKO_DB', JSON.stringify(data.GECKO_DB));
                if (data.GECKO_SETTINGS) localStorage.setItem('GECKO_SETTINGS', JSON.stringify(data.GECKO_SETTINGS));

                // Cajas y Movimientos (Se sobreescriben para evitar inconsistencia de saldos)
                if (data.cajas) localStorage.setItem('gecko_cajas', JSON.stringify(data.cajas));
                if (data.movimientos) localStorage.setItem('gecko_movimientos', JSON.stringify(data.movimientos));
                if (data.historico_cierres) localStorage.setItem('gecko_historico_cierres', JSON.stringify(data.historico_cierres));

                alert(`Fusión exitosa: Se agregaron ${matsAgregados} materiales nuevos a los que ya tenías.`);
                location.reload();
            }
        } catch (err) {
            alert("Error al importar: " + err.message);
        }
        input.value = ''; // Reset del input
    };
    reader.readAsText(file);
};

// Inicializar inmediatamente al cargar el script
initGeckoDB();

// —— Variables de Configuración Globales ——
let GECKO_SETTINGS = JSON.parse(localStorage.getItem('GECKO_SETTINGS')) || {
    cotizacionDolar: 1420,
    iva: 21,
    minutoLaser: 820,
    minutoRouter: 860,
    bajadaPlancha: 800,
    velocidadRouter: 900,
    valorHoraHombre: 3500,
    costoHora3D: 1500,
    condicionesVenta: "Este presupuesto tiene una validez de 15 días.\nLos trabajos se inician con una seña del 50%.\nTiempos de entrega a confirmar al momento de Señalar.",
    nivelOro: 250000,
    nivelPlata: 100000
};


// â”€â”€ Base de Datos Global Unificada para Materiales (Fusión Inteligente) â”€â”€
let materiales = JSON.parse(localStorage.getItem('gecko_materiales')) || [];

// Normalización de Categorías y persistencia
materiales.forEach(m => {
    const cat = (m.categoria || '').toLowerCase();
    if (cat === 'flexibles' || cat === 'flexible' || cat === 'flexibles (vinilos/lonas)') m.categoria = 'vinilos_lonas';
    if (cat === 'rigidos' || cat === 'rígidos' || cat === 'rígido') m.categoria = 'rigido';
    if (cat === 'chapas / placas') m.categoria = 'chapas';
    if (cat === 'metal') m.categoria = 'metal_madera';
});

localStorage.setItem('gecko_materiales', JSON.stringify(materiales));
window.materiales = materiales;
document.dispatchEvent(new CustomEvent('inventoryReady'));

// Función de exportación para auditoría
window.exportarMaterialesJSON = function () {
    console.log("ðŸ“¦ GECKO INVENTARIO:", JSON.stringify(window.materiales, null, 2));
    alert('Inventario exportado a la consola (F12). Revisa el log para ver el JSON.');
};

// ⚠️ Función Crítica: Resetear Sistema Completo
window.confirmarResetSistema = function () {
    if (confirm('¿Estás SEGURO de borrar TODO el inventario? No hay vuelta atrás.')) {
        localStorage.clear();
        window.materiales = [];
        location.reload();
    }
};

// â”€â”€ Variables del Presupuestador Múltiple â”€â”€
window.presupuesto = [];
let _itemActualCotizado = null;
Object.defineProperty(window, 'itemActualCotizado', {
    get: function () { return _itemActualCotizado; },
    set: function (val) {
        _itemActualCotizado = val;
        const subtotalEl = document.getElementById('subtotalEstimado');
        if (subtotalEl) {
            subtotalEl.innerText = (val && !isNaN(val.costo)) ? '$' + Math.round(val.costo).toLocaleString('es-AR') : '$0';
            subtotalEl.className = "text-2xl font-black text-gecko leading-none mt-1"; // Ensure orange
        }
    }
});
let listaPresupuestos = JSON.parse(localStorage.getItem('gecko_listaPresupuestos')) || [];
let editandoIndex = -1;
let confirmandoIndexSena = -1;
let nextBudgetId = parseInt(localStorage.getItem('gecko_nextId')) || 1001;
let mostrarHistorialOts = false;
let globalEstimationMode = localStorage.getItem('globalEstimationMode') || 'simple';

// â”€â”€ Variables de Clientes â”€â”€
let bdClientes = JSON.parse(localStorage.getItem('clientes')) || [];
let clienteGlobalActual = null;
let timeoutDebounceCliente = null;
let serviciosGraficaSeleccionados = []; // Extra services (Multi-select array)


window.actualizarListas = function () {
    const dlGrafica = document.getElementById('dlGrafica');

    const dlGraficaRigidos = document.getElementById('dlGraficaRigidos');
    const dlCorte = document.getElementById('dlCorte');

    if (dlGrafica) {
        dlGrafica.innerHTML = window.materiales
            .filter(m => m.categoria === 'flexible')
            .map(m => `<option value="${m.nombre}"></option>`).join('');
    }
    if (dlGraficaRigidos) {
        dlGraficaRigidos.innerHTML = window.materiales
            .filter(m => m.categoria === 'rigido')
            .map(m => `<option value="${m.nombre}"></option>`).join('');
    }
    if (dlCorte) {
        dlCorte.innerHTML = window.materiales
            .filter(m => m.categoria === 'rigido')
            .map(m => `<option value="${m.nombre}"></option>`).join('');
    }
}

// Poblar interfaz al inicio
window.poblarMaterialesGrafica = function () {
    window.materiales = materiales;
    actualizarListas();
};
window.poblarMaterialesGrafica();


// â”€â”€ Función para calcular Scoring de Cliente â”€â”€
function obtenerBadgeScoring(clienteNombre) {
    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();

    // Sumamos el total de las OTs de este cliente en el mes en curso
    const totalMes = listaPresupuestos.filter(p => {
        if (p.cliente !== clienteNombre || p.status !== 'OT' || !p.fecha) return false;
        const parts = p.fecha.split('/');
        if (parts.length < 3) return false;
        return (parseInt(parts[1]) - 1) === mesActual && parseInt(parts[2]) === anioActual;
    }).reduce((acc, p) => acc + p.total, 0);

    // Evaluamos contra los settings y devolvemos la insignia HTML
    if (totalMes >= (GECKO_SETTINGS.nivelOro || 250000)) {
        return `<span class="px-2 py-0.5 rounded-md bg-[#FFD700]/20 text-[#B8860B] border border-[#FFD700]/50 text-[9px] font-black uppercase tracking-widest ml-2" title="Facturación Mes: $${totalMes.toLocaleString('es-AR')}">ðŸ¥‡ Oro</span>`;
    } else if (totalMes >= (GECKO_SETTINGS.nivelPlata || 100000)) {
        return `<span class="px-2 py-0.5 rounded-md bg-[#C0C0C0]/20 text-[#808080] border border-[#C0C0C0]/50 text-[9px] font-black uppercase tracking-widest ml-2" title="Facturación Mes: $${totalMes.toLocaleString('es-AR')}">ðŸ¥ˆ Plata</span>`;
    } else {
        return `<span class="px-2 py-0.5 rounded-md bg-[#CD7F32]/10 text-[#A0522D] border border-[#CD7F32]/30 text-[9px] font-black uppercase tracking-widest ml-2" title="Facturación Mes: $${totalMes.toLocaleString('es-AR')}">ðŸ¥‰ Bronce</span>`;
    }
}

// â”€â”€ Variables de Finanzas â”€â”€
let LISTA_CAJAS = JSON.parse(localStorage.getItem('gecko_cajas')) || [
    { id: 'c1', nombre: 'Efectivo', saldo: 0, icono: 'efectivo' },
    { id: 'c2', nombre: 'Caja chica', saldo: 0, icono: 'efectivo' },
    { id: 'c3', nombre: 'MP Renzo', saldo: 0, icono: 'mercado_pago_celeste' },
    { id: 'c4', nombre: 'MP Rodri', saldo: 0, icono: 'mercado_pago_celeste' },
    { id: 'c5', nombre: 'Mp Agus', saldo: 0, icono: 'mercado_pago_celeste' },
    { id: 'c6', nombre: 'Banco Ren', saldo: 0, icono: 'banco' },
    { id: 'c7', nombre: 'Banco Rodri', saldo: 0, icono: 'banco' }
];

let LISTA_GASTOS_FIJOS = JSON.parse(localStorage.getItem('gecko_gastos_fijos')) || [
    { concepto: 'Alquiler Taller', monto: 120000, vencimiento: '10', estado: 'Pendiente' },
    { concepto: 'Luz (Edemsa)', monto: 15000, vencimiento: '15', estado: 'Pendiente' },
    { concepto: 'Internet', monto: 8000, vencimiento: '05', estado: 'Pagado' }
];

let LISTA_MOVIMIENTOS = JSON.parse(localStorage.getItem('gecko_movimientos')) || [];
let HISTORICO_CIERRES = JSON.parse(localStorage.getItem('gecko_historico_cierres')) || [];

function renderizarFiltrosCajas() {
    const container = document.getElementById('filtrosCajas');
    if (!container) return;

    // Botón "Todas"
    let html = `
        <button onclick="setFiltroCaja('todas')" 
            class="px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filtroCajaActual === 'todas' ? 'bg-white dark:bg-darkCard text-blue-500 shadow-sm border border-gray-100 dark:border-gray-800' : 'text-gray-400 hover:text-gray-600'}">
            ðŸŒ Todas
        </button>
    `;

    // Botones dinámicos por cada caja
    html += LISTA_CAJAS.map(caja => {
        const isActive = filtroCajaActual === caja.nombre;
        let icon = 'ðŸ’°';
        if (caja.icono === 'efectivo') icon = 'ðŸ’µ';
        if (caja.icono === 'mercado_pago_celeste') icon = 'ðŸ”µ';
        if (caja.icono === 'banco') icon = 'ðŸ¦';

        return `
            <button onclick="setFiltroCaja('${caja.nombre}')" 
                class="px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${isActive ? 'bg-white dark:bg-darkCard text-blue-500 shadow-sm border border-gray-100 dark:border-gray-800' : 'text-gray-400 hover:text-gray-600'}">
                ${icon} ${caja.nombre}
            </button>
        `;
    }).join('');

    container.innerHTML = html;
}

function setFiltroCaja(nombre) {
    filtroCajaActual = nombre;
    renderizarFiltrosCajas(); // Actualiza el estilo de los botones
    renderizarMovimientos();  // Actualiza la lista de abajo
}
//desplegable de cajas en modal nueva caja
function toggleListaCajas() {
    const lista = document.getElementById('listaGestionCajas');
    const arrow = document.getElementById('arrowListaCajas');

    if (lista.classList.contains('hidden')) {
        lista.classList.remove('hidden');
        arrow.style.transform = 'rotate(180deg)';
    } else {
        lista.classList.add('hidden');
        arrow.style.transform = 'rotate(0deg)';
    }
}

// â”€â”€ Sidebar Mobile Toggle â”€â”€
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function toggleSidebar() {
    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
        sidebarOverlay.classList.remove('hidden');
        setTimeout(() => sidebarOverlay.classList.remove('opacity-0'), 10);
    } else {
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('opacity-0');
        setTimeout(() => sidebarOverlay.classList.add('hidden'), 300);
    }
}

// â”€â”€ Modal Configuración Global â”€â”€
function saveGeckoSettings(e) {
    if (e) e.preventDefault();
    GECKO_SETTINGS = {
        ...GECKO_SETTINGS,
        cotizacionDolar: parseFloat(document.getElementById('confCotizacionDolar').value) || 0,
        iva: parseFloat(document.getElementById('confIva').value) || 0,
        valorHoraHombre: parseFloat(document.getElementById('confValorHoraHombre').value) || 0,
        minutoLaser: (parseFloat(document.getElementById('confHoraLaser').value) || 0) / 60,
        minutoRouter: (parseFloat(document.getElementById('confHoraCNC').value) || 0) / 60,
        costoHora3D: parseFloat(document.getElementById('confCostoHora3D').value) || 0
    };
    localStorage.setItem('GECKO_SETTINGS', JSON.stringify(GECKO_SETTINGS));
    closeConfigModal();
    renderInsumos(); // Refrescamos materiales por si cambió mult global o dólar
    if (document.getElementById('panelConfigurador')) {
        // Recalcular si hay algo abierto
        const activeTab = document.querySelector('.btn-cat-active')?.id.replace('btn-cat-', '');
        if (activeTab === 'corporeos') window.calcularCostoCorporeos();
    }
}

function openConfigModal() {
    document.getElementById('confCotizacionDolar').value = GECKO_SETTINGS.cotizacionDolar || 1420;
    document.getElementById('confIva').value = GECKO_SETTINGS.iva || 21;
    document.getElementById('confValorHoraHombre').value = GECKO_SETTINGS.valorHoraHombre || 0;
    document.getElementById('confHoraLaser').value = Math.round((GECKO_SETTINGS.minutoLaser || 0) * 60);
    document.getElementById('confHoraCNC').value = Math.round((GECKO_SETTINGS.minutoRouter || 0) * 60);
    document.getElementById('confCostoHora3D').value = GECKO_SETTINGS.costoHora3D || 0;

    const modal = document.getElementById('modalConfig');
    if (modal) {
        modal.classList.add('open');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeConfigModal() {
    const modal = document.getElementById('modalConfig');
    if (modal) {
        modal.classList.remove('open');
        setTimeout(() => { if (!modal.classList.contains('open')) modal.style.display = 'none'; }, 200);
        document.body.style.overflow = '';
    }
}

const modalConfig = document.getElementById('modalConfig');
if (modalConfig) {
    modalConfig.addEventListener('click', function (e) {
        if (e.target === this) closeConfigModal();
    });
}

const formConfig = document.getElementById('formConfig');
if (formConfig) {
    formConfig.addEventListener('submit', saveGeckoSettings);
}

// ══════════════════════════════════════════════════════
// SECCIÓN CONFIGURACIÓN — Tab switching + render + guardar
// ══════════════════════════════════════════════════════

window.switchConfigTab = function (tab) {
    ['finanzas', 'operativos', 'laser'].forEach(t => {
        const btn = document.getElementById('cfgTab-' + t);
        const content = document.getElementById('cfgContent-' + t);
        if (btn && content) {
            const isActive = t === tab;
            btn.className = `pb-4 text-[14px] font-bold border-b-2 transition-all ${isActive ? 'text-gecko border-gecko' : 'text-zinc-500 hover:text-zinc-300 border-transparent'}`;
            content.classList.toggle('hidden', !isActive);
        }
    });
    if (tab === 'laser') {
        window.renderTablaParametrosLaser();
        window.geckoLaserStickyShow();
    } else {
        window.geckoLaserStickyHide();
    }
};

// BARRA FIJA LÁSER — control de visibilidad y estado
window._geckoLaserDirty = false;

window.geckoLaserStickyShow = function () {
    const bar = document.getElementById('geckoLaserStickyBar');
    if (bar) bar.style.display = 'flex';
};

window.geckoLaserStickyHide = function () {
    const bar = document.getElementById('geckoLaserStickyBar');
    if (bar) bar.style.display = 'none';
    window._geckoLaserDirty = false;
    window.geckoLaserStickySetStatus('clean');
};

window.geckoLaserStickySetStatus = function (estado) {
    const el = document.getElementById('geckoLaserStickyStatus');
    if (!el) return;
    if (estado === 'dirty') {
        el.textContent = 'Cambios sin guardar';
        el.style.color = '#F15A24';
        window._geckoLaserDirty = true;
    } else if (estado === 'saved') {
        el.textContent = 'Guardado';
        el.style.color = '#10b981';
        window._geckoLaserDirty = false;
        setTimeout(() => {
            el.textContent = 'Sin cambios';
            el.style.color = '#64748b';
        }, 3000);
    } else {
        el.textContent = 'Sin cambios';
        el.style.color = '#64748b';
        window._geckoLaserDirty = false;
    }
};

window.guardarParametrosLaserSticky = async function () {
    await window.guardarParametrosLaser();
    window.geckoLaserStickySetStatus('saved');
};

window.initConfiguracion = function () {
    const s = GECKO_SETTINGS;
    const v = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    v('cfgCotizacionDolar', s.cotizacionDolar || 1420);
    v('cfgIva', s.iva || 21);
    v('cfgMultGlobal', s.multiplicadorGlobal || 2.0);
    v('cfgNivelOro', s.nivelOro || 250000);
    v('cfgNivelPlata', s.nivelPlata || 100000);
    v('cfgHoraHombre', s.valorHoraHombre || 0);
    v('cfgHoraLaser', Math.round((s.minutoLaser || 0) * 60));
    v('cfgHoraCNC', Math.round((s.minutoRouter || 0) * 60));
    v('cfgHora3D', s.costoHora3D || 0);
    const cond = document.getElementById('cfgCondicionesVenta');
    if (cond) cond.value = s.condicionesVenta || '';
    window.switchConfigTab('finanzas');
};

window.guardarConfiguracion = function () {
    const g = (id) => parseFloat(document.getElementById(id)?.value) || 0;
    GECKO_SETTINGS = {
        ...GECKO_SETTINGS,
        cotizacionDolar: g('cfgCotizacionDolar'),
        iva: g('cfgIva'),
        multiplicadorGlobal: g('cfgMultGlobal'),
        nivelOro: g('cfgNivelOro'),
        nivelPlata: g('cfgNivelPlata'),
        valorHoraHombre: g('cfgHoraHombre'),
        minutoLaser: g('cfgHoraLaser') / 60,
        minutoRouter: g('cfgHoraCNC') / 60,
        costoHora3D: g('cfgHora3D'),
        condicionesVenta: document.getElementById('cfgCondicionesVenta')?.value || ''
    };
    localStorage.setItem('GECKO_SETTINGS', JSON.stringify(GECKO_SETTINGS));
    // Sincronizar con MySQL
    fetch('/app/api.php?endpoint=configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(GECKO_SETTINGS)
    }).catch(e => console.warn('GECKO: Error guardando config en API', e));
    if (typeof window.mostrarExito === 'function') window.mostrarExito('Configuración guardada correctamente.', '¡Guardado!');
    if (typeof renderInsumos === 'function') renderInsumos();
};

window.renderTablaParametrosLaser = async function () {
    const tbody = document.getElementById('tablaParametrosLaser');
    if (!tbody) return;

    // Intentar cargar laserParams desde API si no está en localStorage
    const laserParamsLocal = JSON.parse(localStorage.getItem('gecko_laserParams') || '{}');
    if (Object.keys(laserParamsLocal).length === 0) {
        try {
            const res = await fetch('/app/api.php?endpoint=laser_params');
            const data = await res.json();
            if (data && typeof data === 'object') {
                localStorage.setItem('gecko_laserParams', JSON.stringify(data));
            }
        } catch (e) { }
    }

    const servicios = JSON.parse(localStorage.getItem('geckoServicios') || '[]');
    const laserParams = JSON.parse(localStorage.getItem('gecko_laserParams') || '{}');

    const laserServs = servicios.filter(s =>
        /corte laser|corte cnc|grabado laser/i.test(s.nombre)
    );

    if (laserServs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-10 text-center text-zinc-600 italic text-sm">No se encontraron servicios de Láser/CNC en la base de datos.</td></tr>`;
        return;
    }

    tbody.innerHTML = laserServs.map((s, i) => {
        const params = laserParams[s.nombre] || {};
        const precio = s.precioVenta || 0;
        const espesor = params.espesor || '';
        const speed = params.speed || '';
        const power = params.power || '';
        return `
        <tr class="hover:bg-white/3 transition-colors">
            <td class="py-3 px-5">
                <p class="font-bold text-white text-[13px]">${s.nombre}</p>
                <p class="text-zinc-600 text-[10px] font-bold uppercase tracking-wider mt-0.5">${s.unidad || 'mtL'}</p>
            </td>
            <td class="py-3 px-4 text-center">
                <input type="number" step="0.5"
                    data-servicio="${s.nombre}" data-campo="espesor"
                    value="${espesor}" placeholder="—"
                    class="w-16 text-center bg-transparent border-b border-zinc-800 focus:border-gecko outline-none text-zinc-300 font-bold text-[13px] py-1"
                    oninput="window._actualizarParamLaser(this)">
            </td>
            <td class="py-3 px-4 text-center">
                <input type="number"
                    data-servicio="${s.nombre}" data-campo="speed"
                    value="${speed}" placeholder="—"
                    class="w-16 text-center bg-transparent border-b border-zinc-800 focus:border-gecko outline-none text-zinc-300 font-bold text-[13px] py-1"
                    oninput="window._actualizarParamLaser(this)">
            </td>
            <td class="py-3 px-4 text-center">
                <input type="number"
                    data-servicio="${s.nombre}" data-campo="power"
                    value="${power}" placeholder="—"
                    class="w-16 text-center bg-transparent border-b border-zinc-800 focus:border-gecko outline-none text-zinc-300 font-bold text-[13px] py-1"
                    oninput="window._actualizarParamLaser(this)">
            </td>
            <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end gap-1">
                    <span class="text-zinc-600 text-[12px]">$</span>
                    <input type="number"
                        data-servicio="${s.nombre}" data-campo="precio"
                        value="${precio || ''}" placeholder="0"
                        class="w-24 text-right bg-transparent border-b border-zinc-800 focus:border-gecko outline-none text-gecko font-black text-[14px] py-1"
                        oninput="window._actualizarParamLaser(this)">
                </div>
            </td>
            <td class="py-3 px-3"></td>
        </tr>`;
    }).join('');

    // Marcar cambios al editar cualquier input de la tabla
    document.querySelectorAll('#tablaParametrosLaser input').forEach(inp => {
        inp.addEventListener('input', () => window.geckoLaserStickySetStatus('dirty'));
        inp.addEventListener('change', () => window.geckoLaserStickySetStatus('dirty'));
    });
};

window._laserParamsTemp = {};

window._actualizarParamLaser = function (input) {
    const servicio = input.dataset.servicio;
    const campo = input.dataset.campo;
    if (!window._laserParamsTemp[servicio]) window._laserParamsTemp[servicio] = {};
    window._laserParamsTemp[servicio][campo] = parseFloat(input.value) || input.value;
};

window.guardarParametrosLaser = async function () {
    // 1. Leer servicios actuales del localStorage (ya sincronizado desde MySQL)
    const servicios = JSON.parse(localStorage.getItem('geckoServicios') || '[]');
    const laserParams = JSON.parse(localStorage.getItem('gecko_laserParams') || '{}');

    // 2. Procesar filas existentes (data-campo="precio")
    document.querySelectorAll('#tablaParametrosLaser input[data-campo="precio"]').forEach(inp => {
        const nombre = inp.dataset.servicio;
        const precio = parseFloat(inp.value) || 0;
        const idx = servicios.findIndex(s => s.nombre === nombre);
        if (idx !== -1) {
            servicios[idx].precioVenta = precio;
            servicios[idx].precio = precio;
        }
    });
    // Guardar params (espesor/speed/power)
    Object.assign(laserParams, window._laserParamsTemp || {});
    window._laserParamsTemp = {};

    // 3. Procesar filas nuevas
    document.querySelectorAll('.fila-laser-nueva').forEach(tr => {
        const nombre = tr.querySelector('.fila-nueva-nombre')?.value.trim().toUpperCase();
        if (!nombre) return;
        const espesor = parseFloat(tr.querySelector('.fila-nueva-espesor')?.value) || 0;
        const speed = parseFloat(tr.querySelector('.fila-nueva-speed')?.value) || 0;
        const power = parseFloat(tr.querySelector('.fila-nueva-power')?.value) || 0;
        const precio = parseFloat(tr.querySelector('.fila-nueva-precio')?.value) || 0;
        const existeIdx = servicios.findIndex(s => s.nombre.trim().toUpperCase() === nombre);
        if (existeIdx === -1) {
            servicios.push({ id: 'laser_' + Date.now(), nombre, unidad: 'mtL', precio, precioVenta: precio, categoria: 'Servicios de Corte', costo: 0 });
        } else {
            servicios[existeIdx].precio = precio;
            servicios[existeIdx].precioVenta = precio;
        }
        laserParams[nombre] = { espesor, speed, power };
    });

    // 4. Persistir en localStorage
    localStorage.setItem('geckoServicios', JSON.stringify(servicios));
    localStorage.setItem('gecko_laserParams', JSON.stringify(laserParams));

    // 5. Sincronizar con MySQL vía API
    try {
        // 5a. Actualizar cada servicio modificado (PUT)
        const laserServs = servicios.filter(s => /corte laser|corte cnc|grabado laser/i.test(s.nombre));
        await Promise.all(laserServs.map(s =>
            fetch('/app/api.php?endpoint=servicios', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: s.id, nombre: s.nombre, categoria: s.categoria || 'Servicios de Corte', costo: 0, unidad: s.unidad || 'mtL', precio: s.precio || 0 })
            })
        ));
        // 5b. Guardar laserParams en MySQL
        await fetch('/app/api.php?endpoint=laser_params', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(laserParams)
        });
    } catch (e) {
        console.warn('GECKO: Error sincronizando con API, datos guardados solo en localStorage.', e);
    }

    if (typeof window.mostrarExito === 'function') window.mostrarExito('Parámetros láser guardados en el servidor.', '¡Guardado!');
    // Re-renderizar para mostrar nuevas filas como filas normales
    window.renderTablaParametrosLaser();
};

window.agregarFilaParametroLaser = function () {
    const tbody = document.getElementById('tablaParametrosLaser');
    if (!tbody) return;
    const tr = document.createElement('tr');
    tr.className = 'fila-laser-nueva';

    const td1 = document.createElement('td');
    td1.style.cssText = 'padding:12px 20px;';
    const inp1 = document.createElement('input');
    inp1.type = 'text';
    inp1.className = 'fila-nueva-nombre';
    inp1.placeholder = 'Ej: CORTE LASER - MDF 3MM';
    inp1.style.cssText = 'width:100%;background:transparent;border:none;outline:none;color:white;font-weight:700;font-size:13px;padding:2px 0 2px;font-family:inherit;';
    const sub1 = document.createElement('p');
    sub1.textContent = 'MTL';
    sub1.style.cssText = 'color:#52525b;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-top:2px;';
    td1.appendChild(inp1);
    td1.appendChild(sub1);

    const mkTdCenter = (cls) => {
        const td = document.createElement('td');
        td.style.cssText = 'padding:12px 16px;text-align:center;';
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.className = cls;
        inp.placeholder = '—';
        inp.style.cssText = 'width:64px;text-align:center;background:transparent;border:none;border-bottom:1px solid #3f3f46;outline:none;color:#d4d4d8;font-weight:700;font-size:13px;padding:2px 0;font-family:inherit;';
        td.appendChild(inp);
        return td;
    };

    const td5 = document.createElement('td');
    td5.style.cssText = 'padding:12px 16px;text-align:right;';
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;align-items:center;justify-content:flex-end;gap:4px;';
    const sign = document.createElement('span');
    sign.textContent = '$';
    sign.style.cssText = 'color:#52525b;font-size:12px;';
    const inpPrecio = document.createElement('input');
    inpPrecio.type = 'number';
    inpPrecio.className = 'fila-nueva-precio';
    inpPrecio.placeholder = '0';
    inpPrecio.style.cssText = 'width:96px;text-align:right;background:transparent;border:none;border-bottom:1px solid #3f3f46;outline:none;color:#f15a24;font-weight:900;font-size:14px;padding:2px 0;font-family:inherit;';
    wrapper.appendChild(sign);
    wrapper.appendChild(inpPrecio);
    td5.appendChild(wrapper);

    const td6 = document.createElement('td');
    td6.style.cssText = 'padding:12px;text-align:center;';
    const btn = document.createElement('button');
    btn.textContent = '✕';
    btn.style.cssText = 'background:none;border:none;color:#3f3f46;font-size:16px;font-weight:900;cursor:pointer;line-height:1;';
    btn.onmouseover = function () { this.style.color = '#ef4444'; };
    btn.onmouseout = function () { this.style.color = '#3f3f46'; };
    btn.onclick = function () { tr.remove(); };
    td6.appendChild(btn);

    tr.appendChild(td1);
    tr.appendChild(mkTdCenter('fila-nueva-espesor'));
    tr.appendChild(mkTdCenter('fila-nueva-speed'));
    tr.appendChild(mkTdCenter('fila-nueva-power'));
    tr.appendChild(td5);
    tr.appendChild(td6);

    tbody.appendChild(tr);
    inp1.focus();
};

window._actualizarNombreFila = function (input) {
    const tr = input.closest('tr');
    if (!tr) return;
    const nombre = input.value.trim().toUpperCase();
    tr.querySelectorAll('input[data-campo], select[data-campo]').forEach(el => {
        if (el.dataset.campo !== 'nombre') el.dataset.servicio = nombre;
    });
};


// â”€â”€ Modales Dinámicos GECKO (Globales) â”€â”€
window.resetModal = function () {
    localStorage.removeItem('gecko_grafica_state');
    const modal = document.getElementById('modalPresupuesto');
    if (modal) {
        modal.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]), select').forEach(el => el.value = '');
        modal.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(el => el.checked = false);
    }
    // Starts UI fresh
    cambiarCategoriaCotizador('grafica');
};

window.openModal = function (id) {
    const targetId = id || 'modalPresupuesto';
    const modal = document.getElementById(targetId);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
        if (targetId === 'modalPresupuesto') window.resetModal();
    }
};

window.closeModal = function (id) {
    const targetId = id || 'modalPresupuesto';
    const modal = document.getElementById(targetId);
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }
};

// Actualización de intentarCerrarModal para usar la nueva lógica asíncrona
window.intentarCerrarModal = async function (id) {
    if (id === 'sidebar' || id === 'sidebarOverlay') return;

    const modal = document.getElementById(id);
    if (!modal) return;

    const inputs = modal.querySelectorAll('input:not([type="hidden"]), select, textarea');
    let tieneDatos = false;

    inputs.forEach(i => {
        if (i.value && i.value !== "0" && i.value !== "" && !i.readOnly) tieneDatos = true;
    });

    if (tieneDatos) {
        const confirmado = await window.confirmGecko("Tenés cambios sin guardar. ¿Estás seguro de que querés salir y perder los datos?", "Cambios Pendientes");
        if (confirmado) closeModal(id);
    } else {
        closeModal(id);
    }
};

// Listener para cerrar al hacer click fuera (Global)
window.onclick = function (event) {
    if (event && event.target && event.target.classList && event.target.classList.contains('fixed') && event.target.style.display !== 'none') {
        window.intentarCerrarModal(event.target.id);
    }
}

// Listener corregido para cerrar SOLO modales, protegiendo el Sidebar
document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") {
        // Buscamos elementos fijos visibles que sean específicamente MODALES
        const modalesAbiertos = document.querySelectorAll('.fixed');

        modalesAbiertos.forEach(m => {
            // Solo cerramos si el ID empieza con 'modal' y está visible
            const esModal = m.id && m.id.toLowerCase().startsWith('modal');
            const estaVisible = m.style.display === 'flex' || !m.classList.contains('hidden');

            if (esModal && estaVisible) {
                window.intentarCerrarModal(m.id);
            }
        });
    }
});

// â”€â”€ Dark Mode (Globales) â”€â”€
const SVG_MOON = '<path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />';
const SVG_SUN = '<path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />';

function updateDarkIcon(isDark) {
    const icon = document.getElementById('darkIcon');
    if (icon) {
        icon.innerHTML = isDark ? SVG_SUN : SVG_MOON;
        icon.classList.remove(isDark ? 'text-gray-400' : 'text-amber-500');
        icon.classList.add(isDark ? 'text-amber-500' : 'text-gray-400');
    }
}

function toggleDark() {
    const html = document.documentElement;
    html.classList.toggle('dark');
    html.classList.toggle('light-mode', !html.classList.contains('dark'));
    const isDark = html.classList.contains('dark');
    updateDarkIcon(isDark);
    localStorage.setItem('gecko-theme', isDark ? 'dark' : 'light');
}

// Alias para compatibilidad si el usuario lo usa
window.abrirPestaña = function (cat) {
    window.cambiarCategoriaCotizador(cat);
}

window.cambiarCategoriaCotizador = function (cat) {
    actualizarListas();
    const panel = document.getElementById('panelConfigurador');
    if (!panel) return;

    // 1. UI Feedback: Activar botón superior
    document.querySelectorAll('.btn-cat').forEach(btn => {
        btn.classList.remove('bg-zinc-900', 'border-gecko/30', 'btn-cat-active');
    });
    const activeBtn = document.getElementById(`btn-cat-${cat}`);
    if (activeBtn) activeBtn.classList.add('bg-zinc-900', 'border-gecko/30', 'btn-cat-active');

    // Persistencia
    localStorage.setItem('gecko_activeCategory', cat);

    // 2. Título Dinámico
    const titleEl = document.getElementById('configuradorTitle');
    if (titleEl) {
        let textTitle = 'Nuevo presupuesto';
        if (cat === 'grafica') {
            const modoG = (window.graficaState && window.graficaState.tipoTrabajo) ? window.graficaState.tipoTrabajo : 'impresion';
            textTitle = 'COTIZADOR DE IMPRESIONES';
        } else if (cat === 'corte') {
            textTitle = 'COTIZADOR DE VINILO DE CORTE';
        } else if (cat === 'corporeos' || cat === 'polifan') {
            if (window._corpModo === 'chapa-acrilico') textTitle = 'Cotizador de chapa / acrílico';
            else if (window._corpModo === 'letras3d') textTitle = 'Cotizador de letras 3D (Estimado)';
            else textTitle = 'Cotizador de polifán';
        } else if (cat === '3d') {
            textTitle = 'Cotizador de impresión 3D (Técnica)';
        } else if (cat === 'laser_cnc') {
            textTitle = (window._laserCncModo === 'cnc') ? 'Cotizador de CNC Router' : 'Cotizador de láser';
        } else if (cat === 'textil') {
            const mT = window._textilModo || 'dtf';
            textTitle = mT === 'termo' ? 'Cotizador de termovinilo' : (mT === 'estampado' ? 'Cotizador de estampados' : 'Cotizador de DTF textil');
        } else if (cat === 'bastidores') {
            textTitle = 'Cotizador de bastidores y estructuras';
        }
        titleEl.innerText = textTitle;
        titleEl.className = "text-2xl font-black uppercase italic dark:text-zinc-100 tracking-wider";
    }

    // 3. INYECCIÓN DE HTML (CADENA LIMPIA)
    const labelStyle = "block text-[11px] uppercase tracking-wider text-zinc-400 font-bold mb-2 ml-1";
    const inputStyle = "w-full h-12 px-4 bg-zinc-900/50 border border-zinc-700 rounded-2xl focus:border-orange-500 outline-none text-white font-bold transition-all";
    window.renderSwitchModo = (catId) => {
        const modo = window.globalEstimationMode || localStorage.getItem('globalEstimationMode') || 'simple';
        const isProyecto = modo === 'proyecto';
        return `
            <div class="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-xl border border-zinc-800/50 scale-125 origin-right mr-4 transition-all">
                <span class="text-[11px] font-black uppercase tracking-tighter ${!isProyecto ? 'text-gecko' : 'text-zinc-600'}">Simple</span>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="sw-modo-${catId}" class="sr-only peer" ${isProyecto ? 'checked' : ''} onchange="window.toggleEstimationMode(this)">
                    <div class="w-8 h-4 bg-zinc-800 rounded-full peer peer-checked:bg-gecko after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4 border border-zinc-700"></div>
                </label>
                <span class="text-[11px] font-black uppercase tracking-tighter ${isProyecto ? 'text-gecko' : 'text-zinc-600'}">Proyecto</span>
            </div>
        `;
    };

    window.toggleEstimationMode = (el) => {
        const modo = el.checked ? 'proyecto' : 'simple';
        window.globalEstimationMode = modo;
        localStorage.setItem('globalEstimationMode', modo);

        // Disparar cálculos según categoría activa
        const cat = localStorage.getItem('gecko_activeCategory');
        if (cat === 'textil') window.calcularCostoTextil();
        else if (cat === 'grafica') window.grafica?.calcular();
        else if (cat === 'corte') window.GeckoCorte?.calcular();
        else if (cat === 'polifan') window.calcularCostoPolifan();
        else if (cat === 'laser_cnc') window.calcularCostoCorte?.('laser_cnc');
    };

    if (cat === '3d') {
        panel.innerHTML = `
            <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div class="card-gecko">
                    <div class="flex items-center justify-between w-full mb-2">
                        <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja">01. IDENTIFICACIÓN</p>
                    </div>
                    <input type="text" id="3dNombre" oninput="window.calcularCosto3D()" placeholder="Ej: Llaveros Personalizados" 
                        class="w-full bg-transparent border-b border-zinc-800 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-gecko transition-all">
                </div>

                <div class="card-gecko space-y-2">
                    <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja">02. Especificaciones Técnicas</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
                        <div>
                            <label class="block text-[11px] text-zinc-400 mb-1">Peso de la pieza (gr)</label>
                            <input type="number" id="preciso3dPeso" class="gecko-input w-full" placeholder="0" oninput="window.calcularCosto3D()">
                        </div>
                        <div>
                            <label class="block text-[11px] text-zinc-400 mb-1">Tiempo de impresión (hs)</label>
                            <input type="number" id="preciso3dTiempo" class="gecko-input w-full" placeholder="0" oninput="window.calcularCosto3D()">
                        </div>
                    </div>
                </div>

                <div class="card-gecko space-y-2">
                    <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja">03. Material (Filamento)</p>
                    <div class="grid grid-cols-1 gap-4">
                        <div>
                            <label class="block text-[11px] text-zinc-400 mb-1">Tipo de Filamento</label>
                            <select id="preciso3dMaterial" class="gecko-select w-full" onchange="window.calcularCosto3D()"></select>
                        </div>
                    </div>
                </div>

                <div>
                    <button onclick="window.agregarItemAlCarritoUI()" class="w-full py-3 bg-[#f15a24] text-white rounded-2xl font-black uppercase text-[11px] tracking-[3px] shadow-lg transition-all active:scale-[0.98]">
                        + AÑADIR A COTIZACIÓN
                    </button>
                </div>
            </div>
        `;
        const selMat = document.getElementById('preciso3dMaterial');
        if (selMat) {
            const mats = (window.materiales || []).filter(m => m.categoria === '3d');
            selMat.innerHTML = mats.map(m => `<option value="${m.costo || m.costoARS || 0}">${m.nombre}</option>`).join('') || '<option value="0">Sin materiales 3D</option>';
        }
        window.calcularCosto3D();
    } else if (cat === 'bastidores') {
        panel.innerHTML = `
            <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div class="card-gecko">
                    <div class="flex items-center justify-between w-full mb-2">
                        <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja">01. IDENTIFICACIÓN</p>
                    </div>
                    <input type="text" id="bastidorNombre" oninput="window.calcularCostoBastidores()" placeholder="Ej: Estructura Local" 
                        class="w-full bg-transparent border-b border-zinc-800 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-gecko transition-all">
                </div>

                <div class="card-gecko">
                    <div class="flex items-center gap-3 mb-2 guia-naranja border-l-2 border-[#F15A24] pl-3">
                        <h3 class="text-white text-[12px] font-black uppercase tracking-[0.2em]">02. MEDIDAS ESTRUCTURALES</h3>
                    </div>
                    <div id="contenedorFilasBastidor" class="space-y-2">
                        <div class="grid grid-cols-12 gap-3 items-center fila-bastidor px-2 group transition-all" onclick="window.enfocarFilaBastidor(this)">
                            <div class="col-span-3">
                                <label class="${labelStyle} mb-2 text-[8px]">Ancho (cm)</label>
                                <input type="number" class="input-ancho ${inputStyle} !text-sm !p-2" oninput="window.calcularCostoBastidores()" onfocus="window.enfocarFilaBastidor(this.closest('.fila-bastidor'))" placeholder="0">
                            </div>
                            <div class="col-span-3">
                                <label class="${labelStyle} mb-2 text-[8px]">Alto (cm)</label>
                                <input type="number" class="input-alto ${inputStyle} !text-sm !p-2" oninput="window.calcularCostoBastidores()" onfocus="window.enfocarFilaBastidor(this.closest('.fila-bastidor'))" placeholder="0">
                            </div>
                            <div class="col-span-3">
                                <label class="${labelStyle} mb-2 text-[8px]">Cant.</label>
                                <input type="number" class="input-cantidad ${inputStyle} !text-sm !p-2" oninput="window.calcularCostoBastidores()" onfocus="window.enfocarFilaBastidor(this.closest('.fila-bastidor'))" value="1">
                            </div>
                            <div class="col-span-3 flex justify-end pt-5">
                                <button onclick="window.eliminarFilaBastidor(this)" class="text-red-500/50 hover:text-red-500 p-2 transition-colors">✕</button>
                            </div>
                        </div>
                    </div>
                    <button onclick="window.agregarFilaBastidor()" class="w-full py-4 bg-transparent border border-dashed border-zinc-800 rounded-2xl text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:border-gecko/50 hover:text-gecko transition-all">
                        + Añadir Estructura
                    </button>
                    <div id="canvasBastidor" class="w-full aspect-[21/9] bg-[#09090b] rounded-xl flex items-center justify-center border border-zinc-800 transition-all overflow-hidden relative shadow-inner">
                        <p class="text-[10px] font-bold text-zinc-600 uppercase tracking-widest text-center px-6">El plano se generará automáticamente con las medidas ingresadas</p>
                    </div>
                </div>
                <div class="card-gecko">
                    <div class="flex items-center gap-3 mb-2 guia-naranja border-l-2 border-[#F15A24] pl-3">
                        <h3 class="text-white text-[12px] font-black uppercase tracking-[0.2em]">03. TIPO DE ESQUELETO</h3>
                    </div>
                    <div class="group px-2 space-y-4">
                        <div>
                            <label class="${labelStyle} mb-2">Elegir Material</label>
                            <select id="bastidorMaterial" onchange="window.calcularCostoBastidores()" class="${inputStyle} gecko-select py-3 bg-[#131314] cursor-pointer appearance-none">
                                <option value="">Seleccionar material...</option>
                            </select>
                            <p id="auditorBastidor" class="text-[11px] text-zinc-400 font-medium italic mt-2.5 ml-1">Selecioná un material para ver el detalle</p>
                        </div>
                        <div id="resumenConsumoBastidor" class="p-4 bg-zinc-950 rounded-2xl border border-zinc-900 hidden">
                            <p class="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Resumen de Consumo Real</p>
                            <div class="flex justify-between items-center text-xs">
                                <span class="text-zinc-400 font-bold" id="txtTotalML">Metros lineales totales: 0 m</span>
                                <span class="text-gecko font-black" id="txtTotalBarras">Barras de 6m: 0</span>
                            </div>
                            <p id="txtRevest" class="text-[11px] text-zinc-400 font-medium mt-1 hidden"></p>
                        </div>
                    </div>
                </div>
                <div class="card-gecko">
                    <div class="flex items-center gap-3 mb-2 guia-naranja border-l-2 border-[#F15A24] pl-3">
                        <h3 class="text-white text-[12px] font-black uppercase tracking-[0.2em]">04. REVESTIMIENTO</h3>
                    </div>
                    <div class="space-y-4 mx-2">
                        <div class="flex items-center justify-between p-4 rounded-2xl bg-[#09090b]/50 border border-zinc-900 group transition-all hover:border-[#F15A24]/30">
                            <div class="flex items-center gap-4">
                                <div class="w-10 h-10 rounded-xl bg-[#F15A24]/10 flex items-center justify-center text-[#F15A24] group-hover:scale-110 transition-transform">
                                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                                </div>
                                <div class="text-left">
                                    <p class="text-[12px] font-bold text-zinc-300 uppercase tracking-widest group-hover:text-white transition-colors">¿LLEVA REVESTIMIENTO (LONA/ACM)?</p>
                                    <p class="text-[9px] text-zinc-500 font-black uppercase">Opcional / Lona o Placa</p>
                                </div>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="bastidorRevestimientoCheck" onchange="window.calcularCostoBastidores()" class="sr-only peer">
                                <div class="w-11 h-6 bg-zinc-800 rounded-full peer peer-checked:bg-[#F15A24] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
                            </label>
                        </div>
                        <div id="bastidorRevestimientoExtra" class="hidden animate-in fade-in slide-in-from-top-2">
                             <label class="${labelStyle} mb-2">Material de Revestimiento</label>
                             <select id="bastidorRevestimientoMaterial" onchange="window.calcularCostoBastidores()" class="${inputStyle} gecko-select py-3 bg-[#131314] cursor-pointer appearance-none">
                                <option value="Lona Front 13oz">Lona Front 13oz</option>
                                <option value="Lona Backlight">Lona Backlight</option>
                                <option value="ACM 3mm">ACM 3mm</option>
                                <option value="Chapa Galvanizada">Chapa Galvanizada</option>
                             </select>
                             <p id="auditorRevestimiento" class="text-[11px] text-zinc-400 font-medium italic mt-2.5 ml-1 space-y-1"></p>
                        </div>
                    </div>
                </div>
                <div>
                    <button onclick="window.agregarItemAlCarritoUI()" class="w-full py-3 bg-[#f15a24] text-white rounded-2xl font-black uppercase text-[11px] tracking-[3px] shadow-lg transition-all active:scale-[0.98]">
                        + AÑADIR A COTIZACIÓN
                    </button>
                </div>
            </div>
        `;
        window.calcularCostoBastidores();
    } else if (cat === 'corporeos' || cat === 'polifan' || cat === '3d') {
        const modoInicial = (cat === '3d') ? '3d' : (window._corpModo || 'polifan');
        panel.innerHTML = `<div id="corporeosDinamico" class="animate-in fade-in slide-in-from-bottom-4 duration-500"></div>`;
        setTimeout(() => window.setCorpModo(modoInicial), 50);
    } else if (cat === 'grafica') {
        const selectGrisStyle = `background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23666666'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E") !important;`;
        const selectClass = "w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 appearance-none text-white text-[13px] font-bold outline-none focus:border-gecko transition-all";
        const inputRenglon = "w-full bg-transparent border-b border-zinc-800 p-2 text-xs text-white outline-none focus:border-gecko transition-all opacity-20";

        panel.innerHTML = `
            <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <!-- 01. IDENTIFICACIÓN -->
                <div class="card-gecko">
                    <div class="flex items-center justify-between w-full mb-2">
                        <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja">01. IDENTIFICACIÓN</p>
                        <label class="flex items-center gap-2 cursor-pointer select-none group" title="Modo Gremio: usa precios especiales">
                            <span id="labelPublico" class="text-[9px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition-colors">PÚBLICO</span>
                            <div class="relative inline-flex items-center">
                                <input type="checkbox" id="modoGremio" class="sr-only peer" onchange="window.calcularCostoGrafica ? window.calcularCostoGrafica() : null; document.getElementById('labelPublico')?.classList.toggle('text-zinc-500', !this.checked); document.getElementById('labelGremio')?.classList.toggle('text-indigo-400', this.checked);">
                                <div class="w-9 h-5 bg-zinc-700 rounded-full peer-checked:bg-indigo-500 transition-all after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
                            </div>
                            <span id="labelGremio" class="text-[9px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition-colors">GREMIO</span>
                        </label>
                    </div>
                    <input type="text" id="graficaNombre" oninput="window.calcularCostoGrafica()" placeholder="Ej: Vinilos Vidriera KFC" 
                        class="w-full bg-transparent border-b border-zinc-800 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-gecko transition-all">
                </div>

                <!-- 02. VARIABLES -->
                <div class="card-gecko">
    <p class="text-[12px] font-black text-white uppercase tracking-[0.2em] mb-4 guia-gecko">02. Variables</p>
    
    <div id="contenedorFilasVariables" class="multifila-contenedor">
        <!-- Títulos de Columnas -->
        <div class="grid grid-cols-4 gap-4 px-1 mb-1">
            <span class="text-[9px] uppercase tracking-widest text-zinc-600 font-bold">Ancho (cm)</span>
            <span class="text-[9px] uppercase tracking-widest text-zinc-600 font-bold">Alto (cm)</span>
            <span class="text-[9px] uppercase tracking-widest text-zinc-600 font-bold text-center">Cant</span>
            <span></span>
        </div>
        <div class="gecko-input-row">
            <input type="number" placeholder="Ancho" oninput="window.calcularCostoGrafica()" onwheel="this.blur()">
            <input type="number" placeholder="Alto" oninput="window.calcularCostoGrafica()" onwheel="this.blur()">
            <input type="number" placeholder="Cant" class="text-center" oninput="window.calcularCostoGrafica()" onwheel="this.blur()">
            <div class="flex justify-end pr-2 pb-1">
                <button onclick="this.closest('.gecko-input-row').remove(); window.calcularCostoGrafica();" class="text-zinc-700 hover:text-red-500 transition-colors">✕</button>
            </div>
        </div>
    </div>

    <button onclick="window.agregarFilaTrabajo()" class="btn-add-fila">
        + AÑADIR TRABAJO
    </button>
</div>

                <!-- 03. SELECCIÓN DE MATERIAL (CASCADA) -->
                <div class="card-gecko">
    <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja mb-4">03. Selección de Material</p>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <div class="relative w-full">
           <select id="graficaCat" onchange="window.actualizarSubMaterialesGrafica()" class="gecko-select-pro" required>
    <option value="">Categoría...</option>
    <option value="VINILOS">Vinilos</option>
    <option value="LONAS">Lonas</option>
    <option value="PLACAS">Placas Rígidas</option>
</select>
        </div>

        <div class="relative w-full">
            <select id="graficaMatEspec" onchange="window.calcularCostoGrafica()" class="gecko-select-pro"required>
                <option value="">Seleccionar material...</option>
            </select>
            <p id="auditorMaterialGrafica" class="text-[11px] text-zinc-400 font-medium italic mt-2.5 px-1"></p>
        </div>

    </div>
</div>

                <!-- 04. TERMINACIONES -->
                <div class="card-gecko">
            <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja mb-2">04. Terminaciones</p>
            <div class="space-y-1 divide-y divide-zinc-800/30">
                
                <div class="grid grid-cols-12 items-center gap-4 py-4">
                    <div class="col-span-5 flex items-center gap-3 text-left">
                        <input type="checkbox" id="checkRefilado" onchange="window.calcularCostoGrafica()" class="w-4 h-4 accent-gecko cursor-pointer">
                        <label for="checkRefilado" class="text-[11px] font-bold text-zinc-200 uppercase tracking-wider cursor-pointer">Refilado</label>
                    </div>
                    <div class="col-span-4 flex flex-col justify-center gap-1">
                        <div class="flex items-center gap-2">
                            <input type="number" id="valRefilado" placeholder="0" oninput="window.calcularCostoGrafica()" onwheel="this.blur()" class="w-16 bg-transparent border-b border-zinc-800 py-1 text-white text-[13px] focus:outline-none focus:border-gecko transition-all">
                            <span class="text-[10px] font-black text-zinc-400 tracking-tighter">ML</span>
                        </div>
                        <p id="auditorRefilado" class="text-[11px] text-zinc-400 font-medium mt-2.5 italic"></p>
                    </div>
                    <div class="col-span-3 text-right text-[12px] font-black text-gecko" id="priceRefilado">$0</div>
                </div>

                <div class="grid grid-cols-12 items-center gap-4 py-4">
                    <div class="col-span-5 flex items-center gap-3 text-left">
                        <input type="checkbox" id="checkBolsillo" onchange="window.calcularCostoGrafica()" class="w-4 h-4 accent-gecko cursor-pointer">
                        <label for="checkBolsillo" class="text-[11px] font-bold text-zinc-200 uppercase tracking-wider cursor-pointer">Bolsillo</label>
                    </div>
                    <div class="col-span-4 flex flex-col justify-center gap-1">
                        <div class="flex items-center gap-2">
                            <input type="number" id="valBolsillo" placeholder="0" oninput="window.calcularCostoGrafica()" onwheel="this.blur()" class="w-16 bg-transparent border-b border-zinc-800 py-1 text-white text-[13px] focus:outline-none focus:border-gecko transition-all">
                            <span class="text-[10px] font-black text-zinc-400 tracking-tighter">ML</span>
                        </div>
                        <p id="auditorBolsillo" class="text-[11px] text-zinc-400 font-medium mt-2.5 italic"></p>
                    </div>
                    <div class="col-span-3 text-right text-[12px] font-black text-gecko" id="priceBolsillo">$0</div>
                </div>

                <div class="grid grid-cols-12 items-center gap-4 py-4">
                    <div class="col-span-5 flex items-center gap-3 text-left">
                        <input type="checkbox" id="checkOjales" onchange="window.calcularCostoGrafica()" class="w-4 h-4 accent-gecko cursor-pointer">
                        <label for="checkOjales" class="text-[11px] font-bold text-zinc-200 uppercase tracking-wider cursor-pointer">Ojales</label>
                    </div>
                    <div class="col-span-4 flex flex-col justify-center gap-1">
                        <div class="flex items-center gap-2">
                            <input type="number" id="valOjales" placeholder="0" oninput="window.calcularCostoGrafica()" onwheel="this.blur()" class="w-16 bg-transparent border-b border-zinc-800 py-1 text-white text-[13px] focus:outline-none focus:border-gecko transition-all">
                            <span class="text-[10px] font-black text-zinc-400 tracking-tighter">CANT</span>
                        </div>
                        <p id="auditorOjales" class="text-[11px] text-zinc-400 font-medium mt-2.5 italic"></p>
                    </div>
                    <div class="col-span-3 text-right text-[12px] font-black text-gecko" id="priceOjales">$0</div>
                </div>

                <div class="grid grid-cols-12 items-center gap-4 py-4">
                    <div class="col-span-5 flex items-center gap-3 text-left">
                        <input type="checkbox" id="checkLaminado" onchange="window.GeckoGrafica.syncLaminado(true); window.calcularCostoGrafica();" class="w-4 h-4 accent-gecko cursor-pointer">
                        <label for="checkLaminado" class="text-[11px] font-bold text-zinc-200 uppercase tracking-wider cursor-pointer">Laminado</label>
                    </div>
                    <div class="col-span-4 flex flex-col justify-center gap-1">
                        <div class="flex items-center justify-start gap-2">
                            <input type="number" id="graficaLaminadoMt2" placeholder="0" class="w-16 bg-transparent border-b border-zinc-800 py-1 text-white text-[13px] focus:outline-none focus:border-gecko transition-all" oninput="window.GeckoGrafica.setLaminadoTouched(); window.calcularCostoGrafica()" onwheel="this.blur()">
                            <span class="text-[10px] font-black text-zinc-400 tracking-tighter">M2</span>
                            <button onclick="window.GeckoGrafica.syncLaminado(true)" class="text-zinc-600 hover:text-gecko transition-colors ml-1" title="Recalcular suma automática">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>
                        <p id="auditorLaminado" class="text-[11px] text-zinc-400 font-medium mt-2.5 italic"></p>
                    </div>
                    <div class="col-span-3 text-right text-[12px] font-black text-gecko" id="priceLaminado">$0</div>
                </div>

               <div class="grid grid-cols-12 items-center gap-4 py-4">
    <div class="col-span-5 flex items-center gap-3 text-left">
        <input type="checkbox" id="checkMontado" onchange="window.calcularCostoGrafica()" class="w-4 h-4 accent-gecko cursor-pointer">
        <label for="checkMontado" class="text-[11px] font-bold text-zinc-200 uppercase tracking-wider cursor-pointer">Montado</label>
    </div>
    <div class="col-span-4 flex flex-col justify-center gap-1">
        <div class="flex items-center justify-start gap-2">
            <input type="number" id="valMontado" placeholder="0" class="w-16 bg-transparent border-b border-zinc-800 py-1 text-white text-[13px] focus:outline-none focus:border-gecko" oninput="window.calcularCostoGrafica()" onwheel="this.blur()">
            <span class="text-[10px] font-black text-zinc-400 tracking-tighter">MT2</span>
        </div>
        <p id="auditorMontado" class="text-[11px] text-zinc-400 font-medium mt-2.5 italic"></p>
    </div>
    <div class="col-span-3 text-right text-[12px] font-black text-gecko" id="priceMontado">$0</div>
</div>
                </div>
            </div>
        </div>
    </div>

        <div id="seccionMontadoExtra" class="hidden animate-in fade-in zoom-in-95 duration-300">
            <div class="seccion-switch-gecko">
    <p class="text-[12px] font-black text-white uppercase tracking-[0.2em] mb-2 guia-gecko">05. Montado en Rígido</p>
    
    <div class="switch-row" onclick="document.getElementById('switch-montado').click()">
        <div class="flex items-center gap-4">
            <div class="w-10 h-10 bg-orange-950/30 rounded-xl flex items-center justify-center border border-orange-900/30">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gecko" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
            </div>
            <div>
                <p class="text-[11px] font-black text-white uppercase tracking-wider">¿Lleva Montado?</p>
                <p class="text-[9px] font-bold text-zinc-500 uppercase">Opcional / PVC, Foam, ACM</p>
            </div>
        </div>
        
        <label class="switch-gecko" onclick="event.stopPropagation()">
            <input type="checkbox" id="switch-montado">
            <span class="slider-gecko"></span>
        </label>
    </div>

    <div id="detallesMontado" class="hidden mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
        <div class="pt-4 border-t border-zinc-800/50">
            <select id="graficaImpresionPlacas" onchange="window.calcularCostoGrafica()" class="gecko-select-pro w-full mb-1" required>
                <option value="">Seleccionar Placa...</option>
            </select>
            <p id="auditorPlacaRigida" class="text-[11px] text-zinc-400 font-medium mt-2.5 italic mb-4 px-1"></p>

            <!-- Títulos de Columnas -->
            <div class="grid grid-cols-4 gap-4 px-1 mb-1">
                <span class="text-[9px] uppercase tracking-widest text-zinc-600 font-bold">Ancho</span>
                <span class="text-[9px] uppercase tracking-widest text-zinc-600 font-bold">Alto</span>
                <span class="text-[9px] uppercase tracking-widest text-zinc-600 font-bold text-center">Cant</span>
                <span class="text-[9px] uppercase tracking-widest text-zinc-600 font-bold">Corte ML</span>
            </div>

            <div id="contenedor-filas-rigidos" class="space-y-1">
                <!-- Se llenará dinámicamente -->
            </div>

            <button type="button" onclick="window.agregarFilaMontado()" class="btn-add-fila mt-4">
                + AÑADIR PLACA / MEDIDA
            </button>
        </div>
    </div>
</div>

        <button onclick="window.GeckoGrafica.añadirAlPresupuesto()" class="w-full py-4 bg-gecko text-white rounded-2xl font-black uppercase tracking-[0.3em] text-[12px] hover:bg-orange-600 transition-all shadow-lg shadow-gecko/20">
            + AÑADIR A COTIZACIÓN
        </button>
`;
        // Inicialización Diferida
        setTimeout(() => {
            window.GeckoGrafica.init();
            // Aseguramos que haya al menos una fila vacía
            const varContainer = document.getElementById('contenedorFilasVariables');
            if (varContainer && varContainer.children.length <= 1) { // 1 because of titles
                window.agregarFilaTrabajo();
            }
        }, 100);

    } else if (cat === 'laser_cnc') {
        const options = (window.materiales || []).filter(m => m.categoria === 'rigido').map(m => `<option value="${m.nombre}">`).join('');
        panel.innerHTML = `
            <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div class="card-gecko">
                    <div class="flex items-center justify-between w-full mb-4">
                        <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja">01. IDENTIFICACIÓN DEL TRABAJO</p>
                    </div>
                    <div class="group"><input type="text" id="corteNombre" oninput="window.calcularCostoCorte()" placeholder="Ej: Llaveros MDF Grabados" class="${inputStyle}"></div>
                </div>
                <div class="card-gecko space-y-2">
                    <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja">02. SELECCIÓN DE MATERIALES</p>
                    <div id="contenedorFilasLaser" class="space-y-3 mb-4">
                        <div class="grid grid-cols-12 gap-4 items-center fila-laser group">
                            <div class="col-span-5"><input type="text" list="dlCorte" class="input-laser-mat w-full bg-transparent border-b border-zinc-800 p-2" oninput="window.calcularCostoCorte()" placeholder="Material..."></div>
                            <div class="col-span-2"><input type="number" class="input-laser-ancho w-full bg-transparent border-b border-zinc-800 p-2 text-center" oninput="window.calcularCostoCorte()" placeholder="Ancho"></div>
                            <div class="col-span-2"><input type="number" class="input-laser-alto w-full bg-transparent border-b border-zinc-800 p-2 text-center" oninput="window.calcularCostoCorte()" placeholder="Alto"></div>
                            <div class="col-span-2"><input type="number" class="input-laser-cant w-full bg-transparent border-b border-zinc-800 p-2 text-center" oninput="window.calcularCostoCorte()" value="1"></div>
                            <div class="col-span-1 flex justify-center"><button onclick="this.closest('.fila-laser').remove(); window.calcularCostoCorte();" class="text-red-500/50 hover:text-red-500 p-2 transition-colors">✕</button></div>
                        </div>
                    </div>
                    <button onclick="window.agregarFilaLaser()" class="w-full py-4 bg-transparent border border-dashed border-zinc-800 rounded-2xl text-[10px] font-black text-zinc-500 hover:border-gecko/50 hover:text-gecko transition-all">+ Añadir Material</button>
                </div>
                <div class=""><button onclick="window.agregarItemAlCarritoUI()" class="w-full py-3 bg-[#f15a24] text-white rounded-2xl font-black uppercase text-[11px] tracking-[3px] shadow-lg">+ AÑADIR A COTIZACIÓN</button></div>
                <datalist id="dlCorte">${options}</datalist>
            </div>
        `;
        setTimeout(() => window.calcularCostoCorte('laser_cnc'), 50);
    } else if (cat === 'textil') {
        panel.innerHTML = `
            <div class="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                <!-- Tarjeta 01: IDENTIFICACIÓN -->
                <div class="card-gecko">
                    <div class="flex items-center justify-between w-full mb-4">
                        <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja">01. IDENTIFICACIÓN DEL TRABAJO</p>
                    </div>
                    <div class="group">
                        <input type="text" id="textilNombre" oninput="window.calcularCostoTextil()" placeholder="Ej: Remeras Egresados" class="${inputStyle}">
                    </div>
                </div>

                <!-- Tarjeta 02: VARIABLES DE MEDIDA -->
                <div class="card-gecko">
                    <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja mb-4">02. VARIABLES DE MEDIDA</p>
                    <div id="contenedorVariablesTextil">
                        <!-- Inyectado por setTextilModo -->
                    </div>
                    <div id="auditorMaterial" class="text-[11px] text-zinc-400 font-medium italic mt-2.5 ml-1"></div>
                </div>

                <!-- Tarjeta 03: ESTAMPADO -->
                <div class="card-gecko">
                    <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja mb-4">03. ESTAMPADO</p>
                    <div class="grid grid-cols-12 gap-4 items-center">
                        <div class="col-span-8">
                            <p class="text-[13px] font-bold text-zinc-200 uppercase tracking-tight">Cantidad de Bajadas (Estampados)</p>
                        </div>
                        <div class="col-span-4">
                            <input type="number" id="textilBajadas" value="1" oninput="window.calcularCostoTextil()" onwheel="this.blur()" class="${inputStyle} text-center">
                        </div>
                    </div>
                    <div id="auditorEstampado" class="text-[11px] text-zinc-400 font-medium italic mt-2.5 ml-1"></div>
                </div>

                <!-- Tarjeta 04: PRENDA -->
                <div class="card-gecko">
                    <p class="text-[12px] font-black text-gecko uppercase tracking-[0.2em] guia-naranja mb-4">04. PRENDA</p>
                    <div class="grid grid-cols-2 gap-6">
                        <div>
                            <label class="${labelStyle}">Valor Unitario Prenda</label>
                            <input type="number" id="prendaCostoUnit" placeholder="0" oninput="window.calcularCostoTextil()" onwheel="this.blur()" class="${inputStyle}">
                        </div>
                        <div>
                            <label class="${labelStyle}">Cantidad de Prendas</label>
                            <input type="number" id="prendaCantidad" value="1" oninput="window.calcularCostoTextil()" onwheel="this.blur()" class="${inputStyle}">
                        </div>
                    </div>
                </div>

                <div class="">
                    <button id="btnConfirmarItem" onclick="window.añadirTextilAlPresupuesto()" class="w-full py-3 bg-[#f15a24] text-white rounded-2xl font-black uppercase text-[11px] tracking-[3px] shadow-lg">
                        + AÑADIR A COTIZACIÓN
                    </button>
                </div>
            </div>
        `;
        setTimeout(() => window.setTextilModo(window._textilModo || 'dtf'), 50);
    } else if (cat === 'corte') {
        window.GeckoCorte.init();
    } else {
        panel.innerHTML = `<div class="p-20 text-center text-zinc-600 uppercase font-black tracking-widest">Selecciona un cotizador para comenzar</div>`;
    }

    // 4. Lógica de Resaltado del Sidebar (AL FINAL)
    document.querySelectorAll('[id^="side-"], [id^="sub-"]').forEach(el => el.classList.remove('nav-active'));
    let subLinkId = `side-${cat}`;
    if (cat === 'grafica') {
        const modo = (window.graficaState && window.graficaState.tipoTrabajo) ? window.graficaState.tipoTrabajo : 'impresion';
        subLinkId = (modo === 'corte') ? 'sub-vinilo-corte' : 'sub-vinilo-imp';
    } else if (cat === 'corporeos' || cat === 'polifan') {
        if (window._corpModo === 'chapa-acrilico') subLinkId = 'sub-chapa-acrilico';
        else if (window._corpModo === 'letras3d') subLinkId = 'sub-letras-3d';
        else subLinkId = 'sub-polifan';
    } else if (cat === 'laser_cnc') {
        subLinkId = (window._laserCncModo === 'cnc') ? 'sub-cnc' : 'sub-laser';
    } else if (cat === 'textil') {
        const modo = window._textilModo || 'dtf';
        subLinkId = 'sub-textil-' + (modo === 'estampado' ? 'estampados' : modo);
    } else if (cat === '3d') {
        subLinkId = 'side-3d';
    } else if (cat === 'bastidores') {
        subLinkId = 'side-bastidores';
    }
    const subLink = document.getElementById(subLinkId);
    if (subLink) subLink.classList.add('nav-active');
};
;

;

// Toggles para la sección Textil
;

;

// Helper para checkboxes estilizados en el nuevo modal
function toggleCheckbox(id) {
    const cb = document.getElementById(id);
    if (cb) {
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event('change'));

        // Visual feedback
        const btn = document.getElementById(`btn-${id.replace('term', '').toLowerCase()}`);
        if (btn) {
            if (cb.checked) {
                btn.classList.add('border-[#f97316]/50', 'bg-[#f97316]/5');
                btn.querySelector('span').classList.add('text-gray-800', 'dark:text-white');
                btn.querySelector('span').classList.remove('text-gray-500', 'dark:text-zinc-500');
            } else {
                btn.classList.remove('border-[#f97316]/50', 'bg-[#f97316]/5');
                btn.querySelector('span').classList.remove('text-gray-800', 'dark:text-white');
                btn.querySelector('span').classList.add('text-gray-500', 'dark:text-zinc-500');
            }
        }
    }
}

// â”€â”€ Helper: Sugerencia de carga rápida al inventario â”€â”€
function _mostrarSugerenciaMaterial(nombreMat, enStock) {
    console.log('Buscando material:', nombreMat, '| En stock:', enStock);
    const div = document.getElementById('sugerenciaNuevoMaterial');
    if (!div) return;
    if (enStock || !nombreMat || nombreMat.trim() === '') {
        div.innerHTML = '';
        return;
    }
    const nombreSeguro = nombreMat.replace(/"/g, '&quot;').replace(/'/g, "&#39;");
    div.innerHTML = `
                <button type="button"
                    onclick=abrirModalMaterial(); setTimeout(function(){ var n=document.getElementById('matNom'); if(n) n.value='${nombreSeguro}'; }, 150)"
                    class="w-full mt-2 p-3 bg-amber-500/10 border border-amber-500/50 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-xl hover:bg-amber-500 hover:text-white transition-all text-center">
                    &#10010; &iquest;Cargar &ldquo;${nombreMat}&rdquo; al stock?
                </button>`;
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// ── Lógica del Carrito y Presupuesto ──
window.agregarItemAlCarritoUI = async function () {
    if (!window.itemActualCotizado || isNaN(window.itemActualCotizado.costo) || window.itemActualCotizado.costo === 0) {
        alert("Primero completa los datos del trabajo para generar valor a la cotización.");
        return;
    }
    const btn = document.getElementById('btnConfirmarItem');
    if (!btn) return;
    const originalText = btn.innerHTML;

    try {
        btn.innerHTML = 'Guardando...';
        const currentCat = window.itemActualCotizado.tipo;

        // Ejecutar lógica base
        await agregarItemAlCarrito();

        // Feedback y reset de tab 
        btn.innerHTML = `<svg class="w-5 h-5 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> Guardado!`;
        if (currentCat) {
            if (typeof cambiarCategoriaCotizador === 'function') cambiarCategoriaCotizador(currentCat);
        }
    } catch (error) {
        console.error("Error al añadir al carrito:", error);
        btn.innerHTML = originalText;
    }

    setTimeout(() => {
        if (btn) btn.innerHTML = originalText;
    }, 1500);
};

// Puente solicitado para sincronización de módulos
window.agregarItemAlPresupuesto = function (item) {
    if (!item || !item.costo) return;

    // Si el item viene del nuevo sistema, aseguramos que tenga las propiedades esperadas por renderizarPresupuesto
    if (!item.tipo) item.tipo = 'grafica';
    if (!item.modoCalculo) item.modoCalculo = localStorage.getItem('globalEstimationMode') || 'simple';

    // Inyectar al presupuesto global
    if (typeof presupuesto !== 'undefined') {
        presupuesto.push(item);
    }

    // Forzar actualización de la columna derecha
    if (typeof renderizarPresupuesto === 'function') window.renderizarPresupuesto();

    // Log para depuración
    console.log("📦 Item agregado al presupuesto:", item.nombre);
};

async function agregarItemAlCarrito() {
    const item = window.itemActualCotizado;
    if (!item || isNaN(item.costo)) return;

    // —— Validación de material en stock ——
    const _tiposSinStock = ['estampados']; // tipos que no usan stock de materiales
    if (!_tiposSinStock.includes(item.tipo)) {
        const _stockMats = JSON.parse(localStorage.getItem('gecko_materiales') || '[]');
        // Tomamos el nombre del material del textoOpciones (primera parte antes del paréntesis)
        const _nombreMatUsado = (item.textoOpciones || '').split('(')[0].trim().toLowerCase();
        const _enStock = _stockMats.some(m => m.nombre.toLowerCase() === _nombreMatUsado ||
            _nombreMatUsado.includes(m.nombre.toLowerCase()));

        if (!_enStock && _nombreMatUsado) {
            const _agregar = confirm(
                `⚠️ "${item.textoOpciones.split('(')[0].trim()}" no está registrado en el inventario.\n\n` +
                `¿Deseas agregarlo al stock ahora?\n\n` +
                `→ SÍ : Abre el formulario de alta de material.\n` +
                `→ NO: Continúa como "Material Especial" (sin descuento de stock).`
            );

            if (_agregar) {
                // Pre-poblar el modal de material con el nombre
                if (typeof abrirModalMaterial === 'function') abrirModalMaterial();
                setTimeout(() => {
                    const _inputNom = document.getElementById('matNom');
                    if (_inputNom) _inputNom.value = item.textoOpciones.split('(')[0].trim();
                }, 150);
                return; // No agrega al carrito aún
            } else {
                // Marca como material especial para que la lógica de OT no intente descontarlo
                item.materialEspecial = true;
            }
        }
    }

    const inputAdj = document.getElementById('itemAdjuntoImg') || document.getElementById('itemAdjunto');
    if (inputAdj && inputAdj.files && inputAdj.files[0]) {
        const baseStr = await fileToBase64(inputAdj.files[0]);
        item.imagenBase64 = baseStr;
    }

    // Guardar el modo de cálculo actual en el ítem
    item.modoCalculo = typeof globalEstimationMode !== 'undefined' ? globalEstimationMode : (localStorage.getItem('globalEstimationMode') || 'simple');

    if (typeof presupuesto !== 'undefined') {
        presupuesto.push(item);
    }
    if (typeof renderizarPresupuesto === 'function') renderizarPresupuesto();

    // Reset cotizador form (compatible con viewCotizadores)
    const _btnAgregar = document.getElementById('btnAgregarAlPresupuesto');
    if (_btnAgregar) _btnAgregar.classList.add('hidden');
    const _adjunto = document.getElementById('contenedorAdjunto');
    if (_adjunto) _adjunto.classList.add('hidden');
    if (inputAdj) inputAdj.value = "";

    window.itemActualCotizado = null;
}

window.renderizarPresupuesto = function () {
    const lista = document.getElementById('listaPresupuesto');
    const seccionGremio = document.getElementById('seccion-gremio');
    const labelTotal = document.getElementById('labelTotalPresupuesto');
    const inputTotalHidden = document.getElementById('precioTotal');
    const mode = localStorage.getItem('globalEstimationMode') || 'simple';

    if (!lista || !seccionGremio || !labelTotal) return;

    if (presupuesto.length === 0) {
        lista.innerHTML = `<div class="p-10 text-center opacity-20"><p class="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Sin productos añadidos</p></div>`;
        seccionGremio.innerHTML = '';
        labelTotal.innerText = '$0';
        labelTotal.className = "text-5xl font-black text-gecko mb-8 block opacity-20";
        if (inputTotalHidden) inputTotalHidden.value = 0;
        return;
    }

    lista.innerHTML = presupuesto.map((item, index) => {
        const formatting = {
            grafica: { text: 'text-blue-500', bg: 'bg-blue-500/10' },
            corporeos: { text: 'text-orange-500', bg: 'bg-orange-500/10' },
            laser_cnc: { text: 'text-orange-500', bg: 'bg-orange-500/10' },
            estampados: { text: 'text-pink-500', bg: 'bg-pink-500/10' }
        }[item.tipo] || { text: 'text-zinc-500', bg: 'bg-zinc-800' };

        return `
        <div class="py-6 px-6 group hover:bg-zinc-900/40 transition-all border-b border-zinc-900/50 flex flex-col gap-1">
            <div class="flex justify-between items-start text-[14px]">
                <div class="flex flex-col gap-1.5">
                    <div class="flex items-center gap-2">
                        <span class="text-[9px] font-black ${formatting.text} ${formatting.bg} px-2 py-0.5 rounded uppercase tracking-[0.15em]">${item.tipo}</span>
                        ${item.modoCalculo ? `<span class="text-[9px] font-black bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded uppercase tracking-tighter">${item.modoCalculo}</span>` : ''}
                    </div>
                    <p class="text-white font-extrabold leading-tight uppercase tracking-wide text-[13px]">${item.textoOpciones || item.nombre}</p>
                </div>
                <button onclick="eliminarDelCarrito(${index})" class="text-zinc-700 hover:text-red-500 transition-all p-1 mt-1">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <div class="flex justify-between items-end mt-4">
                <p class="text-[11px] text-zinc-500 font-medium italic leading-relaxed max-w-[70%]">${item.otDetalle || item.detalle || ''}</p>
                <p class="text-gecko font-black text-lg tracking-tighter">$${Math.round(item.costo).toLocaleString('es-AR')}</p>
            </div>
        </div>`;
    }).join('');

    const subtotal = presupuesto.reduce((acc, it) => acc + Math.round(it.costo), 0);
    const isGremioActive = document.getElementById('check-gremio')?.checked || false;
    const gremioPorcentaje = parseFloat(document.getElementById('porcentaje-gremio')?.value) || 20;

    if (mode === 'simple') {
        seccionGremio.style.display = 'flex';
        seccionGremio.className = "flex items-center justify-between my-8 px-3 py-1 bg-zinc-900/80 rounded-full border border-zinc-700/50 w-full max-w-[210px] ml-auto transition-all shadow-xl";

        if (!document.getElementById('check-gremio')) {
            seccionGremio.innerHTML = `
            <div class="flex items-center gap-2 pl-1">
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="check-gremio" class="sr-only peer" ${isGremioActive ? 'checked' : ''} onchange="window.renderizarPresupuesto()">
                    <div class="w-8 h-4 bg-zinc-800 rounded-full peer peer-checked:bg-gecko after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4"></div>
                </label>
                <span class="text-[11px] font-black text-zinc-300 uppercase tracking-widest mt-0.5">Gremio</span>
            </div>
            <div id="wrap-porcentaje-gremio" class="flex items-center gap-0.5 pr-1" style="display: ${isGremioActive ? 'flex' : 'none'}">
                <input type="number" id="porcentaje-gremio" value="${gremioPorcentaje}" onchange="window.renderizarPresupuesto()" class="w-8 bg-transparent border-none p-0 text-right font-black text-gecko text-[13px] outline-none">
                <span class="text-[11px] font-black text-gecko mt-0.5">%</span>
            </div>`;
        } else {
            document.getElementById('check-gremio').checked = isGremioActive;
            document.getElementById('porcentaje-gremio').value = gremioPorcentaje;
            document.getElementById('wrap-porcentaje-gremio').style.display = isGremioActive ? 'flex' : 'none';
        }
    } else {
        seccionGremio.style.display = 'none';
        seccionGremio.innerHTML = '';
    }

    let totalFinal = subtotal;
    if (mode === 'simple' && isGremioActive) {
        totalFinal = Math.round(subtotal * (1 - (gremioPorcentaje / 100)));
    }

    labelTotal.innerText = '$' + totalFinal.toLocaleString('es-AR');
    labelTotal.className = "text-5xl font-black text-gecko mb-8 block tracking-tighter animate-in fade-in zoom-in-95 duration-300";
    if (inputTotalHidden) inputTotalHidden.value = totalFinal;
};

// --- RESTAURACIÓN DE FUNCIONES DE NAVEGACIÓN Y RENDERIZADO ---

window.renderizarMovimientos = function () {
    const tbody = document.getElementById('tbodyMovimientos');
    if (!tbody) return;

    // Filtramos movimientos según el filtro actual (dia, semana, mes) si existe la lógica
    // Por ahora renderizamos todo lo que LISTA_MOVIMIENTOS contenga para este periodo.
    const itemsHTML = LISTA_MOVIMIENTOS.map(m => {
        const infoCaja = LISTA_CAJAS.find(c => c.nombre === m.caja);
        let cajaStyle = "bg-gray-100 text-gray-600";
        let dotColor = "bg-gray-400";
        const detalleHtml = m.otDetalle || m.detalle || m.concepto || 'Sin detalle';

        if (infoCaja) {
            if (infoCaja.icono === 'efectivo') {
                cajaStyle = "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";
                dotColor = "bg-emerald-500";
            } else if (infoCaja.icono === 'mercado_pago_celeste') {
                cajaStyle = "bg-blue-50 text-blue-700 dark:bg-blue-600/10 dark:text-blue-400";
                dotColor = "bg-blue-600";
            } else if (infoCaja.icono === 'banco') {
                cajaStyle = "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
                dotColor = "bg-gray-500";
            }
        }

        return `
        <tr class="hover:bg-gray-50/80 dark:hover:bg-darkCard/40 transition-all group border-b border-gray-100 dark:border-zinc-800/50">
            <td class="py-5 px-6">
                <span class="text-[11px] font-bold text-gray-400">${m.fecha}</span>
            </td>
            <td class="py-5 px-6">
                <div class="flex flex-col">
                    <span class="font-bold dark:text-white text-[13px] leading-tight uppercase">${detalleHtml}</span>
                    <span class="text-[9px] uppercase font-bold text-gray-400 tracking-widest mt-1">${m.categoria || 'Varios'}</span>
                </div>
            </td>
            <td class="py-5 px-6">
                <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${cajaStyle} text-[10px] font-black uppercase tracking-tight">
                    <span class="w-1.5 h-1.5 rounded-full ${dotColor}"></span>
                    ${m.caja}
                </div>
            </td>
            <td class="py-5 px-6 text-right">
                <div class="flex items-center justify-end gap-3">
                    <div class="flex flex-col items-end">
                        <span class="text-[14px] font-black ${m.tipo === 'Ingreso' ? 'text-emerald-500' : 'text-red-500'}">
                            ${m.tipo === 'Ingreso' ? '+' : '-'}$${Math.round(m.monto).toLocaleString('es-AR')}
                        </span>
                        <span class="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">${m.tipo}</span>
                    </div>
                </div>
            </td>
        </tr>`;
    }).join('') || `<tr><td colspan="4" class="py-20 text-center text-gray-400 font-medium italic">Sin movimientos para este periodo.</td></tr>`;

    tbody.innerHTML = itemsHTML;
};

window.renderOts = function () {
    const tbody = document.getElementById('tbodyOts');
    if (!tbody) return;

    const ots = listaPresupuestos.filter(p => p.status === 'OT');

    tbody.innerHTML = ots.map((ot, idx) => `
        <tr class="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors border-b border-gray-100 dark:border-gray-800">
            <td class="py-4 px-6 text-[11px] font-black uppercase text-zinc-500">
                #${ot.id}
            </td>
            <td class="py-4 px-6">
                <div class="flex flex-col">
                    <span class="text-[14px] font-extrabold dark:text-white uppercase leading-tight">${ot.cliente}</span>
                    <span class="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter mt-0.5">${ot.fecha}</span>
                </div>
            </td>
            <td class="py-4 px-6">
                <div class="flex flex-wrap gap-1">
                    ${ot.items.map(it => `<span class="text-[9px] font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded uppercase">${it.textoOpciones || it.nombre}</span>`).join('')}
                </div>
            </td>
            <td class="py-4 px-6 text-right font-black text-white text-[14px]">
                $${Math.round(ot.total).toLocaleString('es-AR')}
            </td>
            <td class="py-4 px-6 text-right font-black text-red-500 text-[14px]">
                $${Math.round(ot.total - (ot.sena || 0)).toLocaleString('es-AR')}
            </td>
            <td class="py-4 px-6 text-center">
                <button onclick="cambiarEstadoOt(${listaPresupuestos.indexOf(ot)})" class="px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase tracking-widest border border-orange-500/20 hover:bg-orange-500 hover:text-white transition-all">
                    ${ot.estado_ot || 'En Proceso'}
                </button>
            </td>
            <td class="py-4 px-6 text-right">
                <div class="flex justify-end gap-2">
                    <button onclick="abrirPagoFinal(${listaPresupuestos.indexOf(ot)})" class="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all" title="Liquidar Saldo">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('') || `<tr><td colspan="7" class="py-20 text-center text-gray-400 font-medium italic">No hay órdenes de trabajo activas.</td></tr>`;
};

window.switchTabPedidos = function (tab) {
    const tabs = ['tabPresupuestos', 'tabOts'];
    tabs.forEach(t => {
        const el = document.getElementById(t);
        if (el) el.classList.add('hidden');
    });

    const target = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (target) target.classList.remove('hidden');

    // Estilo de botones
    const btnPre = document.getElementById('btnTabPresupuestos');
    const btnOts = document.getElementById('btnTabOts');

    if (btnPre && btnOts) {
        if (tab === 'presupuestos') {
            btnPre.className = "pb-4 text-[15px] md:text-[16px] font-bold text-gecko border-b-2 border-gecko transition-all";
            btnOts.className = "pb-4 text-[15px] md:text-[16px] font-bold text-zinc-700 hover:text-zinc-950 dark:hover:text-gray-300 transition-all border-b-2 border-transparent";
            renderPresupuestos();
        } else {
            btnOts.className = "pb-4 text-[15px] md:text-[16px] font-bold text-gecko border-b-2 border-gecko transition-all";
            btnPre.className = "pb-4 text-[15px] md:text-[16px] font-bold text-zinc-700 hover:text-zinc-950 dark:hover:text-gray-300 transition-all border-b-2 border-transparent";
            renderOts();
        }
    }
};

window.switchTabFinanzas = function (tab) {
    const tabs = ['contentFin-movimientos', 'contentFin-gastos', 'contentFin-reportes'];
    tabs.forEach(t => {
        const el = document.getElementById(t);
        if (el) el.classList.add('hidden');
    });

    const target = document.getElementById('contentFin-' + tab);
    if (target) target.classList.remove('hidden');

    // Estilo de botones
    const btns = ['tabFin-movimientos', 'tabFin-gastos', 'tabFin-reportes'];
    btns.forEach(bId => {
        const b = document.getElementById(bId);
        if (b) {
            b.className = "pb-4 text-[14px] font-bold text-gray-400 hover:text-gray-200 transition-all border-b-2 border-transparent";
        }
    });

    const activeBtn = document.getElementById('tabFin-' + tab);
    if (activeBtn) {
        activeBtn.className = "pb-4 text-[14px] font-bold text-gecko border-b-2 border-gecko transition-all";
    }

    if (tab === 'movimientos') renderizarMovimientos();
    if (tab === 'gastos') renderGastosFijos();
    if (tab === 'reportes') renderReportesDashboard();
};

function updateCajaSelectors() {
    const selectors = ['inputCajaSena', 'pagoFinalCaja', 'movCaja', 'transfOrigen', 'transfDestino'];

    const opcionesHTML = LISTA_CAJAS.map(caja => {
        // Asignamos un punto de color según el tipo para que sea fácil distinguir
        let dot = '⚪';
        if (caja.icono === 'efectivo') dot = '🟢';
        if (caja.icono === 'mercado_pago_celeste') dot = '🔵'; // El azul de MP
        if (caja.icono === 'banco') dot = '🏦';

        return `<option value="${caja.nombre}">${dot} ${caja.nombre}</option>`;
    }).join('');

    selectors.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = opcionesHTML;
    });
}

window.abrirModalNuevoMovimiento = function () {
    openModal('modalNuevoMovimiento'); // <-- Esta es la orden clave
    document.getElementById('movDescripcion').value = '';
    document.getElementById('movMonto').value = '';
}
function registrarMovimientoManual(tipo) {
    try {
        const desc = document.getElementById('movDescripcion').value.trim();
        const monto = parseFloat(document.getElementById('movMonto').value) || 0;
        const cat = document.getElementById('movCategoria').value;
        const caja = document.getElementById('movCaja').value;

        if (!desc || monto <= 0) {
            alert("Completa descripción y monto positivo.");
            return;
        }
        if (!caja) {
            alert("Selecciona una caja para operar.");
            return;
        }

        // 1. Registramos el movimiento en la base de datos
        registrarMovimiento(desc, caja, monto, tipo, cat);

        // 2. Cerramos el modal
        const modal = document.getElementById('modalNuevoMovimiento');
        if (modal) modal.style.display = 'none';

        // 3. Limpiamos los campos para la próxima vez
        document.getElementById('movDescripcion').value = '';
        document.getElementById('movMonto').value = '';

        // 4. Refrescamos los filtros por si hay cajas nuevas
        renderizarFiltrosCajas();

        // 5. Mostramos el mensaje de éxito (Asegurate que esta función exista)
        if (typeof mostrarExito === "function") {
            mostrarExito(`Se registró un ${tipo.toLowerCase()} de $${monto.toLocaleString('es-AR')}.`, "¡Hecho!");
        } else {
            alert("Movimiento registrado con éxito");
        }

    } catch (error) {
        console.error("Error al registrar movimiento:", error);
    }
}

function registrarMovimiento(detalle, cajaNombre, monto, tipo, categoria = 'Varios') {
    const caja = LISTA_CAJAS.find(c => c.nombre === cajaNombre);
    if (!caja) return;

    if (tipo === 'Ingreso') caja.saldo += monto;
    else caja.saldo -= monto;

    const mov = {
        fecha: new Date().toLocaleDateString('es-AR'),
        detalle: detalle,
        caja: cajaNombre,
        tipo: tipo,
        monto: monto,
        categoria: categoria
    };

    LISTA_MOVIMIENTOS.push(mov);
    localStorage.setItem('gecko_cajas', JSON.stringify(LISTA_CAJAS));
    localStorage.setItem('gecko_movimientos', JSON.stringify(LISTA_MOVIMIENTOS));

    // REFRESH DE PANTALLA
    renderizarFinanzas();
    renderizarMovimientos();
    // Agregamos esto para que el filtro se entere si hay algo nuevo
    if (typeof renderizarFiltrosCajas === "function") renderizarFiltrosCajas();
}

function filtrarMovimientos(periodo) {
    // 1. Cambiamos la variable global del filtro
    filtroActual = periodo;

    // 2. Actualizamos visualmente los botones (sacamos el naranja de uno y ponemos en otro)
    const botones = {
        'dia': document.getElementById('filterDia'),
        'semana': document.getElementById('filterSemana'),
        'mes': document.getElementById('filterMes')
    };

    // Limpiamos estilos de todos
    Object.values(botones).forEach(btn => {
        if (btn) {
            btn.classList.remove('bg-gecko', 'text-white', 'shadow-md');
            btn.classList.add('text-gray-400');
        }
    });

    // Ponemos el estilo activo al que clickeamos
    if (botones[periodo]) {
        botones[periodo].classList.remove('text-gray-400');
        botones[periodo].classList.add('bg-gecko', 'text-white', 'shadow-md');
    }

    // 3. Refrescamos la tabla con el nuevo filtro
    renderizarMovimientos();
}

window.abrirModalTransferencia = function () {
    document.getElementById('modalTransferencia').style.display = 'flex';
    document.getElementById('transfMonto').value = '';
}

function ejecutarTransferencia() {
    const origen = document.getElementById('transfOrigen').value;
    const destino = document.getElementById('transfDestino').value;
    const monto = parseFloat(document.getElementById('transfMonto').value) || 0;

    if (origen === destino) return alert("Las cajas deben ser distintas.");
    if (monto <= 0) return alert("Monto inválido.");

    const cajaO = LISTA_CAJAS.find(c => c.nombre === origen);
    if (cajaO.saldo < monto) {
        if (!confirm("Saldo insuficiente en origen. ¿Continuar?")) return;
    }

    registrarMovimiento(`Transferencia a ${destino}`, origen, monto, 'Egreso', 'Transferencia');
    registrarMovimiento(`Recibido de ${origen}`, destino, monto, 'Ingreso', 'Transferencia');

    document.getElementById('modalTransferencia').style.display = 'none';
    renderizarFinanzas();
    mostrarExito(`Transferencia por $${monto.toLocaleString('es-AR')} completada.`, "¡Éxito!");
}

function filtrarMovimientos(filtro) {
    filtroActual = filtro;
    ['dia', 'semana', 'mes'].forEach(f => {
        const btn = document.getElementById('filter' + f.charAt(0).toUpperCase() + f.slice(1));
        btn.classList.remove('bg-gecko', 'text-white', 'shadow-md');
        btn.classList.add('text-gray-400');
    });

    const active = document.getElementById('filter' + filtro.charAt(0).toUpperCase() + filtro.slice(1));
    active.classList.add('bg-gecko', 'text-white', 'shadow-md');
    active.classList.remove('text-gray-400');

    renderizarFinanzas();
    renderizarMovimientos();
}

function renderReportesDashboard() {
    const reportes = window.listaPresupuestos || [];
    if (!reportes || reportes.length === 0) return;
    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();

    const movimientosMes = LISTA_MOVIMIENTOS.filter(m => {
        const [d, mo, y] = m.fecha.split('/');
        return (parseInt(mo) - 1) === mesActual && parseInt(y) === anioActual;
    });

    const otsMes = listaPresupuestos.filter(p => {
        const [d, mo, y] = p.fecha.split('/');
        return p.status === 'OT' && (parseInt(mo) - 1) === mesActual && parseInt(y) === anioActual;
    });

    const presupuestosMes = listaPresupuestos.filter(p => {
        const [d, mo, y] = p.fecha.split('/');
        return (parseInt(mo) - 1) === mesActual && parseInt(y) === anioActual;
    });

    const ingresos = movimientosMes.filter(m => m.tipo === 'Ingreso').reduce((acc, curr) => acc + curr.monto, 0);
    const egresos = movimientosMes.filter(m => m.tipo === 'Egreso').reduce((acc, curr) => acc + curr.monto, 0);
    const balance = ingresos - egresos;

    // --- 0. MÉTRICAS HOLDPRINT ---
    // Dinero Estancado: Listo pero no Entregado
    const estancado = listaPresupuestos.filter(p => p.status === 'OT' && p.estado_ot === 'Listo')
        .reduce((acc, p) => acc + (p.total - (p.sena || 0)), 0);
    const elEstancado = document.getElementById('metricEstancado');
    if (elEstancado) elEstancado.innerText = `$${Math.round(estancado).toLocaleString('es-AR')}`;

    // Tasa de Cierre
    const tasaCierre = presupuestosMes.length > 0 ? ((otsMes.length / presupuestosMes.length) * 100).toFixed(1) : 0;
    const elTasa = document.getElementById('metricTasaCierre');
    if (elTasa) elTasa.innerText = `${tasaCierre}%`;

    // Ticket Promedio
    const totalOtVal = otsMes.reduce((acc, p) => acc + p.total, 0);
    const ticketProm = otsMes.length > 0 ? (totalOtVal / otsMes.length).toFixed(0) : 0;
    const elTicket = document.getElementById('metricTicketProm');
    if (elTicket) elTicket.innerText = `$${parseInt(ticketProm).toLocaleString('es-AR')}`;

    // --- 1. RENTABILIDAD DINÁMICA ---
    const rentabilidad = ingresos > 0 ? ((balance / ingresos) * 100).toFixed(1) : 0;
    const elMetricRent = document.getElementById('metricRentabilidad');
    const elBarIngreso = document.getElementById('barRentIngreso');
    const elBarEgreso = document.getElementById('barRentEgreso');
    const elLabelIngreso = document.getElementById('labelIngresoMonto');
    const elLabelEgreso = document.getElementById('labelEgresoMonto');
    const elLabelNeto = document.getElementById('labelNetoMonto');

    if (elMetricRent) {
        elMetricRent.innerText = `${rentabilidad}%`;
        elMetricRent.className = `text-4xl font-black leading-none ${rentabilidad >= 0 ? 'text-emerald-500' : 'text-red-500'}`;
    }
    if (elLabelIngreso) elLabelIngreso.innerText = `$${Math.round(ingresos).toLocaleString('es-AR')}`;
    if (elLabelEgreso) elLabelEgreso.innerText = `$${Math.round(egresos).toLocaleString('es-AR')}`;
    if (elLabelNeto) {
        elLabelNeto.innerText = `$${Math.round(balance).toLocaleString('es-AR')}`;
        elLabelNeto.className = `text-lg font-black ${balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`;
    }

    if (elBarIngreso && elBarEgreso) {
        const maxVal = Math.max(ingresos, egresos) || 1;
        elBarIngreso.style.width = `${(ingresos / maxVal) * 100}%`;
        elBarEgreso.style.width = `${(egresos / maxVal) * 100}%`;
    }

    // --- 2. LIQUIDEZ Y CALLE ---
    const totalCajas = LISTA_CAJAS.reduce((acc, c) => acc + c.saldo, 0);
    const totalCobrar = listaPresupuestos.filter(p => p.status === 'OT' && p.estado_ot !== 'Entregado')
        .reduce((acc, p) => acc + (p.total - (p.sena || 0)), 0);
    const elMetricCajas = document.getElementById('metricCajas');
    const elMetricCobrar = document.getElementById('metricCobrar');
    if (elMetricCajas) elMetricCajas.innerText = `$${Math.round(totalCajas).toLocaleString('es-AR')}`;
    if (elMetricCobrar) elMetricCobrar.innerText = `$${Math.round(totalCobrar).toLocaleString('es-AR')}`;

    const totalTotal = totalCajas + totalCobrar;
    const elBarCajas = document.getElementById('barLiquidezCajas');
    const elBarCobrar = document.getElementById('barLiquidezCobrar');
    if (elBarCajas && totalTotal > 0) elBarCajas.style.width = `${(totalCajas / totalTotal) * 100}%`;
    if (elBarCobrar && totalTotal > 0) elBarCobrar.style.width = `${(totalCobrar / totalTotal) * 100}%`;

    // --- 3. EFICIENCIA SEGMENTADA ---
    function calcularPromedioSector(sectorKey) {
        const ots = listaPresupuestos.filter(p => p.status === 'OT' && p.fecha_entrega && p.items.some(it => {
            const rubro = it.tipo === 'grafica' ? 'Gráfica' : (it.tipo === 'corporeos' ? 'Corpóreos' : (it.tipo === 'estampados' ? 'Estampados' : 'Industrial'));
            return sectorKey === 'Industrial' ? rubro === 'Industrial' : rubro !== 'Industrial';
        }));
        if (ots.length === 0) return 0;
        let sum = 0;
        ots.forEach(p => {
            const start = new Date(p.fecha.split('/').reverse().join('-'));
            const end = new Date(p.fecha_entrega);
            sum += Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
        });
        return (sum / ots.length).toFixed(1);
    }

    const promGrafica = calcularPromedioSector('Grafica');
    const promIndustrial = calcularPromedioSector('Industrial');

    const elMetricGrafica = document.getElementById('metricEficienciaGrafica');
    const elBadgeGrafica = document.getElementById('badgeEficienciaGrafica');
    if (elMetricGrafica) elMetricGrafica.innerText = `${promGrafica}d`;
    if (elBadgeGrafica) {
        if (promGrafica == 0) { elBadgeGrafica.innerText = '--'; elBadgeGrafica.className = "text-[8px] font-black px-2 py-0.5 rounded bg-gray-100 text-gray-400"; }
        else if (promGrafica < 7) { elBadgeGrafica.innerText = 'OPTIMO'; elBadgeGrafica.className = "text-[8px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-600"; }
        else if (promGrafica <= 10) { elBadgeGrafica.innerText = 'NORMAL'; elBadgeGrafica.className = "text-[8px] font-black px-2 py-0.5 rounded bg-amber-100 text-amber-600"; }
        else { elBadgeGrafica.innerText = 'CRÍTICO'; elBadgeGrafica.className = "text-[8px] font-black px-2 py-0.5 rounded bg-red-100 text-red-600"; }
    }

    const elMetricInd = document.getElementById('metricEficienciaIndustrial');
    const elBadgeInd = document.getElementById('badgeEficienciaIndustrial');
    if (elMetricInd) elMetricInd.innerText = `${promIndustrial}d`;
    if (elBadgeInd) {
        if (promIndustrial == 0) { elBadgeInd.innerText = '--'; elBadgeInd.className = "text-[8px] font-black px-2 py-0.5 rounded bg-gray-100 text-gray-400"; }
        else if (promIndustrial < 30) { elBadgeInd.innerText = 'OPTIMO'; elBadgeInd.className = "text-[8px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-600"; }
        else if (promIndustrial <= 40) { elBadgeInd.innerText = 'NORMAL'; elBadgeInd.className = "text-[8px] font-black px-2 py-0.5 rounded bg-amber-100 text-amber-600"; }
        else { elBadgeInd.innerText = 'CRÍTICO'; elBadgeInd.className = "text-[8px] font-black px-2 py-0.5 rounded bg-red-100 text-red-600"; }
    }

    // --- 4. CUELLOS DE BOTELLA ---
    const estados = ['En Proceso', 'Impresión', 'En Taller', 'Terminaciones', 'Listo'];
    const conteoEstados = {};
    estados.forEach(e => conteoEstados[e] = 0);
    listaPresupuestos.filter(p => p.status === 'OT' && p.estado_ot !== 'Entregado').forEach(ot => {
        const est = ot.estado_ot || 'En Proceso';
        if (conteoEstados[est] !== undefined) conteoEstados[est]++;
    });

    const elCuellos = document.getElementById('repoCuellosBotella');
    if (elCuellos) {
        const maxOTs = Math.max(...Object.values(conteoEstados), 1);
        elCuellos.innerHTML = estados.map(e => `
                    <div class="space-y-2">
                        <div class="flex justify-between items-end text-[10px] font-black tracking-widest text-gray-400 uppercase">
                            <span>${e}</span>
                            <span class="dark:text-white">${conteoEstados[e]} OTs</span>
                        </div>
                        <div class="w-full h-3 bg-gray-100 dark:bg-darkBg rounded-full overflow-hidden">
                            <div class="h-full bg-orange-500 rounded-full transition-all duration-700" style="width: ${(conteoEstados[e] / maxOTs) * 100}%"></div>
                        </div>
                    </div>
                `).join('');
    }

    // --- 5. CRECIMIENTO ---
    const ultimoCierre = (window.HISTORICO_CIERRES && HISTORICO_CIERRES.length > 0) ? HISTORICO_CIERRES[HISTORICO_CIERRES.length - 1] : null;
    const ingresosAnterior = ultimoCierre ? ultimoCierre.ingresos : 0;
    let variacion = 0;
    if (ingresosAnterior > 0) variacion = (((ingresos / ingresosAnterior) - 1) * 100).toFixed(1);
    const elMetricVar = document.getElementById('metricVariacion');
    if (elMetricVar) {
        elMetricVar.innerText = `${variacion >= 0 ? '+' : ''}${variacion}%`;
        elMetricVar.className = `text-4xl font-black ${variacion >= 0 ? 'text-emerald-500' : 'text-red-500'} leading-none mb-2`;
    }

    // --- 6. RANKING MIX ---
    const counts = { 'Gráfica': 0, 'Corpóreos': 0, 'Estampados': 0, 'Industrial': 0 };
    otsMes.forEach(p => p.items.forEach(it => {
        const rubro = it.tipo === 'grafica' ? 'Gráfica' : (it.tipo === 'corporeos' ? 'Corpóreos' : (it.tipo === 'estampados' ? 'Estampados' : 'Industrial'));
        if (counts[rubro] !== undefined) counts[rubro]++;
    }));
    const ranking = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const totalPedidos = otsMes.length || 1;
    const contRanking = document.getElementById('repoRankingProductos');
    if (contRanking) {
        contRanking.innerHTML = ranking.map(([rubro, count], idx) => `
                    <div class="flex items-center gap-4">
                        <div class="w-8 h-8 rounded-full bg-gray-50 dark:bg-darkBg flex items-center justify-center text-xs font-black dark:text-gray-400">#${idx + 1}</div>
                        <div class="flex-1">
                            <div class="flex justify-between items-end mb-1">
                                <span class="text-[11px] font-black dark:text-white uppercase tracking-tight">${rubro}</span>
                                <span class="text-[10px] text-gray-400 font-bold">${count} OTs</span>
                            </div>
                            <div class="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                <div class="h-full bg-indigo-500" style="width: ${Math.min(100, (count / totalPedidos) * 100)}%"></div>
                            </div>
                        </div>
                    </div>
                `).join('');
    }

    // --- 7. ESTRUCTURA DE GASTOS ---
    const gastosPorCategoria = {};
    movimientosMes.filter(m => m.tipo === 'Egreso').forEach(m => {
        const cat = m.categoria || 'Varios';
        gastosPorCategoria[cat] = (gastosPorCategoria[cat] || 0) + m.monto;
    });
    const contGastos = document.getElementById('repoDesgloseGastos');
    if (contGastos) {
        contGastos.innerHTML = Object.keys(gastosPorCategoria).length === 0 ? `<p class="text-gray-400 text-[11px] italic">Sin egresos.</p>` :
            Object.keys(gastosPorCategoria).map(cat => {
                const monto = gastosPorCategoria[cat];
                const porc = ((monto / (egresos || 1)) * 100).toFixed(1);
                return `
                            <div class="space-y-2">
                                <div class="flex justify-between items-end text-[11px] font-bold">
                                    <span class="text-gray-400 uppercase tracking-tight">${cat}</span>
                                    <span class="dark:text-white">$${Math.round(monto).toLocaleString('es-AR')}</span>
                                </div>
                                <div class="w-full h-2 bg-gray-100 dark:bg-darkBg rounded-full overflow-hidden">
                                    <div class="h-full bg-red-500 rounded-full" style="width: ${porc}%"></div>
                                </div>
                            </div>
                        `;
            }).join('');
    }

    // --- 8. RESUMEN DE CAJAS ---
    const sortedCajas = [...LISTA_CAJAS].sort((a, b) => b.saldo - a.saldo);
    const cajaMasSaldo = sortedCajas.length > 0 ? sortedCajas[0] : null;
    const elMasSaldo = document.getElementById('metricCajaMasSaldo');
    if (elMasSaldo) {
        elMasSaldo.innerText = cajaMasSaldo ? `${cajaMasSaldo.nombre} ($${Math.round(cajaMasSaldo.saldo).toLocaleString('es-AR')})` : 'Sin datos';
    }

    const actividadCajas = {};
    LISTA_CAJAS.forEach(c => actividadCajas[c.nombre] = 0);
    movimientosMes.forEach(m => { if (actividadCajas[m.caja] !== undefined) actividadCajas[m.caja]++; });

    const entriesActividad = Object.entries(actividadCajas).sort((a, b) => b[1] - a[1]);
    const cajaMasActivaName = entriesActividad.length > 0 ? entriesActividad[0][0] : null;
    const elMasActiva = document.getElementById('metricCajaMasActiva');
    if (elMasActiva) {
        elMasActiva.innerText = cajaMasActivaName ? `${cajaMasActivaName} (${actividadCajas[cajaMasActivaName]} mov.)` : 'Sin datos';
    }

    // 9. HISTORIAL CIERRES
    const contenedorHistorial = document.getElementById('contenedorHistorialCierres');
    if (contenedorHistorial) {
        if (HISTORICO_CIERRES.length === 0) {
            contenedorHistorial.innerHTML = `<p class="text-gray-400 font-medium italic text-xs text-center">No hay registros aún.</p>`;
        } else {
            contenedorHistorial.innerHTML = HISTORICO_CIERRES.slice().reverse().map(c => `
                        <div class="bg-gray-50/50 dark:bg-darkBg p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div>
                                <p class="text-[10px] font-black text-gecko uppercase mb-0.5">${c.periodo}</p>
                                <p class="text-xs font-black dark:text-white">Bal: <span class="${c.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}">$${Math.round(c.balance).toLocaleString('es-AR')}</span></p>
                            </div>
                            <svg class="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                        </div>
                    `).join('');
        }
    }
}

function ejecutarCierreMensual() {
    if (!confirm("¿Estás seguro de cerrar el mes? Se reiniciarán los gastos fijos a 'Pendiente' y se archivará el balance actual.")) return;

    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    const movimientosMes = LISTA_MOVIMIENTOS.filter(m => {
        const [d, mo, y] = m.fecha.split('/');
        return (parseInt(mo) - 1) === mesActual && parseInt(y) === anioActual;
    });

    const ingresos = movimientosMes.filter(m => m.tipo === 'Ingreso').reduce((acc, curr) => acc + curr.monto, 0);
    const egresos = movimientosMes.filter(m => m.tipo === 'Egreso').reduce((acc, curr) => acc + curr.monto, 0);
    const balance = ingresos - egresos;

    // 1. Guardar en Histórico
    const cierre = {
        periodo: `${meses[mesActual]} ${anioActual}`,
        ingresos: ingresos,
        gastos: egresos,
        balance: balance,
        fecha_cierre: ahora.toLocaleDateString('es-AR')
    };

    HISTORICO_CIERRES.push(cierre);
    localStorage.setItem('gecko_historico_cierres', JSON.stringify(HISTORICO_CIERRES));

    // 2. Reiniciar Gastos Fijos
    LISTA_GASTOS_FIJOS.forEach(g => {
        g.estado = 'Pendiente';
    });
    localStorage.setItem('gecko_gastos_fijos', JSON.stringify(LISTA_GASTOS_FIJOS));

    // 3. Notificar y refrescar
    renderReportesDashboard();
    if (typeof renderGastosFijos === 'function') renderGastosFijos();
    mostrarExito(`Cierre de ${meses[mesActual]} procesado. Todos los gastos fijos volvieron a 'Pendiente'.`, "¡Mes Cerrado!");
}

function abrirModalCierreMensual() {
    // Depreciada por Dashboard integrado
    renderReportesDashboard();
}

function guardarNuevaCaja() {
    const nombre = document.getElementById('nombreNuevaCaja').value.trim();
    const iconoSeleccionado = document.getElementById('iconoNuevaCaja').value;
    const saldo = parseFloat(document.getElementById('saldoInicialCaja').value) || 0;

    if (!nombre) return alert("Por favor, ingresa un nombre para la caja.");

    // Creamos el objeto de la nueva caja con el ID único y el icono del selector
    const nueva = {
        id: 'caja_' + Date.now(),
        nombre: nombre,
        saldo: saldo,
        icono: iconoSeleccionado
    };

    // Agregamos a la lista y guardamos en la memoria del navegador
    LISTA_CAJAS.push(nueva);
    localStorage.setItem('gecko_cajas', JSON.stringify(LISTA_CAJAS));

    // Si empezamos con plata, registramos el movimiento inicial
    if (saldo !== 0) {
        registrarMovimiento("Saldo inicial de caja", nombre, Math.abs(saldo), saldo > 0 ? 'Ingreso' : 'Egreso', 'Sistema');
    }

    // Cerramos el modal y refrescamos la vista
    document.getElementById('modalNuevaCaja').style.display = 'none';
    renderizarFinanzas();
    mostrarExito(`Caja "${nombre}" creada correctamente.`, "HECHO");
}

function togglePagoCombinado(contexto) {
    const metodo = (contexto === 'sena') ? document.getElementById('inputMetodoPago').value : document.getElementById('pagoFinalMetodo').value;
    const wrapper = (contexto === 'sena') ? document.getElementById('wrapperPagoCombinadoSena') : document.getElementById('wrapperPagoCombinadoFinal');
    const cajaSels = (contexto === 'sena') ? document.getElementById('cajaDestinoSenaWrapper') : document.getElementById('cajaDestinoFinalWrapper');
    const listaCajas = (contexto === 'sena') ? document.getElementById('listaCajasSena') : document.getElementById('listaCajasFinal');

    if (metodo === 'Pago Combinado') {
        wrapper.classList.remove('hidden');
        cajaSels.classList.add('hidden');

        listaCajas.innerHTML = LISTA_CAJAS.map(c => `
                <div>
                        <label class="block text-[9px] font-bold text-gray-400 uppercase mb-1">${c.nombre}</label>
                        <input type="number" data-caja="${c.nombre}" class="input-combinado-${contexto} w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-darkBg text-xs font-bold dark:text-white" placeholder="0">
                    </div>
            `).join('');
    } else {
        wrapper.classList.add('hidden');
        cajaSels.classList.remove('hidden');
    }
}

function abrirPagoFinal(idx) {
    confirmandoIndexSena = idx;
    const p = listaPresupuestos[idx];
    const saldo = p.total - (p.sena || 0);
    if (saldo <= 0) return;

    document.getElementById('pagoFinalSaldo').innerText = '$' + Math.round(saldo).toLocaleString('es-AR');
    document.getElementById('modalPagoFinal').style.display = 'flex';
}

function liquidarSaldoTotal() {
    if (confirmandoIndexSena === -1) return;
    const metodo = document.getElementById('pagoFinalMetodo').value;
    const p = listaPresupuestos[confirmandoIndexSena];
    const saldo = p.total - (p.sena || 0);

    // Lógica de Finanzas
    const detalle = `Cobro Final OT#${p.id} - ${p.cliente} `;
    if (metodo === 'Pago Combinado') {
        const inputs = document.querySelectorAll('.input-combinado-final');
        inputs.forEach(inp => {
            const m = parseFloat(inp.value) || 0;
            if (m > 0) {
                registrarMovimiento(detalle, inp.dataset.caja, m, 'Ingreso');
            }
        });
    } else {
        const cajaNombre = document.getElementById('pagoFinalCaja').value;
        if (saldo > 0) {
            registrarMovimiento(detalle, cajaNombre, saldo, 'Ingreso');
        }
    }

    p.sena = p.total;
    p.metodo_pago = (metodo === 'Pago Combinado') ? 'Varios (Combinado)' : metodo;

    localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(listaPresupuestos));
    renderOts();
    document.getElementById('modalPagoFinal').style.display = 'none';
    alert(`Saldo de $${Math.round(saldo).toLocaleString('es-AR')} liquidado con éxito.`);
}

let clienteActualFicha = null;

function abrirFichaCliente(nombre) {
    clienteActualFicha = nombre;
    const modal = document.getElementById('modalFichaCliente');
    document.getElementById('fichaClienteNombre').innerText = nombre;

    const trabajos = listaPresupuestos.filter(p => p.cliente === nombre && p.status === 'OT');
    const activos = trabajos.filter(p => p.estado_ot !== 'Entregado');
    const historial = trabajos.filter(p => p.estado_ot === 'Entregado');

    const saldoTotal = activos.reduce((acc, p) => acc + (p.total - (p.sena || 0)), 0);
    const totalFacturado = activos.reduce((acc, p) => acc + Math.round(p.total), 0);
    const totalPagado = activos.reduce((acc, p) => acc + Math.round(p.sena || 0), 0);

    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();
    const totalMes = trabajos.filter(p => {
        if (!p.fecha) return false;
        const parts = p.fecha.split('/');
        if (parts.length < 3) return false;
        return (parseInt(parts[1]) - 1) === mesActual && parseInt(parts[2]) === anioActual;
    }).reduce((acc, p) => acc + Math.round(p.total), 0);

    let bgClass = "bg-gray-50 dark:bg-darkBg";
    let borderClass = "border-gray-100 dark:border-gray-800";
    let textClass = "text-gray-500";

    if (totalMes > 500000) {
        // Oro #FFD700
        bgClass = "bg-[#FFD700]/10";
        borderClass = "border-[#FFD700]/50";
        textClass = "text-[#FFD700]";
    } else if (totalMes >= 200000) {
        // Plata #C0C0C0
        bgClass = "bg-[#C0C0C0]/10";
        borderClass = "border-[#C0C0C0]/50";
        textClass = "text-[#C0C0C0]";
    } else {
        // Bronce #CD7F32
        bgClass = "bg-[#CD7F32]/10";
        borderClass = "border-[#CD7F32]/50";
        textClass = "text-[#CD7F32]";
    }

    const cardMes = document.getElementById('cardFacturacionMes');
    if (cardMes) cardMes.className = `px-5 py-3 rounded-2xl border-2 text-right transition-colors ${bgClass} ${borderClass} min-w-[120px]`;
    const lblMes = document.getElementById('labelFacturacionMes');
    if (lblMes) lblMes.className = `text-[9px] font-black uppercase tracking-widest mb-0.5 ${textClass}`;

    const elSaldo = document.getElementById('fichaClienteSaldo');
    const elContainer = document.getElementById('fichaClientSaldoContainer');
    elSaldo.innerText = `$${Math.round(saldoTotal).toLocaleString('es-AR')}`;
    document.getElementById('fichaClienteFacturado').innerText = `$${Math.round(totalFacturado).toLocaleString('es-AR')}`;
    const fcm = document.getElementById('fichaClienteFacturadoMes');
    if (fcm) fcm.innerText = `$${totalMes.toLocaleString('es-AR')}`;
    document.getElementById('fichaClientePagado').innerText = `$${totalPagado.toLocaleString('es-AR')}`;

    const elMsg = document.getElementById('fichaMsgEstado');
    if (saldoTotal <= 0) {
        elContainer.className = "px-6 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 text-right text-emerald-500";
        elMsg.className = "p-8 rounded-[32px] border border-emerald-100 dark:border-emerald-900/10 bg-emerald-50/30 dark:bg-emerald-900/5 text-emerald-600 text-center flex flex-col items-center justify-center gap-4";
        elMsg.innerHTML = `
                    <div class="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                    </div>
                    <div>
                        <p class="text-[14px] font-black uppercase tracking-widest">Cliente al día</p>
                        <p class="text-[10px] font-bold text-gray-400 mt-1">No posee deudas pendientes en el sistema.</p>
                    </div>
                `;
    } else {
        elContainer.className = "px-6 py-3 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-right text-red-500";
        elMsg.className = "p-8 rounded-[32px] border border-red-100 dark:border-red-900/10 bg-red-50/30 dark:bg-red-900/5 text-red-600 text-center flex flex-col items-center justify-center gap-4";
        elMsg.innerHTML = `
                    <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-500 shadow-inner">
                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </div>
                    <div>
                        <p class="text-[14px] font-black uppercase tracking-widest">Deuda Registrada</p>
                        <p class="text-[10px] font-bold text-gray-400 mt-1">El cliente posee un saldo de $${saldoTotal.toLocaleString('es-AR')}</p>
                    </div>
                `;
    }

    const tbodyActivos = document.getElementById('tbodyFichaActivos');
    tbodyActivos.innerHTML = activos.map(p => `
                <tr class="hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors border-b border-gray-50 dark:border-gray-800">
                    <td class="py-4 px-6 text-[11px] font-black uppercase">
                        <p class="dark:text-white leading-tight">#${p.id}</p>
                        <p class="text-[9px] text-gray-400">${p.fecha}</p>
                    </td>
                    <td class="py-4 px-6 text-[10px] font-medium text-gray-600 dark:text-gray-400">
                        ${p.items.map(it => it.textoOpciones).join(', ')}
                    </td>
                    <td class="py-4 px-6 text-right font-black text-red-500 text-[12px]">
                        $${(p.total - (p.sena || 0)).toLocaleString('es-AR')}
                    </td>
                    <td class="py-4 px-6 text-center">
                        <span class="px-2 py-1 rounded bg-gray-100 dark:bg-darkBg text-gray-500 text-[9px] font-black uppercase">${p.estado_ot}</span>
                    </td>
                </tr>
            `).join('');

    document.getElementById('countFichaActivos').innerText = activos.length;

    const tbodyHistorial = document.getElementById('tbodyFichaHistorial');
    tbodyHistorial.innerHTML = historial.length === 0 ? '<tr><td colspan="4" class="py-8 text-center text-gray-400 italic">No hay historial</td></tr>' :
        historial.map(p => `
                <tr class="border-b border-gray-50 dark:border-gray-800">
                    <td class="py-3 px-6 text-gray-400 font-bold">#${p.id}</td>
                    <td class="py-3 px-6 text-gray-500 font-medium">${p.fecha} - ${p.items[0].textoOpciones}</td>
                    <td class="py-3 px-6 text-right font-black text-emerald-500">$${p.total.toLocaleString('es-AR')}</td>
                    <td class="py-3 px-6 text-center"><span class="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">Completado</span></td>
                </tr>
            `).join('');

    modal.style.display = 'flex';
}

function abrirModalPagoGlobal() {
    document.getElementById('modalPagoGlobal').style.display = 'flex';
    document.getElementById('inputMontoPagoGlobal').value = '';
    const select = document.getElementById('selectCajaPagoGlobal');
    select.innerHTML = LISTA_CAJAS.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('');
}

function confirmarPagoGlobalCliente() {
    const montoOriginal = parseFloat(document.getElementById('inputMontoPagoGlobal').value) || 0;
    const cajaNombre = document.getElementById('selectCajaPagoGlobal').value;
    if (montoOriginal <= 0) return alert("Ingresa un monto válido.");

    let montoRestante = montoOriginal;
    const pends = listaPresupuestos.filter(p => p.cliente === clienteActualFicha && p.status === 'OT' && (p.total - (p.sena || 0)) > 0)
        .sort((a, b) => {
            const fa = a.fecha.split('/').reverse().join('-');
            const fb = b.fecha.split('/').reverse().join('-');
            return fa.localeCompare(fb);
        });

    if (pends.length === 0) return alert("Este cliente no tiene deudas pendientes.");

    pends.forEach(p => {
        if (montoRestante <= 0) return;
        const saldo = p.total - (p.sena || 0);
        const pago = Math.min(saldo, montoRestante);
        p.sena = (p.sena || 0) + pago;
        montoRestante -= pago;
    });

    registrarMovimiento(`Pago Cta. Cte. - ${clienteActualFicha}`, cajaNombre, montoOriginal, 'Ingreso', 'Cobro Cliente');
    localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(listaPresupuestos));

    document.getElementById('modalPagoGlobal').style.display = 'none';
    abrirFichaCliente(clienteActualFicha);
    renderOts();

    mostrarExito(`Se aplicaron $${montoOriginal.toLocaleString('es-AR')} a la deuda de ${clienteActualFicha}.`, "¡Cobro Exitoso!");
}

function borrarOt(idx) {
    if (confirm("¿Estás seguro de eliminar permanentemente esta Orden de Trabajo? Esta acción no se puede deshacer.")) {
        listaPresupuestos.splice(idx, 1);
        localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(listaPresupuestos));
        renderOts();
        renderPresupuestos();
    }
}

function cambiarEstadoOt(globalIdx) {
    const p = listaPresupuestos[globalIdx];
    const estados = ['En Proceso', 'En Taller', 'Impresión', 'Terminaciones', 'Listo', 'Entregado'];
    let currentIdx = estados.indexOf(p.estado_ot || 'En Proceso');
    if (currentIdx === -1) currentIdx = 0;

    let nextIdx = (currentIdx + 1) % estados.length;
    const proxEstado = estados[nextIdx];

    if (proxEstado === 'Entregado') {
        if (!confirm("¿Confirmas la entrega del trabajo? Se archivará en el historial.")) return;
    }

    p.estado_ot = proxEstado;
    localStorage.setItem('gecko_listaPresupuestos', JSON.stringify(listaPresupuestos));
    renderOts();
}

// ─── Lógica de Clientes ───
window.abrirModalNuevoCliente = function () {
    openModal('modalNuevoCliente');
    document.getElementById('nuevoClienteNombre').value = '';
    document.getElementById('nuevoClienteCuit').value = '';
    // reset del containerTels lo hace gecko-fixes.js
    document.getElementById('nuevoClienteEmail').value = '';
    document.getElementById('nuevoClienteDir').value = '';
    document.getElementById('nuevoClienteLoc').value = '';
    document.getElementById('nuevoClienteRubro').value = '';
}

function guardarCliente() {
    const nombre = document.getElementById('nuevoClienteNombre').value.trim();
    if (!nombre) {
        alert("El Nombre / Razón Social es obligatorio");
        return;
    }

    const nuevoCliente = {
        id: 'client_' + Date.now(),
        nombre: nombre,
        cuit: document.getElementById('nuevoClienteCuit').value,
        tel: (Array.from(document.querySelectorAll('.tel-num-input'))[0]?.value || ''),
        telefonos: Array.from(document.querySelectorAll('.tel-num-input')).map((i, idx) => {
            const num = i.value.trim();
            const label = i.parentElement?.querySelector('.tel-label-input')?.value?.trim() || '';
            return num ? { numero: num, etiqueta: label } : null;
        }).filter(v => v),
        email: document.getElementById('nuevoClienteEmail').value,
        dir: document.getElementById('nuevoClienteDir').value,
        loc: document.getElementById('nuevoClienteLoc').value,
        rubro: document.getElementById('nuevoClienteRubro').value,
    };

    bdClientes.push(nuevoCliente);
    localStorage.setItem('clientes', JSON.stringify(bdClientes));

    document.getElementById('modalNuevoCliente').style.display = 'none';
    mostrarExito("El cliente " + nombre + " ha sido registrado.", "¡Cliente Guardado!");

    renderClientes();
    actualizarSugerenciaClientes();
}

function renderClientes() {
    const tbody = document.getElementById('tbodyClientes');
    if (!tbody) return;

    const filtroRaw = document.getElementById('filtroClienteBusqueda');
    const filtro = filtroRaw ? filtroRaw.value.toLowerCase() : '';

    let clientesFiltrados = bdClientes.filter(c =>
        c.nombre.toLowerCase().includes(filtro) ||
        (c.cuit && c.cuit.includes(filtro)) ||
        (c.rubro && c.rubro.toLowerCase().includes(filtro))
    );

    tbody.innerHTML = clientesFiltrados.length === 0 ? `<tr><td colspan="4" class="py-10 text-center text-gray-400 font-medium italic">No se encontraron clientes.</td></tr>` : '';

    clientesFiltrados.forEach(c => {
        const trabajos = listaPresupuestos.filter(p => p.cliente === c.nombre && p.status === 'OT');
        const saldoTotal = trabajos.filter(p => p.estado_ot !== 'Entregado').reduce((acc, p) => acc + (p.total - (p.sena || 0)), 0);

        const waLink = c.tel ? `<a href="https://wa.me/${c.tel.replace(/\\D/g, '')}" target="_blank" class="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-colors" title="WhatsApp"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg></a>` : '';
        const mailLink = c.email ? `<a href="mailto:${c.email}" class="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-colors" title="Email"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></a>` : '';

        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50/50 dark:hover:bg-gray-800/40 transition-colors group";
        tr.innerHTML = `
                    <td class="py-4 px-6">
                        <div class="flex items-center">
                            <p class="font-extrabold dark:text-white tracking-tight text-[14px]">${c.nombre}</p>
                            ${obtenerBadgeScoring(c.nombre)}
                        </div>
                        <div class="flex gap-2 text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-widest">
                            <span>${c.cuit || 'Sin CUIT'}</span>
                            ${c.rubro ? `<span class="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-darkBg">${c.rubro}</span>` : ''}
                        </div>
                    </td>
                    <td class="py-4 px-6 text-center hidden md:table-cell">
                        <div class="flex items-center justify-center gap-2">
                            ${waLink}
                            ${mailLink}
                        </div>
                    </td>
                    <td class="py-4 px-6 text-right">
                        <span class="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider ${saldoTotal > 0 ? 'bg-red-50 dark:bg-red-900/10 text-red-500 border border-red-100 dark:border-red-900/20' : 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-500 border border-emerald-100 dark:border-emerald-900/20'}">
                            $${saldoTotal.toLocaleString('es-AR')}
                        </span>
                    </td>
                    <td class="py-4 px-6 text-right">
                        <button onclick="abrirFichaCliente('${c.nombre.replace(/'/g, "\\\\'")}')" class="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-darkBg text-gray-700 dark:text-gray-300 font-bold hover:bg-gecko hover:text-white transition-all text-[11px] uppercase tracking-widest inline-flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                            </svg>
                            Ver Ficha / CC
                        </button>
                    </td>
                `;
        tbody.appendChild(tr);
    });
}

function actualizarSugerenciaClientes() {
    const list = document.getElementById('listaSugerenciasClientes');
    if (list) {
        const arrayClientes = JSON.parse(localStorage.getItem('clientes')) || [];
        // Se muestran los primeros 20. El evento 'input' hará el resto.
        list.innerHTML = arrayClientes.slice(0, 20).map(c => `<option value="${c.nombre}"></option>`).join('');
    }
}

window.switchMenu = function (view) {
    // 1. Ocultar todas las secciones (Agregamos viewMateriales y viewCotizadores)
    const views = ['viewDashboard', 'viewPedidos', 'viewFinanzas', 'viewClientes', 'viewMateriales', 'viewCotizadores', 'viewPresupuestoManual', 'viewConfiguracion'];
    views.forEach(v => {
        const el = document.getElementById(v);
        if (el) { el.classList.add('hidden'); el.style.display = ''; }
    });

    // 2. Mostrar la sección elegida
    let targetId = 'view' + view.charAt(0).toUpperCase() + view.slice(1);
    if (view === 'materiales') targetId = 'viewMateriales';
    if (view === 'cotizadores') targetId = 'viewCotizadores';

    const targetView = document.getElementById(targetId);
    if (targetView) {
        targetView.classList.remove('hidden');
        // Para views con flex-col necesitamos restablecer display:flex explícitamente
        if (targetView.classList.contains('flex-col') || targetView.classList.contains('flex-1')) {
            targetView.style.display = 'flex';
        }
    }

    // 3. Estilo de Navegación (Usando .nav-active para mejor control)
    const navLinks = ['nav-dashboard', 'nav-pedidos', 'nav-finanzas', 'nav-clientes', 'nav-materiales', 'nav-cotizadores', 'side-3d', 'nav-configuracion'];
    navLinks.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('nav-active');
    });

    const activeLink = document.getElementById('nav-' + view);
    if (activeLink) activeLink.classList.add('nav-active');

    // 4. Header Info (Agregamos el título de Materiales)
    const hTitle = document.getElementById('headerTitle');
    const hSub = document.getElementById('headerSubtitle');

    if (view === 'dashboard') {
        hTitle.innerText = "Hola, Renzo 👋";
        hSub.innerText = "Aquí está el resumen de producción para hoy.";
        hSub.style.display = 'block';
    } else if (view === 'pedidos') {
        hTitle.innerText = "Gestión de Pedidos";
        hSub.innerText = "Panel centralizado de presupuestos y órdenes de trabajo.";
        hSub.style.display = 'block';
    } else if (view === 'finanzas') {
        hTitle.innerHTML = `<span class="font-bold">Finanzas y Cajas</span>`;
        hSub.innerText = 'Gestión de flujo de caja, control de ingresos y reportes operativos';
        hSub.style.display = 'block';
        if (typeof renderizarFinanzas === 'function') renderizarFinanzas();
    } else if (view === 'clientes') {
        hTitle.innerText = "Directorio de Clientes";
        hSub.innerText = "Gestión integral de contactos y cuentas corrientes.";
        hSub.style.display = 'block';
        if (typeof renderClientes === 'function') renderClientes();
    } else if (view === 'materiales') {
        hTitle.innerText = "Inventario de Materiales";
        hSub.innerText = "Control de stock de insumos y productos terminados.";
        hSub.style.display = 'block';
        if (typeof renderInsumos === 'function') renderInsumos();
    } else if (view === 'cotizadores') {
        hTitle.innerText = "Terminal de Cotización";
        hSub.innerText = "Cotizá, armá presupuestos y generá OTs en segundos.";
        hSub.style.display = 'block';
        // Evitar race condition: si ya hay un botón activo, no forzar el guardado
        setTimeout(() => {
            if (!document.querySelector('.btn-cat-active')) {
                const savedCat = localStorage.getItem('gecko_activeCategory') || 'grafica';
                cambiarCategoriaCotizador(savedCat);
            }
        }, 10);
    } else if (view === 'presupuestoManual') {
        hTitle.innerText = "Presupuesto Manual";
        hSub.innerText = "Creá un presupuesto personalizado para tu cliente.";
        hSub.style.display = 'block';
    } else if (view === 'configuracion') {
        hTitle.innerText = "Configuración";
        hSub.innerText = "Panel de control del sistema Gecko.";
        hSub.style.display = 'block';
        setTimeout(() => window.initConfiguracion(), 50);
    }
    // ─── Persistencia de Pestaña: guardar en hash y localStorage ───
    window.location.hash = view;
    localStorage.setItem('gecko_activeTab', view);
}


function cerrarExito() {
    document.getElementById('successVista').classList.add('hidden');
    document.getElementById('successVista').classList.remove('flex');
    if (document.getElementById('formNuevoPedido')) document.getElementById('formNuevoPedido').reset();
    presupuesto = [];
    editandoIndex = -1;
    renderizarPresupuesto();
    closeModal();
}

function nuevaVenta() {
    presupuesto = [];
    clienteGlobalActual = null;
    renderizarPresupuesto();
}
// Función Global de Éxito REDISEÑADA
window.mostrarExito = function (mensaje, titulo = "HECHO") {
    const overlay = document.createElement('div');
    overlay.className = 'success-overlay';
    overlay.innerHTML = `
        <div class="check-animado">✓</div>
        <h2 class="text-white text-3xl font-black italic uppercase tracking-tighter">${titulo}</h2>
        <p class="text-zinc-400 font-bold uppercase tracking-widest mt-2">${mensaje}</p>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.5s';
        setTimeout(() => overlay.remove(), 500);
    }, 1500);
};

// ─── LÓGICA DE MATERIALES GECKO ───
let geckoServicios = JSON.parse(localStorage.getItem('geckoServicios')) || [];
window.geckoServicios = geckoServicios;

function switchTabMateriales(tab) {
    const btnInsumos = document.getElementById('tabMat-insumos');
    const btnServicios = document.getElementById('tabMat-servicios');
    const contentInsumos = document.getElementById('contentMat-insumos');
    const contentServicios = document.getElementById('contentMat-servicios');

    if (tab === 'insumos') {
        btnInsumos.classList.add('text-gecko', 'border-gecko');
        btnInsumos.classList.remove('text-gray-400', 'border-transparent');
        btnServicios.classList.add('text-gray-400', 'border-transparent');
        btnServicios.classList.remove('text-gecko', 'border-gecko');
        contentInsumos.classList.remove('hidden');
        contentServicios.classList.add('hidden');
        renderInsumos();
    } else {
        btnServicios.classList.add('text-gecko', 'border-gecko');
        btnServicios.classList.remove('text-gray-400', 'border-transparent');
        btnInsumos.classList.add('text-gray-400', 'border-transparent');
        btnInsumos.classList.remove('text-gecko', 'border-gecko');
        contentServicios.classList.remove('hidden');
        contentInsumos.classList.add('hidden');
        renderServicios();
    }
}

function abrirModalTerminacion(id = null) {
    const form = document.getElementById('formTerminacion');
    form.reset();
    delete form.dataset.editId;

    if (id) {
        const term = (window.geckoServicios || []).find(t => t.id === id);
        if (term) {
            document.getElementById('termNom').value = term.nombre;
            document.getElementById('termCat').value = term.categoria || 'mano_obra';
            document.getElementById('termCosto').value = term.costo || 0;
            document.getElementById('termUni').value = term.unidad;
            document.getElementById('termPrecio').value = term.precio;
            form.dataset.editId = id;
            document.querySelector('#modalTerminacion h3').innerText = "Editar Servicio";
        }
    } else {
        document.querySelector('#modalTerminacion h3').innerText = "Nuevo Servicio";
    }
    openModal('modalTerminacion');
}

const formTerminacion = document.getElementById('formTerminacion');
if (formTerminacion) {
    formTerminacion.addEventListener('submit', function (e) {
        e.preventDefault();
        try {
            const editId = this.dataset.editId;
            const nuevaTerm = {
                id: editId ? parseInt(editId) : Date.now(),
                nombre: document.getElementById('termNom').value,
                categoria: document.getElementById('termCat').value,
                costo: parseFloat(document.getElementById('termCosto').value) || 0,
                unidad: document.getElementById('termUni').value,
                precio: parseFloat(document.getElementById('termPrecio').value) || 0
            };

            // 1. Sincronizar Array Global
            let localServicios = JSON.parse(localStorage.getItem('geckoServicios')) || [];

            if (editId) {
                const idx = localServicios.findIndex(t => t.id === parseInt(editId));
                if (idx !== -1) localServicios[idx] = nuevaTerm;
            } else {
                localServicios.push(nuevaTerm);
            }

            // 2. Persistencia Total
            window.geckoServicios = localServicios;
            localStorage.setItem('geckoServicios', JSON.stringify(localServicios));

            // 3. UI Feedback
            closeModal('modalTerminacion');
            if (typeof window.mostrarExito === 'function') {
                window.mostrarExito("Servicio guardado correctamente", "Sincronización OK");
            }

            // 4. Re-renderizar lista forzando "TODOS" (Tarea 3)
            filtrarServicios('TODOS');
            this.reset();

            console.log("🦎 GECKO: Servicio sincronizado:", nuevaTerm);
        } catch (error) {
            console.error("❌ GECKO Error al guardar servicio:", error);
        }
    });
}


window.filtroServiciosActual = 'TODOS';

/**
 * Tarea 1: El Mapeador Universal (Slugify)
 * Compara dos categorías ignorando mayúsculas, espacios, acentos y plurales.
 */
function compararCategorias(itemCat, filtroCat) {
    if (!itemCat || !filtroCat) return false;
    const slugify = (t) => {
        return String(t)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
            .replace(/\s+/g, '')            // Quitar espacios
            .replace(/s$/, '');             // Quitar 's' final (singularizar)
    };
    const iSlug = slugify(itemCat);
    const fSlug = slugify(filtroCat);
    return iSlug === fSlug || iSlug.includes(fSlug) || fSlug.includes(iSlug);
}

function filtrarServicios(categoriaSolicitada, btn = null) {
    window.filtroServiciosActual = (categoriaSolicitada || 'TODOS').toUpperCase().trim();

    // UI: Actualizar estado de botones
    const container = document.querySelector('#contentMat-servicios .flex.gap-3');
    if (container) {
        container.querySelectorAll('button').forEach(b => {
            b.classList.remove('bg-gecko', 'text-white', 'shadow-lg', 'shadow-orange-500/20');
            b.classList.add('bg-gray-100', 'dark:bg-white/5', 'text-zinc-700', 'dark:text-zinc-400');
        });
    }

    if (btn) {
        btn.classList.add('bg-gecko', 'text-white', 'shadow-lg', 'shadow-orange-500/20');
        btn.classList.remove('bg-gray-100', 'dark:bg-white/5', 'text-zinc-700', 'dark:text-zinc-400');
    } else if (container) {
        // Si no hay botón (reseteo forzado), iluminar "TODOS"
        const btnTodos = Array.from(container.querySelectorAll('button')).find(b => b.innerText.toUpperCase().includes('TODOS'));
        if (btnTodos) {
            btnTodos.classList.add('bg-gecko', 'text-white', 'shadow-lg', 'shadow-orange-500/20');
            btnTodos.classList.remove('bg-gray-100', 'dark:bg-white/5', 'text-zinc-700', 'dark:text-zinc-400');
        }
    }

    renderServicios();
}

function renderServicios() {
    const normalizar = (t) => String(t || '').toUpperCase().trim();
    const query = document.getElementById('busquedaServicios')?.value.toUpperCase().trim() || '';

    // Forzar re-lectura del estado global para máxima reactividad
    const dataAConsultar = window.geckoServicios || geckoServicios || [];

    const filtrados = dataAConsultar.filter(t => {
        const catData = t.categoria || 'mano_obra';
        const catFiltro = window.filtroServiciosActual;

        // Tarea 1: Uso del Comparador Universal
        const matchesFiltro = catFiltro === 'TODOS' || compararCategorias(catData, catFiltro);
        const matchesQuery = normalizar(t.nombre).includes(query) || normalizar(catData).includes(query);

        return matchesFiltro && matchesQuery;
    });

    console.log('🔍 Renderizando servicios. Filtro:', window.filtroServiciosActual, 'Encontrados:', filtrados.length);
    const tbody = document.getElementById('tablaTerminacionesBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!filtrados || filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-10 text-center text-zinc-500 italic font-medium">No se encontraron servicios con esos criterios.</td></tr>`;
        return;
    }

    filtrados.forEach(t => {
        if (!t) return;
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-white/5 group";
        tr.innerHTML = `
                    <td class="p-5 font-black text-gray-900 dark:text-white uppercase text-sm">${t.nombre}</td>
                    <td class="p-5"><span class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-[9px] font-black text-gray-400 uppercase tracking-tighter">${(t.categoria || 'mano_obra').replace('_', ' ')}</span></td>
                    <td class="p-5"><span class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-tighter">${t.unidad}</span></td>
                    <td class="p-5 text-right font-mono font-bold text-zinc-500 text-sm">$${(t.costo || 0).toLocaleString('es-AR')}</td>
                    <td class="p-5 text-right font-mono font-bold text-gecko text-sm">$${Math.round(t.precio).toLocaleString('es-AR')}</td>
                    <td class="p-5 text-right flex justify-end gap-2">
                        <button onclick="abrirModalTerminacion(${t.id})" class="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-500 hover:bg-blue-500 hover:text-white transition-all">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" stroke-linecap="round" stroke-linejoin="round" /></svg>
                        </button>
                        <button onclick="eliminarTerminacion(${t.id})" class="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round" /></svg>
                        </button>
                    </td>
                `;
        tbody.appendChild(tr);
    });
    if (filtrados.length > 0 && typeof window.initSortableServicios === 'function') {
        window.initSortableServicios();
    }
}

function eliminarTerminacion(id) {
    if (confirm("¿Estás seguro de que deseas eliminar este servicio definitivamente?")) {
        const nuevosServicios = (window.geckoServicios || []).filter(t => t.id !== id);
        window.geckoServicios = nuevosServicios;
        localStorage.setItem('geckoServicios', JSON.stringify(nuevosServicios));
        renderServicios();
        if (typeof window.mostrarExito === 'function') {
            window.mostrarExito("Servicio eliminado correctamente");
        }
    }
}

// 1. Escuchar el envío del formulario → listener activo está al final del archivo (recalcula costoReal)

window.filtroMaterialesActual = 'todos';

function filtrarInsumos(cat, btn = null) {
    window.filtroMaterialesActual = cat;

    if (btn) {
        const container = btn.parentElement;
        container.querySelectorAll('button').forEach(b => {
            b.classList.remove('bg-gecko', 'text-white', 'shadow-lg', 'shadow-orange-500/20');
            b.classList.add('bg-gray-100', 'dark:bg-white/5', 'text-zinc-700', 'dark:text-zinc-400');
        });
        btn.classList.add('bg-gecko', 'text-white', 'shadow-lg', 'shadow-orange-500/20');
        btn.classList.remove('bg-gray-100', 'dark:bg-white/5', 'text-zinc-700', 'dark:text-zinc-400');
    }

    renderInsumos();
}

function renderInsumos() {
    const tbody = document.getElementById('tablaMaterialesBody');
    if (!tbody) return;
    syncConstantesFromDB();

    const query = document.getElementById('busquedaMateriales')?.value.toLowerCase().trim() || '';
    tbody.innerHTML = '';

    const filtrados = materiales.filter(m => {
        const catNormalizada = (m.categoria || '').toLowerCase().trim();
        const filtroNormalizado = window.filtroMaterialesActual.toLowerCase().trim();

        const matchesFiltro = filtroNormalizado === 'todos' ||
            catNormalizada === filtroNormalizado ||
            (filtroNormalizado === 'vinilos_lonas' && (catNormalizada === 'flexible' || catNormalizada === 'vinilos_lonas' || catNormalizada === 'flexibles (vinilos/lonas)')) ||
            (filtroNormalizado === 'chapas' && (catNormalizada === 'chapas / placas' || catNormalizada === 'chapas')) ||
            (filtroNormalizado === 'polifan' && m.nombre.toLowerCase().includes('polifan'));

        const matchesQuery = m.nombre.toLowerCase().includes(query) ||
            catNormalizada.includes(query) ||
            (m.subcategoria || '').toLowerCase().includes(query);

        return matchesFiltro && matchesQuery;
    });

    if (!filtrados || filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-10 text-center text-zinc-500 italic font-medium">No hay insumos que coincidan con la búsqueda</td></tr>`;
        return;
    }
    const iconos = {
        flexible: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>`,
        vinilos_lonas: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>`,
        rigido: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>`,
        polifan: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 7.125L12 3.375l9.75 3.75M2.25 10.5l9.75 3.75 9.75-3.75M2.25 13.875l9.75 3.75 9.75-3.75m-19.5 3.75l9.75 3.75 9.75-3.75" /></svg>`,
        electrico: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>`,
        metal: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
        chapas: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
        metal_madera: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
        '3d': `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>`,
        producto_gecko: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>`,
        terminado: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>`,
        servicio: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`,
        insumo: `<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>`
    };

    filtrados.forEach(m => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-white/5 group";

        const mActual = m.multiplicador || GECKO_SETTINGS.multiplicadorGlobal || 2.0;
        const mGremioActual = m.multGremio || 1.5;
        const costoBaseARS = Math.round(m.costo || m.costoReal || m.costoARS || (m.costoUSD * (GECKO_SETTINGS.cotizacionDolar || 1415)) || 0);
        const precioVenta = Math.round(costoBaseARS * mActual);
        const precioGremioVenta = Math.round(costoBaseARS * mGremioActual);

        const formatter = new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
        const costoFmt = formatter.format(costoBaseARS);
        const ventaFmt = formatter.format(precioVenta);
        const gremioFmt = formatter.format(precioGremioVenta);

        // Lógica de Etiquetas (Visual Tags)
        const sub = (m.subcategoria || '').toUpperCase();
        let tagClass = 'tag-default';

        if (sub.includes('IMPRE')) tagClass = 'tag-impresion';
        else if (sub.includes('CORTE')) tagClass = 'tag-corte';
        else if (sub.includes('LISO')) tagClass = 'tag-liso';
        else if (['PVC', 'PAI', 'ACRILICO', 'POLI'].some(word => sub.includes(word))) tagClass = 'tag-plastico';
        else if (['MDF', 'CORRUGADO'].some(word => sub.includes(word))) tagClass = 'tag-madera';
        else if (sub.includes('FILAMENTO')) tagClass = 'tag-3d';
        else if (['MODULO', 'FUENTE', 'CABLE'].some(word => sub.includes(word))) tagClass = 'tag-electric';

        tr.innerHTML = `
                    <td class="p-5">
                        <div class="flex items-center gap-3">
                            <span class="w-9 h-9 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm shrink-0">
                                ${(iconos[m.categoria] || iconos['insumo']).replace('w-6 h-6', 'w-5 h-5')}
                            </span>
                            <div>
                                <p class="font-black text-gray-900 dark:text-white leading-tight uppercase text-sm">${m.nombre}</p>
                                ${m.subcategoria ? `
                                    <span class="gecko-tag ${tagClass}">${m.subcategoria}</span>
                                ` : ''}
                                <p class="text-[9px] text-gray-400 font-bold uppercase tracking-widest">${m.unidadVenta === 'unidad' ? 'Por Unidad' : 'Por m²'}</p>
                            </div>
                        </div>
                    </td>
                    <td class="p-5">
                        <span class="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-tighter">${m.categoria.replace('_', ' ')}</span>
                    </td>
                    <td class="p-5 text-right font-mono font-bold">
                        <p class="text-gray-400 text-[10px]">${costoFmt}</p>
                        <p class="text-[9px] text-gray-400">U$D ${(m.costoUSD || 0).toFixed(2)}</p>
                    </td>
                    <td class="p-5 text-right font-mono font-bold">
                        <p class="text-gecko text-sm">${ventaFmt}</p>
                        <p class="text-[9px] text-gray-400">x${mActual}</p>
                    </td>
                    <td class="p-5 text-right font-mono font-bold">
                        <p class="text-indigo-400 text-sm">${gremioFmt}</p>
                        <p class="text-[9px] text-gray-400">Gremio x${mGremioActual}</p>
                    </td>
                    <td class="p-5 text-center">
                        <span class="font-mono text-gecko font-black text-lg">${m.stock || '0'}</span>
                        <p class="text-[8px] text-gray-400 uppercase font-bold">${m.unidad || 'u'}</p>
                    </td>
                    <td class="p-5 text-right">
                        <div class="flex items-center justify-end gap-2">
                            <button onclick="editarMaterial('${m.id}')" class="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-500 hover:bg-amber-500 hover:text-white transition-all">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button onclick="eliminarMaterial('${m.id}')" class="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-500 hover:text-white transition-all" title="Eliminar material">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    </td>
                `;
        tbody.appendChild(tr);
    });
    // Renderizar el panel de configuración de precios base
    window.initSortableMateriales();
}

// ─── Panel de Configuración de Constantes (dentro de Inventario) ───


function editarMaterial(id) {
    const material = materiales.find(m => String(m.id) === String(id));
    if (!material) return;

    document.getElementById('matNom').value = material.nombre;
    document.getElementById('matCat').value = material.categoria;
    document.getElementById('matSubCat').value = material.subcategoria || ''; // <-- NUEVO
    document.getElementById('matStock').value = material.stock;
    document.getElementById('matMult').value = material.multiplicador || 2.0;
    document.getElementById('matMultGremio').value = material.multGremio || 1.5;
    document.getElementById('matCostUSD').value = material.costoUSD || 0;
    document.getElementById('matCostARS').value = material.costoARS || 0;
    document.getElementById('matUnidad').value = material.unidad || 'unidad';
    document.getElementById('matUnidadVenta').value = material.unidadVenta || 'm2';
    document.getElementById('matContenidoUnidad').value = material.contenidoUnidad || 1;
    document.getElementById('matIncluyeIva').checked = !!material.incluyeIva;

    // Cargar estrategia de venta
    const est = material.estrategiaVenta || 'dinamica';
    setEstrategiaVenta(est);

    // Cargar campos dinámicos
    actualizarCamposDinamicos();
    if (material.ancho) document.getElementById('matAncho') && (document.getElementById('matAncho').value = material.ancho);
    if (material.largo) document.getElementById('matLargo') && (document.getElementById('matLargo').value = material.largo);
    if (material.espesor) document.getElementById('matEspesor') && (document.getElementById('matEspesor').value = material.espesor);
    if (material.nota) document.getElementById('matNota') && (document.getElementById('matNota').value = material.nota);

    // Recalcular
    recalcularCostoReal();

    if (material.costo) {
        document.getElementById('matCostoReal').value = material.costo;
        if (est === 'fija') {
            document.getElementById('matPrecioVentaManual').value = (material.costo * (material.multiplicador || 1)).toFixed(2);
            document.getElementById('matPrecioGremio').value = (material.costo * (material.multGremio || 1)).toFixed(2);
        }
    }

    document.getElementById('matPrecioGremio').value = material.precioGremio || '';

    // Marcar como edición
    document.getElementById('formMaterial').dataset.editId = id;
    openModal('modalMaterial');
}


// 3. Eliminar material
function eliminarMaterial(id) {
    if (confirm('¿Seguro que querés eliminar este material del stock?\n\nEsta acción no se puede deshacer.')) {
        materiales = materiales.filter(m => String(m.id) !== String(id));
        window.materiales = materiales;
        localStorage.setItem('gecko_materiales', JSON.stringify(materiales));
        renderInsumos();
        if (typeof window.poblarMaterialesGrafica === 'function') window.poblarMaterialesGrafica();
        if (typeof window.poblarSelectoresCorpóreos === 'function') window.poblarSelectoresCorpóreos();
        mostrarExito('Material eliminado del inventario.', '¡Eliminado!');
    }
}

// 1. FUNCIÓN CONVERSORA DE MONEDA
function convertirMoneda(origen) {
    const inputUSD = document.getElementById('matCostUSD');
    const inputARS = document.getElementById('matCostARS');
    const cotizDolar = GECKO_SETTINGS.cotizacionDolar || 1420;

    if (origen === 'USD') {
        const usd = parseFloat(inputUSD.value) || 0;
        inputARS.value = Math.round(usd * cotizDolar);
    } else {
        const ars = parseFloat(inputARS.value) || 0;
        inputUSD.value = (ars / cotizDolar).toFixed(2);
    }
    // Recalcular el costo real en tiempo real
    recalcularCostoReal();
}

// 2. FUNCIÓN PARA MOSTRAR CAMPOS SEGÚN CATEGORÍA
const CATEGORY_CONFIG = {
    vinilos_lonas: {
        campos: [
            { id: 'matAncho', label: 'Ancho (cm)', type: 'number', placeholder: '152' },
            { id: 'matLargo', label: 'Largo (m)', type: 'number', placeholder: '50' }
        ],
        unidadRecomendada: 'm2'
    },
    rigido: {
        campos: [
            { id: 'matEspesor', label: 'Espesor (mm)', type: 'number', placeholder: '3' },
            { id: 'matAncho', label: 'Ancho Placa (cm)', type: 'number', placeholder: '122' },
            { id: 'matLargo', label: 'Alto Placa (cm)', type: 'number', placeholder: '244' }
        ],
        unidadRecomendada: 'unidad'
    },
    polifan: {
        campos: [
            { id: 'matEspesor', label: 'Espesor (mm)', type: 'number', placeholder: '20' },
            { id: 'matAncho', label: 'Ancho Placa (cm)', type: 'number', placeholder: '60' },
            { id: 'matLargo', label: 'Alto Placa (cm)', type: 'number', placeholder: '120' }
        ],
        unidadRecomendada: 'unidad'
    },
    chapas: {
        campos: [
            { id: 'matAncho', label: 'Ancho Placa (cm)', type: 'number', placeholder: '122' },
            { id: 'matLargo', label: 'Alto Placa (cm)', type: 'number', placeholder: '244' },
            { id: 'matEspesor', label: 'Calibre / Espesor', type: 'text', placeholder: 'Calibre 22' }
        ],
        unidadRecomendada: 'unidad'
    },
    '3d': {
        campos: [
            { id: 'matPeso', label: 'Peso (kg)', type: 'number', placeholder: '1' },
            { id: 'matNota', label: 'Especificaciones', type: 'text', placeholder: 'PLA, PETG...' }
        ],
        unidadRecomendada: 'unidad'
    },
    electrico: {
        campos: [
            { id: 'matNota', label: 'Especificaciones', type: 'text', placeholder: 'Detalles...' }
        ],
        unidadRecomendada: 'unidad'
    },
    metal_madera: {
        campos: [
            { id: 'matSeccion', label: 'Sección / Perfil', type: 'text', placeholder: '20x20' },
            { id: 'matLargo', label: 'Largo Barra (m)', type: 'number', placeholder: '6' }
        ],
        unidadRecomendada: 'unidad'
    },
    producto_gecko: {
        campos: [
            { id: 'matNota', label: 'Especificaciones', type: 'text', placeholder: 'Detalles...' }
        ],
        unidadRecomendada: 'unidad'
    },
    insumo: {
        campos: [
            { id: 'matNota', label: 'Especificaciones', type: 'text', placeholder: 'Detalles...' }
        ],
        unidadRecomendada: 'unidad'
    }
};

function actualizarCamposDinamicos() {
    const cat = document.getElementById('matCat').value;
    const contenedor = document.getElementById('contenedorCamposTecnicos');

    const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.insumo;
    let html = '';

    const labelStyle = "block text-[11px] font-normal text-zinc-500 mb-2";
    const inputStyle = "w-full bg-transparent border-b-2 border-zinc-800 p-3 text-[11px] font-normal text-white transition-all outline-none placeholder:text-zinc-500";

    config.campos.forEach(campo => {
        html += `
            <div class="flex flex-col">
                <label class="${labelStyle}">${campo.label}</label>
                <input type="${campo.type}" id="${campo.id}" placeholder="${campo.placeholder}" 
                       ${campo.type === 'number' ? 'step="any"' : ''} 
                       oninput="window.recalcularCostoReal()" class="${inputStyle}">
            </div>
        `;
    });

    contenedor.innerHTML = html;
}

window.setEstrategiaVenta = function (est) {
    const btnDin = document.getElementById('btnEstratDinamica');
    const btnFij = document.getElementById('btnEstratFija');
    const inputEstrat = document.getElementById('matEstrategia');
    const inputMult = document.getElementById('matMult');
    const inputMultGremio = document.getElementById('matMultGremio');
    const inputPrecio = document.getElementById('matPrecioVentaManual');
    const inputPrecioGremio = document.getElementById('matPrecioGremio');
    const marginLabel = document.getElementById('marginLabel');
    const marginGremioLabel = document.getElementById('marginGremioLabel');

    if (!btnDin || !btnFij) return;

    if (est === 'dinamica') {
        inputEstrat.value = 'dinamica';
        btnDin.className = "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-zinc-800 text-white border-[1.5px] border-orange-500 shadow-lg";
        btnFij.className = "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-zinc-500 hover:text-zinc-300 border-[1.5px] border-transparent";
        if (inputMult) inputMult.disabled = false;
        if (inputMultGremio) inputMultGremio.disabled = false;
        if (inputPrecio) inputPrecio.readOnly = true;
        if (inputPrecioGremio) inputPrecioGremio.readOnly = true;
        if (marginLabel) marginLabel.classList.add('hidden');
        if (marginGremioLabel) marginGremioLabel.classList.add('hidden');
    } else {
        inputEstrat.value = 'fija';
        btnFij.className = "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-zinc-800 text-white border-[1.5px] border-orange-500 shadow-lg";
        btnDin.className = "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-zinc-500 hover:text-zinc-300 border-[1.5px] border-transparent";
        if (inputMult) inputMult.disabled = true;
        if (inputMultGremio) inputMultGremio.disabled = true;
        if (inputPrecio) inputPrecio.readOnly = false;
        if (inputPrecioGremio) inputPrecioGremio.readOnly = false;
        if (marginLabel) marginLabel.classList.remove('hidden');
        if (marginGremioLabel) marginGremioLabel.classList.remove('hidden');
    }
    recalcularCostoReal();
};

// -- Función: Calcular Costo Real en tiempo real (Refuerzo UX) --
window.recalcularCostoReal = function (trigger) {
    const cat = document.getElementById('matCat')?.value;
    const unidadCompra = document.getElementById('matUnidad')?.value;
    const inputContenido = document.getElementById('matContenidoUnidad');
    const ancho = parseFloat(document.getElementById('matAncho')?.value) || 0;
    const largo = parseFloat(document.getElementById('matLargo')?.value) || 0; // 'matLargo' también se usa para Alto
    const peso = parseFloat(document.getElementById('matPeso')?.value) || 0;

    // Lógica prioritaria: Autocompletado de contenido según medidas
    if (inputContenido) {
        if (['rigido', 'polifan', 'chapas'].includes(cat) && unidadCompra === 'placa') {
            inputContenido.value = ((ancho * largo) / 10000).toFixed(2);
        } else if ((cat === 'vinilos_lonas' || cat === 'flexible') && unidadCompra === 'rollo') {
            inputContenido.value = ((ancho / 100) * largo).toFixed(2);
        } else if (cat === '3d') {
            inputContenido.value = peso || 1;
        }
    }

    const unidadVenta = document.getElementById('matUnidadVenta')?.value || 'm2';
    const costoARS = parseFloat(document.getElementById('matCostARS')?.value) || 0;
    const multiplicadorInput = document.getElementById('matMult');
    const multiplicadorGremioInput = document.getElementById('matMultGremio');
    const precioManualInput = document.getElementById('matPrecioVentaManual');
    const precioGremioInput = document.getElementById('matPrecioGremio');
    const estrategia = document.getElementById('matEstrategia')?.value || 'dinamica';
    const contenido = parseFloat(document.getElementById('matContenidoUnidad')?.value) || 1;

    let cotizDolar = window.GECKO_SETTINGS?.cotizacionDolar || 1420;
    const visor = document.getElementById('matCotizacionVisor');
    if (visor) visor.innerText = '$' + cotizDolar;

    let costoUnitarioBase = 0;

    // Lógica de Cálculo de Costo Base
    if (unidadVenta === 'm2') {
        const isFlexible = cat === 'flexible' || cat === 'vinilos_lonas';
        let largoFinal = isFlexible ? (largo * 100) : largo;

        if (ancho > 0 && largoFinal > 0) {
            costoUnitarioBase = costoARS / (ancho * largoFinal / 10000);
        }
    } else {
        if (contenido > 0) {
            costoUnitarioBase = costoARS / contenido;
        }
    }

    // Lógica de Estrategia de Venta
    if (estrategia === 'dinamica') {
        const mult = parseFloat(multiplicadorInput?.value) || 1.0;
        const multGremio = parseFloat(multiplicadorGremioInput?.value) || 1.0;

        const precioSugerido = Math.round(costoUnitarioBase * mult);
        const precioGremioSug = Math.round(costoUnitarioBase * multGremio);

        if (precioManualInput) precioManualInput.value = precioSugerido;
        if (precioGremioInput) precioGremioInput.value = precioGremioSug;
    } else {
        // Estrategia FIJA (Precio de Mercado)
        const precioFijo = parseFloat(precioManualInput?.value) || 0;
        const precioGremioFijo = parseFloat(precioGremioInput?.value) || 0;

        if (costoUnitarioBase > 0) {
            const margenReal = precioFijo / costoUnitarioBase;
            const margenGremioReal = precioGremioFijo / costoUnitarioBase;

            if (multiplicadorInput) multiplicadorInput.value = margenReal.toFixed(2);
            if (multiplicadorGremioInput) multiplicadorGremioInput.value = margenGremioReal.toFixed(2);

            const marginValDisp = document.getElementById('matMarginVal');
            if (marginValDisp) marginValDisp.innerText = margenReal.toFixed(2);

            const marginGremioValDisp = document.getElementById('matMarginGremioVal');
            if (marginGremioValDisp) marginGremioValDisp.innerText = margenGremioReal.toFixed(2);
        }
    }

    const hidden = document.getElementById('matCostoReal');
    if (hidden) hidden.value = costoUnitarioBase.toFixed(4);
};

// 3. ACTUALIZAR EL GUARDADO DE MATERIAL (CORREGIDO)
const formMaterial = document.getElementById('formMaterial');
if (formMaterial) {
    formMaterial.addEventListener('submit', function (e) {
        e.preventDefault();
        try {
            const editId = this.dataset.editId;

            // ─── Calcular Precio Venta Sugerido (costoReal) antes de guardar ───
            recalcularCostoReal();
            const costoRealFinal = parseFloat(document.getElementById('matCostoReal').value) || 0;
            const costoUSD_val = parseFloat(document.getElementById('matCostUSD').value) || 0;
            const costoARS_val = parseFloat(document.getElementById('matCostARS').value) || (costoUSD_val * 1420);

            const nuevoMat = {
                id: editId || Date.now(),
                nombre: document.getElementById('matNom').value,
                categoria: document.getElementById('matCat').value,
                subcategoria: document.getElementById('matSubCat').value,
                stock: parseFloat(document.getElementById('matStock').value) || 0,
                multiplicador: parseFloat(document.getElementById('matMult').value) || 2.0,
                costoUSD: costoUSD_val,
                costoARS: costoARS_val,
                unidad: document.getElementById('matUnidad').value,
                unidadVenta: document.getElementById('matUnidadVenta').value,
                incluyeIva: document.getElementById('matIncluyeIva').checked,
                estrategiaVenta: document.getElementById('matEstrategia').value,
                costo: costoRealFinal,
                contenidoUnidad: parseFloat(document.getElementById('matContenidoUnidad').value) || 1,
                ancho: document.getElementById('matAncho') ? document.getElementById('matAncho').value : null,
                largo: document.getElementById('matLargo') ? document.getElementById('matLargo').value : null,
                espesor: document.getElementById('matEspesor') ? document.getElementById('matEspesor').value : null,
                peso: document.getElementById('matPeso') ? document.getElementById('matPeso').value : null,
                nota: document.getElementById('matNota') ? document.getElementById('matNota').value : null,
                precioGremio: parseFloat(document.getElementById('matPrecioGremio').value) || 0,
                multGremio: parseFloat(document.getElementById('matMultGremio').value) || 1.5
            };

            let materialesLocal = JSON.parse(localStorage.getItem('gecko_materiales')) || [];
            if (editId) {
                const idx = materialesLocal.findIndex(m => String(m.id) === String(editId));
                if (idx !== -1) materialesLocal[idx] = nuevoMat;
                delete this.dataset.editId;
            } else {
                materialesLocal.push(nuevoMat);
            }

            // 1. Guardar en localStorage
            localStorage.setItem('gecko_materiales', JSON.stringify(materialesLocal));

            // Actualizar referencias en memoria
            materiales = materialesLocal;
            window.materiales = materialesLocal;

            console.log("Insumo guardado:", nuevoMat);

            // 2. CERRAR el modal
            closeModal('modalMaterial');

            // 3. Notificar
            window.mostrarExito("Guardado Correctamente");

            // 4. RE-RENDER (CRÍTICO) con Blindaje de Filtros
            const btnTodos = document.querySelector('button[onclick*="filtrarInsumos(\'todos\'"]');
            if (btnTodos) {
                filtrarInsumos('todos', btnTodos);
            } else {
                window.filtroMaterialesActual = 'todos';
                renderInsumos();
            }

            this.reset();
            setEstrategiaVenta('dinamica');

            // Resetear campos nuevos
            const costoRealHid = document.getElementById('matCostoReal');
            if (costoRealHid) costoRealHid.value = '0';
            const precioManual = document.getElementById('matPrecioVentaManual');
            if (precioManual) precioManual.value = '';
            const precioGremioInput = document.getElementById('matPrecioGremio');
            if (precioGremioInput) precioGremioInput.value = '';
            const subCatInput = document.getElementById('matSubCat');
            if (subCatInput) subCatInput.value = '';

            if (typeof window.renderInsumos === 'function') window.renderInsumos(); else if (typeof renderInsumos === 'function') renderInsumos();
            if (typeof window.poblarMaterialesGrafica === 'function') window.poblarMaterialesGraficaCascada();
            if (typeof window.poblarSelectoresCorpóreos === 'function') window.poblarSelectoresCorpóreos();

        } catch (error) {
            console.error("Error al guardar material:", error);
        }
    });
}

// ─── Lógica Polifán Avanzado (Integrada en Modal Unificado) ───
window.itemActualPolifan = null;

;

;

// Alias para compatibilidad
window.calcularPolifan = window.calcularCostoPolifan;

function agregarItemAlCarrito(catOverride) {
    const tipo = catOverride || 'grafica';
    let item = null;

    if (tipo === 'polifan') {
        if (!window.itemActualPolifan) window.calcularCostoPolifan();
        item = { ...window.itemActualPolifan };
    } else if (tipo === 'grafica') {
        const mat = document.getElementById('graficaMatEspec').value;
        const w = document.getElementById('medidaAncho').value;
        const h = document.getElementById('medidaAlto').value;
        const total = parseFloat(document.getElementById('graficaCostoTotalDisplay')?.innerText.replace('$', '').replace(/\./g, '').replace(',', '.')) || 0;

        item = {
            tipo: 'grafica',
            textoOpciones: `Impresión ${mat} (${w}x${h}cm)`,
            costo: total,
            otDetalle: `Material: ${mat} | Medida: ${w}x${h}cm | Extras: ${serviciosGraficaSeleccionados.map(s => s.nombre).join(', ') || 'Ninguno'} | Ojales: ${document.getElementById('termOjales')?.value || 0}`
        };
    } else if (tipo === 'laser' || tipo === 'router' || tipo === 'laser_cnc') {
        const mat = document.getElementById('corteMaterial')?.value || '';
        const w = document.getElementById('corteAncho')?.value || '0';
        const h = document.getElementById('corteAlto')?.value || '0';
        const totalRaw = document.getElementById('costoTotalDisplay')?.innerText || '$0';
        const total = parseFloat(totalRaw.replace(/[$\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
        const modoActual = window._laserCncModo || 'laser';
        const modoLabel = modoActual === 'cnc' ? 'CNC ROUTER' : 'LÁSER';
        const pasadas = document.getElementById('cncPasadas')?.value || '1';
        const complejidad = document.getElementById('cncComplejidad')?.value || '1';

        item = {
            tipo: 'laser_cnc',
            subModo: modoActual,
            textoOpciones: `${modoLabel}: ${mat} (${w}×${h}cm)`,
            costo: total,
            otDetalle: `Material: ${mat} | Medida: ${w}×${h}cm | Metros: ${document.getElementById('corteMetrosManual')?.value || 0}ml${modoActual === 'cnc' ? ` | Pasadas: ${pasadas} | Complejidad: ×${complejidad}` : ''}`
        };
    }

    if (item && item.costo > 0) {
        presupuesto.push(item);
        renderizarPresupuesto();
        mostrarExito("Producto añadido al listado", "Carrito Actualizado");
    } else {
        alert("Verifica los datos de la cotización antes de añadir.");
    }
}

// Redundant functions removed to use unified renderizarPresupuesto and eliminarDelCarrito
window.eliminarDelCarrito = function (index) {
    if (index > -1 && index < presupuesto.length) {
        presupuesto.splice(index, 1);
        window.renderizarPresupuesto();
        if (typeof mostrarExito === 'function') {
            mostrarExito("Ítem eliminado", "Presupuesto Actualizado");
        }
    }
};


function cerrarExito() {
    document.getElementById('modalPresupuesto').style.display = 'none';
    document.getElementById('successVista').classList.add('hidden');
    presupuesto = [];
    renderizarPresupuesto();
    document.getElementById('clienteNombre').value = '';
}

// --- Funciones de Impresión / PDF ---
function generarPresupuesto() {
    if (presupuesto.length === 0) {
        alert("Agrega al menos un ítem para generar el presupuesto.");
        return;
    }
    const cliente = document.getElementById('clienteNombre').value || "Cliente Genérico";
    let html = `
                <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 40px; color: #1a1a1a;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
                        <div>
                            <h1 style="color: #F15A24; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -1px;">GECKO GESTIÓN</h1>
                            <p style="font-size: 12px; color: #666; margin: 5px 0 0 0; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">Presupuesto de Servicios</p>
                        </div>
                        <div style="text-align: right;">
                            <p style="margin: 0; font-weight: 800; font-size: 14px;">FECHA: ${new Date().toLocaleDateString('es-AR')}</p>
                            <p style="margin: 5px 0 0 0; font-size: 12px; color: #666;">CLIENTE: ${cliente}</p>
                        </div>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
                        <thead>
                            <tr style="border-bottom: 2px solid #000;">
                                <th style="text-align: left; padding: 15px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">Descripción / Detalle</th>
                                <th style="text-align: right; padding: 15px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; width: 120px;">Total Pago</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${presupuesto.map(it => `
                                <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 20px 0;">
                                        <div style="font-weight: 800; font-size: 14px; margin-bottom: 4px; text-transform: uppercase;">${it.textoOpciones}</div>
                                        <div style="font-size: 11px; color: #666; font-style: italic;">${it.otDetalle || ''}</div>
                                    </td>
                                    <td style="padding: 20px 0; text-align: right; font-weight: 800; font-size: 15px;">
                                        $${it.costo.toLocaleString('es-AR')}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div style="display: flex; justify-content: flex-end; margin-bottom: 60px;">
                        <div style="background: #f8f8f8; padding: 25px 40px; border-radius: 20px; text-align: right;">
                            <p style="margin: 0; font-size: 11px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 2px;">Inversión Total Estimada</p>
                            <p style="margin: 5px 0 0 0; font-size: 42px; font-weight: 900; color: #F15A24; letter-spacing: -2px;">
                                $${presupuesto.reduce((acc, it) => acc + Math.round(it.costo), 0).toLocaleString('es-AR')}
                            </p>
                        </div>
                    </div>

                    <div style="border-top: 1px solid #eee; padding-top: 30px; font-size: 10px; color: #999; line-height: 1.6;">
                        <p style="font-weight: 800; color: #666; margin-bottom: 10px; text-transform: uppercase;">Condiciones Generales:</p>
                        <p style="white-space: pre-line;">${GECKO_SETTINGS.condicionesVenta}</p>
                    </div>
                </div>
            `;
    abrirImpresionNativa(html);
}

function imprimirOtConfirmada() {
    if (listaPresupuestos.length > 0) {
        imprimirOtTecnicaIndividual(listaPresupuestos.length - 1);
    } else {
        alert("No hay OTs registradas para imprimir.");
    }
}

// â”€â”€ Lógica Componente Multi-Select Combobox de Servicios Extras (Categoría Gráfica) â”€â”€
function abrirDropdownServicios() {
    const dp = document.getElementById('dropdownServiciosExtra');
    if (dp) {
        dp.classList.remove('hidden');
        filtrarServiciosExtra(); // render inicial
    }
}

function filtrarServiciosExtra() {
    const query = document.getElementById('inputBuscarServicioExtra')?.value.toLowerCase().trim() || '';
    const dropdown = document.getElementById('dropdownServiciosExtra');
    if (!dropdown) return;

    const materialesDB = JSON.parse(localStorage.getItem('geckoServicios') || '[]');
    // Filtrar por categoría 'servicio' 
    let servicios = materialesDB;
    if (query) {
        servicios = servicios.filter(m => m.nombre.toLowerCase().includes(query));
    }

    if (servicios.length === 0) {
        dropdown.innerHTML = `<p class="p-3 text-xs text-gray-500 font-bold italic text-center">No se encontraron servicios.</p>`;
        return;
    }

    dropdown.innerHTML = servicios.map(s => {
        const seleccionado = serviciosGraficaSeleccionados.some(x => x.id === s.id);
        const formateado = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(parseFloat(s.precio) || 0);

        return `<div onclick="seleccionarServicioExtra('${s.id}')" class="p-3 hover:bg-gray-50 dark:hover:bg-zinc-900 rounded-xl cursor-pointer transition-all flex justify-between items-center ${seleccionado ? 'opacity-30 pointer-events-none bg-gray-50 dark:bg-zinc-900 border border-[#f97316]/50' : 'border border-transparent'}">
                            <span class="text-xs font-bold text-gray-800 dark:text-gray-200">${s.nombre}</span>
                            <span class="text-[10px] font-black text-[#f97316]">${formateado} x ${s.unidad}</span>
                        </div>`;
    }).join('');
}

function seleccionarServicioExtra(id) {
    const db = JSON.parse(localStorage.getItem('geckoServicios') || '[]');
    const servicio = db.find(m => String(m.id) === String(id));

    if (servicio && !serviciosGraficaSeleccionados.some(x => String(x.id) === String(id))) {
        serviciosGraficaSeleccionados.push(servicio);
        document.getElementById('inputBuscarServicioExtra').value = ''; // limpiar
        renderTagsServiciosExtra();
        filtrarServiciosExtra(); // re-evaluar opacidad
        calcularCostoGrafica();  // recalcular el presupuesto visualmente
    }
    document.getElementById('inputBuscarServicioExtra')?.focus();
}

function quitarServicioExtra(id) {
    serviciosGraficaSeleccionados = serviciosGraficaSeleccionados.filter(x => String(x.id) !== String(id));
    renderTagsServiciosExtra();
    filtrarServiciosExtra();
    calcularCostoGrafica();
}

function renderTagsServiciosExtra() {
    const contenedor = document.getElementById('contenedorTagsServicios');
    if (!contenedor) return;

    if (serviciosGraficaSeleccionados.length === 0) {
        contenedor.innerHTML = '';
        return;
    }

    contenedor.innerHTML = serviciosGraficaSeleccionados.map(s => `
                <div class="flex items-center gap-2 px-3 py-1.5 bg-[#f97316]/10 border border-[#f97316]/20 rounded-xl hover:bg-[#f97316]/20 transition-all">
                    <span class="text-[10px] font-bold text-[#ea580c] dark:text-[#f97316] uppercase tracking-wider">${s.nombre}</span>
                    <button onclick="quitarServicioExtra('${s.id}')" class="text-[#f97316] hover:text-red-600 transition-colors ml-1">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
            `).join('');
}

window.agregarFilaMaterial = function () {
    const contenedor = document.getElementById('contenedorFilasMaterial');
    const div = document.createElement('div');
    div.className = "grid grid-cols-12 gap-4 items-center fila-material animate-in fade-in slide-in-from-top-1";
    div.innerHTML = `
        <div class="col-span-5"><input type="text" list="dlGrafica" class="input-material w-full bg-transparent border-b border-zinc-800 p-2 text-[14px] text-zinc-100 outline-none focus:border-gecko" oninput="calcularCostoGrafica()" onfocus="window.prepararLista(this)" onblur="window.restaurarLista(this)" placeholder="Seleccionar..."></div>
        <div class="col-span-2"><input type="number" class="input-ancho w-full bg-transparent border-b border-zinc-800 p-2 text-[14px] text-zinc-100 text-center outline-none" oninput="calcularCostoGrafica()" placeholder="0"></div>
        <div class="col-span-2"><input type="number" class="input-alto w-full bg-transparent border-b border-zinc-800 p-2 text-[14px] text-zinc-100 text-center outline-none" oninput="calcularCostoGrafica()" placeholder="0"></div>
        <div class="col-span-2"><input type="number" class="input-copias w-full bg-transparent border-b border-zinc-800 p-2 text-[14px] text-zinc-100 text-center outline-none" oninput="calcularCostoGrafica()" placeholder="1"></div>
        <div class="col-span-1 flex justify-center">
            <button onclick="this.closest('.fila-material').remove(); calcularCostoGrafica();" class="text-red-500/50 hover:text-red-500 p-2 transition-colors">✕</button>
        </div>
    `;
    contenedor.appendChild(div);
};

// Event listener global para ocultar el popup al clicar fuera
if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
        const input = document.getElementById('inputBuscarServicioExtra');
        const dropdown = document.getElementById('dropdownServiciosExtra');
        if (input && dropdown) {
            if (!input.contains(e.target) && !dropdown.contains(e.target) && !e.target.closest('#contenedorTagsServicios')) {
                dropdown.classList.add('hidden');
            }
        }
    });
}

;
;

;

;

;

window.prepararLista = function (el) {
    el.dataset.valorTemporal = el.value;
    if (el.value !== "") el.placeholder = el.value;
    el.value = "";
};

window.restaurarLista = function (el) {
    if (el.value === "") {
        el.value = el.dataset.valorTemporal || "";
        el.placeholder = "Seleccionar...";
    }
};



// --- FUNCIONES GLOBALES TEXTIL ---

;

;

// â”€â”€ Lógica de Materiales â”€â”€
window.abrirModalMaterial = function () {
    // Limpia el formulario antes de abrirlo para que sea un "Nuevo" insumo
    const form = document.getElementById('formMaterial');
    if (form) {
        form.reset();
        delete form.dataset.editId;
    }

    // Resetear visores y estrategias
    if (typeof window.setEstrategiaVenta === 'function') {
        window.setEstrategiaVenta('dinamica');
    }

    const display = document.getElementById('matPrecioVentaManual');
    if (display) {
        if (display.tagName === 'INPUT') display.value = '';
        else display.innerText = '$0';
    }

    const displayGremio = document.getElementById('matPrecioGremio');
    if (displayGremio) displayGremio.value = '';

    const marginVal = document.getElementById('matMarginVal');
    if (marginVal) marginVal.innerText = '0.00';

    const marginGremioVal = document.getElementById('matMarginGremioVal');
    if (marginGremioVal) marginGremioVal.innerText = '0.00';

    openModal('modalMaterial');
};


window.initSortableMateriales = function () {
    const el = document.getElementById('tablaMaterialesBody');
    if (!el) return;

    Sortable.create(el, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: function () {
            // Reordenar el array original basándose en el nuevo orden visual del DOM
            const nuevosMateriales = [];
            const filas = el.querySelectorAll('tr');
            filas.forEach(fila => {
                const id = fila.querySelector('button[onclick*="editarMaterial"]')?.onclick.toString().match(/'(.*?)'/)[1];
                const item = materiales.find(m => String(m.id) === String(id));
                if (item) nuevosMateriales.push(item);
            });

            materiales = nuevosMateriales;
            localStorage.setItem('gecko_materiales', JSON.stringify(materiales));
            console.log('🦎 GECKO: Orden de inventario actualizado.');
        }
    });
};

// Función Maestra de Confirmación
window.confirmGecko = function (mensaje, titulo = "Atención") {
    return new Promise((resolve) => {
        const dialog = document.getElementById('geckoConfirmDialog');
        document.getElementById('geckoConfirmTitle').innerText = titulo;
        document.getElementById('geckoConfirmMessage').innerText = mensaje;

        dialog.style.display = 'flex';

        const handleChoice = (choice) => {
            dialog.style.display = 'none';
            resolve(choice);
        };

        document.getElementById('geckoConfirmOk').onclick = () => handleChoice(true);
        document.getElementById('geckoConfirmCancel').onclick = () => handleChoice(false);
    });
};

window.initSortableServicios = function () {
    const el = document.getElementById('tablaTerminacionesBody');
    if (!el) return;

    Sortable.create(el, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: function () {
            const nuevasTerminaciones = [];
            const filas = el.querySelectorAll('tr');
            filas.forEach(fila => {
                const id = fila.querySelector('button[onclick*="abrirModalTerminacion"]')?.onclick.toString().match(/\((.*?)\)/)[1];
                const item = geckoServicios.find(t => String(t.id) === String(id));
                if (item) nuevasTerminaciones.push(item);
            });

            geckoServicios = nuevasTerminaciones;
            window.geckoServicios = geckoServicios;
            localStorage.setItem('geckoServicios', JSON.stringify(geckoServicios));
            console.log('🦎 GECKO: Orden de servicios actualizado.');
        }
    });
};
window.verificarLocalStorageServicios = function () {
    const data = localStorage.getItem('geckoServicios');
    if (!data) {
        alert("🚨 ALERTA: No se encontró la clave 'geckoServicios' en LocalStorage.");
    } else {
        const parsed = JSON.parse(data);
        alert(`✅ LOCALSTORAGE DETECTADO:\n\nClave: geckoServicios\nCantidad de ítems: ${parsed.length}\n\nContenido (Primeros 500 chars):\n${data.substring(0, 500)}...`);
    }
    console.log('🦎 GECKO DIAGNOSTIC:', JSON.parse(data));
};

// --- INICIALIZACIÓN DE LA APLICACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // Parche de seguridad: evitar scroll accidental en inputs numéricos
    document.addEventListener('wheel', function (e) {
        if (document.activeElement.type === 'number') {
            document.activeElement.blur();
        }
    }, { passive: true });

    console.log('🦎 GECKO: Inicializando sistema...');

    // 1. Restaurar tema (Dark/Light)
    const savedTheme = localStorage.getItem('gecko-theme') || 'dark';
    const isDark = savedTheme === 'dark';

    if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light-mode');
    } else {
        document.documentElement.classList.add('light-mode');
        document.documentElement.classList.remove('dark');
    }
    if (typeof updateDarkIcon === 'function') updateDarkIcon(isDark);

    // 2. Cargar vista inicial (Dashboard)
    const lastTab = localStorage.getItem('gecko_activeTab') || 'dashboard';
    if (typeof window.switchMenu === 'function') {
        window.switchMenu(lastTab);
    }

    // 3. Renderizar componentes globales
    setTimeout(() => {
        if (typeof renderizarFinanzas === 'function') renderizarFinanzas();
        if (typeof renderReportesDashboard === 'function') renderReportesDashboard();
    }, 100);

    console.log('🦎 GECKO: Sistema listo.');
});
