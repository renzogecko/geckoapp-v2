/**
 * gecko-mock-data.js
 * Carga datos de prueba en localStorage cuando la app corre localmente
 * y no tiene acceso a /app/api.php.
 *
 * Para activar: agregar en index.html ANTES de gecko-api.js:
 *   <script src="gecko-mock-data.js"></script>
 */

(function () {

    // ── Detección sincrónica ────────────────────────────────────────────────
    const proto = location.protocol;
    const host  = location.hostname;
    const isFileProtocol = proto === 'file:';
    const isLocalhost    = host === 'localhost' || host === '127.0.0.1';

    if (!isFileProtocol && !isLocalhost) return;

    // ── Helpers ────────────────────────────────────────────────────────────
    function setIfEmpty(key, value) {
        if (!localStorage.getItem(key)) {
            localStorage.setItem(key, JSON.stringify(value));
        }
    }

    function cargarMocks() {
        if (window._geckoMockLoaded) return;
        window._geckoMockLoaded = true;

        // ── 1. Presupuestos y OTs ──────────────────────────────────────────
        setIfEmpty('gecko_listaPresupuestos', [
            // ── Presupuestos (status: 'Cotizado') ──────────────────────────
            {
                id: 1001,
                cliente: 'Laura García',
                fecha: '05/05/2026',
                total: 85000,
                status: 'Cotizado',
                sena: 0,
                estado_ot: '',
                metodo_pago: '',
                items: [
                    { nombre: 'Banner flex 3×1 m', textoOpciones: 'Banner flex 3×1 m', tipo: 'grafica', costo: 55000 },
                    { nombre: 'Vinilo ploteado logo', textoOpciones: 'Vinilo ploteado logo', tipo: 'grafica', costo: 30000 }
                ]
            },
            {
                id: 1002,
                cliente: 'Nicolas Romero',
                fecha: '08/05/2026',
                total: 175000,
                status: 'Cotizado',
                sena: 0,
                estado_ot: '',
                metodo_pago: '',
                items: [
                    { nombre: 'Lona impresa 5×2 m', textoOpciones: 'Lona impresa 5×2 m', tipo: 'grafica', costo: 120000 },
                    { nombre: 'Ojales y flejes', textoOpciones: 'Ojales y flejes', tipo: 'grafica', costo: 55000 }
                ]
            },
            {
                id: 1003,
                cliente: 'Cliente Genérico',
                fecha: '12/05/2026',
                total: 52000,
                status: 'Cotizado',
                sena: 0,
                estado_ot: '',
                metodo_pago: '',
                items: [
                    { nombre: 'Folletería A5 x500', textoOpciones: 'Folletería A5 x500', tipo: 'grafica', costo: 52000 }
                ]
            },

            // ── OTs (status: 'OT') ─────────────────────────────────────────
            {
                id: 1004,
                cliente: 'Renzo Delcueto',
                fecha: '10/05/2026',
                fecha_entrega: '25/05/2026',
                total: 95000,
                status: 'OT',
                sena: 30000,
                estado_ot: 'En Proceso',
                metodo_pago: 'Efectivo',
                items: [
                    { nombre: 'Cartel vinílico 1,2×0,8 m', textoOpciones: 'Cartel vinílico 1,2×0,8 m', tipo: 'grafica', costo: 70000 },
                    { nombre: 'Instalación en local', textoOpciones: 'Instalación en local', tipo: 'grafica', costo: 25000 }
                ]
            },
            {
                id: 1005,
                cliente: 'Laura García',
                fecha: '13/05/2026',
                fecha_entrega: '22/05/2026',
                total: 220000,
                status: 'OT',
                sena: 110000,
                estado_ot: 'En Taller',
                metodo_pago: 'MercadoPago',
                items: [
                    { nombre: 'Impresión lona 4×2 m', textoOpciones: 'Impresión lona 4×2 m', tipo: 'grafica', costo: 160000 },
                    { nombre: 'Bastidor aluminio 4×2 m', textoOpciones: 'Bastidor aluminio 4×2 m', tipo: 'grafica', costo: 60000 }
                ]
            },
            {
                id: 1006,
                cliente: 'Nicolas Romero',
                fecha: '15/05/2026',
                fecha_entrega: '20/05/2026',
                total: 290000,
                status: 'OT',
                sena: 150000,
                estado_ot: 'Listo',
                metodo_pago: 'Transferencia',
                items: [
                    { nombre: 'Letras corpóreas acrílico x8', textoOpciones: 'Letras corpóreas acrílico x8', tipo: 'corporeos', costo: 210000 },
                    { nombre: 'Stickers troquelados x200', textoOpciones: 'Stickers troquelados x200', tipo: 'grafica', costo: 80000 }
                ]
            }
        ]);

        // ── 2. Cajas ───────────────────────────────────────────────────────
        setIfEmpty('gecko_cajas', [
            { id: 'mock_c1', nombre: 'Efectivo',    saldo: 45000,  icono: 'efectivo' },
            { id: 'mock_c2', nombre: 'MercadoPago', saldo: 120000, icono: 'mercado_pago_celeste' },
            { id: 'mock_c3', nombre: 'Banco Galicia', saldo: 380000, icono: 'banco' }
        ]);

        // ── 3. Movimientos ─────────────────────────────────────────────────
        setIfEmpty('gecko_movimientos', [
            {
                fecha: '10/05/2026',
                detalle: 'Seña OT #1004 — Renzo Delcueto',
                caja: 'Efectivo',
                tipo: 'Ingreso',
                monto: 30000,
                categoria: 'Cobro seña'
            },
            {
                fecha: '12/05/2026',
                detalle: 'Compra papeles y film laminado',
                caja: 'Efectivo',
                tipo: 'Egreso',
                monto: 8500,
                categoria: 'Insumos'
            },
            {
                fecha: '14/05/2026',
                detalle: 'Seña OT #1005 — Laura García',
                caja: 'MercadoPago',
                tipo: 'Ingreso',
                monto: 110000,
                categoria: 'Cobro seña'
            },
            {
                fecha: '16/05/2026',
                detalle: 'Recarga tinta ecosolvente UV',
                caja: 'MercadoPago',
                tipo: 'Egreso',
                monto: 25000,
                categoria: 'Insumos'
            },
            {
                fecha: '18/05/2026',
                detalle: 'Seña OT #1006 — Nicolas Romero',
                caja: 'Banco Galicia',
                tipo: 'Ingreso',
                monto: 150000,
                categoria: 'Cobro seña'
            }
        ]);

        console.log('🦎 GECKO MOCK: Datos de prueba cargados');
    }

    // ── Carga según protocolo ──────────────────────────────────────────────
    if (isFileProtocol) {
        // Sin red: carga directa y sincrónica.
        cargarMocks();
        return;
    }

    // localhost: intenta la API; si no responde, activa mocks.
    (async function () {
        try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), 1500);
            const res = await fetch('/app/api.php?endpoint=ping', { signal: ctrl.signal });
            clearTimeout(timer);
            if (!res.ok) cargarMocks();
        } catch (_) {
            cargarMocks();
        }
    })();

})();
